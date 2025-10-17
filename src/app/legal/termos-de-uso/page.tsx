import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Termos de Uso - Gerenciamento Fotovoltaico',
  description: 'Termos de uso do sistema de gerenciamento fotovoltaico.',
}

export const dynamic = 'force-dynamic';

export default function TermosDeUsoPage() {
  return (
    <div className="prose prose-gray max-w-none">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Termos de Uso</h1>
      
      <p className="text-gray-600 mb-6">
        <strong>Última atualização:</strong> {new Date().toLocaleDateString('pt-BR')}
      </p>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">1. Aceitação dos Termos</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Ao acessar e usar o sistema de Gerenciamento Fotovoltaico, você concorda em cumprir e estar vinculado a estes Termos de Uso. 
          Se você não concorda com qualquer parte destes termos, não deve usar nosso serviço.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">2. Descrição do Serviço</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          O Gerenciamento Fotovoltaico é uma plataforma SaaS (Software as a Service) que oferece ferramentas para:
        </p>
        <ul className="list-disc pl-6 text-gray-700 mb-4">
          <li>Gestão de projetos fotovoltaicos</li>
          <li>Controle de clientes e fornecedores</li>
          <li>Acompanhamento financeiro</li>
          <li>Documentação e arquivos de projetos</li>
          <li>Relatórios e dashboards</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">3. Registro e Conta de Usuário</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Para usar nosso serviço, você deve:
        </p>
        <ul className="list-disc pl-6 text-gray-700 mb-4">
          <li>Fornecer informações precisas e atualizadas durante o registro</li>
          <li>Manter a segurança de sua senha e conta</li>
          <li>Notificar-nos imediatamente sobre qualquer uso não autorizado</li>
          <li>Ser responsável por todas as atividades em sua conta</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">4. Planos e Pagamentos</h2>
        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-800 mb-2">4.1 Período de Trial</h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            Oferecemos um período de teste gratuito de 7 dias para novos usuários. Durante este período, 
            você terá acesso limitado às funcionalidades conforme o plano selecionado.
          </p>
        </div>
        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-800 mb-2">4.2 Planos Pagos</h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            Após o período de trial, é necessário assinar um plano pago para continuar usando o serviço. 
            Os preços e funcionalidades estão descritos em nossa página de planos.
          </p>
        </div>
        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-800 mb-2">4.3 Cancelamento</h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            Você pode cancelar sua assinatura a qualquer momento. O cancelamento será efetivo no final do período de cobrança atual.
          </p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">5. Uso Aceitável</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Você concorda em NÃO usar o serviço para:
        </p>
        <ul className="list-disc pl-6 text-gray-700 mb-4">
          <li>Atividades ilegais ou não autorizadas</li>
          <li>Violar direitos de propriedade intelectual</li>
          <li>Transmitir malware ou código malicioso</li>
          <li>Fazer engenharia reversa do software</li>
          <li>Revender ou redistribuir o serviço sem autorização</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">6. Propriedade Intelectual</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          O sistema, incluindo seu código, design, logotipos e conteúdo, é propriedade exclusiva da empresa. 
          Você recebe apenas uma licença limitada para usar o serviço conforme estes termos.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">7. Privacidade e Dados</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Sua privacidade é importante para nós. Consulte nossa 
          <a href="/legal/politica-de-privacidade" className="text-blue-600 hover:underline"> Política de Privacidade </a>
          para entender como coletamos, usamos e protegemos seus dados.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">8. Limitação de Responsabilidade</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          O serviço é fornecido "como está" e "conforme disponível". Não garantimos que o serviço será 
          ininterrupto, livre de erros ou totalmente seguro. Nossa responsabilidade é limitada ao valor 
          pago pelo serviço nos últimos 12 meses.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">9. Modificações dos Termos</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Reservamos o direito de modificar estes termos a qualquer momento. As alterações serão 
          comunicadas por email ou através da plataforma. O uso continuado do serviço após as 
          alterações constitui aceitação dos novos termos.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">10. Lei Aplicável</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Estes termos são regidos pelas leis brasileiras. Qualquer disputa será resolvida nos 
          tribunais competentes do Brasil, especificamente na comarca da sede da empresa.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">11. Contato</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Para dúvidas sobre estes Termos de Uso, entre em contato conosco:
        </p>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-gray-700">
            <strong>Email:</strong> contato@gerenciamentofotovoltaico.com.br<br/>
            <strong>Telefone:</strong> (11) 9999-9999<br/>
            <strong>Endereço:</strong> São Paulo, SP, Brasil
          </p>
        </div>
      </section>

      <div className="border-t pt-6 mt-8">
        <p className="text-sm text-gray-500">
          Este documento foi atualizado pela última vez em {new Date().toLocaleDateString('pt-BR')} e 
          substitui todas as versões anteriores dos Termos de Uso.
        </p>
      </div>
    </div>
  )
}
