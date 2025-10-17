import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

/**
 * API para verificar se um email já existe no sistema
 * Retorna apenas se existe e o tipo (sem expor dados sensíveis)
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[check-email] === INÍCIO ===');

    const body = await request.json();
    console.log('[check-email] Body:', JSON.stringify(body));

    const { email } = body;

    // Validação básica
    if (!email || typeof email !== 'string') {
      console.error('[check-email] Email inválido');
      return NextResponse.json(
        { error: 'Email é obrigatório', debug: { email, type: typeof email } },
        { status: 400 }
      );
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error('[check-email] Formato inválido:', email);
      return NextResponse.json(
        { error: 'Email inválido', debug: { email } },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceRoleClient();

    // 🔒 MULTI-TENANT: Obter tenant_id do domínio
    const hostname = request.headers.get('host') || '';
    console.log('[check-email] Hostname:', hostname);

    // Buscar tenant_id pelo domínio
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('id, slug, custom_domain')
      .or(`custom_domain.eq.${hostname},slug.eq.${hostname.split('.')[0]}`)
      .maybeSingle();

    console.log('[check-email] OrgData:', orgData, 'Error:', orgError);

    if (orgError || !orgData) {
      console.error('[check-email] Org não encontrada');
      return NextResponse.json(
        { error: 'Tenant não identificado', debug: { hostname, slug: hostname.split('.')[0] } },
        { status: 400 }
      );
    }

    const tenantId = orgData.id;
    console.log('[check-email] Tenant ID:', tenantId);

    // 🔒 SEGURANÇA: Buscar apenas se o email existe e qual o role
    // NÃO retornar dados pessoais, apenas informação mínima necessária
    const { data: user, error } = await supabase
      .from('users')
      .select('role, tenant_id')
      .eq('email', email.toLowerCase().trim())
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) {
      console.error('[check-email] Erro ao buscar usuário:', error);
      return NextResponse.json(
        { error: 'Erro ao verificar email' },
        { status: 500 }
      );
    }

    // Se não existe usuário com esse email neste tenant
    if (!user) {
      return NextResponse.json({
        exists: false,
        available: true
      });
    }

    // Se existe, retornar tipo de usuário (sem dados pessoais)
    const isAdminRole = ['admin', 'superadmin', 'colaborador'].includes(user.role);

    return NextResponse.json({
      exists: true,
      available: false,
      userType: isAdminRole ? 'administrative' : 'client'
    });

  } catch (error) {
    console.error('[check-email] Erro inesperado:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
