import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Missing user id' }, { status: 400 });
    }

    const supabase = createSupabaseServiceRoleClient();
    const { data, error } = await supabase
      .from('users')
      .select('id, email, name, phone, status, role, cpf, cnpj, is_company, company_name')
      .eq('id', userId)
      .single();

    if (error) {
      devLog.error('[API Admin User] Supabase error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const payload = {
      id: data.id,
      email: data.email,
      name: data.name || data.email,
      phone: data.phone,
      // Campos do banco (retornar em ambos os formatos para compatibilidade)
      is_company: data.is_company,
      company_name: data.company_name,
      cpf: data.cpf,
      cnpj: data.cnpj,
      // Campos camelCase para compatibilidade
      isCompany: data.is_company,
      companyName: data.company_name,
    };

    return NextResponse.json({ success: true, data: payload });
  } catch (err) {
    devLog.error('[API Admin User] Exception:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}


