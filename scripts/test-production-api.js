/**
 * TESTE API EM PRODUÇÃO
 * URL: https://solar-tech.gerenciamentofotovoltaico.com.br/
 */

const PROJECT_ID = '3e77f97a-94a4-42b0-aefd-52e39b53734c'; // FV-2025-377
const TENANT_ID = '061ff77b-8b3a-4732-9158-a574c1f1690a'; // Colmeia Solar
const BASE_URL = 'https://solar-tech.gerenciamentofotovoltaico.com.br';

async function testProductionAPI() {
  console.log('🧪 TESTE API PRODUÇÃO - available-billing');
  console.log('==========================================\n');

  const url = `${BASE_URL}/api/admin/projects/${PROJECT_ID}/available-billing`;

  console.log(`📡 URL: ${url}`);
  console.log(`🔑 Tenant ID: ${TENANT_ID}\n`);

  try {
    console.log('⏳ Chamando API...\n');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': TENANT_ID,
      },
    });

    console.log(`📊 Status HTTP: ${response.status} ${response.statusText}\n`);

    const data = await response.json();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📦 RESPOSTA COMPLETA DA API:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(JSON.stringify(data, null, 2));
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Análise detalhada
    if (data.success) {
      console.log('✅ API RETORNOU SUCCESS: true\n');

      const { pacotes, assinaturas } = data.data;

      console.log(`📦 Total de Pacotes: ${pacotes.length}`);
      console.log(`📅 Total de Assinaturas: ${assinaturas.length}\n`);

      if (pacotes.length > 0) {
        console.log('📦 PACOTES DISPONÍVEIS:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        pacotes.forEach((p, idx) => {
          console.log(`\n${idx + 1}. ${p.nome}`);
          console.log(`   ID: ${p.id}`);
          console.log(`   Empresa: ${p.empresa}`);
          console.log(`   Quota: ${p.quota}`);
          console.log(`   Vagas Disponíveis: ${p.vagas_disponiveis}`);
          console.log(`   Expira em: ${p.expira_em}`);
        });
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      } else {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('⚠️  NENHUM PACOTE RETORNADO');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      }

      if (assinaturas.length > 0) {
        console.log('📅 ASSINATURAS DISPONÍVEIS:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        assinaturas.forEach((a, idx) => {
          console.log(`\n${idx + 1}. ${a.nome}`);
          console.log(`   ID: ${a.id}`);
          console.log(`   Empresa: ${a.empresa}`);
          console.log(`   Quota: ${a.quota}`);
          console.log(`   Vagas Disponíveis: ${a.vagas_disponiveis}`);
        });
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      } else {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('⚠️  NENHUMA ASSINATURA RETORNADA');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      }

      // DIAGNÓSTICO FINAL
      console.log('🔍 DIAGNÓSTICO FINAL:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      if (pacotes.length === 0 && assinaturas.length === 0) {
        console.log('❌ PROBLEMA CONFIRMADO:');
        console.log('   - API retorna success: true');
        console.log('   - MAS arrays de pacotes e assinaturas estão VAZIOS');
        console.log('   - É por isso que o modal mostra "Nenhuma opção disponível"');
        console.log('\n💡 CAUSA RAIZ:');
        console.log('   A query Supabase não está retornando os dados do banco.');
        console.log('   Mesmo com pacote existindo (confirmado pelo SQL),');
        console.log('   a API não consegue buscá-los.');
        console.log('\n🔧 PRÓXIMO PASSO:');
        console.log('   Verificar logs do servidor para ver erro detalhado da query.');
      } else {
        console.log('✅ API FUNCIONANDO CORRETAMENTE!');
        console.log('   - Pacotes e/ou assinaturas foram retornados');
        console.log('   - O modal DEVERIA estar mostrando estas opções');
        console.log('\n💡 SE MODAL AINDA ESTIVER VAZIO:');
        console.log('   O problema está no frontend, não na API.');
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    } else {
      console.log('❌ API RETORNOU ERRO:\n');
      console.log(`   Mensagem: ${data.error}`);
      if (data.details) {
        console.log(`   Detalhes: ${data.details}`);
      }
      if (data.hint) {
        console.log(`   Dica: ${data.hint}`);
      }
      if (data.stack) {
        console.log(`\n   Stack Trace:`);
        console.log(`   ${data.stack}`);
      }
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }

  } catch (error) {
    console.error('\n❌ ERRO AO CHAMAR API:');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error(`Mensagem: ${error.message}`);
    console.error(`\nStack:\n${error.stack}`);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }
}

// Executar teste
console.log('\n');
testProductionAPI()
  .then(() => {
    console.log('✅ Teste concluído com sucesso\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Teste falhou:', error);
    process.exit(1);
  });
