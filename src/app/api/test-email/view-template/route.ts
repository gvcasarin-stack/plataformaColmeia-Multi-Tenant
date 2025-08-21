export async function GET() {
  const templateHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Preview - Template de E-mail</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .preview-container {
          max-width: 800px;
          margin: 0 auto;
          background-color: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .email-container {
          border: 1px solid #ddd;
          padding: 20px;
          margin-top: 20px;
          border-radius: 4px;
        }
        h1 {
          color: #10b981;
          border-bottom: 2px solid #10b981;
          padding-bottom: 10px;
        }
      </style>
    </head>
    <body>
      <div class="preview-container">
        <h1>Visualização do Template de E-mail</h1>
        <p>Esta é uma prévia do template de e-mail usado para notificações.</p>
        
        <div class="email-container">
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #10b981; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">Colmeia Solar</h1>
            </div>
            <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
              <h2 style="color: #10b981;">E-mail de Teste</h2>
              <p>Este é um e-mail de teste para confirmar que o sistema de notificações está funcionando corretamente.</p>
              <p>Data e hora do teste: ${new Date().toLocaleString('pt-BR')}</p>
              <div style="margin: 30px 0; text-align: center;">
                <a href="#" style="background-color: #10b981; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Botão de Exemplo</a>
              </div>
              <p style="color: #6b7280; font-size: 0.8rem; margin-top: 30px; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                Este é um e-mail automático, por favor não responda.<br>
                &copy; ${new Date().getFullYear()} Colmeia Solar. Todos os direitos reservados.
              </p>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return new Response(templateHTML, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
