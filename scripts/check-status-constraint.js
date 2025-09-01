const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkStatusConstraint() {
  try {
    console.log('🔍 Verificando constraint projects_status_valid...\n');
    
    // Query para buscar a definição da constraint
    const { data: constraints, error } = await supabase.rpc('sql', {
      query: `
        SELECT 
          conname as constraint_name,
          pg_get_constraintdef(c.oid) as constraint_definition
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON t.relnamespace = n.oid
        WHERE n.nspname = 'public' 
        AND t.relname = 'projects'
        AND conname LIKE '%status%';
      `
    });

    if (error) {
      console.error('❌ Erro ao consultar constraints:', error);
      return;
    }

    console.log('📋 Constraints de status encontradas:');
    constraints?.forEach(constraint => {
      console.log(`\n• ${constraint.constraint_name}:`);
      console.log(`  ${constraint.constraint_definition}`);
    });

    // Também vamos tentar buscar valores únicos de status existentes
    const { data: existingStatuses, error: statusError } = await supabase
      .from('projects')
      .select('status')
      .not('status', 'is', null);

    if (!statusError && existingStatuses) {
      const uniqueStatuses = [...new Set(existingStatuses.map(p => p.status))];
      console.log('\n📊 Status atualmente em uso na tabela:');
      uniqueStatuses.forEach(status => {
        console.log(`• "${status}"`);
      });
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

checkStatusConstraint();