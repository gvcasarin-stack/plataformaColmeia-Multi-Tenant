/**
 * Script para verificar políticas de Storage no Supabase
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkStoragePolicies() {
  console.log('🔍 Verificando políticas de Storage no Supabase...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Variáveis de ambiente não configuradas:');
    console.error('- NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
    console.error('- SUPABASE_SERVICE_ROLE_KEY:', !!serviceRoleKey);
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // 1. Verificar se o bucket existe
    console.log('📦 Verificando buckets...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Erro ao listar buckets:', bucketsError);
      return;
    }

    console.log('✅ Buckets encontrados:', buckets.map(b => b.name));
    
    const projectFilesBucket = buckets.find(b => b.name === 'project-files');
    if (!projectFilesBucket) {
      console.log('\n🏗️  Bucket "project-files" não encontrado. Criando...');
      
      const { data: newBucket, error: createError } = await supabase.storage.createBucket('project-files', {
        public: false, // Tornar privado inicialmente
        allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
        fileSizeLimit: 10485760 // 10MB
      });

      if (createError) {
        console.error('❌ Erro ao criar bucket:', createError);
        return;
      }

      console.log('✅ Bucket "project-files" criado com sucesso');
    } else {
      console.log('✅ Bucket "project-files" já existe');
    }

    // 2. Criar políticas RLS para o bucket
    console.log('\n🔐 Verificando políticas RLS...');
    
    // Política para permitir upload por usuários autenticados
    const uploadPolicy = `
      CREATE POLICY "Usuários podem fazer upload de arquivos de projeto"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'project-files' AND
        auth.uid()::text = (storage.foldername(name))[2] 
      );
    `;

    // Política para permitir visualização pelos donos ou admins
    const selectPolicy = `
      CREATE POLICY "Usuários podem visualizar seus arquivos de projeto"
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'project-files' AND (
          auth.uid()::text = (storage.foldername(name))[2] OR
          EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'superadmin')
          )
        )
      );
    `;

    // Política para permitir deleção por admins
    const deletePolicy = `
      CREATE POLICY "Admins podem deletar arquivos de projeto"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'project-files' AND
        EXISTS (
          SELECT 1 FROM public.users 
          WHERE users.id = auth.uid() 
          AND users.role IN ('admin', 'superadmin')
        )
      );
    `;

    console.log('📋 Políticas sugeridas para aplicar no Supabase Dashboard:');
    console.log('\n1. Upload Policy:');
    console.log(uploadPolicy);
    console.log('\n2. Select Policy:');
    console.log(selectPolicy);
    console.log('\n3. Delete Policy:');
    console.log(deletePolicy);

    console.log('\n💡 Para aplicar essas políticas:');
    console.log('1. Acesse o Supabase Dashboard');
    console.log('2. Vá para Storage > Policies');
    console.log('3. Aplique as políticas acima');
    console.log('\nOu execute este script com --apply para tentar aplicar automaticamente');

  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

checkStoragePolicies(); 