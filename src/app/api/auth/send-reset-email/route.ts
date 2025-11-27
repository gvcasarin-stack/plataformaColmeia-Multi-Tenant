import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from "@/lib/utils/productionLogger";
import { sendEmail } from '@/lib/services/emailService';

/**
 * ✅ SOLUÇÃO DEFINITIVA: admin.generateLink (link com #access_token) + Amazon SES
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: { message: 'Email é obrigatório' } },
        { status: 400 }
      );
    }

    devLog.log('[send-reset-email] Gerando link para:', email);

    const supabase = createSupabaseServiceRoleClient();
    const host = request.headers.get('host') || '';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const redirectTo = `${protocol}://${host}/cliente/nova-senha`;

    // admin.generateLink gera link com #access_token (não PKCE!)
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: { redirectTo }
    });

    if (error) {
      devLog.error('[send-reset-email] Erro ao gerar link:', error.message);
      return NextResponse.json(
        { error: { message: error.message } },
        { status: 400 }
      );
    }

    const resetLink = data.properties.action_link;

    // Enviar email via Amazon SES
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f97316;">Recuperação de Senha</h2>
        <p>Você solicitou a recuperação de senha.</p>
        <p>Clique no botão abaixo para definir uma nova senha:</p>
        <div style="margin: 30px 0;">
          <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #f97316; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Definir Nova Senha
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">Este link expira em 1 hora.</p>
        <p style="color: #666; font-size: 14px;">Se você não solicitou esta recuperação, ignore este email.</p>
      </div>
    `;

    const emailSent = await sendEmail(
      email,
      'Recuperação de Senha - SGF',
      htmlBody
    );

    if (!emailSent) {
      return NextResponse.json(
        { error: { message: 'Erro ao enviar email' } },
        { status: 500 }
      );
    }

    devLog.log('[send-reset-email] ✅ Sucesso!');
    return NextResponse.json({
      success: true,
      message: 'Email de recuperação enviado com sucesso'
    });

  } catch (err: any) {
    devLog.error('[send-reset-email] Exceção:', err.message);
    return NextResponse.json(
      { error: { message: 'Erro interno' } },
      { status: 500 }
    );
  }
}
