import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';

/**
 * API DE DIAGNÓSTICO - GERAR PROCURAÇÃO
 *
 * Acesse no navegador:
 * http://localhost:3000/api/test/procuracao-diagnostico?projectId=SEU_PROJECT_ID
 *
 * A API usa automaticamente um admin do tenant para fazer as verificações.
 * Retorna JSON detalhado com todos os dados para debugging, incluindo:
 * - Dados do projeto direto do banco
 * - Simulação da API unified
 * - Comparação entre banco e API
 */
export async function GET(request: NextRequest) {
  const diagnostico: any = {
    timestamp: new Date().toISOString(),
    etapas: {},
    erros: [],
    sucesso: false
  };

  try {
    // ============================================
    // ETAPA 1: OBTER PARÂMETROS DA URL
    // ============================================
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');

    diagnostico.etapas['1_parametros'] = {
      projectId,
      projectIdType: typeof projectId,
      projectIdLength: projectId?.length
    };

    // ✅ SE NÃO FORNECER projectId, LISTAR PROJETOS DISPONÍVEIS
    if (!projectId) {
      const headersList = headers();
      const tenantIdHeader = headersList.get('x-tenant-id');

      if (!tenantIdHeader) {
        diagnostico.erros.push('Tenant não identificado');
        return NextResponse.json(diagnostico, { status: 400 });
      }

      const supabase = createSupabaseServiceRoleClient();
      const { data: projetos } = await supabase
        .from('projects')
        .select('id, number, nome_cliente_final, client_city, client_state')
        .eq('tenant_id', tenantIdHeader)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(10);

      return NextResponse.json({
        mensagem: 'Forneça um projectId na URL. Aqui estão os 10 projetos mais recentes deste tenant:',
        exemplo_uso: 'http://localhost:3000/api/test/procuracao-diagnostico?projectId=SEU_PROJECT_ID',
        projetos_disponiveis: projetos?.map(p => ({
          id: p.id,
          number: p.number,
          nome_cliente_final: p.nome_cliente_final,
          tem_cidade: !!p.client_city,
          tem_estado: !!p.client_state,
          url_teste: `http://localhost:3000/api/test/procuracao-diagnostico?projectId=${p.id}`
        }))
      }, { status: 200 });
    }

    // ============================================
    // ETAPA 2: OBTER HEADERS DO MIDDLEWARE
    // ============================================
    const headersList = headers();
    const tenantIdHeader = headersList.get('x-tenant-id');
    const tenantSlug = headersList.get('x-tenant-slug');
    const tenantName = headersList.get('x-tenant-name');

    diagnostico.etapas['2_headers'] = {
      'x-tenant-id': tenantIdHeader,
      'x-tenant-slug': tenantSlug,
      'x-tenant-name': tenantName,
      'host': headersList.get('host'),
      'user-agent': headersList.get('user-agent')?.substring(0, 50) + '...'
    };

    // ============================================
    // ETAPA 3: BUSCAR UM ADMIN DO TENANT
    // ============================================
    try {
      const supabase = createSupabaseServiceRoleClient();

      // Buscar qualquer admin do tenant atual
      const { data: adminUser, error: adminError } = await supabase
        .from('users')
        .select('id, email, name, role, tenant_id')
        .eq('tenant_id', tenantIdHeader)
        .in('role', ['admin', 'superadmin'])
        .limit(1)
        .single();

      diagnostico.etapas['3_admin_tenant'] = {
        encontrado: !!adminUser,
        id: adminUser?.id,
        email: adminUser?.email,
        name: adminUser?.name,
        role: adminUser?.role,
        tenantId: adminUser?.tenant_id,
        erro: adminError
      };

      if (!adminUser) {
        diagnostico.erros.push('Nenhum admin encontrado neste tenant');
        return NextResponse.json(diagnostico, { status: 404 });
      }

      const userData = {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
        tenantId: adminUser.tenant_id
      };

      // ============================================
      // ETAPA 4: BUSCAR PROJETO NO BANCO
      // ============================================
      // (supabase já foi criado na etapa 3)

      // Primeira tentativa: buscar projeto por ID sem filtro de tenant
      const { data: projectSemFiltro, error: errorSemFiltro } = await supabase
        .from('projects')
        .select('id, owner_id, tenant_id, number, status')
        .eq('id', projectId)
        .maybeSingle();

      diagnostico.etapas['4a_projeto_sem_filtro'] = {
        encontrado: !!projectSemFiltro,
        erro: errorSemFiltro,
        projeto: projectSemFiltro,
        query: `SELECT * FROM projects WHERE id = '${projectId}'`
      };

      // Segunda tentativa: buscar projeto com filtro de tenant
      const { data: projectComFiltro, error: errorComFiltro } = await supabase
        .from('projects')
        .select('id, owner_id, tenant_id, number, status')
        .eq('id', projectId)
        .eq('tenant_id', userData.tenantId)
        .maybeSingle();

      diagnostico.etapas['4b_projeto_com_filtro_tenant'] = {
        encontrado: !!projectComFiltro,
        erro: errorComFiltro,
        projeto: projectComFiltro,
        query: `SELECT * FROM projects WHERE id = '${projectId}' AND tenant_id = '${userData.tenantId}'`
      };

      // ============================================
      // ETAPA 5: VERIFICAR TENANT MATCH
      // ============================================
      if (projectSemFiltro) {
        diagnostico.etapas['5_tenant_match'] = {
          projectTenantId: projectSemFiltro.tenant_id,
          userTenantId: userData.tenantId,
          headerTenantId: tenantIdHeader,
          match_project_user: projectSemFiltro.tenant_id === userData.tenantId,
          match_project_header: projectSemFiltro.tenant_id === tenantIdHeader,
          match_user_header: userData.tenantId === tenantIdHeader
        };
      }

      // ============================================
      // ETAPA 6: VERIFICAR PERMISSÕES
      // ============================================
      if (projectSemFiltro) {
        const isAdmin = userData.role === 'admin' || userData.role === 'superadmin';
        const isOwner = projectSemFiltro.owner_id === userData.id;

        diagnostico.etapas['6_permissoes'] = {
          userRole: userData.role,
          isAdmin,
          isOwner,
          projectOwnerId: projectSemFiltro.owner_id,
          adminUserId: userData.id,
          temPermissao: isAdmin || isOwner
        };
      }

      // ============================================
      // ETAPA 7: BUSCAR PROJETO COM client_city E client_state
      // ============================================
      const { data: projectCompleto, error: errorCompleto } = await supabase
        .from('projects')
        .select('id, number, nome_cliente_final, cpf_cnpj_cliente_final, client_city, client_state, distribuidora')
        .eq('id', projectId)
        .maybeSingle();

      diagnostico.etapas['7_projeto_completo_banco'] = {
        encontrado: !!projectCompleto,
        erro: errorCompleto,
        dados_no_banco: projectCompleto,
        client_city_no_banco: projectCompleto?.client_city,
        client_state_no_banco: projectCompleto?.client_state
      };

      // ============================================
      // ETAPA 8: SIMULAR CHAMADA DA API UNIFIED
      // ============================================
      try {
        // Buscar TODOS os projetos (como o frontend faz)
        const { data: todosProjetosAPI, error: errorAPI } = await supabase
          .from('projects')
          .select(`
            *,
            owner:users!owner_id (
              id,
              name,
              company_name
            )
          `)
          .eq('tenant_id', userData.tenantId)
          .is('deleted_at', null);

        // Encontrar o projeto específico na lista
        const projetoNaAPI = todosProjetosAPI?.find(p => p.id === projectId);

        diagnostico.etapas['8_api_unified_simulacao'] = {
          total_projetos_retornados: todosProjetosAPI?.length || 0,
          projeto_encontrado_na_api: !!projetoNaAPI,
          dados_da_api: projetoNaAPI ? {
            id: projetoNaAPI.id,
            number: projetoNaAPI.number,
            nome_cliente_final: projetoNaAPI.nome_cliente_final,
            cpf_cnpj_cliente_final: projetoNaAPI.cpf_cnpj_cliente_final,
            client_city: projetoNaAPI.client_city,
            client_state: projetoNaAPI.client_state,
            distribuidora: projetoNaAPI.distribuidora
          } : null,
          client_city_na_api: projetoNaAPI?.client_city,
          client_state_na_api: projetoNaAPI?.client_state,
          tipos: {
            client_city_type: typeof projetoNaAPI?.client_city,
            client_state_type: typeof projetoNaAPI?.client_state
          }
        };

        // ============================================
        // ETAPA 9: COMPARAÇÃO BANCO vs API
        // ============================================
        diagnostico.etapas['9_comparacao'] = {
          client_city: {
            no_banco: projectCompleto?.client_city,
            na_api: projetoNaAPI?.client_city,
            sao_iguais: projectCompleto?.client_city === projetoNaAPI?.client_city
          },
          client_state: {
            no_banco: projectCompleto?.client_state,
            na_api: projetoNaAPI?.client_state,
            sao_iguais: projectCompleto?.client_state === projetoNaAPI?.client_state
          }
        };

      } catch (apiError: any) {
        diagnostico.etapas['8_api_unified_simulacao'] = {
          erro: true,
          mensagem: apiError.message
        };
      }

      // ============================================
      // CONCLUSÃO
      // ============================================
      diagnostico.sucesso = !!projectSemFiltro && !!userData;

      if (diagnostico.sucesso) {
        diagnostico.conclusao = {
          status: '✅ TUDO OK',
          mensagem: 'Projeto encontrado, usuário autenticado, permissões OK',
          proximoPasso: 'A Server Action deveria funcionar'
        };
      } else {
        diagnostico.conclusao = {
          status: '❌ PROBLEMA ENCONTRADO',
          mensagem: 'Veja os detalhes nas etapas acima',
          proximoPasso: 'Corrija os problemas identificados'
        };
      }

    } catch (error: any) {
      diagnostico.erros.push({
        mensagem: error.message,
        stack: error.stack
      });
      return NextResponse.json(diagnostico, { status: 500 });
    }

    return NextResponse.json(diagnostico, {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error: any) {
    diagnostico.erros.push({
      mensagem: 'Erro fatal: ' + error.message,
      stack: error.stack
    });
    return NextResponse.json(diagnostico, { status: 500 });
  }
}
