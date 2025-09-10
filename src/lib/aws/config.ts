// AWS SES Configuration
export const AWS_CONFIG = {
  // Usar função para obter a região dinamicamente
  getRegion: () => process.env.AWS_REGION || 'sa-east-1',
  
  // Usar função para obter credenciais dinamicamente
  getCredentials: () => ({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  }),
  
  // Usar função para obter email remetente dinamicamente
  getSESSourceEmail: () => {
    const email = process.env.SES_SENDER_EMAIL || process.env.EMAIL_FROM;
    if (!email && process.env.NODE_ENV === 'production') {
      throw new Error('SES_SENDER_EMAIL deve estar configurado nas variáveis de ambiente');
    }
    return email || 'development@localhost.com'; // Fallback apenas para desenvolvimento
  },
}; 