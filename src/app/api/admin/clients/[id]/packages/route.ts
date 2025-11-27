import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { devLog } from '@/lib/utils/productionLogger';

/**
 * GET /api/admin/clients/[id]/packages
 * Busca todos os pacotes (ativos, expirados, cancelados) de um cliente específico
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const clientId = params.id;
    devLog.log('[API /admin/clients/[id]/packages] GET - Cliente:', clientId);

    const supabase = createSupabaseServerClient();

    // 1. Verificar autenticação
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      devLog.error('[API /admin/clients/[id]/packages] Erro de autenticação:', authError);
      return NextResponse.json(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      );
    }

    // 2. Buscar perfil do usuário autenticado
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, tenant_id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      devLog.error('[API /admin/clients/[id]/packages] Erro ao buscar perfil:', profileError);
      return NextResponse.json(
        { success: false, error: 'Perfil não encontrado' },
        { status: 404 }
      );
    }

    // 3. Verificar permissão (admin ou superadmin)
    if (profile.role !== 'admin' && profile.role !== 'superadmin') {
      devLog.warn('[API /admin/clients/[id]/packages] Acesso negado - Role:', profile.role);
      return NextResponse.json(
        { success: false, error: 'Permissão negada' },
        { status: 403 }
      );
    }

    // 4. Verificar se o cliente pertence ao mesmo tenant
    const { data: clientData, error: clientError } = await supabase
      .from('users')
      .select('id, tenant_id, name')
      .eq('id', clientId)
      .single();

    if (clientError || !clientData) {
      devLog.error('[API /admin/clients/[id]/packages] Cliente não encontrado:', clientError);
      return NextResponse.json(
        { success: false, error: 'Cliente não encontrado' },
        { status: 404 }
      );
    }

    if (clientData.tenant_id !== profile.tenant_id) {
      devLog.warn('[API /admin/clients/[id]/packages] Tenant mismatch');
      return NextResponse.json(
        { success: false, error: 'Acesso negado ao cliente de outro tenant' },
        { status: 403 }
      );
    }

    // 5. Buscar todos os pacotes do cliente
    const { data: packages, error: packagesError } = await supabase
      .from('cliente_pacotes')
      .select(`
        id,
        pacote_id,
        user_id,
        projetos_inclusos,
        projetos_usados,
        data_ativacao,
        data_expiracao,
        status,
        created_at,
        updated_at,
        pacote:pacotes_definicoes (
          nome,
          quantidade_projetos,
          valor,
          validade_dias
        )
      `)
      .eq('user_id', clientId)
      .order('created_at', { ascending: false });

    if (packagesError) {
      devLog.error('[API /admin/clients/[id]/packages] Erro ao buscar pacotes:', packagesError);
      return NextResponse.json(
        { success: false, error: 'Erro ao buscar pacotes' },
        { status: 500 }
      );
    }

    // 6. Calcular projetos restantes para cada pacote
    const packagesWithCalculations = (packages || []).map((pkg) => ({
      ...pkg,
      projetos_restantes: pkg.projetos_inclusos - pkg.projetos_usados,
    }));

    devLog.log('[API /admin/clients/[id]/packages] Pacotes encontrados:', packagesWithCalculations.length);

    return NextResponse.json({
      success: true,
      data: packagesWithCalculations,
    });
  } catch (error: any) {
    devLog.error('[API /admin/clients/[id]/packages] Erro geral:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
