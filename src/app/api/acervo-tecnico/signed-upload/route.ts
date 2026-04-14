import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/server';

export const maxDuration = 10;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { distribuidora, categoria, filename } = body;

    if (!distribuidora || !categoria || !filename) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: distribuidora, categoria, filename' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceRoleClient();

    const timestamp = Date.now();
    const ext = filename.split('.').pop() || 'pdf';
    const safeName = filename
      .replace(/\.[^/.]+$/, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\-_]/g, '_')
      .substring(0, 50);

    const path = `acervo-tecnico/${distribuidora}/${categoria}/${safeName}_${timestamp}.${ext}`;

    const { data, error } = await supabase.storage
      .from('project-files')
      .createSignedUploadUrl(path);

    if (error || !data) {
      return NextResponse.json(
        { error: `Falha ao gerar URL de upload: ${error?.message}` },
        { status: 400 }
      );
    }

    const { data: urlData } = supabase.storage
      .from('project-files')
      .getPublicUrl(path);

    return NextResponse.json({
      signedUrl: data.signedUrl,
      token: data.token,
      path,
      publicUrl: urlData.publicUrl,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
