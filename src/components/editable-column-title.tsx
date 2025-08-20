"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Edit, Check, X } from 'lucide-react'
// ✅ SUPABASE - REMOVIDO: Firebase imports que causavam erros de API
import { devLog } from "@/lib/utils/productionLogger";
// import { doc, updateDoc, getFirestore } from 'firebase/firestore'
import { toast } from '@/components/ui/use-toast'

interface EditableColumnTitleProps {
  columnId: string
  title: string
  originalStatus: string
  onTitleUpdate: (newTitle: string) => void
}

export function EditableColumnTitle({ columnId, title, originalStatus, onTitleUpdate }: EditableColumnTitleProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState(title)
  const [isUpdating, setIsUpdating] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  
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
  
  const handleSave = async () => {
    if (editedTitle.trim() === title || editedTitle.trim() === '') {
      handleCancel()
      return
    }
    
    // ✅ SUPABASE - DESABILITADO: Funcionalidade temporariamente indisponível
    toast({
      title: "Funcionalidade Temporariamente Indisponível",
      description: "A edição de títulos de coluna será migrada para Supabase em breve.",
      variant: "default"
    });
    handleCancel();
    return;
    
    // ✅ SUPABASE - TODO: Implementar usando Server Actions ou Supabase
    // try {
    //   setIsUpdating(true)
    //   
    //   // Tentar atualizar o título da coluna no Supabase
    //   // TODO: Implementar com Supabase
    //   
    //   // Notificar o pai sobre a alteração
    //   onTitleUpdate(editedTitle.trim())
    //   
    //   // Mostrar toast de sucesso
    //   toast({
    //     title: "Coluna atualizada",
    //     description: `O título da coluna foi atualizado com sucesso.`,
    //     className: "bg-green-500 text-white"
    //   })
    //   
    //   setIsEditing(false)
    // } catch (error) {
    //   devLog.error('Erro ao atualizar título da coluna:', error)
    //   toast({
    //     title: "Erro ao atualizar",
    //     description: "Não foi possível atualizar o título da coluna. Tente novamente mais tarde.",
    //     variant: "destructive"
    //   })
    // } finally {
    //   setIsUpdating(false)
    // }
  }
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }
  
  return (
    <div className="relative group">
      {isEditing ? (
        <div className="flex items-center gap-1">
          <input
            ref={inputRef}
            type="text"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleCancel}
            className="h-6 px-1 bg-white dark:bg-gray-700 border border-blue-300 dark:border-blue-500 rounded text-sm font-medium min-w-[100px] max-w-[150px] focus:outline-none focus:ring-1 focus:ring-blue-500"
            disabled={isUpdating}
          />
          <button 
            onClick={handleSave}
            disabled={isUpdating}
            aria-label="Salvar"
            className="flex items-center justify-center w-5 h-5 text-green-600 hover:text-green-700 disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={handleCancel}
            disabled={isUpdating}
            aria-label="Cancelar"
            className="flex items-center justify-center w-5 h-5 text-red-600 hover:text-red-700 disabled:opacity-50"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <h3 className="font-medium text-gray-900 dark:text-white">{title}</h3>
          <button
            onClick={handleStartEditing}
            aria-label="Editar título"
            className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-5 h-5 text-gray-500 hover:text-blue-500 transition-opacity duration-200"
          >
            <Edit className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  )
} 