// ======================================================
// DEBUG TEMPORÁRIO - CAPTURAR USUÁRIO DA SESSION
// Adicione este código no início das funções problemáticas
// ======================================================

// Adicionar no início de uploadProjectFileAction e addCommentAction:

console.log('🚨 [DEBUG SESSION] Dados do usuário recebido:', {
  userId: user.id,
  userEmail: user.email,
  userName: user.name,
  userRole: user.role,
  timestamp: new Date().toISOString(),
  functionName: '[NOME_DA_FUNÇÃO]',
  projectId: projectId // se disponível
});

// Se possível, também verificar o contexto/session:
// console.log('🚨 [DEBUG SESSION] Session completa:', session);
// console.log('🚨 [DEBUG SESSION] Headers:', headers);

/*
OBJETIVO: 
Comparar o userId que chega nas funções com o userId esperado:
- Esperado: "70b7eacc-a3d5-480d-8058-f850671ba34f"
- Se vier diferente, problema está na autenticação/session
*/