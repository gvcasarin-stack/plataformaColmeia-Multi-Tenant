import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/server';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const projectId = formData.get('projectId') as string;
    const type = formData.get('type') as string;

    if (!file || !projectId || !type) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: file, projectId, type' },
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
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `projects/${projectId}/${type}/${timestamp}.${ext}`;

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
