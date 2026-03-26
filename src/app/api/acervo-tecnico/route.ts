import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const distribuidora = searchParams.get('distribuidora');
    const categoria = searchParams.get('categoria');

    const supabase = createSupabaseServiceRoleClient();

    let query = supabase.from('acervo_tecnico').select('*').order('created_at', { ascending: false });

    if (distribuidora) query = query.eq('distribuidora', distribuidora);
    if (categoria) query = query.eq('categoria', categoria);

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
    const { distribuidora, categoria, nome, descricao, imagem_url, condicoes,
            comprimento_mm, altura_mm, largura_mm } = body;

    if (!distribuidora || !categoria || !nome) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: distribuidora, categoria, nome' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceRoleClient();

    const { data, error } = await supabase
      .from('acervo_tecnico')
      .insert({
        distribuidora,
        categoria,
        nome,
        descricao: descricao || null,
        imagem_url: imagem_url || null,
        condicoes: condicoes || {},
        comprimento_mm: comprimento_mm || null,
        altura_mm: altura_mm || null,
        largura_mm: largura_mm || null,
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
    if (fields.nome !== undefined) updateData.nome = fields.nome;
    if (fields.descricao !== undefined) updateData.descricao = fields.descricao;
    if (fields.imagem_url !== undefined) updateData.imagem_url = fields.imagem_url;
    if (fields.condicoes !== undefined) updateData.condicoes = fields.condicoes;
    if (fields.comprimento_mm !== undefined) updateData.comprimento_mm = fields.comprimento_mm;
    if (fields.altura_mm !== undefined) updateData.altura_mm = fields.altura_mm;
    if (fields.largura_mm !== undefined) updateData.largura_mm = fields.largura_mm;

    const { data, error } = await supabase
      .from('acervo_tecnico')
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
      .from('acervo_tecnico')
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
