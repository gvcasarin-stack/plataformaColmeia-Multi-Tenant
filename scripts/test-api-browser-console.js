/**
 * TESTE API NO CONSOLE DO NAVEGADOR
 *
 * COMO USAR:
 * 1. Abra a aplicação no navegador
 * 2. Pressione F12 para abrir DevTools
 * 3. Vá na aba "Console"
 * 4. Cole TODO este código e pressione Enter
 * 5. Veja o resultado!
 */

(async function testAvailableBilling() {
  const PROJECT_ID = '3e77f97a-94a4-42b0-aefd-52e39b53734c'; // FV-2025-377
  const TENANT_ID = '061ff77b-8b3a-4732-9158-a574c1f1690a'; // Colmeia Solar

  console.log('🧪 TESTE API available-billing');
  console.log('================================\n');

  try {
    // Usar a URL atual do navegador
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/api/admin/projects/${PROJECT_ID}/available-billing`;

    console.log(`📡 URL: ${url}`);
    console.log(`🔑 Tenant ID: ${TENANT_ID}\n`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': TENANT_ID,
      },
    });

    console.log(`📊 Status: ${response.status} ${response.statusText}\n`);

    const data = await response.json();

    console.log('📦 RESPOSTA COMPLETA:');
    console.log(data);
    console.log('\n================================\n');

    if (data.success) {
      console.log('✅ API RETORNOU SUCESSO!\n');

      const { pacotes, assinaturas } = data.data;

      console.log(`📦 Pacotes: ${pacotes.length}`);
      pacotes.forEach((p, idx) => {
        console.log(`  ${idx + 1}. ${p.nome} (${p.empresa}) - ${p.quota} - ${p.vagas_disponiveis} vagas`);
      });

      console.log(`\n📅 Assinaturas: ${assinaturas.length}`);
      assinaturas.forEach((a, idx) => {
        console.log(`  ${idx + 1}. ${a.nome} (${a.empresa}) - ${a.quota} - ${a.vagas_disponiveis} vagas`);
      });

      if (pacotes.length === 0 && assinaturas.length === 0) {
        console.log('\n❌ PROBLEMA IDENTIFICADO:');
        console.log('   API retorna sucesso mas arrays vazios!');
        console.log('   Por isso modal mostra "Nenhuma opção disponível"\n');
      } else {
        console.log('\n✅ DADOS OK! Modal deveria mostrar estas opções\n');
      }
    } else {
      console.error('\n❌ API RETORNOU ERRO:');
      console.error(`   ${data.error}`);
      if (data.details) console.error(`   Detalhes: ${data.details}`);
      if (data.hint) console.error(`   Dica: ${data.hint}`);
      console.log('');
    }

    return data;

  } catch (error) {
    console.error('❌ ERRO AO CHAMAR API:', error);
    throw error;
  }
})();
