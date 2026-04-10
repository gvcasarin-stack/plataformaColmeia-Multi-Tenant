import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const tipo = (formData.get('tipo') as string) || 'inversor';
    const tipo_documento = (formData.get('tipo_documento') as string) || 'datasheet';

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo não permitido. Use imagens (JPG, PNG, WebP) ou PDF.' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceRoleClient();

    const timestamp = Date.now();
    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const safeName = file.name
      .replace(/\.[^/.]+$/, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\-_]/g, '_')
      .substring(0, 50);

    const path = `acervo-equipamentos/${tipo}/${tipo_documento}/${safeName}_${timestamp}.${ext}`;

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
      isPdf: file.type === 'application/pdf',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
