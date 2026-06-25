'use client';
import { useState, useEffect, useTransition } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
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
  Download,      // ✅ Ícone correto de download
  CreditCard,    // ✅ Para CPF/CNPJ
  MapPin,        // ✅ Para endereço
  Factory,       // ✅ Para distribuidora
  Zap,           // ✅ Para potência (raio)
  Plug,          // ✅ Para disjuntor (tomada)
  Clock,         // ✅ Para datas
  Lock,          // ✅ Para comentários internos
  Camera,        // 🎨 Para upload de imagens em comentários
  Archive,       // ✅ Para arquivar projeto
  Package,       // 📦 Para pacotes
  CalendarCheck, // 📅 Para assinaturas
  Info,          // ℹ️ Para mensagens informativas
  FileText,      // 📄 Para gerar procuração
  FileOutput,    // 📄 Para aba Gerar Projeto
  ClipboardCheck, // ✅ Para conferir informações do projeto
  CheckCircle2,  // ✅ Para indicar setup concluído
  Hash,          // # Para número da UC
  Eye,           // 👁 Para visualizar arquivo
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
import { uploadProjectFileAction } from '@/lib/actions/file-actions'
import { ErrorBoundary } from "@/components/error-boundary"
import { v4 as uuidv4 } from 'uuid'
import { calculateProjectCost } from "@/lib/utils/projectUtils"
import { resetAllForms } from '@/lib/utils/reset'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getProjectStatuses, ProjectStatusInfo } from '@/lib/services/kanbanService'
// ❌ FIREBASE - REMOVIDO: import { Timestamp } from 'firebase/firestore'
import { deleteCommentAction, deleteFileAction, editProjectAction } from '@/lib/actions/project-actions'
import { ProjectResponsibleAdmin } from './project-view/project-responsible-admin'
import { calculateSLAExpiration } from '@/lib/utils/sla-calculator'
import { GenerateProcuracaoModal } from '@/components/modals/GenerateProcuracaoModal'
import { MemorialDescritivoPreview, type CargaRow } from '@/components/templates/MemorialDescritivoPreview'
import { AnexoFCPFLPreview } from '@/components/templates/AnexoFCPFLPreview'
import { AnexoECPFLPreview } from '@/components/templates/AnexoECPFLPreview'
import { FormularioRegistroANEELPreview } from '@/components/templates/FormularioRegistroANEELPreview'
import { FormularioSolicitacaoPreview } from '@/components/templates/FormularioSolicitacaoPreview'
import { DiagramaBlocosPreview } from '@/components/templates/DiagramaBlocosPreview'
import { DiagramaUnifilarPreview } from '@/components/templates/DiagramaUnifilarPreview'
import { PlantaSituacaoPreview } from '@/components/templates/PlantaSituacaoPreview'
import { ConferirInformacoesModal, useConferirProgress } from '@/components/modals/ConferirInformacoesModal'
import { SetupProjetoModal, SETUP_DEFAULTS } from '@/components/modals/SetupProjetoModal'
import type { SetupProjetoData } from '@/components/modals/SetupProjetoModal'
import { getConfiguracaoGeral } from '@/lib/services/configService.supabase'

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

// Lista de distribuidoras de energia
const DISTRIBUIDORAS = [
  "Enel",
  "Copel",
  "Cemig",
  "CPFL",
  "Neoenergia Cosern",
  "Light",
  "EDP",
  "Celesc",
  "Energisa",
  "Equatorial",
  "RGE",
  "Amazonas Energia",
  "Outro"
];

export interface ExpandedProjectViewProps {
  project: Project;
  onClose: () => void;
  onUpdate: (project: UpdatedProject) => Promise<void>;
  currentUserEmail?: string;
  // ✅ MELHORIA UX: Props para controlar abertura automática
  autoExpand?: boolean;
  focusSection?: string;
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
      {icon && <span className="mr-2 mt-0.5 flex-shrink-0 text-gray-700 dark:text-gray-300">{icon}</span>}
      <div className="flex-1 min-w-0">
        <p
          className={[
            'text-gray-900 dark:text-gray-100 font-bold w-full',
            multiline ? 'text-base md:text-lg whitespace-pre-wrap break-words leading-relaxed max-h-60 overflow-y-auto overflow-x-hidden custom-scrollbar pr-2' : 'text-lg md:text-xl truncate'
          ].join(' ')}
        >
          {value || 'N/A'}
        </p>
      </div>
    </div>
  </div>
);

