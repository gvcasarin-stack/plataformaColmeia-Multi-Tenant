import { devLog } from "@/lib/utils/productionLogger";

/**
 * PDF Generator Utility
 * 
 * This utility provides functions to generate PDF-like documents using HTML
 * that can be downloaded and printed as PDFs by the user.
 */

/**
 * Generates an invoice HTML that can be downloaded and printed as PDF
 */
export function generateInvoiceHTML(
  project: any,
  user: any,
  formattedPrice: string,
  totalValue: number, // Mantenho este parâmetro para compatibilidade, mas não usaremos o cálculo de impostos
  issueDate: string,
  dueDate: Date,
  dadosBancarios?: {
    banco: string;
    agencia: string;
    conta: string;
    favorecido: string;
    documento: string;
    chavePix: string;
  }
): string {
  // SVG do logo Colmeia (extraído da sidebar)
  const logoSvg = `
    <svg viewBox="0 0 24 24" class="logo-svg">
      <path d="M21 16.5c0 0.38-0.21 0.71-0.53 0.88l-7.9 4.44c-0.16 0.12-0.36 0.18-0.57 0.18s-0.41-0.06-0.57-0.18l-7.9-4.44A0.991 0.991 0 0 1 3 16.5v-9c0-0.38 0.21-0.71 0.53-0.88l7.9-4.44c0.16-0.12 0.36-0.18 0.57-0.18s0.41 0.06 0.57 0.18l7.9 4.44c0.32 0.17 0.53 0.5 0.53 0.88v9z" 
        fill="currentColor" 
        stroke="currentColor" 
        strokeWidth="0.5"
      />
    </svg>
  `;

  // Formatação do status do projeto
  const getStatusBadge = (status: string) => {
    if (status === 'pago') {
      return `<span class="badge badge-success">PAGO</span>`;
    } else if (status === 'parcela1') {
      return `<span class="badge badge-parcial">PENDENTE 2ª PARCELA</span>`;
    } else {
      return `<span class="badge badge-pending">PENDENTE</span>`;
    }
  };

  // Log completo do objeto user para debug
  devLog.log('FULL USER OBJECT:', user);

  // Log detalhado das propriedades relevantes
  devLog.log('User data for invoice:', JSON.stringify({
    name: user?.name,
    displayName: user?.displayName,
    email: user?.email,
    phone: user?.phone,
    userData: user?.userData?.phone,
    phoneNumber: user?.phoneNumber,
    telefone: user?.telefone,
    contact: user?.contact,
    contactInfo: user?.contactInfo,
    mobilePhone: user?.mobilePhone,
    cellphone: user?.cellphone,
    tel: user?.tel,
    company: user?.company,
    companyName: user?.companyName,
    cnpj: user?.cnpj
  }, null, 2));

  // Obter telefone do cliente de forma mais robusta e completa
  const clientPhone = user?.userData?.phone || // Novo campo verificado (perfil do cliente)
                     user?.phoneNumber || 
                     user?.phone || 
                     user?.telefone || 
                     user?.tel || 
                     user?.cellphone || 
                     user?.mobilePhone || 
                     (user?.contactInfo?.phone) || 
                     (user?.contact?.phone) ||
                     (user?.contact?.phoneNumber) ||
                     (user?.profile?.phone) ||
                     (user?.detail?.phone) ||
                     "N/A";
  
  // Obter email do cliente de forma robusta
  const clientEmail = user?.email ||
                      user?.userData?.email ||
                      user?.user?.email ||
                      (user?.contactInfo?.email) ||
                      (user?.contact?.email) ||
                      (user?.profile?.email) ||
                      (user?.detail?.email) ||
                      "N/A";
  
  // Determinar se é empresa e obter documento adequado (CNPJ/CPF)
  const isCompany = Boolean(
    (user?.userData?.isCompany) || user?.isCompany || user?.companyName || user?.company || user?.cnpj
  );
  const clientDocument = isCompany
    ? (
        user?.userData?.cnpj ||
        user?.cnpj ||
        user?.companyDocument ||
        user?.document ||
        user?.documentNumber ||
        (user?.company?.cnpj) ||
        (user?.company?.document) ||
        (user?.companyData?.cnpj) ||
        (user?.documentData?.cnpj) ||
        (user?.profile?.cnpj) ||
        (user?.detail?.cnpj) ||
        'N/A'
      )
    : (
        user?.userData?.cpf ||
        user?.cpf ||
        user?.document ||
        user?.documentNumber ||
        (user?.profile?.cpf) ||
        (user?.detail?.cpf) ||
        'N/A'
      );
  const clientDocumentLabel = isCompany ? 'CNPJ' : 'CPF';
  
  // Verificar se o cliente tem empresa cadastrada
  const hasCompanyInfo = user?.company || user?.companyName || user?.cnpj;

  // Status de pagamento para a visualização
  let paymentStatus = project.pagamento || project.invoiceStatus || 'pendente';

  // Converter valores monetários para número com segurança
  const toNumber = (value: any): number => {
    if (typeof value === 'number' && !isNaN(value)) return value;
    if (typeof value === 'string') {
      const sanitized = value
        .replace(/\s/g, '')
        .replace(/^R\$\s*/i, '')
        .replace(/\./g, '')
        .replace(',', '.');
      const n = parseFloat(sanitized);
      return isNaN(n) ? 0 : n;
    }
    return 0;
  };

  // Calcular valores com base no número recebido (evita NaN quando vem "R$ ...")
  const valorTotal = toNumber(totalValue || formattedPrice || project?.valor_projeto || project?.valorProjeto || 0);
  const valorParcela = valorTotal / 2;
  const formattedValorParcela = valorParcela.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  const formattedValorTotal = valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  
  // Determinar valor pendente com base no status de pagamento
  let valorPendente = valorTotal;
  if (paymentStatus === 'parcela1') {
    valorPendente = valorParcela;
  } else if (paymentStatus === 'pago') {
    valorPendente = 0;
  }
  
  const formattedValorPendente = valorPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Fatura de Serviço - ${project.number || project.id}</title>
      <style>
        :root {
          --primary-color: #3b82f6;
          --primary-dark: #2563eb;
          --secondary-color: #4f46e5;
          --orange: #f97316;
          --orange-light: #ffedd5;
          --success: #22c55e;
          --success-bg: #dcfce7;
          --warning: #f59e0b;
          --warning-bg: #fef3c7;
          --gray-50: #f9fafb;
          --gray-100: #f3f4f6;
          --gray-200: #e5e7eb;
          --gray-300: #d1d5db;
          --gray-400: #9ca3af;
          --gray-500: #6b7280;
          --gray-600: #4b5563;
          --gray-700: #374151;
          --gray-800: #1f2937;
          --gray-900: #111827;
          --radius: 0.5rem;
        }

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          font-size: 14px;
          line-height: 1.5;
          color: var(--gray-800);
          background-color: #fff;
          margin: 0;
          padding: 0;
        }

        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 0;
        }

        .header {
          position: relative;
          background: linear-gradient(to right, var(--primary-color), var(--secondary-color));
          color: #fff;
          padding: 2rem;
          border-radius: var(--radius) var(--radius) 0 0;
          overflow: hidden;
        }

        .header-content {
          position: relative;
          z-index: 1;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .company-info {
          display: flex;
          align-items: center;
        }

        .logo-container {
          display: flex;
          align-items: center;
          margin-right: 1rem;
        }

        .logo-box {
          width: 48px;
          height: 48px;
          border-radius: 8px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          background-color: rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .logo-svg {
          width: 30px;
          height: 30px;
          color: #fff;
        }

        .company-name {
          display: flex;
          flex-direction: column;
        }

        .company-name h1 {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0;
        }

        .company-name p {
          font-size: 0.875rem;
          opacity: 0.8;
        }

        .invoice-info {
          text-align: right;
        }

        .invoice-title {
          font-size: 1.25rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .invoice-number {
          font-size: 1rem;
          opacity: 0.9;
        }

        /* Circles decorativos no header */
        .header-circle-1 {
          position: absolute;
          top: -30px;
          right: -30px;
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background-color: rgba(255, 255, 255, 0.1);
        }

        .header-circle-2 {
          position: absolute;
          bottom: -40px;
          left: -40px;
          width: 150px;
          height: 150px;
          border-radius: 50%;
          background-color: rgba(255, 255, 255, 0.1);
        }

        .invoice-body {
          padding: 2rem;
          background-color: #fff;
        }

        .invoice-summary {
          display: flex;
          justify-content: space-between;
          margin-bottom: 2rem;
          gap: 2rem;
        }

        .summary-column {
          flex: 1;
        }

        .summary-box {
          background-color: var(--gray-50);
          border-radius: var(--radius);
          padding: 1.25rem;
          margin-bottom: 1rem;
          border: 1px solid var(--gray-200);
        }

        .summary-box h3 {
          font-size: 0.875rem;
          font-weight: 600;
          text-transform: uppercase;
          color: var(--gray-600);
          margin-bottom: 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid var(--gray-200);
        }

        .project-details {
          margin-bottom: 2rem;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        .details-table {
          margin-bottom: 2rem;
        }

        .details-table th {
          text-align: left;
          padding: 0.75rem 1rem;
          background-color: var(--gray-100);
          border-top: 1px solid var(--gray-200);
          border-bottom: 1px solid var(--gray-200);
          color: var(--gray-700);
          font-weight: 600;
        }

        .details-table td {
          padding: 0.75rem 1rem;
          border-bottom: 1px solid var(--gray-200);
          color: var(--gray-800);
        }

        .price-column {
          text-align: right;
        }

        .details-row {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
        }

        .details-label {
          color: var(--gray-600);
          font-weight: 500;
        }

        .details-value {
          font-weight: 500;
          color: var(--gray-800);
        }

        .badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .badge-success {
          background-color: var(--success-bg);
          color: var(--success);
        }

        .badge-pending {
          background-color: var(--warning-bg);
          color: var(--warning);
        }
        
        .badge-parcial {
          background-color: var(--orange-light);
          color: var(--orange);
        }

        .totals-table {
          width: 100%;
          margin-top: 2rem;
          border-top: 2px solid var(--gray-200);
        }

        .totals-table td {
          padding: 0.75rem 0;
        }

        .totals-label {
          font-weight: 600;
          color: var(--gray-700);
        }

        .totals-value {
          text-align: right;
          font-weight: 600;
          color: var(--gray-900);
        }

        .total-row td {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--primary-dark);
          padding-top: 1rem;
          border-top: 2px solid var(--primary-color);
        }

        .payment-info {
          background-color: var(--gray-50);
          border-radius: var(--radius);
          padding: 1.5rem;
          margin-top: 2rem;
          border: 1px solid var(--gray-200);
        }

        .payment-info h3 {
          font-size: 1rem;
          font-weight: 600;
          color: var(--gray-700);
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
        }

        .payment-info h3 svg {
          margin-right: 0.5rem;
        }

        .payment-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }

        .payment-field {
          margin-bottom: 0.75rem;
        }

        .payment-label {
          font-size: 0.75rem;
          color: var(--gray-500);
          margin-bottom: 0.25rem;
        }

        .payment-value {
          font-weight: 500;
          color: var(--gray-800);
        }

        .footer {
          background-color: var(--gray-50);
          padding: 1.5rem 2rem;
          border-top: 1px solid var(--gray-200);
          color: var(--gray-600);
          font-size: 0.875rem;
          border-radius: 0 0 var(--radius) var(--radius);
        }

        .footer p {
          margin-bottom: 0.5rem;
        }

        .footer p:last-child {
          margin-bottom: 0;
        }

        .no-print {
          margin-top: 2rem;
          padding: 1.5rem;
          background-color: var(--gray-100);
          border-radius: var(--radius);
          border: 1px solid var(--gray-300);
        }

        .print-button {
          background-color: var(--primary-color);
          color: #fff;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: var(--radius);
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .print-button:hover {
          background-color: var(--primary-dark);
        }

        /* Estilos específicos para impressão */
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          
          html, body {
            width: 100%;
            height: auto;
            padding: 0;
            margin: 0;
          }
          
          body {
            padding: 0;
            margin: 0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          .no-print {
            display: none !important;
          }
          
          .container {
            width: 100%;
            max-width: 100%;
            margin: 0;
            box-shadow: none;
          }
          
          .header {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            background: linear-gradient(to right, var(--primary-color), var(--secondary-color)) !important;
          }
          
          .header-circle-1, .header-circle-2 {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            background-color: rgba(255, 255, 255, 0.1) !important;
          }
          
          /* Preservar fundos coloridos nas badges */
          .badge-success, .badge-pending, .badge-parcial {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          .badge-success {
            background-color: var(--success-bg) !important;
            color: var(--success) !important;
          }

          .badge-pending {
            background-color: var(--warning-bg) !important;
            color: var(--warning) !important;
          }
          
          .badge-parcial {
            background-color: var(--orange-light) !important;
            color: var(--orange) !important;
          }
          
          /* Garantir que tabelas não sejam quebradas entre páginas */
          table { 
            page-break-inside: avoid; 
          }
          
          /* Evitar quebras de página em elementos importantes */
          .invoice-summary, 
          .project-details, 
          .financial-details, 
          .payment-info,
          .footer {
            page-break-inside: avoid;
          }
          
          /* Preservar cores de texto */
          .total-row td {
            color: var(--primary-dark) !important;
            border-top: 2px solid var(--primary-color) !important;
          }
          
          svg, .logo-svg {
            color: #fff !important;
            fill: currentColor !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          .summary-box, .payment-info, .footer {
            background-color: var(--gray-50) !important;
            border: 1px solid var(--gray-200) !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header with Logo and Invoice Info -->
        <div class="header">
          <div class="header-circle-1"></div>
          <div class="header-circle-2"></div>
          <div class="header-content">
            <div class="company-info">
              <div class="logo-container">
                <div class="logo-box">
                  ${logoSvg}
                </div>
              </div>
              <div class="company-name">
                <h1>Plataforma SGF</h1>
                <p>Sistema de Gerenciamento Fotovoltaico</p>
              </div>
            </div>
            <div class="invoice-info">
              <div class="invoice-title">FATURA DE SERVIÇO</div>
              <div class="invoice-number">FATURA-SERVICO-${project.number || project.id}</div>
            </div>
          </div>
        </div>

        <!-- Invoice Body -->
        <div class="invoice-body">
          <!-- Invoice Summary -->
          <div class="invoice-summary">
            <div class="summary-column">
              <div class="summary-box">
                <h3>Informações da Fatura</h3>
                <div class="details-row">
                  <span class="details-label">Número:</span>
                  <span class="details-value">FATURA-SERVICO-${project.number || project.id}</span>
                </div>
                <div class="details-row">
                  <span class="details-label">Data de Emissão:</span>
                  <span class="details-value">${issueDate}</span>
                </div>
                <div class="details-row">
                  <span class="details-label">Data de Vencimento:</span>
                  <span class="details-value">${dueDate.toLocaleDateString('pt-BR')}</span>
                </div>
                <div class="details-row">
                  <span class="details-label">Status:</span>
                  <span>${getStatusBadge(paymentStatus)}</span>
                </div>
              </div>
            </div>
            
            <div class="summary-column">
              <div class="summary-box">
                <h3>Dados do Cliente</h3>
                <div class="details-row">
                  <span class="details-label">Nome:</span>
                  <span class="details-value">${user?.name || user?.displayName || user?.userData?.name || "Cliente não identificado"}</span>
                </div>
                <div class="details-row">
                  <span class="details-label">Email:</span>
                  <span class="details-value">${clientEmail}</span>
                </div>
                <div class="details-row">
                  <span class="details-label">Telefone:</span>
                  <span class="details-value">${clientPhone}</span>
                </div>
                <div class="details-row">
                  <span class="details-label">Empresa:</span>
                  <span class="details-value">${project?.empresaIntegradora || user?.company || user?.companyName || (isCompany ? 'N/A' : 'Pessoa Física')}</span>
                </div>
                <div class="details-row">
                  <span class="details-label">${clientDocumentLabel}:</span>
                  <span class="details-value">${clientDocument}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Project Details -->
          <div class="project-details">
            <h3 style="margin-bottom: 1rem; color: var(--gray-700); font-size: 1.125rem;">Detalhes do Projeto</h3>
            <table class="details-table">
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Detalhes</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Nome do Projeto</td>
                  <td>${project.name || "N/A"}</td>
                </tr>
                <tr>
                  <td>Número do Projeto</td>
                  <td>${project.number || "N/A"}</td>
                </tr>
                <tr>
                  <td>Cliente Final</td>
                  <td>${project.nomeClienteFinal || "N/A"}</td>
                </tr>
                <tr>
                  <td>Empresa Integradora</td>
                  <td>${project.empresaIntegradora || "N/A"}</td>
                </tr>
                <tr>
                  <td>Potência</td>
                  <td>${project.potencia} kWp</td>
                </tr>
                <tr>
                  <td>Distribuidora</td>
                  <td>${project.distribuidora || "N/A"}</td>
                </tr>
                <tr>
                  <td>Status do Projeto</td>
                  <td>${project.status || "N/A"}</td>
                </tr>
                <tr>
                  <td>Situação do Pagamento</td>
                  <td>${paymentStatus === 'pago' 
                         ? 'Integralmente pago' 
                         : (paymentStatus === 'parcela1' 
                            ? '1ª parcela paga' 
                            : 'Pagamento pendente')}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Financial Details -->
          <div class="financial-details">
            <h3 style="margin-bottom: 1rem; color: var(--gray-700); font-size: 1.125rem;">Resumo Financeiro</h3>
            <table class="details-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th class="price-column">Valor</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Serviços de Projeto Fotovoltaico (Valor Total)</td>
                  <td class="price-column">R$ ${formattedValorTotal}</td>
                </tr>
                ${paymentStatus === 'parcela1' ? `
                <tr>
                  <td>1ª Parcela - PAGA</td>
                  <td class="price-column">R$ ${formattedValorParcela}</td>
                </tr>
                <tr>
                  <td>2ª Parcela - PENDENTE</td>
                  <td class="price-column">R$ ${formattedValorParcela}</td>
                </tr>
                ` : ''}
              </tbody>
            </table>

            <table class="totals-table">
              <tr class="total-row">
                <td class="totals-label">VALOR ${paymentStatus === 'parcela1' ? 'PENDENTE' : 'TOTAL'}</td>
                <td class="totals-value">R$ ${formattedValorPendente}</td>
              </tr>
            </table>
          </div>

          <!-- Payment Instructions -->
          <div class="payment-info">
            <h3>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 4H3C1.89543 4 1 4.89543 1 6V18C1 19.1046 1.89543 20 3 20H21C22.1046 20 23 19.1046 23 18V6C23 4.89543 22.1046 4 21 4Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M1 10H23" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              INSTRUÇÕES DE PAGAMENTO
            </h3>
            <div class="payment-grid">
              <div class="payment-field">
                <div class="payment-label">Banco:</div>
                <div class="payment-value">${dadosBancarios?.banco || 'Banco do Brasil'}</div>
              </div>
              <div class="payment-field">
                <div class="payment-label">Agência:</div>
                <div class="payment-value">${dadosBancarios?.agencia || '1234-5'}</div>
              </div>
              <div class="payment-field">
                <div class="payment-label">Conta:</div>
                <div class="payment-value">${dadosBancarios?.conta || '12345-6'}</div>
              </div>
              <div class="payment-field">
                <div class="payment-label">Favorecido:</div>
                <div class="payment-value">${dadosBancarios?.favorecido || 'Plataforma SGF Ltda.'}</div>
              </div>
              <div class="payment-field">
                <div class="payment-label">CNPJ/CPF:</div>
                <div class="payment-value">${dadosBancarios?.documento || '12.345.678/0001-90'}</div>
              </div>
              ${dadosBancarios?.chavePix ? `
              <div class="payment-field">
                <div class="payment-label">Chave PIX:</div>
                <div class="payment-value">${dadosBancarios.chavePix}</div>
              </div>
              ` : ''}
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p><strong>Observações:</strong> Esta fatura de serviço refere-se aos serviços de projeto e homologação do sistema fotovoltaico na distribuidora de energia.</p>
          <p>O status desta fatura só pode ser alterado para 'PAGO' por um administrador do sistema.</p>
        </div>
      </div>
      
      <script>
        // Auto-open print dialog when the page loads
        window.addEventListener('load', function() {
          // Small delay to ensure the page is fully loaded
          setTimeout(function() {
            // Uncomment the line below to automatically open the print dialog
            // window.print();
          }, 1000);
        });
      </script>
    </body>
    </html>
  `;
}

/**
 * Creates a simple text-based invoice as a fallback
 */
function createTextInvoice(
  project: any,
  userData: any,
  formattedPrice: string,
  totalValue: number, // Mantido para compatibilidade
  issueDate: string,
  dueDate: Date,
  dadosBancarios?: {
    banco: string;
    agencia: string;
    conta: string;
    favorecido: string;
    documento: string;
    chavePix: string;
  }
): string {
  // Determinar texto de status de pagamento
  let statusText = '';
  if (project.invoiceStatus === 'pendente' || project.pagamento === 'pendente') {
    statusText = 'PENDENTE';
  } else if (project.invoiceStatus === 'parcela1' || project.pagamento === 'parcela1') {
    statusText = '1ª PARCELA PAGA';
  } else if (project.invoiceStatus === 'parcela2' || project.pagamento === 'parcela2') {
    statusText = '2ª PARCELA PAGA';
  } else if (project.invoiceStatus === 'pago' || project.pagamento === 'pago') {
    statusText = 'PAGO';
  }

  // Calcular valores das parcelas
  const valorTotal = parseFloat(formattedPrice.replace(/\./g, '').replace(',', '.'));
  const valorParcela = valorTotal / 2;
  const formattedValorParcela = valorParcela.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

  // Detalhes sobre pagamento baseado no status
  const getPaymentStatus = (status: string) => {
    switch(status) {
      case 'pago': return 'PAGO INTEGRALMENTE';
      case 'parcela1': return 'PRIMEIRA PARCELA PAGA (50%)';
      case 'pendente': 
      default: return 'PENDENTE';
    }
  };

  const paymentDetails = `
DETALHAMENTO DO PAGAMENTO
=====================================
Status: ${getPaymentStatus(project.pagamento || 'pendente')}
1ª Parcela (50%): R$ ${formattedValorParcela}
2ª Parcela (50%): R$ ${formattedValorParcela}
`;

  return `
FATURA DE SERVIÇO
=====================================

NÚMERO DA FATURA: INV-${project.number || project.id}
DATA DE EMISSÃO: ${issueDate}
DATA DE VENCIMENTO: ${dueDate.toLocaleDateString('pt-BR')}
STATUS: ${statusText}

DADOS DO CLIENTE
=====================================
Nome: ${userData?.name || userData?.email || ""}
Email: ${userData?.email || ""}

DADOS DO PROJETO
=====================================
Nome do Projeto: ${project.name}
Número do Projeto: ${project.number || ""}
Cliente Final: ${project.nomeClienteFinal || ""}
Empresa Integradora: ${project.empresaIntegradora || ""}

ESPECIFICAÇÕES TÉCNICAS
=====================================
Potência: ${project.potencia} kWp
Distribuidora: ${project.distribuidora || ""}

DETALHAMENTO DE VALORES
=====================================
Serviços de Projeto Fotovoltaico: R$ ${formattedPrice}
---------------------------------------
VALOR TOTAL: R$ ${formattedPrice}
${paymentDetails}
INSTRUÇÕES DE PAGAMENTO
=====================================
${dadosBancarios ? `Banco: ${dadosBancarios.banco}
Agência: ${dadosBancarios.agencia}
Conta: ${dadosBancarios.conta}
Favorecido: ${dadosBancarios.favorecido}
CNPJ/CPF: ${dadosBancarios.documento}
${dadosBancarios.chavePix ? `PIX: ${dadosBancarios.chavePix}` : ''}` 
: `PIX 1 (CNPJ): 46.580.666/0001-67
PIX 2 (CELULAR): (48) 9 9176-0130`}

Esta fatura refere-se aos serviços de projeto e homologação do sistema fotovoltaico na distribuidora de energia.
O status desta fatura só pode ser alterado para 'PAGO' por um administrador do sistema.
`;
}

/**
 * Downloads an HTML file as PDF using the html2pdf library
 * This allows direct PDF generation in the browser
 */
export function downloadHTMLAsPDF(html: string, filename: string): void {
  try {
    // Adicionar botão de impressão, caso ainda não exista
    if (!html.includes('class="print-button"')) {
      const bodyEndIndex = html.lastIndexOf('</body>');
      
      if (bodyEndIndex !== -1) {
        const printButton = `
          <div class="container no-print" style="margin-top: 30px; margin-bottom: 30px; text-align: center;">
            <button 
              onclick="preparePrint()" 
              class="print-button"
              style="background-color: var(--primary-color, #3b82f6); color: #fff; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-weight: 600; cursor: pointer;"
            >
              Imprimir / Salvar como PDF
            </button>
          </div>
        `;
        
        // Inserir apenas o botão de impressão antes do fechamento do body
        html = html.slice(0, bodyEndIndex) + printButton + html.slice(bodyEndIndex);
      }
    }
    
    // Adicionar script para detectar quando a página terminou de carregar e preparar para impressão
    const scriptEndIndex = html.lastIndexOf('</body>');
    if (scriptEndIndex !== -1) {
      const enhancedScript = `
        <script>
          // Script para garantir que os recursos estejam carregados adequadamente
          window.addEventListener('load', function() {
            document.title = "Fatura - ${filename.replace('.pdf', '')}";
            devLog.log("Documento de fatura carregado com sucesso");
            
            // Adicionar estilos específicos para garantir cores e formatação na impressão
            const styleEl = document.createElement('style');
            styleEl.textContent = \`
              @media print {
                @page {
                  size: A4;
                  margin: 10mm;
                }
                
                body {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  color-adjust: exact !important;
                }
                
                .header {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  color-adjust: exact !important;
                  background: linear-gradient(to right, var(--primary-color), var(--secondary-color)) !important;
                }
                
                .badge-success, .badge-pending, .badge-parcial, .total-row td {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  color-adjust: exact !important;
                }
                
                .total-row td {
                  color: var(--primary-dark) !important;
                }
                
                svg, .logo-svg {
                  color: #fff !important;
                  fill: currentColor !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  color-adjust: exact !important;
                }
                
                table { 
                  page-break-inside: avoid; 
                }
                
                .invoice-summary, 
                .project-details, 
                .financial-details, 
                .payment-info,
                .footer {
                  page-break-inside: avoid;
                }
              }
            \`;
            document.head.appendChild(styleEl);
          });
          
          // Função para preparar a impressão com configurações ideais
          function preparePrint() {
            // Garantir que todos os estilos estejam aplicados
            setTimeout(function() {
              // Verificar se as imagens estão completamente carregadas
              let allImagesLoaded = true;
              const images = document.querySelectorAll('img, svg');
              images.forEach(img => {
                if (!img.complete) {
                  allImagesLoaded = false;
                }
              });
              
              if (allImagesLoaded) {
                window.print();
              } else {
                // Se alguma imagem ainda não foi carregada, esperar mais um pouco
                setTimeout(function() {
                  window.print();
                }, 500);
              }
            }, 300);
          }
        </script>
      `;
      
      html = html.slice(0, scriptEndIndex) + enhancedScript + html.slice(scriptEndIndex);
    }

    // Adicionar estilos melhorados para preservar cores na impressão
    const headEndIndex = html.indexOf('</head>');
    if (headEndIndex !== -1) {
      const enhancedPrintStyles = `
        <style>
          /* Estilos específicos para garantir cores na impressão */
          @media print {
            @page {
              size: A4;
              margin: 10mm;
            }
            
            html, body {
              width: 100%;
              height: auto;
              margin: 0;
              padding: 0;
            }
            
            body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            
            .header {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
              background: linear-gradient(to right, var(--primary-color), var(--secondary-color)) !important;
            }
            
            .header-circle-1, .header-circle-2 {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
              background-color: rgba(255, 255, 255, 0.1) !important;
            }
            
            .badge-success, .badge-pending, .badge-parcial {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }

            .badge-success {
              background-color: var(--success-bg) !important;
              color: var(--success) !important;
            }

            .badge-pending {
              background-color: var(--warning-bg) !important;
              color: var(--warning) !important;
            }
            
            .badge-parcial {
              background-color: var(--orange-light) !important;
              color: var(--orange) !important;
            }
            
            .total-row td {
              color: var(--primary-dark) !important;
              border-top: 2px solid var(--primary-color) !important;
            }
            
            svg, .logo-svg {
              color: #fff !important;
              fill: currentColor !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            
            .summary-box, .payment-info, .footer {
              background-color: var(--gray-50) !important;
              border: 1px solid var(--gray-200) !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
          }
        </style>
      `;
      
      html = html.slice(0, headEndIndex) + enhancedPrintStyles + html.slice(headEndIndex);
    }

    // Criar documento em uma nova aba diretamente
    const newWindow = window.open('', '_blank');
    
    if (!newWindow) {
      alert("O navegador bloqueou a abertura da fatura. Por favor, permita pop-ups para este site e tente novamente.");
      return;
    }
    
    // Escrever HTML diretamente na nova janela/aba com configurações otimizadas para impressão
    newWindow.document.open();
    newWindow.document.write(html);
    newWindow.document.close();

  } catch (error) {
    devLog.error("Erro ao gerar fatura:", error);
    fallbackToTextFile();
  }
  
  // Método fallback para baixar como texto (mantido sem alterações)
  function fallbackToTextFile() {
    try {
      // Extrair informações do projeto do HTML
      const projectMatch = html.match(/INV-(.*?)<\/div>/);
      const projectNumber = projectMatch ? projectMatch[1] : "unknown";
      
      // Criar uma versão simples em texto usando a função de fallback
      const textContent = createTextInvoice(
        { number: projectNumber, id: projectNumber },
        {},
        "0,00",
        0,
        new Date().toLocaleDateString('pt-BR'),
        new Date(),
        undefined // Usar undefined em vez de {} para o parâmetro dadosBancarios opcional
      );
      
      // Criar um blob com o conteúdo de texto
      const blob = new Blob([textContent], { type: 'text/plain' });
      
      // Criar uma URL para o blob
      const url = URL.createObjectURL(blob);
      
      // Criar um elemento de link
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename.replace(/\.pdf$/, '')}.txt`;
      
      // Adicionar o link ao corpo do documento
      document.body.appendChild(link);
      
      // Clicar no link para iniciar o download
      link.click();
      
      // Limpar
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (textFallbackError) {
      devLog.error("Falha completa na geração da fatura:", textFallbackError);
      alert("Não foi possível gerar a fatura. Por favor, tente novamente ou contate o suporte.");
    }
  }
}

/**
 * Generates a consolidated invoice HTML for multiple projects that can be downloaded and printed as PDF
 */
export const generateConsolidatedInvoiceHTML = (
  projects: any[],
  userData: any,
  formattedPrice: string,
  totalValue: number,
  issueDate: string,
  dueDate: string,
  dadosBancarios?: {
    banco: string;
    agencia: string;
    conta: string;
    favorecido: string;
    documento: string;
    chavePix: string;
  }
) => {
  // Obter email do cliente de forma mais robusta (seguindo padrão usado na fatura individual)
  const clientEmail = userData?.email || 
                     userData?.userData?.email || 
                     userData?.user?.email || 
                     userData?.contactInfo?.email || 
                     userData?.contact?.email || 
                     userData?.profile?.email || 
                     userData?.detail?.email || 
                     "N/A";
  
  // Obter documento do cliente (CNPJ para empresa, CPF para pessoa física)
  const isCompany2 = Boolean(
    (userData?.userData?.isCompany) || userData?.isCompany || userData?.companyName || userData?.cnpj
  );
  const clientDocument2 = isCompany2
    ? (
        userData?.userData?.cnpj || userData?.cnpj || userData?.companyDocument || userData?.document || userData?.documentNumber || (userData?.company?.cnpj) || (userData?.company?.document) || (userData?.companyData?.cnpj) || 'N/A'
      )
    : (
        userData?.userData?.cpf || userData?.cpf || userData?.document || userData?.documentNumber || 'N/A'
      );
  const clientDocumentLabel2 = isCompany2 ? 'CNPJ' : 'CPF';
  
  // Obter telefone do cliente de forma mais robusta
  const clientPhone = userData?.userData?.phone || 
                     userData?.phoneNumber || 
                     userData?.phone || 
                     userData?.telefone || 
                     userData?.tel || 
                     userData?.cellphone || 
                     userData?.mobilePhone || 
                     (userData?.contactInfo?.phone) || 
                     (userData?.contact?.phone) ||
                     (userData?.contact?.phoneNumber) ||
                     (userData?.profile?.phone) ||
                     (userData?.detail?.phone) ||
                     "N/A";
  
  // Obter nome do cliente - priorizar pessoa física sobre empresa
  const clientName = userData?.name || 
                    userData?.displayName || 
                    userData?.userData?.name || 
                    userData?.companyName || 
                    userData?.company || 
                    userData?.userData?.companyName || 
                    "Cliente não identificado";
  
  // Determinar status geral da fatura
  let faturaStatus = "PENDENTE";
  
  // Se todos os projetos tiverem uma primeira parcela paga, mostrar como "PENDENTE 2ª PARCELA"
  if (projects.length > 0 && projects.every(p => p.pagamento === 'parcela1')) {
    faturaStatus = "PENDENTE 2ª PARCELA";
  }
  
  // SVG do logo Colmeia (extraído da sidebar) - hexágono original
  const logoSvg = `
    <svg viewBox="0 0 24 24" class="logo-svg">
      <path d="M21 16.5c0 0.38-0.21 0.71-0.53 0.88l-7.9 4.44c-0.16 0.12-0.36 0.18-0.57 0.18s-0.41-0.06-0.57-0.18l-7.9-4.44A0.991 0.991 0 0 1 3 16.5v-9c0-0.38 0.21-0.71 0.53-0.88l7.9-4.44c0.16-0.12 0.36-0.18 0.57-0.18s0.41 0.06 0.57 0.18l7.9 4.44c0.32 0.17 0.53 0.5 0.53 0.88v9z" 
        fill="currentColor" 
        stroke="currentColor" 
        strokeWidth="0.5"
      />
    </svg>
  `;
  
  // Gerar lista de projetos para a tabela de detalhamento
  const projectListHTML = projects.map(project => {
    // Determinar status de pagamento para este projeto
    let projetoStatus = "";
    switch (project.pagamento) {
      case 'pendente':
        projetoStatus = "Pagamento pendente";
        break;
      case 'parcela1':
        projetoStatus = "1ª parcela paga";
        break;
      case 'pago':
        projetoStatus = "Integralmente pago";
        break;
      default:
        projetoStatus = "Pagamento pendente";
    }
    
    return `
      <tr>
        <td>${project.number || project.id}</td>
        <td>${project.nomeClienteFinal || "N/A"}</td>
        <td>${project.potencia || "0"} kWp</td>
        <td class="price-column">R$ ${project.pendingAmountFormatted}</td>
        <td>${projetoStatus}</td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Fatura de Serviço - ${userData.name || userData.companyName}</title>
      <style>
        :root {
          --primary-color: #3b82f6;
          --primary-dark: #2563eb;
          --secondary-color: #4f46e5;
          --orange: #f97316;
          --orange-light: #ffedd5;
          --success: #22c55e;
          --success-bg: #dcfce7;
          --warning: #f59e0b;
          --warning-bg: #fef3c7;
          --gray-50: #f9fafb;
          --gray-100: #f3f4f6;
          --gray-200: #e5e7eb;
          --gray-300: #d1d5db;
          --gray-400: #9ca3af;
          --gray-500: #6b7280;
          --gray-600: #4b5563;
          --gray-700: #374151;
          --gray-800: #1f2937;
          --gray-900: #111827;
          --radius: 0.5rem;
        }

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          font-size: 14px;
          line-height: 1.5;
          color: var(--gray-800);
          background-color: #fff;
          margin: 0;
          padding: 0;
        }

        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 0;
        }

        .header {
          position: relative;
          background: linear-gradient(to right, var(--primary-color), var(--secondary-color));
          color: #fff;
          padding: 2rem;
          border-radius: var(--radius) var(--radius) 0 0;
          overflow: hidden;
        }

        .header-content {
          position: relative;
          z-index: 1;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .company-info {
          display: flex;
          align-items: center;
        }

        .logo-container {
          display: flex;
          align-items: center;
          margin-right: 1rem;
        }

        .logo-box {
          width: 48px;
          height: 48px;
          border-radius: 8px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          background-color: rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .logo-svg {
          width: 30px;
          height: 30px;
          color: #fff;
        }

        .company-name {
          display: flex;
          flex-direction: column;
        }

        .company-name h1 {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0;
        }

        .company-name p {
          font-size: 0.875rem;
          opacity: 0.8;
        }

        .invoice-info {
          text-align: right;
        }

        .invoice-title {
          font-size: 1.25rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .invoice-number {
          font-size: 1rem;
          opacity: 0.9;
        }

        /* Circles decorativos no header */
        .header-circle-1 {
          position: absolute;
          top: -30px;
          right: -30px;
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background-color: rgba(255, 255, 255, 0.1);
        }

        .header-circle-2 {
          position: absolute;
          bottom: -40px;
          left: -40px;
          width: 150px;
          height: 150px;
          border-radius: 50%;
          background-color: rgba(255, 255, 255, 0.1);
        }

        .invoice-body {
          padding: 2rem;
          background-color: #fff;
        }

        .invoice-summary {
          display: flex;
          justify-content: space-between;
          margin-bottom: 2rem;
          gap: 2rem;
        }

        .summary-column {
          flex: 1;
        }

        .summary-box {
          background-color: var(--gray-50);
          border-radius: var(--radius);
          padding: 1.25rem;
          margin-bottom: 1rem;
          border: 1px solid var(--gray-200);
        }

        .summary-box h3 {
          font-size: 0.875rem;
          font-weight: 600;
          text-transform: uppercase;
          color: var(--gray-600);
          margin-bottom: 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid var(--gray-200);
        }

        .project-details {
          margin-bottom: 2rem;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        .details-table {
          margin-bottom: 2rem;
        }

        .details-table th {
          text-align: left;
          padding: 0.75rem 1rem;
          background-color: var(--gray-100);
          border-top: 1px solid var(--gray-200);
          border-bottom: 1px solid var(--gray-200);
          color: var(--gray-700);
          font-weight: 600;
        }

        .details-table td {
          padding: 0.75rem 1rem;
          border-bottom: 1px solid var(--gray-200);
          color: var(--gray-800);
        }

        .price-column {
          text-align: right;
        }

        .details-row {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
        }

        .details-label {
          color: var(--gray-600);
          font-weight: 500;
        }

        .details-value {
          font-weight: 500;
          color: var(--gray-800);
        }

        .badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .badge-success {
          background-color: var(--success-bg);
          color: var(--success);
        }

        .badge-pending {
          background-color: var(--warning-bg);
          color: var(--warning);
        }
        
        .badge-parcial {
          background-color: var(--orange-light);
          color: var(--orange);
        }

        .totals-table {
          width: 100%;
          margin-top: 2rem;
          border-top: 2px solid var(--gray-200);
        }

        .totals-table td {
          padding: 0.75rem 0;
        }

        .totals-label {
          font-weight: 600;
          color: var(--gray-700);
        }

        .totals-value {
          text-align: right;
          font-weight: 600;
          color: var(--gray-900);
        }

        .total-row td {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--primary-dark);
          padding-top: 1rem;
          border-top: 2px solid var(--primary-color);
        }

        .payment-info {
          background-color: var(--gray-50);
          border-radius: var(--radius);
          padding: 1.5rem;
          margin-top: 2rem;
          border: 1px solid var(--gray-200);
        }

        .payment-info h3 {
          font-size: 1rem;
          font-weight: 600;
          color: var(--gray-700);
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
        }

        .payment-info h3 svg {
          margin-right: 0.5rem;
        }

        .payment-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }

        .payment-field {
          margin-bottom: 0.75rem;
        }

        .payment-label {
          font-size: 0.75rem;
          color: var(--gray-500);
          margin-bottom: 0.25rem;
        }

        .payment-value {
          font-weight: 500;
          color: var(--gray-800);
        }

        .footer {
          background-color: var(--gray-50);
          padding: 1.5rem 2rem;
          border-top: 1px solid var(--gray-200);
          color: var(--gray-600);
          font-size: 0.875rem;
          border-radius: 0 0 var(--radius) var(--radius);
        }

        .footer p {
          margin-bottom: 0.5rem;
        }

        .footer p:last-child {
          margin-bottom: 0;
        }

        .no-print {
          margin-top: 2rem;
          padding: 1.5rem;
          background-color: var(--gray-100);
          border-radius: var(--radius);
          border: 1px solid var(--gray-300);
        }

        .print-button {
          background-color: var(--primary-color);
          color: #fff;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: var(--radius);
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .print-button:hover {
          background-color: var(--primary-dark);
        }

        /* Estilos específicos para impressão */
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          
          html, body {
            width: 100%;
            height: auto;
            padding: 0;
            margin: 0;
          }
          
          body {
            padding: 0;
            margin: 0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          .no-print {
            display: none !important;
          }
          
          .container {
            width: 100%;
            max-width: 100%;
            margin: 0;
            box-shadow: none;
          }
          
          .header {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            background: linear-gradient(to right, var(--primary-color), var(--secondary-color)) !important;
          }
          
          .header-circle-1, .header-circle-2 {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            background-color: rgba(255, 255, 255, 0.1) !important;
          }
          
          /* Preservar fundos coloridos nas badges */
          .badge-success, .badge-pending, .badge-parcial {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          .badge-success {
            background-color: var(--success-bg) !important;
            color: var(--success) !important;
          }

          .badge-pending {
            background-color: var(--warning-bg) !important;
            color: var(--warning) !important;
          }
          
          .badge-parcial {
            background-color: var(--orange-light) !important;
            color: var(--orange) !important;
          }
          
          /* Garantir que tabelas não sejam quebradas entre páginas */
          table { 
            page-break-inside: avoid; 
          }
          
          /* Evitar quebras de página em elementos importantes */
          .invoice-summary, 
          .project-details, 
          .financial-details, 
          .payment-info,
          .footer {
            page-break-inside: avoid;
          }
          
          /* Preservar cores de texto */
          .total-row td {
            color: var(--primary-dark) !important;
            border-top: 2px solid var(--primary-color) !important;
          }
          
          svg, .logo-svg {
            color: #fff !important;
            fill: currentColor !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          .summary-box, .payment-info, .footer {
            background-color: var(--gray-50) !important;
            border: 1px solid var(--gray-200) !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <!-- Elementos decorativos -->
          <div class="header-circle-1"></div>
          <div class="header-circle-2"></div>
          
          <div class="header-content">
            <div class="company-info">
              <div class="logo-container">
                <div class="logo-box">
                  ${logoSvg}
                </div>
              </div>
              <div class="company-name">
                <h1>Plataforma SGF</h1>
                <p>Sistema de Gerenciamento Fotovoltaico</p>
              </div>
            </div>
            <div class="invoice-info">
              <div class="invoice-title">FATURA DE SERVIÇO</div>
              <div class="invoice-number">FATURA-SERVICO-${Date.now()}</div>
            </div>
          </div>
        </div>
        
        <!-- Invoice Body -->
        <div class="invoice-body">
          <!-- Summary Information -->
          <div class="invoice-summary">
            <div class="summary-column">
              <div class="summary-box">
                <h3>Informações da Fatura</h3>
                <div class="details-row">
                  <span class="details-label">Data de Emissão:</span>
                  <span class="details-value">${issueDate}</span>
                </div>
                <div class="details-row">
                  <span class="details-label">Data de Vencimento:</span>
                  <span class="details-value">${dueDate}</span>
                </div>
                <div class="details-row">
                  <span class="details-label">Status:</span>
                  <span class="${faturaStatus === 'PENDENTE 2ª PARCELA' ? 'badge badge-parcial' : 'badge badge-pending'}">${faturaStatus}</span>
                </div>
                <div class="details-row">
                  <span class="details-label">Total de Projetos:</span>
                  <span class="details-value">${projects.length}</span>
                </div>
              </div>
            </div>
            
            <div class="summary-column">
              <div class="summary-box">
                <h3>Dados do Cliente</h3>
                <div class="details-row">
                  <span class="details-label">Nome:</span>
                  <span class="details-value">${clientName}</span>
                </div>
                <div class="details-row">
                  <span class="details-label">Email:</span>
                  <span class="details-value">${clientEmail}</span>
                </div>
                <div class="details-row">
                  <span class="details-label">Telefone:</span>
                  <span class="details-value">${clientPhone}</span>
                </div>
                <div class="details-row">
                  <span class="details-label">Empresa:</span>
                  <span class="details-value">${projects[0]?.empresaIntegradora || userData.companyName || (isCompany2 ? 'N/A' : 'Pessoa Física')}</span>
                </div>
                <div class="details-row">
                  <span class="details-label">${clientDocumentLabel2}:</span>
                  <span class="details-value">${clientDocument2}</span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Project Details -->
          <div class="project-details">
            <h3 style="margin-bottom: 1rem; color: var(--gray-700); font-size: 1.125rem;">Lista de Projetos</h3>
            <table class="details-table">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Cliente Final</th>
                  <th>Potência</th>
                  <th class="price-column">Valor Pendente</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                ${projectListHTML}
              </tbody>
            </table>
          </div>
          
          <!-- Financial Details -->
          <div class="financial-details">
            <h3 style="margin-bottom: 1rem; color: var(--gray-700); font-size: 1.125rem;">Resumo Financeiro</h3>
            <table class="totals-table">
              <tr class="total-row">
                <td class="totals-label">TOTAL</td>
                <td class="totals-value">R$ ${typeof totalValue === 'number' ? totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : String(formattedPrice).replace(/^R\$\s*/i, '')}</td>
              </tr>
            </table>
          </div>
          
          <!-- Payment Instructions -->
          <div class="payment-info">
            <h3>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 4H3C1.89543 4 1 4.89543 1 6V18C1 19.1046 1.89543 20 3 20H21C22.1046 20 23 19.1046 23 18V6C23 4.89543 22.1046 4 21 4Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M1 10H23" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              INSTRUÇÕES DE PAGAMENTO
            </h3>
            <div class="payment-grid">
              <div class="payment-field">
                <div class="payment-label">Banco:</div>
                <div class="payment-value">${dadosBancarios?.banco || 'Banco do Brasil'}</div>
              </div>
              <div class="payment-field">
                <div class="payment-label">Agência:</div>
                <div class="payment-value">${dadosBancarios?.agencia || '1234-5'}</div>
              </div>
              <div class="payment-field">
                <div class="payment-label">Conta:</div>
                <div class="payment-value">${dadosBancarios?.conta || '12345-6'}</div>
              </div>
              <div class="payment-field">
                <div class="payment-label">Favorecido:</div>
                <div class="payment-value">${dadosBancarios?.favorecido || 'Plataforma SGF Ltda.'}</div>
              </div>
              <div class="payment-field">
                <div class="payment-label">CNPJ/CPF:</div>
                <div class="payment-value">${dadosBancarios?.documento || '12.345.678/0001-90'}</div>
              </div>
              ${dadosBancarios?.chavePix ? `
              <div class="payment-field">
                <div class="payment-label">Chave PIX:</div>
                <div class="payment-value">${dadosBancarios.chavePix}</div>
              </div>
              ` : ''}
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p><strong>Observações:</strong> Esta fatura de serviço refere-se aos serviços de projeto e homologação de múltiplos sistemas fotovoltaicos na distribuidora de energia.</p>
          <p>O status desta fatura só pode ser alterado para 'PAGO' por um administrador do sistema.</p>
        </div>
      </div>
      
      <script>
        // Auto-open print dialog when the page loads
        window.addEventListener('load', function() {
          // Small delay to ensure the page is fully loaded
          setTimeout(function() {
            // Uncomment the line below to automatically open the print dialog
            // window.print();
          }, 1000);
        });
      </script>
    </body>
    </html>
  `;
};

// Declaração para TypeScript reconhecer html2pdf como propriedade global do window
declare global {
  interface Window {
    html2pdf: any;
  }
} 