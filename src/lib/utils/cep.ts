/**
 * @file cep.ts
 * @description Busca de endereço por CEP via ViaCEP
 */

export interface EnderecoPorCEP {
  cidade: string;
  estado: string;
}

/**
 * Busca cidade/estado a partir de um CEP usando a API pública ViaCEP.
 * Nunca lança exceção — retorna null em qualquer falha (CEP inválido, timeout, erro de rede).
 * @param cep - CEP com ou sem formatação
 */
export async function buscarEnderecoPorCEP(cep: string): Promise<EnderecoPorCEP | null> {
  const digitos = cep.replace(/\D/g, '');
  if (digitos.length !== 8) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const resp = await fetch(`https://viacep.com.br/ws/${digitos}/json/`, {
      signal: controller.signal,
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!data || data.erro) return null;
    if (!data.localidade || !data.uf) return null;
    return { cidade: data.localidade, estado: data.uf };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
