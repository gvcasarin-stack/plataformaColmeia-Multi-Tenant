"use client"

import React, { useState } from "react"
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
import { deleteKanbanColumn } from "@/lib/services/kanbanService"
import { devLog } from "@/lib/utils/productionLogger";
import { toast } from "@/components/ui/use-toast"

/**
 * Diálogo de confirmação para exclusão de colunas no quadro Kanban
 */
interface DeleteColumnDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  columnId: string
  columnTitle: string
  onDeleted: () => void
  isDefaultColumn: boolean
}

export function DeleteColumnDialog({
  open,
  onOpenChange,
  columnId,
  columnTitle,
  onDeleted,
  isDefaultColumn
}: DeleteColumnDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    // Não permitir exclusão de colunas padrão
    if (isDefaultColumn) {
      toast({
        title: "Operação não permitida",
        description: "Não é possível excluir colunas padrão do sistema.",
        variant: "destructive"
      })
      onOpenChange(false)
      return
    }

    setIsDeleting(true)
    
    try {
      await deleteKanbanColumn(columnId)
      
      toast({
        title: "Coluna excluída",
        description: `A coluna "${columnTitle}" foi excluída com sucesso.`,
        variant: "default",
      })
      
      // Notificar componente pai
      onDeleted()
      onOpenChange(false)
    } catch (error: any) {
      devLog.error("Erro ao excluir coluna:", error)
      toast({
        title: "Erro ao excluir coluna",
        description: error.message || "Ocorreu um erro ao excluir a coluna. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir coluna</AlertDialogTitle>
          <AlertDialogDescription>
            {isDefaultColumn ? (
              <span className="text-amber-600 font-medium">
                Esta é uma coluna padrão do sistema e não pode ser excluída.
              </span>
            ) : (
              <span>
                Tem certeza que deseja excluir a coluna <span className="font-medium">"{columnTitle}"</span>?
                <br /><br />
                <span className="text-amber-600">
                  Atenção: Esta ação não pode ser desfeita e os projetos que estiverem nesta coluna
                  serão movidos para a coluna "Não Iniciado".
                </span>
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          {!isDefaultColumn && (
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600 focus:ring-red-500"
            >
              {isDeleting ? "Excluindo..." : "Excluir coluna"}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
