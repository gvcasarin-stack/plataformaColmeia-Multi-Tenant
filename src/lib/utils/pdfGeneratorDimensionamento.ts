/**
 * ⚠️ IMPORTANTE - NÃO MESCLAR COM pdfGenerator.ts
 *
 * @file pdfGeneratorDimensionamento.ts
 * @description Utilitário EXCLUSIVO para gerar PDFs de DIMENSIONAMENTO
 *
 * HISTÓRICO:
 * - Este arquivo foi separado do pdfGenerator.ts para evitar conflitos
 * - pdfGenerator.ts = FATURAS (invoices)
 * - pdfGeneratorDimensionamento.ts = DIMENSIONAMENTO (este arquivo)
 *
 * ⚠️ ATENÇÃO: Mantenha este arquivo separado do pdfGenerator.ts
 * Cada arquivo tem uma responsabilidade única e específica.
 *
 * Nota: Implementação básica usando HTML2Canvas + jsPDF
 * Para produção, considerar usar bibliotecas mais robustas
 */

import { Dimensionamento } from '@/types/dimensionamento';

// =====================================================
// GERAÇÃO DE PDF PARA DIMENSIONAMENTO
// =====================================================

export async function gerarPDFDimensionamento(
  dimensionamento: Dimensionamento,
  nomeEstado: string,
  nomeEmpresa?: string
): Promise<Blob | null> {
  try {
    // Implementação futura com jsPDF ou react-pdf
    // Por ora, retornamos uma mensagem indicativa

    console.log('[gerarPDFDimensionamento] Dados recebidos:', {
      tipo_sistema: dimensionamento.tipo_sistema,
      consumo_mensal: dimensionamento.consumo_mensal,
      estado: nomeEstado,
    });

    // TODO: Implementar geração real de PDF
    // Opções:
    // 1. jsPDF + html2canvas (client-side)
    // 2. @react-pdf/renderer (React components)
    // 3. puppeteer (server-side)

    // Placeholder: gerar PDF simples em memória
    const conteudoPDF = gerarConteudoHTML(dimensionamento, nomeEstado, nomeEmpresa);

    // Converter HTML para Blob (simulação)
    const blob = new Blob([conteudoPDF], { type: 'text/html' });

    return blob;
  } catch (error) {
    console.error('[gerarPDFDimensionamento] Erro ao gerar PDF:', error);
    return null;
  }
}

// =====================================================
// GERAÇÃO DE CONTEÚDO HTML PARA PDF
// =====================================================

