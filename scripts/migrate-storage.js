const { createClient } = require('@supabase/supabase-js');

const OLD_URL = 'https://uvdyxurnvatomlxevrmu.supabase.co';
const OLD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2ZHl4dXJudmF0b21seGV2cm11Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzgyMjcxOSwiZXhwIjoyMDYzMzk4NzE5fQ.ZHDjGyIanjUSgGbGWlf7VBBzT_CHRJoUpyLmPiZ6naM';

const NEW_URL = 'https://tylighnuuqtztntjsfxv.supabase.co';
const NEW_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5bGlnaG51dXF0enRudGpzZnh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTcxNTM0OSwiZXhwIjoyMDcxMjkxMzQ5fQ.iiZZuS10rV5HtHLN2tBrGlVNHVlGtxXvbOg3DulDRLQ';

const BUCKETS = ['project-files', 'project-documents', 'user-avatars'];

const oldClient = createClient(OLD_URL, OLD_KEY);
const newClient = createClient(NEW_URL, NEW_KEY);

async function listAllFiles(client, bucket, path = '') {
  const { data, error } = await client.storage.from(bucket).list(path, {
    limit: 1000,
    offset: 0,
  });

  if (error) {
    console.error(`  Erro ao listar ${bucket}/${path}:`, error.message);
    return [];
  }

  let files = [];
  for (const item of data || []) {
    if (item.id) {
      files.push(path ? `${path}/${item.name}` : item.name);
    } else {
      const subPath = path ? `${path}/${item.name}` : item.name;
      const subFiles = await listAllFiles(client, bucket, subPath);
      files = files.concat(subFiles);
    }
  }
  return files;
}

async function migrateFile(bucket, filePath, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const { data: fileData, error: downloadError } = await oldClient.storage
        .from(bucket)
        .download(filePath);

      if (downloadError) {
        console.error(`  ✗ Download: ${filePath} — ${downloadError.message}`);
        return false;
      }

      const { error: uploadError } = await newClient.storage
        .from(bucket)
        .upload(filePath, fileData, { upsert: true });

      if (uploadError) {
        console.error(`  ✗ Upload: ${filePath} — ${uploadError.message}`);
        return false;
      }

      console.log(`  ✓ ${filePath}`);
      return true;
    } catch (err) {
      if (attempt < retries) {
        console.warn(`  ⚠ Tentativa ${attempt} falhou (${err.message}), tentando novamente...`);
        await new Promise(r => setTimeout(r, 2000 * attempt));
      } else {
        console.error(`  ✗ Falhou após ${retries} tentativas: ${filePath} — ${err.message}`);
        return false;
      }
    }
  }
}

async function main() {
  let totalFiles = 0;
  let totalMigrated = 0;
  let totalSkipped = 0;

  for (const bucket of BUCKETS) {
    console.log(`\n📁 Bucket: ${bucket}`);

    const oldFiles = await listAllFiles(oldClient, bucket);
    const newFiles = new Set(await listAllFiles(newClient, bucket));

    console.log(`   ${oldFiles.length} arquivo(s) no banco antigo`);
    console.log(`   ${newFiles.size} arquivo(s) já migrados`);
    totalFiles += oldFiles.length;

    for (const file of oldFiles) {
      if (newFiles.has(file)) {
        totalSkipped++;
        continue;
      }

      const ok = await migrateFile(bucket, file);
      if (ok) totalMigrated++;
    }
  }

  console.log(`\nConcluído: ${totalMigrated} migrados, ${totalSkipped} já existiam, ${totalFiles} total`);
}

main().catch(console.error);
