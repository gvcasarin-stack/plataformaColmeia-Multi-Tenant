/**
 * Credenciais de acesso (portais de distribuidoras e outros órgãos)
 * GET  /api/admin/credenciais - Lista as credenciais do tenant (nunca devolve a senha)
 * POST /api/admin/credenciais - Cria uma credencial
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

export async function GET() {
  try {
    const ctx = await requireCredenciaisAdmin();
    if (ctx instanceof NextResponse) return ctx;

    const supabase = createSupabaseServiceRoleClient();
    const { data, error } = await supabase
      .from(CREDENCIAIS_TABLE)
      .select(CREDENCIAIS_COLUMNS)
      .eq('tenant_id', ctx.tenantId)
      .order('nome', { ascending: true });

    if (error) {
      if (isMissingTable(error)) return missingTableResponse();
      devLog.error('[API /admin/credenciais GET] Erro ao listar:', error);
      return NextResponse.json({ success: false, error: 'Erro ao carregar credenciais' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: (data || []).map(toPublic) });
  } catch (error: any) {
    devLog.error('[API /admin/credenciais GET] Erro:', error);
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireCredenciaisAdmin();
    if (ctx instanceof NextResponse) return ctx;

    const body = await request.json();
    const parsed = parseCredencialBody(body);
    if ('error' in parsed) {
      return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
    }

    const senha = typeof body?.portal_senha === 'string' ? body.portal_senha : '';

    const supabase = createSupabaseServiceRoleClient();
    const { data, error } = await supabase
      .from(CREDENCIAIS_TABLE)
      .insert({
        ...parsed.data,
        tenant_id: ctx.tenantId,
        created_by: ctx.userId,
        portal_senha_enc: senha ? encryptSecret(senha) : null,
      })
      .select(CREDENCIAIS_COLUMNS)
      .single();

    if (error) {
      if (isMissingTable(error)) return missingTableResponse();
      devLog.error('[API /admin/credenciais POST] Erro ao criar:', error);
      return NextResponse.json({ success: false, error: 'Erro ao salvar credencial' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: toPublic(data) });
  } catch (error: any) {
    devLog.error('[API /admin/credenciais POST] Erro:', error);
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 });
  }
}
