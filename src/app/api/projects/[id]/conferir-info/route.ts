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
  'caixa_medicao_id', 'caixa_medicao_imagem_url', 'caixa_medicao_nome',
  'caixa_medicao_comprimento_mm', 'caixa_medicao_altura_mm', 'caixa_medicao_largura_mm',
  'responsavel_nome', 'responsavel_profissao', 'responsavel_registro',
  'data_documento',
  'secao_aterramento_mm2',
  // Formulário de Solicitação de Acesso
  'cliente_cep', 'cliente_email', 'cliente_celular', 'cliente_telefone_fixo',
  'responsavel_legal_nome', 'responsavel_legal_telefone', 'responsavel_legal_email',
  'tipo_solicitacao', 'tarifa_branca', 'possui_cargas_especiais',
  'carga_declarada_kw', 'potencia_disponibilizada_kw', 'data_inicio_operacao',
  'modulos_area_m2',
  'modulos_eficiencia', 'modulos_comprimento_m', 'modulos_largura_m', 'modulos_area_unitaria_m2', 'modulos_peso_kg',
  'inversores_faixa_tensao', 'inversores_corrente_nominal', 'inversores_fator_potencia',
  'inversores_rendimento', 'inversores_dht_corrente',
  'responsavel_email', 'responsavel_uf',
  // Dimensionamento dos Cabos
  'cabo_isolacao_material',
  'cabo_cc_secao_mm2', 'cabo_cc_capacidade_corrente_a', 'cabo_cc_fator_temperatura', 'cabo_cc_fator_agrupamento',
  'cabo_ca_secao_mm2', 'cabo_ca_capacidade_corrente_a', 'cabo_ca_fator_temperatura', 'cabo_ca_fator_agrupamento',
];

// GET: Diagnóstico — colar no navegador para ver o estado do projeto
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const supabase = createSupabaseServiceRoleClient();

    // 1. Buscar o projeto completo
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (fetchError || !project) {
      return NextResponse.json({
        diagnostico: 'ERRO',
        erro: fetchError?.message || 'Projeto não encontrado',
        projectId,
      }, { status: 404 });
    }

    const allColumns = Object.keys(project);

    // 2. Verificar quais campos do Conferir Informações existem e quais faltam
    const camposExistentes: Record<string, any> = {};
    const camposFaltantes: string[] = [];
    const camposPreenchidos: Record<string, any> = {};
    const camposVazios: string[] = [];

    for (const field of CONFERIR_FIELDS) {
      if (allColumns.includes(field)) {
        camposExistentes[field] = true;
        const val = project[field];
        if (val !== null && val !== undefined && val !== '' && val !== 0) {
          camposPreenchidos[field] = val;
        } else {
          camposVazios.push(field);
        }
      } else {
        camposFaltantes.push(field);
      }
    }

    // 3. Teste rápido de escrita (grava e reverte updated_at)
    let testeEscrita = 'NÃO TESTADO';
    const testField = camposFaltantes.length === 0 ? CONFERIR_FIELDS[0] : null;
    if (testField) {
      const { error: writeErr } = await supabase
        .from('projects')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', projectId);
      testeEscrita = writeErr ? `FALHOU: ${writeErr.message}` : 'OK';
    }

    return NextResponse.json({
      diagnostico: 'OK',
      projectId,
      projectName: project.nome_cliente_final,
      totalColunasTabela: allColumns.length,

      conferirInfo: {
        camposNecessarios: CONFERIR_FIELDS.length,
        colunasExistentes: Object.keys(camposExistentes).length,
        colunasFaltantes: camposFaltantes,
        camposPreenchidos: Object.keys(camposPreenchidos).length,
        camposVazios: camposVazios,
        valoresAtuais: camposPreenchidos,
      },

      testeEscritaBanco: testeEscrita,

      instrucao: camposFaltantes.length > 0
        ? `EXECUTE O SQL ABAIXO NO SUPABASE PARA CRIAR AS COLUNAS FALTANTES:\n\n${camposFaltantes.map(c => `ALTER TABLE projects ADD COLUMN IF NOT EXISTS ${c} TEXT;`).join('\n')}`
        : 'Todas as colunas existem no banco. O salvamento deve funcionar.',
    });

  } catch (err: any) {
    return NextResponse.json({
      diagnostico: 'ERRO',
      erro: err.message,
    }, { status: 500 });
  }
}

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
