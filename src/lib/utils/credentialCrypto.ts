import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

/**
 * Criptografia das senhas de portais guardadas em credenciais_acesso (uso exclusivo no servidor).
 *
 * AES-256-GCM. A chave vem de CREDENCIAIS_ENCRYPTION_KEY quando definida; sem ela, é derivada de
 * SUPABASE_SERVICE_ROLE_KEY. O texto gravado leva um marcador de qual das duas foi usada
 * ("k" = chave dedicada, "s" = derivada do service role), então definir a chave dedicada depois
 * não invalida o que já foi gravado.
 *
 * Atenção: trocar o valor da chave usada torna ilegíveis as senhas gravadas com ela.
 */

type KeyKind = 'k' | 's';

const SALT = 'sgf-credenciais-acesso-v1';
const keyCache = new Map<string, Buffer>();

function getKey(kind: KeyKind): Buffer {
  const secret = kind === 'k' ? process.env.CREDENCIAIS_ENCRYPTION_KEY : process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error('Chave de criptografia das credenciais indisponível');
  }

  const cacheKey = `${kind}:${secret}`;
  let key = keyCache.get(cacheKey);
  if (!key) {
    key = scryptSync(secret, SALT, 32);
    keyCache.set(cacheKey, key);
  }
  return key;
}

export function encryptSecret(plain: string): string {
  const kind: KeyKind = process.env.CREDENCIAIS_ENCRYPTION_KEY ? 'k' : 's';
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getKey(kind), iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return ['v1', kind, iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join(':');
}

export function decryptSecret(payload: string): string {
  const [version, kind, iv, tag, encrypted] = payload.split(':');
  if (version !== 'v1' || (kind !== 'k' && kind !== 's') || !iv || !tag || encrypted === undefined) {
    throw new Error('Formato de senha criptografada inválido');
  }

  const decipher = createDecipheriv('aes-256-gcm', getKey(kind), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));

  return Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64')), decipher.final()]).toString('utf8');
}
