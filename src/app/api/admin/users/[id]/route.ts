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
      .select('id, email, full_name, phone, is_company, company_name, cnpj, cpf')
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
      name: data.full_name || data.email,
      phone: data.phone,
      isCompany: data.is_company,
      companyName: data.company_name,
      cnpj: data.cnpj,
      cpf: data.cpf,
    };

    return NextResponse.json({ success: true, data: payload });
  } catch (err) {
    devLog.error('[API Admin User] Exception:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}


