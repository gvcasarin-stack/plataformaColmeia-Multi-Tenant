import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/server';

const SETUP_FIELDS = [
  'setup_padrao_entrada',
  'setup_quadro_cc',
  'setup_mais_de_um_inversor',
  'setup_tipo_inversor',
  'setup_total_inversores',
  'setup_configuracao_saidas',
  'setup_tipo_transformador',
  'setup_potencia_transformador',
  'setup_concluido',
];

// GET — diagnóstico: mostra o estado atual das colunas setup_* no banco
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseServiceRoleClient();
    const { data: project, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error || !project) {
      return NextResponse.json({ success: false, error: error?.message || 'Projeto não encontrado' }, { status: 404 });
    }

    const existingColumns = Object.keys(project);
    const presentFields: Record<string, any> = {};
    const missingColumns: string[] = [];

    for (const field of SETUP_FIELDS) {
      if (existingColumns.includes(field)) {
        presentFields[field] = project[field];
      } else {
        missingColumns.push(field);
      }
    }

    return NextResponse.json({
      success: true,
      projectId: params.id,
      setupFields: presentFields,
      missingColumns,
      allColumnsExist: missingColumns.length === 0,
      message: missingColumns.length > 0
        ? `EXECUTE NO SUPABASE:\n${missingColumns.map(c => `ALTER TABLE projects ADD COLUMN IF NOT EXISTS ${c} TEXT;`).join('\n')}`
        : 'Todas as colunas setup_* existem no banco.',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PUT — salva os campos setup_* no banco
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const fields: Record<string, any> = body.fields || {};
    const supabase = createSupabaseServiceRoleClient();

    // 1. Verificar quais colunas existem
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', params.id)
      .single();

    if (fetchError || !project) {
      return NextResponse.json({ success: false, error: fetchError?.message || 'Projeto não encontrado' }, { status: 404 });
    }

    const existingColumns = Object.keys(project);
    const updateData: Record<string, any> = {};
    const savedFields: string[] = [];
    const missingColumns: string[] = [];
    const skippedEmpty: string[] = [];

    for (const field of SETUP_FIELDS) {
      if (!existingColumns.includes(field)) {
        missingColumns.push(field);
        continue;
      }
      const value = fields[field];
      if (value === undefined || value === null || value === '') {
        skippedEmpty.push(field);
        continue;
      }
      updateData[field] = value;
      savedFields.push(field);
    }

    if (missingColumns.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Colunas setup_* não existem no banco de dados. Execute o script SQL.`,
        missingColumns,
        sqlFix: missingColumns.map(c => `ALTER TABLE projects ADD COLUMN IF NOT EXISTS ${c} TEXT;`).join('\n'),
      }, { status: 422 });
    }

    if (savedFields.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Nenhum campo com valor para salvar.',
        skippedEmpty,
      }, { status: 400 });
    }

    updateData.updated_at = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', params.id);

    if (updateError) {
      return NextResponse.json({
        success: false,
        error: updateError.message,
        errorCode: updateError.code,
        attemptedFields: savedFields,
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      savedFields,
      skippedEmpty,
    });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
