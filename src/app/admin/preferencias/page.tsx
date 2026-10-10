'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  getConfiguracaoGeral,
  atualizarMensagemChecklist,
  atualizarFaixasPotencia,
  atualizarDadosBancarios,
  atualizarResponsavelTecnico,
  atualizarTextoProcuracao,
  atualizarPrecificacaoManual,
  criarConfiguracaoPadrao,
  type FaixaPotenciaPreco,
  type DadosBancarios,
  type ResponsavelTecnico
} from '@/lib/services/configService.supabase';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { PlusCircle, Trash2, DollarSign, Columns3, FileText, Loader2, Mail, FileUp, GripVertical, ChevronDown, ChevronUp, AlertTriangle, Landmark, Copy } from 'lucide-react';
import { devLog } from "@/lib/utils/productionLogger";
import { cn } from '@/lib/utils';
import { getProjectStatuses, updateStatusSLA, updateStatusRoadmapVisibility, reorderKanbanColumns, type ProjectStatusInfo } from '@/lib/services/kanbanService';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { PackagesTab } from '@/components/admin/PackagesTab';
import { SubscriptionPlansTab } from '@/components/admin/SubscriptionPlansTab';
import { ProcuracaoRichEditor } from '@/components/admin/ProcuracaoEditor';
import { CHECKLIST_PADRAO } from '@/lib/constants/checklistPadrao';

type AreaId = 'kanban' | 'financeiro' | 'documentos' | 'comunicacao';

// Última faixa de preço "sem limite" é gravada com este teto e exibida como ∞
const FAIXA_SEM_LIMITE = 999999;

const ESTADOS_BR: [string, string][] = [
  ['AC', 'Acre'], ['AL', 'Alagoas'], ['AP', 'Amapá'], ['AM', 'Amazonas'], ['BA', 'Bahia'], ['CE', 'Ceará'],
  ['DF', 'Distrito Federal'], ['ES', 'Espírito Santo'], ['GO', 'Goiás'], ['MA', 'Maranhão'], ['MT', 'Mato Grosso'],
  ['MS', 'Mato Grosso do Sul'], ['MG', 'Minas Gerais'], ['PA', 'Pará'], ['PB', 'Paraíba'], ['PR', 'Paraná'],
  ['PE', 'Pernambuco'], ['PI', 'Piauí'], ['RJ', 'Rio de Janeiro'], ['RN', 'Rio Grande do Norte'],
  ['RS', 'Rio Grande do Sul'], ['RO', 'Rondônia'], ['RR', 'Roraima'], ['SC', 'Santa Catarina'], ['SP', 'São Paulo'],
  ['SE', 'Sergipe'], ['TO', 'Tocantins'],
];

const inputClass =
  'h-[38px] w-full rounded-lg border border-slate-300 bg-white px-[11px] text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-[3px] focus:ring-indigo-600/15 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100';
const selectClass = inputClass + ' pr-8';
const labelClass = 'mb-[5px] block text-xs font-semibold text-slate-700 dark:text-slate-300';
const helpClass = 'mb-3.5 max-w-[64ch] text-[12.5px] leading-normal text-slate-500 dark:text-slate-400';
const linkClass =
  'rounded-sm text-[12.5px] font-medium text-indigo-700 underline underline-offset-2 hover:text-indigo-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 dark:text-indigo-400';
const errorClass = 'mt-[5px] text-xs leading-snug text-red-700 dark:text-red-400';

const formatNumero = (n: number, casas = 2) => (Number(n) || 0).toLocaleString('pt-BR', { maximumFractionDigits: casas });
const formatBRL = (n: number) => `R$ ${formatNumero(n)}`;
const formatDinheiro = (n: number | null | undefined) =>
  n == null || isNaN(n as number) ? '' : Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// "3.200,50" e "3.200" são lidos como milhares; "3200.5" como decimal
const parseDinheiro = (texto: string): number => {
  let t = String(texto).replace(/[^\d,.]/g, '');
  if (!t) return 0;
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  const n = Number(t);
  return isNaN(n) ? 0 : n;
};

// ---- Máscaras e validações do responsável técnico (os dados vão para a procuração) ----
const maskCpf = (valor: string) => {
  const d = String(valor).replace(/\D/g, '').slice(0, 11);
  if (d.length > 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  if (d.length > 6) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  if (d.length > 3) return `${d.slice(0, 3)}.${d.slice(3)}`;
  return d;
};

// (DDD) 99999-9999 ou (DDD) 9999-9999. Números com DDI (+) ou com mais de 11 dígitos ficam como digitados.
const maskTelefone = (valor: string) => {
  const d = valor.replace(/\D/g, '');
  if (valor.trim().startsWith('+') || d.length > 11) return valor;
  if (!d) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

const cpfValido = (valor: string) => {
  const d = String(valor).replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const digito = (len: number) => {
    let soma = 0;
    for (let k = 0; k < len; k++) soma += Number(d.charAt(k)) * (len + 1 - k);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(9) === Number(d.charAt(9)) && digito(10) === Number(d.charAt(10));
};

// Campo vazio não é erro; só o que foi preenchido errado é apontado
const erroCpf = (v?: string) => (!v || cpfValido(v) ? '' : 'CPF inválido: confira os dígitos.');
const erroEmail = (v?: string) => (!v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : 'E-mail em formato inválido.');
const erroTelefone = (v?: string) => {
  if (!v || v.trim().startsWith('+')) return '';
  const d = v.replace(/\D/g, '');
  return d.length === 10 || d.length === 11 ? '' : 'Telefone incompleto: informe DDD e número.';
};

function PrefSwitch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-5 w-9 flex-shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'
      )}
    >
      <span
        className={cn(
          'absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
          checked && 'translate-x-4'
        )}
      />
    </button>
  );
}

// Seção recolhível: fechada, mostra no cabeçalho o resumo do valor atual
function PrefSection({
  title,
  summary,
  defaultOpen = false,
  children,
}: {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className="mb-3 rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="group flex w-full items-center gap-3 rounded-xl px-[18px] py-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
      >
        <span className="flex-shrink-0 text-sm font-bold text-slate-900 group-hover:text-indigo-700 dark:text-white dark:group-hover:text-indigo-300">
          {title}
        </span>
        <span className={cn('min-w-0 flex-1 truncate text-right text-[12.5px] tabular-nums text-slate-500 dark:text-slate-400', isOpen && 'invisible')}>
          {summary}
        </span>
        <ChevronDown className={cn('h-4 w-4 flex-shrink-0 text-slate-400 transition-transform', isOpen && 'rotate-180')} />
      </button>
      {isOpen && <div className="px-[18px] pb-[18px] pt-0.5">{children}</div>}
    </section>
  );
}

// Prévia de como algo aparece para o cliente ou em um documento
function PrefPreview({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('rounded-[10px] border border-dashed border-slate-300 bg-slate-50 p-3.5 dark:border-slate-600 dark:bg-slate-900/40', className)}>
      <div className="mb-2.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
      {children}
    </div>
  );
}

