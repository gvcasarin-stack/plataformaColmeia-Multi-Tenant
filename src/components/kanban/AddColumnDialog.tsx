"use client"

import { useState, useEffect } from "react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { addKanbanColumn, getProjectStatuses, type ProjectStatusInfo } from "@/lib/services/kanbanService"
import { toast } from "@/components/ui/use-toast"
import { devLog } from "@/lib/utils/productionLogger";
import { PlusCircle, Check } from "lucide-react"

/**
 * Interface de props para o componente AddColumnDialog
 */
interface AddColumnDialogProps {
  onColumnAdded?: (columnId: string, columnName: string) => void
}

// Paleta de cores predefinidas para a bolinha indicadora da coluna
const COLUMN_COLORS = [
  '#6b7280', // cinza (padrão)
  '#3b82f6', // azul
  '#8b5cf6', // roxo
  '#06b6d4', // ciano
  '#10b981', // verde
  '#f59e0b', // âmbar
  '#f97316', // laranja
  '#ef4444', // vermelho
  '#ec4899', // rosa
  '#eab308', // amarelo
]

/**
 * Componente para adicionar novas colunas ao quadro Kanban
 *
 * Exibe um diálogo que permite ao usuário criar uma nova coluna
 * representando um novo status para projetos, escolhendo cor e posição
 */
export function AddColumnDialog({ onColumnAdded }: AddColumnDialogProps) {
  const [open, setOpen] = useState(false)
  const [columnName, setColumnName] = useState("")
  const [selectedColor, setSelectedColor] = useState(COLUMN_COLORS[0])
  const [existingColumns, setExistingColumns] = useState<ProjectStatusInfo[]>([])
  const [insertAfterId, setInsertAfterId] = useState<string>("end")
  const [loadingColumns, setLoadingColumns] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Carregar colunas existentes ao abrir o modal, para montar o seletor de posição
  useEffect(() => {
    if (!open) return

    const loadColumns = async () => {
      setLoadingColumns(true)
      try {
        const statuses = await getProjectStatuses()
        setExistingColumns([...statuses].sort((a, b) => a.order - b.order))
        setInsertAfterId("end") // padrão: manter comportamento atual (inserir no final)
      } catch (error) {
        devLog.error("Erro ao carregar colunas existentes:", error)
      } finally {
        setLoadingColumns(false)
      }
    }

    loadColumns()
  }, [open])

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
      const insertAfter = insertAfterId === "end" ? null : insertAfterId
      await addKanbanColumn("", columnName.trim(), selectedColor, undefined, insertAfter)

      // Limpar o formulário
      setColumnName("")
      setSelectedColor(COLUMN_COLORS[0])
      setInsertAfterId("end")

      // Fechar o dialog
      setOpen(false)

      // ✅ Notificar o componente pai APÓS sucesso da API
      if (onColumnAdded) {
        onColumnAdded("", columnName)
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

            <div className="grid gap-2">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2">
                {COLUMN_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    disabled={isSubmitting}
                    className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 disabled:opacity-50"
                    style={{ backgroundColor: color }}
                    title={color}
                  >
                    {selectedColor === color && <Check className="h-4 w-4 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="column-position">Posição</Label>
              <Select
                value={insertAfterId}
                onValueChange={setInsertAfterId}
                disabled={isSubmitting || loadingColumns}
              >
                <SelectTrigger id="column-position">
                  <SelectValue placeholder="Selecione a posição" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="end">No final (padrão)</SelectItem>
                  {existingColumns.map((col) => (
                    <SelectItem key={col.id} value={col.id}>
                      Depois de "{col.name}"
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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