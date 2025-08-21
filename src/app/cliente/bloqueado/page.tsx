"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertCircle, Mail, Phone, LogOut, ChevronLeft } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { format } from 'date-fns/format';
import { ptBR } from 'date-fns/locale';

interface BlockInfo {
  isBlocked: boolean;
  reason?: string;
  blockedAt?: string;
  blockedBy?: string;
}

export default function UsuarioBloqueadoPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [blockInfo, setBlockInfo] = useState<BlockInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkBlockStatus = async () => {
      if (!user) {
        router.push('/cliente/login');
        return;
      }

      try {
        const response = await fetch('/api/user/block-status', {
          method: 'GET',
        });

        if (response.ok) {
          const data = await response.json();
          setBlockInfo(data.blockStatus);
          
          // Se não está bloqueado, redirecionar para o painel
          if (!data.blockStatus.isBlocked) {
            router.push('/cliente/painel');
            return;
          }
        }
      } catch (error) {
        devLog.error('Erro ao verificar status de bloqueio:', error);
      } finally {
        setLoading(false);
      }
    };

    checkBlockStatus();
  }, [user, router]);

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/cliente/login');
    } catch (error) {
      devLog.error('Erro ao fazer logout:', error);
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        {/* Header com logo */}
        <div className="text-center mb-8">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
            <Shield className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Conta Bloqueada</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Sua conta foi temporariamente bloqueada
          </p>
        </div>

        {/* Card principal */}
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5" />
              Acesso Restrito
            </CardTitle>
            <CardDescription>
              Sua conta está temporariamente bloqueada. Você não pode acessar projetos ou interagir com o sistema no momento.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Status Badge */}
            <div className="flex justify-center">
              <Badge variant="destructive" className="px-4 py-2">
                <Shield className="w-4 h-4 mr-2" />
                Conta Bloqueada
              </Badge>
            </div>

            {/* Informações do bloqueio */}
            {blockInfo && (
              <div className="space-y-4">
                {blockInfo.reason && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                      Motivo do Bloqueio:
                    </h3>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      {blockInfo.reason}
                    </p>
                  </div>
                )}

                {blockInfo.blockedAt && (
                  <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                    Bloqueado em: {format(new Date(blockInfo.blockedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </div>
                )}
              </div>
            )}

            {/* Instruções de contato */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>O que fazer agora?</strong>
                <br />
                Para resolver esta situação e reativar sua conta, entre em contato com nossa equipe de suporte.
              </AlertDescription>
            </Alert>

            {/* Informações de contato */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                Contato do Suporte:
              </h3>
              
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-blue-500" />
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Email:</span>
                  <a 
                    href="mailto:suporte@colmeiasolar.com" 
                    className="ml-2 text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    suporte@colmeiasolar.com
                  </a>
                </div>
              </div>
              
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-green-500" />
                <div>
                  <span className="text-gray-600 dark:text-gray-400">WhatsApp:</span>
                  <a 
                    href="https://wa.me/5511999999999" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="ml-2 text-green-600 dark:text-green-400 hover:underline"
                  >
                    (11) 99999-9999
                  </a>
                </div>
              </div>
            </div>

            {/* Informações sobre o que mencionar no contato */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                Ao entrar em contato, mencione:
              </h3>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <li>• Seu nome completo e email cadastrado</li>
                <li>• Que sua conta está bloqueada</li>
                <li>• Qualquer informação adicional relevante</li>
              </ul>
            </div>

            {/* Botões de ação */}
            <div className="flex flex-col gap-3 pt-4">
              <Button
                onClick={handleLogout}
                variant="outline"
                className="w-full gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sair da Conta
              </Button>
              
              <Button
                onClick={handleGoBack}
                variant="ghost"
                className="w-full gap-2 text-gray-600 dark:text-gray-400"
              >
                <ChevronLeft className="w-4 h-4" />
                Voltar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-500 dark:text-gray-400">
          <p>Colmeia Solar - Sistema de Gestão de Projetos</p>
          <p className="mt-1">
            Sua conta será reativada assim que a situação for resolvida.
          </p>
        </div>
      </div>
    </div>
  );
}
