import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from "@/lib/utils/productionLogger";
import { handleTempTenant } from '@/lib/utils/temp-tenant-handler';

/**
 * API UNIFICADA PARA PROJETOS - MULTI-TENANT SEGURA
 * Centraliza todas as operações de projetos em uma única API
 * ✅ CORRIGIDO: Agora filtra por tenant_id para isolamento
 */

/**
 * GET - Buscar projetos do tenant atual (SEGURO)
 */
export async function GET(request: NextRequest) {
  try {
    devLog.log('[API Unified] ========== INICIANDO BUSCA DE PROJETOS ==========');

    // ✅ SEGURANÇA: Obter tenant_id dos headers
    const headersList = headers();
    const tenantId = headersList.get('x-tenant-id');
    const tenantName = headersList.get('x-tenant-name');
    const tenantSlug = headersList.get('x-tenant-slug');

    devLog.log('[API Unified] Headers recebidos:', {
      tenantId,
      tenantName,
      tenantSlug
    });

    if (!tenantId) {
      devLog.error('[API Unified] Tenant ID não encontrado nos headers');
      return NextResponse.json(
        { error: 'Acesso negado: tenant não identificado' },
        { status: 403 }
      );
    }

    // 🛠️ FALLBACK: Lidar com tenants temporários
    const tempTenantResponse = handleTempTenant(tenantId, 'array', 'Projects');
    if (tempTenantResponse) {
      return tempTenantResponse;
    }

    // Verificar se estamos em contexto de build
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      devLog.warn('[API Unified] Service Role Key não disponível (build)');
      return NextResponse.json({
        success: true,
        data: [],
        note: 'Service Role Key não configurada'
      });
    }

    devLog.log('[API Unified] Criando cliente Supabase...');
    const supabase = createSupabaseServiceRoleClient();

    devLog.log('[API Unified] Executando query para buscar projetos...');
    // 🆕 CORREÇÃO: Adicionar LEFT JOIN com users para buscar dados do proprietário
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        owner:users!owner_id (
          id,
          name,
          company_name
        )
      `)
      .eq('tenant_id', tenantId)  // ✅ CRÍTICO: Filtrar por tenant
      .is('deleted_at', null)  // ✅ SOFT DELETE: Excluir projetos arquivados
      .order('created_at', { ascending: false });

    devLog.log('[API Unified] Query executada. Resultado:', {
      hasData: !!data,
      dataLength: data?.length || 0,
      hasError: !!error,
      errorCode: error?.code,
      errorMessage: error?.message
    });

    if (error) {
      devLog.error('[API Unified] ERRO NA QUERY PRINCIPAL:', {
        error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      
      // Fallback: buscar projetos com status simples
      const { data: projectsOnly, error: fallbackError } = await supabase
        .from('projects')
        .select(`
          *,
          status_info:project_statuses(
            id,
            name,
            slug,
            color,
            order_index
          )
        `)
        .eq('tenant_id', tenantId)  // ✅ CRÍTICO: Fallback também deve filtrar por tenant
        .is('deleted_at', null)  // ✅ SOFT DELETE: Excluir projetos arquivados
        .eq('project_statuses.tenant_id', tenantId) // Status do mesmo tenant
        .eq('status', 'project_statuses.slug') // JOIN por slug
        .order('created_at', { ascending: false });

      if (fallbackError) {
        devLog.error('[API Unified] Erro no fallback:', fallbackError);
        return NextResponse.json(
          { error: 'Erro ao buscar projetos', details: fallbackError.message },
          { status: 500 }
        );
      }

      // Mapear sem informações de usuário mas com status completo
      const projectsWithBilling = projectsOnly?.map(project => ({
        ...project,
        client_id: project.owner_id || project.created_by, // 🆕 CORRIGIDO: Usar proprietário, fallback para criador
        client_name: 'Cliente não disponível',
        // ✅ REGRA: NUNCA forçar pagamento como pendente na busca
        pagamento: project.pagamento, // Preserva valor original
        empresaIntegradora: project.empresa_integradora,
        nomeClienteFinal: project.nome_cliente_final,
        distribuidora: project.distribuidora,
        potencia: project.potencia,
        valorProjeto: project.valor_projeto || project.valorProjeto || 0,
        listaMateriais: project.lista_materiais,
        disjuntorPadraoEntrada: project.disjuntor_padrao_entrada,
        cpf_cnpj_cliente_final: project.cpf_cnpj_cliente_final,
        endereco_local: project.endereco_local,
        // ✅ NOVO: Informações do status mesmo no fallback com proteção adicional
        statusInfo: project.status_info ? {
          id: project.status_info.id,
          name: project.status_info.name,
          slug: project.status_info.slug,
          color: project.status_info.color,
          order: project.status_info.order_index
        } : {
          // ✅ FALLBACK: Usar dados básicos se status_info for null
          id: 'fallback',
          name: project.status || 'Não Iniciado',
          slug: project.status || 'nao-iniciado',
          color: '#f59e0b',
          order: 1
        }
      })) || [];

      return NextResponse.json({
        success: true,
        data: projectsWithBilling
      });
    }

    devLog.log('[API Unified] Projetos encontrados:', {
      count: data?.length || 0,
      sample: data?.slice(0, 1).map(p => ({
        id: p.id,
        number: p.number,
        pagamento: p.pagamento // Log para debug
      }))
    });

    // ✅ CORREÇÃO: Mapear dados básicos com cálculo dinâmico de empresaIntegradora
    const projectsWithBilling = data?.map(project => {
      // 🆕 Calcular empresaIntegradora dinamicamente baseado no proprietário
      let empresaIntegradoraFinal = project.empresa_integradora || '';

      if (project.owner_id && project.owner) {
        // Projeto tem proprietário: usar dados do owner
        empresaIntegradoraFinal = project.owner.company_name || project.owner.name || empresaIntegradoraFinal;
      }

      return {
        ...project,
        client_id: project.owner_id || project.created_by, // Usar proprietário, fallback para criador
        client_name: 'Cliente não disponível', // Será resolvido em próxima query se necessário
        // ✅ REGRA: NUNCA forçar pagamento como pendente na busca
        pagamento: project.pagamento, // Preserva valor original (pode ser null, 'pendente', 'parcela1', 'pago')
        empresaIntegradora: empresaIntegradoraFinal, // 🆕 CORRIGIDO: Usar dados do proprietário
        nomeClienteFinal: project.nome_cliente_final,
        distribuidora: project.distribuidora,
        potencia: project.potencia,
        listaMateriais: project.lista_materiais,
        disjuntorPadraoEntrada: project.disjuntor_padrao_entrada,
        cpf_cnpj_cliente_final: project.cpf_cnpj_cliente_final,
        endereco_local: project.endereco_local,
        valorProjeto: project.valor_projeto || project.valorProjeto || 0,
        // ✅ FALLBACK: Dados básicos do status (será melhorado em próximo request)
        statusInfo: {
          id: 'basic',
          name: project.status || 'Não Iniciado',
          slug: project.status || 'nao-iniciado',
          color: '#f59e0b',
          order: 1
        }
      };
    }) || [];

    devLog.log('[API Unified] Projetos mapeados:', {
      count: projectsWithBilling.length,
      paymentStatuses: projectsWithBilling.map(p => ({ id: p.id, pagamento: p.pagamento }))
    });

    return NextResponse.json({
      success: true,
      data: projectsWithBilling
    });

  } catch (error) {
    devLog.error('[API Unified] ========== EXCEÇÃO CAPTURADA ==========', {
      error,
      message: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : 'N/A',
      type: typeof error,
      name: error instanceof Error ? error.name : 'N/A'
    });
    return NextResponse.json(
      {
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Criar novo projeto (SEGURO + BILLING MODES)
 */
export async function POST(request: NextRequest) {
  try {
    devLog.log('[API Unified] Criando novo projeto');

    // ✅ SEGURANÇA: Obter tenant_id dos headers
    const headersList = headers();
    const tenantId = headersList.get('x-tenant-id');

    if (!tenantId) {
      devLog.error('[API Unified] Tenant ID não encontrado nos headers');
      return NextResponse.json(
        { error: 'Acesso negado: tenant não identificado' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const supabase = createSupabaseServiceRoleClient();

    // ✅ VALIDAÇÃO: Verificar se status fornecido existe no tenant
    if (body.status) {
      const { data: statusExists } = await supabase
        .from('project_statuses')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('slug', body.status)
        .eq('is_active', true)
        .single();

      if (!statusExists) {
        return NextResponse.json({
          error: 'Status de projeto inválido para este tenant',
          validStatuses: 'Use GET /api/project-statuses para ver status válidos'
        }, { status: 400 });
      }
    }

    // 🆕 BILLING MODES: Buscar usuário e verificar modalidade de faturamento
    const ownerId = body.owner_id || body.created_by;

    if (!ownerId) {
      return NextResponse.json(
        { error: 'Owner ID ou Created By é obrigatório' },
        { status: 400 }
      );
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, billing_mode, tenant_id')
      .eq('id', ownerId)
      .single();

    if (userError || !user) {
      devLog.error('[API Unified] Erro ao buscar usuário:', userError);
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // ✅ SEGURANÇA: Verificar se usuário pertence ao tenant
    if (user.tenant_id !== tenantId) {
      devLog.error('[API Unified] Tentativa de criar projeto para usuário de outro tenant');
      return NextResponse.json(
        { error: 'Acesso negado: usuário não pertence a este tenant' },
        { status: 403 }
      );
    }

    const billingMode = user.billing_mode || 'avulso';
    let billingSnapshot: any = null;
    let clientePacoteId: string | null = null;
    let clienteAssinaturaId: string | null = null;

    // 🆕 BILLING MODES: Validar e consumir de acordo com modalidade
    if (billingMode === 'pacote') {
      // Buscar pacote ativo do cliente
      const { data: pacote, error: pacoteError } = await supabase
        .from('cliente_pacotes')
        .select(`
          *,
          pacote:pacotes_definicoes(*)
        `)
        .eq('user_id', ownerId)
        .eq('status', 'ativo')
        .single();

      if (pacoteError || !pacote) {
        return NextResponse.json(
          {
            error: 'Cliente não possui pacote ativo',
            details: 'O cliente tem modalidade "Pacote", mas não há pacote ativo disponível. Ative um pacote antes de criar projetos.'
          },
          { status: 400 }
        );
      }

      // Validar se pacote está expirado
      const agora = new Date();
      const dataExpiracao = new Date(pacote.data_expiracao);

      if (agora > dataExpiracao) {
        // Atualizar status do pacote para expirado
        await supabase
          .from('cliente_pacotes')
          .update({ status: 'expirado' })
          .eq('id', pacote.id);

        return NextResponse.json(
          {
            error: 'Pacote expirado',
            details: `O pacote expirou em ${dataExpiracao.toLocaleDateString('pt-BR')}. Ative um novo pacote para continuar criando projetos.`
          },
          { status: 400 }
        );
      }

      // Validar se ainda há projetos disponíveis
      if (pacote.projetos_usados >= pacote.projetos_inclusos) {
        // Atualizar status do pacote para esgotado
        await supabase
          .from('cliente_pacotes')
          .update({ status: 'esgotado' })
          .eq('id', pacote.id);

        return NextResponse.json(
          {
            error: 'Pacote esgotado',
            details: `Todos os ${pacote.projetos_inclusos} projetos do pacote foram utilizados. Ative um novo pacote para continuar.`
          },
          { status: 400 }
        );
      }

      // ✅ Decrementar contador de projetos
      const { error: updateError } = await supabase
        .from('cliente_pacotes')
        .update({
          projetos_usados: pacote.projetos_usados + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', pacote.id);

      if (updateError) {
        devLog.error('[API Unified] Erro ao decrementar pacote:', updateError);
        return NextResponse.json(
          { error: 'Erro ao consumir pacote', details: updateError.message },
          { status: 500 }
        );
      }

      // ✅ Armazenar ID do pacote para FK
      clientePacoteId = pacote.id;

      // ✅ Criar snapshot do billing
      billingSnapshot = {
        mode: 'pacote',
        pacote_id: pacote.id,
        pacote_nome: pacote.pacote?.nome || 'Pacote',
        projetos_inclusos: pacote.projetos_inclusos,
        projetos_usados_antes: pacote.projetos_usados,
        projetos_usados_depois: pacote.projetos_usados + 1,
        data_ativacao: pacote.data_ativacao,
        data_expiracao: pacote.data_expiracao,
        timestamp: new Date().toISOString()
      };

      devLog.log('[API Unified] Pacote consumido:', {
        pacoteId: pacote.id,
        projetosRestantes: pacote.projetos_inclusos - (pacote.projetos_usados + 1)
      });

    } else if (billingMode === 'assinatura') {
      // Buscar assinatura ativa do cliente
      const { data: assinatura, error: assinaturaError } = await supabase
        .from('cliente_assinaturas')
        .select(`
          *,
          plano:planos_assinatura(*)
        `)
        .eq('user_id', ownerId)
        .in('status', ['ativa', 'pendente_renovacao'])
        .single();

      if (assinaturaError || !assinatura) {
        return NextResponse.json(
          {
            error: 'Cliente não possui assinatura ativa',
            details: 'O cliente tem modalidade "Assinatura", mas não há assinatura ativa. Ative uma assinatura antes de criar projetos.'
          },
          { status: 400 }
        );
      }

      // Validar status da assinatura
      if (assinatura.status === 'pausada') {
        return NextResponse.json(
          {
            error: 'Assinatura pausada',
            details: 'A assinatura está pausada. Reative a assinatura para continuar criando projetos.'
          },
          { status: 400 }
        );
      }

      if (assinatura.status === 'cancelada') {
        return NextResponse.json(
          {
            error: 'Assinatura cancelada',
            details: 'A assinatura foi cancelada. Ative uma nova assinatura para criar projetos.'
          },
          { status: 400 }
        );
      }

      // Validar se ainda há projetos disponíveis no mês
      if (assinatura.projetos_usados_mes_atual >= assinatura.projetos_mensais) {
        return NextResponse.json(
          {
            error: 'Cota mensal esgotada',
            details: `Todos os ${assinatura.projetos_mensais} projetos do mês foram utilizados. Aguarde a renovação em ${new Date(assinatura.proximo_reset).toLocaleDateString('pt-BR')}.`
          },
          { status: 400 }
        );
      }

      // ✅ Decrementar contador mensal
      const { error: updateError } = await supabase
        .from('cliente_assinaturas')
        .update({
          projetos_usados_mes_atual: assinatura.projetos_usados_mes_atual + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', assinatura.id);

      if (updateError) {
        devLog.error('[API Unified] Erro ao decrementar assinatura:', updateError);
        return NextResponse.json(
          { error: 'Erro ao consumir assinatura', details: updateError.message },
          { status: 500 }
        );
      }

      // ✅ Armazenar ID da assinatura para FK
      clienteAssinaturaId = assinatura.id;

      // ✅ Criar snapshot do billing
      billingSnapshot = {
        mode: 'assinatura',
        assinatura_id: assinatura.id,
        plano_nome: assinatura.plano?.nome || 'Plano de Assinatura',
        projetos_mensais: assinatura.projetos_mensais,
        projetos_usados_antes: assinatura.projetos_usados_mes_atual,
        projetos_usados_depois: assinatura.projetos_usados_mes_atual + 1,
        dia_renovacao: assinatura.dia_renovacao,
        ultimo_reset: assinatura.ultimo_reset,
        proximo_reset: assinatura.proximo_reset,
        status: assinatura.status,
        timestamp: new Date().toISOString()
      };

      devLog.log('[API Unified] Assinatura consumida:', {
        assinaturaId: assinatura.id,
        projetosRestantesMes: assinatura.projetos_mensais - (assinatura.projetos_usados_mes_atual + 1)
      });

    } else {
      // Modo 'avulso' - usar lógica atual (kWp × preço)
      billingSnapshot = {
        mode: 'avulso',
        potencia: body.potencia || 0,
        valor_projeto: body.valor_projeto || body.valorProjeto || 0,
        timestamp: new Date().toISOString()
      };

      devLog.log('[API Unified] Projeto avulso - sem consumo de pacote/assinatura');
    }

    // ✅ SEGURANÇA: Forçar tenant_id, status padrão e billing info no projeto
    const projectData = {
      ...body,
      tenant_id: tenantId,  // ✅ CRÍTICO: Sempre inserir tenant_id
      status: body.status || 'nao-iniciado', // ✅ NOVO: Status padrão usando slug
      pagamento: 'pendente', // Valor inicial obrigatório
      billing_mode: billingMode, // 🆕 Congelar modalidade de faturamento
      billing_snapshot: billingSnapshot, // 🆕 Congelar detalhes do billing
      cliente_pacote_id: clientePacoteId, // 🆕 FK para pacote (se aplicável)
      cliente_assinatura_id: clienteAssinaturaId, // 🆕 FK para assinatura (se aplicável)
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('projects')
      .insert(projectData)
      .select()
      .single();

    if (error) {
      devLog.error('[API Unified] Erro ao criar projeto:', error);
      return NextResponse.json(
        { error: 'Erro ao criar projeto', details: error.message },
        { status: 500 }
      );
    }

    devLog.log('[API Unified] Projeto criado com billing mode:', {
      projectId: data.id,
      billingMode,
      snapshot: billingSnapshot
    });

    return NextResponse.json({
      success: true,
      data,
      message: 'Projeto criado com sucesso',
      billing: {
        mode: billingMode,
        snapshot: billingSnapshot
      }
    });

  } catch (error) {
    devLog.error('[API Unified] Exceção ao criar projeto:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
} 