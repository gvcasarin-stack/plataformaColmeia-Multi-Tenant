import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/server';

// ✅ CORRIGIDO: Forçar runtime dinâmico
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'projectId é obrigatório' }, { status: 400 });
    }

    const supabase = createSupabaseServiceRoleClient();

    // Buscar projeto diretamente do banco
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error) {
      return NextResponse.json({
        error: 'Erro ao buscar projeto',
        details: error
      }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 });
    }

    // Retornar dados relevantes
    return NextResponse.json({
      success: true,
      projectId: data.id,
      campos_importantes: {
        cpf_cnpj_cliente_final: data.cpf_cnpj_cliente_final,
        endereco_local: data.endereco_local,
        lista_materiais: data.lista_materiais,
        disjuntor_padrao_entrada: data.disjuntor_padrao_entrada,
      },
      tipos: {
        cpf_cnpj_type: typeof data.cpf_cnpj_cliente_final,
        endereco_type: typeof data.endereco_local,
        lista_type: typeof data.lista_materiais,
        disjuntor_type: typeof data.disjuntor_padrao_entrada,
      },
      valores_booleanos: {
        cpf_cnpj_is_null: data.cpf_cnpj_cliente_final === null,
        cpf_cnpj_is_undefined: data.cpf_cnpj_cliente_final === undefined,
        cpf_cnpj_is_empty: data.cpf_cnpj_cliente_final === '',
        endereco_is_null: data.endereco_local === null,
        endereco_is_undefined: data.endereco_local === undefined,
        endereco_is_empty: data.endereco_local === '',
      },
      projeto_completo: data
    });

  } catch (error) {
    console.error('[check-project-fields] Erro:', error);
    return NextResponse.json({
      error: 'Erro interno',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
