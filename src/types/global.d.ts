/**
 * Declarações de tipo globais
 */

// Não é mais necessário declarar tipos para date-fns
// O pacote date-fns já fornece suas próprias definições de tipos

interface Window {
  runValorProjetoMigration: () => Promise<string[]>;
  updateValorProjetoForProject: (projectId: string, value?: number | null) => Promise<boolean>;
} 