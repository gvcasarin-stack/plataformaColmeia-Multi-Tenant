"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Send } from 'lucide-react';

export default function TestEmailPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      // Usando o novo endpoint RESTful
      const response = await fetch('/api/emails/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
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

  return (
    <div className="container mx-auto p-4 max-w-lg mt-10">
      <Card className="w-full">
        <CardHeader className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-t-lg">
          <CardTitle className="text-2xl">Teste de E-mail</CardTitle>
          <CardDescription className="text-teal-100">
            Envie um e-mail de teste para verificar a integração com Amazon SES
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
                className="w-full bg-teal-600 hover:bg-teal-700"
              >
                {loading ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-opacity-20 border-t-white"></div>
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar E-mail de Teste
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
          <li>Esta página envia uma requisição POST para a API <code>/api/emails/send</code>.</li>
          <li>A API verifica se o e-mail é válido e faz chamada para o Amazon SES.</li>
          <li>O e-mail enviado contém um template de teste semelhante aos usados nas notificações reais.</li>
          <li>Após receber o e-mail, verifique seu design responsivo em diferentes dispositivos e clientes.</li>
        </ul>
      </div>
    </div>
  );
}
