"use client"

import React, { useEffect } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"

interface SignOutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isLoading?: boolean
}

export function SignOutDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading
}: SignOutDialogProps) {
  // Efeito simplificado para apenas definir flags críticas sem manipulação excessiva de eventos
  useEffect(() => {
    if (!open) return;
    
    // Apenas definir as flags para o processo de logout quando o diálogo é aberto
    if (typeof window !== 'undefined') {
      // Identificar se estamos em ambiente admin
      const isAdmin = window.location.pathname.includes('/admin') || 
                     window.location.pathname.startsWith('/painel');
      
      // Preparar sinalizadores de logout
      document.body.classList.add('logging-out');
      sessionStorage.setItem('isLoggingOut', 'true');
      
      if (isAdmin) {
        sessionStorage.setItem('admin_logging_out', 'true');
      }
      
      // Remover evento beforeunload
      window.onbeforeunload = null;
    }
    
    return () => {
      // Se o diálogo foi fechado sem confirmar, limpar as flags
      if (!isLoading && typeof window !== 'undefined') {
        document.body.classList.remove('logging-out');
        sessionStorage.removeItem('isLoggingOut');
        sessionStorage.removeItem('admin_logging_out');
      }
    };
  }, [open, isLoading]);
  
  return (
    <AlertDialog 
      open={open} 
      onOpenChange={(newOpenState) => {
        // Se estamos fechando o diálogo durante o carregamento, impedir o fechamento
        if (open && !newOpenState && isLoading) return;
        
        // Caso contrário, permitir alteração normal do estado
        onOpenChange(newOpenState);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar saída</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja sair? Você precisará fazer login novamente para acessar o sistema.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel 
            disabled={isLoading}
            onClick={() => {
              if (typeof window !== 'undefined') {
                // Limpar flags ao cancelar
                document.body.classList.remove('logging-out');
                sessionStorage.removeItem('isLoggingOut');
                sessionStorage.removeItem('admin_logging_out');
              }
            }}
          >
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              
              // Fechar o diálogo antes de executar o logout
              onOpenChange(false);
              
              // Desativar confirmações de saída
              if (typeof window !== 'undefined') {
                window.onbeforeunload = null;
              }
              
              // Executar o logout após um pequeno timeout para garantir que a UI foi atualizada
              setTimeout(onConfirm, 10);
            }}
            disabled={isLoading}
            className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white"
          >
            {isLoading ? "Saindo..." : "Sair"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function SignOutButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="destructive" className="w-full" onClick={onClick}>
      <LogOut className="w-4 h-4 mr-2 flex-shrink-0" />
      <span className="truncate">Sair</span>
    </Button>
  )
} 