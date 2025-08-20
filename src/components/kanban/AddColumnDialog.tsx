"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { addKanbanColumn } from "@/lib/services/kanbanService"
import { toast } from "@/components/ui/use-toast"
import { devLog } from "@/lib/utils/productionLogger";
import { PlusCircle } from "lucide-react"

/**
 * Interface de props para o componente AddColumnDialog
 */
interface AddColumnDialogProps {
  onColumnAdded?: (columnId: string, columnName: string) => void
}

/**
 * Componente para adicionar novas colunas ao quadro Kanban
 * 
 * Exibe um diálogo que permite ao usuário criar uma nova coluna
 * representando um novo status para projetos
 */
export function AddColumnDialog({ onColumnAdded }: AddColumnDialogProps) {
  const [open, setOpen] = useState(false)
  const [columnName, setColumnName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (columnName.trim() === "") {
      toast({
        title: "Nome inválido",
        description: "Por favor, insira um nome válido para a coluna.",
        variant: "destructive",
      })
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const columnId = await addKanbanColumn(columnName)
      
      toast({
        title: "Coluna adicionada",
        description: `A coluna "${columnName}" foi adicionada com sucesso.`,
        variant: "default",
      })
      
      // Limpar o formulário
      setColumnName("")
      
      // Fechar o dialog
      setOpen(false)
      
      // Notificar o componente pai
      if (onColumnAdded) {
        onColumnAdded(columnId, columnName)
      }
    } catch (error: any) {
      devLog.error("Erro ao adicionar coluna:", error)
      toast({
        title: "Erro ao adicionar coluna",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="ml-3 text-gray-800 dark:bg-white dark:text-black dark:border-gray-300 dark:hover:bg-gray-100" size="sm">
          <PlusCircle className="mr-2 h-4 w-4" />
          Adicionar Coluna
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Adicionar nova coluna</DialogTitle>
            <DialogDescription>
              Crie uma nova coluna para o quadro Kanban. Esta coluna representará um novo status possível para os projetos.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="column-name">Nome da coluna</Label>
              <Input
                id="column-name"
                placeholder="Digite o nome da coluna"
                value={columnName}
                onChange={(e) => setColumnName(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
            >
              {isSubmitting ? "Adicionando..." : "Adicionar coluna"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 