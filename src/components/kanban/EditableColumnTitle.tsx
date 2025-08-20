"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Check, X, Edit } from 'lucide-react'
import { devLog } from "@/lib/utils/productionLogger";
import { toast } from '@/components/ui/use-toast'

/**
 * Componente para editar o título de colunas no quadro Kanban
 */
interface EditableColumnTitleProps {
  columnId: string
  title: string
  originalStatus: string
  onUpdateTitle: (columnId: string, newTitle: string) => void
}

export function EditableColumnTitle({ 
  columnId, 
  title, 
  originalStatus, 
  onUpdateTitle 
}: EditableColumnTitleProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState(title)
  const [isUpdating, setIsUpdating] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  
  // Update local state when the title prop changes
  useEffect(() => {
    setEditedTitle(title)
  }, [title])
  
  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])
  
  const handleStartEditing = () => {
    setEditedTitle(title)
    setIsEditing(true)
  }
  
  const handleCancel = () => {
    setIsEditing(false)
    setEditedTitle(title)
  }
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }
  
  const handleSave = async () => {
    if (editedTitle.trim() === '' || editedTitle.trim() === title) {
      handleCancel()
      return
    }
    
    try {
      setIsUpdating(true)
      
      // Chama a função de callback fornecida pelo componente pai
      await onUpdateTitle(columnId, editedTitle.trim())
      
      // Atualiza o estado local e sai do modo de edição
      setIsEditing(false)
    } catch (error) {
      devLog.error('Erro ao atualizar título da coluna:', error)
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o título da coluna.",
        variant: "destructive"
      })
      setEditedTitle(title) // Reverte para o título original em caso de erro
    } finally {
      setIsUpdating(false)
    }
  }

  // Manipulador para clicar fora do campo e cancelar a edição
  const handleBlur = (e: React.FocusEvent) => {
    // Verifica se o clique foi fora dos botões de ação
    if (
      !e.currentTarget.contains(e.relatedTarget as Node) ||
      (e.relatedTarget && 
       !(e.relatedTarget as HTMLElement).classList.contains('edit-action'))
    ) {
      handleCancel()
    }
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-1" onBlur={handleBlur}>
        <input
          ref={inputRef}
          type="text"
          value={editedTitle}
          onChange={(e) => setEditedTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          className="py-0.5 px-1.5 text-sm font-medium rounded border border-blue-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none w-[120px]"
          disabled={isUpdating}
          autoFocus
        />
        <button
          onClick={handleSave}
          disabled={isUpdating}
          className="edit-action p-0.5 text-green-600 hover:text-green-700 disabled:opacity-50 rounded"
          type="button"
          aria-label="Salvar"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleCancel}
          disabled={isUpdating}
          className="edit-action p-0.5 text-red-600 hover:text-red-700 disabled:opacity-50 rounded"
          type="button"
          aria-label="Cancelar"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1 group">
      <button
        onClick={handleStartEditing}
        className="p-0.5 text-gray-500 hover:text-blue-500 rounded cursor-pointer pointer-events-auto z-10"
        aria-label="Editar título"
        title="Editar título da coluna"
      >
        <Edit className="w-4 h-4" />
      </button>
      <span className="font-medium text-gray-900 dark:text-white">
        {title}
      </span>
    </div>
  )
} 