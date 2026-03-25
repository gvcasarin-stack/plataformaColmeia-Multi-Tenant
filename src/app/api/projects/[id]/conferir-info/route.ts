import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/server';

const CONFERIR_FIELDS = [
  'cpf_cnpj_cliente_final', 'endereco_local', 'client_city', 'client_state',
  'distribuidora', 'potencia', 'nome_cliente_final',
  'disjuntor_padrao_entrada', 'lista_materiais', 'havera_beneficiarias',
  'tipo_conexao', 'tipo_ramal', 'tensao_atendimento',
  'coord_utm_fuso', 'coord_utm_x', 'coord_utm_y',
  'modulos_quantidade', 'modulos_fabricante', 'modulos_modelo', 'modulos_potencia_wp',
  'inversores_quantidade', 'inversores_fabricante', 'inversores_modelo',
  'inversores_potencia', 'inversores_tensao',
  'conta_contrato', 'classe_uc', 'numero_poste_transformador',
  'numero_condutores_fase', 'secao_fase_mm2', 'secao_neutro_mm2',
  'disjuntor_polos', 'disjuntor_corrente_a', 'disjuntor_tensao_v',
  'tipo_fornecimento', 'modalidade_compensacao', 'planta_situacao_url',
];

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const body = await request.json();
    const supabase = createSupabaseServiceRoleClient();

    // 1. Verificar quais colunas existem na tabela
    const { data: columns, error: colError } = await supabase
      .rpc('get_table_columns', { table_name: 'projects' })
      .select('*');

    let existingColumns: string[] = [];
    let columnCheckMethod = 'rpc';

    if (colError) {
      // Fallback: tentar buscar o projeto e ver quais campos retornam
      columnCheckMethod = 'fallback_select';
      const { data: proj } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (proj) {
        existingColumns = Object.keys(proj);
      }
    } else {
      existingColumns = (columns || []).map((c: any) => c.column_name || c);
    }

    // 2. Construir updateData apenas com colunas que existem
    const updateData: Record<string, any> = {};
    const missingColumns: string[] = [];
    const mappedFields: string[] = [];

    // Mapeamento frontend -> banco
    const fieldMapping: Record<string, string> = {
      nomeClienteFinal: 'nome_cliente_final',
      disjuntorPadraoEntrada: 'disjuntor_padrao_entrada',
      listaMateriais: 'lista_materiais',
    };

    for (const [key, value] of Object.entries(body.fields || {})) {
      const dbColumn = fieldMapping[key] || key;

      if (dbColumn === 'id' || dbColumn === '_plantaFile') continue;

      if (existingColumns.length === 0 || existingColumns.includes(dbColumn)) {
        if (value !== undefined && value !== null && value !== '') {
          updateData[dbColumn] = value;
          mappedFields.push(`${key} -> ${dbColumn} = ${JSON.stringify(value).substring(0, 50)}`);
        }
      } else {
        missingColumns.push(dbColumn);
      }
    }

    updateData.updated_at = new Date().toISOString();

    // 3. Salvar no banco
    const { data: updated, error: updateError } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', projectId)
      .select('id')
      .single();

    if (updateError) {
      return NextResponse.json({
        success: false,
        error: updateError.message,
        errorCode: updateError.code,
        debug: {
          columnCheckMethod,
          existingColumnsCount: existingColumns.length,
          missingColumns,
          attemptedFields: Object.keys(updateData),
          mappedFields,
        }
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      debug: {
        columnCheckMethod,
        existingColumnsCount: existingColumns.length,
        missingColumns,
        savedFields: Object.keys(updateData).filter(k => k !== 'updated_at'),
        mappedFields,
      }
    });

  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message,
    }, { status: 500 });
  }
}
