/**
 * API: /api/debug/templates
 * 
 * Endpoint para visualização de templates de email utilizados pelo sistema.
 * Este endpoint é apenas para debug e desenvolvimento.
 * 
 * @author Equipe de Desenvolvimento Colmeia
 * @date 22/05/2025
 */

import { devLog } from "@/lib/utils/productionLogger";
import { 
  ApiErrorCode 
} from '@/lib/utils/apiErrorHandler';

/**
 * Cria uma resposta HTML para o cliente
 */
function createHtmlResponse(html: string): Response {
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}

/**
 * Endpoint GET para visualização de templates de email
 */
export async function GET(request: Request) {
  try {
    // Templates HTML para visualização
    const emailTemplates = {
      statusChange: (projectName: string, oldStatus: string, newStatus: string, projectUrl: string) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #10b981; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Colmeia Solar</h1>
          </div>
          <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
            <h2 style="color: #10b981;">Atualização de Status do Projeto</h2>
            <p>O status do projeto <strong>${projectName}</strong> foi alterado.</p>
            <p>Status anterior: <span style="color: #6b7280;">${oldStatus}</span></p>
            <p>Novo status: <span style="color: #10b981; font-weight: bold;">${newStatus}</span></p>
            <div style="margin: 30px 0; text-align: center;">
              <a href="${projectUrl}" style="background-color: #10b981; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Ver Projeto</a>
            </div>
            <p style="color: #6b7280; font-size: 0.8rem; margin-top: 30px; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 20px;">
              Este é um e-mail automático, por favor não responda.<br>
              &copy; ${new Date().getFullYear()} Colmeia Solar. Todos os direitos reservados.
            </p>
          </div>
        </div>
      `,
      
      documentAdded: (projectName: string, documentName: string, projectUrl: string) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #10b981; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Colmeia Solar</h1>
          </div>
          <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
            <h2 style="color: #10b981;">Novo Documento Adicionado</h2>
            <p>Um novo documento foi adicionado ao projeto <strong>${projectName}</strong>.</p>
            <p>Documento: <strong>${documentName}</strong></p>
            <div style="margin: 30px 0; text-align: center;">
              <a href="${projectUrl}" style="background-color: #10b981; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Ver Documento</a>
            </div>
            <p style="color: #6b7280; font-size: 0.8rem; margin-top: 30px; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 20px;">
              Este é um e-mail automático, por favor não responda.<br>
              &copy; ${new Date().getFullYear()} Colmeia Solar. Todos os direitos reservados.
            </p>
          </div>
        </div>
      `,
      
      commentAdded: (projectName: string, commentBy: string, commentPreview: string, projectUrl: string) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #10b981; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Colmeia Solar</h1>
          </div>
          <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
            <h2 style="color: #10b981;">Novo Comentário</h2>
            <p><strong>${commentBy}</strong> adicionou um comentário ao projeto <strong>${projectName}</strong>.</p>
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 4px; margin: 15px 0;">
              <p style="margin: 0; color: #4b5563;">"${commentPreview}"</p>
            </div>
            <div style="margin: 30px 0; text-align: center;">
              <a href="${projectUrl}" style="background-color: #10b981; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Ver Comentário</a>
            </div>
            <p style="color: #6b7280; font-size: 0.8rem; margin-top: 30px; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 20px;">
              Este é um e-mail automático, por favor não responda.<br>
              &copy; ${new Date().getFullYear()} Colmeia Solar. Todos os direitos reservados.
            </p>
          </div>
        </div>
      `,
    };

    // Criar exemplos de templates preenchidos
    const templateExamples = {
      statusChange: emailTemplates.statusChange(
        'Instalação Residencial',
        'Em Desenvolvimento',
        'Homologação',
        'https://app.colmeiasolar.com/cliente/projetos/123'
      ),
      documentAdded: emailTemplates.documentAdded(
        'Instalação Residencial',
        'Projeto-Técnico-Final.pdf',
        'https://app.colmeiasolar.com/cliente/projetos/123/documentos'
      ),
      commentAdded: emailTemplates.commentAdded(
        'Instalação Residencial',
        'João da Silva',
        'Precisamos realizar algumas alterações no projeto conforme solicitado pela distribuidora. Por favor, verifique os detalhes anexados e me avise se tiver alguma dúvida.',
        'https://app.colmeiasolar.com/cliente/projetos/123/comentarios'
      ),
    };

    // Criar índice HTML para navegar entre os templates
    const indexHtml = `
      <html>
        <head>
          <title>Templates de E-mail - Colmeia Solar</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              background-color: #f5f5f5;
            }
            .container {
              max-width: 800px;
              margin: 0 auto;
              background-color: white;
              padding: 20px;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h1 {
              color: #10b981;
              border-bottom: 2px solid #10b981;
              padding-bottom: 10px;
            }
            h2 {
              color: #333;
              margin-top: 30px;
            }
            .button {
              display: inline-block;
              background-color: #10b981;
              color: white;
              padding: 10px 15px;
              text-decoration: none;
              border-radius: 4px;
              margin-right: 10px;
              margin-bottom: 10px;
            }
            .button:hover {
              background-color: #0d946a;
            }
            .description {
              margin-bottom: 15px;
              color: #666;
            }
            .api-info {
              margin-top: 50px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              font-size: 0.9rem;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Templates de E-mail - Colmeia Solar</h1>
            <p>Esta página permite visualizar os templates de e-mail utilizados no sistema de notificações.</p>
            
            <h2>Templates Disponíveis</h2>
            
            <div>
              <div class="description">Template para notificação de mudança de status:</div>
              <a href="/api/debug/templates?template=statusChange" class="button" target="_blank">Ver Template de Status</a>
            </div>
            
            <div>
              <div class="description">Template para notificação de adição de documento:</div>
              <a href="/api/debug/templates?template=documentAdded" class="button" target="_blank">Ver Template de Documento</a>
            </div>
            
            <div>
              <div class="description">Template para notificação de comentário:</div>
              <a href="/api/debug/templates?template=commentAdded" class="button" target="_blank">Ver Template de Comentário</a>
            </div>
            
            <div class="api-info">
              <p><strong>Endpoint API:</strong> /api/debug/templates</p>
              <p><strong>Parâmetros:</strong> template (statusChange, documentAdded, commentAdded)</p>
              <p><strong>Exemplo:</strong> /api/debug/templates?template=statusChange</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Verificar se um template específico foi solicitado
    const { searchParams } = new URL(request.url);
    const templateType = searchParams.get('template');

    if (templateType) {
      // Verificar se o template solicitado existe
      if (templateExamples[templateType]) {
        // Retornar o template HTML específico
        return createHtmlResponse(templateExamples[templateType]);
      } else {
        // Template solicitado não existe
        const errorHtml = `
          <html>
            <head>
              <title>Erro - Template não encontrado</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
                .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                h1 { color: #dc2626; }
                .error-code { color: #888; font-size: 0.9rem; margin-top: 20px; }
                .back-link { display: inline-block; margin-top: 20px; color: #10b981; text-decoration: none; }
                .back-link:hover { text-decoration: underline; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>Template não encontrado</h1>
                <p>O template de email solicitado '${templateType}' não existe.</p>
                <p>Templates disponíveis: statusChange, documentAdded, commentAdded</p>
                <div class="error-code">Código de erro: ${ApiErrorCode.NOT_FOUND}</div>
                <a href="/api/debug/templates" class="back-link">Voltar para a página inicial</a>
              </div>
            </body>
          </html>
        `;
        return createHtmlResponse(errorHtml);
      }
    }

    // Retornar o índice por padrão
    return createHtmlResponse(indexHtml);
  } catch (error) {
    devLog.error('[DEBUG/TEMPLATES] Erro ao processar solicitação:', error);
    
    // Retornar uma página de erro HTML
    const errorHtml = `
      <html>
        <head>
          <title>Erro no servidor</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #dc2626; }
            .error-code { color: #888; font-size: 0.9rem; margin-top: 20px; }
            .back-link { display: inline-block; margin-top: 20px; color: #10b981; text-decoration: none; }
            .back-link:hover { text-decoration: underline; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Erro ao processar a solicitação</h1>
            <p>Ocorreu um erro ao tentar processar sua solicitação. Por favor, tente novamente mais tarde.</p>
            <div class="error-code">Código de erro: ${ApiErrorCode.INTERNAL_SERVER_ERROR}</div>
            <a href="/api/debug/templates" class="back-link">Voltar para a página inicial</a>
          </div>
        </body>
      </html>
    `;
    return createHtmlResponse(errorHtml);
  }
} 