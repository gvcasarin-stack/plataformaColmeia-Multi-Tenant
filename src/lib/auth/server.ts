import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';
import logger from '@/lib/utils/logger';

export async function requireAuth() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      redirect('/login');
    }

    return session.user;
  } catch (error) {
    logger.error('Auth error:', error);
    redirect('/login');
  }
} 