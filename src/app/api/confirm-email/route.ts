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

export async function POST(request: NextRequest) {
  try {
    devLog.log('[API-ConfirmEmail] 🚀 Iniciando confirmação SaaS-grade');
    
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
    
    const { token_hash, code, type = 'email' } = await request.json();
    
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
    let confirmationResult = null;
    let userId = null;

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
        devLog.log('[API-ConfirmEmail] ❌ verifyOtp falhou:', error.message);
        
        // Mapear erros para formato SaaS
        if (error.message.includes('expired')) {
          return NextResponse.json(
            { 
              error: 'TOKEN_EXPIRED',
              message: 'Link de confirmação expirado. Solicite um novo.' 
            }, 
            { status: 400 }
          );
        }
        
        if (error.message.includes('invalid')) {
          return NextResponse.json(
            { 
              error: 'TOKEN_INVALID',
              message: 'Link de confirmação inválido.' 
            }, 
            { status: 400 }
          );
        }

        return NextResponse.json(
          { 
            error: 'CONFIRMATION_FAILED',
            message: error.message 
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
        
        confirmationResult = {
          userId,
          email: data.user.email,
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
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, email, full_name, role')
        .eq('id', userId)
        .single();

      if (userError && userError.code === 'PGRST116') {
        devLog.log('[API-ConfirmEmail] ⚠️ Usuário órfão detectado, criando entrada...');
        
        // Obter dados do auth.users para criar entrada
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);
        
        if (authError) {
          devLog.error('[API-ConfirmEmail] ❌ Erro ao buscar dados de auth:', authError);
        } else if (authUser.user) {
          // Criar entrada na tabela users
          const { error: insertError } = await supabaseAdmin
            .from('users')
            .insert({
              id: userId,
              email: authUser.user.email,
              full_name: authUser.user.user_metadata?.full_name || 
                        authUser.user.user_metadata?.name || 
                        authUser.user.email?.split('@')[0] || 'Usuário',
              role: 'cliente',
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
        confirmedAt: confirmationResult.confirmedAt
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

// Health check endpoint
export async function GET() {
  const configured = isSupabaseConfigured();
  
  return NextResponse.json({
    service: 'email-confirmation',
    status: configured ? 'healthy' : 'configuration-required',
    configured,
    timestamp: new Date().toISOString(),
    message: configured ? 'Serviço funcionando corretamente' : 'Configuração do Supabase necessária'
  });
} 