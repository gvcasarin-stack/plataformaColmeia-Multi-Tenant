import { authOptions } from '@/lib/auth/auth-options'
import NextAuth from 'next-auth/next'

// Export GET and POST handlers for the App Router
export const GET = NextAuth(authOptions)
export const POST = NextAuth(authOptions) 