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
import { PlusCircle, Trash2, ChevronRight } from 'lucide-react';
import { devLog } from "@/lib/utils/productionLogger";
import { cn } from '@/lib/utils';

// Componente Collapse simples para substituir o Accordion
function CollapseSection({ 
  title, 
  children, 
  className,
  defaultOpen = false
}: { 
  title: string; 
  children: React.ReactNode; 
  className?: string;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn("border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="text-lg font-medium py-4 bg-gray-50 dark:bg-gray-800 px-4 rounded-t-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors w-full flex items-center justify-between"
      >
        {title}
        <ChevronRight className={cn(
          "h-4 w-4 shrink-0 transition-transform duration-200",
          isOpen && "rotate-90"
        )} />
      </button>
      {isOpen && (
        <div>
          {children}
        </div>
      )}
    </div>
  );
}

export default function PreferenciasPage() {
  const { user } = useAuth();
  const [mensagemChecklist, setMensagemChecklist] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [originalMessage, setOriginalMessage] = useState('');
  const [tabelaPrecos, setTabelaPrecos] = useState<{ tipo: string; valorBase: string }[]>([
    { tipo: 'Residencial', valorBase: '0' },
    { tipo: 'Comercial', valorBase: '0' },
    { tipo: 'Industrial', valorBase: '0' }
  ]);
  const [novoTipo, setNovoTipo] = useState('');
  const [novoValor, setNovoValor] = useState('');

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

  // Função para processar o texto e obter os componentes formatados
  const processChecklistText = (text: string) => {
    if (!text) return { title: '', introParas: [], listItems: [], finalParas: [] };
    
    const lines = text.split('\n');
    const title = lines[0] || 'Checklist de Documentos Necessários para o Projeto';
    
    // Dividir o texto em parágrafos introdutórios, itens de lista e parágrafos finais
    const introParas: string[] = [];
    const listItems: string[] = [];
    const finalParas: string[] = [];
    
    // Definir a estrutura do texto:
    // 1. Título (primeira linha)
    // 2. Parágrafos introdutórios (linhas que vêm antes de qualquer item de lista)
    // 3. Lista de itens (linhas que começam com "-")
    // 4. Parágrafos finais (linhas que vêm depois dos itens de lista)
    
    let inListSection = false;
    let pastListSection = false;
    
    // Processar a partir da segunda linha (ignorar título)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Pular linhas vazias
      
      // Se a linha começa com "-", é um item de lista
      if (line.startsWith('-')) {
        inListSection = true;
        listItems.push(line.substring(1).trim()); // Remover o traço e espaços extras
      } 
      // Se já passamos pelos itens da lista e encontramos texto normal
      else if (inListSection) {
        pastListSection = true;
        finalParas.push(line);
      }
      // Se ainda não começamos a lista e não estamos após a lista, é um parágrafo introdutório
      else if (!inListSection && !pastListSection) {
        introParas.push(line);
      }
    }
    
    return { title, introParas, listItems, finalParas };
  };

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
          
          // Carregar faixas de potência se existirem
          if (data.faixasPotencia && Array.isArray(data.faixasPotencia)) {
            setFaixasPotencia(data.faixasPotencia);
            setFaixasPotenciaOriginal(data.faixasPotencia);
          } else {
            // Se não existirem, criar faixas padrão
            const faixasPadrao = criarFaixasPotenciaPadrao();
            setFaixasPotencia(faixasPadrao);
            setFaixasPotenciaOriginal(faixasPadrao);
          }

          // Carregar dados bancários se existirem
          if (data.dadosBancarios) {
            setDadosBancarios(data.dadosBancarios);
            setDadosBancariosOriginal(data.dadosBancarios);
          }
        } else {
          // Documento não existe, criar padrões
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
      
      // Certifique-se de que todos os dados sejam atualizados corretamente
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

  const salvarTabelaPrecos = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      await atualizarFaixasPotencia(faixasPotencia);
      
      toast({
        title: 'Configurações salvas',
        description: 'A tabela de preços foi atualizada com sucesso.',
      });
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

  // Funções para a tabela de faixas de potência
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
    
    // Verificar se há sobreposição com faixas existentes (nova lógica mais precisa)
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
    
    // Adicionar e ordenar por potência mínima
    const novasFaixas = [...faixasPotencia, novaFaixa].sort((a, b) => a.potenciaMin - b.potenciaMin);
    setFaixasPotencia(novasFaixas);
    
    // Limpar campos
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
      
      // Verificar se há sobreposições entre faixas (com lógica melhorada)
      // Primeiro ordenar as faixas por potência mínima para facilitar a verificação
      const faixasOrdenadas = [...faixasPotencia].sort((a, b) => a.potenciaMin - b.potenciaMin);
      
      for (let i = 0; i < faixasOrdenadas.length; i++) {
        for (let j = i + 1; j < faixasOrdenadas.length; j++) {
          const faixa1 = faixasOrdenadas[i];
          const faixa2 = faixasOrdenadas[j];
          
          // Verificar sobreposição real (faixa1 termina depois do início da faixa2 e faixa2 começa antes do fim da faixa1)
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
      
      // Verificar lacunas entre faixas (opcional, mas útil para alertar o usuário)
      for (let i = 0; i < faixasOrdenadas.length - 1; i++) {
        const faixaAtual = faixasOrdenadas[i];
        const proximaFaixa = faixasOrdenadas[i + 1];
        
        if (faixaAtual.potenciaMax !== proximaFaixa.potenciaMin) {
          // Esta é apenas uma notificação, não impede o salvamento
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

  const adicionarTipoPreco = () => {
    if (!novoTipo || !novoValor) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Por favor, preencha o tipo e o valor base.',
        variant: 'destructive',
      });
      return;
    }

    const novoItem = { tipo: novoTipo, valorBase: novoValor };
    setTabelaPrecos([...tabelaPrecos, novoItem]);
    setNovoTipo('');
    setNovoValor('');
  };

  const removerTipoPreco = (index: number) => {
    const novaTabelaPrecos = [...tabelaPrecos];
    novaTabelaPrecos.splice(index, 1);
    setTabelaPrecos(novaTabelaPrecos);
  };

  const atualizarValorPreco = (index: number, valor: string) => {
    const novaTabela = [...tabelaPrecos];
    novaTabela[index].valorBase = valor;
    setTabelaPrecos(novaTabela);
  };

  // Atualizar valores dos dados bancários
  const atualizarCampoDadosBancarios = (campo: keyof DadosBancarios, valor: string) => {
    setDadosBancarios(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  // Cancelar edição dos dados bancários
  const cancelarEdicaoDadosBancarios = () => {
    setDadosBancarios({...dadosBancariosOriginal});
    setEditandoDadosBancarios(false);
  };

  // Salvar dados bancários
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
        
        {/* Elementos decorativos */}
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-indigo-500/30"></div>
        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-violet-500/30"></div>
      </div>
      
      {/* Container alinhado com o header em relação à sidebar */}
      <div className="px-8 py-2 max-w-[1400px] mx-auto">
        <div className="grid gap-4">
          {/* Mensagem de Checklist - Agora fechada por padrão */}
          <CollapseSection 
            title="Mensagem de Checklist" 
            defaultOpen={false}
            className="shadow-sm hover:shadow transition-shadow duration-200"
          >
            <Card className="border-t-0 rounded-t-none">
              <CardContent className="pt-6 space-y-4">
                <CardDescription className="pb-2 text-gray-600 dark:text-gray-300">
                  Define a mensagem padrão que será exibida nos checklists dos projetos.
                </CardDescription>
                
                {editMode ? (
                  // Modo de edição - mostra o textarea
                  <div className="rounded-md border border-indigo-300 dark:border-indigo-700">
                    <Textarea
                      value={mensagemChecklist}
                      onChange={(e) => setMensagemChecklist(e.target.value)}
                      placeholder="Digite a mensagem padrão para os checklists..."
                      className="min-h-[300px] border-gray-300 dark:border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                ) : (
                  // Modo de visualização - mostra a prévia formatada
                  <div className="rounded-md border border-gray-200 dark:border-gray-700 p-2">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      {(() => {
                         const processedText = processChecklistText(mensagemChecklist);
                         return (
                          <div className="mt-6 space-y-4">
                            <div className="space-y-2">
                              <h3 className="text-lg font-medium">{processedText.title}</h3>
                              
                              {/* Parágrafos introdutórios */}
                              {processedText.introParas && processedText.introParas.map((paragraph, index) => (
                                <div key={`intro-${index}`} className="mb-3">
                                  <p>{paragraph}</p>
                                </div>
                              ))}
                              
                              {/* Itens da lista */}
                              {processedText.listItems && processedText.listItems.length > 0 && (
                                <ul className="list-disc pl-5 space-y-1.5 mb-3">
                                  {processedText.listItems.map((item, index) => (
                                    <li key={index}>{item}</li>
                                  ))}
                                </ul>
                              )}
                              
                              {/* Parágrafos finais */}
                              {processedText.finalParas && processedText.finalParas.map((paragraph, index) => (
                                <div key={`final-${index}`} className="mb-2">
                                  <p>{paragraph}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                         );
                       })()}
                    </div>
                  </div>
                )}
                
                <div className="flex justify-end pb-2 gap-2">
                  {!editMode ? (
                    <Button 
                      onClick={() => setEditMode(true)} 
                      disabled={isLoading}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      Editar Checklist
                    </Button>
                  ) : (
                    <>
                      <Button 
                        onClick={cancelarEdicao} 
                        variant="outline"
                        disabled={isLoading}
                        className="border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200"
                      >
                        Cancelar
                      </Button>
                      <Button 
                        onClick={salvarMensagemChecklist} 
                        disabled={isLoading}
                        className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 transition-all duration-200 shadow-md hover:shadow-lg"
                      >
                        {isLoading ? 'Salvando...' : 'Salvar Alterações'}
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </CollapseSection>

          <CollapseSection 
            title="Tabela de Preços dos Projetos" 
            className="shadow-sm hover:shadow transition-shadow duration-200"
          >
            <Card className="border-t-0 rounded-t-none">
              <CardContent className="pt-6 space-y-4">
                <CardDescription className="pb-2 text-gray-600 dark:text-gray-300">
                  Configure a tabela de preços base para diferentes faixas de potência dos projetos.
                </CardDescription>
                
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 dark:bg-gray-800/50 dark:hover:bg-gray-800/50">
                        <TableHead className="font-semibold text-gray-700 dark:text-gray-300 w-[200px]">Potência Mínima (kWp)</TableHead>
                        <TableHead className="font-semibold text-gray-700 dark:text-gray-300 w-[200px]">Potência Máxima (kWp)</TableHead>
                        <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Valor Base (R$)</TableHead>
                        {editandoTabela && (
                          <TableHead className="font-semibold text-gray-700 dark:text-gray-300 w-[80px]">Ações</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {faixasPotencia.map((faixa, index) => (
                        <TableRow 
                          key={index}
                          className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 border-b border-gray-100 dark:border-gray-700/50"
                        >
                          <TableCell className="font-medium text-gray-800 dark:text-gray-200">
                            {editandoTabela ? (
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={faixa.potenciaMin}
                                onChange={(e) => atualizarFaixaPotencia(index, 'potenciaMin', parseFloat(e.target.value))}
                                className="w-full border-gray-300 dark:border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                              />
                            ) : (
                              faixa.potenciaMin
                            )}
                          </TableCell>
                          <TableCell className="font-medium text-gray-800 dark:text-gray-200">
                            {editandoTabela ? (
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={faixa.potenciaMax}
                                onChange={(e) => atualizarFaixaPotencia(index, 'potenciaMax', parseFloat(e.target.value))}
                                className="w-full border-gray-300 dark:border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
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
                                className="w-full border-gray-300 dark:border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
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
                                className="text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-full h-8 w-8 transition-colors"
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
                  <div className="flex flex-col sm:flex-row gap-2 items-end mt-4 border-t border-gray-100 dark:border-gray-800 pt-4">
                    <div className="space-y-2 w-full sm:w-1/3">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Potência Mínima (kWp)</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={novaPotenciaMin}
                        onChange={(e) => setNovaPotenciaMin(e.target.value)}
                        placeholder="Ex: 5"
                        className="border-gray-300 dark:border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                      />
                    </div>
                    <div className="space-y-2 w-full sm:w-1/3">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Potência Máxima (kWp)</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={novaPotenciaMax}
                        onChange={(e) => setNovaPotenciaMax(e.target.value)}
                        placeholder="Ex: 10"
                        className="border-gray-300 dark:border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                      />
                    </div>
                    <div className="space-y-2 w-full sm:w-1/3">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Valor Base (R$)</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={novoValorPotencia}
                        onChange={(e) => setNovoValorPotencia(e.target.value)}
                        placeholder="Ex: 600"
                        className="border-gray-300 dark:border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                      />
                    </div>
                    <Button
                      onClick={adicionarFaixaPotencia}
                      disabled={isLoading || !novaPotenciaMin || !novaPotenciaMax || !novoValorPotencia}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-1"
                    >
                      <PlusCircle className="h-4 w-4" />
                      Adicionar
                    </Button>
                  </div>
                )}

                <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800 gap-2">
                  {!editandoTabela ? (
                    <Button 
                      onClick={() => setEditandoTabela(true)} 
                      disabled={isLoading}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      Editar Tabela de Preços
                    </Button>
                  ) : (
                    <>
                      <Button 
                        onClick={cancelarEdicaoFaixas} 
                        variant="outline"
                        disabled={isLoading}
                        className="border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200"
                      >
                        Cancelar
                      </Button>
                      <Button 
                        onClick={salvarFaixasPotencia} 
                        disabled={isLoading}
                        className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 transition-all duration-200 shadow-md hover:shadow-lg"
                      >
                        {isLoading ? 'Salvando...' : 'Salvar Tabela de Preços'}
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </CollapseSection>

          <CollapseSection 
            title="Dados Bancários" 
            className="shadow-sm hover:shadow transition-shadow duration-200"
          >
            <Card className="border-t-0 rounded-t-none">
              <CardContent className="pt-6 space-y-4">
                <CardDescription className="pb-2 text-gray-600 dark:text-gray-300">
                  Configure os dados bancários para recebimentos e pagamentos.
                </CardDescription>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Banco</label>
                    <Input
                      type="text"
                      value={dadosBancarios.banco}
                      onChange={(e) => atualizarCampoDadosBancarios('banco', e.target.value)}
                      placeholder="Ex: Itaú"
                      disabled={!editandoDadosBancarios}
                      className="border-gray-300 dark:border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Agência</label>
                    <Input
                      type="text"
                      value={dadosBancarios.agencia}
                      onChange={(e) => atualizarCampoDadosBancarios('agencia', e.target.value)}
                      placeholder="Ex: 1234"
                      disabled={!editandoDadosBancarios}
                      className="border-gray-300 dark:border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Conta</label>
                    <Input
                      type="text"
                      value={dadosBancarios.conta}
                      onChange={(e) => atualizarCampoDadosBancarios('conta', e.target.value)}
                      placeholder="Ex: 12345-6"
                      disabled={!editandoDadosBancarios}
                      className="border-gray-300 dark:border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nome do Favorecido</label>
                    <Input
                      type="text"
                      value={dadosBancarios.favorecido}
                      onChange={(e) => atualizarCampoDadosBancarios('favorecido', e.target.value)}
                      placeholder="Ex: Empresa de Engenharia LTDA"
                      disabled={!editandoDadosBancarios}
                      className="border-gray-300 dark:border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">CNPJ/CPF</label>
                    <Input
                      type="text"
                      value={dadosBancarios.documento}
                      onChange={(e) => atualizarCampoDadosBancarios('documento', e.target.value)}
                      placeholder="Ex: 12.345.678/0001-90"
                      disabled={!editandoDadosBancarios}
                      className="border-gray-300 dark:border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Chave PIX</label>
                    <Input
                      type="text"
                      value={dadosBancarios.chavePix}
                      onChange={(e) => atualizarCampoDadosBancarios('chavePix', e.target.value)}
                      placeholder="Ex: email@empresa.com.br"
                      disabled={!editandoDadosBancarios}
                      className="border-gray-300 dark:border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800 gap-2">
                  {!editandoDadosBancarios ? (
                    <Button 
                      onClick={() => setEditandoDadosBancarios(true)} 
                      disabled={isLoading}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      Editar Dados Bancários
                    </Button>
                  ) : (
                    <>
                      <Button 
                        onClick={cancelarEdicaoDadosBancarios} 
                        variant="outline"
                        disabled={isLoading}
                        className="border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200"
                      >
                        Cancelar
                      </Button>
                      <Button 
                        onClick={salvarDadosBancarios} 
                        disabled={isLoading}
                        className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 transition-all duration-200 shadow-md hover:shadow-lg"
                      >
                        {isLoading ? 'Salvando...' : 'Salvar Dados Bancários'}
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </CollapseSection>
        </div>
      </div>
    </div>
  );
}
