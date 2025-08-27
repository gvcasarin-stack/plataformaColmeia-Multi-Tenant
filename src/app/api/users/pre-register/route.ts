import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
// Temporário: usar console.log direto para evitar erro de import
const devLog = {
  log: (...args: any[]) => console.log(...args),
  error: (...args: any[]) => console.error(...args),
  warn: (...args: any[]) => console.warn(...args)
};

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

    // Upsert por email; se id for conhecido, usar id; senão, manter por email
    // SIMPLIFICADO: inserir apenas campos obrigatórios básicos
    const insert = {
      id: id || undefined, // ID é obrigatório
      email,
      name: name || (typeof email === 'string' ? email.split('@')[0] : 'Usuário'),
      role: 'client',
      status: 'pending',
      tenant_id: resolvedTenantId || null
    };

    const { data: existing, error: fetchErr } = await supabase
      .from('users')
      .select('id, email, status, tenant_id')
      .eq('email', email)
      .maybeSingle();

    if (fetchErr) {
      devLog.error('[PreRegister] Erro ao buscar usuário', {
        message: fetchErr.message,
        code: fetchErr.code || 'unknown',
        details: fetchErr.details || 'none',
        hint: fetchErr.hint || 'none',
        email
      });
    }

    if (existing?.id) {
      const { error: updErr } = await supabase
        .from('users')
        .update(insert)
        .eq('id', existing.id);
      if (updErr) {
        devLog.error('[PreRegister] Erro ao atualizar usuário', {
          message: updErr.message,
          code: updErr.code || 'unknown',
          details: updErr.details || 'none',
          hint: updErr.hint || 'none',
          email,
          existingId: existing.id
        });
        return NextResponse.json({ error: 'DB_UPDATE', message: updErr.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, id: existing.id, action: 'updated' });
    }

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


