/**
 * Script de Teste: Chamar API available-billing diretamente
 *
 * USO:
 * node scripts/test-available-billing-api.js
 */

const PROJECT_ID = '3e77f97a-94a4-42b0-aefd-52e39b53734c'; // FV-2025-377
const TENANT_ID = '061ff77b-8b3a-4732-9158-a574c1f1690a'; // Colmeia Solar
const BASE_URL = 'http://localhost:3000'; // Ou sua URL de dev

async function testAvailableBillingAPI() {
  console.log('🧪 Testando API available-billing...\n');
  console.log('Dados do teste:');
  console.log(`  - Projeto ID: ${PROJECT_ID}`);
  console.log(`  - Tenant ID: ${TENANT_ID}`);
  console.log(`  - URL: ${BASE_URL}/api/admin/projects/${PROJECT_ID}/available-billing\n`);

  try {
    const url = `${BASE_URL}/api/admin/projects/${PROJECT_ID}/available-billing`;

    console.log('📡 Fazendo requisição...\n');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': TENANT_ID,
      },
    });

    console.log(`📊 Status: ${response.status} ${response.statusText}\n`);

    const data = await response.json();

    console.log('📦 Resposta completa:');
    console.log(JSON.stringify(data, null, 2));
    console.log('\n');

    // Análise da resposta
    if (data.success) {
      console.log('✅ API retornou sucesso!\n');

      const { pacotes, assinaturas } = data.data;

      console.log(`📦 Pacotes disponíveis: ${pacotes.length}`);
      if (pacotes.length > 0) {
        pacotes.forEach((p, idx) => {
          console.log(`\n  ${idx + 1}. ${p.nome}`);
          console.log(`     Empresa: ${p.empresa}`);
          console.log(`     Quota: ${p.quota}`);
          console.log(`     Vagas: ${p.vagas_disponiveis}`);
          console.log(`     ID: ${p.id}`);
        });
      } else {
        console.log('  ⚠️ Nenhum pacote retornado\n');
      }

      console.log(`\n📅 Assinaturas disponíveis: ${assinaturas.length}`);
      if (assinaturas.length > 0) {
        assinaturas.forEach((a, idx) => {
          console.log(`\n  ${idx + 1}. ${a.nome}`);
          console.log(`     Empresa: ${a.empresa}`);
          console.log(`     Quota: ${a.quota}`);
          console.log(`     Vagas: ${a.vagas_disponiveis}`);
        });
      } else {
        console.log('  ⚠️ Nenhuma assinatura retornada\n');
      }

      // Resultado final
      if (pacotes.length === 0 && assinaturas.length === 0) {
        console.log('\n❌ PROBLEMA: API retorna sucesso mas sem opções disponíveis');
        console.log('   Isso é o que está causando "Nenhuma opção disponível" no modal\n');
      } else {
        console.log('\n✅ SUCESSO: API retornou opções disponíveis!');
        console.log('   O modal deveria estar mostrando estas opções\n');
      }
    } else {
      console.log('❌ API retornou erro:\n');
      console.log(`   Mensagem: ${data.error}`);
      if (data.details) {
        console.log(`   Detalhes: ${data.details}`);
      }
      if (data.hint) {
        console.log(`   Dica: ${data.hint}`);
      }
      if (data.stack) {
        console.log(`\n   Stack trace:\n${data.stack}`);
      }
      console.log('');
    }

  } catch (error) {
    console.error('❌ Erro ao chamar API:', error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
  }
}

// Executar teste
testAvailableBillingAPI()
  .then(() => {
    console.log('✅ Teste concluído');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Teste falhou:', error);
    process.exit(1);
  });
