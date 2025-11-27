import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { devLog } from '@/lib/utils/productionLogger';
import { addDays } from 'date-fns';

/**
 * POST /api/admin/clients/[id]/packages/activate
 * Ativa um pacote de projetos para um cliente
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const clientId = params.id;
    const { pacote_id } = await request.json();

    devLog.log('[API /admin/clients/[id]/packages/activate] POST - Cliente:', clientId, 'Pacote:', pacote_id);

    if (!pacote_id) {
      return NextResponse.json(
        { success: false, error: 'ID do pacote não fornecido' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    // 1. Verificar autenticação
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      devLog.error('[API /admin/clients/[id]/packages/activate] Erro de autenticação:', authError);
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
      devLog.error('[API /admin/clients/[id]/packages/activate] Erro ao buscar perfil:', profileError);
      return NextResponse.json(
        { success: false, error: 'Perfil não encontrado' },
        { status: 404 }
      );
    }

    // 3. Verificar permissão (admin ou superadmin)
    if (profile.role !== 'admin' && profile.role !== 'superadmin') {
      devLog.warn('[API /admin/clients/[id]/packages/activate] Acesso negado - Role:', profile.role);
      return NextResponse.json(
        { success: false, error: 'Permissão negada' },
        { status: 403 }
      );
    }

    // 4. Verificar se o cliente pertence ao mesmo tenant
    const { data: clientData, error: clientError } = await supabase
      .from('users')
      .select('id, tenant_id, name, billing_mode')
      .eq('id', clientId)
      .single();

    if (clientError || !clientData) {
      devLog.error('[API /admin/clients/[id]/packages/activate] Cliente não encontrado:', clientError);
      return NextResponse.json(
        { success: false, error: 'Cliente não encontrado' },
        { status: 404 }
      );
    }

    if (clientData.tenant_id !== profile.tenant_id) {
      devLog.warn('[API /admin/clients/[id]/packages/activate] Tenant mismatch');
      return NextResponse.json(
        { success: false, error: 'Acesso negado ao cliente de outro tenant' },
        { status: 403 }
      );
    }

    // 5. Verificar se o cliente está na modalidade 'pacote'
    if (clientData.billing_mode !== 'pacote') {
      return NextResponse.json(
        {
          success: false,
          error: `Cliente está na modalidade "${clientData.billing_mode}". Altere para "pacote" antes de ativar um pacote.`,
        },
        { status: 400 }
      );
    }

    // 6. Buscar informações do pacote
    const { data: packageDef, error: packageError } = await supabase
      .from('pacotes_definicoes')
      .select('id, nome, quantidade_projetos, valor, validade_dias, ativo')
      .eq('id', pacote_id)
      .eq('tenant_id', profile.tenant_id)
      .single();

    if (packageError || !packageDef) {
      devLog.error('[API /admin/clients/[id]/packages/activate] Pacote não encontrado:', packageError);
      return NextResponse.json(
        { success: false, error: 'Pacote não encontrado' },
        { status: 404 }
      );
    }

    if (!packageDef.ativo) {
      return NextResponse.json(
        { success: false, error: 'Este pacote está inativo e não pode ser ativado' },
        { status: 400 }
      );
    }

    // 7. Verificar se já existe um pacote ativo para este cliente
    const { data: existingPackage, error: existingError } = await supabase
      .from('cliente_pacotes')
      .select('id, status')
      .eq('user_id', clientId)
      .eq('status', 'ativo')
      .maybeSingle();

    if (existingError && existingError.code !== 'PGRST116') {
      devLog.error('[API /admin/clients/[id]/packages/activate] Erro ao verificar pacote existente:', existingError);
      return NextResponse.json(
        { success: false, error: 'Erro ao verificar pacotes existentes' },
        { status: 500 }
      );
    }

    if (existingPackage) {
      return NextResponse.json(
        {
          success: false,
          error: 'O cliente já possui um pacote ativo. Cancele o pacote atual antes de ativar um novo.',
        },
        { status: 400 }
      );
    }

    // 8. Calcular data de expiração
    const dataAtivacao = new Date();
    const dataExpiracao = addDays(dataAtivacao, packageDef.validade_dias);

    // 9. Criar registro de pacote ativo
    const { data: newPackage, error: insertError } = await supabase
      .from('cliente_pacotes')
      .insert({
        user_id: clientId,
        pacote_id: packageDef.id,
        projetos_inclusos: packageDef.quantidade_projetos,
        projetos_usados: 0,
        data_ativacao: dataAtivacao.toISOString(),
        data_expiracao: dataExpiracao.toISOString(),
        status: 'ativo',
      })
      .select()
      .single();

    if (insertError) {
      devLog.error('[API /admin/clients/[id]/packages/activate] Erro ao criar pacote:', insertError);
      return NextResponse.json(
        { success: false, error: 'Erro ao ativar pacote' },
        { status: 500 }
      );
    }

    devLog.log('[API /admin/clients/[id]/packages/activate] Pacote ativado com sucesso:', newPackage.id);

    return NextResponse.json({
      success: true,
      data: {
        ...newPackage,
        pacote: packageDef,
        projetos_restantes: packageDef.quantidade_projetos,
      },
      message: `Pacote "${packageDef.nome}" ativado com sucesso para ${clientData.name}`,
    });
  } catch (error: any) {
    devLog.error('[API /admin/clients/[id]/packages/activate] Erro geral:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
