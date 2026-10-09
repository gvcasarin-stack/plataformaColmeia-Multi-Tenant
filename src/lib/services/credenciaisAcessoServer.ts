import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from '@/lib/supabase/server';
import { devLog } from '@/lib/utils/productionLogger';

/**
 * Apoio das rotas /api/admin/credenciais (uso exclusivo no servidor).
 */

export const CREDENCIAIS_TABLE = 'credenciais_acesso';

// Colunas devolvidas ao navegador. portal_senha_enc entra só para calcular tem_senha e é removida em toPublic.
export const CREDENCIAIS_COLUMNS =
  'id, nome, estado, envio, portal_url, portal_login, portal_senha_enc, email_envio, contatos, observacoes, updated_at';

export interface CredencialContato {
  nome: string;
  cargo: string;
  telefone: string;
  email: string;
}

export interface AdminContext {
  userId: string;
  email: string;
  tenantId: string;
}

/**
 * Exige usuário autenticado com função admin ou superadmin e devolve o tenant da requisição.
 * Em caso de falha devolve a resposta de erro pronta.
 */
export async function requireCredenciaisAdmin(): Promise<AdminContext | NextResponse> {
  const supabase = createSupabaseServiceRoleClient();

  // A sessão do navegador não chega ao servidor por cookie neste projeto, então a página envia
  // o access token em Authorization: Bearer. O token é validado no Supabase (não é só decodificado).
  // Sem o cabeçalho, tenta a sessão por cookies.
  const authorization = headers().get('authorization') || '';
  const token = authorization.toLowerCase().startsWith('bearer ') ? authorization.slice(7).trim() : '';

  let user: { id: string; email?: string } | null = null;
  if (token) {
    const { data, error } = await supabase.auth.getUser(token);
    if (!error) user = data.user;
  } else {
    const { data, error } = await createSupabaseServerClient().auth.getUser();
    if (!error) user = data.user;
  }

  if (!user) {
    return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, tenant_id, role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ success: false, error: 'Perfil não encontrado' }, { status: 404 });
  }

  if (profile.role !== 'admin' && profile.role !== 'superadmin') {
    devLog.warn('[API /admin/credenciais] Acesso negado - Role:', profile.role);
    return NextResponse.json({ success: false, error: 'Permissão negada' }, { status: 403 });
  }

  // Tenant do subdomínio (injetado pelo middleware). Admin só opera no próprio tenant;
  // superadmin opera no tenant do subdomínio em que está.
  const headerTenantId = headers().get('x-tenant-id');
  let tenantId: string | null = profile.tenant_id;

  if (headerTenantId && headerTenantId !== profile.tenant_id) {
    if (profile.role !== 'superadmin') {
      return NextResponse.json({ success: false, error: 'Acesso negado a outro tenant' }, { status: 403 });
    }
    tenantId = headerTenantId;
  }

  if (!tenantId) {
    return NextResponse.json({ success: false, error: 'Tenant não identificado' }, { status: 400 });
  }

  return { userId: user.id, email: user.email || '', tenantId };
}

/** Remove a senha criptografada e expõe apenas se existe uma senha salva. */
export function toPublic(row: any) {
  const { portal_senha_enc, ...rest } = row;
  return {
    ...rest,
    estado: rest.estado || '',
    portal_url: rest.portal_url || '',
    portal_login: rest.portal_login || '',
    email_envio: rest.email_envio || '',
    observacoes: rest.observacoes || '',
    contatos: Array.isArray(rest.contatos) ? rest.contatos : [],
    tem_senha: !!portal_senha_enc,
  };
}

const text = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

/**
 * Valida e normaliza os campos enviados pelo formulário.
 * A senha do portal é tratada à parte (ver rotas), pois só é regravada quando enviada.
 */
export function parseCredencialBody(body: any): { error: string } | { data: Record<string, any> } {
  const nome = text(body?.nome, 120);
  if (!nome) {
    return { error: 'Informe o nome da distribuidora' };
  }

  const envio = body?.envio === 'email' ? 'email' : 'plataforma';

  const contatos: CredencialContato[] = (Array.isArray(body?.contatos) ? body.contatos : [])
    .slice(0, 30)
    .map((c: any) => ({
      nome: text(c?.nome, 120),
      cargo: text(c?.cargo, 120),
      telefone: text(c?.telefone, 40),
      email: text(c?.email, 160),
    }))
    .filter((c: CredencialContato) => c.nome || c.telefone || c.email);

  return {
    data: {
      nome,
      estado: text(body?.estado, 160) || null,
      envio,
      portal_url: text(body?.portal_url, 500) || null,
      portal_login: text(body?.portal_login, 200) || null,
      email_envio: text(body?.email_envio, 200) || null,
      contatos,
      observacoes: text(body?.observacoes, 4000) || null,
    },
  };
}

/** Tabela ainda não criada no banco (migração 20261010_create_credenciais_acesso.sql não executada). */
export function isMissingTable(error: any): boolean {
  const code = error?.code;
  return code === '42P01' || code === 'PGRST205' ||
    (typeof error?.message === 'string' && error.message.includes(CREDENCIAIS_TABLE) && /does not exist|schema cache/i.test(error.message));
}

export function missingTableResponse() {
  return NextResponse.json(
    { success: false, code: 'tabela_ausente', error: 'A tabela de credenciais ainda não foi criada no banco de dados.' },
    { status: 503 }
  );
}
