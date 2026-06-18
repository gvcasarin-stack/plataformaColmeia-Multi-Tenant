import { User } from '@/types/user';
// Remover a importação circular de kanban.ts
// import { ProjectStatus, ProjectPriority } from './kanban';
import { TimelineEvent } from "./timeline";
import { Comment } from "./comment";
// Firebase Timestamp removido - usando Date nativo

/**
 * Tipos para o status do projeto
 * ✅ ATUALIZADO: Agora usa slugs (formato kebab-case) ao invés de nomes legíveis
 * Os nomes legíveis são buscados da tabela project_statuses no banco
 */
export type ProjectStatus =
  | 'nao-iniciado'
  | 'em-desenvolvimento'
  | 'aguardando-assinaturas'
  | 'em-homologacao'
  | 'projeto-aprovado'
  | 'aguardando-solicitar-vistoria'
  | 'projeto-pausado'
  | 'em-vistoria'
  | 'finalizado'
  | 'cancelado';

/**
 * Prioridade do projeto
 */
export type ProjectPriority = 'Baixa' | 'Média' | 'Alta' | 'Urgente';

// Re-export TimelineEvent
export type { TimelineEvent };

/**
 * Representa um evento no histórico do projeto
 */
export interface ProjectHistory {
  type: 'info_update' | 'comment' | 'document' | 'status_change' | 'file_upload';
  content: string;
  createdBy: string;
  createdAt: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  metadata?: Record<string, any>;
}

/**
 * Representa um arquivo associado a um projeto
 */
export interface ProjectFile {
  name: string;
  path: string;
  url: string;
  uploadedAt: string;
  size?: number;
  type?: string;
  uploadedBy?: string;
  uploadedByName?: string;
  uploadedByEmail?: string;
  uploadedByRole?: string;
}

/**
 * Interface base para projetos com campos obrigatórios mínimos
 */
export interface BaseProject {
  id: string;
  nome_cliente_final: string;
  number: string;
  description?: string;
  userId: string;
  status: ProjectStatus;
  files?: ProjectFile[];
  updatedBy?: string;
  history?: ProjectHistory[];
  timelineEvents?: TimelineEvent[];
  empresaIntegradora: string;
  nomeClienteFinal: string;
  distribuidora: string;
  potencia: number;
  dataEntrega: string;
  listaMateriais?: string;
  disjuntorPadraoEntrada?: string;
  prioridade: ProjectPriority;
  documents?: ProjectFile[];
  valorProjeto?: number;
}

/**
 * Interface completa para projetos com todos os campos
 */
export interface Project {
  id: string;
  userId: string;
  nome_cliente_final: string;
  number: string;
  empresaIntegradora: string;
  nomeClienteFinal: string;
  distribuidora: string;
  potencia: number;
  dataEntrega: string;
  listaMateriais?: string;
  disjuntorPadraoEntrada?: string;
  status: ProjectStatus;
  prioridade: ProjectPriority;
  valorProjeto: number | null;
  pagamento?: string;

  // 🆕 CORREÇÃO FINANCEIRA: Datas de pagamento para contabilização correta
  data_pagamento_parcela1?: string | Date | null;
  data_pagamento_integral?: string | Date | null;

  // ✅ NOVOS CAMPOS: CPF/CNPJ e Endereço (opcionais)
  cpf_cnpj_cliente_final?: string;
  endereco_local?: string;

  // ✅ NOVOS CAMPOS: Cidade e Estado do cliente (para procuração)
  client_city?: string;
  client_state?: string;

  // ✅ NOVO CAMPO: Compensação de Créditos (opcional)
  havera_beneficiarias?: boolean;

  // ✅ Campos técnicos para geração de documentos
  tipo_conexao?: string;
  tipo_ramal?: string;
  tensao_atendimento?: string;
  coord_utm_fuso?: string;
  coord_utm_x?: string;
  coord_utm_y?: string;

