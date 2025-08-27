import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from "@/lib/utils/productionLogger";

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
    devLog.log('[API Unified] Buscando projetos do tenant');

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

    // Verificar se estamos em contexto de build
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      devLog.warn('[API Unified] Service Role Key não disponível (build)');
      return NextResponse.json({
        success: true,
        data: [],
        note: 'Service Role Key não configurada'
      });
    }

    const supabase = createSupabaseServiceRoleClient();

    // ✅ SEGURANÇA: Buscar apenas projetos do tenant atual
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        users!projects_created_by_fkey(
          id,
          email,
          full_name
        )
      `)
      .eq('tenant_id', tenantId)  // ✅ CRÍTICO: Filtrar por tenant
      .order('created_at', { ascending: false });

    if (error) {
      devLog.error('[API Unified] Erro ao buscar projetos:', error);
      
      // Fallback: buscar sem join mas ainda filtrando por tenant
      const { data: projectsOnly, error: fallbackError } = await supabase
        .from('projects')
        .select('*')
        .eq('tenant_id', tenantId)  // ✅ CRÍTICO: Fallback também deve filtrar por tenant
        .order('created_at', { ascending: false });

      if (fallbackError) {
        devLog.error('[API Unified] Erro no fallback:', fallbackError);
        return NextResponse.json(
          { error: 'Erro ao buscar projetos', details: fallbackError.message },
          { status: 500 }
        );
      }

      // Mapear sem informações de usuário
      const projectsWithBilling = projectsOnly?.map(project => ({
        ...project,
        client_id: project.created_by,
        client_name: 'Cliente não disponível',
        // ✅ REGRA: NUNCA forçar pagamento como pendente na busca
        pagamento: project.pagamento, // Preserva valor original
        empresaIntegradora: project.empresa_integradora,
        nomeClienteFinal: project.nome_cliente_final,
        distribuidora: project.distribuidora,
        potencia: project.potencia,
        valorProjeto: project.valor_projeto || project.valorProjeto || 0
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

    // Mapear dados para formato esperado
    const projectsWithBilling = data?.map(project => ({
      ...project,
      client_id: project.created_by,
      client_name: project.users?.full_name || project.users?.email || 'Cliente sem nome',
      // ✅ REGRA: NUNCA forçar pagamento como pendente na busca
      pagamento: project.pagamento, // Preserva valor original (pode ser null, 'pendente', 'parcela1', 'pago')
      empresaIntegradora: project.empresa_integradora,
      nomeClienteFinal: project.nome_cliente_final,
      distribuidora: project.distribuidora,
      potencia: project.potencia,
      listaMateriais: project.lista_materiais,
      disjuntorPadraoEntrada: project.disjuntor_padrao_entrada,
              valorProjeto: project.valor_projeto || project.valorProjeto || 0
    })) || [];

    devLog.log('[API Unified] Projetos mapeados:', {
      count: projectsWithBilling.length,
      paymentStatuses: projectsWithBilling.map(p => ({ id: p.id, pagamento: p.pagamento }))
    });

    return NextResponse.json({
      success: true,
      data: projectsWithBilling
    });

  } catch (error) {
    devLog.error('[API Unified] Exceção:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}

/**
 * POST - Criar novo projeto (SEGURO)
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
    
    // ✅ SEGURANÇA: Forçar tenant_id no projeto
    const projectData = {
      ...body,
      tenant_id: tenantId,  // ✅ CRÍTICO: Sempre inserir tenant_id
      pagamento: 'pendente', // Valor inicial obrigatório
      name: body.name || `Projeto ${body.nome_cliente_final || body.nomeClienteFinal || 'sem nome'}`, // ✅ ADICIONADO: Campo 'name' obrigatório
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const supabase = createSupabaseServiceRoleClient();

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

    devLog.log('[API Unified] Projeto criado:', data.id);

    return NextResponse.json({
      success: true,
      data,
      message: 'Projeto criado com sucesso'
    });

  } catch (error) {
    devLog.error('[API Unified] Exceção ao criar projeto:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
} 