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

    // ✅ VERIFICAÇÃO GLOBAL: Buscar email em TODOS os tenants
    console.log('[check-email] Verificando email globalmente:', email);

    const { data: user, error } = await supabase
      .from('users')
      .select('role, tenant_id')
      .eq('email', email.toLowerCase().trim())
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[check-email] Erro ao buscar usuário:', error);
      return NextResponse.json(
        { error: 'Erro ao verificar email' },
        { status: 500 }
      );
    }

    // Se não existe usuário com esse email em NENHUM tenant
    if (!user) {
      console.log('[check-email] ✅ Email disponível');
      return NextResponse.json({
        exists: false,
        available: true
      });
    }

    // Se existe, retornar tipo de usuário (sem dados pessoais)
    const isAdminRole = ['admin', 'superadmin', 'colaborador'].includes(user.role);
    console.log('[check-email] ❌ Email já existe - Role:', user.role, 'Tenant:', user.tenant_id);

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
