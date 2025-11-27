/**
 * Script para criar buckets no Supabase Storage
 *
 * Este script cria os buckets necessários para o sistema:
 * - project-files: Arquivos dos projetos
 * - project-documents: Documentos dos projetos
 * - user-avatars: Avatares dos usuários
 */

// Carregar variáveis de ambiente
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

interface BucketConfig {
  name: string;
  public: boolean;
  allowedMimeTypes?: string[];
  fileSizeLimit?: number;
}

// Constantes de buckets (mesmo padrão do storage.ts)
const STORAGE_BUCKETS = {
  PROJECT_FILES: 'project-files',
  PROJECT_DOCUMENTS: 'project-documents',
  USER_AVATARS: 'user-avatars'
} as const;

const bucketsConfig: BucketConfig[] = [
  {
    name: STORAGE_BUCKETS.PROJECT_FILES,
    public: true, // Público para facilitar downloads
    allowedMimeTypes: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ],
    fileSizeLimit: 10485760 // 10MB
  },
  {
    name: STORAGE_BUCKETS.PROJECT_DOCUMENTS,
    public: false, // Privado por segurança
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
    fileSizeLimit: 10485760 // 10MB
  },
  {
    name: STORAGE_BUCKETS.USER_AVATARS,
    public: true,
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'image/webp'
    ],
    fileSizeLimit: 2097152 // 2MB
  }
];

async function createBuckets() {
  try {
    console.log('🚀 Iniciando verificação/criação de buckets no Supabase Storage...\n');

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Variáveis de ambiente não encontradas!');
      console.error('Certifique-se de que NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY estão configuradas');
      process.exit(1);
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Listar buckets existentes
    const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error('❌ Erro ao listar buckets:', listError);
      process.exit(1);
    }

    console.log('📋 Buckets existentes:', existingBuckets?.map(b => b.name).join(', ') || 'Nenhum\n');

    // Criar cada bucket se não existir
    for (const config of bucketsConfig) {
      const exists = existingBuckets?.some(b => b.name === config.name);

      if (exists) {
        console.log(`✅ Bucket '${config.name}' já existe`);
        continue;
      }

      console.log(`📦 Criando bucket '${config.name}'...`);

      const { error: createError } = await supabase.storage.createBucket(config.name, {
        public: config.public,
        allowedMimeTypes: config.allowedMimeTypes,
        fileSizeLimit: config.fileSizeLimit
      });

      if (createError) {
        console.error(`❌ Erro ao criar bucket '${config.name}':`, createError);
        continue;
      }

      console.log(`✅ Bucket '${config.name}' criado com sucesso!`);
      console.log(`   - Público: ${config.public ? 'Sim' : 'Não'}`);
      console.log(`   - Tamanho máximo: ${(config.fileSizeLimit || 0) / 1024 / 1024}MB`);
      console.log(`   - Tipos permitidos: ${config.allowedMimeTypes?.length || 0} tipos\n`);
    }

    console.log('✨ Processo concluído!');

  } catch (error) {
    console.error('❌ Erro inesperado:', error);
    process.exit(1);
  }
}

// Executar
createBuckets();
