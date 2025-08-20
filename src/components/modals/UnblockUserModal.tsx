"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertCircle, CheckCircle, User } from 'lucide-react';
import { format } from 'date-fns/format';
import { ptBR } from 'date-fns/locale';

interface UnblockUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  user: {
    id: string;
    name: string;
    email: string;
    blockedReason?: string;
    blockedAt?: string;
    blockedBy?: string;
  };
  isLoading?: boolean;
}

export default function UnblockUserModal({
  isOpen,
  onClose,
  onConfirm,
  user,
  isLoading = false
}: UnblockUserModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (confirmText.toLowerCase() !== 'desbloquear') {
      setError('Digite "desbloquear" para confirmar a ação');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onConfirm();
      setConfirmText('');
      onClose();
    } catch (error: any) {
      devLog.error('Erro ao desbloquear usuário:', error);
      setError(error.message || 'Erro ao desbloquear usuário. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting || isLoading) return;
    
    setConfirmText('');
    setError('');
    onClose();
  };

  const isProcessing = isSubmitting || isLoading;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle className="w-5 h-5" />
            Desbloquear Usuário
          </DialogTitle>
          <DialogDescription>
            Confirme o desbloqueio do usuário. Esta ação irá restaurar o acesso completo à plataforma.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações do usuário */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <User className="w-4 h-4" />
              Informações do Usuário
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Nome:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Email:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{user.email}</span>
              </div>
            </div>
          </div>

          {/* Status atual */}
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200 mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Status Atual
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="destructive">
                  Bloqueado
                </Badge>
              </div>
              
              {user.blockedReason && (
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5" />
                  <div>
                    <span className="text-sm font-medium text-red-800 dark:text-red-200">Motivo:</span>
                    <p className="text-sm text-red-700 dark:text-red-300">{user.blockedReason}</p>
                  </div>
                </div>
              )}
              
              {user.blockedAt && (
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <div>
                    <span className="text-sm font-medium text-red-800 dark:text-red-200">Bloqueado em:</span>
                    <span className="text-sm text-red-700 dark:text-red-300 ml-1">
                      {format(new Date(user.blockedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Consequências do desbloqueio */}
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Após o desbloqueio:</strong>
              <ul className="mt-2 text-sm space-y-1">
                <li>• O usuário poderá acessar todos os projetos</li>
                <li>• Todas as funcionalidades serão restauradas</li>
                <li>• O usuário será notificado sobre a reativação</li>
                <li>• O histórico de bloqueio será mantido para auditoria</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Aviso de confirmação */}
          <Alert className="border-yellow-200 dark:border-yellow-800">
            <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <AlertDescription>
              <strong>Atenção:</strong> Esta ação não pode ser desfeita automaticamente. 
              Se necessário, você precisará bloquear o usuário novamente.
            </AlertDescription>
          </Alert>

          {/* Campo de confirmação */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Para confirmar, digite <span className="font-bold text-green-600 dark:text-green-400">"desbloquear"</span>:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Digite: desbloquear"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
              disabled={isProcessing}
            />
          </div>

          {/* Erro */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isProcessing || confirmText.toLowerCase() !== 'desbloquear'}
              className="bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 min-w-[160px]"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Processando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirmar Desbloqueio
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 