  // ✅ Campos estruturados de equipamentos
  modulos_quantidade?: number;
  modulos_fabricante?: string;
  modulos_modelo?: string;
  modulos_potencia_wp?: string;
  modulos_voc?: string;
  modulos_isc?: string;
  modulos_vpmp?: string;
  modulos_ipmp?: string;
  inversores_quantidade?: number;
  inversores_fabricante?: string;
  inversores_modelo?: string;
  inversores_potencia?: string;
  inversores_tensao?: string;
  inversores_vcc_max?: string;
  inversores_icc_max?: string;
  inversores_vpmp_max?: string;
  inversores_vpmp_min?: string;
  inversores_vcc_partida?: string;

  // ✅ Campos de referência ao acervo técnico
  caixa_medicao_id?: string;
  caixa_medicao_imagem_url?: string;
  caixa_medicao_nome?: string;
  caixa_medicao_comprimento_mm?: string;
  caixa_medicao_altura_mm?: string;
  caixa_medicao_largura_mm?: string;
  responsavel_nome?: string;
  responsavel_profissao?: string;
  responsavel_registro?: string;
  responsavel_email?: string;
  responsavel_uf?: string;
  data_documento?: string;
  secao_aterramento_mm2?: string;

  // Formulário de Solicitação de Acesso
  cliente_cep?: string;
  cliente_email?: string;
  cliente_celular?: string;
  cliente_telefone_fixo?: string;
  responsavel_legal_nome?: string;
  responsavel_legal_telefone?: string;
  responsavel_legal_email?: string;
  tipo_solicitacao?: string;
  tarifa_branca?: string;
  possui_cargas_especiais?: string;
  carga_declarada_kw?: string;
  potencia_disponibilizada_kw?: string;
  data_inicio_operacao?: string;
  modulos_area_m2?: string;

  // Inversores - campos extras
  inversores_faixa_tensao?: string;
  inversores_corrente_nominal?: string;
  inversores_fator_potencia?: string;
  inversores_rendimento?: string;
  inversores_dht_corrente?: string;

  // Inversores - Entrada (MPPT)
  inversores_entradas_por_mppt?: string;
  inversores_quantidade_mppt?: string;

  // Inversores - Saída CA
  inversores_potencia_max_saida?: string;
  inversores_tensao_max_ca?: string;
  inversores_tensao_min_ca?: string;
  inversores_tipo_conexao_saida?: string;
  tipo_conexao_rede_ca?: string;
  disjuntor_ca_polos?: string;
  modulos_total_strings?: string;
  modulos_microinversor?: string;
  modulos_strings_modulos?: string;

  // Levantamento de Carga (JSON serializado)
  carga_levantamento?: string;

  // Características físicas dos módulos (Tabela 4)
  modulos_eficiencia?: string;
  modulos_comprimento_m?: string;
  modulos_largura_m?: string;
  modulos_area_unitaria_m2?: string;
  modulos_peso_kg?: string;

  // Listas completas de equipamentos (novo formato JSON)
  modulos_lista?: string;
  inversores_lista?: string;

  // Dimensionamento dos Cabos
  cabo_isolacao_material?: string;
  cabo_cc_secao_mm2?: string;
  cabo_cc_capacidade_corrente_a?: string;
  cabo_cc_fator_temperatura?: string;
  cabo_cc_fator_agrupamento?: string;
  cabo_ca_secao_mm2?: string;
  cabo_ca_capacidade_corrente_a?: string;
  cabo_ca_fator_temperatura?: string;
  cabo_ca_fator_agrupamento?: string;

  // ✅ Campos do Memorial Descritivo
  conta_contrato?: string;
  classe_uc?: string;
  numero_poste_transformador?: string;
  numero_condutores_fase?: number;
  secao_fase_rl_mm2?: string;
  secao_neutro_rl_mm2?: string;
  disjuntor_ca_corrente_a?: string;
  disjuntor_quadro_ca_corrente_a?: string;
  disjuntor_quadro_ca_polos?: string;

