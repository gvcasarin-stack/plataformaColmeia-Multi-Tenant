/**
 * ⚠️ TODO: MIGRAR PARA SUPABASE
 * 
 * Auth Options - STUB TEMPORÁRIO
 * NextAuth options migradas para Supabase Auth
 * 
 * Este arquivo foi usado com Firebase Auth + NextAuth
 * Agora usa Supabase Auth diretamente
 */

import type { NextAuthOptions } from 'next-auth';
import { devLog } from "@/lib/utils/productionLogger";

// Stub - NextAuth não mais usado, migrado para Supabase Auth
export const authOptions: NextAuthOptions = {
  providers: [],
  callbacks: {
    async jwt() {
      devLog.warn('[AuthOptions] STUB - Migrado para Supabase Auth');
      return {};
    },
    async session() {
      devLog.warn('[AuthOptions] STUB - Migrado para Supabase Auth');
      return { expires: '' };
    },
  },
  pages: {
    signIn: '/login',
  },
};