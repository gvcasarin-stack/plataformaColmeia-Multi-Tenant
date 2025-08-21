const markdownpdf = require('markdown-pdf');
const fs = require('fs');
const path = require('path');

// Caminho para o arquivo Markdown de entrada
const markdownFilePath = path.join(__dirname, 'docs', 'guia-detalhado-cadastro-colmeia.md');

// Caminho para o arquivo PDF de saída
const pdfFilePath = path.join(__dirname, 'Guia_Completo_Cadastro_Plataforma_Colmeia.pdf');

// Configurações para o PDF
const options = {
  cssPath: path.join(__dirname, 'pdf-detailed-style.css'),
  paperFormat: 'A4',
  paperOrientation: 'portrait',
  paperBorder: '1cm',
  runningsPath: path.join(__dirname, 'pdf-detailed-header-footer.js'),
  remarkable: {
    html: true,
    breaks: true,
    plugins: ['markdown-pdf-main/remarkable_plugins'],
    syntax: ['footnote', 'sup', 'sub']
  }
};

// Criar o CSS para estilizar o PDF
const cssContent = `
body {
  font-family: 'Segoe UI', Arial, sans-serif;
  font-size: 11pt;
  line-height: 1.5;
  color: #333;
  margin: 0;
  padding: 0;
}

h1, h2, h3, h4 {
  color: #10b981;
  margin-top: 1.5em;
  margin-bottom: 0.5em;
}

h1 {
  font-size: 22pt;
  text-align: center;
  border-bottom: 2px solid #10b981;
  padding-bottom: 10px;
  margin-bottom: 1.5em;
}

h2 {
  font-size: 16pt;
  border-bottom: 1px solid #ddd;
  padding-bottom: 5px;
  margin-top: 2em;
}

h3 {
  font-size: 14pt;
  margin-top: 1.5em;
}

h4 {
  font-size: 12pt;
  margin-top: 1.2em;
}

a {
  color: #10b981;
  text-decoration: none;
}

blockquote {
  border-left: 4px solid #10b981;
  padding-left: 15px;
  margin-left: 0;
  color: #666;
}

code {
  background-color: #f5f5f5;
  padding: 2px 5px;
  border-radius: 3px;
  font-family: monospace;
}

pre {
  background-color: #f5f5f5;
  padding: 15px;
  border-radius: 5px;
  overflow-x: auto;
}

table {
  border-collapse: collapse;
  width: 100%;
  margin: 20px 0;
}

th, td {
  border: 1px solid #ddd;
  padding: 8px 12px;
  text-align: left;
}

th {
  background-color: #f0f0f0;
}

hr {
  border: none;
  height: 1px;
  background-color: #ddd;
  margin: 30px 0;
}

img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 1.5em auto;
  border-radius: 5px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.page-break {
  page-break-after: always;
}

ul, ol {
  padding-left: 20px;
  margin-bottom: 1.5em;
}

li {
  margin-bottom: 0.5em;
}

strong {
  font-weight: 600;
  color: #555;
}

/* Estilos para o sumário */
.toc {
  background-color: #f9f9f9;
  padding: 15px;
  border-radius: 5px;
  margin: 20px 0;
}

.toc a {
  text-decoration: none;
  color: #10b981;
}

/* Estilos para boxes especiais */
.info-box, .warning-box, .tip-box {
  padding: 15px;
  margin: 20px 0;
  border-radius: 5px;
  position: relative;
}

.info-box {
  background-color: #e8f4f8;
  border-left: 4px solid #2196F3;
}

.warning-box {
  background-color: #fff8e1;
  border-left: 4px solid #ffc107;
}

.tip-box {
  background-color: #e8f5e9;
  border-left: 4px solid #4caf50;
}

/* Estilo para o rodapé */
.footer {
  text-align: center;
  font-size: 9pt;
  color: #777;
  margin-top: 40px;
}

/* Estilos para as etapas numeradas */
.step {
  counter-increment: step-counter;
  position: relative;
  margin-left: 30px;
  margin-bottom: 1.5em;
}

.step:before {
  content: counter(step-counter);
  position: absolute;
  left: -30px;
  top: -3px;
  width: 25px;
  height: 25px;
  background-color: #10b981;
  color: white;
  border-radius: 50%;
  text-align: center;
  line-height: 25px;
  font-weight: bold;
}

/* Melhorias para elementos específicos */
p {
  margin-bottom: 1em;
}

/* Destacar nomes de campos e botões */
.field-name, .button-name {
  background-color: #f0f8ff;
  padding: 2px 5px;
  border-radius: 3px;
  font-family: monospace;
  font-weight: 500;
}

.button-name {
  background-color: #f0fff0;
}

/* Dicas e notas */
.note {
  background-color: #fffde7;
  padding: 10px;
  border-left: 3px solid #ffd600;
  margin: 15px 0;
  font-size: 0.9em;
}
`;

// Criar o arquivo CSS
fs.writeFileSync(path.join(__dirname, 'pdf-detailed-style.css'), cssContent);

// Criar o script de cabeçalho e rodapé
const headerFooterContent = `
// Este script adiciona cabeçalho e rodapé às páginas do PDF
module.exports = {
  header: {
    height: '2cm',
    contents: function(pageNum, numPages) {
      if (pageNum === 1) return '';
      return '<div style="text-align: center; font-size: 10pt; color: #777; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px;"><img src="data:image/png;base64,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" style="height: 15px; vertical-align: middle; margin-right: 5px;">Guia Completo da Plataforma Colmeia Solar</div>';
    }
  },
  footer: {
    height: '1.5cm',
    contents: function(pageNum, numPages) {
      return '<div style="text-align: center; font-size: 10pt; color: #777; border-top: 1px solid #ddd; padding-top: 5px; margin-top: 5px;"><span>Página ' + pageNum + ' de ' + numPages + '</span><br><span style="font-size: 8pt;">© 2024 Colmeia Solar. Todos os direitos reservados.</span></div>';
    }
  }
}
`;

// Criar o arquivo de cabeçalho e rodapé
fs.writeFileSync(path.join(__dirname, 'pdf-detailed-header-footer.js'), headerFooterContent);

// Converter Markdown para PDF
devLog.log('Convertendo Markdown para PDF (versão detalhada)...');
markdownpdf(options)
  .from(markdownFilePath)
  .to(pdfFilePath, function() {
    devLog.log('PDF detalhado gerado com sucesso:', pdfFilePath);
    
    // Limpar arquivos temporários
    try {
      fs.unlinkSync(path.join(__dirname, 'pdf-detailed-style.css'));
      fs.unlinkSync(path.join(__dirname, 'pdf-detailed-header-footer.js'));
      devLog.log('Arquivos temporários removidos.');
    } catch (err) {
      devLog.error('Erro ao remover arquivos temporários:', err);
    }
  });
