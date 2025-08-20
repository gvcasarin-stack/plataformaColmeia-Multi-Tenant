"use client";

import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Shield } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface BlockUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  user: {
    id: string;
    name: string;
    email: string;
  };
  isLoading?: boolean;
}

export function BlockUserModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  user, 
  isLoading = false 
}: BlockUserModalProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      setError('O motivo do bloqueio é obrigatório');
      return;
    }

    if (reason.trim().length < 10) {
      setError('O motivo deve ter pelo menos 10 caracteres');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onConfirm(reason.trim());
      
      // Limpar formulário após sucesso
      setReason('');
      onClose();
      
      toast({
        title: "Usuário bloqueado",
        description: `${user.name} foi bloqueado com sucesso.`,
      });
    } catch (error: any) {
      setError(error.message || 'Erro ao bloquear usuário');
      toast({
        title: "Erro ao bloquear usuário",
        description: error.message || 'Não foi possível bloquear o usuário',
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting || isLoading) return; // Não permitir fechar durante carregamento
    
    setReason('');
    setError('');
    onClose();
  };

  const isProcessing = isSubmitting || isLoading;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-500" />
            Bloquear Usuário
          </DialogTitle>
          <DialogDescription>
            Você está prestes a bloquear o usuário{' '}
            <strong className="text-foreground">{user.name}</strong>{' '}
            ({user.email}). Esta ação impedirá que o usuário acesse projetos e interaja com o sistema.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">
              Motivo do Bloqueio <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Digite o motivo do bloqueio (mínimo 10 caracteres)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[100px]"
              disabled={isProcessing}
              required
            />
            <p className="text-sm text-muted-foreground">
              {reason.length}/500 caracteres
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Atenção:</strong> O usuário bloqueado poderá fazer login, mas não conseguirá acessar projetos ou interagir com o sistema. Ele será informado sobre o bloqueio e orientado a entrar em contato com o suporte.
            </AlertDescription>
          </Alert>

          <DialogFooter className="gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              variant="destructive"
              disabled={isProcessing || !reason.trim() || reason.trim().length < 10}
              className="min-w-[140px]"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Bloquear Usuário
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface UnblockUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  user: {
    id: string;
    name: string;
    email: string;
    blockedReason?: string;
  };
  isLoading?: boolean;
}

export function UnblockUserModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  user, 
  isLoading = false 
}: UnblockUserModalProps) {
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    try {
      setError('');
      await onConfirm();
      
      onClose();
      
      toast({
        title: "Usuário desbloqueado",
        description: `${user.name} foi desbloqueado com sucesso.`,
      });
    } catch (error: any) {
      setError(error.message || 'Erro ao desbloquear usuário');
      toast({
        title: "Erro ao desbloquear usuário",
        description: error.message || 'Não foi possível desbloquear o usuário',
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    if (isLoading) return; // Não permitir fechar durante carregamento
    
    setError('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-500" />
            Desbloquear Usuário
          </DialogTitle>
          <DialogDescription>
            Você está prestes a desbloquear o usuário{' '}
            <strong className="text-foreground">{user.name}</strong>{' '}
            ({user.email}). O usuário voltará a ter acesso completo ao sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {user.blockedReason && (
            <div className="space-y-2">
              <Label>Motivo do Bloqueio Original:</Label>
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm">{user.blockedReason}</p>
              </div>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Confirmação:</strong> O usuário voltará a ter acesso completo a todos os recursos do sistema, incluindo projetos e interações.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="gap-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button 
            type="button" 
            variant="default"
            onClick={handleConfirm}
            disabled={isLoading}
          >
                          {isLoading ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Desbloqueando...
                </>
              ) : (
              <>
                <Shield className="w-4 h-4 mr-2" />
                Desbloquear Usuário
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 