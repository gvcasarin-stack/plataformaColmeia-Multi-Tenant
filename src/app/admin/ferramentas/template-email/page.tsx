"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Send } from 'lucide-react';

export default function TemplateEmailPage() {
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('Teste de Template de Email');
  const [htmlContent, setHtmlContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  
  const defaultTemplate = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background-color: #10b981; padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0;">Colmeia Solar</h1>
  </div>
  <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
    <h2 style="color: #10b981;">Email com Template Personalizado</h2>
    <p>Este é um email personalizado enviado através da API.</p>
    <p>Você pode editar este template conforme necessário para testar diferentes layouts.</p>
    <div style="background-color: #f3f4f6; padding: 12px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 0; color: #4b5563;">Este é um exemplo de como você pode estilizar elementos dentro do email.</p>
    </div>
    <p style="color: #6b7280; font-size: 0.8rem; margin-top: 30px; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 20px;">
      Este é um email automático, por favor não responda.<br>
      &copy; ${new Date().getFullYear()} Colmeia Solar. Todos os direitos reservados.
    </p>
  </div>
</div>
  `;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      // Usando o novo endpoint RESTful
      const response = await fetch('/api/emails/send-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          subject,
          htmlContent: htmlContent || undefined
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: data.message || 'E-mail enviado com sucesso!',
        });
      } else {
        setResult({
          success: false,
          message: data.error || 'Falha ao enviar e-mail.',
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Erro ao processar requisição.',
      });
    } finally {
      setLoading(false);
    }
  }

  const handleUseDefaultTemplate = () => {
    setHtmlContent(defaultTemplate);
  };

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <Card className="w-full">
        <CardHeader className="bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-t-lg">
          <CardTitle className="text-2xl">Teste de Templates de E-mail</CardTitle>
          <CardDescription className="text-blue-100">
            Envie um e-mail com HTML personalizado para testar templates
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">
                E-mail de destino
              </label>
              <Input
                id="email"
                type="email"
                placeholder="Digite o e-mail para teste"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="subject" className="text-sm font-medium text-gray-700">
                Assunto
              </label>
              <Input
                id="subject"
                type="text"
                placeholder="Assunto do email"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label htmlFor="htmlContent" className="text-sm font-medium text-gray-700">
                  Conteúdo HTML (opcional)
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleUseDefaultTemplate}
                  className="text-xs"
                >
                  Usar template padrão
                </Button>
              </div>
              <Textarea
                id="htmlContent"
                placeholder="<div>Seu HTML aqui</div>"
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                className="w-full h-60 font-mono text-sm"
              />
              <p className="text-xs text-gray-500">
                Deixe em branco para usar o template padrão do sistema.
              </p>
            </div>

            {result && (
              <Alert
                className={`mt-4 ${
                  result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}
              >
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                )}
                <AlertTitle className={result.success ? 'text-green-800' : 'text-red-800'}>
                  {result.success ? 'Sucesso!' : 'Erro!'}
                </AlertTitle>
                <AlertDescription className={result.success ? 'text-green-700' : 'text-red-700'}>
                  {result.message}
                </AlertDescription>
              </Alert>
            )}

            <CardFooter className="px-0 pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                {loading ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-opacity-20 border-t-white"></div>
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar E-mail com Template
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </CardContent>
      </Card>
      
      <div className="mt-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium mb-2">Como funciona:</h3>
        <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
          <li>Esta página envia uma requisição POST para a API <code>/api/emails/send-template</code>.</li>
          <li>Você pode inserir seu próprio HTML ou usar o template padrão.</li>
          <li>O HTML será enviado como corpo do email e será renderizado pelos clientes de email.</li>
          <li>Lembre-se que nem todos os estilos CSS são suportados por todos os clientes de email.</li>
        </ul>
      </div>
    </div>
  );
} 