function PrefWarn({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      role="status"
      className={cn(
        'flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-[9px] text-[12.5px] leading-snug text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200',
        className
      )}
    >
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

// Campo de dinheiro: mostra "3.200,00" e, em edição, o número cru para digitar
function MoneyInput({
  value,
  onChange,
  ariaLabel,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  ariaLabel: string;
  className?: string;
}) {
  const [texto, setTexto] = useState<string | null>(null);

  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label={ariaLabel}
      autoComplete="off"
      value={texto !== null ? texto : formatDinheiro(value)}
      onFocus={(e) => {
        setTexto(value == null || isNaN(value) ? '' : String(value).replace('.', ','));
        const el = e.target;
        requestAnimationFrame(() => el.select());
      }}
      onChange={(e) => {
        setTexto(e.target.value);
        onChange(parseDinheiro(e.target.value));
      }}
      onBlur={() => setTexto(null)}
      className={cn(inputClass, 'tabular-nums', className)}
    />
  );
}

export default function PreferenciasPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>('kanban');
  const [mensagemChecklist, setMensagemChecklist] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [originalMessage, setOriginalMessage] = useState('');

  // Estados para a tabela de faixas de potência
  const [faixasPotencia, setFaixasPotencia] = useState<FaixaPotenciaPreco[]>([]);
  const [faixasPotenciaOriginal, setFaixasPotenciaOriginal] = useState<FaixaPotenciaPreco[]>([]);

  // Estados para dados bancários
  const [dadosBancarios, setDadosBancarios] = useState<DadosBancarios>({
    banco: '',
    agencia: '',
    conta: '',
    favorecido: '',
    documento: '',
    chavePix: ''
  });
  const [dadosBancariosOriginal, setDadosBancariosOriginal] = useState<DadosBancarios>({
    banco: '',
    agencia: '',
    conta: '',
    favorecido: '',
    documento: '',
    chavePix: ''
  });

  // Estados para Kanban
  const [kanbanStatuses, setKanbanStatuses] = useState<ProjectStatusInfo[]>([]);
  const [loadingKanban, setLoadingKanban] = useState(false);
  const [slaConfig, setSlaConfig] = useState<Record<string, { sla_days: number | null; sla_exclude_weekends: boolean }>>({});
  const [slaConfigOriginal, setSlaConfigOriginal] = useState<Record<string, { sla_days: number | null; sla_exclude_weekends: boolean }>>({});
  const [roadmapVisibility, setRoadmapVisibility] = useState<Record<string, boolean>>({});

  // Estados para Preferências de E-mail
  const [emailPreferences, setEmailPreferences] = useState({
    notify_project_created: true,
    notify_status_change: true,
    notify_document_added: true,
    notify_comment_added: true
  });
  const [loadingEmailPrefs, setLoadingEmailPrefs] = useState(false);

  // Estados para Documentos - Responsável Técnico
  const [responsavelTecnico, setResponsavelTecnico] = useState<ResponsavelTecnico>({
    nomeCompleto: '',
    cpf: '',
    rg: '',
    orgaoExpeditor: '',
    profissao: '',
    numeroRegistro: '',
    instituicao: 'CREA',
    estadoRegistro: '',
    email: '',
    uf: '',
    telefone: '',
  });
  const [responsavelOriginal, setResponsavelOriginal] = useState<ResponsavelTecnico>({
    nomeCompleto: '',
    cpf: '',
    rg: '',
    orgaoExpeditor: '',
    profissao: '',
    numeroRegistro: '',
    instituicao: 'CREA',
    estadoRegistro: '',
    email: '',
    uf: '',
    telefone: '',
  });

  // Estados para Texto da Procuração
  const [textoProcuracao, setTextoProcuracao] = useState('');
  const [textoProcuracaoOriginal, setTextoProcuracaoOriginal] = useState('');

  // Estados para Logo da Empresa
  const [logoEmpresaUrl, setLogoEmpresaUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [removingLogo, setRemovingLogo] = useState(false);

  // Estado para Precificação Manual
  const [precificacaoManual, setPrecificacaoManual] = useState(false);

  // Valores originais do que antes era salvo na hora (agora tudo passa pela barra "Salvar alterações")
  const [precificacaoManualOriginal, setPrecificacaoManualOriginal] = useState(false);
  const [roadmapVisibilityOriginal, setRoadmapVisibilityOriginal] = useState<Record<string, boolean>>({});
  const [kanbanOrderOriginal, setKanbanOrderOriginal] = useState<string[]>([]);
  const [emailPreferencesOriginal, setEmailPreferencesOriginal] = useState({
    notify_project_created: true,
    notify_status_change: true,
    notify_document_added: true,
    notify_comment_added: true
  });
  const [emailPrefsLoaded, setEmailPrefsLoaded] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [procuracaoEditorKey, setProcuracaoEditorKey] = useState(0);
  const [leaveHref, setLeaveHref] = useState<string | null>(null);

  const defaultChecklist = `Checklist de Documentos Necessários para o Projeto

Seu projeto está prestes a ser desenvolvido. Porém antes vamos precisar que você nos encaminhe os seguintes documentos:

Fatura de energia com dados legíveis.
Lista de materiais contendo: marca, modelo e quantidade de módulos, inversores e demais componentes, como por exemplo Stringbox (se houver).
Foto do documento completo (frente e verso) do responsável legal (CNH ou documento de identidade). Se a titularidade estiver em nome de pessoa jurídica (PJ), encaminhar também o cartão CNPJ e contrato social, além do documento de identidade do responsável legal pela unidade consumidora.
Foto do padrão de entrada.
Foto ou informação de qual é o DJ (disjuntor) do padrão de entrada.
Coordenada geográfica exata do local de instalação.
Instalação em telhado ou solo?
Se for seu primeiro projeto conosco, encaminhe a logo de sua empresa para a elaboração dos documentos.
Fotos complementares de onde será feita a instalação. Caso possuir, encaminhar imagens que auxiliam a avaliação do local, bem como possíveis fontes de sombreamento (caso houver)
Para os projetos na distribuidora ENEL ou EQUATORIAL, encaminhar foto que contenha o número do poste que alimenta a unidade consumidora, ou o poste mais próximo do local de atendimento.

Uma vez que todos os documentos sejam encaminhados, nossa equipe avaliará e em até 24h retornará informando se a documentação está de acordo, ou se necessita de alguma correção ou adição de documentos. Se tudo estiver correto, seu projeto seguirá para a próxima etapa para ser desenvolvido.`;

  const defaultProcuracao = `<div style="text-align: center; margin-bottom: 40px;">
<h2 style="font-weight: bold; font-size: 20px; letter-spacing: 2px;">PROCURAÇÃO</h2>
</div>

<div style="text-align: justify; line-height: 1.8; margin-bottom: 20px;">
<p style="margin-bottom: 15px;">
<strong>OUTORGANTE:</strong> Por este instrumento de procuração, {{cliente_nome}}, {{cliente_tipo}} sob o nº {{cliente_cpf}}, portador do RG nº {{cliente_rg}}.
</p>

<p style="margin-bottom: 15px;">
<strong>OUTORGADO:</strong> Nomeia e constitui o seu bastante procurador {{responsavel_nome}}, portador do RG nº {{responsavel_rg}} {{responsavel_orgao_expeditor}} e inscrito no CPF sob o nº {{responsavel_cpf}}, {{responsavel_profissao}} inscrito no {{responsavel_instituicao}}-{{responsavel_estado}} sob o nº {{responsavel_registro}}.
</p>

<p style="margin-bottom: 15px;">
<strong>PODERES:</strong> Para o fim especial de representar o OUTORGANTE perante à {{distribuidora}} no tocante as solicitações de parecer de acesso para micro geração ou mini geração, pedidos de vistoria de micro geração ou mini geração, pedidos de alteração de carga alteração de demanda, assim tendo ainda o OUTORGADO, na qualidade de procurador do OUTORGANTE, os poderes suficientes e necessários de representação para dar entrada em processos administrativos, protocolar requerimentos, apresentar documentação em cumprimento às exigências técnicas e administrativas e, ainda, assinatura dos seguintes documentos: formulário de solicitação de acesso, formulário de registro, formulário de compensação, ART/TRT, identificação do consumidor, termo de responsabilidade, cadastro de geração distribuída, solicitação de vistoria, formulário de troca do padrão/aumento de carga e formulário de ligação nova.
</p>

<p style="margin-bottom: 20px;">
Assim sendo, durante o prazo de 1 (um) ano, contado a partir da data de assinatura desta procuração.
</p>

<p style="margin-bottom: 30px;">
{{cidade}}-{{estado}}, {{data}}.
</p>
</div>

<div style="text-align: center; margin-top: 60px;">
<div style="display: inline-block; border-top: 2px solid #000; width: 350px; padding-top: 8px; margin-bottom: 15px;">
<strong>Assinatura</strong>
</div>
<div style="margin-top: 12px; font-size: 14px;">
<strong>Nome do Responsável Legal:</strong> {{cliente_responsavel_legal_nome}}
</div>
<div style="margin-top: 8px; font-size: 14px;">
<strong>CPF:</strong> {{cliente_responsavel_legal_cpf}}
</div>
</div>`;

  // Função para criar uma tabela de faixas de potência padrão
  const criarFaixasPotenciaPadrao = (): FaixaPotenciaPreco[] => {
    return [
      { potenciaMin: 0, potenciaMax: 5, valorBase: 600 },
      { potenciaMin: 5, potenciaMax: 10, valorBase: 700 },
      { potenciaMin: 10, potenciaMax: 20, valorBase: 800 },
      { potenciaMin: 20, potenciaMax: 30, valorBase: 1000 },
      { potenciaMin: 30, potenciaMax: 40, valorBase: 1200 },
      { potenciaMin: 40, potenciaMax: 50, valorBase: 1750 },
      { potenciaMin: 50, potenciaMax: 75, valorBase: 2500 },
      { potenciaMin: 75, potenciaMax: 150, valorBase: 3000 },
      { potenciaMin: 150, potenciaMax: 300, valorBase: 4000 },
      { potenciaMin: 300, potenciaMax: 999999, valorBase: 4000 },
    ];
  };

  useEffect(() => {
    const carregarConfiguracoes = async () => {
      if (!user) return;

      try {
        setIsLoading(true);
        const configDoc = await getConfiguracaoGeral();

        if (configDoc) {
          const data = configDoc;
          const checklist = data.mensagemChecklist || defaultChecklist;
          setMensagemChecklist(checklist);
          setOriginalMessage(checklist);

          if (data.faixasPotencia && Array.isArray(data.faixasPotencia)) {
            setFaixasPotencia(data.faixasPotencia);
            setFaixasPotenciaOriginal(data.faixasPotencia);
          } else {
            const faixasPadrao = criarFaixasPotenciaPadrao();
            setFaixasPotencia(faixasPadrao);
            setFaixasPotenciaOriginal(faixasPadrao);
          }

          if (data.dadosBancarios) {
            setDadosBancarios(data.dadosBancarios);
            setDadosBancariosOriginal(data.dadosBancarios);
          }

          // Carregar dados do responsável técnico
          if (data.responsavelTecnico) {
            setResponsavelTecnico(data.responsavelTecnico);
            setResponsavelOriginal(data.responsavelTecnico);
          }

          // Carregar texto da procuração
          if (data.textoProcuracao) {
            setTextoProcuracao(data.textoProcuracao);
            setTextoProcuracaoOriginal(data.textoProcuracao);
          } else {
            setTextoProcuracao(defaultProcuracao);
            setTextoProcuracaoOriginal(defaultProcuracao);
          }

          // Carregar modo de precificação manual
          if (data.precificacaoManual !== undefined) {
            setPrecificacaoManual(data.precificacaoManual);
            setPrecificacaoManualOriginal(data.precificacaoManual);
          }

          // Carregar logo da empresa
          if (data.logoEmpresaUrl) {
            setLogoEmpresaUrl(data.logoEmpresaUrl);
          }
        } else {
          setMensagemChecklist(defaultChecklist);
          setOriginalMessage(defaultChecklist);
          const faixasPadrao = criarFaixasPotenciaPadrao();
          setFaixasPotencia(faixasPadrao);
          setFaixasPotenciaOriginal(faixasPadrao);
          
          // Inicializar texto da procuração com o padrão
          setTextoProcuracao(defaultProcuracao);
          setTextoProcuracaoOriginal(defaultProcuracao);

          await criarConfiguracaoPadrao();
        }
      } catch (error) {
        devLog.error('Erro ao carregar configurações:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar as configurações.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    carregarConfiguracoes();
  }, [user, defaultChecklist]);

  // Carregar status do Kanban quando a área Kanban for acessada (é a área inicial,
  // então espera o usuário estar disponível antes de buscar)
  useEffect(() => {
    if (activeTab === 'kanban' && user && kanbanStatuses.length === 0) {
      carregarStatusKanban();
    }
  }, [activeTab, user]);

  // Carregar preferências de email na primeira vez que a área Comunicação for acessada
  // (uma vez só, para não sobrescrever alterações ainda não salvas ao voltar para a área)
  useEffect(() => {
    if (activeTab === 'comunicacao' && user && !emailPrefsLoaded) {
      carregarPreferenciasEmail();
    }
  }, [activeTab, user, emailPrefsLoaded]);

  const carregarStatusKanban = async () => {
    try {
      setLoadingKanban(true);
      const statuses = await getProjectStatuses();
      setKanbanStatuses(statuses);

      // Inicializar configurações de SLA com valores do banco
      const initialSlaConfig: Record<string, { sla_days: number | null; sla_exclude_weekends: boolean }> = {};
      statuses.forEach(status => {
        initialSlaConfig[status.id] = {
          sla_days: status.slaDays ?? null,
          sla_exclude_weekends: status.slaExcludeWeekends !== undefined ? status.slaExcludeWeekends : true
        };
      });

      setSlaConfig(initialSlaConfig);
      setSlaConfigOriginal(JSON.parse(JSON.stringify(initialSlaConfig))); // Deep copy

      // Inicializar visibilidade no roadmap com valores do banco
      const initialRoadmapVisibility: Record<string, boolean> = {};
      statuses.forEach(status => {
        initialRoadmapVisibility[status.id] = status.visibleInRoadmap !== undefined ? status.visibleInRoadmap : true;
      });
      setRoadmapVisibility(initialRoadmapVisibility);
      setRoadmapVisibilityOriginal({ ...initialRoadmapVisibility });
      setKanbanOrderOriginal(statuses.map(status => status.id));
    } catch (error) {
      devLog.error('Erro ao carregar status do Kanban:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as colunas do Kanban.',
        variant: 'destructive',
      });
    } finally {
      setLoadingKanban(false);
    }
  };

  // Função para carregar preferências de email
  const carregarPreferenciasEmail = async () => {
    if (!user?.id) return;

    try {
      setLoadingEmailPrefs(true);
      const response = await fetch(`/api/admin/email-notifications?user_id=${user.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar preferências de email');
      }

      const result = await response.json();
      if (result.success && result.data) {
        setEmailPreferences(result.data);
        setEmailPreferencesOriginal({ ...result.data });
      }
    } catch (error) {
      devLog.error('Erro ao carregar preferências de email:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as preferências de email.',
        variant: 'destructive',
      });
    } finally {
      setLoadingEmailPrefs(false);
      setEmailPrefsLoaded(true);
    }
  };

  const handleLogoUpload = async (file: File) => {
    setUploadingLogo(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/admin/config/logo-empresa', { method: 'POST', body: form });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Erro ao enviar logo');
      setLogoEmpresaUrl(json.url);
      toast({ title: 'Logo atualizada com sucesso!' });
    } catch (err: any) {
      toast({ title: 'Erro ao enviar logo', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleLogoRemove = async () => {
    setRemovingLogo(true);
    try {
      const res = await fetch('/api/admin/config/logo-empresa', { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Erro ao remover logo');
      setLogoEmpresaUrl(null);
      toast({ title: 'Logo removida.' });
    } catch (err: any) {
      toast({ title: 'Erro ao remover logo', description: err.message, variant: 'destructive' });
    } finally {
      setRemovingLogo(false);
    }
  };

  const atualizarCampoDadosBancarios = (campo: keyof DadosBancarios, valor: string) => {
    setDadosBancarios(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  // ═════════════ Alterações pendentes: tudo é editado na tela e gravado pela barra "Salvar alterações" ═════════════
  const areaAtiva = activeTab as AreaId;
  const faixasOrdenadas = [...faixasPotencia].sort((a, b) => a.potenciaMin - b.potenciaMin);
  const ordenar = (faixas: FaixaPotenciaPreco[]) => JSON.stringify([...faixas].sort((a, b) => a.potenciaMin - b.potenciaMin));

  const dirty = {
    checklist: mensagemChecklist !== originalMessage,
    banco: JSON.stringify(dadosBancarios) !== JSON.stringify(dadosBancariosOriginal),
    faixas: ordenar(faixasPotencia) !== ordenar(faixasPotenciaOriginal),
    precificacao: precificacaoManual !== precificacaoManualOriginal,
    sla: JSON.stringify(slaConfig) !== JSON.stringify(slaConfigOriginal),
    roadmap: JSON.stringify(roadmapVisibility) !== JSON.stringify(roadmapVisibilityOriginal),
    ordem: kanbanOrderOriginal.length > 0 && kanbanStatuses.map(s => s.id).join('|') !== kanbanOrderOriginal.join('|'),
    responsavel: JSON.stringify(responsavelTecnico) !== JSON.stringify(responsavelOriginal),
    procuracao: textoProcuracao !== textoProcuracaoOriginal,
    emails: JSON.stringify(emailPreferences) !== JSON.stringify(emailPreferencesOriginal),
  };
  const dirtyPorArea: Record<AreaId, boolean> = {
    kanban: dirty.sla || dirty.roadmap || dirty.ordem,
    financeiro: dirty.banco || dirty.faixas || dirty.precificacao,
    documentos: dirty.responsavel || dirty.procuracao,
    comunicacao: dirty.checklist || dirty.emails,
  };
  const isDirty = Object.values(dirty).some(Boolean);

  const respErros = {
    cpf: erroCpf(responsavelTecnico.cpf),
    email: erroEmail(responsavelTecnico.email),
    telefone: erroTelefone(responsavelTecnico.telefone),
  };

  // ---- Colunas do Kanban ----
  const moverColuna = (from: number, to: number) => {
    if (from === to || to < 0 || to >= kanbanStatuses.length) return;
    const reordered = [...kanbanStatuses];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    setKanbanStatuses(reordered);
  };

  const handleColunasDragEnd = (result: DropResult) => {
    const { destination, source } = result;
    if (!destination) return;
    moverColuna(source.index, destination.index);
  };

  const prazoDe = (statusId: string) => slaConfig[statusId]?.sla_days ?? null;
  const prazoTotal = kanbanStatuses.reduce((total, s) => total + (Number(prazoDe(s.id)) || 0), 0);
  const prazoMaximo = Math.max(1, ...kanbanStatuses.map(s => Number(prazoDe(s.id)) || 0));
  const etapasVisiveis = kanbanStatuses.filter(s => roadmapVisibility[s.id] ?? true);

  // ---- Tabela de preços: cada faixa começa onde a anterior termina; só o "até" é informado ----
  const atualizarFaixaAte = (index: number, valor: number) => {
    const faixas = faixasOrdenadas.map(f => ({ ...f }));
    faixas[index].potenciaMax = valor;
    if (faixas[index + 1]) faixas[index + 1].potenciaMin = valor;
    setFaixasPotencia(faixas);
  };

  const atualizarFaixaValor = (index: number, valor: number) => {
    const faixas = faixasOrdenadas.map(f => ({ ...f }));
    faixas[index].valorBase = valor;
    setFaixasPotencia(faixas);
  };

  // Divide a última faixa: ela ganha um teto e a nova passa a ser a "sem limite"
  const adicionarFaixa = () => {
    const faixas = faixasOrdenadas.map(f => ({ ...f }));
    const ultima = faixas[faixas.length - 1];
    if (!ultima) {
      setFaixasPotencia([{ potenciaMin: 0, potenciaMax: FAIXA_SEM_LIMITE, valorBase: 0 }]);
      return;
    }
    if (ultima.potenciaMax === FAIXA_SEM_LIMITE) {
      ultima.potenciaMax = ultima.potenciaMin > 0 ? ultima.potenciaMin * 2 : 10;
    }
    faixas.push({ potenciaMin: ultima.potenciaMax, potenciaMax: FAIXA_SEM_LIMITE, valorBase: ultima.valorBase });
    setFaixasPotencia(faixas);
  };

  const removerFaixa = (index: number) => {
    const faixas = faixasOrdenadas.map(f => ({ ...f }));
    const [removida] = faixas.splice(index, 1);
    if (faixas[index]) {
      // a faixa seguinte passa a começar onde a removida começava
      faixas[index].potenciaMin = removida.potenciaMin;
    } else if (faixas[index - 1] && removida.potenciaMax === FAIXA_SEM_LIMITE) {
      // removeu a "sem limite": a anterior assume esse papel
      faixas[index - 1].potenciaMax = FAIXA_SEM_LIMITE;
    }
    setFaixasPotencia(faixas);
  };

  const avisosFaixas: string[] = [];
  faixasOrdenadas.forEach((faixa, i) => {
    if (!(faixa.potenciaMax > faixa.potenciaMin)) {
      avisosFaixas.push(`A faixa ${i + 1} precisa terminar acima de ${formatNumero(faixa.potenciaMin)} kWp, onde ela começa.`);
    }
    const proxima = faixasOrdenadas[i + 1];
    if (proxima && proxima.potenciaMin > faixa.potenciaMax) {
      avisosFaixas.push(`Há um intervalo sem preço entre ${formatNumero(faixa.potenciaMax)} e ${formatNumero(proxima.potenciaMin)} kWp.`);
    }
    if (proxima && proxima.potenciaMin < faixa.potenciaMax) {
      avisosFaixas.push(`As faixas ${i + 1} e ${i + 2} se sobrepõem.`);
    }
  });
  const ultimaFaixa = faixasOrdenadas[faixasOrdenadas.length - 1];
  const faixasInvalidas = faixasOrdenadas.some((faixa, i) =>
    !(faixa.potenciaMax > faixa.potenciaMin) ||
    (faixasOrdenadas[i + 1] && faixasOrdenadas[i + 1].potenciaMin < faixa.potenciaMax)
  );

  // ---- Checklist: prévia no formato do evento da linha do tempo (título + parágrafos; "-" vira lista) ----
  const checklistLinhas = mensagemChecklist.split('\n');
  const checklistTitulo = (checklistLinhas[0] || '').trim() || 'Checklist de Documentos Necessários para o Projeto';
  const checklistBlocos: { tipo: 'p' | 'li'; texto: string }[] = checklistLinhas.slice(1)
    .map(linha => linha.trim())
    .filter(Boolean)
    .map(linha => (linha.startsWith('-') ? { tipo: 'li' as const, texto: linha.slice(1).trim() } : { tipo: 'p' as const, texto: linha }));

  // ---- Salvar / descartar ----
  const salvarTudo = async () => {
    if (!user || savingAll) return;

    if (dirty.faixas && faixasInvalidas) {
      setActiveTab('financeiro');
      toast({
        title: 'Tabela de preços com faixas inválidas',
        description: avisosFaixas[0] || 'Confira os limites das faixas antes de salvar.',
        variant: 'destructive',
      });
      return;
    }

    if (dirty.responsavel && (respErros.cpf || respErros.email || respErros.telefone)) {
      setActiveTab('documentos');
      toast({
        title: 'Dados do responsável técnico',
        description: 'Corrija os campos destacados antes de salvar.',
        variant: 'destructive',
      });
      return;
    }

    setSavingAll(true);
    const falhas: string[] = [];
    // Cada parte é gravada pela mesma função de antes; uma falha não impede as outras
    const tentar = async (rotulo: string, acao: () => Promise<unknown>) => {
      try {
        const resultado = await acao();
        if (resultado === false) {
          falhas.push(rotulo);
          return false;
        }
        return true;
      } catch (error) {
        devLog.error(`[Preferências] Erro ao salvar ${rotulo}:`, error);
        falhas.push(rotulo);
        return false;
      }
    };

    try {
      if (dirty.checklist && await tentar('checklist de documentos', () => atualizarMensagemChecklist(mensagemChecklist))) {
        setOriginalMessage(mensagemChecklist);
      }

      if (dirty.banco && await tentar('dados bancários', () => atualizarDadosBancarios(dadosBancarios))) {
        setDadosBancariosOriginal({ ...dadosBancarios });
      }

      if (dirty.faixas && await tentar('tabela de preços', () => atualizarFaixasPotencia(faixasOrdenadas))) {
        setFaixasPotencia(faixasOrdenadas);
        setFaixasPotenciaOriginal(faixasOrdenadas.map(f => ({ ...f })));
      }

      if (dirty.precificacao && await tentar('precificação', () => atualizarPrecificacaoManual(precificacaoManual, user.id))) {
        setPrecificacaoManualOriginal(precificacaoManual);
      }

      if (dirty.ordem && await tentar('ordem das colunas', () => reorderKanbanColumns(kanbanStatuses.map(s => s.id)))) {
        setKanbanOrderOriginal(kanbanStatuses.map(s => s.id));
      }

      if (dirty.sla) {
        const alterados = kanbanStatuses.filter(s => JSON.stringify(slaConfig[s.id]) !== JSON.stringify(slaConfigOriginal[s.id]));
        const salvou = await tentar('prazos das etapas', () => Promise.all(
          alterados.map(s => updateStatusSLA(s.id, slaConfig[s.id].sla_days, slaConfig[s.id].sla_exclude_weekends))
        ));
        if (salvou) setSlaConfigOriginal(JSON.parse(JSON.stringify(slaConfig)));
      }

      if (dirty.roadmap) {
        const alterados = kanbanStatuses.filter(s => (roadmapVisibility[s.id] ?? true) !== (roadmapVisibilityOriginal[s.id] ?? true));
        const salvou = await tentar('etapas visíveis para o cliente', () => Promise.all(
          alterados.map(s => updateStatusRoadmapVisibility(s.id, roadmapVisibility[s.id] ?? true))
        ));
        if (salvou) setRoadmapVisibilityOriginal({ ...roadmapVisibility });
      }

      if (dirty.responsavel && await tentar('responsável técnico', () => atualizarResponsavelTecnico(responsavelTecnico))) {
        setResponsavelOriginal({ ...responsavelTecnico });
      }

      if (dirty.procuracao && await tentar('texto da procuração', () => atualizarTextoProcuracao(textoProcuracao))) {
        setTextoProcuracaoOriginal(textoProcuracao);
      }

      if (dirty.emails) {
        const chaves = (Object.keys(emailPreferences) as (keyof typeof emailPreferences)[])
          .filter(chave => emailPreferences[chave] !== emailPreferencesOriginal[chave]);
        const salvou = await tentar('notificações por e-mail', async () => {
          for (const chave of chaves) {
            const response = await fetch('/api/admin/email-notifications', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user_id: user.id, [chave]: emailPreferences[chave] }),
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok || !result.success) throw new Error(result.error || 'Erro ao atualizar preferência');
          }
        });
        if (salvou) setEmailPreferencesOriginal({ ...emailPreferences });
      }

      if (falhas.length === 0) {
        toast({
          title: 'Alterações salvas',
          description: 'As preferências foram atualizadas com sucesso.',
        });
      } else {
        toast({
          title: 'Algumas alterações não foram salvas',
          description: `Não foi possível salvar: ${falhas.join(', ')}. O restante foi gravado.`,
          variant: 'destructive',
        });
      }
    } finally {
      setSavingAll(false);
    }
  };

  const descartarTudo = () => {
    setMensagemChecklist(originalMessage);
    setDadosBancarios({ ...dadosBancariosOriginal });
    setFaixasPotencia(faixasPotenciaOriginal.map(f => ({ ...f })));
    setPrecificacaoManual(precificacaoManualOriginal);
    setSlaConfig(JSON.parse(JSON.stringify(slaConfigOriginal)));
    setRoadmapVisibility({ ...roadmapVisibilityOriginal });
    if (kanbanOrderOriginal.length > 0) {
      setKanbanStatuses(prev =>
        kanbanOrderOriginal.map(id => prev.find(s => s.id === id)).filter(Boolean) as ProjectStatusInfo[]
      );
    }
    setResponsavelTecnico({ ...responsavelOriginal });
    setTextoProcuracao(textoProcuracaoOriginal);
    setProcuracaoEditorKey(k => k + 1); // o editor só lê o texto ao montar: remonta para refletir o descarte
    setEmailPreferences({ ...emailPreferencesOriginal });
  };

  // Sair com alterações pendentes: aviso do navegador ao fechar/recarregar e confirmação ao clicar em outro link
  useEffect(() => {
    if (!isDirty) return;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      e.preventDefault();
      e.stopPropagation();
      setLeaveHref(url.pathname + url.search + url.hash);
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [isDirty]);

  const areas: { id: AreaId; nome: string; desc: string; icon: React.ReactNode }[] = [
    { id: 'kanban', nome: 'Kanban', desc: 'Colunas, prazos e o que o cliente vê', icon: <Columns3 className="h-4 w-4" /> },
    { id: 'financeiro', nome: 'Financeiro', desc: 'Dados bancários, preços, pacotes e planos', icon: <DollarSign className="h-4 w-4" /> },
    { id: 'documentos', nome: 'Documentos', desc: 'Logo, responsável técnico e procuração', icon: <FileText className="h-4 w-4" /> },
    { id: 'comunicacao', nome: 'Comunicação', desc: 'Checklist de documentos e e-mails', icon: <Mail className="h-4 w-4" /> },
  ];
  const areaInfo = areas.find(a => a.id === areaAtiva) || areas[0];

  const notificacoes: { chave: keyof typeof emailPreferences; titulo: string; desc: string }[] = [
    { chave: 'notify_project_created', titulo: 'Novo projeto criado', desc: 'Quando um cliente criar um novo projeto.' },
    { chave: 'notify_status_change', titulo: 'Mudança de status', desc: 'Quando o status de um projeto for alterado.' },
    { chave: 'notify_document_added', titulo: 'Documento adicionado', desc: 'Quando um documento for adicionado a um projeto.' },
    { chave: 'notify_comment_added', titulo: 'Comentário adicionado', desc: 'Quando um comentário for adicionado a um projeto.' },
  ];
  const notificacoesAtivas = notificacoes.filter(n => emailPreferences[n.chave]).length;

  const colunaGrid = 'grid grid-cols-[78px_minmax(0,1.4fr)_96px_minmax(60px,1fr)_84px_70px] items-center gap-4';
  const totalVariaveis = ((textoProcuracao || defaultProcuracao).match(/\{\{\w+\}\}/g) || []).length;

  return (
    <div>
      {/* Faixa de topo */}
      <div className="mb-5 rounded-[14px] bg-gradient-to-r from-indigo-600 to-violet-700 px-[22px] py-4 text-white">
        <h1 className="text-xl font-extrabold">Preferências</h1>
        <p className="mt-0.5 text-[12.5px] text-indigo-100">Configurações e preferências gerais do sistema</p>
      </div>

      <div className="flex max-w-[1280px] flex-col items-start gap-4 lg:flex-row lg:gap-7">
        {/* Menu lateral de áreas */}
        <nav aria-label="Áreas de preferências" className="flex w-full flex-shrink-0 gap-1 overflow-x-auto lg:sticky lg:top-3.5 lg:w-[300px] lg:flex-col">
          {areas.map((area) => {
            const ativa = area.id === areaAtiva;
            return (
              <button
                key={area.id}
                type="button"
                aria-current={ativa ? 'true' : undefined}
                onClick={() => setActiveTab(area.id)}
                className={cn(
                  'flex flex-shrink-0 items-start gap-[11px] rounded-[10px] border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2',
                  ativa
                    ? 'border-indigo-100 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300 dark:hover:bg-slate-800'
                )}
              >
                <span className={cn('mt-0.5 flex-shrink-0', ativa ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-400')}>{area.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-semibold">{area.nome}</span>
                  <span className="mt-px hidden text-[11.5px] leading-snug text-slate-500 dark:text-slate-400 lg:block">{area.desc}</span>
                </span>
                {dirtyPorArea[area.id] && (
                  <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-amber-500" title="Alterações não salvas">
                    <span className="sr-only">Alterações não salvas</span>
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="w-full min-w-0 flex-1 lg:max-w-[1016px]">
          <div className="mb-3.5 mt-0.5">
            <h2 className="text-[17px] font-bold text-slate-900 dark:text-white">{areaInfo.nome}</h2>
            <p className="mt-0.5 text-[12.5px] text-slate-500 dark:text-slate-400">{areaInfo.desc}</p>
          </div>

          {/* ═════════════ KANBAN ═════════════ */}
          {areaAtiva === 'kanban' && (
            <PrefSection
              title="Colunas do Kanban"
              defaultOpen
              summary={`${kanbanStatuses.length} colunas · ${prazoTotal} dias no total · ${etapasVisiveis.length} ${etapasVisiveis.length === 1 ? 'visível' : 'visíveis'} para o cliente`}
            >
              {loadingKanban && kanbanStatuses.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
                  <span className="ml-3 text-sm text-slate-600 dark:text-slate-300">Carregando colunas...</span>
                </div>
              ) : kanbanStatuses.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <Columns3 className="mx-auto mb-4 h-10 w-10 opacity-50" />
                  <p className="text-sm">Nenhuma coluna encontrada no Kanban.</p>
                </div>
              ) : (
                <>
                  <p className={helpClass}>
                    Arraste pela alça (ou use as setas) para definir a ordem das colunas. O prazo é quantos dias a etapa pode levar
                    antes de o projeto aparecer como atrasado; deixe vazio para não aplicar prazo.
                  </p>

                  <div className={cn(colunaGrid, 'border-b border-slate-200 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-700')}>
                    <span>Ordem</span>
                    <span>Coluna</span>
                    <span>Prazo</span>
                    <span>Proporção</span>
                    <span className="text-center">Só dias úteis</span>
                    <span className="text-center">Cliente vê</span>
                  </div>

                  <DragDropContext onDragEnd={handleColunasDragEnd}>
                    <Droppable droppableId="preferencias-colunas">
                      {(provided) => (
                        <div ref={provided.innerRef} {...provided.droppableProps}>
                          {kanbanStatuses.map((status, index) => {
                            const prazo = prazoDe(status.id);
                            const temPrazo = prazo !== null && prazo !== undefined;
                            return (
                              <Draggable key={status.id} draggableId={status.id} index={index}>
                                {(draggable, snapshot) => (
                                  <div
                                    ref={draggable.innerRef}
                                    {...draggable.draggableProps}
                                    className={cn(
                                      colunaGrid,
                                      'border-b border-slate-100 bg-white py-3 dark:border-slate-700/60 dark:bg-slate-800',
                                      snapshot.isDragging && 'rounded-lg border-indigo-200 shadow-lg ring-2 ring-indigo-400/40'
                                    )}
                                  >
                                    <div className="flex items-center gap-px">
                                      <span
                                        {...draggable.dragHandleProps}
                                        title="Arraste para reordenar"
                                        aria-label={`Arrastar ${status.name}`}
                                        className="flex h-7 w-[22px] cursor-grab items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 active:cursor-grabbing dark:hover:bg-slate-700"
                                      >
                                        <GripVertical className="h-3.5 w-3.5" />
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => moverColuna(index, index - 1)}
                                        disabled={index === 0}
                                        aria-label={`Mover ${status.name} para cima`}
                                        className="flex h-7 w-[26px] items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:pointer-events-none disabled:opacity-30 dark:hover:bg-slate-700"
                                      >
                                        <ChevronUp className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => moverColuna(index, index + 1)}
                                        disabled={index === kanbanStatuses.length - 1}
                                        aria-label={`Mover ${status.name} para baixo`}
                                        className="flex h-7 w-[26px] items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:pointer-events-none disabled:opacity-30 dark:hover:bg-slate-700"
                                      >
                                        <ChevronDown className="h-3.5 w-3.5" />
                                      </button>
                                    </div>

                                    <div className="flex min-w-0 items-center gap-[9px]">
                                      <span className="h-[9px] w-[9px] flex-shrink-0 rounded-full" style={{ backgroundColor: status.color }} />
                                      <div className="min-w-0">
                                        <span className="text-[13.5px] font-semibold text-slate-900 dark:text-white">{status.name}</span>
                                        {status.isDefault && (
                                          <span
                                            title="Etapa em que os projetos novos começam"
                                            className="ml-1.5 inline-block rounded-full bg-indigo-50 px-2 py-px align-[1px] text-[10.5px] font-semibold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                                          >
                                            Padrão
                                          </span>
                                        )}
                                        <span className="block text-[11.5px] text-slate-400">
                                          {status.projectCount} projeto{status.projectCount !== 1 ? 's' : ''}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                      <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        placeholder="—"
                                        aria-label={`Prazo de ${status.name} em dias`}
                                        value={temPrazo ? prazo : ''}
                                        onChange={(e) => {
                                          const value = e.target.value === '' ? null : parseInt(e.target.value);
                                          setSlaConfig(prev => ({
                                            ...prev,
                                            [status.id]: {
                                              ...prev[status.id],
                                              sla_days: value !== null && isNaN(value) ? null : value
                                            }
                                          }));
                                        }}
                                        className={cn(inputClass, 'h-[34px] px-2 text-right tabular-nums')}
                                      />
                                      <span>dias</span>
                                    </div>

                                    {temPrazo ? (
                                      <>
                                        <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                                          <div
                                            className="h-full rounded-full bg-indigo-600 transition-[width]"
                                            style={{ width: `${Math.round(((Number(prazo) || 0) / prazoMaximo) * 100)}%` }}
                                          />
                                        </div>
                                        <div className="flex justify-center">
                                          <PrefSwitch
                                            label={`Contar só dias úteis em ${status.name}`}
                                            checked={slaConfig[status.id]?.sla_exclude_weekends || false}
                                            onChange={(checked) => setSlaConfig(prev => ({
                                              ...prev,
                                              [status.id]: { ...prev[status.id], sla_exclude_weekends: checked }
                                            }))}
                                          />
                                        </div>
                                      </>
                                    ) : (
                                      <div className="col-span-2 text-[12.5px] text-slate-400">Sem prazo</div>
                                    )}

                                    <div className="flex justify-center">
                                      <PrefSwitch
                                        label={`Mostrar ${status.name} no roadmap do cliente`}
                                        checked={roadmapVisibility[status.id] ?? true}
                                        onChange={(checked) => setRoadmapVisibility(prev => ({ ...prev, [status.id]: checked }))}
                                      />
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            );
                          })}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>

                  <p className="mt-3 text-[13px] text-slate-600 dark:text-slate-300">
                    Prazo total do projeto: <strong className="tabular-nums text-slate-900 dark:text-white">{prazoTotal} dias</strong>
                  </p>

                  <PrefPreview label="Como o cliente vê o roadmap" className="mt-4">
                    {etapasVisiveis.length === 0 ? (
                      <PrefWarn>
                        <strong className="font-semibold">O cliente não vê nenhuma etapa.</strong> Com &quot;Cliente vê&quot; desligado em
                        todas as colunas, o roadmap não aparece no portal do cliente.
                      </PrefWarn>
                    ) : (
                      <>
                        <div className="mb-2 flex gap-[5px]">
                          {etapasVisiveis.map((status, i) => (
                            <div
                              key={status.id}
                              className={cn(
                                'h-3 flex-1 rounded-[3px] bg-gradient-to-r',
                                i === etapasVisiveis.length - 1 ? 'from-sky-400 to-green-400' : 'from-blue-600 to-sky-400'
                              )}
                            />
                          ))}
                        </div>
                        <div className="flex gap-[5px]">
                          {etapasVisiveis.map((status, i) => (
                            <span
                              key={status.id}
                              className={cn(
                                'flex-1 px-0.5 text-center text-[10px] leading-tight',
                                i === etapasVisiveis.length - 1 ? 'font-bold text-green-700 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'
                              )}
                            >
                              {status.name}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </PrefPreview>
                </>
              )}
            </PrefSection>
          )}

          {/* ═════════════ FINANCEIRO ═════════════ */}
          {areaAtiva === 'financeiro' && (
            <>
              <PrefSection
                title="Dados bancários"
                defaultOpen
                summary={dadosBancarios.banco ? `${dadosBancarios.banco} · Ag. ${dadosBancarios.agencia} · Conta ${dadosBancarios.conta}` : 'Não informados'}
              >
                <p className={helpClass}>Dados para recebimentos, exibidos nas faturas enviadas aos clientes.</p>
                <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
                    <div className="col-span-2">
                      <label htmlFor="pref-banco" className={labelClass}>Banco</label>
                      <input id="pref-banco" className={inputClass} value={dadosBancarios.banco} onChange={(e) => atualizarCampoDadosBancarios('banco', e.target.value)} placeholder="Ex: Itaú" />
                    </div>
                    <div className="col-span-2">
                      <label htmlFor="pref-favorecido" className={labelClass}>Nome do favorecido</label>
                      <input id="pref-favorecido" className={inputClass} value={dadosBancarios.favorecido} onChange={(e) => atualizarCampoDadosBancarios('favorecido', e.target.value)} placeholder="Ex: Empresa de Engenharia LTDA" />
                    </div>
                    <div>
                      <label htmlFor="pref-agencia" className={labelClass}>Agência</label>
                      <input id="pref-agencia" className={inputClass} value={dadosBancarios.agencia} onChange={(e) => atualizarCampoDadosBancarios('agencia', e.target.value)} placeholder="Ex: 1234" />
                    </div>
                    <div>
                      <label htmlFor="pref-conta" className={labelClass}>Conta</label>
                      <input id="pref-conta" className={inputClass} value={dadosBancarios.conta} onChange={(e) => atualizarCampoDadosBancarios('conta', e.target.value)} placeholder="Ex: 12345-6" />
                    </div>
                    <div className="col-span-2">
                      <label htmlFor="pref-documento" className={labelClass}>CNPJ/CPF</label>
                      <input id="pref-documento" className={inputClass} value={dadosBancarios.documento} onChange={(e) => atualizarCampoDadosBancarios('documento', e.target.value)} placeholder="Ex: 12.345.678/0001-90" />
                    </div>
                    <div className="col-span-2">
                      <label htmlFor="pref-pix" className={labelClass}>Chave PIX</label>
                      <input id="pref-pix" className={inputClass} value={dadosBancarios.chavePix} onChange={(e) => atualizarCampoDadosBancarios('chavePix', e.target.value)} placeholder="Ex: email@empresa.com.br" />
                    </div>
                  </div>

                  <PrefPreview label="Como aparece na fatura">
                    <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-slate-50 to-indigo-50 p-4 dark:border-indigo-900 dark:from-slate-800 dark:to-indigo-950/40">
                      <div className="flex items-center gap-[11px]">
                        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] bg-indigo-600 text-white">
                          <Landmark className="h-[18px] w-[18px]" />
                        </span>
                        <div className="min-w-0">
                          <span className="block truncate text-[14.5px] font-bold text-slate-900 dark:text-white">{dadosBancarios.banco || 'Banco'}</span>
                          <span className="text-[13px] tabular-nums text-slate-600 dark:text-slate-300">
                            Ag. {dadosBancarios.agencia || '—'} · Conta {dadosBancarios.conta || '—'}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3.5 grid grid-cols-2 gap-2.5 text-[12.5px] text-slate-800 dark:text-slate-200">
                        <div className="min-w-0">
                          <span className="block text-[10.5px] font-semibold uppercase tracking-wide text-slate-500">Favorecido</span>
                          <span className="break-words">{dadosBancarios.favorecido || '—'}</span>
                        </div>
                        <div className="min-w-0">
                          <span className="block text-[10.5px] font-semibold uppercase tracking-wide text-slate-500">CNPJ/CPF</span>
                          <span className="break-words">{dadosBancarios.documento || '—'}</span>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2.5 border-t border-indigo-200 pt-3 text-[12.5px] text-slate-800 dark:border-indigo-900 dark:text-slate-200">
                        <div className="min-w-0">
                          <span className="block text-[10.5px] font-semibold uppercase tracking-wide text-slate-500">Chave PIX</span>
                          <span className="break-all">{dadosBancarios.chavePix || '—'}</span>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!dadosBancarios.chavePix}
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(dadosBancarios.chavePix);
                              toast({ title: 'Chave PIX copiada' });
                            } catch {
                              toast({ title: 'Não foi possível copiar', description: 'Selecione o texto e copie manualmente.', variant: 'destructive' });
                            }
                          }}
                          className="h-8 flex-shrink-0 gap-1.5 text-[12.5px]"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Copiar
                        </Button>
                      </div>
                    </div>
                  </PrefPreview>
                </div>
              </PrefSection>

              <PrefSection
                title="Tabela de preços"
                summary={
                  faixasOrdenadas.length === 0
                    ? 'Nenhuma faixa definida'
                    : `${precificacaoManual ? 'Desligada · ' : ''}${faixasOrdenadas.length} ${faixasOrdenadas.length === 1 ? 'faixa' : 'faixas'} · ${formatBRL(Math.min(...faixasOrdenadas.map(f => f.valorBase)))} a ${formatBRL(Math.max(...faixasOrdenadas.map(f => f.valorBase)))}`
                }
              >
                <div className="mb-3.5 flex items-center gap-3.5 border-y border-slate-200 py-[11px] dark:border-slate-700">
                  <div className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-semibold text-slate-900 dark:text-white">Precificação automática</span>
                    <p className="mt-px text-[12.5px] leading-snug text-slate-500 dark:text-slate-400">
                      {precificacaoManual
                        ? 'Desligada: novos projetos avulsos são criados com R$ 0,00 e o preço é definido manualmente em cada um. A tabela abaixo é ignorada.'
                        : 'Ligada: novos projetos avulsos usam a tabela abaixo para calcular o valor pela potência.'}
                    </p>
                  </div>
                  <PrefSwitch
                    label="Precificação automática"
                    checked={!precificacaoManual}
                    onChange={(automatica) => setPrecificacaoManual(!automatica)}
                  />
                </div>

                {faixasOrdenadas.length === 0 ? (
                  <PrefWarn className="mb-3.5">
                    <strong className="font-semibold">Nenhuma faixa de potência configurada.</strong>{' '}
                    {precificacaoManual
                      ? 'Com a precificação automática desligada, isso não afeta os projetos novos.'
                      : 'Com a precificação automática ligada, novos projetos avulsos serão criados com R$ 0,00.'}
                    <div className="mt-2">
                      <button type="button" className={linkClass} onClick={() => setFaixasPotencia(criarFaixasPotenciaPadrao())}>
                        Restaurar faixas padrão
                      </button>
                    </div>
                  </PrefWarn>
                ) : (
                  <>
                    {/* Régua: uma célula por faixa, na ordem (larguras iguais para caber qualquer tabela) */}
                    <div className="overflow-x-auto">
                      <div className="flex min-w-full overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700" role="img" aria-label={`Tabela com ${faixasOrdenadas.length} faixas de potência`}>
                        {faixasOrdenadas.map((faixa, i) => (
                          <div
                            key={i}
                            className={cn(
                              'flex min-w-[66px] flex-1 flex-col justify-center border-r-2 border-white px-2 py-1.5 text-indigo-950 last:border-r-0 dark:border-slate-800',
                              ['bg-indigo-100', 'bg-indigo-200', 'bg-indigo-300'][i % 3]
                            )}
                          >
                            <span className="whitespace-nowrap text-xs font-bold tabular-nums">{formatBRL(faixa.valorBase)}</span>
                            <span className="whitespace-nowrap text-[10.5px] tabular-nums opacity-80">
                              {faixa.potenciaMax === FAIXA_SEM_LIMITE
                                ? `${formatNumero(faixa.potenciaMin)}+ kWp`
                                : `${formatNumero(faixa.potenciaMin)} a ${formatNumero(faixa.potenciaMax)} kWp`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {avisosFaixas.length > 0 && (
                      <PrefWarn className="mt-2.5">
                        <ul className="list-disc pl-4">
                          {avisosFaixas.map((aviso, i) => <li key={i}>{aviso}</li>)}
                        </ul>
                      </PrefWarn>
                    )}

                    <div className="mt-3.5">
                      <div className="grid grid-cols-[104px_minmax(0,1fr)_minmax(0,1fr)_30px] items-center gap-2.5 pb-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        <span>Começa em</span>
                        <span>Até (kWp)</span>
                        <span>Preço (R$)</span>
                        <span />
                      </div>
                      {faixasOrdenadas.map((faixa, i) => {
                        const semLimite = faixa.potenciaMax === FAIXA_SEM_LIMITE;
                        return (
                          <div key={i} className="grid grid-cols-[104px_minmax(0,1fr)_minmax(0,1fr)_30px] items-center gap-2.5 py-[5px]">
                            <span className="text-[13px] tabular-nums text-slate-500 dark:text-slate-400">{formatNumero(faixa.potenciaMin)} kWp</span>
                            {semLimite ? (
                              <span className="flex h-[34px] items-center rounded-lg border border-dashed border-slate-300 px-[11px] text-[13px] text-slate-500 dark:border-slate-600" title="Esta faixa cobre toda potência acima do início">
                                ∞ (sem limite)
                              </span>
                            ) : (
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                aria-label={`Faixa ${i + 1}: até (kWp)`}
                                value={isNaN(faixa.potenciaMax) ? '' : faixa.potenciaMax}
                                onChange={(e) => atualizarFaixaAte(i, parseFloat(e.target.value))}
                                className={cn(inputClass, 'h-[34px] tabular-nums')}
                              />
                            )}
                            <MoneyInput
                              value={faixa.valorBase}
                              onChange={(valor) => atualizarFaixaValor(i, valor)}
                              ariaLabel={`Faixa ${i + 1}: preço em reais`}
                              className="h-[34px]"
                            />
                            <button
                              type="button"
                              onClick={() => removerFaixa(i)}
                              aria-label={`Remover faixa ${i + 1}`}
                              className="flex h-[30px] w-[30px] items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <Button type="button" variant="outline" size="sm" onClick={adicionarFaixa} className="h-[34px] gap-1.5 text-[12.5px]">
                    <PlusCircle className="h-3.5 w-3.5" />
                    Adicionar faixa
                  </Button>
                  {ultimaFaixa && ultimaFaixa.potenciaMax !== FAIXA_SEM_LIMITE && (
                    <button type="button" className={linkClass} onClick={() => atualizarFaixaAte(faixasOrdenadas.length - 1, FAIXA_SEM_LIMITE)}>
                      Deixar a última faixa sem limite (∞)
                    </button>
                  )}
                </div>
              </PrefSection>

              <PrefSection title="Pacotes de projetos" summary="Lotes de projetos vendidos de uma vez">
                <p className={helpClass}>Pacotes de projetos que podem ser vendidos aos clientes. As alterações aqui são salvas na hora.</p>
                <PackagesTab />
              </PrefSection>

              <PrefSection title="Planos de assinatura" summary="Cobrança mensal com cota de projetos">
                <p className={helpClass}>Planos de assinatura mensal para seus clientes. As alterações aqui são salvas na hora.</p>
                <SubscriptionPlansTab />
              </PrefSection>
            </>
          )}

          {/* ═════════════ DOCUMENTOS ═════════════ */}
          {areaAtiva === 'documentos' && (
            <>
              <PrefSection title="Logo nas pranchas" defaultOpen summary={logoEmpresaUrl ? 'Logo enviada' : 'Nenhuma logo enviada'}>
                <p className={helpClass}>
                  A logo aparece no selo do Diagrama Unifilar e do Diagrama de Blocos. O envio e a remoção são gravados na hora.
                </p>
                <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
                  <div>
                    <label className="flex cursor-pointer flex-col items-center gap-1.5 rounded-[10px] border-2 border-dashed border-slate-300 px-4 py-[26px] text-center text-slate-400 transition-colors hover:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 dark:border-slate-600">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        className="sr-only"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); e.target.value = ''; }}
                        disabled={uploadingLogo}
                      />
                      {uploadingLogo ? <Loader2 className="h-[26px] w-[26px] animate-spin text-indigo-600" /> : <FileUp className="h-[26px] w-[26px]" />}
                      <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                        {uploadingLogo ? 'Enviando...' : logoEmpresaUrl ? 'Substituir a logo' : 'Clique para selecionar a logo'}
                      </span>
                      <span className="text-[11.5px] leading-snug text-slate-500">
                        PNG, JPG, WebP ou SVG, até 2 MB.<br />Recomendado: 400 × 250 px (horizontal).
                      </span>
                    </label>
                    {logoEmpresaUrl && (
                      <button type="button" className={cn(linkClass, 'mt-2 inline-flex items-center gap-1.5')} onClick={handleLogoRemove} disabled={removingLogo}>
                        {removingLogo && <Loader2 className="h-3 w-3 animate-spin" />}
                        Remover logo
                      </button>
                    )}
                  </div>

                  <PrefPreview label="Como aparece no selo da prancha">
                    <div className="grid max-w-[340px] grid-cols-[104px_1fr] border-[1.5px] border-slate-900 bg-white text-slate-700">
                      <div className="flex min-h-[78px] items-center justify-center border-r-[1.5px] border-slate-900 p-1.5 text-[9px] font-bold tracking-widest text-slate-300">
                        {logoEmpresaUrl ? <img src={logoEmpresaUrl} alt="Logo da empresa" className="max-h-[62px] max-w-full object-contain" /> : 'SUA LOGO'}
                      </div>
                      <div className="grid grid-cols-2">
                        {[
                          ['Proprietário', 'Nome do cliente'], ['Folha', '1/1'],
                          ['Obra', 'Sistema fotovoltaico'], ['Escala', 'S/E'],
                          ['Resp. técnico', responsavelTecnico.nomeCompleto || '—'], ['Data', '—'],
                        ].map(([rotulo, valor], i) => (
                          <div key={rotulo} className={cn('min-w-0 border-slate-900 px-[5px] py-[3px]', i % 2 === 0 && 'border-r', i < 4 && 'border-b')}>
                            <span className="block text-[6.5px] uppercase tracking-wide text-slate-500">{rotulo}</span>
                            <span className="block truncate text-[8.5px] font-semibold">{valor}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <p className="mt-2 text-[11px] text-slate-400">Ilustração simplificada do selo.</p>
                  </PrefPreview>
                </div>
              </PrefSection>

              <PrefSection
                title="Responsável técnico"
                summary={
                  responsavelTecnico.nomeCompleto
                    ? `${responsavelTecnico.nomeCompleto} · ${responsavelTecnico.instituicao}${responsavelTecnico.instituicao === 'CREA' && responsavelTecnico.estadoRegistro ? `-${responsavelTecnico.estadoRegistro}` : ''} ${responsavelTecnico.numeroRegistro}`
                    : 'Não informado'
                }
              >
                <p className={helpClass}>Dados usados nas procurações e nos documentos gerados.</p>
                <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 md:grid-cols-2">
                  <div>
                    <label htmlFor="pref-resp-nome" className={labelClass}>Nome completo</label>
                    <input id="pref-resp-nome" className={inputClass} value={responsavelTecnico.nomeCompleto} onChange={(e) => setResponsavelTecnico(prev => ({ ...prev, nomeCompleto: e.target.value }))} placeholder="Ex: João da Silva Santos" />
                  </div>
                  <div>
                    <label htmlFor="pref-resp-cpf" className={labelClass}>CPF</label>
                    <input
                      id="pref-resp-cpf"
                      inputMode="numeric"
                      aria-invalid={!!respErros.cpf}
                      className={cn(inputClass, respErros.cpf && 'border-red-500 bg-red-50 dark:bg-red-900/20')}
                      value={responsavelTecnico.cpf}
                      onChange={(e) => setResponsavelTecnico(prev => ({ ...prev, cpf: maskCpf(e.target.value) }))}
                      placeholder="Ex: 000.000.000-00"
                    />
                    {respErros.cpf && <p className={errorClass}>{respErros.cpf}</p>}
                  </div>
                  <div>
                    <label htmlFor="pref-resp-rg" className={labelClass}>RG</label>
                    <input id="pref-resp-rg" className={inputClass} value={responsavelTecnico.rg} onChange={(e) => setResponsavelTecnico(prev => ({ ...prev, rg: e.target.value }))} placeholder="Ex: 12.345.678-9" />
                  </div>
                  <div>
                    <label htmlFor="pref-resp-orgao" className={labelClass}>Órgão expedidor</label>
                    <input id="pref-resp-orgao" className={inputClass} value={responsavelTecnico.orgaoExpeditor} onChange={(e) => setResponsavelTecnico(prev => ({ ...prev, orgaoExpeditor: e.target.value }))} placeholder="Ex: SSP" />
                  </div>
                  <div>
                    <label htmlFor="pref-resp-profissao" className={labelClass}>Profissão</label>
                    <input id="pref-resp-profissao" className={inputClass} value={responsavelTecnico.profissao} onChange={(e) => setResponsavelTecnico(prev => ({ ...prev, profissao: e.target.value }))} placeholder="Ex: Engenheiro Eletricista" />
                  </div>
                  <div>
                    <label htmlFor="pref-resp-registro" className={labelClass}>Nº de registro profissional</label>
                    <input id="pref-resp-registro" className={inputClass} value={responsavelTecnico.numeroRegistro} onChange={(e) => setResponsavelTecnico(prev => ({ ...prev, numeroRegistro: e.target.value }))} placeholder="Ex: 123456" />
                  </div>
                  <div>
                    <label htmlFor="pref-resp-instituicao" className={labelClass}>Instituição</label>
                    <select
                      id="pref-resp-instituicao"
                      className={selectClass}
                      value={responsavelTecnico.instituicao}
                      onChange={(e) => setResponsavelTecnico(prev => ({
                        ...prev,
                        instituicao: e.target.value,
                        // Limpar estado do registro se CFT for selecionado
                        estadoRegistro: e.target.value === 'CFT' ? '' : prev.estadoRegistro
                      }))}
                    >
                      <option value="CREA">CREA</option>
                      <option value="CFT">CFT</option>
                    </select>
                  </div>
                  {/* Estado do Registro - Apenas para CREA */}
                  {responsavelTecnico.instituicao === 'CREA' ? (
                    <div>
                      <label htmlFor="pref-resp-estado-registro" className={labelClass}>Estado do registro</label>
                      <select id="pref-resp-estado-registro" className={selectClass} value={responsavelTecnico.estadoRegistro} onChange={(e) => setResponsavelTecnico(prev => ({ ...prev, estadoRegistro: e.target.value }))}>
                        <option value="">Selecione o estado</option>
                        {ESTADOS_BR.map(([uf, nome]) => <option key={uf} value={uf}>{nome}</option>)}
                      </select>
                    </div>
                  ) : (
                    <div className="hidden md:block" />
                  )}
                  <div>
                    <label htmlFor="pref-resp-uf" className={labelClass}>UF do responsável técnico</label>
                    <select id="pref-resp-uf" className={selectClass} value={responsavelTecnico.uf || ''} onChange={(e) => setResponsavelTecnico(prev => ({ ...prev, uf: e.target.value }))}>
                      <option value="">Selecione o estado</option>
                      {ESTADOS_BR.map(([uf, nome]) => <option key={uf} value={uf}>{nome} ({uf})</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="pref-resp-email" className={labelClass}>E-mail</label>
                    <input
                      id="pref-resp-email"
                      type="email"
                      aria-invalid={!!respErros.email}
                      className={cn(inputClass, respErros.email && 'border-red-500 bg-red-50 dark:bg-red-900/20')}
                      value={responsavelTecnico.email || ''}
                      onChange={(e) => setResponsavelTecnico(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Ex: gabriel@empresa.com"
                    />
                    {respErros.email && <p className={errorClass}>{respErros.email}</p>}
                  </div>
                  <div>
                    <label htmlFor="pref-resp-telefone" className={labelClass}>Telefone</label>
                    <input
                      id="pref-resp-telefone"
                      inputMode="tel"
                      aria-invalid={!!respErros.telefone}
                      className={cn(inputClass, respErros.telefone && 'border-red-500 bg-red-50 dark:bg-red-900/20')}
                      value={responsavelTecnico.telefone || ''}
                      onChange={(e) => setResponsavelTecnico(prev => ({ ...prev, telefone: maskTelefone(e.target.value) }))}
                      placeholder="Ex: (48) 99900-0387"
                    />
                    {respErros.telefone && <p className={errorClass}>{respErros.telefone}</p>}
                  </div>
                </div>
              </PrefSection>

              <PrefSection title="Texto da procuração" summary={`Modelo com ${totalVariaveis} ${totalVariaveis === 1 ? 'variável' : 'variáveis'}`}>
                <p className={helpClass}>
                  Texto padrão da procuração. As variáveis coloridas são preenchidas automaticamente com os dados de cada projeto.
                </p>
                <ProcuracaoRichEditor key={procuracaoEditorKey} value={textoProcuracao || defaultProcuracao} onChange={setTextoProcuracao} />
              </PrefSection>
            </>
          )}

          {/* ═════════════ COMUNICAÇÃO ═════════════ */}
          {areaAtiva === 'comunicacao' && (
            <>
              <PrefSection
                title="Checklist de documentos"
                defaultOpen
                summary={
                  mensagemChecklist.trim()
                    ? `${checklistTitulo.slice(0, 60)} · ${checklistBlocos.length + 1} linhas`
                    : 'Sem mensagem'
                }
              >
                <p className={helpClass}>
                  Lista de documentos que o cliente precisa enviar. Aparece na linha do tempo de cada projeto novo, assim que ele é
                  criado. Em projetos com compensação de créditos, o sistema acrescenta sozinho um aviso sobre as faturas das
                  unidades beneficiárias.
                </p>
                <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
                  <div>
                    <label htmlFor="pref-checklist" className={labelClass}>Texto do checklist</label>
                    <textarea
                      id="pref-checklist"
                      value={mensagemChecklist}
                      onChange={(e) => setMensagemChecklist(e.target.value)}
                      placeholder="Digite a mensagem padrão para os checklists..."
                      className={cn(inputClass, 'h-auto min-h-[360px] resize-y py-2.5 leading-normal')}
                    />
                    {mensagemChecklist !== CHECKLIST_PADRAO && (
                      <button type="button" className={cn(linkClass, 'mt-2')} onClick={() => setMensagemChecklist(CHECKLIST_PADRAO)}>
                        Restaurar texto padrão
                      </button>
                    )}
                  </div>

                  <PrefPreview label="Como aparece na linha do tempo do projeto">
                    <div className="mb-[7px] flex items-center gap-[7px] text-[11.5px] font-bold text-slate-700 dark:text-slate-200">
                      <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-indigo-600 text-[10px] text-white">S</span>
                      Sistema
                    </div>
                    <div className="max-h-[322px] overflow-y-auto break-words rounded-lg border border-blue-200 bg-blue-50 p-3.5 text-[12.5px] leading-normal text-slate-700 [scrollbar-width:thin] dark:border-blue-800 dark:bg-blue-900/20 dark:text-slate-300">
                      <p className="mb-2.5 text-[13px] font-semibold text-blue-700 dark:text-blue-400">{checklistTitulo}</p>
                      {checklistBlocos.map((bloco, i) => (
                        bloco.tipo === 'li'
                          ? <p key={i} className="mb-1.5 pl-4 before:-ml-3 before:mr-1.5 before:content-['•']">{bloco.texto}</p>
                          : <p key={i} className="mb-2.5 last:mb-0">{bloco.texto}</p>
                      ))}
                    </div>
                  </PrefPreview>
                </div>
              </PrefSection>

              <PrefSection title="Notificações por e-mail" summary={loadingEmailPrefs ? 'Carregando...' : `${notificacoesAtivas} de ${notificacoes.length} ativas`}>
                {loadingEmailPrefs ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
                    <span className="ml-3 text-sm text-slate-600 dark:text-slate-300">Carregando preferências...</span>
                  </div>
                ) : (
                  <>
                    <p className={helpClass}>
                      Escolha quais notificações você deseja receber por e-mail. Esta preferência vale para o seu usuário.
                    </p>
                    <div className="border-t border-slate-200 dark:border-slate-700">
                      {notificacoes.map((notificacao) => (
                        <div key={notificacao.chave} className="flex items-center gap-3.5 border-b border-slate-100 py-[11px] dark:border-slate-700/60">
                          <div className="min-w-0 flex-1">
                            <span className="block text-[13.5px] font-semibold text-slate-900 dark:text-white">{notificacao.titulo}</span>
                            <p className="mt-px text-[12.5px] leading-snug text-slate-500 dark:text-slate-400">{notificacao.desc}</p>
                          </div>
                          <PrefSwitch
                            label={notificacao.titulo}
                            checked={emailPreferences[notificacao.chave]}
                            onChange={(checked) => setEmailPreferences(prev => ({ ...prev, [notificacao.chave]: checked }))}
                          />
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </PrefSection>
            </>
          )}

          {/* Barra de salvar: aparece quando algo muda */}
          {isDirty && (
            <div className="sticky bottom-3.5 z-20 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-900 py-[11px] pl-[18px] pr-3.5 text-[13px] text-white shadow-[0_12px_30px_-8px_rgba(15,23,42,0.45)] dark:border dark:border-slate-700">
              <span>Você tem alterações não salvas</span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={descartarTudo}
                  disabled={savingAll}
                  className="h-[34px] border-slate-600 bg-transparent text-[12.5px] text-slate-200 hover:bg-slate-800 hover:text-white"
                >
                  Descartar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={salvarTudo}
                  disabled={savingAll || isLoading}
                  className="h-[34px] bg-indigo-500 text-[12.5px] text-white hover:bg-indigo-600"
                >
                  {savingAll ? 'Salvando...' : 'Salvar alterações'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmação ao sair da tela com alterações não salvas */}
      <AlertDialog open={leaveHref !== null} onOpenChange={(open) => { if (!open) setLeaveHref(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sair sem salvar?</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem alterações não salvas em Preferências. Se sair agora, elas serão descartadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const destino = leaveHref;
                setLeaveHref(null);
                if (destino) {
                  descartarTudo();
                  router.push(destino);
                }
              }}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Sair sem salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
