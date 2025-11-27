import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';

// Endpoint de DEBUG: Testar query específica para projetos do pacote
export async function GET(request: NextRequest) {
  const supabase = createSupabaseServiceRoleClient();

  // IDs conhecidos da API
  const pacoteId = '20b17000-01ee-467d-a0d5-b8260da6ece6';
  const tenantId = '061ff77b-8b3a-4732-9158-a574c1f1690a';
  const userId = 'b772107b-bfa8-48e7-81ac-995331e66623';

  const results: any = {
    timestamp: new Date().toISOString(),
    pacoteId,
    tenantId,
    userId,
    tests: {}
  };

  // TESTE 1: Query EXATA da API (linhas 65-70)
  console.log('🔍 TESTE 1: Query exata da API...');
  const { data: projetos1, error: error1 } = await supabase
    .from('projects')
    .select('id, number, empresa_integradora, nome_cliente_final, potencia, status, pagamento, created_at')
    .eq('cliente_pacote_id', pacoteId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  results.tests.teste1_query_exata = {
    description: 'Query EXATA da API (linhas 65-70)',
    query: `SELECT id, number, empresa_integradora, nome_cliente_final, potencia, status, pagamento, created_at FROM projects WHERE cliente_pacote_id = '${pacoteId}' AND tenant_id = '${tenantId}' ORDER BY created_at DESC`,
    projetos: projetos1,
    count: projetos1?.length || 0,
    error: error1,
    success: !error1 && (projetos1?.length || 0) > 0
  };

  // TESTE 2: Buscar por user_id em vez de cliente_pacote_id
  console.log('🔍 TESTE 2: Buscar por user_id...');
  const { data: projetos2, error: error2 } = await supabase
    .from('projects')
    .select('id, number, cliente_pacote_id, user_id, deleted_at, billing_mode')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  results.tests.teste2_por_user = {
    description: 'Buscar por user_id',
    projetos: projetos2,
    count: projetos2?.length || 0,
    error: error2,
    fk_analysis: projetos2?.map(p => ({
      id: p.id,
      number: p.number,
      cliente_pacote_id: p.cliente_pacote_id,
      fk_status: p.cliente_pacote_id === pacoteId ? '✅ FK correta' :
                 p.cliente_pacote_id === null ? '❌ FK NULL' :
                 `⚠️ FK diferente: ${p.cliente_pacote_id}`,
      deleted: p.deleted_at ? '🗑️ Deletado' : '✅ Ativo',
      billing_mode: p.billing_mode
    }))
  };

  // TESTE 3: Verificar se a coluna cliente_pacote_id existe
  console.log('🔍 TESTE 3: Testar SELECT simples...');
  const { data: projetos3, error: error3 } = await supabase
    .from('projects')
    .select('id, number, cliente_pacote_id')
    .eq('cliente_pacote_id', pacoteId)
    .limit(5);

  results.tests.teste3_select_simples = {
    description: 'SELECT simples apenas id, number, cliente_pacote_id',
    projetos: projetos3,
    count: projetos3?.length || 0,
    error: error3
  };

  // TESTE 4: Testar com .maybeSingle() vs sem
  console.log('🔍 TESTE 4: Contar projetos...');
  const { count, error: error4 } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('cliente_pacote_id', pacoteId)
    .eq('tenant_id', tenantId);

  results.tests.teste4_count = {
    description: 'COUNT de projetos com FK',
    count,
    error: error4
  };

  // TESTE 5: Verificar Service Role Key
  console.log('🔍 TESTE 5: Verificar Service Role...');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  results.tests.teste5_service_role = {
    description: 'Verificar Service Role Key',
    key_exists: !!serviceRoleKey,
    key_length: serviceRoleKey?.length || 0,
    key_prefix: serviceRoleKey?.substring(0, 20) + '...',
    is_service_role: serviceRoleKey?.includes('service_role') || serviceRoleKey?.startsWith('eyJ'),
  };

  // TESTE 6: Verificar pacote
  console.log('🔍 TESTE 6: Verificar pacote...');
  const { data: pacote, error: error6 } = await supabase
    .from('cliente_pacotes')
    .select('*')
    .eq('id', pacoteId)
    .single();

  results.tests.teste6_pacote = {
    description: 'Dados do pacote',
    pacote,
    error: error6
  };

  // RESUMO FINAL
  results.summary = {
    total_testes: 6,
    testes_com_erro: Object.values(results.tests).filter((t: any) => t.error).length,
    testes_sem_projetos: Object.values(results.tests).filter((t: any) =>
      t.count !== undefined && t.count === 0
    ).length,
    diagnostico: projetos1?.length === 0
      ? '🚨 PROBLEMA: Query SQL retorna 0 projetos - FK cliente_pacote_id provavelmente NULL ou RLS bloqueando'
      : projetos1?.length > 0
      ? '✅ Query SQL funciona! Problema está no código da API ou cache'
      : '⚠️ Query retornou undefined - verificar erro'
  };

  console.log('📊 RESUMO:', results.summary);

  return NextResponse.json(results, { status: 200 });
}
