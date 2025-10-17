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
    const { email } = await request.json();

    // Validação básica
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email é obrigatório' },
        { status: 400 }
      );
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Email inválido' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceRoleClient();

    // 🔒 MULTI-TENANT: Obter tenant_id do domínio
    // Para rotas públicas de cadastro, precisamos inferir o tenant pelo hostname
    const hostname = request.headers.get('host') || '';

    console.log('[check-email] Hostname:', hostname);

    // Buscar tenant_id pelo domínio
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .or(`custom_domain.eq.${hostname},slug.eq.${hostname.split('.')[0]}`)
      .maybeSingle();

    if (orgError || !orgData) {
      console.error('[check-email] Erro ao buscar organização:', orgError);
      return NextResponse.json(
        { error: 'Tenant não identificado' },
        { status: 400 }
      );
    }

    const tenantId = orgData.id;
    console.log('[check-email] Tenant ID encontrado:', tenantId);

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
