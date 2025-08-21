'use client';

import * as React from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { devLog } from "@/lib/utils/productionLogger";
import { AlertCircle } from 'lucide-react';

interface SessionExpiryAlertProps {
  isOpen: boolean;
  onExtendSession: () => void;
  onLogout: () => void;
  remainingTime?: number; // em segundos
}

/**
 * Componente que exibe um alerta quando a sessão está prestes a expirar
 */
export function SessionExpiryAlert({
  isOpen,
  onExtendSession,
  onLogout,
  remainingTime = 120, // padrão de 2 minutos
}: SessionExpiryAlertProps) {
  // Formatação do tempo restante (MM:SS)
  const formattedTime = React.useMemo(() => {
    const minutes = Math.floor(remainingTime / 60);
    const seconds = remainingTime % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [remainingTime]);

  // Funções para garantir que os cliques sejam capturados corretamente
  const handleExtendSession = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onExtendSession();
  };

  const handleLogout = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onLogout();
  };

  // Efeito para lidar com o tempo esgotado
  React.useEffect(() => {
    // Se o tempo acabar enquanto o diálogo estiver aberto, fazer logout
    if (isOpen && remainingTime <= 0) {
      devLog.log('[SessionAlert] Tempo esgotado no diálogo, fazendo logout');
      onLogout();
    }
  }, [isOpen, remainingTime, onLogout]);

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Sessão prestes a expirar
          </AlertDialogTitle>
          <AlertDialogDescription>
            Por motivos de segurança, sua sessão irá expirar em aproximadamente {formattedTime}. 
            Deseja continuar conectado ou encerrar a sessão?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button 
            variant="outline" 
            onClick={handleLogout}
            className="mr-2"
          >
            Encerrar sessão
          </Button>
          <Button 
            onClick={handleExtendSession}
          >
            Continuar conectado
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
