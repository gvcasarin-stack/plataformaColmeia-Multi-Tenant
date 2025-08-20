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
import { Project } from "@/types/project"
import { devLog } from "@/lib/utils/productionLogger";
import { useRouter } from "next/navigation"

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
    toast({
      title: "Funcionalidade Temporariamente Indisponível",
      description: "A funcionalidade de assumir responsabilidade será migrada para Supabase em breve.",
      variant: "default"
    });
    onOpenChange(false);
    return;
    
    // ✅ SUPABASE - TODO: Implementar usando Server Actions
    // Código original comentado para evitar erros de API do Firebase
    
    // if (!currentUser?.uid || !project.id) {
    //   toast({
    //     title: "Erro",
    //     description: "Informações do usuário ou projeto incompletas.",
    //     variant: "destructive"
    //   })
    //   onOpenChange(false)
    //   return
    // }

    // setIsLoading(true)
    
    // try {
    //   // Dados do admin a serem salvos
    //   const adminData = {
    //     adminResponsibleId: currentUser.uid,
    //     adminResponsibleName: currentUser.name || currentUser.email,
    //     adminResponsibleEmail: currentUser.email,
    //     adminResponsiblePhone: currentUser.phone || ""
    //   }
    //   
    //   // Atualizar usando Server Action
    //   // await updateProjectAction(...)
    //   
    //   // Mostrar mensagem de sucesso
    //   toast({
    //     title: "Sucesso",
    //     description: "Você agora é o administrador responsável por este projeto.",
    //   })
    //   
    //   // Fechar o diálogo
    //   onOpenChange(false)
    //   
    // } catch (error) {
    //   devLog.error("Erro ao assumir responsabilidade pelo projeto:", error)
    //   toast({
    //     title: "Erro",
    //     description: "Ocorreu um erro ao assumir responsabilidade. Tente novamente.",
    //     variant: "destructive"
    //   })
    // } finally {
    //   setIsLoading(false)
    // }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Assumir Responsabilidade</AlertDialogTitle>
          <AlertDialogDescription>
            Você está prestes a se tornar o administrador responsável pelo projeto <span className="font-medium">"Projeto {project.nomeClienteFinal || 'Cliente Final'}"</span>.
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