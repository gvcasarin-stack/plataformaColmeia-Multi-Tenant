'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
  type ResponsavelTecnico,
  type ConfiguracaoSistema
} from '@/lib/services/configService.supabase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Trash2, Settings, BarChart3, DollarSign, Columns3, FileText, Clock, Loader2, Package, Calendar, Mail, Bell, FileUp, MessageSquare, FolderPlus } from 'lucide-react';
import { devLog } from "@/lib/utils/productionLogger";
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { getProjectStatuses, updateStatusSLA, type ProjectStatusInfo } from '@/lib/services/kanbanService';
import { PackagesTab } from '@/components/admin/PackagesTab';
import { SubscriptionPlansTab } from '@/components/admin/SubscriptionPlansTab';

// Componente de Abas (Estilo Botões Azuis com Ícones)
function Tabs({ tabs, activeTab, onTabChange }: { tabs: { id: string; label: string; icon: React.ReactNode }[]; activeTab: string; onTabChange: (tabId: string) => void }) {
  return (
    <div className="flex gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md transition-all duration-200",
            activeTab === tab.id
              ? "bg-blue-600 text-white shadow-md hover:bg-blue-700"
              : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
          )}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// Mapa de cores para os cards
const colorMap: Record<string, { border: string; bg: string; icon: string }> = {
  'blue-500': { border: '#3b82f6', bg: '#eff6ff', icon: '#3b82f6' },
  'emerald-500': { border: '#10b981', bg: '#ecfdf5', icon: '#10b981' },
  'violet-500': { border: '#8b5cf6', bg: '#f5f3ff', icon: '#8b5cf6' },
  'amber-500': { border: '#f59e0b', bg: '#fffbeb', icon: '#f59e0b' },
  'cyan-500': { border: '#06b6d4', bg: '#ecfeff', icon: '#06b6d4' },
  'indigo-500': { border: '#6366f1', bg: '#eef2ff', icon: '#6366f1' },
  'green-500': { border: '#22c55e', bg: '#f0fdf4', icon: '#22c55e' },
  'rose-500': { border: '#f43f5e', bg: '#fff1f2', icon: '#f43f5e' },
};

