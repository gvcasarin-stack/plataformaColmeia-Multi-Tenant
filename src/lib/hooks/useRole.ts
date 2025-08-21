import { useAuth } from "./useAuth"

export function useRole() {
  const { user } = useAuth()

  return {
    isAdmin: user?.role === 'admin',
    isSuperAdmin: user?.role === 'superadmin',
    isUser: user?.role === 'user',
    hasRole: (role: string) => user?.role === role,
    hasAnyRole: (roles: string[]) => roles.includes(user?.role || ''),
    role: user?.role
  }
}
