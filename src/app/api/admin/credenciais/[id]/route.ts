/**
 * Credencial de acesso individual
 * PUT    /api/admin/credenciais/[id] - Atualiza a credencial
 * DELETE /api/admin/credenciais/[id] - Exclui a credencial
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/server';
import { devLog } from '@/lib/utils/productionLogger';
import { encryptSecret } from '@/lib/utils/credentialCrypto';
import {
  CREDENCIAIS_COLUMNS,
  CREDENCIAIS_TABLE,
  isMissingTable,
  missingTableResponse,
  parseCredencialBody,
  requireCredenciaisAdmin,
  toPublic,
} from '@/lib/services/credenciaisAcessoServer';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ctx = await requireCredenciaisAdmin();
    if (ctx instanceof NextResponse) return ctx;

    const body = await request.json();
    const parsed = parseCredencialBody(body);
    if ('error' in parsed) {
      return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
    }

    const updateData: Record<string, any> = {
      ...parsed.data,
      updated_at: new Date().toISOString(),
    };

    // A senha só é regravada quando o formulário a envia; ausente = mantém a que já está salva.
    if (typeof body?.portal_senha === 'string') {
      updateData.portal_senha_enc = body.portal_senha ? encryptSecret(body.portal_senha) : null;
    }

    const supabase = createSupabaseServiceRoleClient();
    const { data, error } = await supabase
      .from(CREDENCIAIS_TABLE)
      .update(updateData)
      .eq('id', params.id)
      .eq('tenant_id', ctx.tenantId)
      .select(CREDENCIAIS_COLUMNS)
      .maybeSingle();

    if (error) {
      if (isMissingTable(error)) return missingTableResponse();
      devLog.error('[API /admin/credenciais PUT] Erro ao atualizar:', error);
      return NextResponse.json({ success: false, error: 'Erro ao salvar credencial' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ success: false, error: 'Credencial não encontrada' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: toPublic(data) });
  } catch (error: any) {
    devLog.error('[API /admin/credenciais PUT] Erro:', error);
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ctx = await requireCredenciaisAdmin();
    if (ctx instanceof NextResponse) return ctx;

    const supabase = createSupabaseServiceRoleClient();
    const { data, error } = await supabase
      .from(CREDENCIAIS_TABLE)
      .delete()
      .eq('id', params.id)
      .eq('tenant_id', ctx.tenantId)
      .select('id')
      .maybeSingle();

    if (error) {
      if (isMissingTable(error)) return missingTableResponse();
      devLog.error('[API /admin/credenciais DELETE] Erro ao excluir:', error);
      return NextResponse.json({ success: false, error: 'Erro ao excluir credencial' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ success: false, error: 'Credencial não encontrada' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    devLog.error('[API /admin/credenciais DELETE] Erro:', error);
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 });
  }
}
