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
  getSESSourceEmail: () => process.env.EMAIL_FROM || process.env.SES_SENDER_EMAIL || 'no-reply@colmeiasolar.com',
}; 