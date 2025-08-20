
const markdownpdf = require('markdown-pdf');
const fs = require('fs');
const path = require('path');

// Caminho para o arquivo Markdown de entrada
const markdownFilePath = path.join(__dirname, 'docs', 'guia-cadastro-colmeia.md');

// Caminho para o arquivo PDF de saída
const pdfFilePath = path.join(__dirname, 'Guia_Cadastro_Plataforma_Colmeia.pdf');

// Configurações para o PDF
const options = {
  cssPath: path.join(__dirname, 'pdf-style.css'),
  paperFormat: 'A4',
  paperOrientation: 'portrait',
  paperBorder: '1cm',
  runningsPath: path.join(__dirname, 'pdf-header-footer.js'),
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
  font-size: 12pt;
  line-height: 1.6;
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
  font-size: 24pt;
  text-align: center;
  border-bottom: 2px solid #10b981;
  padding-bottom: 10px;
}

h2 {
  font-size: 18pt;
  border-bottom: 1px solid #ddd;
  padding-bottom: 5px;
}

h3 {
  font-size: 14pt;
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
}

.page-break {
  page-break-after: always;
}

ul, ol {
  padding-left: 20px;
}

strong {
  font-weight: 600;
}

/* Sumário com links clicáveis */
.toc a {
  text-decoration: none;
  color: #10b981;
}

/* Estilos para os problemas e soluções */
.problem, .solution {
  padding: 10px;
  margin: 10px 0;
  border-radius: 5px;
}

.problem {
  background-color: #fff0f0;
}

.solution {
  background-color: #f0fff0;
}

/* Estilo para o rodapé */
.footer {
  text-align: center;
  font-size: 10pt;
  color: #777;
  margin-top: 40px;
}
`;

// Criar o arquivo CSS
fs.writeFileSync(path.join(__dirname, 'pdf-style.css'), cssContent);

// Criar o script de cabeçalho e rodapé
const headerFooterContent = `
// Este script adiciona cabeçalho e rodapé às páginas do PDF
module.exports = {
  header: {
    height: '1cm',
    contents: function(pageNum, numPages) {
      if (pageNum === 1) return '';
      return '<div style="text-align: center; font-size: 10pt; color: #777;">Plataforma Colmeia Solar - Guia de Cadastro</div>';
    }
  },
  footer: {
    height: '1cm',
    contents: function(pageNum, numPages) {
      return '<div style="text-align: center; font-size: 10pt; color: #777;">Página ' + pageNum + ' de ' + numPages + '</div>';
    }
  }
}
`;

// Criar o arquivo de cabeçalho e rodapé
fs.writeFileSync(path.join(__dirname, 'pdf-header-footer.js'), headerFooterContent);

// Converter Markdown para PDF
devLog.log('Convertendo Markdown para PDF...');
markdownpdf(options)
  .from(markdownFilePath)
  .to(pdfFilePath, function() {
    devLog.log('PDF gerado com sucesso:', pdfFilePath);
    
    // Limpar arquivos temporários
    try {
      fs.unlinkSync(path.join(__dirname, 'pdf-style.css'));
      fs.unlinkSync(path.join(__dirname, 'pdf-header-footer.js'));
      devLog.log('Arquivos temporários removidos.');
    } catch (err) {
      devLog.error('Erro ao remover arquivos temporários:', err);
    }
  }); 