/**
 * Component para bloquear tabs específicas quando trial expira
 * Permite fechar mas redireciona para assinaturas
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  Lock, 
  ArrowRight,
  X
} from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { devLog } from '@/lib/utils/productionLogger';

interface TrialExpiredTabBlockerProps {
  tabName: string;
  description?: string;
}

export function TrialExpiredTabBlocker({ 
  tabName,
  description = "Esta funcionalidade está temporariamente bloqueada"
}: TrialExpiredTabBlockerProps) {
  const router = useRouter();
  const { user } = useAuth();

  const handleGoToSubscriptions = () => {
    devLog.log(`[TrialExpiredTabBlocker] Redirecionando de ${tabName} para assinaturas`);
    router.push('/admin/assinaturas');
  };

  const handleClose = () => {
    devLog.log(`[TrialExpiredTabBlocker] Fechando modal de ${tabName}`);
    handleGoToSubscriptions();
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-white dark:bg-gray-800 shadow-lg border-red-200 relative">
        {/* Botão de fechar */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-4 right-4 z-10 hover:bg-red-100 text-red-600"
          onClick={handleClose}
        >
          <X className="h-4 w-4" />
        </Button>
        
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-red-100 rounded-full">
              <Lock className="h-6 w-6 text-red-600" />
            </div>
          </div>
          
          <CardTitle className="text-xl font-bold text-red-700">
            🚨 {tabName} - Funcionalidade Bloqueada
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Mensagem principal */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Trial Expirado</AlertTitle>
            <AlertDescription>
              {description}. Seu período de teste expirou e é necessário fazer upgrade para continuar.
            </AlertDescription>
          </Alert>

          {/* Botão para ir às assinaturas */}
          <div className="text-center space-y-3">
            <p className="text-sm text-gray-600">
              Vá para a aba de <strong>Assinaturas</strong> para reativar sua conta
            </p>
            
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleGoToSubscriptions}
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Ir para Assinaturas
            </Button>
          </div>

          <div className="text-center text-xs text-gray-500">
            Apenas R$ 299/mês para reativar todas as funcionalidades
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
