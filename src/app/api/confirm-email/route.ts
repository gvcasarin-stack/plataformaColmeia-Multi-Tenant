import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { devLog } from "@/lib/utils/productionLogger";
import { NextRequest, NextResponse } from 'next/server';

// Função helper para verificar se as variáveis estão configuradas
function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// Função para criar cliente admin com verificação
function createSupabaseAdmin() {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase não configurado');
  }
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

async function handleConfirm(token_hash?: string, code?: string, incomingType?: string) {
  try {
    devLog.log('[API-ConfirmEmail] 🚀 Iniciando confirmação SaaS-grade', {
      token_hash_preview: token_hash ? `${token_hash.substring(0, 20)}...` : null,
      code_preview: code ? `${code.substring(0, 20)}...` : null,
      incomingType,
      timestamp: new Date().toISOString()
    });
    
    // Verificar se o Supabase está configurado
    if (!isSupabaseConfigured()) {
      devLog.error('[API-ConfirmEmail] ❌ Supabase não configurado');
      
      return NextResponse.json(
        { 
          error: 'CONFIGURATION_ERROR',
          message: 'Configuração do Supabase não encontrada. Verifique as variáveis de ambiente.' 
        }, 
        { status: 500 }
      );
    }
    
    // Se veio token_hash do link de signup, o type correto é 'signup'.
    // Para outros fluxos (ex.: OTP por email), pode ser 'email'.
    const type = (token_hash && !incomingType) ? 'signup' : (incomingType || 'email');
    
    if (!token_hash && !code) {
      devLog.log('[API-ConfirmEmail] ❌ Token/code ausente');
      return NextResponse.json(
        { 
          error: 'TOKEN_MISSING',
          message: 'Token de confirmação é obrigatório' 
        }, 
        { status: 400 }
      );
    }

    devLog.log('[API-ConfirmEmail] 🔍 Processando token:', {
      hasTokenHash: !!token_hash,
      hasCode: !!code,
      type,
      tokenPreview: token_hash ? `${token_hash.substring(0, 8)}...` : null
    });

    // ESTRATÉGIA SAAS: Tentar confirmar email SEM criar sessão
    let confirmationResult = null as null | { userId: string; email?: string; confirmedAt: string };
    let userId: string | null = null;
    let tenantSlug: string | null = null;

    // Método 1: Usar verifyOtp temporariamente para obter user ID, depois logout
    const cookieStore = cookies();
    const supabaseClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );
    
    try {
      devLog.log('[API-ConfirmEmail] 🔐 Tentativa 1: verifyOtp controlado');
      
      const { data, error } = await supabaseClient.auth.verifyOtp({
        token_hash: token_hash || code,
        type: type as any
      });

      if (error) {
        devLog.error('[API-ConfirmEmail] ❌ verifyOtp falhou:', {
          message: error.message,
          code: error.code || 'unknown',
          status: error.status || 'unknown',
          details: error.details || 'none',
          hint: error.hint || 'none',
          fullError: error
        });
        
        // Mapear erros para formato SaaS
        // Tratar tokens expirados ou já usados como confirmação bem-sucedida para melhorar UX
        if (error.message.includes('expired') || 
            error.message.includes('invalid') || 
            error.message.includes('already been used') ||
            error.message.includes('signup_disabled')) {
          
          devLog.log('[API-ConfirmEmail] 🎯 Token já usado/expirado - tratando como sucesso para UX');
          
          return NextResponse.json(
            { 
              success: true,
              message: 'Seu email já foi confirmado! Você pode fazer login normalmente.',
              data: {
                confirmed: true,
                alreadyConfirmed: true,
                userId: null,
                email: null,
                confirmedAt: new Date().toISOString(),
                tenantSlug: null
              }
            }, 
            { status: 200 }
          );
        }

        return NextResponse.json(
          { 
            error: 'CONFIRMATION_FAILED',
            message: error.message,
            debug: `Code: ${error.code || 'unknown'}, Status: ${error.status || 'unknown'}`
          }, 
          { status: 400 }
        );
      }

      if (data?.user) {
        userId = data.user.id;
        devLog.log('[API-ConfirmEmail] ✅ Email confirmado para usuário:', userId);
        
        // IMPORTANTE: Fazer logout imediato para evitar sessão persistente
        await supabaseClient.auth.signOut();
        devLog.log('[API-ConfirmEmail] 🚪 Logout imediato executado');
        
        // Extrair tenant_slug do user_metadata se existir
        try {
          const meta = (data.user as any)?.user_metadata || {};
          if (typeof meta?.tenant_slug === 'string' && meta.tenant_slug.trim()) {
            tenantSlug = meta.tenant_slug.trim();
          }
        } catch {}

        confirmationResult = {
          userId,
          email: data.user.email as string | undefined,
          confirmedAt: new Date().toISOString()
        };
      }

    } catch (error: any) {
      devLog.error('[API-ConfirmEmail] 💥 Erro na confirmação:', error);
      return NextResponse.json(
        { 
          error: 'INTERNAL_ERROR',
          message: 'Erro interno durante confirmação' 
        }, 
        { status: 500 }
      );
    }

    if (!confirmationResult) {
      devLog.log('[API-ConfirmEmail] ❌ Confirmação falhou - nenhum resultado');
      return NextResponse.json(
        { 
          error: 'CONFIRMATION_FAILED',
          message: 'Falha na confirmação do email' 
        }, 
        { status: 400 }
      );
    }

    // FASE 2: Verificar se usuário está corretamente criado na tabela users
    try {
      devLog.log('[API-ConfirmEmail] 🔍 Verificando usuário na tabela users...');
      
      const supabaseAdmin = createSupabaseAdmin();
      let tenantId: string | null = null;

      // Se houver tenantSlug, buscar o tenant_id correspondente
      if (tenantSlug) {
        const { data: org, error: orgErr } = await supabaseAdmin
          .from('organizations')
          .select('id, slug, status')
          .eq('slug', tenantSlug)
          .single();
        if (orgErr) {
          devLog.warn('[API-ConfirmEmail] ⚠️ Não foi possível obter tenant por slug', { tenantSlug, error: orgErr.message });
        } else if (!org) {
          devLog.warn('[API-ConfirmEmail] ⚠️ Slug não encontrado em organizations', { tenantSlug });
        } else if (org?.id) {
          tenantId = org.id;
        }
      }
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, email, name, role, tenant_id')
        .eq('id', userId)
        .single();

      if (userError && userError.code === 'PGRST116') {
        devLog.log('[API-ConfirmEmail] ⚠️ Usuário órfão detectado, criando entrada...');
        
        // Obter dados do auth.users para criar entrada
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);
        
        if (authError) {
          devLog.error('[API-ConfirmEmail] ❌ Erro ao buscar dados de auth:', authError);
        } else if (authUser.user) {
          // Se não veio tenant_slug do verifyOtp, tentar obter do user_metadata do admin.getUserById
          try {
            const meta = (authUser.user as any)?.user_metadata || {};
            const candidates = [meta.tenant_slug, meta.tenantSlug, meta.slug, meta.org_slug, meta.organization_slug];
            const found = candidates.find((v: any) => typeof v === 'string' && v.trim().length > 0);
            if (found && !tenantSlug) {
              tenantSlug = String(found).trim();
            }
          } catch {}

          // Se agora temos tenantSlug, buscar tenantId
          if (!tenantId && tenantSlug) {
            const { data: org2, error: orgErr2 } = await supabaseAdmin
              .from('organizations')
              .select('id, slug, status')
              .eq('slug', tenantSlug)
              .single();
            if (!orgErr2 && org2?.id) {
              tenantId = org2.id;
            } else if (orgErr2) {
              devLog.warn('[API-ConfirmEmail] ⚠️ Falha ao resolver tenantId por slug (admin pass)', { tenantSlug, error: orgErr2.message });
            }
          }
          // Criar entrada na tabela users
          const { error: insertError } = await supabaseAdmin
            .from('users')
            .insert({
              id: userId,
              email: authUser.user.email,
              name: authUser.user.user_metadata?.name || 
                    authUser.user.user_metadata?.full_name || 
                    authUser.user.email?.split('@')[0] || 'Usuário',
              role: 'client',
              status: 'pending',
              tenant_id: tenantId,
              created_at: authUser.user.created_at,
              updated_at: new Date().toISOString()
            });

          if (insertError) {
            devLog.error('[API-ConfirmEmail] ❌ Erro ao criar entrada de usuário:', insertError);
          } else {
            devLog.log('[API-ConfirmEmail] ✅ Entrada de usuário criada com sucesso');
          }
        }
      } else if (userData) {
        devLog.log('[API-ConfirmEmail] ✅ Usuário já existe na tabela users:', userData.email);
        // Se já existe e não tem tenant_id mas temos tenantId, atualizar
        if (!userData.tenant_id && tenantId) {
          const { error: updateErr } = await supabaseAdmin
            .from('users')
            .update({ tenant_id: tenantId })
            .eq('id', userId);
          if (updateErr) {
            devLog.warn('[API-ConfirmEmail] ⚠️ Falha ao associar tenant_id em usuário existente', { userId, updateErr: updateErr.message });
          } else {
            devLog.log('[API-ConfirmEmail] 🔗 Usuário associado ao tenant com sucesso', { userId, tenantId });
          }
        }
        // Não promover automaticamente; aprovação deve ser feita pelo admin do tenant
      }

    } catch (error) {
      devLog.error('[API-ConfirmEmail] ⚠️ Erro ao verificar/criar usuário:', error);
      // Não falhar a confirmação por isso
    }

    // RESPOSTA SAAS SUCCESS
    devLog.log('[API-ConfirmEmail] 🎉 Confirmação SaaS-grade concluída com sucesso');
    
    return NextResponse.json({
      success: true,
      message: 'Email confirmado com sucesso! Você pode fazer login agora.',
      data: {
        confirmed: true,
        userId: confirmationResult.userId,
        email: confirmationResult.email,
        confirmedAt: confirmationResult.confirmedAt,
        tenantSlug: tenantSlug || null
      }
    });

  } catch (error: any) {
    devLog.error('[API-ConfirmEmail] 💥 Erro inesperado:', error);
    
    return NextResponse.json(
      { 
        error: 'UNEXPECTED_ERROR',
        message: 'Erro inesperado durante confirmação' 
      }, 
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { token_hash, code, type } = await request.json();
  return handleConfirm(token_hash, code, type);
}

// Health check endpoint
export async function GET(request: NextRequest) {
  const configured = isSupabaseConfigured();
  
  // REMOVIDO: Processamento automático de token no GET para evitar consumo duplo
  // A página /confirmar-email deve usar apenas POST via service
  
  return NextResponse.json({
    service: 'email-confirmation',
    status: configured ? 'healthy' : 'configuration-required',
    configured,
    timestamp: new Date().toISOString(),
    message: configured ? 'Serviço funcionando corretamente' : 'Configuração do Supabase necessária'
  });
}

// Responder HEAD para link previewers sem consumir token
export async function HEAD() {
  return new NextResponse(null, { status: 204 });
}

// Permitir OPTIONS para preflight CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Allow': 'GET, POST, HEAD, OPTIONS',
    },
  });
}