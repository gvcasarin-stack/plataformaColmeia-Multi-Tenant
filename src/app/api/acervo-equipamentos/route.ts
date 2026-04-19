import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo');
    const search = searchParams.get('search');

    const supabase = createSupabaseServiceRoleClient();

    let query = supabase
      .from('acervo_equipamentos')
      .select('*')
      .order('created_at', { ascending: false });

    if (tipo) query = query.eq('tipo', tipo);
    if (search) {
      query = query.or(
        `fabricante.ilike.%${search}%,modelo.ilike.%${search}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tipo, fabricante, modelo, modelos, nome, potencia, datasheet_url, inmetro_url, datasheet_modelos, inmetro_modelos } = body;

    if (!tipo || !fabricante || !nome) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: tipo, fabricante, nome' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceRoleClient();

    // Verificar duplicidade: mesmo tipo + fabricante + modelo já cadastrado
    const { data: existing } = await supabase
      .from('acervo_equipamentos')
      .select('id')
      .eq('tipo', tipo)
      .ilike('fabricante', fabricante.trim())
      .ilike('modelo', (modelo || '').trim())
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'duplicate', message: 'Já existe um equipamento cadastrado com esse fabricante e modelo. Edite o registro existente para atualizá-lo.' },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from('acervo_equipamentos')
      .insert({
        tipo,
        fabricante,
        modelo: modelo || '',
        modelos: modelos || [],
        nome,
        potencia: potencia || null,
        datasheet_url: datasheet_url || null,
        inmetro_url: inmetro_url || null,
        datasheet_modelos: datasheet_modelos || [],
        inmetro_modelos: inmetro_modelos || [],
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...fields } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }

    const supabase = createSupabaseServiceRoleClient();

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (fields.fabricante !== undefined) updateData.fabricante = fields.fabricante;
    if (fields.modelo !== undefined) updateData.modelo = fields.modelo;
    if (fields.modelos !== undefined) updateData.modelos = fields.modelos;
    if (fields.nome !== undefined) updateData.nome = fields.nome;
    if (fields.potencia !== undefined) updateData.potencia = fields.potencia;
    if (fields.datasheet_url !== undefined) updateData.datasheet_url = fields.datasheet_url;
    if (fields.inmetro_url !== undefined) updateData.inmetro_url = fields.inmetro_url;
    if (fields.datasheet_modelos !== undefined) updateData.datasheet_modelos = fields.datasheet_modelos;
    if (fields.inmetro_modelos !== undefined) updateData.inmetro_modelos = fields.inmetro_modelos;

    const { data, error } = await supabase
      .from('acervo_equipamentos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }

    const supabase = createSupabaseServiceRoleClient();

    const { error } = await supabase
      .from('acervo_equipamentos')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