function gerarConteudoHTML(
  dim: Dimensionamento,
  nomeEstado: string,
  nomeEmpresa?: string
): string {
  const dataGeracao = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dimensionamento - ${dim.tipo_sistema}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: Arial, sans-serif;
      padding: 40px;
      color: #333;
      background: white;
    }

    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #f59e0b;
    }

    .header h1 {
      color: #f59e0b;
      font-size: 28px;
      margin-bottom: 10px;
    }

    .header p {
      color: #666;
      font-size: 14px;
    }

    .section {
      margin-bottom: 30px;
      page-break-inside: avoid;
    }

    .section-title {
      font-size: 18px;
      color: #f59e0b;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 2px solid #fef3c7;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin-bottom: 20px;
    }

    .info-item {
      padding: 12px;
      background: #f9fafb;
      border-left: 4px solid #f59e0b;
    }

    .info-label {
      font-size: 12px;
      color: #666;
      margin-bottom: 4px;
    }

    .info-value {
      font-size: 16px;
      font-weight: bold;
      color: #111;
    }

    .resultado-box {
      background: #fef3c7;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }

    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #666;
      font-size: 12px;
    }

    @media print {
      body {
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Relatório de Dimensionamento</h1>
    <p>${nomeEmpresa || 'Sistema de Gerenciamento Fotovoltaico'}</p>
    <p>Gerado em: ${dataGeracao}</p>
  </div>

  <div class="section">
    <h2 class="section-title">📊 Resumo do Sistema</h2>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Tipo de Sistema</div>
        <div class="info-value">${dim.tipo_sistema.toUpperCase()}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Tipo de Consumidor</div>
        <div class="info-value">${dim.tipo_consumidor.toUpperCase()}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Consumo Mensal</div>
        <div class="info-value">${dim.consumo_mensal} kWh</div>
      </div>
      <div class="info-item">
        <div class="info-label">Localização</div>
        <div class="info-value">${nomeEstado}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Irradiação Solar</div>
        <div class="info-value">${dim.irradiacao} HSP</div>
      </div>
      ${dim.autonomia_desejada ? `
      <div class="info-item">
        <div class="info-label">Autonomia Desejada</div>
        <div class="info-value">${dim.autonomia_desejada} horas</div>
      </div>
      ` : ''}
    </div>
  </div>

  ${dim.sistema_fv ? `
  <div class="section">
    <h2 class="section-title">⚡ Sistema Fotovoltaico</h2>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Potência do Sistema</div>
        <div class="info-value">${dim.sistema_fv.potencia} kWp</div>
      </div>
      <div class="info-item">
        <div class="info-label">Número de Módulos</div>
        <div class="info-value">${dim.sistema_fv.modulos} unidades</div>
      </div>
      <div class="info-item">
        <div class="info-label">Área Necessária</div>
        <div class="info-value">${dim.sistema_fv.area} m²</div>
      </div>
      <div class="info-item">
        <div class="info-label">Geração Diária</div>
        <div class="info-value">${dim.sistema_fv.geracaoDiaria.toFixed(1)} kWh/dia</div>
      </div>
    </div>
  </div>
  ` : ''}

  ${dim.sistema_baterias ? `
  <div class="section">
    <h2 class="section-title">🔋 Sistema de Baterias</h2>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Capacidade Útil</div>
        <div class="info-value">${dim.sistema_baterias.capacidadeUtil} kWh</div>
      </div>
      <div class="info-item">
        <div class="info-label">Capacidade Total</div>
        <div class="info-value">${dim.sistema_baterias.capacidadeTotal} kWh</div>
      </div>
      <div class="info-item">
        <div class="info-label">Número de Módulos</div>
        <div class="info-value">${dim.sistema_baterias.modulos} unidades</div>
      </div>
      <div class="info-item">
        <div class="info-label">Tensão do Sistema</div>
        <div class="info-value">${dim.sistema_baterias.tensao} V</div>
      </div>
      <div class="info-item">
        <div class="info-label">Corrente Máxima</div>
        <div class="info-value">${dim.sistema_baterias.correnteMaxima} A</div>
      </div>
      <div class="info-item">
        <div class="info-label">Autonomia Real</div>
        <div class="info-value">${dim.sistema_baterias.autonomiaReal.toFixed(1)} horas</div>
      </div>
    </div>
  </div>
  ` : ''}

  ${dim.sistema_inversor ? `
  <div class="section">
    <h2 class="section-title">🔌 Inversor</h2>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Potência Mínima</div>
        <div class="info-value">≥${dim.sistema_inversor.potenciaMinima} kW</div>
      </div>
      <div class="info-item">
        <div class="info-label">Tipo de Inversor</div>
        <div class="info-value">${dim.sistema_inversor.tipo}</div>
      </div>
      ${dim.sistema_inversor.entradaFV ? `
      <div class="info-item">
        <div class="info-label">Entrada FV</div>
        <div class="info-value">${dim.sistema_inversor.entradaFV} kWp</div>
      </div>
      ` : ''}
      ${dim.sistema_inversor.entradaBaterias ? `
      <div class="info-item">
        <div class="info-label">Entrada Baterias</div>
        <div class="info-value">${dim.sistema_inversor.entradaBaterias} V</div>
      </div>
      ` : ''}
    </div>
  </div>
  ` : ''}

  ${dim.economia_mensal && dim.economia_mensal > 0 ? `
  <div class="resultado-box">
    <h2 class="section-title">💰 Economia Estimada</h2>
    <p style="font-size: 24px; font-weight: bold; color: #047857; text-align: center;">
      ${dim.economia_mensal.toFixed(0)} kWh/mês
    </p>
    <p style="text-align: center; color: #666; margin-top: 10px;">
      ${dim.tipo_sistema === 'on-grid' ? 'Aproximadamente 85% do consumo mensal' :
        dim.tipo_sistema === 'off-grid' ? '100% do consumo suprido pelo sistema' :
        'Redução significativa na conta de energia'}
    </p>
  </div>
  ` : ''}

  ${dim.cargas && dim.cargas.length > 0 ? `
  <div class="section">
    <h2 class="section-title">💡 Cargas Elétricas</h2>
    <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
      <thead>
        <tr style="background: #f9fafb; border-bottom: 2px solid #f59e0b;">
          <th style="padding: 10px; text-align: left;">Aparelho</th>
          <th style="padding: 10px; text-align: center;">Potência (W)</th>
          <th style="padding: 10px; text-align: center;">Qtd</th>
          <th style="padding: 10px; text-align: center;">Horas/dia</th>
          <th style="padding: 10px; text-align: right;">Consumo (kWh/dia)</th>
        </tr>
      </thead>
      <tbody>
        ${dim.cargas.map(carga => `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 10px;">${carga.nome}</td>
          <td style="padding: 10px; text-align: center;">${carga.potencia}</td>
          <td style="padding: 10px; text-align: center;">${carga.quantidade}</td>
          <td style="padding: 10px; text-align: center;">${carga.horasDia}</td>
          <td style="padding: 10px; text-align: right; font-weight: bold;">${carga.consumoDiario.toFixed(2)}</td>
        </tr>
        `).join('')}
      </tbody>
      <tfoot>
        <tr style="background: #fef3c7; font-weight: bold;">
          <td colspan="4" style="padding: 10px; text-align: right;">Total:</td>
          <td style="padding: 10px; text-align: right;">
            ${dim.cargas.reduce((total, c) => total + c.consumoDiario, 0).toFixed(2)} kWh/dia
          </td>
        </tr>
      </tfoot>
    </table>
  </div>
  ` : ''}

  <div class="footer">
    <p><strong>Observações Importantes:</strong></p>
    <p>Este dimensionamento é uma estimativa baseada nos dados fornecidos. Recomenda-se sempre consultar um profissional qualificado para validação final e projeto executivo.</p>
    <p>Os valores de geração podem variar conforme condições climáticas, sombreamento e orientação dos módulos.</p>
  </div>
</body>
</html>
  `;
}

// =====================================================
// DOWNLOAD DE PDF
// =====================================================

export function downloadPDF(blob: Blob, nomeArquivo: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// =====================================================
// GERAÇÃO E DOWNLOAD (Função Completa)
// =====================================================

export async function gerarEBaixarPDF(
  dimensionamento: Dimensionamento,
  nomeEstado: string,
  nomeEmpresa?: string
): Promise<boolean> {
  try {
    const blob = await gerarPDFDimensionamento(dimensionamento, nomeEstado, nomeEmpresa);

    if (!blob) {
      throw new Error('Falha ao gerar PDF');
    }

    const nomeArquivo = `dimensionamento-${dimensionamento.tipo_sistema}-${new Date().getTime()}.html`;
    downloadPDF(blob, nomeArquivo);

    return true;
  } catch (error) {
    console.error('[gerarEBaixarPDF] Erro:', error);
    return false;
  }
}
