/**
 * POST /api/admin/credenciais/[id]/revelar
 * Devolve a senha do portal de uma credencial depois de confirmar a senha da conta de quem pede.
 * Body: { password: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/server';
import { devLog } from '@/lib/utils/productionLogger';
import { decryptSecret } from '@/lib/utils/credentialCrypto';
import {
  CREDENCIAIS_TABLE,
  isMissingTable,
  missingTableResponse,
  requireCredenciaisAdmin,
} from '@/lib/services/credenciaisAcessoServer';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ctx = await requireCredenciaisAdmin();
    if (ctx instanceof NextResponse) return ctx;

    const body = await request.json().catch(() => ({}));
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!password || !ctx.email) {
      return NextResponse.json({ success: false, error: 'Digite sua senha para continuar.' }, { status: 400 });
    }

    // Reautenticação: confere a senha da conta num cliente isolado, sem cookies,
    // para não tocar na sessão do navegador. A sessão temporária é encerrada em seguida.
    const verifier = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { error: signInError } = await verifier.auth.signInWithPassword({ email: ctx.email, password });

    if (signInError) {
      devLog.warn('[API /admin/credenciais/revelar] Reautenticação falhou para:', ctx.userId);
      return NextResponse.json({ success: false, error: 'Senha incorreta.' }, { status: 401 });
    }
    await verifier.auth.signOut({ scope: 'local' }).catch(() => undefined);

    const supabase = createSupabaseServiceRoleClient();
    const { data, error } = await supabase
      .from(CREDENCIAIS_TABLE)
      .select('id, portal_senha_enc')
      .eq('id', params.id)
      .eq('tenant_id', ctx.tenantId)
      .maybeSingle();

    if (error) {
      if (isMissingTable(error)) return missingTableResponse();
      devLog.error('[API /admin/credenciais/revelar] Erro ao buscar credencial:', error);
      return NextResponse.json({ success: false, error: 'Erro ao buscar credencial' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ success: false, error: 'Credencial não encontrada' }, { status: 404 });
    }

    let senha = '';
    if (data.portal_senha_enc) {
      try {
        senha = decryptSecret(data.portal_senha_enc);
      } catch (decryptError) {
        devLog.error('[API /admin/credenciais/revelar] Falha ao descriptografar:', decryptError);
        return NextResponse.json(
          { success: false, error: 'Não foi possível ler a senha salva. Cadastre a senha novamente.' },
          { status: 500 }
        );
      }
    }

    devLog.log('[API /admin/credenciais/revelar] Senha revelada:', { credencialId: params.id, userId: ctx.userId });

    return NextResponse.json({ success: true, senha });
  } catch (error: any) {
    devLog.error('[API /admin/credenciais/revelar] Erro:', error);
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 });
  }
}
