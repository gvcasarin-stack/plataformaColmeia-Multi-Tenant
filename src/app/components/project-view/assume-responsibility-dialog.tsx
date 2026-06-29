"use client"

import { useState, useEffect } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { Project } from "@/types/project"
import { devLog } from "@/lib/utils/productionLogger";
import { useRouter } from "next/navigation"
import { assumeProjectResponsibilityAction } from "@/lib/actions/project-actions"
import { createTenantHeaders } from "@/lib/utils/tenant-helper"
import { Loader2, User, Shield, Info, CheckCircle2, UserCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

interface TeamMember {
  id: string
  name: string
  email: string
  role: string
  department: string
  permissions?: any
}

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
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [selectedMemberId, setSelectedMemberId] = useState<string>("")
  const router = useRouter()

  // ✅ Obter membro selecionado para preview
  const selectedMember = teamMembers.find(m => m.id === selectedMemberId)

  // ✅ Helper para badge de role
  const getRoleBadge = (role: string) => {
    if (role === 'admin' || role === 'superadmin') {
      return (
        <Badge variant="default" className="bg-blue-500 text-white text-xs">
          <Shield className="h-3 w-3 mr-1" />
          Admin
        </Badge>
      )
    }
    return (
      <Badge variant="secondary" className="text-xs">
        <User className="h-3 w-3 mr-1" />
        Colaborador
      </Badge>
    )
  }

  // ✅ Buscar membros da equipe quando o dialog abre
  useEffect(() => {
    if (open) {
      fetchTeamMembers()
    }
  }, [open])

  const fetchTeamMembers = async () => {
    setIsLoadingMembers(true)
    try {
      devLog.log('[AssumeResponsibilityDialog] Buscando membros da equipe...')

      const tenantHeaders = await createTenantHeaders(currentUser.uid)
      const response = await fetch('/api/admin/team-members', {
        method: 'GET',
        headers: tenantHeaders,
      })

      if (!response.ok) {
        throw new Error('Erro ao buscar membros da equipe')
      }

      const result = await response.json()
      devLog.log('[AssumeResponsibilityDialog] Membros recebidos:', result.data)

      setTeamMembers(result.data || [])
      setSelectedMemberId(project.adminResponsibleId || "")
    } catch (error) {
      devLog.error('[AssumeResponsibilityDialog] Erro ao buscar membros:', error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os membros da equipe.",
        variant: "destructive"
      })
    } finally {
      setIsLoadingMembers(false)
    }
  }

  const handleAssignResponsibility = async () => {
    devLog.log('[AssumeResponsibilityDialog] Atribuindo responsabilidade:', {
      projectId: project.id,
      selectedMemberId
    });

    if (!selectedMemberId) {
      toast({
        title: "Atenção",
        description: "Por favor, selecione um membro da equipe.",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)

    try {
      const member = teamMembers.find(m => m.id === selectedMemberId)
      if (!member) {
        toast({
          title: "Erro",
          description: "Membro selecionado não encontrado.",
          variant: "destructive"
        })
        return
      }

      devLog.log('[AssumeResponsibilityDialog] Iniciando atribuição:', {
        projectId: project.id,
        memberId: member.id,
        memberEmail: member.email,
        memberName: member.name
      });

      // ✅ Usar Server Action para atribuir responsabilidade
      const result = await assumeProjectResponsibilityAction(project.id, {
        id: member.id,
        name: member.name,
        email: member.email,
        phone: '',
        role: member.role
      });

      devLog.log('[AssumeResponsibilityDialog] Resultado da atribuição:', result);

      if (result.error) {
        throw new Error(result.error);
      }

      devLog.log('[AssumeResponsibilityDialog] Responsável definido com sucesso:', result);

      // ✅ Mostrar mensagem de sucesso
      toast({
        title: "Sucesso",
        description: `${member.name} foi definido(a) como responsável pelo projeto ${project.number || project.nome_cliente_final}.`,
      })

      // ✅ Fechar o diálogo
      onOpenChange(false)

      // ✅ Refresh da página para mostrar mudanças
      router.refresh()

    } catch (error) {
      devLog.error("Erro ao atribuir responsabilidade pelo projeto:", error)

      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      devLog.error('[AssumeResponsibilityDialog] Erro detalhado:', {
        errorMessage,
        errorType: typeof error,
        errorConstructor: error?.constructor?.name,
        stack: error instanceof Error ? error.stack : undefined
      });

      toast({
        title: "Erro",
        description: `Erro: ${errorMessage}`,
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl flex items-center gap-2">
            <UserCircle2 className="h-6 w-6 text-blue-500" />
            Definir Responsável pelo Projeto
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-5 pt-2">
            {/* ✅ Informação do Projeto */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Selecione o membro da equipe que será o responsável pelo projeto{" "}
                <span className="font-semibold text-blue-700 dark:text-blue-400">
                  "{project.number} - {project.nomeClienteFinal || project.nome_cliente_final || 'Cliente Final'}"
                </span>
              </p>
            </div>

            {/* ✅ Loading State com Skeleton */}
            {isLoadingMembers ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              </div>
            ) : (
              <>
                {/* ✅ Select com melhor UI */}
                <div className="space-y-3">
                  <label htmlFor="member-select" className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Membro da Equipe
                  </label>
                  <Select
                    value={selectedMemberId}
                    onValueChange={setSelectedMemberId}
                    disabled={isLoading}
                  >
                    <SelectTrigger id="member-select" className="w-full h-12 text-base">
                      <SelectValue placeholder="Selecione um membro da equipe..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {teamMembers.length === 0 ? (
                        <SelectItem value="none" disabled>
                          Nenhum membro disponível
                        </SelectItem>
                      ) : (
                        teamMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id} className="py-3 cursor-pointer">
                            <div className="flex items-center gap-3 w-full">
                              <div className="flex-shrink-0">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                                  {member.name.charAt(0).toUpperCase()}
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                                    {member.name}
                                  </span>
                                  {getRoleBadge(member.role)}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                  <span className="truncate">{member.email}</span>
                                  <span>•</span>
                                  <span>{member.department}</span>
                                </div>
                              </div>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* ✅ Preview do Membro Selecionado */}
                {selectedMember && (
                  <Card className="border-2 border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                          Membro Selecionado
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-bold text-lg">
                          {selectedMember.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                              {selectedMember.name}
                            </span>
                            {getRoleBadge(selectedMember.role)}
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {selectedMember.email} • {selectedMember.department}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* ✅ Mensagem Informativa com Ícone */}
                <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    O responsável será o ponto de contato principal para este projeto
                    e receberá todas as notificações relacionadas a ele.
                  </p>
                </div>
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel disabled={isLoading} className="px-6">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleAssignResponsibility()
            }}
            disabled={isLoading || isLoadingMembers || !selectedMemberId}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Confirmar Atribuição
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
} 