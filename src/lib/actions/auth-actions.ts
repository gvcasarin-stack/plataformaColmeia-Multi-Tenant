'use server';

import { sendVerificationEmail as sendVerificationEmailCore } from '@/lib/services/emailService'; // Renomeado para evitar conflito de nome
import logger from '@/lib/utils/logger';

interface ActionResult {
  success: boolean;
  message?: string;
  error?: string;
}

export async function sendVerificationEmailAction(
  userId: string,
  email: string,
  name: string
): Promise<ActionResult> {
  logger.info(`[AuthActions] Attempting to send verification email to ${email} for user ${userId}`);
  try {
    if (!userId || !email || !name) {
      logger.warn('[AuthActions] Missing userId, email, or name for sending verification email.');
      return { success: false, error: 'Dados insuficientes para enviar email de verificação.' };
    }

    const result = await sendVerificationEmailCore(email, name, userId);

    if (result.success) {
      logger.info(`[AuthActions] Verification email sent successfully to ${email}. Message ID: ${result.messageId}`);
      return { success: true, message: 'Email de verificação enviado.' };
    } else {
      logger.error(`[AuthActions] Failed to send verification email to ${email}: ${result.error}`);
      return { success: false, error: result.error || 'Falha ao enviar email de verificação.' };
    }
  } catch (error: any) {
    logger.error(`[AuthActions] Exception sending verification email to ${email}:`, error);
    return { success: false, error: error.message || 'Erro inesperado ao enviar email de verificação.' };
  }
}
