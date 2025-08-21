'use client';
import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Project, TimelineEvent, ProjectFile, UpdatedProject } from "@/types/project"
import { 
  Edit, 
  Save, 
  X, 
  Trash2, 
  Building,
  DollarSign,   
  ChevronLeft,
  User,          
  Settings,      // ✅ Para substituir outros ícones
  Download       // ✅ Ícone correto de download
} from 'lucide-react'
import { useAuth } from "@/lib/hooks/useAuth"
import { toast } from "@/components/ui/use-toast"
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
import { FileUploadSection } from "@/components/file-upload-section"
import { uploadProjectFile, FileUploadResult, FileOperationUser } from '@/lib/services/fileService/index'
import { ErrorBoundary } from "@/components/error-boundary"
import { v4 as uuidv4 } from 'uuid'
import { calculateProjectCost } from "@/lib/utils/projectUtils"
import { resetAllForms } from '@/lib/utils/reset'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
// ❌ FIREBASE - REMOVIDO: import { Timestamp } from 'firebase/firestore'
import { deleteCommentAction, deleteFileAction } from '@/lib/actions/project-actions'
import { useTransition } from 'react'

// Import custom icon components
import ClockIcon from '@/components/icons/clock';
import FileIcon from '@/components/icons/file';
import { devLog } from "@/lib/utils/productionLogger";
import MessageIcon from '@/components/icons/message';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/jpg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];
const MAX_FILES = 5;

export interface ExpandedProjectViewProps {
  project: Project;
  onClose: () => void;
  onUpdate: (project: UpdatedProject) => Promise<void>;
  currentUserEmail?: string;
}

interface DeleteItem {
  type: TimelineEvent['type'];
  eventId: string;
  fileName?: string;
  fileUrl?: string;
  filePath?: string;
}

interface EditingComment {
  index: number;
  content: string;
}

interface ChecklistItem {
  id: string;
  text: string;
  subItems?: string[];
}

const checklistItems: ChecklistItem[] = [
  { id: '1', text: 'Fatura de energia com dados legíveis' },
  { 
    id: '2', 
    text: 'Lista de materiais contendo:',
    subItems: [
      'Marca, modelo e quantidade de módulos',
      'Marca, modelo e quantidade de inversores'
    ]
  },
  { id: '3', text: 'Documentação completa do cliente' },
  { id: '4', text: 'Aprovação do cliente' },
  { id: '5', text: 'Solicitação de acesso à distribuidora' },
  { id: '6', text: 'Parecer de acesso da distribuidora' },
  { id: '7', text: 'Instalação concluída' },
  { id: '8', text: 'Vistoria realizada' }
];

// Helper component (pode ser movido para um arquivo separado depois)
const DetailItem = ({ 
  icon, 
  label, 
  value, 
  bgColor = 'bg-gray-100 dark:bg-gray-700',
  multiline = false,
}: { 
  icon?: React.ReactNode, 
  label: string, 
  value: string | number | null, 
  bgColor?: string,
  multiline?: boolean,
}) => (
  <div className={`p-4 rounded-lg shadow-sm ${bgColor} h-full flex flex-col`}>
    <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">{label}</span>
    <div className={`flex mt-1 ${icon ? 'items-start' : 'items-start'}`}>
      {icon && <span className="mr-2 mt-0.5 text-gray-700 dark:text-gray-300">{icon}</span>}
      <p
        className={[
          'text-gray-900 dark:text-gray-100 font-bold',
          multiline ? 'text-base md:text-lg whitespace-pre-wrap break-words leading-relaxed max-h-60 overflow-auto pr-1' : 'text-lg md:text-xl truncate'
        ].join(' ')}
      >
        {value || 'N/A'}
      </p>
    </div>
  </div>
);