  // ✅ Cabeamento CA por inversor e cabeamento geral (agrupadas)
  cabo_quadro_ca_secao_mm2?: string;
  cabo_quadro_ca_capacidade_corrente_a?: string;
  cabo_quadro_ca_fator_temperatura?: string;
  cabo_quadro_ca_fator_agrupamento?: string;
  secao_fase_mm2?: string;
  secao_neutro_mm2?: string;
  disjuntor_polos?: number;
  disjuntor_corrente_a?: string;
  disjuntor_tensao_v?: string;
  tipo_fornecimento?: string;
  modalidade_compensacao?: string;
  planta_situacao_url?: string;

  // 🆕 NOVO CAMPO: Proprietário do projeto (quem "possui" o projeto)
  owner_id?: string;

  createdAt: string | Date;
  updatedAt: string | Date;
  adminResponsibleId?: string;
  adminResponsibleName?: string;
  adminResponsibleEmail?: string;
  adminResponsiblePhone?: string;
  timelineEvents: TimelineEvent[];
  documents?: ProjectFile[];
  files?: ProjectFile[];
  comments?: Comment[];
  history?: ProjectHistory[];
  lastUpdateBy?: {
    uid: string;
    email?: string;
    role?: string;
    timestamp?: any;
    preciseTimestamp?: string;
  };

  // SLA fields
  status_changed_at?: string | Date | null;
  sla_expires_at?: string | Date | null;
  sla_expired?: boolean;

  // Kanban ordering field
  kanban_position?: number | null;

  // 🆕 BILLING MODE FIELDS: Modalidade de faturamento e snapshot
  billing_mode?: 'avulso' | 'pacote' | 'assinatura';
  billing_snapshot?: {
    mode: 'avulso' | 'pacote' | 'assinatura';
    // Para pacote
    pacote_id?: string;
    pacote_nome?: string;
    projetos_inclusos?: number;
    projetos_usados_antes?: number;
    projetos_usados_depois?: number;
    data_ativacao?: string;
    data_expiracao?: string;
    // Para assinatura
    assinatura_id?: string;
    plano_nome?: string;
    projetos_mensais?: number;
    dia_renovacao?: number;
    ultimo_reset?: string;
    proximo_reset?: string;
    status?: string;
    // Para avulso
    potencia?: number;
    valor_projeto?: number;
    // Timestamp de quando foi criado o snapshot
    timestamp?: string;
  } | null;
}

/**
 * Tipo para criação de um novo projeto (sem ID ou userId)
 */
export type NewProject = Omit<BaseProject, 'id' | 'userId' | 'updatedBy'> & {
  id?: string;
};

/**
 * Tipo para atualização de projeto (campos parciais + ID obrigatório)
 */
export type UpdatedProject = Partial<Project> & {
  id: string;
  timelineEvents: TimelineEvent[];
  error?: string;
  refresh?: boolean;
  changes?: Record<string, any>;
};

/**
 * Props para o componente de upload de arquivos
 */
export interface FileUploadSectionProps {
  project: Project;
  onUpdate: (files: File[]) => Promise<void>;
}

/**
 * Props para o componente de visualização expandida do projeto
 */
export interface ExpandedProjectViewProps {
  project: Project;
  onClose: () => void;
  onUpdate: (
    updatedProject: UpdatedProject, 
    user: { 
      uid: string; 
      email?: string | null; 
      role?: string; 
      userType?: string; 
    }
  ) => Promise<UpdatedProject>;
  onDelete?: (projectId: string) => Promise<void>;
  currentUser: User;
}

/**
 * Tipo para os dados que o cliente envia ao criar um projeto.
 */
export type CreateProjectClientData = Omit<Project, 
  'id' | 
  'createdAt' | 
  'updatedAt' | 
  'timelineEvents' | 
  'comments' | 
  'files' | 
  'documents' |
  'userId' |
  'number' |
  'lastUpdateBy'
> & {
  status?: ProjectStatus;
  prioridade?: ProjectPriority;
};