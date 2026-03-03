import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { devLog } from '@/lib/utils/productionLogger';
import {
  validarCPForCNPJ,
  sanitizeNome,
  validarEstado,
  normalizarEstado,
  removerFormatacao
} from '@/lib/utils/validators';

/**
 * API Route: Atualizar dados do cliente para procuração
 * POST /api/projects/[id]/client-data
 *
 * Permite atualizar os seguintes dados do cliente:
 * - nome_cliente_final
 * - cpf_cnpj_cliente_final
 * - client_city
 * - client_state
 *
 * ✅ SEGURANÇA:
 * - Verifica autenticação do usuário
 * - Valida permissões (admin/superadmin ou owner do projeto)
 * - Valida tenant_id
 * - Valida CPF/CNPJ com dígitos verificadores
 * - Valida estado brasileiro
 * - Sanitiza dados (uppercase, trim)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    devLog.log('[API] [Client Data] Atualizando dados do cliente para projeto:', projectId);

    // ✅ SEGURANÇA: Obter tenant_id dos headers
    const headersList = headers();
    const tenantId = headersList.get('x-tenant-id');

    if (!tenantId) {
      devLog.error('[API] [Client Data] Tenant ID não encontrado nos headers');
      return NextResponse.json(
        { error: 'Acesso negado: tenant não identificado' },
        { status: 403 }
      );
    }

    // ✅ AUTENTICAÇÃO: Verificar usuário logado
    const supabaseAuth = createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      devLog.error('[API] [Client Data] Usuário não autenticado:', authError);
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    devLog.log('[API] [Client Data] Usuário autenticado:', user.id);

    // ✅ Usar Service Role Client para operações no banco
    const supabase = createSupabaseServiceRoleClient();

    // ✅ SEGURANÇA: Buscar projeto e verificar permissões
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, user_id, owner_id, tenant_id')
      .eq('id', projectId)
      .eq('tenant_id', tenantId) // ✅ Garantir isolamento por tenant
      .maybeSingle();

    if (projectError || !project) {
      devLog.error('[API] [Client Data] Projeto não encontrado:', projectError);
      return NextResponse.json(
        { error: 'Projeto não encontrado' },
        { status: 404 }
      );
    }

    // ✅ PERMISSÕES: Verificar se usuário pode editar (admin/superadmin ou owner)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', user.id)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (userError || !userData) {
      devLog.error('[API] [Client Data] Dados do usuário não encontrados:', userError);
      return NextResponse.json(
        { error: 'Permissões não verificadas' },
        { status: 403 }
      );
    }

    const isAdmin = userData.role === 'admin' || userData.role === 'superadmin';
    const isOwner = project.owner_id === user.id || project.user_id === user.id;

    if (!isAdmin && !isOwner) {
      devLog.warn('[API] [Client Data] Usuário sem permissão para editar projeto');
      return NextResponse.json(
        { error: 'Sem permissão para editar este projeto' },
        { status: 403 }
      );
    }

    devLog.log('[API] [Client Data] Permissões verificadas. isAdmin:', isAdmin, 'isOwner:', isOwner);

    // ✅ VALIDAÇÃO: Processar e validar dados do body
    const body = await request.json();
    const {
      nome_cliente_final,
      cpf_cnpj_cliente_final,
      client_city,
      client_state,
      distribuidora
    } = body;

    devLog.log('[API] [Client Data] Dados recebidos:', {
      nome_cliente_final,
      cpf_cnpj_cliente_final,
      client_city,
      client_state,
      distribuidora
    });

    // Preparar objeto de atualização
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    // ✅ VALIDAÇÃO: Nome do cliente
    if (nome_cliente_final !== undefined) {
      if (!nome_cliente_final || nome_cliente_final.trim().length === 0) {
        return NextResponse.json(
          { error: 'Nome do cliente é obrigatório' },
          { status: 400 }
        );
      }
      updateData.nome_cliente_final = sanitizeNome(nome_cliente_final);
    }

    // ✅ VALIDAÇÃO: CPF/CNPJ
    if (cpf_cnpj_cliente_final !== undefined) {
      if (!cpf_cnpj_cliente_final || cpf_cnpj_cliente_final.trim().length === 0) {
        return NextResponse.json(
          { error: 'CPF/CNPJ é obrigatório' },
          { status: 400 }
        );
      }

      // Validar CPF/CNPJ
      if (!validarCPForCNPJ(cpf_cnpj_cliente_final)) {
        return NextResponse.json(
          { error: 'CPF/CNPJ inválido. Verifique os dígitos.' },
          { status: 400 }
        );
      }

      // Salvar sem formatação (apenas números)
      updateData.cpf_cnpj_cliente_final = removerFormatacao(cpf_cnpj_cliente_final);
    }

    // ✅ VALIDAÇÃO: Cidade
    if (client_city !== undefined) {
      if (!client_city || client_city.trim().length === 0) {
        return NextResponse.json(
          { error: 'Cidade é obrigatória' },
          { status: 400 }
        );
      }
      updateData.client_city = sanitizeNome(client_city);
    }

    // ✅ VALIDAÇÃO: Estado
    if (client_state !== undefined) {
      if (!client_state || client_state.trim().length === 0) {
        return NextResponse.json(
          { error: 'Estado é obrigatório' },
          { status: 400 }
        );
      }

      const estadoNormalizado = normalizarEstado(client_state);

      if (!validarEstado(estadoNormalizado)) {
        return NextResponse.json(
          { error: 'Estado inválido. Use a sigla (ex: SP, RJ, MG)' },
          { status: 400 }
        );
      }

      updateData.client_state = estadoNormalizado;
    }

    // ✅ VALIDAÇÃO: Distribuidora
    if (distribuidora !== undefined) {
      if (!distribuidora || distribuidora.trim().length === 0) {
        return NextResponse.json(
          { error: 'Distribuidora é obrigatória' },
          { status: 400 }
        );
      }
      updateData.distribuidora = distribuidora.trim();
    }

    devLog.log('[API] [Client Data] Dados validados e sanitizados:', updateData);

    // ✅ ATUALIZAÇÃO: Salvar no banco
    const { data: updatedProject, error: updateError } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', projectId)
      .eq('tenant_id', tenantId) // ✅ Garantir tenant correto
      .select()
      .single();

    if (updateError) {
      devLog.error('[API] [Client Data] Erro ao atualizar projeto:', updateError);
      return NextResponse.json(
        { error: 'Erro ao atualizar dados do cliente', details: updateError.message },
        { status: 500 }
      );
    }

    devLog.log('[API] [Client Data] Dados atualizados com sucesso:', updatedProject.id);

    return NextResponse.json({
      success: true,
      message: 'Dados do cliente atualizados com sucesso',
      data: {
        nome_cliente_final: updatedProject.nome_cliente_final,
        cpf_cnpj_cliente_final: updatedProject.cpf_cnpj_cliente_final,
        client_city: updatedProject.client_city,
        client_state: updatedProject.client_state,
        distribuidora: updatedProject.distribuidora
      }
    });

  } catch (error) {
    devLog.error('[API] [Client Data] Exceção:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}
