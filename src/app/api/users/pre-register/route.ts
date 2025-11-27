import { NextRequest, NextResponse } from 'next/server';
import { devLog } from "@/lib/utils/productionLogger";
import { createClient } from '@supabase/supabase-js';
// devLog já importado do productionLogger

function isConfigured() {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function adminClient() {
  if (!isConfigured()) throw new Error('Supabase não configurado');
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  try {
    // Log da requisição para debug
    devLog.log('[PreRegister] 🚀 POST recebido', {
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString()
    });

    if (!isConfigured()) {
      devLog.error('[PreRegister] Supabase não configurado', {
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      });
      return NextResponse.json({ error: 'CONFIG', message: 'Supabase não configurado' }, { status: 500 });
    }

    let payload;
    try {
      payload = await req.json();
      devLog.log('[PreRegister] 📋 Payload recebido:', { payload });
    } catch (jsonError: any) {
      devLog.error('[PreRegister] ❌ Erro ao parsear JSON:', jsonError.message);
      return NextResponse.json({ error: 'INVALID_JSON', message: 'JSON inválido' }, { status: 400 });
    }
    
    const { id, email, name, tenant_slug, tenant_id, role } = payload || {};

    if (!email) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'email é obrigatório' }, { status: 400 });
    }

    const supabase = adminClient();

    // ✅ VERIFICAÇÃO GLOBAL: Verificar se email já existe em QUALQUER tenant
    devLog.log('[PreRegister] Verificando se email já existe no sistema', { email });

    const { data: globalEmailCheck, error: globalCheckError } = await supabase
      .from('users')
      .select('id, email, tenant_id, status, role')
      .eq('email', email)
      .limit(1)
      .maybeSingle();

    if (globalCheckError) {
      devLog.error('[PreRegister] Erro ao verificar email globalmente', {
        email,
        error: globalCheckError.message
      });
    }

    if (globalEmailCheck) {
      devLog.warn('[PreRegister] ❌ Email já cadastrado no sistema', {
        email,
        existingUserId: globalEmailCheck.id,
        existingTenantId: globalEmailCheck.tenant_id,
        existingStatus: globalEmailCheck.status,
        existingRole: globalEmailCheck.role
      });
      return NextResponse.json({
        error: 'EMAIL_EXISTS',
        message: 'Este email já possui cadastro no sistema. Se você já tem conta, faça login. Se esqueceu a senha, use "Recuperar Senha".'
      }, { status: 409 });
    }

    devLog.log('[PreRegister] ✅ Email disponível, prosseguindo com cadastro');

    let resolvedTenantId: string | null = tenant_id || null;
    if (!resolvedTenantId && tenant_slug) {
      const { data: org, error: orgErr } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', tenant_slug)
        .single();
      if (org && org.id) resolvedTenantId = org.id;
      if (orgErr) devLog.warn('[PreRegister] Falha ao resolver tenant por slug', { tenant_slug, error: orgErr.message });
    }

    // Inserir novo usuário (não fazer upsert pois já verificamos que email não existe)
    const insert = {
      id: id || undefined,
      email,
      name: name || (typeof email === 'string' ? email.split('@')[0] : 'Usuário'),
      role: 'client',
      status: 'pending',
      tenant_id: resolvedTenantId || null
    };

    const { data: created, error: insErr } = await supabase
      .from('users')
      .insert(insert) // Remover created_at - deixar o banco definir automaticamente
      .select('id')
      .single();

    if (insErr) {
      devLog.error('[PreRegister] Erro ao inserir usuário', {
        message: insErr.message,
        code: insErr.code || 'unknown',
        details: insErr.details || 'none',
        hint: insErr.hint || 'none',
        email,
        payload: insert
      });
      return NextResponse.json({ error: 'DB_INSERT', message: insErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: created?.id, action: 'created' });
  } catch (error: any) {
    devLog.error('[PreRegister] 🚨 Erro inesperado', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      cause: error?.cause,
      fullError: error
    });
    return NextResponse.json({ 
      error: 'UNEXPECTED', 
      message: error?.message || 'Erro interno',
      debug: error?.stack?.split('\n')[0] || 'N/A'
    }, { status: 500 });
  }
}

// Handler para requisições GET (health check)
export async function GET(req: NextRequest) {
  devLog.log('[PreRegister] 🩺 HEALTH CHECK recebido', { url: req.url });
  return NextResponse.json({ 
    service: 'pre-register', 
    status: 'healthy',
    methods: ['POST'],
    timestamp: new Date().toISOString(),
    version: 'v2.1-debug'
  });
}

// Handler para requisições OPTIONS (CORS preflight)
export async function OPTIONS(req: NextRequest) {
  devLog.log('[PreRegister] OPTIONS recebido', { url: req.url });
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Allow': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}


