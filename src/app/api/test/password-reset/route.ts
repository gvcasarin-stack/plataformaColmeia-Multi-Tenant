import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';

// GET para testar direto no navegador
export async function GET(request: NextRequest) {
  try {
    const email = 'gvcasarin@gmail.com'; // Email fixo para teste

    const supabase = createSupabaseServiceRoleClient();
    const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/cliente/nova-senha`;

    // ✅ Usar admin.generateLink para gerar link com access_token (não PKCE)
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: redirectTo,
      }
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `✅ Link enviado para ${email}!`,
      redirectTo: redirectTo,
      flowType: 'implicit - access_token no hash',
      instruction: 'Verifique seu email. O link virá com #access_token= e funcionará automaticamente.'
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email é obrigatório' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceRoleClient();
    const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/cliente/nova-senha`;

    // ✅ Usar admin.generateLink para gerar link com access_token (não PKCE)
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: redirectTo,
      }
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Link de recuperação enviado com sucesso!',
      redirectTo: redirectTo,
      flowType: 'implicit - access_token no hash',
      note: 'Verifique seu email. O link virá com #access_token= no hash.'
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao enviar email' },
      { status: 500 }
    );
  }
}
