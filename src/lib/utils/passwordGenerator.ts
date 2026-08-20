/**
 * Gera uma senha forte (12 caracteres, com maiúscula, minúscula, número e símbolo garantidos).
 * Mesma lógica usada no cadastro de clientes (AdminCreateClientModal), extraída aqui para
 * ser reaproveitada também no cadastro de membros da equipe.
 */
export function generateSecurePassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const nums = '23456789';
  const syms = '@#$!';
  const all = upper + lower + nums + syms;
  const mandatory = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    nums[Math.floor(Math.random() * nums.length)],
    syms[Math.floor(Math.random() * syms.length)],
  ];
  const rest = Array.from({ length: 8 }, () => all[Math.floor(Math.random() * all.length)]);
  return [...mandatory, ...rest].sort(() => Math.random() - 0.5).join('');
}
