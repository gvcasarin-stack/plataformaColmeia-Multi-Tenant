export function hasAdminAccess(userData: { role?: string } | null | undefined): boolean {
  if (!userData) return false;
  return userData?.role === 'admin' || userData?.role === 'superadmin';
}

export function isSuperAdmin(userRole?: string | null) {
  if (!userRole) return false;
  return userRole.toLowerCase() === 'superadmin';
}

export function isAdmin(userRole?: string | null) {
  if (!userRole) return false;
  return userRole.toLowerCase() === 'admin';
}

export function isAdminUser(email?: string | null) {
  if (!email) return false;
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  const superadminEmail = process.env.NEXT_PUBLIC_SUPERADMIN_EMAIL;
  
  // For backward compatibility and additional security, we'll check both role and email
  return email === adminEmail || email === superadminEmail;
}

export function hasProjectAccess(userRole?: string | null, userEmail?: string | null) {
  if (!userRole || !userEmail) return false;
  
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  const superadminEmail = process.env.NEXT_PUBLIC_SUPERADMIN_EMAIL;
  
  // First check if user is admin by email
  if (userEmail === adminEmail || userEmail === superadminEmail) return true;
  
  // Then check roles
  const role = userRole.toLowerCase();
  if (role === 'superadmin' || role === 'admin') return true;
  
  // For regular users, allow access to their projects
  // This assumes Firebase rules will handle specific project access
  if (role === 'user') return true;
  
  return false;
}