// Componente de Seção Expansível (com Border Colorido + Ícone)
function CollapsibleSection({
  title,
  description,
  children,
  defaultOpen = false,
  borderColor = "blue-500",
  icon
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  borderColor?: string;
  icon?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const colors = colorMap[borderColor] || colorMap['blue-500'];

  return (
    <div
      className={cn(
        "border-2 border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gradient-to-br from-white to-slate-50 dark:from-gray-800 dark:to-gray-850 shadow-md transition-all duration-200",
        isOpen && "shadow-lg",
        !isOpen && "hover:shadow-lg"
      )}
      style={{
        borderLeftWidth: isOpen ? '6px' : '4px',
        borderLeftColor: colors.border,
      }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all duration-200"
      >
        <div className="flex items-center gap-4 flex-1 text-left">
          {icon && (
            <div
              className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200",
                isOpen ? "shadow-md" : "shadow-sm"
              )}
              style={{
                backgroundColor: colors.bg,
                color: colors.icon
              }}
            >
              {icon}
            </div>
          )}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
            {description && (
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{description}</p>
            )}
          </div>
        </div>
        <div className={cn(
          "ml-4 text-gray-400 transition-transform duration-200",
          isOpen ? "rotate-180" : "rotate-0"
        )}>
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          <div className="p-6 bg-white dark:bg-gray-800">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PreferenciasPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('geral');
  const [mensagemChecklist, setMensagemChecklist] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [originalMessage, setOriginalMessage] = useState('');

  // Estados para a tabela de faixas de potência
  const [faixasPotencia, setFaixasPotencia] = useState<FaixaPotenciaPreco[]>([]);
  const [editandoTabela, setEditandoTabela] = useState(false);
  const [faixasPotenciaOriginal, setFaixasPotenciaOriginal] = useState<FaixaPotenciaPreco[]>([]);
  const [novaPotenciaMin, setNovaPotenciaMin] = useState<string>('');
  const [novaPotenciaMax, setNovaPotenciaMax] = useState<string>('');
  const [novoValorPotencia, setNovoValorPotencia] = useState<string>('');

  // Estados para dados bancários
  const [dadosBancarios, setDadosBancarios] = useState<DadosBancarios>({
    banco: '',
    agencia: '',
    conta: '',
    favorecido: '',
    documento: '',
    chavePix: ''
  });
  const [editandoDadosBancarios, setEditandoDadosBancarios] = useState(false);
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
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [slaConfig, setSlaConfig] = useState<Record<string, { sla_days: number | null; sla_exclude_weekends: boolean }>>({});
  const [editandoKanban, setEditandoKanban] = useState(false);
  const [slaConfigOriginal, setSlaConfigOriginal] = useState<Record<string, { sla_days: number | null; sla_exclude_weekends: boolean }>>({});

  // Estados para Preferências de E-mail
  const [emailPreferences, setEmailPreferences] = useState({
    notify_project_created: true,
    notify_status_change: true,
    notify_document_added: true,
    notify_comment_added: true
  });
  const [loadingEmailPrefs, setLoadingEmailPrefs] = useState(false);
  const [savingEmailPrefs, setSavingEmailPrefs] = useState(false);

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
  const [editandoResponsavel, setEditandoResponsavel] = useState(false);
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
  const [editandoProcuracao, setEditandoProcuracao] = useState(false);
  const [textoProcuracaoOriginal, setTextoProcuracaoOriginal] = useState('');

  // Estados para Logo da Empresa
  const [logoEmpresaUrl, setLogoEmpresaUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [removingLogo, setRemovingLogo] = useState(false);

  // Estado para Precificação Manual
  const [precificacaoManual, setPrecificacaoManual] = useState(false);
  const [salvandoPrecificacao, setSalvandoPrecificacao] = useState(false);

  // Estado para controlar se o aviso de faixas vazias foi dispensado
  const [avisoFaixasVaziasDismissed, setAvisoFaixasVaziasDismissed] = useState(false);
  const [restaurandoFaixas, setRestaurandoFaixas] = useState(false);

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
<strong>OUTORGANTE:</strong> Por este instrumento de procuração, {{cliente_nome}}, {{cliente_tipo}}, portador do RG nº {{cliente_rg}} e inscrito no CPF sob o nº {{cliente_cpf}}.
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
<strong>Nome completo:</strong> {{cliente_nome}}
</div>
<div style="margin-top: 8px; font-size: 14px;">
<strong>CPF:</strong> {{cliente_cpf}}
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

  // Carregar status do Kanban quando a aba Kanban for acessada
  useEffect(() => {
    if (activeTab === 'kanban' && kanbanStatuses.length === 0) {
      carregarStatusKanban();
    }
  }, [activeTab]);

  // Carregar preferências de email quando a aba E-mails for acessada
  useEffect(() => {
    if (activeTab === 'emails' && user) {
      carregarPreferenciasEmail();
    }
  }, [activeTab, user]);

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

  const salvarConfiguracoesKanban = async () => {
    try {
      setLoadingKanban(true);

      // Salvar cada status modificado
      const promises = kanbanStatuses.map(async (status) => {
        const config = slaConfig[status.id];
        if (config) {
          await updateStatusSLA(
            status.id,
            config.sla_days,
            config.sla_exclude_weekends
          );
        }
      });

      await Promise.all(promises);

      toast({
        title: 'Configurações salvas',
        description: 'As configurações de SLA foram atualizadas com sucesso.',
      });

      setEditandoKanban(false);

      // Recarregar para refletir mudanças
      await carregarStatusKanban();
    } catch (error) {
      devLog.error('Erro ao salvar configurações do Kanban:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      });
    } finally {
      setLoadingKanban(false);
    }
  };

  const cancelarEdicaoKanban = () => {
    setSlaConfig(JSON.parse(JSON.stringify(slaConfigOriginal))); // Restaurar valores originais
    setEditandoKanban(false);
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
    }
  };

  // Função para atualizar uma preferência de email
  const atualizarPreferenciaEmail = async (preferenciaKey: keyof typeof emailPreferences, valor: boolean) => {
    if (!user?.id) {
      toast({
        title: 'Erro',
        description: 'Usuário não autenticado. Faça login novamente.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSavingEmailPrefs(true);

      // Atualizar estado local imediatamente para UX responsivo
      setEmailPreferences(prev => ({
        ...prev,
        [preferenciaKey]: valor
      }));

      const response = await fetch('/api/admin/email-notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          [preferenciaKey]: valor
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar preferência');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erro ao atualizar preferência');
      }

      toast({
        title: 'Preferência atualizada',
        description: 'Sua preferência de notificação foi salva com sucesso.',
      });
    } catch (error) {
      devLog.error('Erro ao atualizar preferência de email:', error);

      // Reverter mudança local em caso de erro
      setEmailPreferences(prev => ({
        ...prev,
        [preferenciaKey]: !valor
      }));

      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a preferência.',
        variant: 'destructive',
      });
    } finally {
      setSavingEmailPrefs(false);
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

  const salvarMensagemChecklist = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      await atualizarMensagemChecklist(mensagemChecklist);

      toast({
        title: 'Alterações salvas',
        description: 'A mensagem de checklist foi atualizada com sucesso.',
      });

      setEditMode(false);
      setOriginalMessage(mensagemChecklist);

      devLog.log('Mensagem de checklist salva com sucesso:', mensagemChecklist);
    } catch (error) {
      devLog.error('Erro ao salvar configurações:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const cancelarEdicao = () => {
    setMensagemChecklist(originalMessage);
    setEditMode(false);
  };

  const adicionarFaixaPotencia = () => {
    if (!novaPotenciaMin || !novaPotenciaMax || !novoValorPotencia) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos da nova faixa de potência.',
        variant: 'destructive',
      });
      return;
    }

    const min = parseFloat(novaPotenciaMin);
    const max = parseFloat(novaPotenciaMax);
    const valor = parseFloat(novoValorPotencia);

    if (min >= max) {
      toast({
        title: 'Valores inválidos',
        description: 'A potência mínima deve ser menor que a máxima.',
        variant: 'destructive',
      });
      return;
    }

    const sobreposicao = faixasPotencia.some(
      faixa => (min < faixa.potenciaMax && max > faixa.potenciaMin)
    );

    if (sobreposicao) {
      toast({
        title: 'Sobreposição de faixas',
        description: 'Esta faixa se sobrepõe a uma faixa existente.',
        variant: 'destructive',
      });
      return;
    }

    const novaFaixa: FaixaPotenciaPreco = {
      potenciaMin: min,
      potenciaMax: max,
      valorBase: valor
    };

    const novasFaixas = [...faixasPotencia, novaFaixa].sort((a, b) => a.potenciaMin - b.potenciaMin);
    setFaixasPotencia(novasFaixas);

    setNovaPotenciaMin('');
    setNovaPotenciaMax('');
    setNovoValorPotencia('');
  };

  const removerFaixaPotencia = (index: number) => {
    const novasFaixas = [...faixasPotencia];
    novasFaixas.splice(index, 1);
    setFaixasPotencia(novasFaixas);
  };

  const atualizarFaixaPotencia = (index: number, campo: keyof FaixaPotenciaPreco, valor: number) => {
    const novasFaixas = [...faixasPotencia];
    novasFaixas[index][campo] = valor;
    setFaixasPotencia(novasFaixas);
  };

  const salvarFaixasPotencia = async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      const faixasOrdenadas = [...faixasPotencia].sort((a, b) => a.potenciaMin - b.potenciaMin);

      for (let i = 0; i < faixasOrdenadas.length; i++) {
        for (let j = i + 1; j < faixasOrdenadas.length; j++) {
          const faixa1 = faixasOrdenadas[i];
          const faixa2 = faixasOrdenadas[j];

          if (faixa1.potenciaMax > faixa2.potenciaMin && faixa2.potenciaMin < faixa1.potenciaMax) {
            toast({
              title: 'Sobreposição de faixas',
              description: `As faixas ${faixa1.potenciaMin}-${faixa1.potenciaMax} e ${faixa2.potenciaMin}-${faixa2.potenciaMax} se sobrepõem.`,
              variant: 'destructive',
            });
            setIsLoading(false);
            return;
          }
        }
      }

      for (let i = 0; i < faixasOrdenadas.length - 1; i++) {
        const faixaAtual = faixasOrdenadas[i];
        const proximaFaixa = faixasOrdenadas[i + 1];

        if (faixaAtual.potenciaMax !== proximaFaixa.potenciaMin) {
          toast({
            title: 'Atenção: Lacuna entre faixas',
            description: `Existe uma lacuna entre ${faixaAtual.potenciaMax} e ${proximaFaixa.potenciaMin} kWp.`,
            variant: 'default',
          });
        }
      }

      await atualizarFaixasPotencia(faixasOrdenadas);

      toast({
        title: 'Configurações salvas',
        description: 'A tabela de preços por potência foi atualizada com sucesso.',
      });

      setFaixasPotenciaOriginal([...faixasOrdenadas]);
      setEditandoTabela(false);
    } catch (error) {
      devLog.error('Erro ao salvar configurações:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const cancelarEdicaoFaixas = () => {
    setFaixasPotencia([...faixasPotenciaOriginal]);
    setEditandoTabela(false);
  };

  const atualizarCampoDadosBancarios = (campo: keyof DadosBancarios, valor: string) => {
    setDadosBancarios(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  const cancelarEdicaoDadosBancarios = () => {
    setDadosBancarios({...dadosBancariosOriginal});
    setEditandoDadosBancarios(false);
  };

  const salvarDadosBancarios = async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      await atualizarDadosBancarios(dadosBancarios);

      toast({
        title: 'Configurações salvas',
        description: 'Os dados bancários foram atualizados com sucesso.',
      });

      setDadosBancariosOriginal({...dadosBancarios});
      setEditandoDadosBancarios(false);
    } catch (error) {
      devLog.error('Erro ao salvar configurações:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const alternarPrecificacaoManual = async (ativado: boolean) => {
    if (!user) return;

    try {
      setSalvandoPrecificacao(true);
      setPrecificacaoManual(ativado);

      const sucesso = await atualizarPrecificacaoManual(ativado, user.id);

      if (sucesso) {
        toast({
          title: 'Configuração atualizada',
          description: ativado
            ? 'Modo de precificação manual ativado. Novos projetos avulsos serão criados com R$ 0,00.'
            : 'Modo de precificação manual desativado. Novos projetos avulsos usarão a tabela de preços.',
        });

        devLog.log('Modo de precificação manual alterado:', ativado);
      } else {
        // Reverter em caso de erro
        setPrecificacaoManual(!ativado);
        toast({
          title: 'Erro',
          description: 'Não foi possível atualizar a configuração de precificação.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      // Reverter em caso de erro
      setPrecificacaoManual(!ativado);
      devLog.error('Erro ao alterar precificação manual:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a configuração de precificação.',
        variant: 'destructive',
      });
    } finally {
      setSalvandoPrecificacao(false);
    }
  };

  const restaurarFaixasPadrao = async () => {
    if (!user) return;

    try {
      setRestaurandoFaixas(true);

      const faixasPadrao = criarFaixasPotenciaPadrao();
      const sucesso = await atualizarFaixasPotencia(faixasPadrao);

      if (sucesso) {
        setFaixasPotencia(faixasPadrao);
        setFaixasPotenciaOriginal(faixasPadrao);
        setAvisoFaixasVaziasDismissed(false);

        toast({
          title: 'Faixas restauradas',
          description: 'As faixas de potência padrão foram restauradas com sucesso.',
        });

        devLog.log('Faixas de potência padrão restauradas');
      } else {
        toast({
          title: 'Erro',
          description: 'Não foi possível restaurar as faixas padrão.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      devLog.error('Erro ao restaurar faixas padrão:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível restaurar as faixas padrão.',
        variant: 'destructive',
      });
    } finally {
      setRestaurandoFaixas(false);
    }
  };

  const ativarPrecificacaoManualEFecharAviso = async () => {
    await alternarPrecificacaoManual(true);
    setAvisoFaixasVaziasDismissed(true);
  };

  const dispensarAvisoFaixasVazias = () => {
    setAvisoFaixasVaziasDismissed(true);
  };

  const tabs = [
    { id: 'geral', label: 'Geral', icon: <Settings className="h-4 w-4" /> },
    { id: 'projetos', label: 'Projetos', icon: <FileText className="h-4 w-4" /> },
    { id: 'kanban', label: 'Kanban', icon: <Columns3 className="h-4 w-4" /> },
    { id: 'financeiro', label: 'Financeiro', icon: <DollarSign className="h-4 w-4" /> },
    { id: 'documentos', label: 'Documentos', icon: <FileText className="h-4 w-4" /> },
    { id: 'emails', label: 'E-mails', icon: <Mail className="h-4 w-4" /> }
  ];

  return (
    <div className="space-y-6">
      {/* Header com Gradiente */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-8 text-white shadow-lg">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold">
            Preferências
          </h1>
          <p className="mt-2 text-indigo-100">
            Configurações e preferências gerais do sistema
          </p>
        </div>

        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-indigo-500/30"></div>
        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-violet-500/30"></div>
      </div>

      {/* Container de Conteúdo */}
      <div className="bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        {/* Abas */}
        <div className="px-6 pt-6">
          <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        {/* Conteúdo das Abas */}
        <div className="p-6 space-y-8">
          {/* ABA GERAL */}
          {activeTab === 'geral' && (
            <>
              <CollapsibleSection
                title="Mensagem de Checklist"
                description="Define a mensagem padrão que será exibida nos checklists dos projetos."
                defaultOpen={false}
                borderColor="blue-500"
                icon={<FileText className="h-5 w-5" />}
              >
                <div className="space-y-4">
                  {editMode ? (
                    <Textarea
                      value={mensagemChecklist}
                      onChange={(e) => setMensagemChecklist(e.target.value)}
                      placeholder="Digite a mensagem padrão para os checklists..."
                      className="min-h-[300px]"
                    />
                  ) : (
                    <div className="rounded-md border border-gray-200 dark:border-gray-700 p-4">
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                        <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed">
                          {mensagemChecklist}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    {!editMode ? (
                      <Button
                        onClick={() => setEditMode(true)}
                        disabled={isLoading}
                      >
                        Editar Checklist
                      </Button>
                    ) : (
                      <>
                        <Button
                          onClick={cancelarEdicao}
                          variant="outline"
                          disabled={isLoading}
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={salvarMensagemChecklist}
                          disabled={isLoading}
                        >
                          {isLoading ? 'Salvando...' : 'Salvar Alterações'}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CollapsibleSection>

              <CollapsibleSection
                title="Dados Bancários"
                description="Configure os dados bancários para recebimentos e pagamentos."
                defaultOpen={false}
                borderColor="emerald-500"
                icon={<DollarSign className="h-5 w-5" />}
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Banco</label>
                      <Input
                        type="text"
                        value={dadosBancarios.banco}
                        onChange={(e) => atualizarCampoDadosBancarios('banco', e.target.value)}
                        placeholder="Ex: Itaú"
                        disabled={!editandoDadosBancarios}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Agência</label>
                      <Input
                        type="text"
                        value={dadosBancarios.agencia}
                        onChange={(e) => atualizarCampoDadosBancarios('agencia', e.target.value)}
                        placeholder="Ex: 1234"
                        disabled={!editandoDadosBancarios}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Conta</label>
                      <Input
                        type="text"
                        value={dadosBancarios.conta}
                        onChange={(e) => atualizarCampoDadosBancarios('conta', e.target.value)}
                        placeholder="Ex: 12345-6"
                        disabled={!editandoDadosBancarios}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Nome do Favorecido</label>
                      <Input
                        type="text"
                        value={dadosBancarios.favorecido}
                        onChange={(e) => atualizarCampoDadosBancarios('favorecido', e.target.value)}
                        placeholder="Ex: Empresa de Engenharia LTDA"
                        disabled={!editandoDadosBancarios}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">CNPJ/CPF</label>
                      <Input
                        type="text"
                        value={dadosBancarios.documento}
                        onChange={(e) => atualizarCampoDadosBancarios('documento', e.target.value)}
                        placeholder="Ex: 12.345.678/0001-90"
                        disabled={!editandoDadosBancarios}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Chave PIX</label>
                      <Input
                        type="text"
                        value={dadosBancarios.chavePix}
                        onChange={(e) => atualizarCampoDadosBancarios('chavePix', e.target.value)}
                        placeholder="Ex: email@empresa.com.br"
                        disabled={!editandoDadosBancarios}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    {!editandoDadosBancarios ? (
                      <Button
                        onClick={() => setEditandoDadosBancarios(true)}
                        disabled={isLoading}
                      >
                        Editar Dados Bancários
                      </Button>
                    ) : (
                      <>
                        <Button
                          onClick={cancelarEdicaoDadosBancarios}
                          variant="outline"
                          disabled={isLoading}
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={salvarDadosBancarios}
                          disabled={isLoading}
                        >
                          {isLoading ? 'Salvando...' : 'Salvar Dados Bancários'}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CollapsibleSection>
            </>
          )}

          {/* ABA PROJETOS */}
          {activeTab === 'projetos' && (
            <div className="space-y-6">
              {/* Tabela de Preços */}
              <CollapsibleSection
                title="Tabela de Preços dos Projetos"
                description="Configure a tabela de preços base para diferentes faixas de potência dos projetos."
                defaultOpen={false}
                borderColor="violet-500"
                icon={<BarChart3 className="h-5 w-5" />}
              >
                  <div className="space-y-4">
                    {/* Indicador de Status: Modo Ativo */}
                    <div className={cn(
                      "rounded-lg border-2 p-4 transition-all duration-200 shadow-sm",
                      precificacaoManual
                        ? "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700"
                        : "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700"
                    )}>
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {precificacaoManual ? (
                            <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          ) : (
                            <svg className="h-6 w-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className={cn(
                            "text-base font-bold mb-1",
                            precificacaoManual
                              ? "text-red-900 dark:text-red-100"
                              : "text-emerald-900 dark:text-emerald-100"
                          )}>
                            {precificacaoManual ? "⚠️ Precificação Manual ATIVA" : "✓ Precificação Automática ATIVA"}
                          </h4>
                          <p className={cn(
                            "text-sm",
                            precificacaoManual
                              ? "text-red-800 dark:text-red-200"
                              : "text-emerald-800 dark:text-emerald-200"
                          )}>
                            {precificacaoManual
                              ? "Novos projetos avulsos serão criados com R$ 0,00. A tabela de preços abaixo será ignorada."
                              : "Novos projetos avulsos usarão a tabela de preços abaixo para calcular o valor automaticamente."
                            }
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Banner de Aviso: Nenhuma Faixa Configurada */}
                    {faixasPotencia.length === 0 && !avisoFaixasVaziasDismissed && (
                      <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700 p-6 shadow-lg">
                        <div className="flex items-start gap-4">
                          {/* Ícone de Alerta */}
                          <div className="flex-shrink-0 mt-1">
                            <svg className="h-8 w-8 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          </div>

                          {/* Conteúdo */}
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-amber-900 dark:text-amber-100 mb-2">
                              ⚠️ Atenção: Nenhuma faixa de potência configurada!
                            </h3>
                            <p className="text-sm text-amber-800 dark:text-amber-200 mb-4">
                              Sua tabela de preços está vazia. Novos projetos avulsos serão criados com <strong>valor R$ 0,00</strong> até que você configure as faixas de potência ou ative o modo de precificação manual.
                            </p>

                            {/* Opções */}
                            <div className="space-y-3">
                              <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                                Escolha uma das opções abaixo:
                              </p>

                              <div className="flex flex-wrap gap-3">
                                {/* Opção 1: Restaurar Faixas Padrão */}
                                <Button
                                  onClick={restaurarFaixasPadrao}
                                  disabled={restaurandoFaixas}
                                  className="bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                  {restaurandoFaixas ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      Restaurando...
                                    </>
                                  ) : (
                                    <>
                                      <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                      </svg>
                                      Restaurar Faixas Padrão
                                    </>
                                  )}
                                </Button>

                                {/* Opção 2: Ativar Precificação Manual */}
                                <Button
                                  onClick={ativarPrecificacaoManualEFecharAviso}
                                  disabled={salvandoPrecificacao}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                  {salvandoPrecificacao ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      Ativando...
                                    </>
                                  ) : (
                                    <>
                                      <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      Ativar Precificação Manual
                                    </>
                                  )}
                                </Button>

                                {/* Opção 3: Dispensar Aviso */}
                                <Button
                                  onClick={dispensarAvisoFaixasVazias}
                                  variant="outline"
                                  className="border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                                >
                                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Entendi, vou adicionar manualmente
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                            <TableHead className="font-semibold">Potência Mínima (kWp)</TableHead>
                            <TableHead className="font-semibold">Potência Máxima (kWp)</TableHead>
                            <TableHead className="font-semibold">Valor Base (R$)</TableHead>
                            {editandoTabela && <TableHead className="font-semibold w-[80px]">Ações</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {faixasPotencia.map((faixa, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                {editandoTabela ? (
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={faixa.potenciaMin}
                                    onChange={(e) => atualizarFaixaPotencia(index, 'potenciaMin', parseFloat(e.target.value))}
                                  />
                                ) : (
                                  faixa.potenciaMin
                                )}
                              </TableCell>
                              <TableCell>
                                {editandoTabela ? (
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={faixa.potenciaMax}
                                    onChange={(e) => atualizarFaixaPotencia(index, 'potenciaMax', parseFloat(e.target.value))}
                                  />
                                ) : (
                                  faixa.potenciaMax === 999999 ? '∞' : faixa.potenciaMax
                                )}
                              </TableCell>
                              <TableCell>
                                {editandoTabela ? (
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={faixa.valorBase}
                                    onChange={(e) => atualizarFaixaPotencia(index, 'valorBase', parseFloat(e.target.value))}
                                  />
                                ) : (
                                  `R$ ${faixa.valorBase.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                )}
                              </TableCell>
                              {editandoTabela && (
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removerFaixaPotencia(index)}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {editandoTabela && (
                      <div className="flex gap-2 items-end pt-4 border-t">
                        <div className="flex-1 space-y-2">
                          <label className="text-sm font-medium">Potência Mínima (kWp)</label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={novaPotenciaMin}
                            onChange={(e) => setNovaPotenciaMin(e.target.value)}
                            placeholder="Ex: 5"
                          />
                        </div>
                        <div className="flex-1 space-y-2">
                          <label className="text-sm font-medium">Potência Máxima (kWp)</label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={novaPotenciaMax}
                            onChange={(e) => setNovaPotenciaMax(e.target.value)}
                            placeholder="Ex: 10"
                          />
                        </div>
                        <div className="flex-1 space-y-2">
                          <label className="text-sm font-medium">Valor Base (R$)</label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={novoValorPotencia}
                            onChange={(e) => setNovoValorPotencia(e.target.value)}
                            placeholder="Ex: 600"
                          />
                        </div>
                        <Button
                          onClick={adicionarFaixaPotencia}
                          disabled={isLoading || !novaPotenciaMin || !novaPotenciaMax || !novoValorPotencia}
                        >
                          <PlusCircle className="h-4 w-4 mr-2" />
                          Adicionar
                        </Button>
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-4 border-t">
                      {!editandoTabela ? (
                        <Button
                          onClick={() => setEditandoTabela(true)}
                          disabled={isLoading}
                        >
                          Editar Tabela de Preços
                        </Button>
                      ) : (
                        <>
                          <Button
                            onClick={cancelarEdicaoFaixas}
                            variant="outline"
                            disabled={isLoading}
                          >
                            Cancelar
                          </Button>
                          <Button
                            onClick={salvarFaixasPotencia}
                            disabled={isLoading}
                          >
                            {isLoading ? 'Salvando...' : 'Salvar Tabela de Preços'}
                          </Button>
                        </>
                      )}
                    </div>

                    {/* Controle de Precificação Manual */}
                    <div className="pt-6 border-t space-y-4">
                      <div className="flex items-center gap-2 mb-4">
                        <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Controle Manual de Preços
                        </h3>
                      </div>
                <div className="space-y-4">
                  {/* Informação sobre o que é precificação manual */}
                  <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                          O que é Precificação Manual?
                        </h4>
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          Quando ativada, todos os novos <strong>projetos avulsos</strong> criados por clientes, administradores ou colaboradores serão criados automaticamente com <strong>valor R$ 0,00</strong>. Você poderá então ajustar manualmente o preço de cada projeto conforme necessário.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Switch de controle */}
                  <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                        Ativar Precificação Manual
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {precificacaoManual
                          ? "Desative para voltar a usar a tabela de preços automática"
                          : "Ative para definir preços manualmente em cada projeto"
                        }
                      </p>
                    </div>
                    <Switch
                      checked={precificacaoManual}
                      onCheckedChange={alternarPrecificacaoManual}
                      disabled={salvandoPrecificacao}
                      className="ml-4"
                    />
                  </div>

                  {salvandoPrecificacao && (
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Salvando configuração...</span>
                    </div>
                  )}
                </div>
                    </div>
                  </div>
              </CollapsibleSection>

              {/* Pacotes de Projetos */}
              <CollapsibleSection
                title="Pacotes de Projetos"
                description="Configure pacotes de projetos que podem ser vendidos aos clientes."
                defaultOpen={false}
                borderColor="amber-500"
                icon={<Package className="h-5 w-5" />}
              >
                <PackagesTab />
              </CollapsibleSection>

              {/* Assinatura Mensal */}
              <CollapsibleSection
                title="Planos de Assinatura Mensal"
                description="Configure planos de assinatura mensal para seus clientes."
                defaultOpen={false}
                borderColor="cyan-500"
                icon={<Calendar className="h-5 w-5" />}
              >
                <SubscriptionPlansTab />
              </CollapsibleSection>
            </div>
          )}

          {/* ABA KANBAN */}
          {activeTab === 'kanban' && (
            <CollapsibleSection
              title="Colunas do Kanban"
              description="Configure as colunas do quadro Kanban e seus prazos de SLA."
              defaultOpen={true}
              borderColor="indigo-500"
              icon={<Columns3 className="h-5 w-5" />}
            >
              {loadingKanban ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                  <span className="ml-3 text-gray-600">Carregando colunas...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Configure o prazo máximo (SLA) para cada etapa do projeto. Quando um projeto ultrapassar o prazo, você receberá uma notificação e o cartão será destacado visualmente no quadro Kanban.
                  </div>

                  {kanbanStatuses.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Columns3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhuma coluna encontrada no Kanban.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {kanbanStatuses.map((status) => (
                        <div
                          key={status.id}
                          className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                        >
                          <div className="flex items-start gap-4">
                            {/* Indicador de cor da coluna */}
                            <div
                              className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                              style={{ backgroundColor: status.color }}
                            />

                            {/* Informações da coluna */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-medium text-gray-900 dark:text-white">
                                  {status.name}
                                </h4>
                                {status.isDefault && (
                                  <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                                    Padrão
                                  </span>
                                )}
                                {status.projectCount > 0 && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {status.projectCount} projeto{status.projectCount !== 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>

                              {/* Configuração de SLA */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    Prazo de expiração da etapa
                                  </label>
                                  {editandoKanban ? (
                                    <>
                                      <div className="flex items-center gap-2">
                                        <Input
                                          type="number"
                                          min="0"
                                          step="1"
                                          placeholder="Ex: 3"
                                          value={slaConfig[status.id]?.sla_days ?? ''}
                                          onChange={(e) => {
                                            const value = e.target.value === '' ? null : parseInt(e.target.value);
                                            setSlaConfig(prev => ({
                                              ...prev,
                                              [status.id]: {
                                                ...prev[status.id],
                                                sla_days: value
                                              }
                                            }));
                                          }}
                                          className="w-32"
                                        />
                                        <span className="text-sm text-gray-500">dias</span>
                                      </div>
                                      <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Deixe vazio para não aplicar prazo nesta etapa
                                      </p>
                                    </>
                                  ) : (
                                    <div className="flex items-center gap-2 h-10">
                                      {slaConfig[status.id]?.sla_days ? (
                                        <span className="text-base font-medium text-gray-900 dark:text-white">
                                          {slaConfig[status.id].sla_days} {slaConfig[status.id].sla_days === 1 ? 'dia' : 'dias'}
                                        </span>
                                      ) : (
                                        <span className="text-sm text-gray-500 dark:text-gray-400 italic">
                                          Sem prazo configurado
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>

                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Opções
                                  </label>
                                  {editandoKanban ? (
                                    <>
                                      <div className="flex items-center space-x-2">
                                        <Checkbox
                                          id={`weekend-${status.id}`}
                                          checked={slaConfig[status.id]?.sla_exclude_weekends || false}
                                          onCheckedChange={(checked) => {
                                            setSlaConfig(prev => ({
                                              ...prev,
                                              [status.id]: {
                                                ...prev[status.id],
                                                sla_exclude_weekends: checked === true
                                              }
                                            }));
                                          }}
                                        />
                                        <label
                                          htmlFor={`weekend-${status.id}`}
                                          className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                                        >
                                          Ignorar finais de semana
                                        </label>
                                      </div>
                                      <p className="text-xs text-gray-500 dark:text-gray-400">
                                        O prazo não conta sábados e domingos
                                      </p>
                                    </>
                                  ) : (
                                    <div className="flex items-center h-10">
                                      {slaConfig[status.id]?.sla_exclude_weekends ? (
                                        <span className="text-sm text-gray-700 dark:text-gray-300">
                                          ✓ Ignora finais de semana
                                        </span>
                                      ) : (
                                        <span className="text-sm text-gray-500 dark:text-gray-400">
                                          Conta finais de semana
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {kanbanStatuses.length > 0 && (
                    <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                      {!editandoKanban ? (
                        <Button
                          onClick={() => setEditandoKanban(true)}
                          disabled={loadingKanban}
                        >
                          Editar Configurações
                        </Button>
                      ) : (
                        <>
                          <Button
                            onClick={cancelarEdicaoKanban}
                            variant="outline"
                            disabled={loadingKanban}
                          >
                            Cancelar
                          </Button>
                          <Button
                            onClick={salvarConfiguracoesKanban}
                            disabled={loadingKanban}
                          >
                            {loadingKanban ? 'Salvando...' : 'Salvar Configurações'}
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CollapsibleSection>
          )}

          {/* ABA FINANCEIRO */}
          {activeTab === 'financeiro' && (
            <CollapsibleSection
              title="Configurações Financeiras"
              description="Configure as preferências financeiras do sistema."
              defaultOpen={true}
              borderColor="green-500"
              icon={<DollarSign className="h-5 w-5" />}
            >
              <div className="text-center py-12 text-gray-500">
                <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Configurações financeiras em desenvolvimento...</p>
              </div>
            </CollapsibleSection>
          )}

          {/* ABA DOCUMENTOS */}
          {activeTab === 'documentos' && (
            <div className="space-y-6">

              {/* Logo da Empresa */}
              <CollapsibleSection
                title="Logo da Empresa nas Pranchas"
                description="Faça upload da logo para ser exibida no selo do Diagrama Unifilar e Diagrama de Blocos."
                defaultOpen={false}
                borderColor="purple-500"
                icon={<FileUp className="h-5 w-5" />}
              >
                <div className="space-y-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Tamanho recomendado: <strong>400 × 250 px</strong> (proporção 16:10, horizontal). Formatos aceitos: PNG, JPG, WebP ou SVG. Máx. 2 MB.
                  </p>

                  {logoEmpresaUrl ? (
                    <div className="flex flex-col gap-3">
                      <div className="border rounded-lg p-4 flex items-center justify-center bg-gray-50 dark:bg-gray-800" style={{ minHeight: 100 }}>
                        <img src={logoEmpresaUrl} alt="Logo da empresa" className="max-h-24 max-w-xs object-contain" />
                      </div>
                      <div className="flex gap-2">
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/svg+xml"
                            className="hidden"
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); e.target.value = ''; }}
                            disabled={uploadingLogo}
                          />
                          <span className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 cursor-pointer">
                            {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                            Substituir logo
                          </span>
                        </label>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleLogoRemove}
                          disabled={removingLogo}
                        >
                          {removingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          <span className="ml-1">Remover</span>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); e.target.value = ''; }}
                        disabled={uploadingLogo}
                      />
                      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 flex flex-col items-center justify-center gap-2 hover:border-purple-400 transition-colors">
                        {uploadingLogo
                          ? <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
                          : <FileUp className="h-8 w-8 text-gray-400" />}
                        <p className="text-sm text-gray-500">{uploadingLogo ? 'Enviando...' : 'Clique para selecionar a logo'}</p>
                        <p className="text-xs text-gray-400">PNG, JPG, WebP ou SVG — máx. 2 MB</p>
                      </div>
                    </label>
                  )}
                </div>
              </CollapsibleSection>

              {/* Dados do Responsável Técnico */}
              <CollapsibleSection
                title="Dados do Responsável Técnico"
                description="Configure os dados do responsável técnico para geração de procurações."
                defaultOpen={false}
                borderColor="blue-500"
                icon={<FileText className="h-5 w-5" />}
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Nome Completo</label>
                      <Input
                        type="text"
                        value={responsavelTecnico.nomeCompleto}
                        onChange={(e) => setResponsavelTecnico(prev => ({ ...prev, nomeCompleto: e.target.value }))}
                        placeholder="Ex: João da Silva Santos"
                        disabled={!editandoResponsavel}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">CPF</label>
                      <Input
                        type="text"
                        value={responsavelTecnico.cpf}
                        onChange={(e) => setResponsavelTecnico(prev => ({ ...prev, cpf: e.target.value }))}
                        placeholder="Ex: 000.000.000-00"
                        disabled={!editandoResponsavel}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">RG</label>
                      <Input
                        type="text"
                        value={responsavelTecnico.rg}
                        onChange={(e) => setResponsavelTecnico(prev => ({ ...prev, rg: e.target.value }))}
                        placeholder="Ex: 12.345.678-9"
                        disabled={!editandoResponsavel}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Órgão Expeditor</label>
                      <Input
                        type="text"
                        value={responsavelTecnico.orgaoExpeditor}
                        onChange={(e) => setResponsavelTecnico(prev => ({ ...prev, orgaoExpeditor: e.target.value }))}
                        placeholder="Ex: SSP"
                        disabled={!editandoResponsavel}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Profissão</label>
                      <Input
                        type="text"
                        value={responsavelTecnico.profissao}
                        onChange={(e) => setResponsavelTecnico(prev => ({ ...prev, profissao: e.target.value }))}
                        placeholder="Ex: Engenheiro Eletricista"
                        disabled={!editandoResponsavel}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Número de Registro Profissional</label>
                      <Input
                        type="text"
                        value={responsavelTecnico.numeroRegistro}
                        onChange={(e) => setResponsavelTecnico(prev => ({ ...prev, numeroRegistro: e.target.value }))}
                        placeholder="Ex: 123456"
                        disabled={!editandoResponsavel}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Instituição</label>
                      <select
                        value={responsavelTecnico.instituicao}
                        onChange={(e) => setResponsavelTecnico(prev => ({ 
                          ...prev, 
                          instituicao: e.target.value,
                          // Limpar estado do registro se CFT for selecionado
                          estadoRegistro: e.target.value === 'CFT' ? '' : prev.estadoRegistro
                        }))}
                        disabled={!editandoResponsavel}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="CREA">CREA</option>
                        <option value="CFT">CFT</option>
                      </select>
                    </div>

                    {/* Estado do Registro - Apenas para CREA */}
                    {responsavelTecnico.instituicao === 'CREA' && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Estado do Registro</label>
                        <select
                          value={responsavelTecnico.estadoRegistro}
                          onChange={(e) => setResponsavelTecnico(prev => ({ ...prev, estadoRegistro: e.target.value }))}
                          disabled={!editandoResponsavel}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="">Selecione o estado</option>
                          <option value="AC">Acre</option>
                          <option value="AL">Alagoas</option>
                          <option value="AP">Amapá</option>
                          <option value="AM">Amazonas</option>
                          <option value="BA">Bahia</option>
                          <option value="CE">Ceará</option>
                          <option value="DF">Distrito Federal</option>
                          <option value="ES">Espírito Santo</option>
                          <option value="GO">Goiás</option>
                          <option value="MA">Maranhão</option>
                          <option value="MT">Mato Grosso</option>
                          <option value="MS">Mato Grosso do Sul</option>
                          <option value="MG">Minas Gerais</option>
                          <option value="PA">Pará</option>
                          <option value="PB">Paraíba</option>
                          <option value="PR">Paraná</option>
                          <option value="PE">Pernambuco</option>
                          <option value="PI">Piauí</option>
                          <option value="RJ">Rio de Janeiro</option>
                          <option value="RN">Rio Grande do Norte</option>
                          <option value="RS">Rio Grande do Sul</option>
                          <option value="RO">Rondônia</option>
                          <option value="RR">Roraima</option>
                          <option value="SC">Santa Catarina</option>
                          <option value="SP">São Paulo</option>
                          <option value="SE">Sergipe</option>
                          <option value="TO">Tocantins</option>
                        </select>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-sm font-medium">UF do Responsável Técnico</label>
                      <select
                        value={responsavelTecnico.uf || ''}
                        onChange={(e) => setResponsavelTecnico(prev => ({ ...prev, uf: e.target.value }))}
                        disabled={!editandoResponsavel}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">Selecione o estado</option>
                        <option value="AC">Acre (AC)</option>
                        <option value="AL">Alagoas (AL)</option>
                        <option value="AP">Amapá (AP)</option>
                        <option value="AM">Amazonas (AM)</option>
                        <option value="BA">Bahia (BA)</option>
                        <option value="CE">Ceará (CE)</option>
                        <option value="DF">Distrito Federal (DF)</option>
                        <option value="ES">Espírito Santo (ES)</option>
                        <option value="GO">Goiás (GO)</option>
                        <option value="MA">Maranhão (MA)</option>
                        <option value="MT">Mato Grosso (MT)</option>
                        <option value="MS">Mato Grosso do Sul (MS)</option>
                        <option value="MG">Minas Gerais (MG)</option>
                        <option value="PA">Pará (PA)</option>
                        <option value="PB">Paraíba (PB)</option>
                        <option value="PR">Paraná (PR)</option>
                        <option value="PE">Pernambuco (PE)</option>
                        <option value="PI">Piauí (PI)</option>
                        <option value="RJ">Rio de Janeiro (RJ)</option>
                        <option value="RN">Rio Grande do Norte (RN)</option>
                        <option value="RS">Rio Grande do Sul (RS)</option>
                        <option value="RO">Rondônia (RO)</option>
                        <option value="RR">Roraima (RR)</option>
                        <option value="SC">Santa Catarina (SC)</option>
                        <option value="SP">São Paulo (SP)</option>
                        <option value="SE">Sergipe (SE)</option>
                        <option value="TO">Tocantins (TO)</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">E-mail do Responsável Técnico</label>
                      <Input
                        type="email"
                        value={responsavelTecnico.email || ''}
                        onChange={(e) => setResponsavelTecnico(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="Ex: gabriel@empresa.com"
                        disabled={!editandoResponsavel}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Telefone do Responsável Técnico</label>
                      <Input
                        type="text"
                        value={responsavelTecnico.telefone || ''}
                        onChange={(e) => setResponsavelTecnico(prev => ({ ...prev, telefone: e.target.value }))}
                        placeholder="Ex: (48) 9 9900-0387"
                        disabled={!editandoResponsavel}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    {!editandoResponsavel ? (
                      <Button
                        onClick={() => setEditandoResponsavel(true)}
                        disabled={isLoading}
                      >
                        Editar Dados do Responsável Técnico
                      </Button>
                    ) : (
                      <>
                        <Button
                          onClick={() => {
                            setResponsavelTecnico({...responsavelOriginal});
                            setEditandoResponsavel(false);
                          }}
                          variant="outline"
                          disabled={isLoading}
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={async () => {
                            setIsLoading(true);
                            const sucesso = await atualizarResponsavelTecnico(responsavelTecnico);
                            
                            if (sucesso) {
                              setResponsavelOriginal({...responsavelTecnico});
                              setEditandoResponsavel(false);
                              toast({
                                title: 'Dados salvos',
                                description: 'Os dados do responsável técnico foram salvos com sucesso.',
                              });
                            } else {
                              toast({
                                title: 'Erro',
                                description: 'Não foi possível salvar os dados do responsável técnico.',
                                variant: 'destructive',
                              });
                            }
                            setIsLoading(false);
                          }}
                          disabled={isLoading}
                        >
                          {isLoading ? 'Salvando...' : 'Salvar Dados'}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CollapsibleSection>

              {/* Texto da Procuração */}
              <CollapsibleSection
                title="Texto da Procuração"
                description="Configure o texto padrão da procuração com as variáveis disponíveis."
                defaultOpen={false}
                borderColor="emerald-500"
                icon={<FileText className="h-5 w-5" />}
              >
                <div className="space-y-4">
                  {editandoProcuracao ? (
                    <>
                      {/* Informação sobre variáveis disponíveis - APENAS no modo de edição */}
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                          Variáveis Disponíveis
                        </h4>
                        <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                          <p><strong>Do Cliente:</strong> {`{{cliente_nome}}, {{cliente_tipo}}, {{cliente_rg}}, {{cliente_cpf}}, {{cliente_cnpj}}`}</p>
                          <p><strong>Do Responsável Técnico:</strong> {`{{responsavel_nome}}, {{responsavel_cpf}}, {{responsavel_rg}}, {{responsavel_orgao_expeditor}}, {{responsavel_profissao}}, {{responsavel_registro}}, {{responsavel_instituicao}}, {{responsavel_estado}}`}</p>
                          <p><strong>Do Projeto:</strong> {`{{distribuidora}}, {{cidade}}, {{estado}}, {{data}}`}</p>
                          <p className="text-xs italic mt-2">
                            <strong>Nota:</strong> Você pode usar HTML inline (como &lt;div&gt;, &lt;strong&gt;, estilos CSS) para formatar o documento.
                          </p>
                        </div>
                      </div>
                    </>
                  ) : null}

                  {editandoProcuracao ? (
                    <Textarea
                      value={textoProcuracao}
                      onChange={(e) => setTextoProcuracao(e.target.value)}
                      placeholder="Digite o texto padrão da procuração..."
                      className="min-h-[400px] font-mono"
                    />
                  ) : (
                    <div className="rounded-md border border-gray-200 dark:border-gray-700 p-4">
                      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
                        <div 
                          className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm"
                          dangerouslySetInnerHTML={{ __html: textoProcuracao || defaultProcuracao }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    {!editandoProcuracao ? (
                      <Button
                        onClick={() => setEditandoProcuracao(true)}
                        disabled={isLoading}
                      >
                        Editar Texto da Procuração
                      </Button>
                    ) : (
                      <>
                        <Button
                          onClick={() => {
                            setTextoProcuracao(textoProcuracaoOriginal);
                            setEditandoProcuracao(false);
                          }}
                          variant="outline"
                          disabled={isLoading}
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={async () => {
                            setIsLoading(true);

                            try {
                              const sucesso = await atualizarTextoProcuracao(textoProcuracao);

                              if (sucesso) {
                                setTextoProcuracaoOriginal(textoProcuracao);
                                setEditandoProcuracao(false);
                                toast({
                                  title: 'Texto salvo',
                                  description: 'O texto da procuração foi salvo com sucesso.',
                                });
                              } else {
                                toast({
                                  title: 'Erro',
                                  description: 'Não foi possível salvar o texto da procuração.',
                                  variant: 'destructive',
                                });
                              }
                            } catch (error) {
                              toast({
                                title: 'Erro',
                                description: 'Ocorreu um erro ao salvar o texto da procuração.',
                                variant: 'destructive',
                              });
                            } finally {
                              setIsLoading(false);
                            }
                          }}
                          disabled={isLoading}
                        >
                          {isLoading ? 'Salvando...' : 'Salvar Texto'}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CollapsibleSection>
            </div>
          )}

          {/* ABA E-MAILS */}
          {activeTab === 'emails' && (
            <CollapsibleSection
              title="Notificações por E-mail"
              description="Configure quais notificações você deseja receber por e-mail."
              defaultOpen={true}
              borderColor="rose-500"
              icon={<Mail className="h-5 w-5" />}
            >
              {loadingEmailPrefs ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
                  <span className="ml-3 text-gray-600">Carregando preferências...</span>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    Escolha quais tipos de notificações você deseja receber por e-mail. Você pode ativar ou desativar cada tipo de notificação individualmente.
                  </div>

                  <div className="space-y-4">
                    {/* Notificação de Projeto Criado */}
                    <div className="flex items-start justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                          <FolderPlus className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                            Novo Projeto Criado
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Receba um e-mail quando um cliente criar um novo projeto.
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={emailPreferences.notify_project_created}
                        onCheckedChange={(checked) => atualizarPreferenciaEmail('notify_project_created', checked)}
                        disabled={savingEmailPrefs}
                      />
                    </div>

                    {/* Notificação de Mudança de Status */}
                    <div className="flex items-start justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                          <Bell className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                            Mudança de Status
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Receba um e-mail quando o status de um projeto for alterado.
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={emailPreferences.notify_status_change}
                        onCheckedChange={(checked) => atualizarPreferenciaEmail('notify_status_change', checked)}
                        disabled={savingEmailPrefs}
                      />
                    </div>

                    {/* Notificação de Documento Adicionado */}
                    <div className="flex items-start justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
                          <FileUp className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                            Documento Adicionado
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Receba um e-mail quando um documento for adicionado a um projeto.
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={emailPreferences.notify_document_added}
                        onCheckedChange={(checked) => atualizarPreferenciaEmail('notify_document_added', checked)}
                        disabled={savingEmailPrefs}
                      />
                    </div>

                    {/* Notificação de Comentário Adicionado */}
                    <div className="flex items-start justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                          <MessageSquare className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                            Comentário Adicionado
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Receba um e-mail quando um comentário for adicionado a um projeto.
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={emailPreferences.notify_comment_added}
                        onCheckedChange={(checked) => atualizarPreferenciaEmail('notify_comment_added', checked)}
                        disabled={savingEmailPrefs}
                      />
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                      <div className="flex-1">
                        <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                          Sobre as notificações
                        </h5>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          Todas as notificações estão habilitadas por padrão. Você pode desativá-las a qualquer momento usando os controles acima. As mudanças são salvas automaticamente.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CollapsibleSection>
          )}
        </div>
      </div>
    </div>
  );
}
