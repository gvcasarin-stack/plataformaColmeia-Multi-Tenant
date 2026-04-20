import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { devLog } from "@/lib/utils/productionLogger";
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { handleTempTenant } from '@/lib/utils/temp-tenant-handler';
import { randomUUID } from 'crypto';

export async function GET(request: NextRequest) {
  try {
    devLog.log('[API] [Config] Buscando configurações administrativas');

    // ✅ SEGURANÇA: Obter tenant_id dos headers
    const headersList = headers();
    const tenantId = headersList.get('x-tenant-id');

    if (!tenantId) {
      devLog.error('[API] [Config] Tenant ID não encontrado nos headers');
      return NextResponse.json(
        { error: 'Acesso negado: tenant não identificado' },
        { status: 403 }
      );
    }

    // 🛠️ FALLBACK: Lidar com tenants temporários
    const tempTenantResponse = handleTempTenant(tenantId, 'object', 'Config');
    if (tempTenantResponse) {
      return tempTenantResponse;
    }

    const supabase = createSupabaseServiceRoleClient();
    
    // ✅ SEGURANÇA: Buscar configurações apenas do tenant atual
    const { data, error } = await supabase
      .from('configs')
      .select('key, value, description')
      .in('key', [
        'checklist_message',
        'tabela_precos',
        'faixas_potencia',
        'dados_bancarios',
        'responsavel_tecnico',
        'texto_procuracao',
        'precificacao_manual',
        'logo_empresa_url'
      ])
      .eq('tenant_id', tenantId);  // ✅ CRÍTICO: Filtrar por tenant

    if (error) {
      // Fallback: em tenants novos, a tabela/linhas podem não existir ainda
      devLog.warn('[API] [Config] Erro ao buscar configs, retornando defaults vazios:', error);
      return NextResponse.json({ success: true, data: {} });
    }

    // Converter para formato esperado
    const config: any = {};
    data?.forEach(item => {
      let parsedValue = item.value;

      // ✅ CORREÇÃO: Parse dos valores JSONB que vêm como strings serializadas
      if (typeof item.value === 'string') {
        try {
          parsedValue = JSON.parse(item.value);
          devLog.log(`[API] [Config] Parsed "${item.key}" de string para ${typeof parsedValue}`);
        } catch (e) {
          // Se falhar o parse, usar o valor original
          devLog.log(`[API] [Config] "${item.key}" não precisa de parse, usando valor original`);
        }
      }

      config[item.key] = parsedValue;
    });

    devLog.log('[API] [Config] Configurações encontradas:', Object.keys(config));

    return NextResponse.json({
      success: true,
      data: config
    });

  } catch (error) {
    // Fallback total: não quebrar UI por falta de configs em tenants novos
    devLog.warn('[API] [Config] Exceção (fallback retornando vazio):', error);
    return NextResponse.json({ success: true, data: {} });
  }
}