export const ExpandedProjectView = ({
  project,
  onClose,
  onUpdate,
  currentUserEmail
}: ExpandedProjectViewProps) => {
  // Helpers para datas: evitam mudança de dia por fuso e exibem no padrão pt-BR
  const formatDateInputValue = (value: any): string => {
    if (!value) return '';
    if (typeof value === 'string') {
      // Se já estiver no formato YYYY-MM-DD, usa direto
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return '';
      // Normalizar removendo offset do timezone para preservar o dia
      const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
      return local.toISOString().split('T')[0];
    }
    if (value instanceof Date) {
      const local = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
      return local.toISOString().split('T')[0];
    }
    return '';
  };

  const formatDateBR = (value: any): string => {
    if (!value) return 'N/A';
    if (typeof value === 'string') {
      const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (m) return `${m[3]}/${m[2]}/${m[1]}`;
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return 'N/A';
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    if (value instanceof Date) {
      return value.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    return 'N/A';
  };
  const { user } = useAuth()
  const isAdminPanel = user?.role === 'admin' || user?.role === 'superadmin' || user?.profile?.role === 'admin' || user?.profile?.role === 'superadmin'
  
  // ✅ DEBUG: Verificar dados do usuário e role
  devLog.log('🔍 [EXPANDED PROJECT VIEW] Dados do usuário:', {
    user: user,
    hasUser: !!user,
    userRole: user?.role,
    userEmail: user?.email,
    userProfile: user?.profile,
    profileRole: user?.profile?.role,
    isAdminPanel,
    allUserData: JSON.stringify(user, null, 2)
  });

  const [editedProject, setEditedProject] = useState<Project>({
    ...project,
    number: project.number,
    empresaIntegradora: project.empresaIntegradora,
    nomeClienteFinal: project.nomeClienteFinal,
    distribuidora: project.distribuidora,
    potencia: project.potencia,
    dataEntrega: project.dataEntrega,
    prioridade: project.prioridade,
    status: project.status,
    files: project.files || [],
    timelineEvents: project.timelineEvents || [],
    documents: project.documents || [],
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    userId: project.userId,
    name: project.name,
    valorProjeto: project.valorProjeto === undefined ? null : project.valorProjeto,
    pagamento: project.pagamento,

    listaMateriais: project.listaMateriais,
    disjuntorPadraoEntrada: project.disjuntorPadraoEntrada
  })
  const [newComment, setNewComment] = useState('')
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>(
    project.timelineEvents || []
  );
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({})
  const [isDragging, setIsDragging] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<DeleteItem | null>(null);
  const [editingComment, setEditingComment] = useState<EditingComment | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState("visao-geral");
  const [showAddDocumentSection, setShowAddDocumentSection] = useState(false);
  const [showAddCommentSection, setShowAddCommentSection] = useState(false);
  const isPending = false; // Placeholder
  const [isSessionChecking, setIsSessionChecking] = useState(false)
  const [isDeleting, startDeleteTransition] = useTransition();

  useEffect(() => {
    if (!user) {
      devLog.log('[Debug EPV] User is not present, ensuring hasChanges is false.');
      setHasChanges(false);
    }
    const handleLogoutInitiated = () => {
      devLog.log('[Debug EPV] Event: app-logout-initiated - Setting hasChanges to false.');
      setHasChanges(false); 
      if (typeof window !== 'undefined') { 
        resetAllForms(); 
      }
    };
    document.addEventListener('app-logout-initiated', handleLogoutInitiated);
    return () => document.removeEventListener('app-logout-initiated', handleLogoutInitiated);
  }, [user]);

  useEffect(() => {
    const handleLogoutRedirectStarted = () => {
      devLog.log('[Debug EPV] Event: logout-redirect-started - Setting hasChanges to false.');
      if (typeof window !== 'undefined') {
        resetAllForms(); 
        setHasChanges(false); 
      }
    };
    document.addEventListener('logout-redirect-started', handleLogoutRedirectStarted);
    return () => document.removeEventListener('logout-redirect-started', handleLogoutRedirectStarted);
  }, []);

  useEffect(() => {
    devLog.log('[Debug EPV] useEffect for onbeforeunload - hasChanges:', hasChanges);
    if (hasChanges) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        devLog.log('[Debug EPV] onbeforeunload triggered. hasChanges is true.');
        const isLoggingOut = sessionStorage.getItem('isLoggingOut') === 'true';
        if (!isLoggingOut) { 
          const message = 'Você tem alterações não salvas. Tem certeza que deseja sair?'; 
          e.preventDefault(); 
          e.returnValue = message; 
          return message; 
        }
        devLog.log('[Debug EPV] onbeforeunload: logging out, allowing navigation.');
        e.preventDefault(); 
        e.returnValue = undefined; 
        return undefined;
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      devLog.log('[Debug EPV] onbeforeunload listener ADDED.');
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        devLog.log('[Debug EPV] onbeforeunload listener REMOVED.');
      };
    } else {
      // Se um listener foi adicionado anteriormente e hasChanges se tornou false, ele será removido pela limpeza do useEffect.
      // Se nenhum listener foi adicionado, este else não faz nada, o que é bom.
      devLog.log('[Debug EPV] hasChanges is false, no onbeforeunload listener active from this effect run.');
    }
  }, [hasChanges]);

  const handleChange = (field: keyof Project, value: string | number | null) => {
    devLog.log(`[Debug EPV] handleChange called. Field: ${field}, Value: ${value}, isEditing: ${isEditing}`);
    if (!isEditing) return;
    setEditedProject(prev => ({ ...prev, [field]: value }));
    devLog.log('[Debug EPV] handleChange: setting hasChanges to true.');
    setHasChanges(true);
  };

  const handleSave = async () => {
    devLog.log('[Debug EPV] handleSave called. hasChanges:', hasChanges);
    if (!hasChanges) return;
    try {
      // ✅ DETECTAR MUDANÇA DE STATUS
      const statusChanged = project.status !== editedProject.status;
      
      devLog.log('🔍 [EXPANDED PROJECT DEBUG] Verificando mudança de status:', {
        originalStatus: project.status,
        newStatus: editedProject.status,
        statusChanged,
        user: user,
        userProfileFullName: user?.profile?.full_name,
        userEmail: user?.email
      });

      let updateEvent: TimelineEvent;
      
      if (statusChanged) {
        // Se o status mudou, criar evento de mudança de status
        updateEvent = createTimelineEvent('status', { 
          content: `Status alterado de "${project.status}" para "${editedProject.status}"`,
          oldStatus: project.status,
          newStatus: editedProject.status
        });
        devLog.log('✅ [EXPANDED PROJECT] Criado evento de STATUS CHANGE:', updateEvent);
      } else {
        // Se não houve mudança de status, criar evento genérico
        updateEvent = createTimelineEvent('comment', { 
          content: 'Informações do projeto atualizadas.' 
        });
        devLog.log('✅ [EXPANDED PROJECT] Criado evento de ATUALIZAÇÃO GERAL:', updateEvent);
      }

      const projectToUpdate: UpdatedProject = { 
        ...editedProject, 
        timelineEvents: [updateEvent, ...timelineEvents] 
      };
      
      await onUpdate(projectToUpdate);
      devLog.log('[Debug EPV] handleSave: setting hasChanges to false and isEditing to false.');
      setHasChanges(false); 
      setIsEditing(false);
      setTimelineEvents(prevEvents => [updateEvent, ...prevEvents]);
      
      const successMessage = statusChanged 
        ? `Status alterado para "${editedProject.status}" com sucesso.`
        : "As alterações foram salvas com sucesso.";
        
      toast({ 
        title: "Alterações salvas", 
        description: successMessage, 
        className: "bg-green-500 text-white" 
      });
    } catch (error) {
      devLog.error('Error updating project:', error);
      toast({ title: "Erro ao salvar", description: "Ocorreu um erro ao salvar as alterações.", variant: "destructive" });
    }
  };

  const simulateFileUpload = async (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
        
        if (progress >= 100) {
          clearInterval(interval);
          setUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[file.name];
            return newProgress;
          });
          resolve(true);
        }
      }, 200);
    });
  }

  const handleFiles = async (filesToUpload: File[]) => {
    // Upload já é tratado pelo FileUploadSection via Server Action
    // Não precisa fazer nada adicional aqui  
    devLog.log('[ExpandedProjectView] Upload de arquivos concluído via FileUploadSection:', filesToUpload.length);
  };

  /**
   * Recarrega os dados do projeto após upload
   */
  const refreshProjectAfterUpload = async () => {
    try {
      devLog.log('[ExpandedProjectView] Recarregando timeline após upload...');
      
      // Usar onUpdate para buscar dados atualizados do projeto
      // sem recarregar a página inteira
      if (onUpdate && project?.id) {
        // Buscar projeto atualizado e chamar onUpdate
        const { getProjectAction } = await import('@/lib/actions/project-actions');
        const result = await getProjectAction(project.id);
        
        if (result.data) {
          devLog.log('[ExpandedProjectView] Timeline atualizada com sucesso');
          setTimelineEvents(result.data.timelineEvents || []);
          setEditedProject(prev => ({
            ...prev,
            timelineEvents: result.data.timelineEvents || [],
            files: result.data.files || []
          }));
        }
      }
    } catch (error) {
      devLog.error('[ExpandedProjectView] Erro ao recarregar timeline:', error);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) return;
    handleFiles(Array.from(event.target.files));
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !user?.email) {
      if (!user?.email) {
        toast({
          title: "Erro ao adicionar comentário",
          description: "Você precisa estar autenticado para adicionar comentários.",
          variant: "destructive"
        });
      }
      return;
    }

    try {
      // ✅ CORRIGIDO: Usar addCommentAction ao invés de onUpdate
      const { addCommentAction } = await import('@/lib/actions/project-actions');
      
      // ✅ DEBUG: Verificar dados do usuário antes de enviar
      devLog.log('🔍 [handleAddComment] Dados do usuário completos:', {
        user: user,
        userId: user?.id,
        userEmail: user?.email,
        userRole: user?.role,
        profile: user?.profile,
        profileRole: user?.profile?.role,
        profileFullName: user?.profile?.full_name
      });
      
      // ✅ CORRIGIDO: Usar a estrutura correta do usuário Supabase
      const userForAction = {
        id: user.id,
        email: user.email!,
        name: user.profile?.full_name || user.email!,
        role: user.profile?.role || user.role || 'client'
      };
      
      devLog.log('🔍 [handleAddComment] Objeto user sendo enviado:', userForAction);
      
      const result = await addCommentAction(
        project.id,
        { 
          text: newComment,
          timestamp: new Date().toISOString()
        },
        userForAction
      );

      if (result.error) {
        throw new Error(result.error);
      }

      // ✅ CORREÇÃO: Após adicionar comentário, recarregar dados completos do projeto
      if (result.data && (result.data as any).commentAdded) {
        // Buscar dados atualizados usando a mesma lógica do upload
        const { getProjectAction } = await import('@/lib/actions/project-actions');
        const updatedProject = await getProjectAction(project.id);
        
        if (updatedProject.data) {
          devLog.log('[handleAddComment] Timeline atualizada com dados completos');
          setTimelineEvents(updatedProject.data.timelineEvents || []);
          setEditedProject(prev => ({
            ...prev,
            timelineEvents: updatedProject.data.timelineEvents || [],
            comments: updatedProject.data.comments || []
          }));
        }
      }
      
      setNewComment('');
      toast({
        title: "Comentário adicionado",
        description: "O comentário foi adicionado com sucesso.",
      });
    } catch (error) {
      devLog.error('Error adding comment:', error);
      toast({
        title: "Erro ao adicionar",
        description: "Ocorreu um erro ao adicionar o comentário.",
        variant: "destructive"
      });
    }
  };

  const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    const filesToHandle = Array.from(e.dataTransfer.files);
    handleFiles(filesToHandle);
  };

  const handleCommentUpdate = async () => {
    if (!editingComment || !user?.email) {
      toast({ title: "Erro ao atualizar", description: "Você precisa estar autenticado para editar comentários.", variant: "destructive" });
      return;
    }
    try {
      const updatedEvents = timelineEvents.map((event, i) => {
        if (i === editingComment.index) {
          return { ...event, content: editingComment.content, edited: true, timestamp: new Date().toISOString(), user: user!.profile?.full_name || user!.email!, userId: user!.id! };
        }
        return event;
      });
      const updatedProject: UpdatedProject = { id: project.id, timelineEvents: updatedEvents, };
      await onUpdate(updatedProject);
      setTimelineEvents(updatedEvents);
      setEditingComment(null);
      toast({ title: "Comentário atualizado", description: "O comentário foi atualizado com sucesso.", });
    } catch (error) {
      devLog.error('Error updating comment:', error);
      toast({ title: "Erro ao atualizar", description: "Ocorreu um erro ao atualizar o comentário.", variant: "destructive" });
    }
  };

  const handleAssumeResponsibility = async () => {
    if (!user || !project) return;
    const newAdminResponsible = {
        adminResponsibleId: user.id,
        adminResponsibleName: user.profile?.full_name || user.email || 'Admin',
        adminResponsibleEmail: user.email,
        adminResponsiblePhone: ''
    };
    const eventContent = `${user.profile?.full_name || user.email} assumiu a responsabilidade pelo projeto.`;
    const responsibilityEvent = createTimelineEvent('responsibility', { content: eventContent });
    const updatedProjectData: UpdatedProject = {
      id: project.id, ...newAdminResponsible,
      timelineEvents: [responsibilityEvent, ...timelineEvents]
    };
    try {
      await onUpdate(updatedProjectData);
      setEditedProject(prev => ({ ...prev, ...newAdminResponsible }));
      setTimelineEvents(updatedProjectData.timelineEvents);
      toast({ title: "Responsabilidade assumida", description: `Você agora é o responsável pelo projeto ${project.number}.`, });
    } catch (error) {
      devLog.error("Erro ao assumir responsabilidade:", error);
      toast({ title: "Erro", description: "Não foi possível assumir a responsabilidade.", variant: "destructive" });
  }
  };

  const createTimelineEvent = (type: TimelineEvent['type'] | 'responsibility', data: {
    content?: string;
    fileName?: string;
    fileUrl?: string;
    oldStatus?: string;
    newStatus?: string;
    edited?: boolean;
    subItems?: string[];
  }): TimelineEvent => {
    // ✅ DEBUG COMPLETO: Vamos ver TUDO que está no objeto user
    devLog.log('[DEBUG createTimelineEvent] OBJETO USER COMPLETO:', {
      user: user,
      hasUser: !!user,
      userKeys: user ? Object.keys(user) : 'no user',
      email: user?.email,
      profile: user?.profile,
      profileKeys: user?.profile ? Object.keys(user.profile) : 'no profile',
      fullName: user?.profile?.full_name,
      role: user?.profile?.role,
      userRole: user?.role,
      // Vamos ver se há outros campos que possam ter o nome
      allUserValues: user ? JSON.stringify(user, null, 2) : 'no user'
    });

    // ✅ SIMPLIFICAÇÃO EXTREMA: Se tem usuário logado, SEMPRE usar o nome dele
    let userDisplayName: string;
    if (user) {
      // Priorizar o nome do perfil, senão o email, senão "Usuário"
      userDisplayName = user.profile?.full_name || user.email || 'Usuário';
    } else {
      // Só usar "Sistema" quando realmente NÃO tem usuário logado
      userDisplayName = 'Sistema';
    }

    // Debug para ver o que está sendo usado
    devLog.log('[DEBUG createTimelineEvent] RESULTADO FINAL:', {
      hasUser: !!user,
      userEmail: user?.email,
      userFullName: user?.profile?.full_name,
      finalDisplayName: userDisplayName
    });

    const base: Omit<TimelineEvent, 'type' | 'content' | 'fileName' | 'fileUrl' | 'oldStatus' | 'newStatus' | 'edited' | 'subItems' | 'fullName'> & { type: TimelineEvent['type'], fullName?: string } = {
      type,
      user: userDisplayName, // ✅ Nome do usuário logado OU "Sistema" apenas se não há usuário
      userId: user?.id || 'system',
      timestamp: new Date().toISOString(),
      id: uuidv4(),
      fullName: userDisplayName, // ✅ Mesmo nome
    };

    switch (type) {
      case 'document':
        return { ...base, type, fileName: data.fileName!, fileUrl: data.fileUrl!, content: `Arquivo anexado: ${data.fileName}` };
      case 'comment':
        return { ...base, type, content: data.content!, edited: data.edited ?? false };
      case 'responsibility':
        return { ...base, type: 'responsibility' as any, content: data.content!, edited: data.edited ?? false };
      case 'status':
        return { ...base, type, oldStatus: data.oldStatus!, newStatus: data.newStatus!, content: `Status alterado de ${data.oldStatus} para ${data.newStatus}` };
      case 'checklist':
        return { ...base, type, content: data.content!, subItems: data.subItems ?? [] };
      case 'file': 
        return { ...base, type, fileName: data.fileName!, fileUrl: data.fileUrl!, content: `Arquivo: ${data.fileName}` };
      case 'info_update':
         return { ...base, type, content: data.content! };
      case 'file_upload': 
         return { ...base, type:'document', fileName: data.fileName!, fileUrl: data.fileUrl!, content: `Arquivo (upload): ${data.fileName}` };
      default:
        devLog.error(`Unhandled timeline event type: ${type}`);
        throw new Error(`Unhandled timeline event type: ${type}`);
    }
  };

  return (
    <div className="-m-6">
      {/* Header Azul Refatorado */}
      <div className="bg-blue-600 text-white shadow-md">
        <div className="px-6 py-6">
          {/* Linha Superior: Status e Atualização (Botão Voltar Removido) */}
          <div className="flex items-center justify-start space-x-3 mb-3">
            <span className="bg-white/25 text-xs font-semibold px-3 py-1.5 rounded-full backdrop-blur-sm">{editedProject.status}</span>
            <div className="flex items-center text-xs text-blue-100">
              {/* Ícone de relógio removido anteriormente, manter sem por enquanto */}
              <span>{`Atualizado ${new Date(editedProject.updatedAt instanceof Timestamp ? editedProject.updatedAt.toDate() : editedProject.updatedAt).toLocaleTimeString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`}</span>
            </div>
      </div>

          {/* Título Principal do Projeto */}
          <h1 className="text-3xl font-bold mb-1">Projeto {editedProject.nomeClienteFinal || 'Cliente Final'}</h1>
          <p className="text-sm text-blue-200">Número do projeto: {editedProject.number}</p>
        </div>
      </div>

      {/* Conteúdo Principal com Abas - Alinhado com outras páginas */}
      <div className="px-6 pt-6 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:w-[400px] bg-gray-200 dark:bg-gray-700 p-1 rounded-lg">
            <TabsTrigger value="visao-geral" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm data-[state=inactive]:text-gray-600 dark:data-[state=inactive]:text-gray-300">Visão Geral</TabsTrigger>
            <TabsTrigger value="linha-do-tempo" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm data-[state=inactive]:text-gray-600 dark:data-[state=inactive]:text-gray-300">Linha do Tempo</TabsTrigger>
          </TabsList>

          <TabsContent value="visao-geral" className="mt-6">
            <div className="space-y-8"> {/* Increased spacing */}
              
              {/* Detalhes do Projeto Card */}
              <Card className="shadow-lg rounded-lg">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
                    <CardTitle className="text-2xl font-semibold">Detalhes do Projeto</CardTitle>
                    <CardDescription>Informações gerais sobre o projeto.</CardDescription>
            </div>
                  {isAdminPanel && (
                    <Button 
                      onClick={() => {
                        devLog.log('[Debug EPV] Edit/Cancel button clicked. isEditing (before):', isEditing);
                        if (isEditing) { 
                          devLog.log('[Debug EPV] Canceling edit. Reverting editedProject and setting hasChanges to false.');
                          setEditedProject({ ...project }); 
                          setHasChanges(false);          
                        }
                        setIsEditing(prev => {
                          const newIsEditing = !prev;
                          devLog.log('[Debug EPV] Toggling isEditing to:', newIsEditing);
                          return newIsEditing;
                        });    
                      }} 
                      variant={isEditing ? "destructive" : "default"} 
                      className="ml-auto flex items-center">
                      <Edit className="mr-2 h-4 w-4" />
                      {isEditing ? "Cancelar Edição" : "Editar Projeto"}
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="p-6">
                  {isEditing ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
                        <Label htmlFor="number" className="text-sm font-medium text-gray-700">Número do Projeto</Label>
                        <Input id="number" value={editedProject.number || ''} onChange={(e) => handleChange('number', e.target.value)} className="mt-1"/>
            </div>
            <div>
                        <Label htmlFor="empresaIntegradora" className="text-sm font-medium text-gray-700">Empresa Integradora</Label>
                        <Input id="empresaIntegradora" value={editedProject.empresaIntegradora || ''} onChange={(e) => handleChange('empresaIntegradora', e.target.value)} className="mt-1"/>
            </div>
            <div>
                        <Label htmlFor="nomeClienteFinal" className="text-sm font-medium text-gray-700">Cliente Final</Label>
                        <Input id="nomeClienteFinal" value={editedProject.nomeClienteFinal || ''} onChange={(e) => handleChange('nomeClienteFinal', e.target.value)} className="mt-1"/>
            </div>
            <div>
                        <Label htmlFor="distribuidora" className="text-sm font-medium text-gray-700">Distribuidora</Label>
                        <Input id="distribuidora" value={editedProject.distribuidora || ''} onChange={(e) => handleChange('distribuidora', e.target.value)} className="mt-1"/>
            </div>
            <div>
                        <Label htmlFor="potencia" className="text-sm font-medium text-gray-700">Potência (kWp)</Label>
                        <Input id="potencia" type="number" value={editedProject.potencia || 0} onChange={(e) => handleChange('potencia', Number(e.target.value))} className="mt-1"/>
            </div>
            <div>
                        <Label htmlFor="valorProjeto" className="text-sm font-medium text-gray-700">Valor do Projeto (R$)</Label>
                        <Input id="valorProjeto" type="number" value={editedProject.valorProjeto || 0} onChange={(e) => handleChange('valorProjeto', Number(e.target.value))} className="mt-1"/>
            </div>

                      <div>
                        <Label htmlFor="pagamento" className="text-sm font-medium text-gray-700">Status Pagamento</Label>
                        <Select value={editedProject.pagamento || ''} onValueChange={(value) => handleChange('pagamento', value)}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione status do pagamento" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pendente">Pendente</SelectItem>
                            <SelectItem value="parcela1">1ª Parcela Paga</SelectItem>
                            <SelectItem value="pago">Totalmente Pago</SelectItem>
                            <SelectItem value="atrasado">Atrasado</SelectItem>
                            <SelectItem value="renegociado">Renegociado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="dataEntrega" className="text-sm font-medium text-gray-700">Data de Entrega</Label>
                        <Input 
                          id="dataEntrega" 
                          type="date" 
                          value={formatDateInputValue(editedProject.dataEntrega)} 
                          onChange={(e) => handleChange('dataEntrega', e.target.value)} 
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="status" className="text-sm font-medium text-gray-700">Status do Projeto</Label>
                        <Select value={editedProject.status} onValueChange={(value) => handleChange('status', value)}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione o status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Não Iniciado">Não Iniciado</SelectItem>
                  <SelectItem value="Em Desenvolvimento">Em Desenvolvimento</SelectItem>
                            <SelectItem value="Aguardando Assinaturas">Aguardando Assinaturas</SelectItem>
                            <SelectItem value="Em Homologação">Em Homologação</SelectItem>
                            <SelectItem value="Projeto Aprovado">Projeto Aprovado</SelectItem>
                            <SelectItem value="Aguardando Solicitar Vistoria">Aguardando Solicitar Vistoria</SelectItem>
                            <SelectItem value="Projeto Pausado">Projeto Pausado</SelectItem>
                            <SelectItem value="Em Vistoria">Em Vistoria</SelectItem>
                  <SelectItem value="Finalizado">Finalizado</SelectItem>
                            <SelectItem value="Cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
                        <Label htmlFor="prioridade" className="text-sm font-medium text-gray-700">Prioridade</Label>
                        <Select value={editedProject.prioridade} onValueChange={(value) => handleChange('prioridade', value)}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione a prioridade" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Baixa">Baixa</SelectItem>
                            <SelectItem value="Média">Média</SelectItem>
                            <SelectItem value="Alta">Alta</SelectItem>
                            <SelectItem value="Urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
                        <Label htmlFor="listaMateriais" className="text-sm font-medium text-gray-700">Lista de Material</Label>
                        <Textarea 
                          id="listaMateriais" 
                          value={editedProject.listaMateriais || ''} 
                          onChange={(e) => handleChange('listaMateriais', e.target.value)} 
                          className="mt-1 min-h-[120px] md:min-h-[160px] whitespace-pre-wrap" 
                          placeholder="Informe a lista de materiais..." 
                        />
            </div>
            <div>
                        <Label htmlFor="disjuntorPadraoEntrada" className="text-sm font-medium text-gray-700">Disjuntor do Padrão de Entrada</Label>
                        <Input id="disjuntorPadraoEntrada" value={editedProject.disjuntorPadraoEntrada || ''} onChange={(e) => handleChange('disjuntorPadraoEntrada', e.target.value)} className="mt-1" placeholder="Informe o disjuntor..." />
            </div>
          </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                      {/* Visualização Estilizada (Não Editável) */}
                      <DetailItem icon={<Building className="h-5 w-5 text-slate-700 dark:text-slate-300" />} label="Empresa Integradora" value={editedProject.empresaIntegradora} bgColor="bg-slate-100 dark:bg-slate-800/30" />
                      <DetailItem icon={<User className="h-5 w-5 text-purple-700 dark:text-purple-300" />} label="Cliente Final" value={editedProject.nomeClienteFinal} bgColor="bg-purple-100 dark:bg-purple-900/30" />
                      {/* Linha 2: Distribuidora | Potência */}
                      <DetailItem icon={<Building className="h-5 w-5 text-green-700 dark:text-green-300" />} label="Distribuidora" value={editedProject.distribuidora} bgColor="bg-green-100 dark:bg-green-900/30" />
                      <DetailItem icon={<ClockIcon className="h-5 w-5 text-yellow-700 dark:text-yellow-300" />} label="Potência (kWp)" value={`${editedProject.potencia || 0} kWp`} bgColor="bg-yellow-100 dark:bg-yellow-900/30" />

                      {/* Linha 3: Data de Criação | Data de Entrega */}
                      <DetailItem 
                        icon={<ClockIcon className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />} 
                        label="Data de Criação" 
                        value={editedProject.createdAt 
                          ? new Date(
                              // Compatível com string ISO ou Timestamp
                              (typeof editedProject.createdAt === 'string' 
                                ? editedProject.createdAt 
                                : (editedProject.createdAt as any))
                            ).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric'}) 
                          : 'N/A'} 
                        bgColor="bg-zinc-100 dark:bg-zinc-800/30" 
                      />
                      <DetailItem 
                        icon={<ClockIcon className="h-5 w-5 text-red-700 dark:text-red-300" />} 
                        label="Data de Entrega" 
                        value={formatDateBR(editedProject.dataEntrega)} 
                        bgColor="bg-red-100 dark:bg-red-900/30" 
                      />

                      {/* Linha 4: Disjuntor | Valor do Projeto */}
                      <DetailItem icon={<Settings className="h-5 w-5 text-violet-700 dark:text-violet-300" />} label="Disjuntor do Padrão de Entrada" value={editedProject.disjuntorPadraoEntrada || 'N/A'} bgColor="bg-violet-100 dark:bg-violet-900/30" />
                      <DetailItem icon={<DollarSign className="h-5 w-5 text-teal-700 dark:text-teal-300" />} label="Valor do Projeto" value={editedProject.valorProjeto !== undefined && editedProject.valorProjeto !== null ? `R$ ${Number(editedProject.valorProjeto).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'} bgColor="bg-teal-100 dark:bg-teal-900/30" />
                      {/* Linha 5: Lista de material ocupa a largura de duas colunas e suporta múltiplas linhas com rolagem leve */}
                      <div className="md:col-span-2">
                        <DetailItem 
                          icon={<FileIcon className="h-5 w-5 text-orange-700 dark:text-orange-300" />} 
                          label="Lista de Material" 
                          value={editedProject.listaMateriais || 'N/A'} 
                          bgColor="bg-orange-100 dark:bg-orange-900/30" 
                          multiline
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
                {isEditing && isAdminPanel && (
                  <CardFooter className="flex justify-end p-6 border-t">
                    <Button 
                      onClick={handleSave}
                      disabled={!hasChanges || isPending}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {isPending ? 'Salvando...' : 'Salvar Alterações'} 
                    </Button>
                  </CardFooter>
                )}
              </Card>

              {/* Card Status e Responsabilidade */}
              <Card className="shadow-lg rounded-lg">
                <CardHeader>
                  <CardTitle className="text-2xl font-semibold">Status do Projeto</CardTitle>
                  <CardDescription>Acompanhe o progresso e o responsável.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0 bg-blue-500 text-white rounded-full p-3 md:p-4 shadow-md">
                      <ClockIcon className="h-6 w-6 md:h-8 md:w-8" />
                    </div>
                    <div className="flex-grow">
                      <div>
                        <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status Atual</Label>
                        <p className="mt-0.5 text-lg md:text-xl font-semibold text-gray-900">{editedProject.status}</p>
                      </div>
                      {/* Mostrar prioridade apenas para administradores */}
                      {isAdminPanel && (
                        <div className="mt-2">
                          <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Prioridade</Label>
                          <p className={`mt-0.5 text-md font-semibold ${ 
                            editedProject.prioridade === 'Urgente' ? 'text-red-600' :
                            editedProject.prioridade === 'Alta' ? 'text-yellow-600' :
                            editedProject.prioridade === 'Média' ? 'text-blue-600' :
                            'text-gray-700'
                          }`}>
                            {editedProject.prioridade || 'N/A'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {editedProject.adminResponsibleName && (
                    <div className="pt-4 border-t border-gray-200">
                      <Label className="text-sm font-medium text-gray-700">Responsável Administrativo</Label>
                      <p className="mt-1 text-md text-gray-900">
                        {editedProject.adminResponsibleName}
                        {editedProject.adminResponsibleEmail && ` (${editedProject.adminResponsibleEmail})`}
                      </p>
                    </div>
                  )}

                  {isAdminPanel && (
                    <div className="pt-4">
                      {(!editedProject.adminResponsibleId || editedProject.adminResponsibleId !== user?.id) ? (
                        <Button 
                          onClick={handleAssumeResponsibility} 
                          className="w-full mt-2 bg-orange-500 hover:bg-orange-600 text-white py-2.5 font-semibold"
                          disabled={isPending}
                        >
                          <User className="mr-2 h-5 w-5" />
                          Assumir Responsabilidade
                        </Button>
                      ) : (
                        <p className="mt-1 text-sm text-green-700 font-semibold flex items-center">
                          <User className="mr-2 h-5 w-5 text-green-700" />
                          Você é o responsável por este projeto.
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="linha-do-tempo" className="mt-6">
            <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-gray-800">Linha do Tempo do Projeto</h2>
                <div className="flex space-x-3">
                  <Button 
                        variant="default" 
                        onClick={() => { setShowAddDocumentSection(prev => !prev); setShowAddCommentSection(false); }} 
                        className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md shadow-sm"
                    >
                        Adicionar Documentos
                  </Button>
                  <Button 
                        variant="default" 
                        onClick={() => { setShowAddCommentSection(prev => !prev); setShowAddDocumentSection(false); }} 
                        className="flex items-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md shadow-sm"
                  >
                        Adicionar Comentário
                  </Button>
            </div>
        </div>

            {showAddDocumentSection && (
                <Card className="mb-6 shadow-lg rounded-lg">
                    <CardHeader>
                        <CardTitle>Anexar Novos Documentos</CardTitle>
                        <CardDescription>Faça upload de arquivos relevantes para o projeto.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
            <ErrorBoundary>
              <FileUploadSection 
                project={editedProject}
                            onUpdate={async (uploadedFiles: File[]) => {
                                await handleFiles(uploadedFiles);
                                setShowAddDocumentSection(false);
                            }}
                            onUploadSuccess={refreshProjectAfterUpload}
              />
            </ErrorBoundary>
                    </CardContent>
                </Card>
            )}

            {showAddCommentSection && (
                <Card className="mb-6 shadow-lg rounded-lg">
                    <CardHeader>
                        <CardTitle>Adicionar Novo Comentário</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="flex space-x-3 items-start">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Escreva seu comentário aqui..."
                            className="flex-grow resize-none border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            rows={3}
                />
                <Button 
                            onClick={() => {
                                handleAddComment();
                                if (newComment.trim()) setShowAddCommentSection(false);
                            }}
                            disabled={!newComment.trim() || isPending}
                            className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md shadow-sm"
                          >
                            Enviar Comentário
                </Button>
              </div>
                    </CardContent>
                </Card>
            )}

            {/* Card do Histórico de Atualizações (Timeline Events) */}
            <Card className="shadow-lg rounded-lg">
                <CardHeader>
                    <CardTitle>Histórico de Atualizações</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="space-y-6"> {/* Usando space-y-6 para espaçamento entre eventos */}
                        {timelineEvents.length === 0 && (
                            <p className="text-gray-500 text-center py-4">Nenhum evento na linha do tempo ainda.</p>
                    )}
                        {timelineEvents.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((event, index) => {
                            let iconComponent: React.ReactNode;
                            let iconBgColor: string;

                            switch (event.type) {
                                case 'comment':
                                    iconComponent = <MessageIcon className="h-5 w-5 text-white" />;
                                    iconBgColor = 'bg-blue-500';
                                    break;
                                case 'responsibility':
                                    iconComponent = <User className="h-5 w-5 text-white" />;
                                    iconBgColor = 'bg-green-500';
                                    break;
                                case 'document':
                                case 'file_upload':
                                    iconComponent = <FileIcon className="h-5 w-5 text-white" />;
                                    iconBgColor = 'bg-orange-500';
                                    break;
                                case 'status':
                                    iconComponent = <ClockIcon className="h-5 w-5 text-white" />;
                                    iconBgColor = 'bg-purple-500';
                                    break;
                                case 'checklist':
                                case 'info_update': 
                                default:
                                    iconComponent = <Settings className="h-5 w-5 text-white" />;
                                    iconBgColor = 'bg-green-500';
                                    break;
                            }

                            return (
                                <div key={event.id || index} className="flex items-start space-x-3 p-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 shadow-sm">
                                    {/* Círculo do Ícone */}
                                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${iconBgColor}`}>
                                        {iconComponent}
                    </div>

                                    {/* Conteúdo do Evento Simplificado por enquanto */}
                                    <div className="flex-grow">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <span className="font-semibold text-gray-700 dark:text-gray-300 text-sm">
                                              {event.fullName || event.user || 'Usuário'}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                {new Date(event.timestamp).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"})}
                                                {event.edited && <span className="italic text-gray-400 ml-1">(editado)</span>}
                            </span>
                          </div>
                                        {/* A exibição detalhada do conteúdo (status, links, etc.) será refinada depois */}
                                        <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{event.content}</p>
                                        
                                        {/* Botões para eventos de arquivo (Download/Excluir) */}
                                        {((event.type === 'document' || event.type === 'file_upload' || event.fileName) && event.fileUrl) && (
                                          <div className="flex items-center space-x-2 mt-2">
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => {
                                                devLog.log('[Debug EPV] Download button clicked for file:', event.fileName);
                                                const link = document.createElement('a');
                                                link.href = event.fileUrl!;
                                                link.setAttribute('download', event.fileName || 'download');
                                                link.target = "_blank";
                                                link.rel = "noopener noreferrer";
                                                document.body.appendChild(link);
                                                link.click();
                                                document.body.removeChild(link);
                                              }}
                                              className="text-xs"
                                            >
                                              <Download className="mr-1 h-3 w-3" />
                                              Download
                                            </Button>
                                            {isAdminPanel && (
                                              <Button
                                                variant="outline" // Alterado para "outline" e adicionaremos classes para estilização destrutiva
                                                size="sm"
                                                onClick={() => {
                                                  devLog.log('[Debug EPV] Delete file button clicked. File event:', event);
                                                  const fileEntry = editedProject.files?.find(f => f.url === event.fileUrl);
                                                  setItemToDelete({ 
                                                    type: 'document',
                                                    eventId: event.id!,
                                                    fileName: event.fileName,
                                                    fileUrl: event.fileUrl,
                                                    filePath: fileEntry?.path 
                                                  });
                                                  setIsDeleteDialogOpen(true);
                                                }}
                                                className="text-xs text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700" // Estilo destrutivo para variant outline
                                              >
                                                <Trash2 className="mr-1 h-3 w-3" />
                                                Excluir
                                              </Button>
                                            )}
                                          </div>
                                        )}

                                        {/* Botões de Edição/Exclusão para Comentários (simplificado) */}
                                        {isAdminPanel && event.type === 'comment' && (event.userId === user?.id || event.user === (user?.profile?.full_name || user?.email)) && (
                                            <div className="flex items-center space-x-2 mt-2"> {/* Aumentado space-x-1 para space-x-2 e mt-1 para mt-2 para melhor espaçamento */}
                                                <Button 
                                                  variant="outline" 
                                                  size="sm" 
                                                  onClick={() => { 
                                                    devLog.log('[Debug EPV] Edit comment button clicked. Event:', event);
                                                    setEditingComment({ index, content: event.content! })
                                                  }} 
                                                  className="text-xs"
                                                >
                                                    <Edit className="mr-1 h-3 w-3" />
                                                    Editar
                                                </Button>
                                                <Button 
                                                  variant="outline" 
                                                  size="sm" 
                                                  onClick={() => { 
                                                    devLog.log('[Debug EPV] Delete comment button clicked. Event:', event);
                                                    setItemToDelete({ type: 'comment', eventId: event.id! }); 
                                                    setIsDeleteDialogOpen(true); 
                                                  }} 
                                                  className="text-xs text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700"
                                                >
                                                    <Trash2 className="mr-1 h-3 w-3" />
                                                    Excluir
                                                </Button>
                                            </div>
                                        )}
                                        {/* Formulário de edição de comentário (simplificado) */}
                                        {editingComment?.index === index && (
                                            <div className="mt-2 space-y-1">
                                                <Textarea value={editingComment.content} onChange={(e) => setEditingComment(prev => ({ ...prev!, content: e.target.value }))} className="min-h-[60px] text-sm"/>
                                                <div className="flex justify-end space-x-1">
                                                    <Button variant="ghost" size="sm" onClick={() => setEditingComment(null)} className="text-xs">Cancelar</Button>
                                                    <Button size="sm" onClick={handleCommentUpdate} className="bg-blue-500 hover:bg-blue-600 text-white text-xs">Salvar</Button>
                        </div>
                              </div>
                        )}
                      </div>
                    </div>
                            );
                        })}
                  </div>
                </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              {itemToDelete?.type === 'comment' 
                ? "Tem certeza que deseja excluir este comentário? Esta ação não pode ser desfeita."
                : `Tem certeza que deseja excluir o arquivo "${itemToDelete?.fileName || ''}"? Esta ação não pode ser desfeita.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              disabled={isDeleting}
              onClick={async () => {
                if (!itemToDelete || !user) {
                  toast({ title: "Erro", description: "Informações inválidas para exclusão.", variant: "destructive" });
                  return;
                }

                startDeleteTransition(async () => {
                  try {
                    let success = false;
                    let message = "";

                    if (itemToDelete.type === 'comment') {
                      const eventIdForLog = itemToDelete.eventId;
                      devLog.log('[Debug EPV] Preparing to delete comment. Event ID from timeline:', eventIdForLog);

                      // Lógica para extrair o ID real do comentário.
                      // Se o event.id da timeline já é o ID do comentário (ex: um UUID usado em ambos), ótimo.
                      // Se o event.id da timeline é "comment-[actualCommentId]", precisamos do [actualCommentId].
                      // Se o event.id da timeline é um UUID e o comment.id no array de comentários é outro, precisamos de um mapeamento ou de buscar o comentário pelo eventId.
                      
                      // Assumindo por enquanto que o eventId do timeline é o que a action precisa ou pode derivar.
                      // O problema maior parece ser a action não ser chamada ou falhar antes dos logs internos dela.
                      const commentIdToPass = itemToDelete.eventId; // Temporariamente, vamos passar o eventId diretamente e ver os logs do servidor.
                                                                // A deleteCommentAction precisará ser robusta para lidar com isso ou precisaremos ajustar aqui.

                      devLog.log('[Debug EPV] Calling deleteCommentAction with ProjectID:', project.id, 'commentIdToPass:', commentIdToPass);
                      try {
                        // ✅ CORRIGIDO: Usar mesma estrutura do usuário para deleteCommentAction
                        const userForAction = {
                          id: user.id,
                          uid: user.id, // Para compatibilidade
                          email: user.email,
                          role: user.role,
                          profile: (user as any).profile, // Incluir perfil completo
                          // ✅ NOVO: Incluir role do profile diretamente no objeto
                          profileRole: (user as any).profile?.role
                        } as any;
                        
                        devLog.log('[Debug EPV] Dados do usuário sendo enviados para deleteComment:', {
                          ...userForAction,
                          userRoleOriginal: user.role,
                          profileRole: (user as any).profile?.role,
                          hasProfile: !!(user as any).profile
                        });
                        
                        const result = await deleteCommentAction(project.id, commentIdToPass, userForAction);
                        devLog.log('[Debug EPV] deleteCommentAction result:', result);
                        if (result.error) throw new Error(result.error);
                        success = true;
                        message = result.message || "Comentário removido com sucesso.";
                        
                        setTimelineEvents(prev => prev.filter(event => event.id !== itemToDelete.eventId));
                        setEditedProject(prev => ({
                          ...prev,
                          // Se o array 'comments' usa o mesmo ID que o eventId da timeline (ou se commentIdToPass é o ID correto para o array comments)
                          comments: prev.comments?.filter(c => c.id !== commentIdToPass) 
                        }));
                      } catch (actionError) {
                        devLog.error('[Debug EPV] Error calling deleteCommentAction:', actionError);
                        throw actionError; // Re-throw para ser pego pelo catch externo
                      }

                    } else if (itemToDelete.type === 'document' && itemToDelete.fileUrl) {
                      devLog.log('[Debug EPV] Attempting to delete file. ProjectID:', project.id, 'FileUrl:', itemToDelete.fileUrl, 'FilePath:', itemToDelete.filePath);
                      if (!itemToDelete.filePath) { // Adicionada verificação de filePath
                        throw new Error("Caminho do arquivo (filePath) não encontrado para exclusão.");
                      }
                      
                      // ✅ DEBUG COMPLETO: Vamos ver TUDO antes de enviar
                      devLog.log('[Debug EPV] USER OBJECT COMPLETE ANALYSIS:', {
                        userObject: user,
                        hasUser: !!user,
                        userId: user?.id,
                        userEmail: user?.email,
                        userRole: user?.role,
                        userKeys: user ? Object.keys(user) : 'no user',
                        // Análise do profile
                        hasProfile: !!(user as any)?.profile,
                        profileObject: (user as any)?.profile,
                        profileRole: (user as any)?.profile?.role,
                        profileKeys: (user as any)?.profile ? Object.keys((user as any).profile) : 'no profile',
                        // Serializar para ver estrutura completa
                        fullUserSerialized: JSON.stringify(user, null, 2)
                      });
                      
                      // ✅ CORRIGIDO: Passar estrutura completa do usuário para deleteFileAction
                      const userForAction = {
                        id: user.id,
                        uid: user.id, // Para compatibilidade
                        email: user.email,
                        role: (user as any).profile?.role || user.role, // Priorizar role do profile
                        profile: (user as any).profile, // Incluir perfil completo
                        // ✅ NOVO: Incluir role do profile diretamente no objeto
                        profileRole: (user as any).profile?.role
                      } as any;
                      
                      devLog.log('[Debug EPV] Dados do usuário sendo enviados:', {
                        ...userForAction,
                        userRoleOriginal: user.role,
                        profileRole: (user as any).profile?.role,
                        hasProfile: !!(user as any).profile
                      });
                      
                      const result = await deleteFileAction(project.id, itemToDelete.filePath, itemToDelete.fileUrl, userForAction);
                      if (result.error) throw new Error(result.error);
                      success = true;
                      message = result.message || "Arquivo removido com sucesso.";

                      // ✅ MELHORADO: Atualizar UI localmente e depois fazer refresh
                      // 1. Remover evento da timeline local imediatamente
                      setTimelineEvents(prev => prev.filter(event => 
                        !(event.fileUrl === itemToDelete.fileUrl || 
                          event.id === itemToDelete.eventId)
                      ));
                      
                      // 2. Remover arquivo da lista local
                      setEditedProject(prev => ({
                        ...prev,
                        files: prev.files?.filter(f => f.url !== itemToDelete.fileUrl)
                      }));

                      // 3. Fazer refresh completo após um pequeno delay para sincronizar
                      setTimeout(async () => {
                        try {
                          await refreshProjectAfterUpload();
                        } catch (refreshError) {
                          devLog.log('[Debug EPV] Refresh após exclusão não executado:', refreshError);
                        }
                      }, 500);
                    }

                    if (success) {
                      toast({ title: "Sucesso", description: message });
                    }
                    
                  } catch (error) {
                    devLog.error('Error deleting item:', error);
                    toast({
                      title: "Erro ao excluir",
                      description: error instanceof Error ? error.message : "Ocorreu um erro ao excluir o item.",
                      variant: "destructive"
                    });
                  } finally {
                    setIsDeleteDialogOpen(false);
                    setItemToDelete(null);
                    // O estado isDeleting é resetado automaticamente pelo useTransition
                  }
                });
              }}
              className="bg-red-500 hover:bg-red-600"
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 