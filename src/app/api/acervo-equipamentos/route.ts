import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo');
    const search = searchParams.get('search');
    const tipo_documento = searchParams.get('tipo_documento');

    const supabase = createSupabaseServiceRoleClient();

    let query = supabase
      .from('acervo_equipamentos')
      .select('*')
      .order('created_at', { ascending: false });

    if (tipo) query = query.eq('tipo', tipo);
    if (tipo_documento) query = query.eq('tipo_documento', tipo_documento);
    if (search) {
      query = query.or(
        `fabricante.ilike.%${search}%,modelo.ilike.%${search}%,nome.ilike.%${search}%`
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
    const { tipo, fabricante, modelo, tipo_documento, nome, descricao, arquivo_url, imagem_url } = body;

    if (!tipo || !fabricante || !modelo || !nome) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: tipo, fabricante, modelo, nome' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceRoleClient();

    const { data, error } = await supabase
      .from('acervo_equipamentos')
      .insert({
        tipo,
        fabricante,
        modelo,
        tipo_documento: tipo_documento || 'datasheet',
        nome,
        descricao: descricao || null,
        arquivo_url: arquivo_url || null,
        imagem_url: imagem_url || null,
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
    if (fields.tipo_documento !== undefined) updateData.tipo_documento = fields.tipo_documento;
    if (fields.nome !== undefined) updateData.nome = fields.nome;
    if (fields.descricao !== undefined) updateData.descricao = fields.descricao;
    if (fields.arquivo_url !== undefined) updateData.arquivo_url = fields.arquivo_url;
    if (fields.imagem_url !== undefined) updateData.imagem_url = fields.imagem_url;

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
