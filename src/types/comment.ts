/**
 * Representa um comentário em um projeto
 * Usado para interações entre usuários em projetos
 */
export interface Comment {
  /** Identificador único do comentário */
  id: string;
  
  /** Texto do comentário */
  text: string;
  
  /** Nome do autor do comentário (compatibilidade) */
  author?: string;
  
  /** ID do autor do comentário (compatibilidade) */
  authorId?: string;
  
  /** Data em formato legível (compatibilidade) */
  date?: string;
  
  /** ID do usuário que criou o comentário */
  userId?: string;
  
  /** Email do usuário que criou o comentário */
  userEmail?: string;
  
  /** Nome do usuário que criou o comentário */
  userName?: string;
  
  /** Função/cargo do usuário que criou o comentário */
  userRole?: string;
  
  /** Data e hora de criação no formato ISO */
  createdAt?: string;
  
  /** Data e hora da última atualização no formato ISO */
  updatedAt?: string;
} 