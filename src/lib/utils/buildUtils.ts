/**
 * Utilitários para verificação de build time
 * 
 * Ajuda a evitar erros de renderização estática durante o build da Vercel
 */

// ✅ Detectar se estamos em processo de build
export const isBuildTime = (): boolean => {
  return (
    process.env.NEXT_PHASE === 'phase-production-build' || 
    process.env.NODE_ENV === 'production' && !process.env.VERCEL_ENV ||
    process.env.npm_lifecycle_event === 'build'
  );
};

// ✅ Response padrão para build time
export const createBuildTimeResponse = (endpoint: string) => {
  return new Response(
    JSON.stringify({
      success: false,
      buildTime: true,
      message: `Endpoint ${endpoint} não disponível durante build`,
      timestamp: new Date().toISOString()
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
};
