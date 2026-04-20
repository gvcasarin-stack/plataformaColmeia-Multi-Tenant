import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

// POST: faz upload da logo e salva URL na tabela configs
export async function POST(request: NextRequest) {
  try {
    const headersList = headers();
    const tenantId = headersList.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant não identificado' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Tipo não permitido. Use PNG, JPG, WebP ou SVG.' }, { status: 400 });
    }

    const supabase = createSupabaseServiceRoleClient();

    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const path = `tenants/${tenantId}/logo-empresa.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from('project-files')
      .upload(path, buffer, { contentType: file.type, cacheControl: '3600', upsert: true });

    if (uploadError) {
      return NextResponse.json({ error: `Upload falhou: ${uploadError.message}` }, { status: 400 });
    }

    const { data: urlData } = supabase.storage.from('project-files').getPublicUrl(path);
    const logoUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    // Salvar URL na tabela configs
    const { error: configError } = await supabase
      .from('configs')
      .upsert({
        tenant_id: tenantId,
        key: 'logo_empresa_url',
        value: logoUrl,
        description: 'URL da logo da empresa para uso nas pranchas (Diagrama Unifilar e Diagrama de Blocos)',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'tenant_id,key' });

    if (configError) {
      return NextResponse.json({ error: `Erro ao salvar configuração: ${configError.message}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, url: logoUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: remove a logo (limpa a config)
export async function DELETE(request: NextRequest) {
  try {
    const headersList = headers();
    const tenantId = headersList.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant não identificado' }, { status: 401 });
    }

    const supabase = createSupabaseServiceRoleClient();

    await supabase
      .from('configs')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('key', 'logo_empresa_url');

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