export const ExpandedProjectView = ({
  project,
  onClose,
  onUpdate,
  currentUserEmail,
  autoExpand = false,
  focusSection = 'overview'
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

  // Função para formatar CPF/CNPJ com pontuação
  const formatCpfCnpj = (value: string | undefined): string => {
    if (!value) return '';
    const numbers = value.replace(/\D/g, '');

    if (numbers.length === 11) {
      // CPF: 000.000.000-00
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (numbers.length === 14) {
      // CNPJ: 00.000.000/0000-00
      return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }

    // Se não tiver 11 ou 14 dígitos, retorna sem formatação
    return value;
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

  // ✅ Obter permissões do usuário
  const userPermissions = user?.permissions || (user?.profile as any)?.permissions || {};

  // ✅ CORREÇÃO ROLE: Verificar admin, superadmin OU colaborador com permissão de editar
  const isFullAdmin = user?.role === 'admin' ||
                      user?.role === 'superadmin' ||
                      user?.profile?.role === 'admin' ||
                      user?.profile?.role === 'superadmin';

  const isSuperAdmin = user?.role === 'superadmin' || user?.profile?.role === 'superadmin';

  const canGerarProjeto = isFullAdmin ||
    user?.role === 'colaborador' ||
    user?.profile?.role === 'colaborador';

  const isColaboradorWithEditPermission = (
    user?.role === 'colaborador' ||
    user?.profile?.role === 'colaborador'
  ) && userPermissions.can_edit_projects === true;

  // Usuario tem acesso ao painel admin se for admin completo OU colaborador com permissão
  const isAdminPanel = (isFullAdmin || isColaboradorWithEditPermission) &&
                       user?.role !== 'client' &&
                       user?.role !== 'cliente'
  
  // ✅ DEBUG: Verificar dados do usuário e role
  devLog.log('🔍 [EXPANDED PROJECT VIEW] Dados do usuário:', {
    user: user,
    hasUser: !!user,
    userRole: user?.role,
    userEmail: user?.email,
    userProfile: user?.profile,
    profileRole: user?.profile?.role,
    userPermissions: userPermissions,
    isFullAdmin,
    isColaboradorWithEditPermission,
    isAdminPanel,
    roleChecks: {
      isAdmin: user?.role === 'admin',
      isSuperAdmin: user?.role === 'superadmin',
      isColaborador: user?.role === 'colaborador',
      profileIsAdmin: user?.profile?.role === 'admin',
      profileIsSuperAdmin: user?.profile?.role === 'superadmin',
      profileIsColaborador: user?.profile?.role === 'colaborador',
      canEditProjects: userPermissions.can_edit_projects,
      isClient: user?.role === 'client',
      isCliente: user?.role === 'cliente',
      finalIsAdminPanel: isAdminPanel
    }
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
    nome_cliente_final: project.nome_cliente_final,
    valorProjeto: project.valorProjeto === undefined ? null : project.valorProjeto,
    pagamento: project.pagamento,

    // 💳 BILLING: Preservar campos de faturamento
    billing_mode: project.billing_mode || 'avulso',
    billing_snapshot: project.billing_snapshot || null,

    listaMateriais: project.listaMateriais,
    disjuntorPadraoEntrada: project.disjuntorPadraoEntrada,
    cpf_cnpj_cliente_final: project.cpf_cnpj_cliente_final,
    endereco_local: project.endereco_local,
    numero_uc: project.numero_uc,
    havera_beneficiarias: project.havera_beneficiarias || false,

    // ✅ PROCURAÇÃO: Campos de cidade e estado do cliente
    client_city: project.client_city,
    client_state: project.client_state
  })

  // ✅ PROCURAÇÃO: Sincronizar editedProject com project quando campos específicos mudarem
  useEffect(() => {
    setEditedProject(prev => ({
      ...prev,
      client_city: project.client_city,
      client_state: project.client_state,
      cpf_cnpj_cliente_final: project.cpf_cnpj_cliente_final,
      endereco_local: project.endereco_local,
      numero_uc: project.numero_uc,
      distribuidora: project.distribuidora,
      nome_cliente_final: project.nome_cliente_final
    }));
  }, [
    project.client_city,
    project.client_state,
    project.cpf_cnpj_cliente_final,
    project.endereco_local,
    project.distribuidora,
    project.nome_cliente_final
  ]);

  const [newComment, setNewComment] = useState('')
  const [commentVisibility, setCommentVisibility] = useState<'all' | 'internal'>('all')
  const [commentImages, setCommentImages] = useState<File[]>([])
  const [commentImagePreviews, setCommentImagePreviews] = useState<string[]>([])
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>(
    project.timelineEvents || []
  );

  // 🎨 Handler para adicionar imagens aos comentários
  const handleCommentImageSelect = (files: File[]) => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length === 0) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione apenas arquivos de imagem.",
        variant: "destructive"
      });
      return;
    }

    // Limitar a 5 imagens por comentário
    const maxImages = 5;
    if (commentImages.length + imageFiles.length > maxImages) {
      toast({
        title: "Limite de imagens",
        description: `Você pode adicionar no máximo ${maxImages} imagens por comentário.`,
        variant: "destructive"
      });
      return;
    }

    // Validar tamanho (máximo 10MB por imagem)
    const maxSize = 10 * 1024 * 1024;
    const oversizedFiles = imageFiles.filter(file => file.size > maxSize);
    if (oversizedFiles.length > 0) {
      toast({
        title: "Arquivo muito grande",
        description: "Cada imagem deve ter no máximo 10MB.",
        variant: "destructive"
      });
      return;
    }

    // Criar previews
    const newPreviews: string[] = [];
    imageFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          newPreviews.push(e.target.result as string);
          if (newPreviews.length === imageFiles.length) {
            setCommentImagePreviews(prev => [...prev, ...newPreviews]);
          }
        }
      };
      reader.readAsDataURL(file);
    });

    setCommentImages(prev => [...prev, ...imageFiles]);
  };

  // 🎨 Handler para remover imagem do preview
  const handleRemoveCommentImage = (index: number) => {
    setCommentImages(prev => prev.filter((_, i) => i !== index));
    setCommentImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  // 🎨 Handler para paste de imagens (Ctrl+V)
  const handleCommentPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) imageFiles.push(file);
      }
    }

    if (imageFiles.length > 0) {
      e.preventDefault();
      handleCommentImageSelect(imageFiles);
    }
  };

  // 🎨 Handler para drag and drop de imagens
  const handleCommentDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleCommentDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const files = Array.from(e.dataTransfer.files);
    handleCommentImageSelect(files);
  };
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({})
  const [isDragging, setIsDragging] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<DeleteItem | null>(null);
  const [editingComment, setEditingComment] = useState<EditingComment | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem(`project-tab-${project.id}`) || 'visao-geral';
    }
    return 'visao-geral';
  });
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`project-tab-${project.id}`, activeTab);
    }
  }, [activeTab, project.id]);
  const [showAddDocumentSection, setShowAddDocumentSection] = useState(false);
  const [showAddCommentSection, setShowAddCommentSection] = useState(false);
  const [showBeneficiariasUploadSection, setShowBeneficiariasUploadSection] = useState(false);
  const [showProcuracaoModal, setShowProcuracaoModal] = useState(false);
  const [selectedDistribuidoraGerarProjeto, setSelectedDistribuidoraGerarProjeto] = useState(project.distribuidora || '');
  const [showConferirModal, setShowConferirModal] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [activeTemplatePreview, setActiveTemplatePreview] = useState<string | null>(null);
  const [gerarProjetoFields, setGerarProjetoFields] = useState({
    nomeClienteFinal: project.nomeClienteFinal || project.nome_cliente_final || '',
    cpf_cnpj_cliente_final: project.cpf_cnpj_cliente_final || '',
    endereco_local: project.endereco_local || '',
    client_city: project.client_city || '',
    client_state: project.client_state || '',
    distribuidora: project.distribuidora || '',
    potencia: project.potencia || 0,
    disjuntorPadraoEntrada: project.disjuntorPadraoEntrada || '',
    listaMateriais: project.listaMateriais || '',
    havera_beneficiarias: project.havera_beneficiarias,
    tipo_conexao: (project as any).tipo_conexao || '',
    tipo_ramal: (project as any).tipo_ramal || '',
    tensao_atendimento: (project as any).tensao_atendimento || '',
    coord_utm_fuso: (project as any).coord_utm_fuso || '',
    coord_utm_x: (project as any).coord_utm_x || '',
    coord_utm_y: (project as any).coord_utm_y || '',
    modulos_quantidade: (project as any).modulos_quantidade || 0,
    modulos_fabricante: (project as any).modulos_fabricante || '',
    modulos_modelo: (project as any).modulos_modelo || '',
    inversores_quantidade: (project as any).inversores_quantidade || 0,
    inversores_fabricante: (project as any).inversores_fabricante || '',
    inversores_modelo: (project as any).inversores_modelo || '',
    inversores_potencia: (project as any).inversores_potencia || '',
    inversores_tensao: (project as any).inversores_tensao || '',
    modulos_potencia_wp: (project as any).modulos_potencia_wp || '',
    conta_contrato: (project as any).conta_contrato || '',
    classe_uc: (project as any).classe_uc || '',
    numero_poste_transformador: (project as any).numero_poste_transformador || '',
    numero_condutores_fase: (project as any).numero_condutores_fase || 0,
    secao_fase_rl_mm2: (project as any).secao_fase_rl_mm2 || '',
    secao_neutro_rl_mm2: (project as any).secao_neutro_rl_mm2 || '',
    secao_fase_mm2: (project as any).secao_fase_mm2 || '',
    secao_neutro_mm2: (project as any).secao_neutro_mm2 || '',
    disjuntor_polos: (project as any).disjuntor_polos || 0,
    disjuntor_corrente_a: (project as any).disjuntor_corrente_a || '',
    disjuntor_tensao_v: (project as any).disjuntor_tensao_v || '',
    tipo_fornecimento: (project as any).tipo_fornecimento || '',
    modalidade_compensacao: (project as any).modalidade_compensacao || '',
    planta_situacao_url: (project as any).planta_situacao_url || '',
    caixa_medicao_id: (project as any).caixa_medicao_id || '',
    caixa_medicao_imagem_url: (project as any).caixa_medicao_imagem_url || '',
    caixa_medicao_nome: (project as any).caixa_medicao_nome || '',
    caixa_medicao_comprimento_mm: (project as any).caixa_medicao_comprimento_mm || '',
    caixa_medicao_altura_mm: (project as any).caixa_medicao_altura_mm || '',
    caixa_medicao_largura_mm: (project as any).caixa_medicao_largura_mm || '',
    responsavel_nome: (project as any).responsavel_nome || '',
    responsavel_profissao: (project as any).responsavel_profissao || '',
    responsavel_registro: (project as any).responsavel_registro || '',
    data_documento: (project as any).data_documento || '',
    secao_aterramento_mm2: (project as any).secao_aterramento_mm2 || '',
    // Formulário de Solicitação de Acesso
    cliente_cep: (project as any).cliente_cep || '',
    cliente_email: (project as any).cliente_email || '',
    cliente_celular: (project as any).cliente_celular || '',
    cliente_telefone_fixo: (project as any).cliente_telefone_fixo || '',
    responsavel_legal_nome: (project as any).responsavel_legal_nome || '',
    responsavel_legal_telefone: (project as any).responsavel_legal_telefone || '',
    responsavel_legal_email: (project as any).responsavel_legal_email || '',
    tipo_solicitacao: (project as any).tipo_solicitacao || '',
    tarifa_branca: (project as any).tarifa_branca || 'NÃO',
    possui_cargas_especiais: (project as any).possui_cargas_especiais || 'NÃO',
    carga_declarada_kw: (project as any).carga_declarada_kw || '',
    potencia_disponibilizada_kw: (project as any).potencia_disponibilizada_kw || '',
    data_inicio_operacao: (project as any).data_inicio_operacao || '',
    modulos_area_m2: (project as any).modulos_area_m2 || '',
    inversores_faixa_tensao: (project as any).inversores_faixa_tensao || '',
    inversores_corrente_nominal: (project as any).inversores_corrente_nominal || '',
    inversores_fator_potencia: (project as any).inversores_fator_potencia || '',
    inversores_rendimento: (project as any).inversores_rendimento || '',
    inversores_dht_corrente: (project as any).inversores_dht_corrente || '',
    disjuntor_ca_corrente_a: (project as any).disjuntor_ca_corrente_a || '',
    disjuntor_quadro_ca_corrente_a: (project as any).disjuntor_quadro_ca_corrente_a || '',
    disjuntor_quadro_ca_polos: (project as any).disjuntor_quadro_ca_polos || '',
    cabo_quadro_ca_secao_mm2: (project as any).cabo_quadro_ca_secao_mm2 || '',
    cabo_quadro_ca_capacidade_corrente_a: (project as any).cabo_quadro_ca_capacidade_corrente_a || '',
    cabo_quadro_ca_fator_temperatura: (project as any).cabo_quadro_ca_fator_temperatura || '',
    cabo_quadro_ca_fator_agrupamento: (project as any).cabo_quadro_ca_fator_agrupamento || '',
    // Campos de inversores adicionados recentemente
    inversores_quantidade_mppt: (project as any).inversores_quantidade_mppt || '',
    inversores_entradas_por_mppt: (project as any).inversores_entradas_por_mppt || '',
    inversores_potencia_max_saida: (project as any).inversores_potencia_max_saida || '',
    inversores_tensao_max_ca: (project as any).inversores_tensao_max_ca || '',
    inversores_tensao_min_ca: (project as any).inversores_tensao_min_ca || '',
    inversores_tipo_conexao_saida: (project as any).inversores_tipo_conexao_saida || '',
    tipo_conexao_rede_ca: (project as any).tipo_conexao_rede_ca || '',
    disjuntor_ca_polos: (project as any).disjuntor_ca_polos || '',
    modulos_total_strings: (project as any).modulos_total_strings || '',
    modulos_microinversor: (project as any).modulos_microinversor || '',
    modulos_strings_modulos: (project as any).modulos_strings_modulos || '',
    carga_levantamento: (project as any).carga_levantamento || '',
    responsavel_email: (project as any).responsavel_email || '',
    responsavel_uf: (project as any).responsavel_uf || '',
    // Parâmetros elétricos dos módulos
    modulos_voc: (project as any).modulos_voc || '',
    modulos_isc: (project as any).modulos_isc || '',
    modulos_vpmp: (project as any).modulos_vpmp || '',
    modulos_ipmp: (project as any).modulos_ipmp || '',
    // Parâmetros CC dos inversores
    inversores_vcc_max: (project as any).inversores_vcc_max || '',
    inversores_icc_max: (project as any).inversores_icc_max || '',
    inversores_vpmp_max: (project as any).inversores_vpmp_max || '',
    inversores_vpmp_min: (project as any).inversores_vpmp_min || '',
    inversores_vcc_partida: (project as any).inversores_vcc_partida || '',
    // Características físicas dos módulos (Tabela 4)
    modulos_eficiencia: (project as any).modulos_eficiencia || '',
    modulos_comprimento_m: (project as any).modulos_comprimento_m || '',
    modulos_largura_m: (project as any).modulos_largura_m || '',
    modulos_area_unitaria_m2: (project as any).modulos_area_unitaria_m2 || '',
    modulos_peso_kg: (project as any).modulos_peso_kg || '',
    // Dimensionamento dos Cabos
    cabo_isolacao_material: (project as any).cabo_isolacao_material || '',
    cabo_cc_secao_mm2: (project as any).cabo_cc_secao_mm2 || '',
    cabo_cc_capacidade_corrente_a: (project as any).cabo_cc_capacidade_corrente_a || '',
    cabo_cc_fator_temperatura: (project as any).cabo_cc_fator_temperatura || '',
    cabo_cc_fator_agrupamento: (project as any).cabo_cc_fator_agrupamento || '',
    cabo_ca_secao_mm2: (project as any).cabo_ca_secao_mm2 || '',
    cabo_ca_capacidade_corrente_a: (project as any).cabo_ca_capacidade_corrente_a || '',
    cabo_ca_fator_temperatura: (project as any).cabo_ca_fator_temperatura || '',
    cabo_ca_fator_agrupamento: (project as any).cabo_ca_fator_agrupamento || '',
    // Setup do Projeto
    setup_padrao_entrada: (project as any).setup_padrao_entrada || SETUP_DEFAULTS.setup_padrao_entrada,
    setup_quadro_cc: (project as any).setup_quadro_cc || SETUP_DEFAULTS.setup_quadro_cc,
    setup_mais_de_um_inversor: (project as any).setup_mais_de_um_inversor || SETUP_DEFAULTS.setup_mais_de_um_inversor,
    setup_tipo_inversor: (project as any).setup_tipo_inversor || SETUP_DEFAULTS.setup_tipo_inversor,
    setup_total_inversores: (project as any).setup_total_inversores || SETUP_DEFAULTS.setup_total_inversores,
    setup_configuracao_saidas: (project as any).setup_configuracao_saidas || SETUP_DEFAULTS.setup_configuracao_saidas,
    setup_tipo_transformador: (project as any).setup_tipo_transformador || '',
    setup_potencia_transformador: (project as any).setup_potencia_transformador || '',
    setup_concluido: (project as any).setup_concluido || '',
    modulos_lista: (project as any).modulos_lista || '',
    inversores_lista: (project as any).inversores_lista || '',
    planta_situacao_config: (project as any).planta_situacao_config || '',
  });
  const conferirProgress = useConferirProgress(gerarProjetoFields);
  const [numBeneficiarias, setNumBeneficiarias] = useState(2);
  const [selectedBeneficiariaFiles, setSelectedBeneficiariaFiles] = useState<{[key: string]: File | null}>({});
  const [uploadingBeneficiaria, setUploadingBeneficiaria] = useState<string | null>(null);
  const [percentuaisBeneficiarias, setPercentuaisBeneficiarias] = useState<{[key: string]: string}>({});
  const isPending = false; // Placeholder
  const [isSessionChecking, setIsSessionChecking] = useState(false);
  const [availableStatuses, setAvailableStatuses] = useState<ProjectStatusInfo[]>([]);
  const [statusLoading, setStatusLoading] = useState(true);
  const [isDeleting, startDeleteTransition] = useTransition();

  // 🖼️ Estado para modal de ampliação de imagem
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

  // 🆕 Estados para proprietários do projeto
  const [owners, setOwners] = useState<Array<{ id: string; name: string; email: string; companyName?: string; isCompany?: boolean }>>([]);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>('');
  const [loadingOwners, setLoadingOwners] = useState(false);
  const [organizationName, setOrganizationName] = useState<string>('');
  const [ownerSearchQuery, setOwnerSearchQuery] = useState<string>(''); // 🆕 Query de busca de proprietários

  // 🗑️ Estados para arquivar projeto
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  // 🆕 Inicializar selectedOwnerId quando owners for carregado
  useEffect(() => {
    const currentOwnerId = project.owner_id || project.userId || '';
    setSelectedOwnerId(currentOwnerId);
    devLog.log('[ExpandedProjectView] Owner ID inicializado:', currentOwnerId);
  }, [project.owner_id, project.userId]);

  // Logo da empresa — estado separado para não contaminar os campos do projeto
  const [logoEmpresaUrl, setLogoEmpresaUrl] = useState('');
  useEffect(() => {
    getConfiguracaoGeral().then((config) => {
      if (config?.logoEmpresaUrl) setLogoEmpresaUrl(config.logoEmpresaUrl);
    }).catch(() => {});
  }, []);

  // 🆕 Função para obter o nome do proprietário atual
  const getCurrentOwnerName = (): string => {
    // O empresaIntegradora já vem calculado dinamicamente do backend
    // baseado no owner_id, então podemos confiar nele
    return project.empresaIntegradora || 'N/A';
  };

  // Carregar status dinâmicos do tenant
  useEffect(() => {
    const loadStatuses = async () => {
      try {
        setStatusLoading(true);
        const statuses = await getProjectStatuses();
        setAvailableStatuses(statuses);
        devLog.log('[ExpandedProjectView] Status carregados:', statuses.length);
      } catch (error) {
        devLog.error('[ExpandedProjectView] Erro ao carregar status:', error);
        // Em caso de erro, usar status padrão
        setAvailableStatuses([
          { id: '1', name: 'Não Iniciado', slug: 'nao-iniciado', color: '#3b82f6', order: 1, isDefault: true, projectCount: 0 },
          { id: '2', name: 'Em Desenvolvimento', slug: 'em-desenvolvimento', color: '#f59e0b', order: 2, isDefault: true, projectCount: 0 },
          { id: '3', name: 'Finalizado', slug: 'finalizado', color: '#10b981', order: 10, isDefault: true, projectCount: 0 }
        ]);
      } finally {
        setStatusLoading(false);
      }
    };

    loadStatuses();
  }, []);

  // 🆕 Carregar lista de proprietários (admin + clientes) - apenas para admins
  useEffect(() => {
    const loadOwners = async () => {
      if (!isAdminPanel) return;

      setLoadingOwners(true);
      try {
        // Buscar clientes
        const clientsResponse = await fetch('/api/admin/clients', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (clientsResponse.ok) {
          const clientsResult = await clientsResponse.json();
          const mappedClients = (clientsResult.data || []).map((client: any) => ({
            id: client.id,
            name: client.name,
            email: client.email,
            companyName: client.company_name,
            isCompany: client.is_company // 🔧 Incluir is_company
          }));
          setOwners(mappedClients);
        }

        // Buscar nome da organização
        const orgResponse = await fetch('/api/tenant/organization', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (orgResponse.ok) {
          const orgResult = await orgResponse.json();
          if (orgResult.success && orgResult.data?.name) {
            setOrganizationName(orgResult.data.name);
          }
        }
      } catch (error) {
        devLog.error('[ExpandedProjectView] Erro ao buscar proprietários:', error);
      } finally {
        setLoadingOwners(false);
      }
    };

    loadOwners();
  }, [isAdminPanel]);

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

  // ✅ MELHORIA UX: Auto-expandir e focar em seção específica quando vem de notificação
  useEffect(() => {
    if (autoExpand && focusSection) {
      devLog.log('[ExpandedProjectView] Auto-expand ativado:', {
        autoExpand,
        focusSection
      });
      
      // Definir aba ativa baseada na seção
      const tabMapping: Record<string, string> = {
        'comments': 'timeline',
        'documents': 'documentos',
        'status': 'visao-geral',
        'overview': 'visao-geral'
      };
      
      const targetTab = tabMapping[focusSection] || 'visao-geral';
      setActiveTab(targetTab);
      
      // Scroll suave para a seção após um pequeno delay
      setTimeout(() => {
        let targetElement: HTMLElement | null = null;
        
        switch (focusSection) {
          case 'comments':
            targetElement = document.getElementById('timeline-section');
            break;
          case 'documents':
            targetElement = document.getElementById('documents-section');
            break;
          case 'status':
            targetElement = document.getElementById('status-section');
            break;
          default:
            targetElement = document.getElementById('project-overview');
        }
        
        if (targetElement) {
          targetElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
          
          devLog.log('[ExpandedProjectView] Scroll para seção:', focusSection);
        }
      }, 500); // Delay para garantir que o componente renderizou
    }
  }, [autoExpand, focusSection]);

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

      // ✅ DETECTAR MUDANÇA DE PROPRIETÁRIO
      const ownerChanged = (project.owner_id || project.userId) !== selectedOwnerId;

      devLog.log('🔍 [EXPANDED PROJECT DEBUG] Verificando mudanças:', {
        originalStatus: project.status,
        newStatus: editedProject.status,
        statusChanged,
        originalOwner: project.owner_id || project.userId,
        newOwner: selectedOwnerId,
        ownerChanged,
        user: user,
        userProfileFullName: user?.profile?.full_name,
        userEmail: user?.email
      });

      // ✅ CALCULAR SLA se o status mudou
      let slaExpiresAt: string | null = null;
      let slaExpired = false;
      const now = new Date();

      if (statusChanged) {
        // Buscar informações do novo status
        const newStatusInfo = availableStatuses.find(s => s.slug === editedProject.status);

        if (newStatusInfo?.slaDays && newStatusInfo.slaDays > 0) {
          const expirationDate = calculateSLAExpiration(
            now,
            newStatusInfo.slaDays,
            newStatusInfo.slaExcludeWeekends !== undefined ? newStatusInfo.slaExcludeWeekends : true
          );
          slaExpiresAt = expirationDate.toISOString();
          slaExpired = false;

          devLog.log('✅ [EXPANDED PROJECT] SLA calculado:', {
            status: editedProject.status,
            slaDays: newStatusInfo.slaDays,
            excludeWeekends: newStatusInfo.slaExcludeWeekends,
            statusChangedAt: now.toISOString(),
            slaExpiresAt
          });
        } else {
          devLog.log('ℹ️ [EXPANDED PROJECT] Sem SLA configurado para o novo status:', editedProject.status);
        }
      }

      let updateEvent: TimelineEvent;

      if (statusChanged && ownerChanged) {
        // Se status E proprietário mudaram, criar evento combinado
        const statusName = availableStatuses.find(s => s.slug === editedProject.status)?.name || editedProject.status;
        const oldStatusName = availableStatuses.find(s => s.slug === project.status)?.name || project.status;
        const slaDays = availableStatuses.find(s => s.slug === editedProject.status)?.slaDays;

        const newOwnerName = selectedOwnerId === user.id
          ? (organizationName || 'Minha Empresa')
          : (owners.find(o => o.id === selectedOwnerId)?.companyName || owners.find(o => o.id === selectedOwnerId)?.name || 'Novo proprietário');

        updateEvent = createTimelineEvent('status', {
          content: `Status alterado de "${oldStatusName}" para "${statusName}"${slaExpiresAt && slaDays ? ` (Prazo: ${slaDays} dia${slaDays !== 1 ? 's' : ''})` : ''}. Projeto transferido para ${newOwnerName}.`,
          oldStatus: project.status,
          newStatus: editedProject.status
        });
        devLog.log('✅ [EXPANDED PROJECT] Criado evento de STATUS CHANGE + TRANSFER:', updateEvent);
      } else if (statusChanged) {
        // Se apenas o status mudou
        const statusName = availableStatuses.find(s => s.slug === editedProject.status)?.name || editedProject.status;
        const oldStatusName = availableStatuses.find(s => s.slug === project.status)?.name || project.status;
        const slaDays = availableStatuses.find(s => s.slug === editedProject.status)?.slaDays;

        updateEvent = createTimelineEvent('status', {
          content: `Status alterado de "${oldStatusName}" para "${statusName}"${slaExpiresAt && slaDays ? ` (Prazo: ${slaDays} dia${slaDays !== 1 ? 's' : ''})` : ''}`,
          oldStatus: project.status,
          newStatus: editedProject.status
        });
        devLog.log('✅ [EXPANDED PROJECT] Criado evento de STATUS CHANGE:', updateEvent);
      } else if (ownerChanged) {
        // Se apenas o proprietário mudou
        const newOwnerName = selectedOwnerId === user.id
          ? (organizationName || 'Minha Empresa')
          : (owners.find(o => o.id === selectedOwnerId)?.companyName || owners.find(o => o.id === selectedOwnerId)?.name || 'Novo proprietário');

        updateEvent = createTimelineEvent('comment', {
          content: `Projeto transferido para ${newOwnerName}.`
        });
        devLog.log('✅ [EXPANDED PROJECT] Criado evento de TRANSFER:', updateEvent);
      } else {
        // Se não houve mudança significativa, criar evento genérico
        updateEvent = createTimelineEvent('comment', {
          content: 'Informações do projeto atualizadas.'
        });
        devLog.log('✅ [EXPANDED PROJECT] Criado evento de ATUALIZAÇÃO GERAL:', updateEvent);
      }

      const projectToUpdate: UpdatedProject = {
        ...editedProject,
        timelineEvents: [updateEvent, ...timelineEvents],
        // ✅ Adicionar owner_id se foi alterado
        owner_id: selectedOwnerId,
        // ✅ Adicionar campos SLA se o status mudou
        ...(statusChanged && {
          status_changed_at: now.toISOString(),
          sla_expires_at: slaExpiresAt,
          sla_expired: slaExpired
        })
      };

      await onUpdate(projectToUpdate);
      devLog.log('[Debug EPV] handleSave: setting hasChanges to false and isEditing to false.');
      setHasChanges(false);
      setIsEditing(false);
      setTimelineEvents(prevEvents => [updateEvent, ...prevEvents]);

      let successMessage = "As alterações foram salvas com sucesso.";
      if (statusChanged && ownerChanged) {
        successMessage = `Status alterado e projeto transferido com sucesso.`;
      } else if (statusChanged) {
        successMessage = `Status alterado para "${availableStatuses.find(s => s.slug === editedProject.status)?.name || editedProject.status}" com sucesso.`;
      } else if (ownerChanged) {
        successMessage = "Projeto transferido com sucesso.";
      }

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
   * Função helper para renderizar o conteúdo do evento com badge colorido para unidades
   * 🎨 Atualizada para exibir imagens inline nos comentários
   */
  const renderEventContent = (content: string, event?: TimelineEvent) => {
    // Regex para detectar padrão: Arquivo "[Unidade Beneficiaria XX - YY%] nome.pdf" foi enviado
    const regex = /Arquivo\s+"?\[(.*?)\]\s+([^"]+)"?\s+(.*)/;
    const match = content.match(regex);

    if (match) {
      const labelPart = match[1]; // Ex: "Unidade Beneficiaria 01 - 30%"
      const fileName = match[2]; // Ex: "Pacotes.png"
      const action = match[3]; // Ex: "foi enviado."

      // Determinar se é beneficiária ou geradora
      const isBeneficiaria = labelPart.includes('Unidade Beneficiaria');
      const isGeradora = labelPart.includes('Fatura da Unidade Geradora');

      if (isBeneficiaria || isGeradora) {
        const badgeColor = isBeneficiaria
          ? 'bg-purple-600 text-white'
          : 'bg-green-600 text-white';

        return (
          <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
            <span className={`inline-block px-2 py-1 rounded-md text-xs font-semibold ${badgeColor} mr-2`}>
              {labelPart}
            </span>
            {fileName} {action}
          </p>
        );
      }
    }

    // Se não corresponder ao padrão, retornar conteúdo normal
    return (
      <div>
        {/* 🎨 Renderizar texto apenas se existir */}
        {content && content.trim() && (
          <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{content}</p>
        )}

        {/* 🎨 Renderizar imagens inline se existirem */}
        {event?.images && event.images.length > 0 && (
          <div className={content && content.trim() ? "mt-3 grid grid-cols-2 md:grid-cols-3 gap-2" : "grid grid-cols-2 md:grid-cols-3 gap-2"}>
            {event.images.map((imageUrl, idx) => (
              <div key={idx} className="relative group bg-gray-50 rounded-md border border-gray-200">
                <img
                  src={imageUrl}
                  alt={`Imagem ${idx + 1}`}
                  className="w-full h-48 object-contain rounded-md cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setEnlargedImage(imageUrl)}
                />
                {/* Ícone de expandir ao hover */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 rounded-md transition-all flex items-center justify-center pointer-events-none">
                  <span className="text-gray-700 bg-white/90 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium shadow-sm">
                    Clique para ampliar
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  /**
   * Função para upload de faturas de unidades beneficiárias
   */
  const handleBeneficiariaUpload = async (file: File, label: string) => {
    try {
      setUploadingBeneficiaria(label);
      devLog.log('[ExpandedProjectView] Iniciando upload de fatura beneficiária:', { fileName: file.name, label });

      // Validar arquivo
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        toast({
          title: "Tipo de arquivo não permitido",
          description: "Por favor, envie apenas PDF, Word ou imagens (JPG, PNG).",
          variant: "destructive"
        });
        setUploadingBeneficiaria(null);
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "Arquivo muito grande",
          description: "O arquivo deve ter no máximo 10MB.",
          variant: "destructive"
        });
        setUploadingBeneficiaria(null);
        return;
      }

      // Preparar dados do usuário para o upload
      const uploadUser = {
        id: user?.id || '',
        email: user?.email || '',
        role: user?.role || 'cliente'
      };

      // Criar FormData com o arquivo e incluir label no nome
      const formData = new FormData();
      // Criar novo arquivo com nome customizado que inclui o label (sem acentuação)
      const labelSemAcentuacao = label
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, ''); // Remove acentos

      // Adicionar percentual ao nome se existir
      const percentual = percentuaisBeneficiarias[label];
      const labelComPercentual = percentual
        ? `${labelSemAcentuacao} - ${percentual}%`
        : labelSemAcentuacao;

      const customFileName = `[${labelComPercentual}] ${file.name}`;
      const renamedFile = new File([file], customFileName, { type: file.type });
      formData.append('file', renamedFile);

      // Fazer upload do arquivo usando a action
      const result = await uploadProjectFileAction(
        editedProject.id,
        formData,
        uploadUser
      );

      if (!result.success) {
        throw new Error(result.error || 'Erro ao fazer upload do arquivo');
      }

      devLog.log('[ExpandedProjectView] Upload de fatura beneficiária concluído:', result);

      toast({
        title: "Upload concluído",
        description: `${label} enviada com sucesso!`,
        className: "bg-green-500 text-white"
      });

      // Limpar arquivo selecionado
      setSelectedBeneficiariaFiles(prev => ({ ...prev, [label]: null }));

      // Recarregar timeline
      await refreshProjectAfterUpload();

    } catch (error) {
      devLog.error('[ExpandedProjectView] Erro ao fazer upload de fatura beneficiária:', error);
      toast({
        title: "Erro ao fazer upload",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao fazer upload do arquivo.",
        variant: "destructive"
      });
    } finally {
      setUploadingBeneficiaria(null);
    }
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
          // Garantir que permanecemos na aba Linha do Tempo após upload/exclusão de documento
          setActiveTab('linha-do-tempo');
          if (typeof window !== 'undefined') {
            sessionStorage.setItem(`project-tab-${project.id}`, 'linha-do-tempo');
          }
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
    // 🎨 Validação: Precisa ter texto OU imagens
    if ((!newComment.trim() && commentImages.length === 0) || !user?.email) {
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
      // 🎨 PASSO 1: Upload das imagens inline (se houver)
      let uploadedImageUrls: string[] = [];

      if (commentImages.length > 0) {
        devLog.log('🎨 [handleAddComment] Fazendo upload de imagens inline:', commentImages.length);

        // Importar a nova função de upload de imagens inline
        const { uploadCommentImageAction } = await import('@/lib/actions/file-actions');

        const userForUpload = {
          id: user.id,
          email: user.email!,
          role: user.role || user.profile?.role || 'client'
        };

        for (const imageFile of commentImages) {
          // Criar FormData para enviar o arquivo
          const formData = new FormData();
          formData.append('file', imageFile);

          const uploadResult = await uploadCommentImageAction(
            project.id,
            formData,
            userForUpload
          );

          if (uploadResult.success && uploadResult.data?.publicUrl) {
            uploadedImageUrls.push(uploadResult.data.publicUrl);
            devLog.log('🎨 [handleAddComment] Imagem inline uploaded:', uploadResult.data.publicUrl);
          } else {
            devLog.error('🎨 [handleAddComment] Erro no upload da imagem:', uploadResult.error);
            throw new Error(uploadResult.error || 'Erro ao fazer upload da imagem');
          }
        }
      }

      // 🎨 PASSO 2: Adicionar comentário com URLs das imagens
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

      // ✅ CORREÇÃO CRÍTICA: Não usar Service Role Client no frontend
      // Usar dados do usuário da sessão diretamente
      const actualRole = user.role || user.profile?.role || 'client';
      const actualName = user.profile?.full_name || user.profile?.name || user.email!;

      const userForAction = {
        id: user.id,
        email: user.email!,
        name: actualName,
        role: actualRole
      };

      devLog.log('🔍 [handleAddComment] Dados do usuário para action:', {
        roleFromSession: user.role,
        roleFromProfile: user.profile?.role,
        actualRoleUsed: actualRole,
        userForAction,
        projectCreatedBy: project.userId || project.created_by,
        isUserTheProjectOwner: user.id === (project.userId || project.created_by),
        hasImages: uploadedImageUrls.length > 0,
        imageUrls: uploadedImageUrls
      });

      // 🎨 Incluir URLs das imagens no comentário
      const result = await addCommentAction(
        project.id,
        {
          text: newComment.trim() || '', // Garantir string vazia se não houver texto
          timestamp: new Date().toISOString(),
          visibility: commentVisibility,
          images: uploadedImageUrls.length > 0 ? uploadedImageUrls : undefined
        },
        userForAction
      );

      if (result.error) {
        throw new Error(result.error);
      }

      // ✅ CORREÇÃO: Sempre recarregar dados completos do projeto após adicionar comentário
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

      // 🎨 Limpar estados
      setNewComment('');
      setCommentVisibility('all'); // Reset para padrão
      setCommentImages([]);
      setCommentImagePreviews([]);

      toast({
        title: "Comentário adicionado",
        description: uploadedImageUrls.length > 0
          ? `Comentário com ${uploadedImageUrls.length} imagem(ns) adicionado com sucesso.`
          : "O comentário foi adicionado com sucesso.",
      });
    } catch (error) {
      devLog.error('🎨 [handleAddComment] Erro completo:', error);
      const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro ao adicionar o comentário.';
      toast({
        title: "Erro ao adicionar",
        description: errorMessage,
        variant: "destructive"
      });

      // Limpar imagens em caso de erro
      setCommentImages([]);
      setCommentImagePreviews([]);
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

  // ✅ REMOVIDO: handleAssumeResponsibility - agora usa o componente ProjectResponsibleAdmin
  const handleProjectUpdate = async (updatedProject: Partial<Project>) => {
    try {
      // Atualizar estado local
      setEditedProject(prev => ({ ...prev, ...updatedProject }));

      // Chamar callback de atualização do pai
      await onUpdate(updatedProject);

      toast({
        title: "Projeto atualizado",
        description: "As informações do projeto foram atualizadas com sucesso.",
      });

    } catch (error) {
      devLog.error("Erro ao atualizar projeto:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível atualizar o projeto.",
        variant: "destructive"
      });
    }
  };

  const handleSaveConferirModal = async (updatedFields: Record<string, any>) => {
    const { _plantaFile, _autoSave, ...fieldsToSave } = updatedFields;

    if (_plantaFile && _plantaFile instanceof File) {
      try {
        const { createTenantHeaders } = await import('@/lib/utils/tenant-helper');
        const tenantHeaders = await createTenantHeaders(user!.id);
        const formData = new FormData();
        formData.append('file', _plantaFile);
        formData.append('projectId', project.id);
        formData.append('type', 'planta_situacao');

        const resp = await fetch('/api/upload-project-image', {
          method: 'POST',
          headers: { 'x-tenant-id': tenantHeaders['x-tenant-id'] || '' },
          body: formData,
        });
        if (resp.ok) {
          const data = await resp.json();
          fieldsToSave.planta_situacao_url = data.url;
        }
      } catch (err) {
        devLog.error("Erro ao fazer upload da planta de situação:", err);
      }
    }

    devLog.log('[ConferirModal] Salvando via API dedicada. Campos:', Object.keys(fieldsToSave));

    const resp = await fetch(`/api/projects/${project.id}/conferir-info`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: fieldsToSave }),
    });

    const result = await resp.json();
    devLog.log('[ConferirModal] Resultado da API:', result);

    if (!result.success) {
      const debugInfo = result.debug
        ? `\n\nColunas faltantes: ${result.debug.missingColumns?.join(', ') || 'nenhuma'}\nCampos tentados: ${result.debug.attemptedFields?.join(', ') || '?'}`
        : '';
      devLog.error('[ConferirModal] Erro ao salvar:', result.error, result.debug);
      toast({
        title: "Erro ao salvar",
        description: `${result.error}${debugInfo}`,
        variant: "destructive",
        duration: 15000,
      });
      throw new Error(result.error);
    }

    if (result.debug?.missingColumns?.length > 0) {
      toast({
        title: "Atenção: colunas não encontradas",
        description: `As seguintes colunas não existem no banco: ${result.debug.missingColumns.join(', ')}. Execute o script SQL.`,
        variant: "destructive",
        duration: 15000,
      });
    }

    setGerarProjetoFields(prev => ({ ...prev, ...fieldsToSave }));
    setEditedProject(prev => ({ ...prev, ...fieldsToSave }));
    setSelectedDistribuidoraGerarProjeto(fieldsToSave.distribuidora || selectedDistribuidoraGerarProjeto);

    if (!_autoSave) {
      toast({
        title: "Progresso salvo",
        description: `${result.debug?.savedFields?.length || 0} campos salvos no banco de dados.`,
      });
    }
  };

  const handleSaveSetup = async (data: SetupProjetoData) => {
    const resp = await fetch(`/api/projects/${project.id}/setup`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: data }),
    });
    const result = await resp.json();
    devLog.log('[SetupModal] Resultado da API /setup:', result);

    if (!result.success) {
      devLog.error('[SetupModal] Erro ao salvar:', result);
      const desc = result.missingColumns?.length > 0
        ? `Colunas faltantes no banco: ${result.missingColumns.join(', ')}. Execute o script scripts/add-setup-projeto-fields.sql no Supabase.`
        : result.error || 'Não foi possível salvar. Tente novamente.';
      toast({
        title: 'Erro ao salvar setup',
        description: desc,
        variant: 'destructive',
        duration: 20000,
      });
      return;
    }

    setGerarProjetoFields(prev => ({ ...prev, ...data }));
    setEditedProject(prev => ({ ...prev, ...data }));
    toast({ title: 'Setup salvo', description: `${result.savedFields?.length || 0} campos salvos no banco de dados.` });
  };

  // 🗑️ Função para arquivar projeto
  const handleArchiveProject = async () => {
    try {
      setIsArchiving(true);
      const { createTenantHeaders } = await import('@/lib/utils/tenant-helper');
      const headers = await createTenantHeaders(user!.id);

      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
        headers,
      });

      if (response.ok) {
        const projectName = editedProject.nomeClienteFinal || editedProject.name || project.nomeClienteFinal || project.name || 'Sem nome';

        toast({
          title: "Projeto arquivado",
          description: `O projeto "${projectName}" foi arquivado com sucesso.`,
        });

        setShowArchiveDialog(false);

        // Fechar modal e disparar evento para atualizar a lista do Kanban
        onClose();

        // Disparar evento customizado para o Kanban atualizar
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('project-archived', {
            detail: { projectId: project.id }
          }));
        }
      } else {
        throw new Error('Erro ao arquivar projeto');
      }
    } catch (error) {
      devLog.error('[ExpandedProjectView] Erro ao arquivar projeto:', error);
      toast({
        title: "Erro",
        description: "Não foi possível arquivar o projeto.",
        variant: "destructive",
      });
    } finally {
      setIsArchiving(false);
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
      fullName: user?.profile?.name,
      role: user?.profile?.role,
      userRole: user?.role,
      // Vamos ver se há outros campos que possam ter o nome
      allUserValues: user ? JSON.stringify(user, null, 2) : 'no user'
    });

    // ✅ SIMPLIFICAÇÃO EXTREMA: Se tem usuário logado, SEMPRE usar o nome dele
    let userDisplayName: string;
    if (user) {
      // Priorizar o nome do perfil, senão o email, senão "Usuário"
      userDisplayName = user.profile?.name || user.email || 'Usuário';
    } else {
      // Só usar "Sistema" quando realmente NÃO tem usuário logado
      userDisplayName = 'Sistema';
    }

    // Debug para ver o que está sendo usado
    devLog.log('[DEBUG createTimelineEvent] RESULTADO FINAL:', {
      hasUser: !!user,
      userEmail: user?.email,
      userFullName: user?.profile?.name,
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
      {/* Conteúdo Principal com Abas - Alinhado com outras páginas */}
      <div className="px-6 pt-2 space-y-6">
        {/* Header Azul Refatorado com bordas arredondadas */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg rounded-2xl overflow-hidden">
          <div className="px-6 py-6">
            {/* Linha Superior: Status e Atualização (Botão Voltar Removido) */}
            <div className="flex items-center justify-start space-x-3 mb-3">
              <div className="bg-white/25 text-xs font-semibold px-3 py-1.5 rounded-full backdrop-blur-sm flex items-center gap-1.5">
                {availableStatuses.length > 0 && (() => {
                  const currentStatus = availableStatuses.find(s => s.slug === editedProject.status);
                  if (currentStatus) {
                    return (
                      <>
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: currentStatus.color }}
                        />
                        {currentStatus.name}
                      </>
                    );
                  }
                  return editedProject.status;
                })()}
                {availableStatuses.length === 0 && editedProject.status}
              </div>
              <div className="flex items-center text-xs text-blue-100">
                {/* Ícone de relógio removido anteriormente, manter sem por enquanto */}
                <span>{`Atualizado ${new Date(editedProject.updatedAt instanceof Date ? editedProject.updatedAt : editedProject.updatedAt).toLocaleTimeString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`}</span>
              </div>
            </div>

            {/* Título Principal do Projeto */}
            <h1 className="text-3xl font-bold mb-1">Projeto {editedProject.nomeClienteFinal || 'Cliente Final'}</h1>
            <p className="text-sm text-blue-200">Número do projeto: {editedProject.number}</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex space-x-2 mb-6">
            <button
              onClick={() => setActiveTab('visao-geral')}
              className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeTab === 'visao-geral'
                  ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              Visão Geral
            </button>
            <button
              onClick={() => setActiveTab('linha-do-tempo')}
              className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeTab === 'linha-do-tempo'
                  ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              Linha do Tempo
            </button>
            {canGerarProjeto && (
              <button
                onClick={() => setActiveTab('gerar-projeto')}
                className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2 ${
                  activeTab === 'gerar-projeto'
                    ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <FileOutput className="h-4 w-4" />
                Gerar Projeto
              </button>
            )}
          </div>

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
                    <div className="ml-auto flex items-center gap-2">
                      <Button
                        onClick={() => setShowArchiveDialog(true)}
                        variant="outline"
                        className="flex items-center bg-white text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700 hover:border-red-400 dark:bg-gray-800 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20 dark:hover:text-red-300 transition-all duration-200">
                        <Archive className="mr-2 h-4 w-4" />
                        Arquivar
                      </Button>
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
                        className={`flex items-center transition-all duration-200 ${
                          isEditing
                            ? ''
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}>
                        <Edit className="mr-2 h-4 w-4" />
                        {isEditing ? "Cancelar Edição" : "Editar Projeto"}
                      </Button>
                    </div>
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
                        <Label htmlFor="owner" className="text-sm font-medium text-gray-700">Proprietário do Projeto</Label>
                        <Select
                          value={selectedOwnerId}
                          onValueChange={(value) => {
                            setSelectedOwnerId(value);
                            setHasChanges(true);
                          }}
                          disabled={loadingOwners}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder={loadingOwners ? "Carregando..." : "Selecione o proprietário"} />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            {/* Opção: Minha Empresa */}
                            <SelectItem value={user.id}>
                              {organizationName || 'Minha Empresa'}
                            </SelectItem>

                            {/* 🆕 Campo de busca */}
                            {owners.length > 0 && (
                              <div className="px-2 py-2 sticky top-0 bg-white border-b border-gray-200">
                                <div className="relative">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                  </svg>
                                  <Input
                                    type="text"
                                    placeholder="Buscar por empresa ou cliente..."
                                    value={ownerSearchQuery}
                                    onChange={(e) => setOwnerSearchQuery(e.target.value)}
                                    className="h-9 pl-9 pr-3 text-xs border-gray-300"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                              </div>
                            )}

                            {/* Opções: Clientes filtrados */}
                            {owners
                              .filter((owner) => {
                                const query = ownerSearchQuery.toLowerCase().trim();
                                if (!query) return true;

                                const nameMatch = owner.name?.toLowerCase().includes(query);
                                const companyMatch = owner.companyName?.toLowerCase().includes(query);

                                return nameMatch || companyMatch;
                              })
                              .map((owner) => (
                                <SelectItem key={owner.id} value={owner.id}>
                                  {/* 🆕 INVERSÃO: Empresa primeiro, Nome entre parênteses */}
                                  {owner.isCompany && owner.companyName ? (
                                    <>
                                      {owner.companyName} ({owner.name})
                                    </>
                                  ) : (
                                    owner.name
                                  )}
                                  {' - '}{owner.email}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
            </div>
            <div>
                        <Label htmlFor="nomeClienteFinal" className="text-sm font-medium text-gray-700">Cliente Final</Label>
                        <Input id="nomeClienteFinal" value={editedProject.nomeClienteFinal || ''} onChange={(e) => handleChange('nomeClienteFinal', e.target.value)} className="mt-1"/>
            </div>
            {/* ✅ NOVO CAMPO: CPF/CNPJ */}
            <div>
                        <Label htmlFor="cpf_cnpj_cliente_final" className="text-sm font-medium text-gray-700">CPF/CNPJ Cliente Final</Label>
                        <Input id="cpf_cnpj_cliente_final" value={editedProject.cpf_cnpj_cliente_final || ''} onChange={(e) => handleChange('cpf_cnpj_cliente_final', e.target.value)} className="mt-1" placeholder="000.000.000-00" maxLength={20}/>
            </div>
            {/* CAMPO: Número da UC */}
            <div>
                        <Label htmlFor="numero_uc" className="text-sm font-medium text-gray-700">Número da UC</Label>
                        <Input id="numero_uc" value={(editedProject as any).numero_uc || ''} onChange={(e) => handleChange('numero_uc', e.target.value)} className="mt-1" placeholder="Ex: 1234567890"/>
            </div>
            {/* ✅ NOVO CAMPO: Endereço */}
            <div>
                        <Label htmlFor="endereco_local" className="text-sm font-medium text-gray-700">Endereço do Local</Label>
                        <Input id="endereco_local" value={editedProject.endereco_local || ''} onChange={(e) => handleChange('endereco_local', e.target.value)} className="mt-1" placeholder="Rua, Número - Bairro - Cidade/UF"/>
            </div>
            <div>
                        <Label htmlFor="distribuidora" className="text-sm font-medium text-gray-700">Distribuidora</Label>
                        <Select
                          value={editedProject.distribuidora || ''}
                          onValueChange={(value) => handleChange('distribuidora', value)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Selecione uma distribuidora" />
                          </SelectTrigger>
                          <SelectContent>
                            {DISTRIBUIDORAS.map((distribuidora) => (
                              <SelectItem key={distribuidora} value={distribuidora}>
                                {distribuidora}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Selecione o status" />
                          </SelectTrigger>
                          <SelectContent>
                            {statusLoading ? (
                              <SelectItem value="" disabled>Carregando status...</SelectItem>
                            ) : (
                              availableStatuses
                                .sort((a, b) => a.order - b.order)
                                .map((status) => (
                                  <SelectItem key={status.id} value={status.slug}>
                                    <div className="flex items-center gap-2">
                                      <div
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: status.color }}
                                      />
                                      {status.name}
                                    </div>
                                  </SelectItem>
                                ))
                            )}
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
            {/* 🆕 CAMPO: Compensação de Créditos */}
            <div>
              <Label htmlFor="compensacao" className="text-sm font-medium text-gray-700">Compensação de Créditos</Label>
              <Select
                value={editedProject.havera_beneficiarias ? 'sim' : 'nao'}
                onValueChange={(value) => handleChange('havera_beneficiarias', value === 'sim')}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione se haverá compensação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sim">Sim</SelectItem>
                  <SelectItem value="nao">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
                        <Label htmlFor="disjuntorPadraoEntrada" className="text-sm font-medium text-gray-700">Disjuntor do Padrão de Entrada</Label>
                        <Input id="disjuntorPadraoEntrada" value={editedProject.disjuntorPadraoEntrada || ''} onChange={(e) => handleChange('disjuntorPadraoEntrada', e.target.value)} className="mt-1" placeholder="Informe o disjuntor..." />
            </div>
            <div className="md:col-span-2 lg:col-span-3">
                        <Label htmlFor="listaMateriais" className="text-sm font-medium text-gray-700">Lista de Material</Label>
                        <Textarea
                          id="listaMateriais"
                          value={editedProject.listaMateriais || ''}
                          onChange={(e) => handleChange('listaMateriais', e.target.value)}
                          className="mt-1 min-h-[120px] md:min-h-[160px] whitespace-pre-wrap"
                          placeholder="Informe a lista de materiais..."
                        />
            </div>
          </div>
                  ) : (
                    <div className="space-y-8">
                      {/* 📋 SEÇÃO: INFORMAÇÕES DO CLIENTE */}
                      <div className="rounded-2xl bg-white dark:bg-gray-800 shadow-xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="bg-gradient-to-r from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700 px-6 py-4">
                          <h3 className="text-xl font-bold text-white flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-full">
                              <User className="h-5 w-5 text-white" />
                            </div>
                            Informações do Cliente
                          </h3>
                        </div>
                        <div className="p-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                              <div className="bg-white dark:bg-gray-900 p-5 rounded-lg shadow-lg border-2 border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-200">
                                <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-2 block">Cliente Final</span>
                                <div className="flex items-center gap-3">
                                  <User className="h-6 w-6 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{editedProject.nomeClienteFinal}</p>
                                </div>
                              </div>
                            </div>
                            {editedProject.cpf_cnpj_cliente_final && (
                              <div className="bg-white dark:bg-gray-900 p-5 rounded-lg shadow-lg border-2 border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-200">
                                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2 block">CPF/CNPJ</span>
                                <div className="flex items-center gap-3">
                                  <CreditCard className="h-6 w-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatCpfCnpj(editedProject.cpf_cnpj_cliente_final)}</p>
                                </div>
                              </div>
                            )}
                            {(editedProject as any).numero_uc && (
                              <div className="bg-white dark:bg-gray-900 p-5 rounded-lg shadow-lg border-2 border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-200">
                                <span className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 mb-2 block">Número da UC</span>
                                <div className="flex items-center gap-3">
                                  <Hash className="h-6 w-6 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
                                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{(editedProject as any).numero_uc}</p>
                                </div>
                              </div>
                            )}
                            {editedProject.endereco_local && (
                              <div className="bg-white dark:bg-gray-900 p-5 rounded-lg shadow-lg border-2 border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-200">
                                <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-2 block">Endereço do Local</span>
                                <div className="flex items-center gap-3">
                                  <MapPin className="h-6 w-6 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                                  <p className="text-base font-bold text-gray-900 dark:text-gray-100">{editedProject.endereco_local}</p>
                                </div>
                              </div>
                            )}
                            <div className="bg-white dark:bg-gray-900 p-5 rounded-lg shadow-lg border-2 border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-200">
                              <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-2 block">Compensação de Créditos</span>
                              <div className="flex items-center gap-3">
                                <Zap className="h-6 w-6 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                                {editedProject.havera_beneficiarias ? (
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200">
                                    Sim
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                                    Não
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className={editedProject.cpf_cnpj_cliente_final || editedProject.endereco_local ? "" : "md:col-span-2"}>
                              <div className="bg-white dark:bg-gray-900 p-5 rounded-lg shadow-lg border-2 border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-200">
                                <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2 block">Proprietário do Projeto</span>
                                <div className="flex items-center gap-3">
                                  <Building className="h-6 w-6 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{getCurrentOwnerName()}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* ⚡💰📅 SEÇÃO: INFORMAÇÕES TÉCNICAS, FINANCEIRAS E DATAS */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* ⚡ Informações Técnicas */}
                        <div className="rounded-2xl bg-white dark:bg-gray-800 shadow-xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
                          <div className="bg-gradient-to-r from-teal-500 to-teal-600 dark:from-teal-600 dark:to-teal-700 px-4 py-3">
                            <h4 className="text-base font-bold text-white uppercase tracking-wide flex items-center gap-2">
                              <div className="p-1.5 bg-white/20 rounded-full">
                                <Settings className="h-4 w-4 text-white" />
                              </div>
                              Técnico
                            </h4>
                          </div>
                          <div className="p-4">
                            <div className="space-y-3">
                              <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow-lg border-2 border-gray-200 dark:border-gray-700">
                                <span className="text-xs font-bold uppercase tracking-wider text-green-600 dark:text-green-400 block mb-1.5">Distribuidora</span>
                                <div className="flex items-center gap-2">
                                  <Factory className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                                  <p className="text-base font-bold text-gray-900 dark:text-gray-100">{editedProject.distribuidora || 'N/A'}</p>
                                </div>
                              </div>
                              <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow-lg border-2 border-gray-200 dark:border-gray-700">
                                <span className="text-xs font-bold uppercase tracking-wider text-yellow-600 dark:text-yellow-400 block mb-1.5">Potência</span>
                                <div className="flex items-center gap-2">
                                  <Zap className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                                  <p className="text-base font-bold text-gray-900 dark:text-gray-100">{editedProject.potencia || 0} kWp</p>
                                </div>
                              </div>
                              <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow-lg border-2 border-gray-200 dark:border-gray-700">
                                <span className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 block mb-1.5">Disjuntor</span>
                                <div className="flex items-center gap-2">
                                  <Plug className="h-5 w-5 text-violet-600 dark:text-violet-400 flex-shrink-0" />
                                  <p className="text-base font-bold text-gray-900 dark:text-gray-100">{editedProject.disjuntorPadraoEntrada || 'N/A'}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 💰 Informações Financeiras */}
                        <div className="rounded-2xl bg-white dark:bg-gray-800 shadow-xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
                          <div className="bg-gradient-to-r from-amber-500 to-amber-600 dark:from-amber-600 dark:to-amber-700 px-4 py-3">
                            <h4 className="text-base font-bold text-white uppercase tracking-wide flex items-center gap-2">
                              <div className="p-1.5 bg-white/20 rounded-full">
                                <DollarSign className="h-4 w-4 text-white" />
                              </div>
                              Financeiro
                            </h4>
                          </div>
                          <div className="p-4">
                            {/* 🔒 Verificar se usuário é colaborador para restringir acesso */}
                            {(() => {
                              const actualRole = user?.profile?.role || user?.role;
                              const isColaborador = actualRole === 'colaborador';
                              
                              // Se for colaborador, mostrar mensagem de restrição
                              if (isColaborador) {
                                return (
                                  <div className="bg-gray-50 dark:bg-gray-900 p-5 rounded-lg shadow-lg border-2 border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center gap-3">
                                      <Info className="h-6 w-6 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                                      <div>
                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                          Informações financeiras disponíveis apenas para administradores
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                              
                              // Para outros roles (admin, superadmin, client), mostrar informações normalmente
                              return null;
                            })()}
                            
                            {/* 🆕 Renderizar informações baseadas no billing_mode - Apenas se não for colaborador */}
                            {(() => {
                              const actualRole = user?.profile?.role || user?.role;
                              const isColaborador = actualRole === 'colaborador';
                              if (isColaborador) return null;
                              
                              return editedProject.billing_mode === 'pacote' && editedProject.billing_snapshot ? (
                              <div className="bg-purple-50 dark:bg-purple-900/20 p-5 rounded-lg shadow-lg border-2 border-purple-200 dark:border-purple-700">
                                <div className="flex items-center gap-2 mb-3">
                                  <Package className="h-6 w-6 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                                  <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">Projeto incluso no pacote</span>
                                </div>
                                <p className="text-xl font-bold text-purple-700 dark:text-purple-300 mb-1">
                                  {editedProject.billing_snapshot.pacote_nome || 'Pacote'}
                                </p>
                                <p className="text-sm text-purple-600 dark:text-purple-400">
                                  Projeto {editedProject.billing_snapshot.projetos_usados_depois || 1} de {editedProject.billing_snapshot.projetos_inclusos || 0}
                                </p>
                                {editedProject.billing_snapshot.data_ativacao && (
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                                    Ativado em: {new Date(editedProject.billing_snapshot.data_ativacao).toLocaleDateString('pt-BR')}
                                  </p>
                                )}
                                {editedProject.billing_snapshot.data_expiracao && (
                                  <p className="text-xs text-gray-600 dark:text-gray-400">
                                    Válido até: {new Date(editedProject.billing_snapshot.data_expiracao).toLocaleDateString('pt-BR')}
                                  </p>
                                )}
                              </div>
                            ) : editedProject.billing_mode === 'assinatura' && editedProject.billing_snapshot ? (
                              <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-lg shadow-lg border-2 border-blue-200 dark:border-blue-700">
                                <div className="flex items-center gap-2 mb-3">
                                  <CalendarCheck className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Projeto incluso na assinatura</span>
                                </div>
                                <p className="text-xl font-bold text-blue-700 dark:text-blue-300 mb-1">
                                  {editedProject.billing_snapshot.plano_nome || 'Plano de Assinatura'}
                                </p>
                                <p className="text-sm text-blue-600 dark:text-blue-400">
                                  Projeto {editedProject.billing_snapshot.projetos_usados_depois || 1} de {editedProject.billing_snapshot.projetos_mensais || 0} do ciclo atual
                                </p>
                                {editedProject.billing_snapshot.proximo_reset && (
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                                    Renovação: {new Date(editedProject.billing_snapshot.proximo_reset).toLocaleDateString('pt-BR')}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <div className="bg-white dark:bg-gray-900 p-5 rounded-lg shadow-lg border-2 border-gray-200 dark:border-gray-700">
                                <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block mb-2">Valor do Projeto</span>
                                <div className="flex items-center gap-2">
                                  <DollarSign className="h-6 w-6 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                                    {editedProject.valorProjeto !== undefined && editedProject.valorProjeto !== null
                                      ? `R$ ${Number(editedProject.valorProjeto).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                      : 'N/A'}
                                  </p>
                                </div>
                                {editedProject.potencia && (
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                                    Baseado em {editedProject.potencia} kWp
                                  </p>
                                )}
                              </div>
                            );
                            })()}
                          </div>
                        </div>

                        {/* 📅 Datas */}
                        <div className="rounded-2xl bg-white dark:bg-gray-800 shadow-xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
                          <div className="bg-gradient-to-r from-sky-500 to-sky-600 dark:from-sky-600 dark:to-sky-700 px-4 py-3">
                            <h4 className="text-base font-bold text-white uppercase tracking-wide flex items-center gap-2">
                              <div className="p-1.5 bg-white/20 rounded-full">
                                <ClockIcon className="h-4 w-4 text-white" />
                              </div>
                              Datas
                            </h4>
                          </div>
                          <div className="p-4">
                            <div className="space-y-3">
                              <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow-lg border-2 border-gray-200 dark:border-gray-700">
                                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-1.5">Criação</span>
                                <div className="flex items-center gap-2">
                                  <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                  <p className="text-base font-bold text-gray-900 dark:text-gray-100">
                                    {editedProject.createdAt
                                      ? new Date(
                                          typeof editedProject.createdAt === 'string'
                                            ? editedProject.createdAt
                                            : (editedProject.createdAt as any)
                                        ).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric'})
                                      : 'N/A'}
                                  </p>
                                </div>
                              </div>
                              <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow-lg border-2 border-gray-200 dark:border-gray-700">
                                <span className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400 block mb-1.5">Entrega</span>
                                <div className="flex items-center gap-2">
                                  <Clock className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                                  <p className="text-base font-bold text-gray-900 dark:text-gray-100">{formatDateBR(editedProject.dataEntrega)}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 📦 SEÇÃO: LISTA DE MATERIAIS */}
                      <div className="rounded-2xl bg-white dark:bg-gray-800 shadow-xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 dark:from-indigo-600 dark:to-indigo-700 px-6 py-4">
                          <h3 className="text-xl font-bold text-white flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-full">
                              <FileIcon className="h-5 w-5 text-white" />
                            </div>
                            Lista de Materiais
                          </h3>
                        </div>
                        <div className="p-6">
                          <div className="bg-gray-50 dark:bg-gray-900/50 p-5 rounded-lg min-h-[100px] max-h-60 overflow-y-auto">
                            <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap leading-relaxed">
                              {editedProject.listaMateriais || 'Nenhum material especificado'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* 📊 SEÇÃO: STATUS DO PROJETO */}
                      <div className="rounded-2xl bg-white dark:bg-gray-800 shadow-xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="bg-gradient-to-r from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 px-6 py-4">
                          <h3 className="text-xl font-bold text-white flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-full">
                              <ClockIcon className="h-5 w-5 text-white" />
                            </div>
                            Status do Projeto
                          </h3>
                        </div>
                        <div className="p-6">
                          <div className="bg-white dark:bg-gray-900 p-5 rounded-lg shadow-lg border-2 border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between flex-wrap gap-4">
                              {/* Status Badge */}
                              {availableStatuses.length > 0 && (() => {
                                const currentStatus = availableStatuses.find(s => s.slug === editedProject.status);
                                if (currentStatus) {
                                  return (
                                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full shadow-md border-2" style={{
                                      backgroundColor: `${currentStatus.color}15`,
                                      borderColor: currentStatus.color
                                    }}>
                                      <div
                                        className="w-3 h-3 rounded-full shadow-sm"
                                        style={{ backgroundColor: currentStatus.color }}
                                      />
                                      <span className="text-base font-bold text-gray-900 dark:text-gray-100">
                                        {currentStatus.name}
                                      </span>
                                    </div>
                                  );
                                }
                              })()}
                              {availableStatuses.length === 0 && (
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full shadow-md bg-gray-100 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600">
                                  <span className="text-base font-bold text-gray-900 dark:text-gray-100">
                                    {editedProject.status}
                                  </span>
                                </div>
                              )}

                              {/* Badge de Prioridade */}
                              {isAdminPanel && (
                                <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full shadow-md border-2" style={{
                                  backgroundColor:
                                    editedProject.prioridade === 'Urgente' ? '#FEE2E2' :
                                    editedProject.prioridade === 'Alta' ? '#FEF3C7' :
                                    editedProject.prioridade === 'Média' ? '#DBEAFE' :
                                    '#F3F4F6',
                                  borderColor:
                                    editedProject.prioridade === 'Urgente' ? '#DC2626' :
                                    editedProject.prioridade === 'Alta' ? '#F59E0B' :
                                    editedProject.prioridade === 'Média' ? '#3B82F6' :
                                    '#9CA3AF'
                                }}>
                                  <span className={`text-sm ${
                                    editedProject.prioridade === 'Urgente' ? 'text-red-700' :
                                    editedProject.prioridade === 'Alta' ? 'text-yellow-700' :
                                    editedProject.prioridade === 'Média' ? 'text-blue-700' :
                                    'text-gray-700'
                                  }`}>
                                    {editedProject.prioridade === 'Urgente' && '🔥'}
                                    {editedProject.prioridade === 'Alta' && '⚠️'}
                                    {editedProject.prioridade === 'Média' && '📊'}
                                    {!editedProject.prioridade && '📋'}
                                  </span>
                                  <span className={`text-xs font-bold uppercase tracking-wide ${
                                    editedProject.prioridade === 'Urgente' ? 'text-red-800' :
                                    editedProject.prioridade === 'Alta' ? 'text-yellow-800' :
                                    editedProject.prioridade === 'Média' ? 'text-blue-800' :
                                    'text-gray-700'
                                  }`}>
                                    {editedProject.prioridade || 'Baixa'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 👤 SEÇÃO: RESPONSÁVEL PELO PROJETO */}
                      {isAdminPanel && user && (
                        <div className="rounded-2xl bg-white dark:bg-gray-800 shadow-xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
                          <div className="bg-gradient-to-r from-orange-500 to-orange-600 dark:from-orange-600 dark:to-orange-700 px-6 py-4">
                            <h3 className="text-xl font-bold text-white flex items-center gap-3">
                              <div className="p-2 bg-white/20 rounded-full">
                                <User className="h-5 w-5 text-white" />
                              </div>
                              Responsável pelo Projeto
                            </h3>
                          </div>
                          <div className="p-6">
                            <div className="bg-gray-50 dark:bg-gray-900/50 p-5 rounded-lg">
                              <ProjectResponsibleAdmin
                                project={editedProject}
                                currentUser={{
                                  uid: user.id,
                                  email: user.email,
                                  name: user.profile?.name || user.email,
                                  phone: user.profile?.phone || '',
                                  role: user.role
                                }}
                                onUpdate={handleProjectUpdate}
                              />
                            </div>
                          </div>
                        </div>
                      )}
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
            </div>
          </TabsContent>

          <TabsContent value="linha-do-tempo" className="mt-6">
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
                    <CardContent className="p-6 space-y-4">
                        {/* ✅ Radio buttons para visibilidade - Apenas para Admin/Colaborador */}
                        {(() => {
                          // ✅ CORREÇÃO: Priorizar user.profile.role sobre user.role
                          // porque user.role retorna "authenticated" (role de autenticação do Supabase)
                          const actualRole = user?.profile?.role || user?.role;
                          const isInternalTeam = actualRole === 'admin' || actualRole === 'superadmin' || actualRole === 'colaborador';
                          return isInternalTeam;
                        })() && (
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700">Visibilidade do Comentário</Label>
                            <RadioGroup
                              value={commentVisibility}
                              onValueChange={(value: 'all' | 'internal') => setCommentVisibility(value)}
                              className="flex gap-4"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="all" id="visibility-all" />
                                <Label htmlFor="visibility-all" className="font-normal cursor-pointer">
                                  Visível a todos
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="internal" id="visibility-internal" />
                                <Label htmlFor="visibility-internal" className="font-normal cursor-pointer">
                                  Apenas equipe interna
                                </Label>
                              </div>
                            </RadioGroup>
                          </div>
                        )}

                        {/* 🎨 Área de comentário com suporte a imagens inline */}
                        <div
                          className="space-y-3"
                          onDragOver={handleCommentDragOver}
                          onDrop={handleCommentDrop}
                        >
                          {/* Textarea com hint de paste */}
                          <div className="relative">
                            <Textarea
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              onPaste={handleCommentPaste}
                              placeholder="Escreva ou cole prints (Ctrl+V)..."
                              className="flex-grow resize-none border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 pr-12"
                              rows={3}
                            />
                            {/* Botão de câmera para upload manual */}
                            <input
                              type="file"
                              id="comment-image-upload"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files) {
                                  handleCommentImageSelect(Array.from(e.target.files));
                                }
                              }}
                            />
                            <label
                              htmlFor="comment-image-upload"
                              className="absolute right-2 top-2 cursor-pointer text-gray-500 hover:text-blue-600 transition-colors"
                              title="Adicionar imagens"
                            >
                              <Camera size={20} />
                            </label>
                          </div>

                          {/* Preview de imagens selecionadas */}
                          {commentImagePreviews.length > 0 && (
                            <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-md border border-gray-200">
                              {commentImagePreviews.map((preview, index) => (
                                <div key={index} className="relative group">
                                  <img
                                    src={preview}
                                    alt={`Preview ${index + 1}`}
                                    className="w-20 h-20 object-cover rounded-md border border-gray-300"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveCommentImage(index)}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Remover imagem"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Botão enviar */}
                          <div className="flex justify-end">
                            <Button
                              onClick={() => {
                                handleAddComment();
                                if (newComment.trim() || commentImages.length > 0) {
                                  setShowAddCommentSection(false);
                                }
                              }}
                              disabled={(!newComment.trim() && commentImages.length === 0) || isPending}
                              className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md shadow-sm"
                            >
                              Enviar Comentário
                            </Button>
                          </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {showBeneficiariasUploadSection && (
                <Card className="mb-6 shadow-lg rounded-lg border-purple-200">
                    <CardHeader className="bg-purple-50">
                        <CardTitle className="text-purple-900">Enviar Faturas das Unidades Beneficiárias</CardTitle>
                        <CardDescription className="text-purple-700">
                          Faça upload das faturas da Unidade Geradora e das Unidades Beneficiárias.
                          <span className="font-semibold"> Tamanho máximo: 10MB por arquivo.</span>
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="space-y-6">
                            {/* Unidades Beneficiárias Dinâmicas */}
                            {Array.from({ length: numBeneficiarias }, (_, index) => {
                              const numero = String(index + 1).padStart(2, '0');
                              const label = `Unidade Beneficiária ${numero}`;
                              const selectedFile = selectedBeneficiariaFiles[label];
                              const isUploading = uploadingBeneficiaria === label;

                              return (
                                <div key={`beneficiaria-${index}`} className="space-y-3 p-4 bg-purple-50/50 rounded-lg border border-purple-200">
                                  <Label className="text-sm font-bold text-purple-900 flex items-center gap-2">
                                    <span className="bg-purple-600 text-white px-3 py-1 rounded-md">{label}</span>
                                  </Label>

                                  {/* Percentual e File input lado a lado */}
                                  <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-3">
                                    {/* Campo de Percentual */}
                                    <div className="space-y-2">
                                      <Label htmlFor={`percentual-${index}`} className="text-xs text-purple-700 font-medium">
                                        Percentual (%)
                                      </Label>
                                      <Input
                                        id={`percentual-${index}`}
                                        type="number"
                                        min="0"
                                        max="100"
                                        placeholder="Ex: 30"
                                        value={percentuaisBeneficiarias[label] || ''}
                                        onChange={(e) => {
                                          const value = e.target.value;
                                          setPercentuaisBeneficiarias(prev => ({ ...prev, [label]: value }));
                                        }}
                                        disabled={isUploading}
                                        className="text-center font-semibold"
                                      />
                                    </div>

                                    {/* File input */}
                                    <div className="space-y-2">
                                      <Label htmlFor={`file-${index}`} className="text-xs text-purple-700 font-medium">
                                        Arquivo da Fatura
                                      </Label>
                                      <Input
                                        id={`file-${index}`}
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            setSelectedBeneficiariaFiles(prev => ({ ...prev, [label]: file }));
                                          }
                                          // Reset input para permitir re-seleção do mesmo arquivo
                                          e.target.value = '';
                                        }}
                                        disabled={isUploading}
                                        className="file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-purple-100 file:text-purple-800 hover:file:bg-purple-200"
                                      />
                                    </div>
                                  </div>

                                  {/* Show selected file info */}
                                  {selectedFile && !isUploading && (
                                    <div className="flex items-center justify-between p-3 bg-white rounded-md border border-purple-300">
                                      <div className="flex items-center gap-2 text-sm text-gray-700">
                                        <span className="text-lg">📄</span>
                                        <span className="font-medium">{selectedFile.name}</span>
                                        <span className="text-gray-500">({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                                      </div>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setSelectedBeneficiariaFiles(prev => ({ ...prev, [label]: null }))}
                                        className="text-red-600 hover:text-red-800 hover:bg-red-50"
                                      >
                                        ✕
                                      </Button>
                                    </div>
                                  )}

                                  {/* Upload button - only show if file selected */}
                                  {selectedFile && !isUploading && (
                                    <Button
                                      onClick={() => handleBeneficiariaUpload(selectedFile, label)}
                                      className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                                    >
                                      ⬆️ Enviar {label}
                                    </Button>
                                  )}

                                  {/* Loading state */}
                                  {isUploading && (
                                    <div className="flex items-center justify-center gap-2 p-3 bg-purple-100 rounded-md text-purple-700 font-medium">
                                      <div className="animate-spin h-5 w-5 border-2 border-purple-600 border-t-transparent rounded-full"></div>
                                      Enviando...
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                            {/* Fatura da Unidade Geradora */}
                            <div className="space-y-3 p-4 bg-green-50/50 rounded-lg border border-green-200">
                              <Label className="text-sm font-bold text-green-900 flex items-center gap-2">
                                <span className="bg-green-600 text-white px-3 py-1 rounded-md">Fatura da Unidade Geradora</span>
                              </Label>

                              {/* Percentual e File input lado a lado */}
                              <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-3">
                                {/* Campo de Percentual */}
                                <div className="space-y-2">
                                  <Label htmlFor="percentual-geradora" className="text-xs text-green-700 font-medium">
                                    Percentual (%)
                                  </Label>
                                  <Input
                                    id="percentual-geradora"
                                    type="number"
                                    min="0"
                                    max="100"
                                    placeholder="Ex: 30"
                                    value={percentuaisBeneficiarias['Fatura da Unidade Geradora'] || ''}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      setPercentuaisBeneficiarias(prev => ({ ...prev, 'Fatura da Unidade Geradora': value }));
                                    }}
                                    disabled={uploadingBeneficiaria === 'Fatura da Unidade Geradora'}
                                    className="text-center font-semibold"
                                  />
                                </div>

                                {/* File input */}
                                <div className="space-y-2">
                                  <Label htmlFor="file-geradora" className="text-xs text-green-700 font-medium">
                                    Arquivo da Fatura
                                  </Label>
                                  <Input
                                    id="file-geradora"
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        setSelectedBeneficiariaFiles(prev => ({ ...prev, 'Fatura da Unidade Geradora': file }));
                                      }
                                      e.target.value = '';
                                    }}
                                    disabled={uploadingBeneficiaria === 'Fatura da Unidade Geradora'}
                                    className="file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-green-100 file:text-green-800 hover:file:bg-green-200"
                                  />
                                </div>
                              </div>

                              {/* Show selected file info */}
                              {selectedBeneficiariaFiles['Fatura da Unidade Geradora'] && uploadingBeneficiaria !== 'Fatura da Unidade Geradora' && (
                                <div className="flex items-center justify-between p-3 bg-white rounded-md border border-green-300">
                                  <div className="flex items-center gap-2 text-sm text-gray-700">
                                    <span className="text-lg">📄</span>
                                    <span className="font-medium">{selectedBeneficiariaFiles['Fatura da Unidade Geradora']!.name}</span>
                                    <span className="text-gray-500">({(selectedBeneficiariaFiles['Fatura da Unidade Geradora']!.size / 1024 / 1024).toFixed(2)} MB)</span>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setSelectedBeneficiariaFiles(prev => ({ ...prev, 'Fatura da Unidade Geradora': null }))}
                                    className="text-red-600 hover:text-red-800 hover:bg-red-50"
                                  >
                                    ✕
                                  </Button>
                                </div>
                              )}

                              {/* Upload button */}
                              {selectedBeneficiariaFiles['Fatura da Unidade Geradora'] && uploadingBeneficiaria !== 'Fatura da Unidade Geradora' && (
                                <Button
                                  onClick={() => handleBeneficiariaUpload(selectedBeneficiariaFiles['Fatura da Unidade Geradora']!, 'Fatura da Unidade Geradora')}
                                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
                                >
                                  ⬆️ Enviar Fatura da Unidade Geradora
                                </Button>
                              )}

                              {/* Loading state */}
                              {uploadingBeneficiaria === 'Fatura da Unidade Geradora' && (
                                <div className="flex items-center justify-center gap-2 p-3 bg-green-100 rounded-md text-green-700 font-medium">
                                  <div className="animate-spin h-5 w-5 border-2 border-green-600 border-t-transparent rounded-full"></div>
                                  Enviando...
                                </div>
                              )}
                            </div>

                            {/* Add More Units button */}
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setNumBeneficiarias(prev => prev + 1)}
                              className="w-full border-2 border-dashed border-purple-400 text-purple-700 hover:bg-purple-50 hover:border-purple-600 font-semibold py-6"
                            >
                              + Adicionar Mais Unidades Beneficiárias
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Card do Histórico de Atualizações (Timeline Events) */}
            <Card className="shadow-lg rounded-lg">
                <CardHeader className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <CardTitle className="text-2xl">Linha do Tempo do Projeto</CardTitle>
                        <div className="flex flex-wrap gap-3">
                            <Button
                                variant="default"
                                onClick={() => { setShowAddDocumentSection(prev => !prev); setShowAddCommentSection(false); setShowBeneficiariasUploadSection(false); }}
                                className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md shadow-sm"
                            >
                                Adicionar Documentos
                            </Button>
                            <Button
                                variant="default"
                                onClick={() => { setShowAddCommentSection(prev => !prev); setShowAddDocumentSection(false); setShowBeneficiariasUploadSection(false); }}
                                className="flex items-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md shadow-sm"
                            >
                                Adicionar Comentário
                            </Button>
                            {isFullAdmin && (
                                <Button
                                    variant="default"
                                    onClick={() => setShowProcuracaoModal(true)}
                                    className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md shadow-sm"
                                >
                                    Gerar Procuração
                                </Button>
                            )}
                            {editedProject.havera_beneficiarias && (
                                <Button
                                    variant="default"
                                    onClick={() => { setShowBeneficiariasUploadSection(prev => !prev); setShowAddDocumentSection(false); setShowAddCommentSection(false); }}
                                    className="flex items-center bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md shadow-sm"
                                >
                                    Enviar Fatura das Unidades Beneficiárias
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="space-y-6"> {/* Usando space-y-6 para espaçamento entre eventos */}
                        {timelineEvents.length === 0 && (
                            <p className="text-gray-500 text-center py-4">Nenhum evento na linha do tempo ainda.</p>
                    )}
                        {timelineEvents
                          .filter((event) => {
                            // ✅ FILTRO: Ocultar comentários internos para clientes
                            if (event.type === 'comment' && event.visibility === 'internal') {
                              // ✅ CORREÇÃO: Verificar user.profile.role ao invés de user.role
                              const actualRole = user?.profile?.role || user?.role;
                              return actualRole !== 'client' && actualRole !== 'cliente';
                            }
                            return true;
                          })
                          .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                          .map((event, index) => {
                            let iconComponent: React.ReactNode;
                            let iconBgColor: string;

                            let eventTypeBadge: { label: string; color: string } | null = null;

                            switch (event.type) {
                                case 'comment':
                                    iconComponent = <MessageIcon className="h-6 w-6 text-white" />;
                                    iconBgColor = 'bg-blue-500';
                                    eventTypeBadge = { label: 'Comentário', color: 'bg-blue-100 text-blue-700 border-blue-300' };
                                    break;
                                case 'responsibility':
                                    iconComponent = <User className="h-6 w-6 text-white" />;
                                    iconBgColor = 'bg-green-500';
                                    eventTypeBadge = { label: 'Responsabilidade', color: 'bg-green-100 text-green-700 border-green-300' };
                                    break;
                                case 'document':
                                case 'file_upload':
                                    iconComponent = <FileIcon className="h-6 w-6 text-white" />;
                                    iconBgColor = 'bg-orange-500';
                                    eventTypeBadge = { label: 'Documento', color: 'bg-orange-100 text-orange-700 border-orange-300' };
                                    break;
                                case 'status':
                                    iconComponent = <ClockIcon className="h-6 w-6 text-white" />;
                                    iconBgColor = 'bg-purple-500';
                                    eventTypeBadge = { label: 'Status', color: 'bg-purple-100 text-purple-700 border-purple-300' };
                                    break;
                                case 'checklist':
                                    iconComponent = <Settings className="h-6 w-6 text-white" />;
                                    iconBgColor = 'bg-teal-500';
                                    eventTypeBadge = { label: 'Checklist', color: 'bg-teal-100 text-teal-700 border-teal-300' };
                                    break;
                                case 'info_update':
                                default:
                                    iconComponent = <Settings className="h-6 w-6 text-white" />;
                                    iconBgColor = 'bg-green-500';
                                    eventTypeBadge = { label: 'Sistema', color: 'bg-green-100 text-green-700 border-green-300' };
                                    break;
                            }

                            return (
                                <div key={event.id || index} className="flex items-start space-x-4 p-5 bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200">
                                    {/* Círculo do Ícone - Maior e com mais contraste */}
                                    <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${iconBgColor} shadow-md`}>
                                        {iconComponent}
                                    </div>

                                    {/* Conteúdo do Evento */}
                                    <div className="flex-grow">
                                        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <span className="font-semibold text-gray-900 dark:text-gray-100 text-base">
                                                {event.fullName || event.user || 'Usuário'}
                                              </span>
                                              {/* Badge de tipo de evento */}
                                              {eventTypeBadge && (
                                                <Badge className={`${eventTypeBadge.color} border text-xs font-medium px-2 py-0.5`}>
                                                  {eventTypeBadge.label}
                                                </Badge>
                                              )}
                                              {/* ✅ Badge para comentários internos */}
                                              {event.type === 'comment' && event.visibility === 'internal' && (
                                                <Badge className="bg-amber-100 text-amber-700 border-amber-300 border flex items-center gap-1 text-xs px-2 py-0.5">
                                                  <Lock className="h-3 w-3" />
                                                  Equipe Interna
                                                </Badge>
                                              )}
                                            </div>
                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-full border border-gray-200 dark:border-gray-600">
                                                <ClockIcon className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
                                                <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                                                    {new Date(event.timestamp).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"})}
                                                </span>
                                                {event.edited && <span className="italic text-gray-500 dark:text-gray-400 text-xs">(editado)</span>}
                                            </div>
                                        </div>
                                        {/* A exibição detalhada do conteúdo (status, links, etc.) será refinada depois */}
                                        {renderEventContent(event.content || '', event)}

                                        {/* Botões para eventos de arquivo (Download/Excluir) */}
                                        {((event.type === 'document' || event.type === 'file_upload' || event.fileName) && event.fileUrl) && (
                                          <div className="flex items-center space-x-2 mt-2">
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={async () => {
                                                try {
                                                  devLog.log('[Debug EPV] Download button clicked for file:', event.fileName);

                                                  // Fazer download via fetch para forçar download direto
                                                  const response = await fetch(event.fileUrl!);
                                                  const blob = await response.blob();

                                                  // Criar URL temporária do blob
                                                  const blobUrl = window.URL.createObjectURL(blob);

                                                  // Criar link e forçar download
                                                  const link = document.createElement('a');
                                                  link.href = blobUrl;
                                                  link.download = event.fileName || 'download';
                                                  document.body.appendChild(link);
                                                  link.click();
                                                  document.body.removeChild(link);

                                                  // Limpar URL temporária
                                                  window.URL.revokeObjectURL(blobUrl);
                                                } catch (error) {
                                                  toast({
                                                    title: "Erro ao baixar arquivo",
                                                    description: "Não foi possível baixar o arquivo. Tente novamente.",
                                                    variant: "destructive"
                                                  });
                                                }
                                              }}
                                              className="text-xs"
                                            >
                                              <Download className="mr-1 h-3 w-3" />
                                              Download
                                            </Button>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => window.open(event.fileUrl!, '_blank')}
                                              className="text-xs"
                                            >
                                              <Eye className="mr-1 h-3 w-3" />
                                              Visualizar
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

          {canGerarProjeto && (
            <TabsContent value="gerar-projeto" className="mt-6">
              <div className="space-y-6">
                <Card className="shadow-lg rounded-lg">
                  <CardHeader>
                    <CardTitle className="text-2xl font-semibold flex items-center gap-2">
                      <FileOutput className="h-6 w-6 text-blue-600" />
                      Gerar Documentos do Projeto
                    </CardTitle>
                    <CardDescription>
                      Selecione a distribuidora e o template desejado para gerar a documentação.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="max-w-sm">
                        <Label htmlFor="distribuidora-gerar" className="text-sm font-medium text-gray-700 dark:text-gray-300">Distribuidora</Label>
                        <Select value={selectedDistribuidoraGerarProjeto} onValueChange={setSelectedDistribuidoraGerarProjeto}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Selecione a distribuidora" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Equatorial">Equatorial</SelectItem>
                            <SelectItem value="CPFL" disabled>CPFL (Em breve)</SelectItem>
                            <SelectItem value="RGE" disabled>RGE (Em breve)</SelectItem>
                            <SelectItem value="Energisa" disabled>Energisa (Em breve)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            variant="outline"
                            onClick={() => setShowSetupModal(true)}
                            className="flex items-center gap-2 text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                          >
                            <Settings className="h-4 w-4" />
                            Setup do Projeto
                            {gerarProjetoFields.setup_concluido === 'true' && (
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                            )}
                          </Button>
                          <Button
                            onClick={() => setShowConferirModal(true)}
                            disabled={gerarProjetoFields.setup_concluido !== 'true'}
                            className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={gerarProjetoFields.setup_concluido !== 'true' ? 'Conclua o Setup do Projeto primeiro' : undefined}
                          >
                            <ClipboardCheck className="h-4 w-4" />
                            Conferir Informações do Projeto ({conferirProgress.filled}/{conferirProgress.total})
                          </Button>
                        </div>
                        {gerarProjetoFields.setup_concluido !== 'true' && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <Info className="h-3.5 w-3.5 flex-shrink-0" />
                            Conclua o Setup do Projeto para liberar o preenchimento das informações. A geração dos documentos depende da topologia configurada.
                          </p>
                        )}
                      </div>

                      <SetupProjetoModal
                        open={showSetupModal}
                        onClose={() => setShowSetupModal(false)}
                        fields={gerarProjetoFields}
                        onSave={handleSaveSetup}
                      />

                      <ConferirInformacoesModal
                        open={showConferirModal}
                        onClose={() => setShowConferirModal(false)}
                        fields={gerarProjetoFields}
                        onSave={handleSaveConferirModal}
                      />

                      {selectedDistribuidoraGerarProjeto ? (
                        <>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                              <Factory className="h-5 w-5 text-blue-500" />
                              Templates — {selectedDistribuidoraGerarProjeto}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {selectedDistribuidoraGerarProjeto.toLowerCase().includes('cpfl') && (
                                <Card
                                  onClick={() => setActiveTemplatePreview(activeTemplatePreview === 'anexo-f' ? null : 'anexo-f')}
                                  className={`border cursor-pointer group transition-all duration-200 ${
                                    activeTemplatePreview === 'anexo-f'
                                      ? 'border-orange-500 dark:border-orange-400 shadow-md ring-2 ring-orange-200 dark:ring-orange-800'
                                      : 'border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-600 hover:shadow-md'
                                  }`}
                                >
                                  <CardContent className="p-5">
                                    <div className="flex items-start gap-3">
                                      <div className={`p-2 rounded-lg transition-colors ${
                                        activeTemplatePreview === 'anexo-f'
                                          ? 'bg-orange-100 dark:bg-orange-900/50'
                                          : 'bg-orange-50 dark:bg-orange-900/30 group-hover:bg-orange-100 dark:group-hover:bg-orange-900/50'
                                      }`}>
                                        <FileText className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                                      </div>
                                      <div className="flex-1">
                                        <h4 className="font-medium text-gray-800 dark:text-gray-200">Anexo F — Formulário de Registro</h4>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                          Dados para registro de micro e minigeradores distribuídos (CPFL/ANEEL).
                                        </p>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              )}

                              {selectedDistribuidoraGerarProjeto.toLowerCase().includes('cpfl') && (
                                <Card
                                  onClick={() => setActiveTemplatePreview(activeTemplatePreview === 'anexo-e' ? null : 'anexo-e')}
                                  className={`border cursor-pointer group transition-all duration-200 ${
                                    activeTemplatePreview === 'anexo-e'
                                      ? 'border-blue-500 dark:border-blue-400 shadow-md ring-2 ring-blue-200 dark:ring-blue-800'
                                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md'
                                  }`}
                                >
                                  <CardContent className="p-5">
                                    <div className="flex items-start gap-3">
                                      <div className={`p-2 rounded-lg transition-colors ${
                                        activeTemplatePreview === 'anexo-e'
                                          ? 'bg-blue-100 dark:bg-blue-900/50'
                                          : 'bg-blue-50 dark:bg-blue-900/30 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50'
                                      }`}>
                                        <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                      </div>
                                      <div className="flex-1">
                                        <h4 className="font-medium text-gray-800 dark:text-gray-200">Anexo E — Formulário de Solicitação de Acesso</h4>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                          Formulário de solicitação de orçamento de conexão de microgeração e minigeração (CPFL).
                                        </p>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              )}

                              {selectedDistribuidoraGerarProjeto.toLowerCase().includes('equatorial') && (
                                <Card
                                  onClick={() => setActiveTemplatePreview(activeTemplatePreview === 'memorial' ? null : 'memorial')}
                                  className={`border cursor-pointer group transition-all duration-200 ${
                                    activeTemplatePreview === 'memorial'
                                      ? 'border-blue-500 dark:border-blue-400 shadow-md ring-2 ring-blue-200 dark:ring-blue-800'
                                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md'
                                  }`}
                                >
                                  <CardContent className="p-5">
                                    <div className="flex items-start gap-3">
                                      <div className={`p-2 rounded-lg transition-colors ${
                                        activeTemplatePreview === 'memorial'
                                          ? 'bg-blue-100 dark:bg-blue-900/50'
                                          : 'bg-blue-50 dark:bg-blue-900/30 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50'
                                      }`}>
                                        <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                      </div>
                                      <div className="flex-1">
                                        <h4 className="font-medium text-gray-800 dark:text-gray-200">Memorial Descritivo</h4>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                          Documento técnico com descrição detalhada do sistema fotovoltaico.
                                        </p>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              )}

                              {selectedDistribuidoraGerarProjeto.toLowerCase().includes('energisa') && (
                                <Card
                                  onClick={() => setActiveTemplatePreview(activeTemplatePreview === 'aneel-registro' ? null : 'aneel-registro')}
                                  className={`border cursor-pointer group transition-all duration-200 ${
                                    activeTemplatePreview === 'aneel-registro'
                                      ? 'border-emerald-500 dark:border-emerald-400 shadow-md ring-2 ring-emerald-200 dark:ring-emerald-800'
                                      : 'border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-600 hover:shadow-md'
                                  }`}
                                >
                                  <CardContent className="p-5">
                                    <div className="flex items-start gap-3">
                                      <div className={`p-2 rounded-lg transition-colors ${
                                        activeTemplatePreview === 'aneel-registro'
                                          ? 'bg-emerald-100 dark:bg-emerald-900/50'
                                          : 'bg-emerald-50 dark:bg-emerald-900/30 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/50'
                                      }`}>
                                        <FileText className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                                      </div>
                                      <div className="flex-1">
                                        <h4 className="font-medium text-gray-800 dark:text-gray-200">Formulário de Registro — ANEEL</h4>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                          Dados para registro da UC no sistema de compensação de energia (REN 482).
                                        </p>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              )}

                              {!selectedDistribuidoraGerarProjeto.toLowerCase().includes('cpfl') && <Card
                                onClick={() => setActiveTemplatePreview(activeTemplatePreview === 'formulario' ? null : 'formulario')}
                                className={`border cursor-pointer group transition-all duration-200 ${
                                  activeTemplatePreview === 'formulario'
                                    ? 'border-green-500 dark:border-green-400 shadow-md ring-2 ring-green-200 dark:ring-green-800'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600 hover:shadow-md'
                                }`}
                              >
                                <CardContent className="p-5">
                                  <div className="flex items-start gap-3">
                                    <div className={`p-2 rounded-lg transition-colors ${
                                      activeTemplatePreview === 'formulario'
                                        ? 'bg-green-100 dark:bg-green-900/50'
                                        : 'bg-green-50 dark:bg-green-900/30 group-hover:bg-green-100 dark:group-hover:bg-green-900/50'
                                    }`}>
                                      <FileOutput className="h-6 w-6 text-green-600 dark:text-green-400" />
                                    </div>
                                    <div className="flex-1">
                                      <h4 className="font-medium text-gray-800 dark:text-gray-200">Formulário de Solicitação de Acesso</h4>
                                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        Formulário para solicitação de acesso junto à distribuidora {selectedDistribuidoraGerarProjeto}.
                                      </p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>}

                              <Card
                                onClick={() => setActiveTemplatePreview(activeTemplatePreview === 'diagrama' ? null : 'diagrama')}
                                className={`border cursor-pointer group transition-all duration-200 ${
                                  activeTemplatePreview === 'diagrama'
                                    ? 'border-purple-500 dark:border-purple-400 shadow-md ring-2 ring-purple-200 dark:ring-purple-800'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-md'
                                }`}
                              >
                                <CardContent className="p-5">
                                  <div className="flex items-start gap-3">
                                    <div className={`p-2 rounded-lg transition-colors ${
                                      activeTemplatePreview === 'diagrama'
                                        ? 'bg-purple-100 dark:bg-purple-900/50'
                                        : 'bg-purple-50 dark:bg-purple-900/30 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/50'
                                    }`}>
                                      <FileText className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <div className="flex-1">
                                      <h4 className="font-medium text-gray-800 dark:text-gray-200">Diagrama de Blocos</h4>
                                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        Diagrama unifilar de blocos do sistema fotovoltaico.
                                      </p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>

                              <Card
                                onClick={() => setActiveTemplatePreview(activeTemplatePreview === 'unifilar' ? null : 'unifilar')}
                                className={`border cursor-pointer group transition-all duration-200 ${
                                  activeTemplatePreview === 'unifilar'
                                    ? 'border-indigo-500 dark:border-indigo-400 shadow-md ring-2 ring-indigo-200 dark:ring-indigo-800'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md'
                                }`}
                              >
                                <CardContent className="p-5">
                                  <div className="flex items-start gap-3">
                                    <div className={`p-2 rounded-lg transition-colors ${
                                      activeTemplatePreview === 'unifilar'
                                        ? 'bg-indigo-100 dark:bg-indigo-900/50'
                                        : 'bg-indigo-50 dark:bg-indigo-900/30 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50'
                                    }`}>
                                      <FileText className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <div className="flex-1">
                                      <h4 className="font-medium text-gray-800 dark:text-gray-200">Diagrama Unifilar</h4>
                                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        Diagrama unifilar do sistema fotovoltaico.
                                      </p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>

                              <Card
                                onClick={() => setActiveTemplatePreview(activeTemplatePreview === 'planta-situacao' ? null : 'planta-situacao')}
                                className={`border cursor-pointer group transition-all duration-200 ${
                                  activeTemplatePreview === 'planta-situacao'
                                    ? 'border-teal-500 dark:border-teal-400 shadow-md ring-2 ring-teal-200 dark:ring-teal-800'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-teal-300 dark:hover:border-teal-600 hover:shadow-md'
                                }`}
                              >
                                <CardContent className="p-5">
                                  <div className="flex items-start gap-3">
                                    <div className={`p-2 rounded-lg transition-colors ${
                                      activeTemplatePreview === 'planta-situacao'
                                        ? 'bg-teal-100 dark:bg-teal-900/50'
                                        : 'bg-teal-50 dark:bg-teal-900/30 group-hover:bg-teal-100 dark:group-hover:bg-teal-900/50'
                                    }`}>
                                      <MapPin className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                                    </div>
                                    <div className="flex-1">
                                      <h4 className="font-medium text-gray-800 dark:text-gray-200">Planta de Situação</h4>
                                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        Mapa de satélite com localização da instalação.
                                      </p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>

                              {(['Autoconsumo Remoto', 'Geração Compartilhada'].includes(gerarProjetoFields.modalidade_compensacao)) && (
                                <Card className="border border-gray-200 dark:border-gray-700 opacity-70 cursor-not-allowed">
                                  <CardContent className="p-5">
                                    <div className="flex items-start gap-3">
                                      <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-900/30">
                                        <FileText className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                                      </div>
                                      <div className="flex-1">
                                        <h4 className="font-medium text-gray-800 dark:text-gray-200">Formulário de Compensação</h4>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                          Formulário para modalidade {gerarProjetoFields.modalidade_compensacao}.
                                        </p>
                                        <Badge variant="secondary" className="mt-2 text-xs">Em breve</Badge>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              )}

                            </div>
                          </div>

                          {activeTemplatePreview === 'anexo-f' && selectedDistribuidoraGerarProjeto.toLowerCase().includes('cpfl') && (
                            <div className="mt-6">
                              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                                <FileText className="h-5 w-5 text-orange-500" />
                                Pré-visualização — Anexo F — Formulário de Registro (CPFL)
                              </h3>
                              <div className="rounded-md border border-orange-200 dark:border-orange-700 p-4 max-h-[700px] overflow-y-auto">
                                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                                  <AnexoFCPFLPreview projectData={gerarProjetoFields} />
                                </div>
                              </div>
                            </div>
                          )}

                          {activeTemplatePreview === 'anexo-e' && selectedDistribuidoraGerarProjeto.toLowerCase().includes('cpfl') && (
                            <div className="mt-6">
                              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                                <FileText className="h-5 w-5 text-blue-500" />
                                Pré-visualização — Anexo E — Formulário de Solicitação de Acesso (CPFL)
                              </h3>
                              <div className="rounded-md border border-blue-200 dark:border-blue-700 p-4 max-h-[700px] overflow-y-auto">
                                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                                  <AnexoECPFLPreview projectData={gerarProjetoFields} />
                                </div>
                              </div>
                            </div>
                          )}

                          {activeTemplatePreview === 'aneel-registro' && selectedDistribuidoraGerarProjeto.toLowerCase().includes('energisa') && (
                            <div className="mt-6">
                              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                                <FileText className="h-5 w-5 text-emerald-500" />
                                Pré-visualização — Formulário de Registro — ANEEL (Energisa)
                              </h3>
                              <div className="rounded-md border border-emerald-200 dark:border-emerald-700 p-4 max-h-[700px] overflow-y-auto">
                                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                                  <FormularioRegistroANEELPreview projectData={gerarProjetoFields} />
                                </div>
                              </div>
                            </div>
                          )}

                          {activeTemplatePreview === 'memorial' && selectedDistribuidoraGerarProjeto.toLowerCase().includes('equatorial') && (
                            <div className="mt-6">
                              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                                <FileText className="h-5 w-5 text-blue-500" />
                                Pré-visualização — Memorial Descritivo
                              </h3>
                              <div className="rounded-md border border-blue-200 dark:border-blue-700 p-4 max-h-[600px] overflow-y-auto">
                                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
                                  <MemorialDescritivoPreview
                                    distribuidora={selectedDistribuidoraGerarProjeto}
                                    projectData={gerarProjetoFields}
                                    onSaveCargaTable={async (rows: CargaRow[]) => {
                                      await fetch(`/api/projects/${project.id}/conferir-info`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ fields: { carga_levantamento: JSON.stringify(rows) } }),
                                      });
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {activeTemplatePreview === 'diagrama' && (
                            <div className="mt-6">
                              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                                <FileText className="h-5 w-5 text-purple-500" />
                                Pré-visualização — Diagrama de Blocos
                              </h3>
                              <div className="rounded-md border border-purple-200 dark:border-purple-700 p-4 max-h-[700px] overflow-y-auto">
                                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                                  <DiagramaBlocosPreview projectData={{ ...gerarProjetoFields, logo_empresa_url: logoEmpresaUrl }} />
                                </div>
                              </div>
                            </div>
                          )}

                          {activeTemplatePreview === 'unifilar' && (
                            <div className="mt-6">
                              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                                <FileText className="h-5 w-5 text-indigo-500" />
                                Pré-visualização — Diagrama Unifilar
                              </h3>
                              <div className="rounded-md border border-indigo-200 dark:border-indigo-700 p-4 max-h-[900px] overflow-y-auto">
                                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                                  <DiagramaUnifilarPreview projectData={{ ...gerarProjetoFields, logo_empresa_url: logoEmpresaUrl }} />
                                </div>
                              </div>
                            </div>
                          )}

                          {activeTemplatePreview === 'planta-situacao' && (
                            <div className="mt-6">
                              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                                <MapPin className="h-5 w-5 text-teal-500" />
                                Pré-visualização — Planta de Situação
                              </h3>
                              <div className="rounded-md border border-teal-200 dark:border-teal-700 p-4 max-h-[900px] overflow-y-auto">
                                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                                  <PlantaSituacaoPreview
                                    projectData={{ ...gerarProjetoFields, logo_empresa_url: logoEmpresaUrl }}
                                    onSaveConfig={async (config) => {
                                      const serialized = JSON.stringify(config);
                                      await fetch(`/api/projects/${project.id}/conferir-info`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ fields: { planta_situacao_config: serialized } }),
                                      });
                                      setGerarProjetoFields(prev => ({ ...prev, planta_situacao_config: serialized }));
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {activeTemplatePreview === 'formulario' && (
                            <div className="mt-6">
                              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                                <FileOutput className="h-5 w-5 text-green-500" />
                                Pré-visualização — Formulário de Solicitação de Acesso
                              </h3>
                              <div className="rounded-md border border-green-200 dark:border-green-700 p-4 max-h-[600px] overflow-auto">
                                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-2">
                                  <FormularioSolicitacaoPreview distribuidora={selectedDistribuidoraGerarProjeto} projectData={gerarProjetoFields} />
                                </div>
                              </div>
                            </div>
                          )}

                          {activeTemplatePreview === 'procuracao' && (
                            <div className="mt-6">
                              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                                <FileText className="h-5 w-5 text-amber-500" />
                                Pré-visualização — Procuração
                              </h3>
                              <div className="rounded-md border border-amber-200 dark:border-amber-700 p-4">
                                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
                                  <div className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm" style={{ textAlign: 'justify', lineHeight: '1.8' }}>
                                    <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                                      <h2 className="font-bold text-xl tracking-widest">PROCURAÇÃO</h2>
                                    </div>

                                    <p style={{ marginBottom: '15px' }}>
                                      <strong>OUTORGANTE:</strong> Por este instrumento de procuração, <Badge variant="outline" className="text-xs">{`{{cliente_nome}}`}</Badge>, inscrito no CPF sob o nº <Badge variant="outline" className="text-xs">{`{{cliente_cpf}}`}</Badge>.
                                    </p>

                                    <p style={{ marginBottom: '15px' }}>
                                      <strong>OUTORGADO:</strong> Nomeia e constitui o seu bastante procurador <Badge variant="outline" className="text-xs">{`{{responsavel_nome}}`}</Badge>, portador do RG nº <Badge variant="outline" className="text-xs">{`{{responsavel_rg}}`}</Badge> <Badge variant="outline" className="text-xs">{`{{responsavel_orgao_expeditor}}`}</Badge> e inscrito no CPF sob o nº <Badge variant="outline" className="text-xs">{`{{responsavel_cpf}}`}</Badge>, <Badge variant="outline" className="text-xs">{`{{responsavel_profissao}}`}</Badge> inscrito no <Badge variant="outline" className="text-xs">{`{{responsavel_instituicao}}`}</Badge> <Badge variant="outline" className="text-xs">{`{{responsavel_estado}}`}</Badge> sob o nº <Badge variant="outline" className="text-xs">{`{{responsavel_registro}}`}</Badge>.
                                    </p>

                                    <p style={{ marginBottom: '15px' }}>
                                      <strong>PODERES:</strong> Para o fim especial de representar o OUTORGANTE perante à <Badge variant="outline" className="text-xs">{`{{distribuidora}}`}</Badge> no tocante as solicitações de parecer de acesso para micro geração ou mini geração, pedidos de vistoria de micro geração ou mini geração, pedidos de alteração de carga alteração de demanda, assim tendo ainda o OUTORGADO, na qualidade de procurador do OUTORGANTE, os poderes suficientes e necessários de representação para dar entrada em processos administrativos, protocolar requerimentos, apresentar documentação em cumprimento às exigências técnicas e administrativas e, ainda, assinatura dos seguintes documentos: formulário de solicitação de acesso, formulário de registro, formulário de compensação, ART/TRT, identificação do consumidor, termo de responsabilidade, cadastro de geração distribuída, solicitação de vistoria, formulário de troca do padrão/aumento de carga e formulário de ligação nova.
                                    </p>

                                    <p style={{ marginBottom: '30px' }}>
                                      <Badge variant="outline" className="text-xs">{`{{cidade}}`}</Badge>-<Badge variant="outline" className="text-xs">{`{{estado}}`}</Badge>, <Badge variant="outline" className="text-xs">{`{{data}}`}</Badge>.
                                    </p>

                                    <div style={{ textAlign: 'center', marginTop: '50px' }}>
                                      <div style={{ display: 'inline-block', borderTop: '2px solid currentColor', width: '300px', paddingTop: '8px' }}>
                                        <p><strong>Assinatura</strong></p>
                                        <p>Nome completo: <Badge variant="outline" className="text-xs">{`{{cliente_nome}}`}</Badge></p>
                                        <p>CPF: <Badge variant="outline" className="text-xs">{`{{cliente_cpf}}`}</Badge></p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="mt-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                                  Variáveis Disponíveis
                                </h4>
                                <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                                  <p><strong>Do Cliente:</strong> {`{{cliente_nome}}, {{cliente_cpf}}`}</p>
                                  <p><strong>Do Responsável Técnico:</strong> {`{{responsavel_nome}}, {{responsavel_cpf}}, {{responsavel_rg}}, {{responsavel_orgao_expeditor}}, {{responsavel_profissao}}, {{responsavel_registro}}, {{responsavel_instituicao}}, {{responsavel_estado}}`}</p>
                                  <p><strong>Do Projeto:</strong> {`{{distribuidora}}, {{cidade}}, {{estado}}, {{data}}`}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-8">
                          <Factory className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-500 text-lg font-medium">Selecione uma distribuidora</p>
                          <p className="text-gray-400 text-sm mt-1">
                            Escolha a distribuidora acima para visualizar os templates disponíveis.
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}

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

      {/* 🖼️ Modal Lightbox para ampliar imagens */}
      {enlargedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setEnlargedImage(null)}
        >
          <div className="relative max-w-7xl max-h-full">
            {/* Botão fechar */}
            <button
              onClick={() => setEnlargedImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
              aria-label="Fechar"
            >
              <X size={32} />
            </button>

            {/* Imagem ampliada */}
            <img
              src={enlargedImage}
              alt="Imagem ampliada"
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* 🗑️ Dialog de confirmação para arquivar projeto */}
      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar projeto?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja arquivar o projeto{' '}
              <span className="font-medium text-gray-900 dark:text-white">
                "{editedProject.nomeClienteFinal || editedProject.name || project.nomeClienteFinal || project.name || 'Sem nome'}"
              </span>?
              <br /><br />
              O projeto será movido para a aba "Arquivados" e poderá ser restaurado posteriormente.
              Todos os dados serão preservados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isArchiving}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchiveProject}
              disabled={isArchiving}
              className="bg-gray-600 hover:bg-gray-700"
            >
              {isArchiving ? 'Arquivando...' : 'Arquivar Projeto'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Gerar Procuração */}
      <GenerateProcuracaoModal
        open={showProcuracaoModal}
        onOpenChange={setShowProcuracaoModal}
        project={project}
        userId={user?.id || ''}
        onSuccess={() => {
          // Atualizar projeto após salvar dados
          toast({
            title: 'Dados salvos!',
            description: 'Os dados do cliente foram atualizados com sucesso.',
          });
          // Recarregar a página ou atualizar o estado conforme necessário
          window.location.reload();
        }}
      />
    </div>
  )
} 