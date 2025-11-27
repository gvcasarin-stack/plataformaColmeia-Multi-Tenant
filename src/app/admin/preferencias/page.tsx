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
  criarConfiguracaoPadrao,
  type FaixaPotenciaPreco,
  type DadosBancarios,
  type ConfiguracaoSistema
} from '@/lib/services/configService.supabase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Trash2, Settings, BarChart3, DollarSign, Columns3, FileText, Clock, Loader2 } from 'lucide-react';
import { devLog } from "@/lib/utils/productionLogger";
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { getProjectStatuses, updateStatusSLA, type ProjectStatusInfo } from '@/lib/services/kanbanService';
import { PackagesTab } from '@/components/admin/PackagesTab';
import { SubscriptionPlansTab } from '@/components/admin/SubscriptionPlansTab';

// Componente de Abas
function Tabs({ tabs, activeTab, onTabChange }: { tabs: { id: string; label: string; icon: React.ReactNode }[]; activeTab: string; onTabChange: (tabId: string) => void }) {
  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <nav className="-mb-px flex space-x-8" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "group inline-flex items-center border-b-2 py-4 px-1 text-sm font-medium transition-all duration-200",
              activeTab === tab.id
                ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            )}
          >
            <span className={cn(
              "mr-2",
              activeTab === tab.id ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400 group-hover:text-gray-500 dark:text-gray-500"
            )}>
              {tab.icon}
            </span>
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

// Componente de Seção Expansível
function CollapsibleSection({
  title,
  description,
  children,
  defaultOpen = false
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-gray-800 shadow-md hover:shadow-lg hover:border-indigo-400 dark:hover:border-indigo-500 transition-all duration-200">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-750 hover:from-indigo-50 hover:to-white dark:hover:from-gray-750 dark:hover:to-gray-700 transition-all duration-200"
      >
        <div className="flex-1 text-left">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">{title}</h3>
          {description && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
          )}
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
          <div className="p-6">
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
        } else {
          setMensagemChecklist(defaultChecklist);
          setOriginalMessage(defaultChecklist);
          const faixasPadrao = criarFaixasPotenciaPadrao();
          setFaixasPotencia(faixasPadrao);
          setFaixasPotenciaOriginal(faixasPadrao);

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

  const tabs = [
    { id: 'geral', label: 'Geral', icon: <Settings className="h-4 w-4" /> },
    { id: 'projetos', label: 'Projetos', icon: <FileText className="h-4 w-4" /> },
    { id: 'kanban', label: 'Kanban', icon: <Columns3 className="h-4 w-4" /> },
    { id: 'financeiro', label: 'Financeiro', icon: <DollarSign className="h-4 w-4" /> }
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
              >
                  <div className="space-y-4">
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
                  </div>
              </CollapsibleSection>

              {/* Pacotes de Projetos */}
              <CollapsibleSection
                title="Pacotes de Projetos"
                description="Configure pacotes de projetos que podem ser vendidos aos clientes."
                defaultOpen={false}
              >
                <PackagesTab />
              </CollapsibleSection>

              {/* Assinatura Mensal */}
              <CollapsibleSection
                title="Planos de Assinatura Mensal"
                description="Configure planos de assinatura mensal para seus clientes."
                defaultOpen={false}
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
            >
              <div className="text-center py-12 text-gray-500">
                <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Configurações financeiras em desenvolvimento...</p>
              </div>
            </CollapsibleSection>
          )}
        </div>
      </div>
    </div>
  );
}
