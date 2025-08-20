"use client"

import { useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Project } from "@/types/project"
import { Label } from "@/components/ui/label"

/**
 * Item individual da checklist de projeto
 */
interface ChecklistItem {
  id: string
  label: string
  completed: boolean
}

/**
 * Props do componente ProjectChecklist
 */
interface ProjectChecklistProps {
  /**
   * ID do projeto associado à checklist
   */
  projectId: string
  /**
   * Função chamada quando a checklist é atualizada
   * @param updatedProject Projeto com dados atualizados da checklist
   */
  onUpdate: (updatedProject: Project) => void
}

/**
 * Lista de verificação padrão para projetos
 */
const defaultChecklist: ChecklistItem[] = [
  { id: "1", label: "Análise de Viabilidade", completed: false },
  { id: "2", label: "Dimensionamento", completed: false },
  { id: "3", label: "Documentação", completed: false },
  { id: "4", label: "Aprovação do Cliente", completed: false },
  { id: "5", label: "Solicitação de Acesso", completed: false },
  { id: "6", label: "Parecer de Acesso", completed: false },
  { id: "7", label: "Instalação", completed: false },
  { id: "8", label: "Vistoria", completed: false },
]

/**
 * Componente que exibe e gerencia uma checklist para projetos
 * Permite marcar/desmarcar itens e notifica quando há mudanças
 */
export function ProjectChecklist({ projectId, onUpdate }: ProjectChecklistProps) {
  const [checklist, setChecklist] = useState<ChecklistItem[]>(defaultChecklist)

  /**
   * Manipula a mudança de estado de um item da checklist
   * @param itemId ID do item alterado
   * @param checked Novo estado do checkbox (marcado/desmarcado)
   */
  const handleCheckChange = (itemId: string, checked: boolean) => {
    const updatedChecklist = checklist.map(item => 
      item.id === itemId ? { ...item, completed: checked } : item
    )
    setChecklist(updatedChecklist)

    // Atualiza o projeto com a nova checklist
    // Criamos um objeto Project parcial com apenas os campos necessários
    // e usamos type assertion para satisfazer a interface
    const _updatedProject = {
      id: projectId,
      checklist: updatedChecklist
    } as unknown as Project;
    
    onUpdate(_updatedProject)
  }

  return (
    <div className="space-y-3">
      {checklist.map(item => (
        <div key={item.id} className="flex items-center space-x-2">
          <Checkbox
            id={item.id}
            checked={item.completed}
            onCheckedChange={(checked) => handleCheckChange(item.id, checked as boolean)}
          />
          <Label
            htmlFor={item.id}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {item.label}
          </Label>
        </div>
      ))}
    </div>
  )
} 