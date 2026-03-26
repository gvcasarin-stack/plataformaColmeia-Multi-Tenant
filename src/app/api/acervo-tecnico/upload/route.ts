import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const distribuidora = formData.get('distribuidora') as string;
    const categoria = formData.get('categoria') as string;

    if (!file || !distribuidora || !categoria) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: file, distribuidora, categoria' },
        { status: 400 }
      );
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Apenas imagens são permitidas' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceRoleClient();

    const timestamp = Date.now();
    const ext = file.name.split('.').pop() || 'png';
    const safeName = file.name
      .replace(/\.[^/.]+$/, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\-_]/g, '_')
      .substring(0, 50);

    const path = `acervo-tecnico/${distribuidora}/${categoria}/${safeName}_${timestamp}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data, error } = await supabase.storage
      .from('project-files')
      .upload(path, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      return NextResponse.json({ error: `Upload falhou: ${error.message}` }, { status: 400 });
    }

    const { data: urlData } = supabase.storage
      .from('project-files')
      .getPublicUrl(path);

    return NextResponse.json({
      url: urlData.publicUrl,
      path: data.path,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
