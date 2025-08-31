"use client"

import { useState } from "react"
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
// ✅ SUPABASE - REMOVIDO: Firebase imports que causavam erros de API
// import { doc, updateDoc } from "firebase/firestore"
// import { db } from "@/lib/firebase"
import { toast } from "@/components/ui/use-toast"
import { Project, UpdatedProject, TimelineEvent } from "@/types/project"
import { devLog } from "@/lib/utils/productionLogger";
import { useRouter } from "next/navigation"
import { assumeProjectResponsibilityAction } from "@/lib/actions/project-actions"

interface AssumeResponsibilityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: Project
  currentUser: {
    uid: string
    email?: string | null
    name?: string | null
    phone?: string | null
    role?: string
  }
}

export function AssumeResponsibilityDialog({
  open,
  onOpenChange,
  project,
  currentUser
}: AssumeResponsibilityDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleAssumeResponsibility = async () => {
    // ✅ SUPABASE - IMPLEMENTAÇÃO: Funcionalidade reativada com Supabase
    if (!currentUser?.uid || !project.id) {
      toast({
        title: "Erro",
        description: "Informações do usuário ou projeto incompletas.",
        variant: "destructive"
      })
      onOpenChange(false)
      return
    }

    setIsLoading(true)
    
    try {
      devLog.log('[AssumeResponsibilityDialog] Iniciando processo de assumir responsabilidade:', {
        projectId: project.id,
        userId: currentUser.uid,
        userEmail: currentUser.email,
        userName: currentUser.name
      });

      // ✅ Usar nova Server Action que não valida tenant
      const result = await assumeProjectResponsibilityAction(project.id, {
        id: currentUser.uid,
        name: currentUser.name,
        email: currentUser.email,
        phone: currentUser.phone,
        role: currentUser.role || 'admin'
      });

      if (result.error) {
        throw new Error(result.error);
      }
      
      devLog.log('[AssumeResponsibilityDialog] Responsabilidade assumida com sucesso:', result);

      // ✅ Mostrar mensagem de sucesso
      toast({
        title: "Sucesso",
        description: `Você agora é o administrador responsável pelo projeto ${project.number || project.nome_cliente_final}.`,
      })
      
      // ✅ Fechar o diálogo
      onOpenChange(false)
      
      // ✅ Refresh da página para mostrar mudanças
      router.refresh()
      
    } catch (error) {
      devLog.error("Erro ao assumir responsabilidade pelo projeto:", error)
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao assumir responsabilidade. Tente novamente.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Assumir Responsabilidade</AlertDialogTitle>
          <AlertDialogDescription>
            Você está prestes a se tornar o administrador responsável pelo projeto <span className="font-medium">"{project.number} - {project.nomeClienteFinal || project.nome_cliente_final || 'Cliente Final'}"</span>.
            <br /><br />
            <span className="text-blue-600">
              Ao assumir esta responsabilidade, você será o ponto de contato principal para este projeto
              e receberá todas as notificações relacionadas a ele.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleAssumeResponsibility()
            }}
            disabled={isLoading}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            {isLoading ? "Processando..." : "Confirmar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
} 