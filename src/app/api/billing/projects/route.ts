import { NextRequest, NextResponse } from 'next/server';
import { devLog } from "@/lib/utils/productionLogger";
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';

export async function GET(request: NextRequest) {
  try {
    devLog.log('[API] [Billing] [Projects] Buscando projetos com informações de cobrança');

    // ✅ PRODUÇÃO - Verificar se estamos em contexto de build
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      devLog.warn('[API] [Billing] [Projects] Service Role Key não disponível (provavelmente em build)');
      return NextResponse.json({
        success: true,
        data: [],
        note: 'Service Role Key não configurada'
      });
    }

    const supabase = createSupabaseServiceRoleClient();
    
    // Primeiro, verificar se conseguimos buscar projetos sem join
    devLog.log('[API] [Billing] [Projects] Verificando tabela projects...');
    const { data: simpleProjects, error: simpleError } = await supabase
      .from('projects')
      .select('id, name, created_by, created_at')
      .limit(3);

    if (simpleError) {
      devLog.error('[API] [Billing] [Projects] Erro ao buscar projetos básicos:', simpleError);
      return NextResponse.json(
        { error: 'Erro ao acessar tabela projects', details: simpleError.message },
        { status: 500 }
      );
    }

    devLog.log('[API] [Billing] [Projects] Projetos básicos encontrados:', {
      count: simpleProjects?.length || 0,
      sample: simpleProjects
    });

    // Agora tentar com o join
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        users!projects_created_by_fkey(
          id,
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      devLog.error('[API] [Billing] [Projects] Erro no join com users:', error);
      
      // Fallback: buscar projetos sem join e fazer lookup manual se necessário
      devLog.log('[API] [Billing] [Projects] Fallback: buscando projetos sem join...');
      const { data: projectsOnly, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (projectsError) {
        devLog.error('[API] [Billing] [Projects] Erro no fallback:', projectsError);
        return NextResponse.json(
          { error: 'Erro ao buscar projetos', details: error.message },
          { status: 500 }
        );
      }

      // Mapear sem informações de usuário
      const projectsWithBilling = projectsOnly?.map(project => ({
        ...project,
        client_id: project.created_by,
        client_name: 'Cliente não disponível',
        pagamento: project.pagamento || 'pendente',
        empresaIntegradora: project.empresa_integradora,
        nomeClienteFinal: project.nome_cliente_final,
        distribuidora: project.distribuidora,
        potencia: project.potencia,
        valorProjeto: project.valor_projeto || project.valorProjeto || 0
      })) || [];

      devLog.log('[API] [Billing] [Projects] Projetos mapeados (fallback):', {
        count: projectsWithBilling.length,
        totalValue: projectsWithBilling.reduce((sum, p) => sum + (p.valorProjeto || 0), 0)
      });

      return NextResponse.json({
        success: true,
        data: projectsWithBilling
      });
    }

    devLog.log('[API] [Billing] [Projects] Dados brutos recebidos (com join):', {
      count: data?.length || 0,
      sample: data?.slice(0, 2)
    });

    // Mapear dados para formato esperado
    const projectsWithBilling = data?.map(project => ({
      ...project,
      client_id: project.created_by,
      client_name: project.users?.full_name || project.users?.email || 'Cliente sem nome',
      pagamento: project.pagamento || 'pendente',
      empresaIntegradora: project.empresa_integradora,
      nomeClienteFinal: project.nome_cliente_final,
      distribuidora: project.distribuidora,
      potencia: project.potencia,
      valorProjeto: project.valor_projeto || project.valorProjeto || 0
    })) || [];

    devLog.log('[API] [Billing] [Projects] Projetos mapeados (com join):', {
      count: projectsWithBilling.length,
      totalValue: projectsWithBilling.reduce((sum, p) => sum + (p.valorProjeto || 0), 0)
    });

    return NextResponse.json({
      success: true,
      data: projectsWithBilling
    });

  } catch (error) {
    devLog.error('[API] [Billing] [Projects] Exceção:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}
