/**
 * ⚠️ IMPORTANTE - NÃO MESCLAR COM pdfGenerator.ts
 *
 * @file pdfGeneratorDimensionamento.ts
 * @description Utilitário EXCLUSIVO para gerar PDFs de DIMENSIONAMENTO
 *
 * pdfGenerator.ts = FATURAS (invoices)
 * pdfGeneratorDimensionamento.ts = DIMENSIONAMENTO (este arquivo)
 */

import { Dimensionamento } from '@/types/dimensionamento';

// =====================================================
// GERAÇÃO DE CONTEÚDO HTML
// =====================================================

function gerarConteudoHTML(
  dim: Dimensionamento,
  nomeEstado: string,
  nomeEmpresa?: string,
  fatorDesempenho?: number
): string {
  const dataGeracao = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const pr = fatorDesempenho ?? dim.fator_desempenho ?? 0.85;
  const prPercent = Math.round(pr * 100);

  const labelLigacao: Record<string, string> = {
    'monofasica-127': 'Monofásica 127V (127/220V)',
    'monofasica-220': 'Monofásica 220V (220/380V)',
    'bifasica-127':   'Bifásica (127V/220V)',
    'bifasica':       'Bifásica (220V/380V)',
    'trifasica-127':  'Trifásica (127V/220V)',
    'trifasica':      'Trifásica (220V/380V)',
  };

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Dimensionamento - ${dim.tipo_sistema?.toUpperCase()}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 32px; color: #333; background: white; font-size: 13px; }
    .header { text-align: center; margin-bottom: 28px; padding-bottom: 16px; border-bottom: 3px solid #f59e0b; }
    .header h1 { color: #d97706; font-size: 22px; margin-bottom: 6px; }
    .header p { color: #666; font-size: 12px; }
    .section { margin-bottom: 22px; page-break-inside: avoid; }
    .section-title { font-size: 14px; font-weight: bold; color: #d97706; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 2px solid #fef3c7; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
    .info-item { padding: 10px 12px; background: #f9fafb; border-left: 3px solid #f59e0b; }
    .info-label { font-size: 10px; color: #888; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.4px; }
    .info-value { font-size: 14px; font-weight: bold; color: #111; }
    .highlight-box { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 16px; text-align: center; margin: 12px 0; }
    .highlight-box .big { font-size: 28px; font-weight: bold; color: #047857; }
    .highlight-box .sub { font-size: 12px; color: #666; margin-top: 4px; }
    .pr-bar { background: #e5e7eb; border-radius: 4px; height: 8px; margin: 6px 0; overflow: hidden; }
    .pr-fill { background: #f59e0b; height: 100%; border-radius: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
    th { background: #f9fafb; border-bottom: 2px solid #f59e0b; padding: 8px 10px; text-align: left; }
    td { padding: 7px 10px; border-bottom: 1px solid #e5e7eb; }
    tfoot td { background: #fef3c7; font-weight: bold; }
    .footer { margin-top: 30px; padding-top: 14px; border-top: 1px solid #e5e7eb; color: #888; font-size: 10px; text-align: center; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>Relatório de Dimensionamento Fotovoltaico</h1>
    <p>${nomeEmpresa || 'Sistema de Gerenciamento Fotovoltaico'}</p>
    <p>Gerado em: ${dataGeracao}</p>
  </div>

  <!-- Resumo -->
  <div class="section">
    <div class="section-title">📊 Resumo do Sistema</div>
    <div class="grid-3">
      <div class="info-item">
        <div class="info-label">Tipo de Sistema</div>
        <div class="info-value">${(dim.tipo_sistema || '').toUpperCase()}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Tipo de Consumidor</div>
        <div class="info-value">${(dim.tipo_consumidor || '').toUpperCase()}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Tipo de Ligação</div>
        <div class="info-value">${dim.tipo_ligacao ? (labelLigacao[dim.tipo_ligacao] || dim.tipo_ligacao) : '—'}</div>
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
      </div>` : ''}
      <div class="info-item">
        <div class="info-label">Potência do Módulo</div>
        <div class="info-value">${dim.potencia_modulo || 550} W</div>
      </div>
    </div>
  </div>

  <!-- Fator de Desempenho -->
  <div class="section">
    <div class="section-title">⚙️ Fator de Desempenho (PR)</div>
    <div class="info-item" style="padding: 12px 14px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
        <span style="font-size: 12px; color: #555;">Performance Ratio considerado</span>
        <span style="font-weight: bold; color: #d97706; font-size: 14px;">${prPercent}%</span>
      </div>
      <div class="pr-bar"><div class="pr-fill" style="width: ${prPercent}%;"></div></div>
      <p style="font-size: 10px; color: #888; margin-top: 5px;">
        Considera perdas por temperatura, sombreamento, cabeamento e eficiência do inversor.
        Valor típico: 75%–90%.
      </p>
    </div>
  </div>

  <!-- Sistema FV -->
  ${dim.sistema_fv ? `
  <div class="section">
    <div class="section-title">⚡ Sistema Fotovoltaico</div>
    <div class="grid-2">
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
      ${dim.sistema_fv.geracaoMensal ? `
      <div class="info-item" style="grid-column: span 2;">
        <div class="info-label">Geração Mensal Estimada</div>
        <div class="info-value" style="color: #047857;">${dim.sistema_fv.geracaoMensal.toFixed(0)} kWh/mês</div>
      </div>` : ''}
    </div>
  </div>` : ''}

  <!-- Baterias -->
  ${dim.sistema_baterias ? `
  <div class="section">
    <div class="section-title">🔋 Sistema de Baterias</div>
    <div class="grid-3">
      <div class="info-item">
        <div class="info-label">Capacidade Útil</div>
        <div class="info-value">${dim.sistema_baterias.capacidadeUtil} kWh</div>
      </div>
      <div class="info-item">
        <div class="info-label">Capacidade Total</div>
        <div class="info-value">${dim.sistema_baterias.capacidadeTotal} kWh</div>
      </div>
      <div class="info-item">
        <div class="info-label">Módulos de Bateria</div>
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
  </div>` : ''}

  <!-- Inversor -->
  ${dim.sistema_inversor ? `
  <div class="section">
    <div class="section-title">🔌 Inversor Recomendado</div>
    <div class="grid-2">
      <div class="info-item">
        <div class="info-label">Potência Mínima</div>
        <div class="info-value">≥ ${dim.sistema_inversor.potenciaMinima} kW</div>
      </div>
      <div class="info-item">
        <div class="info-label">Tipo</div>
        <div class="info-value">${dim.sistema_inversor.tipo}</div>
      </div>
      ${dim.sistema_inversor.entradaFV ? `
      <div class="info-item">
        <div class="info-label">Entrada FV</div>
        <div class="info-value">${dim.sistema_inversor.entradaFV} kWp</div>
      </div>` : ''}
      ${dim.sistema_inversor.entradaBaterias ? `
      <div class="info-item">
        <div class="info-label">Entrada Baterias</div>
        <div class="info-value">${dim.sistema_inversor.entradaBaterias} V</div>
      </div>` : ''}
    </div>
  </div>` : ''}

  <!-- Economia -->
  ${dim.economia_mensal && dim.economia_mensal > 0 ? `
  <div class="highlight-box">
    <div style="font-size: 12px; color: #555; margin-bottom: 4px;">💰 Economia / Geração Estimada</div>
    <div class="big">${dim.economia_mensal.toFixed(0)} kWh/mês</div>
    <div class="sub">
      ${dim.tipo_sistema === 'on-grid' ? 'Aproximadamente 85% do consumo mensal injetado/compensado' :
        dim.tipo_sistema === 'off-grid' ? '100% do consumo suprido pelo sistema isolado' :
        'Redução significativa na conta de energia'}
    </div>
  </div>` : ''}

  <!-- Cargas -->
  ${dim.cargas && dim.cargas.length > 0 ? `
  <div class="section">
    <div class="section-title">💡 Levantamento de Cargas Elétricas</div>
    <table>
      <thead>
        <tr>
          <th>Aparelho</th>
          <th style="text-align:center;">Potência (W)</th>
          <th style="text-align:center;">Qtd</th>
          <th style="text-align:center;">Horas/dia</th>
          <th style="text-align:right;">Consumo (kWh/dia)</th>
        </tr>
      </thead>
      <tbody>
        ${dim.cargas.map(c => `
        <tr>
          <td>${c.nome || '—'}</td>
          <td style="text-align:center;">${c.potencia}</td>
          <td style="text-align:center;">${c.quantidade}</td>
          <td style="text-align:center;">${c.horasDia}</td>
          <td style="text-align:right; font-weight:bold;">${c.consumoDiario.toFixed(2)}</td>
        </tr>`).join('')}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="4" style="text-align:right;">Total:</td>
          <td style="text-align:right;">${dim.cargas.reduce((t, c) => t + c.consumoDiario, 0).toFixed(2)} kWh/dia</td>
        </tr>
      </tfoot>
    </table>
  </div>` : ''}

  <div class="footer">
    <p><strong>Observações:</strong> Este dimensionamento é uma estimativa baseada nos dados fornecidos. Recomenda-se a validação por profissional qualificado.</p>
    <p>Os valores de geração podem variar conforme condições climáticas, sombreamento e orientação dos módulos.</p>
  </div>
</body>
</html>`;
}

// =====================================================
// DOWNLOAD (mantido para retrocompatibilidade interna)
// =====================================================

function downloadBlob(blob: Blob, nomeArquivo: string) {
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
// GERAÇÃO E DOWNLOAD — usa html2pdf para PDF real
// =====================================================

export async function gerarEBaixarPDF(
  dimensionamento: Dimensionamento,
  nomeEstado: string,
  nomeEmpresa?: string,
  fatorDesempenho?: number
): Promise<boolean> {
  try {
    const html = gerarConteudoHTML(dimensionamento, nomeEstado, nomeEmpresa, fatorDesempenho);

    // Tentar gerar PDF real com html2pdf
    try {
      const html2pdf = (await import('html2pdf.js')).default;

      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '210mm';
      container.innerHTML = html;
      document.body.appendChild(container);

      const nomeArquivo = `dimensionamento-${dimensionamento.tipo_sistema}-${Date.now()}.pdf`;

      await html2pdf().set({
        margin: [8, 10, 8, 10],
        filename: nomeArquivo,
        image: { type: 'jpeg', quality: 0.97 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      }).from(container).save();

      document.body.removeChild(container);
      return true;

    } catch {
      // Fallback: baixar como HTML formatado
      const blob = new Blob([html], { type: 'text/html' });
      const nomeArquivo = `dimensionamento-${dimensionamento.tipo_sistema}-${Date.now()}.html`;
      downloadBlob(blob, nomeArquivo);
      return true;
    }

  } catch (error) {
    console.error('[gerarEBaixarPDF] Erro:', error);
    return false;
  }
}
