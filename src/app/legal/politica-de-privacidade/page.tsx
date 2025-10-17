import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Política de Privacidade - Gerenciamento Fotovoltaico',
  description: 'Política de privacidade do sistema de gerenciamento fotovoltaico.',
}

export const dynamic = 'force-dynamic';

export default function PoliticaDePrivacidadePage() {
  return (
    <div className="prose prose-gray max-w-none">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Política de Privacidade</h1>
      
      <p className="text-gray-600 mb-6">
        <strong>Última atualização:</strong> {new Date().toLocaleDateString('pt-BR')}
      </p>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">1. Introdução</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Esta Política de Privacidade descreve como o Gerenciamento Fotovoltaico coleta, usa, armazena 
          e protege suas informações pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD) 
          e demais legislações aplicáveis.
        </p>
        <p className="text-gray-700 leading-relaxed mb-4">
          Ao usar nosso serviço, você concorda com as práticas descritas nesta política.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">2. Dados Coletados</h2>
        
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-800 mb-2">2.1 Dados de Cadastro</h3>
          <p className="text-gray-700 leading-relaxed mb-4">Coletamos as seguintes informações durante o registro:</p>
          <ul className="list-disc pl-6 text-gray-700 mb-4">
            <li>Nome completo</li>
            <li>Endereço de email</li>
            <li>Nome da empresa/organização</li>
            <li>Senha (criptografada)</li>
          </ul>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-800 mb-2">2.2 Dados de Uso</h3>
          <p className="text-gray-700 leading-relaxed mb-4">Automaticamente coletamos:</p>
          <ul className="list-disc pl-6 text-gray-700 mb-4">
            <li>Endereço IP</li>
            <li>Informações do navegador</li>
            <li>Páginas visitadas e tempo de permanência</li>
            <li>Logs de sistema e segurança</li>
            <li>Cookies e tecnologias similares</li>
          </ul>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-800 mb-2">2.3 Dados de Projetos</h3>
          <p className="text-gray-700 leading-relaxed mb-4">Através do uso da plataforma:</p>
          <ul className="list-disc pl-6 text-gray-700 mb-4">
            <li>Informações de clientes</li>
            <li>Dados de projetos fotovoltaicos</li>
            <li>Documentos e arquivos enviados</li>
            <li>Dados financeiros e de faturamento</li>
          </ul>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">3. Finalidade do Tratamento</h2>
        <p className="text-gray-700 leading-relaxed mb-4">Utilizamos seus dados para:</p>
        <ul className="list-disc pl-6 text-gray-700 mb-4">
          <li><strong>Prestação do serviço:</strong> Fornecer funcionalidades da plataforma</li>
          <li><strong>Comunicação:</strong> Enviar notificações, atualizações e suporte</li>
          <li><strong>Segurança:</strong> Proteger contra fraudes e acessos não autorizados</li>
          <li><strong>Melhoria:</strong> Analisar uso para melhorar o serviço</li>
          <li><strong>Compliance:</strong> Cumprir obrigações legais e regulatórias</li>
          <li><strong>Marketing:</strong> Enviar comunicações promocionais (com seu consentimento)</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">4. Base Legal (LGPD)</h2>
        <p className="text-gray-700 leading-relaxed mb-4">O tratamento dos seus dados está baseado em:</p>
        <ul className="list-disc pl-6 text-gray-700 mb-4">
          <li><strong>Execução de contrato:</strong> Para prestação do serviço contratado</li>
          <li><strong>Legítimo interesse:</strong> Para segurança e melhoria do serviço</li>
          <li><strong>Consentimento:</strong> Para comunicações de marketing</li>
          <li><strong>Cumprimento de obrigação legal:</strong> Quando exigido por lei</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">5. Compartilhamento de Dados</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Não vendemos seus dados pessoais. Podemos compartilhar informações apenas nas seguintes situações:
        </p>
        <ul className="list-disc pl-6 text-gray-700 mb-4">
          <li><strong>Prestadores de serviço:</strong> AWS, Supabase, Stripe (processamento de pagamentos)</li>
          <li><strong>Obrigação legal:</strong> Quando exigido por autoridades competentes</li>
          <li><strong>Proteção de direitos:</strong> Para proteger nossos direitos legais</li>
          <li><strong>Consentimento:</strong> Com sua autorização expressa</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">6. Armazenamento e Segurança</h2>
        
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-800 mb-2">6.1 Localização dos Dados</h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            Seus dados são armazenados em servidores seguros localizados no Brasil e em outros países, 
            sempre com fornecedores que garantem nível adequado de proteção.
          </p>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-800 mb-2">6.2 Medidas de Segurança</h3>
          <ul className="list-disc pl-6 text-gray-700 mb-4">
            <li>Criptografia de dados em trânsito e em repouso</li>
            <li>Controle de acesso baseado em funções</li>
            <li>Monitoramento contínuo de segurança</li>
            <li>Backup regular dos dados</li>
            <li>Auditoria de logs de acesso</li>
          </ul>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-800 mb-2">6.3 Retenção de Dados</h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            Mantemos seus dados pelo tempo necessário para cumprir as finalidades descritas nesta política, 
            respeitando prazos legais e regulatórios aplicáveis.
          </p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">7. Seus Direitos (LGPD)</h2>
        <p className="text-gray-700 leading-relaxed mb-4">Você tem o direito de:</p>
        <ul className="list-disc pl-6 text-gray-700 mb-4">
          <li><strong>Acesso:</strong> Solicitar informações sobre o tratamento dos seus dados</li>
          <li><strong>Correção:</strong> Corrigir dados incompletos, inexatos ou desatualizados</li>
          <li><strong>Eliminação:</strong> Solicitar a exclusão de dados desnecessários</li>
          <li><strong>Portabilidade:</strong> Receber seus dados em formato estruturado</li>
          <li><strong>Oposição:</strong> Se opor ao tratamento em certas situações</li>
          <li><strong>Revogação:</strong> Retirar consentimento a qualquer momento</li>
        </ul>
        <p className="text-gray-700 leading-relaxed mb-4">
          Para exercer seus direitos, entre em contato através do email: 
          <a href="mailto:privacidade@gerenciamentofotovoltaico.com.br" className="text-blue-600 hover:underline">
            privacidade@gerenciamentofotovoltaico.com.br
          </a>
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">8. Cookies</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Utilizamos cookies e tecnologias similares para:
        </p>
        <ul className="list-disc pl-6 text-gray-700 mb-4">
          <li>Manter você conectado à plataforma</li>
          <li>Lembrar suas preferências</li>
          <li>Analisar o uso do site</li>
          <li>Melhorar a experiência do usuário</li>
        </ul>
        <p className="text-gray-700 leading-relaxed mb-4">
          Você pode gerenciar cookies através das configurações do seu navegador.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">9. Alterações na Política</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Esta política pode ser atualizada periodicamente. Notificaremos sobre alterações significativas 
          por email ou através da plataforma. Recomendamos revisar esta página regularmente.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">10. Encarregado de Dados (DPO)</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Para questões relacionadas à proteção de dados, entre em contato com nosso encarregado:
        </p>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-gray-700">
            <strong>Email:</strong> dpo@gerenciamentofotovoltaico.com.br<br/>
            <strong>Telefone:</strong> (11) 9999-9999<br/>
            <strong>Endereço:</strong> São Paulo, SP, Brasil
          </p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">11. Autoridade Nacional</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Em caso de não resolução de questões relacionadas aos seus dados pessoais, você pode contatar a 
          Autoridade Nacional de Proteção de Dados (ANPD) através do site: 
          <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            www.gov.br/anpd
          </a>
        </p>
      </section>

      <div className="border-t pt-6 mt-8">
        <p className="text-sm text-gray-500">
          Esta Política de Privacidade foi atualizada pela última vez em {new Date().toLocaleDateString('pt-BR')} e 
          substitui todas as versões anteriores.
        </p>
      </div>
    </div>
  )
}