export async function POST(request: NextRequest) {
  try {
    devLog.log('[API] [Config] Salvando configurações administrativas');

    // ✅ SEGURANÇA: Obter tenant_id dos headers
    const headersList = headers();
    const tenantId = headersList.get('x-tenant-id');

    if (!tenantId) {
      devLog.error('[API] [Config] Tenant ID não encontrado nos headers');
      return NextResponse.json(
        { error: 'Acesso negado: tenant não identificado' },
        { status: 403 }
      );
    }

    // ✅ Usar Service Role Client para operações no banco
    const supabase = createSupabaseServiceRoleClient();

    const body = await request.json();
    const { key, value, description } = body;

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: 'Chave e valor são obrigatórios' },
        { status: 400 }
      );
    }

    // ✅ Obter user_id: tentar autenticação, se falhar buscar admin do tenant
    let userId: string | null = null;
    
    try {
      const supabaseAuth = createSupabaseServerClient();
      const { data: { user } } = await supabaseAuth.auth.getUser();
      if (user) {
        userId = user.id;
        devLog.log('[API] [Config] User ID obtido da autenticação:', userId);
      }
    } catch (error) {
      devLog.warn('[API] [Config] Não foi possível obter user_id da autenticação:', error);
    }

    // ✅ FALLBACK: Se não conseguiu user_id, buscar qualquer usuário do tenant
    if (!userId) {
      devLog.log('[API] [Config] Buscando usuário do tenant como fallback...');
      
      // Tentar buscar na ordem: superadmin -> admin -> primeiro usuário do tenant
      const { data: fallbackUser, error: fallbackError } = await supabase
        .from('users')
        .select('id, role')
        .eq('tenant_id', tenantId)
        .in('role', ['superadmin', 'admin'])
        .limit(1)
        .maybeSingle();

      if (fallbackUser && !fallbackError) {
        userId = fallbackUser.id;
        devLog.log('[API] [Config] User ID obtido do fallback:', userId, 'role:', fallbackUser.role);
      } else {
        // Se não encontrou admin/superadmin, pegar qualquer usuário do tenant
        devLog.warn('[API] [Config] Não encontrou admin/superadmin, buscando qualquer usuário...');
        
        const { data: anyUser, error: anyUserError } = await supabase
          .from('users')
          .select('id, role')
          .eq('tenant_id', tenantId)
          .limit(1)
          .maybeSingle();

        if (anyUser && !anyUserError) {
          userId = anyUser.id;
          devLog.log('[API] [Config] User ID obtido de qualquer usuário:', userId, 'role:', anyUser.role);
        } else {
          devLog.error('[API] [Config] Não foi possível obter user_id:', anyUserError);
          return NextResponse.json(
            { 
              error: 'Não foi possível identificar o usuário. Entre em contato com o suporte.',
              details: 'created_by é obrigatório e não foi possível obter user_id'
            },
            { status: 500 }
          );
        }
      }
    }

    devLog.log('[API] [Config] Salvando configuração:', { key, description, tenantId, userId });

    // ✅ SEGURANÇA: Verificar se configuração já existe no tenant atual
    const { data: existing } = await supabase
      .from('configs')
      .select('id')
      .eq('key', key)
      .eq('tenant_id', tenantId)  // ✅ CRÍTICO: Verificar tenant
      .maybeSingle();  // ✅ Usa maybeSingle para não lançar erro se não existir

    devLog.log('[API] [Config] Tipo do valor recebido:', typeof value, 'Valor:', value);

    if (existing) {
      // ✅ SEGURANÇA: Atualizar configuração apenas do tenant atual
      devLog.log('[API] [Config] Atualizando configuração existente:', key);

      const { error } = await supabase
        .from('configs')
        .update({
          value: value,  // Supabase aceita qualquer tipo e converte para JSONB automaticamente
          description,
          updated_by: userId,  // ✅ CRÍTICO: Registrar quem atualizou (pode ser null)
          updated_at: new Date().toISOString()
        })
        .eq('key', key)
        .eq('tenant_id', tenantId);  // ✅ CRÍTICO: Verificar tenant

      if (error) {
        devLog.error('[API] [Config] Erro ao atualizar configuração:', error);
        devLog.error('[API] [Config] Detalhes do erro:', {
          key,
          value,
          valueType: typeof value,
          errorMessage: error.message,
          errorCode: error.code,
          errorDetails: error.details,
          errorHint: error.hint
        });
        return NextResponse.json(
          {
            success: false,
            error: 'Erro ao atualizar configuração',
            details: error.message,
            hint: error.hint || '',
            code: error.code || ''
          },
          { status: 500 }
        );
      }

      devLog.log('[API] [Config] Configuração atualizada com sucesso:', key);
    } else {
      // ✅ SEGURANÇA: Criar nova configuração com tenant_id
      devLog.log('[API] [Config] Criando nova configuração:', key);

      const configId = randomUUID();
      devLog.log('[API] [Config] ID gerado para config:', configId);

      // ✅ Descobrir category válida baseada em registros existentes
      let categoryValida = 'general';  // fallback padrão
      try {
        const { data: exampleConfig } = await supabase
          .from('configs')
          .select('category')
          .eq('tenant_id', tenantId)
          .limit(1)
          .maybeSingle();
        
        if (exampleConfig?.category) {
          categoryValida = exampleConfig.category;
          devLog.log('[API] [Config] Category válida obtida:', categoryValida);
        }
      } catch (catError) {
        devLog.warn('[API] [Config] Não foi possível obter category válida, usando fallback');
      }

      const { error } = await supabase
        .from('configs')
        .insert([{
          id: configId,  // ✅ CRÍTICO: Fornecer ID explícito
          key,
          value: value,  // Supabase aceita qualquer tipo e converte para JSONB automaticamente
          description: description || `Configuração ${key}`,
          category: categoryValida,  // ✅ CRÍTICO: Usar category válida do banco
          tenant_id: tenantId,  // ✅ CRÍTICO: Associar ao tenant
          is_system: false,  // ✅ Não é configuração de sistema
          is_encrypted: false,  // ✅ Não precisa criptografar
          created_by: userId,  // ✅ Registrar quem criou
          updated_by: userId  // ✅ Registrar quem atualizou
          // created_at e updated_at serão gerados automaticamente pelo banco
        }]);

      if (error) {
        devLog.error('[API] [Config] Erro ao criar configuração:', error);
        devLog.error('[API] [Config] Detalhes do erro:', {
          key,
          value,
          valueType: typeof value,
          errorMessage: error.message,
          errorCode: error.code,
          errorDetails: error.details,
          errorHint: error.hint
        });
        return NextResponse.json(
          {
            success: false,
            error: 'Erro ao criar configuração',
            details: error.message,
            hint: error.hint || '',
            code: error.code || ''
          },
          { status: 500 }
        );
      }

      devLog.log('[API] [Config] Nova configuração criada com sucesso:', key);
    }

    return NextResponse.json({
      success: true,
      message: 'Configuração salva com sucesso'
    });

  } catch (error) {
    devLog.error('[API] [Config] Exceção:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
} 