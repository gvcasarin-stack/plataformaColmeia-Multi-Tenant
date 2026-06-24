"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Check from "@/components/icons/check"
import Clock from "@/components/icons/clock"
import Alert from "@/components/icons/alert"
import { useAuth } from '@/lib/hooks/useAuth'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { 
  Zap, 
  Battery, 
  BatteryCharging, 
  Home, 
  Building2, 
  ArrowLeft, 
  FileDown,
  History,
  Plus,
  Trash2,
  CheckCircle2
} from 'lucide-react'
import {
  TipoSistema,
  TipoConsumidor,
  ObjetivoBateria,
  TipoLigacao,
  Carga,
  Dimensionamento,
  LABELS_TIPO_SISTEMA,
  LABELS_TIPO_CONSUMIDOR,
  LABELS_OBJETIVO_BATERIA,
  LABELS_TIPO_LIGACAO,
  APARELHOS_PRE_DEFINIDOS,
} from '@/types/dimensionamento'
import { calcularDimensionamento, calcularPorPotenciaKwp } from '@/lib/utils/dimensionamentoCalculos'
import {
  createDimensionamento,
  getDimensionamentos
} from '@/lib/services/dimensionamentoService'
import { gerarEBaixarPDF } from '@/lib/utils/pdfGeneratorDimensionamento'
import { devLog } from '@/lib/utils/productionLogger'

// Mapeamento de estados brasileiros para valores médios de irradiação solar (horas de sol pico por dia)
// Agrupando por região para melhor organização
const estadosIrradiacao = [
  // Norte
  { uf: 'AC', nome: 'Acre', irradiacao: 4.1, regiao: 'Norte' },
  { uf: 'AP', nome: 'Amapá', irradiacao: 4.4, regiao: 'Norte' },
  { uf: 'AM', nome: 'Amazonas', irradiacao: 4.2, regiao: 'Norte' },
  { uf: 'PA', nome: 'Pará', irradiacao: 4.6, regiao: 'Norte' },
  { uf: 'RO', nome: 'Rondônia', irradiacao: 4.4, regiao: 'Norte' },
  { uf: 'RR', nome: 'Roraima', irradiacao: 4.5, regiao: 'Norte' },
  { uf: 'TO', nome: 'Tocantins', irradiacao: 5.0, regiao: 'Norte' },
  
  // Nordeste
  { uf: 'AL', nome: 'Alagoas', irradiacao: 5.2, regiao: 'Nordeste' },
  { uf: 'BA', nome: 'Bahia', irradiacao: 5.3, regiao: 'Nordeste' },
  { uf: 'CE', nome: 'Ceará', irradiacao: 5.5, regiao: 'Nordeste' },
  { uf: 'MA', nome: 'Maranhão', irradiacao: 5.0, regiao: 'Nordeste' },
  { uf: 'PB', nome: 'Paraíba', irradiacao: 5.4, regiao: 'Nordeste' },
  { uf: 'PE', nome: 'Pernambuco', irradiacao: 5.3, regiao: 'Nordeste' },
  { uf: 'PI', nome: 'Piauí', irradiacao: 5.4, regiao: 'Nordeste' },
  { uf: 'RN', nome: 'Rio Grande do Norte', irradiacao: 5.5, regiao: 'Nordeste' },
  { uf: 'SE', nome: 'Sergipe', irradiacao: 5.3, regiao: 'Nordeste' },
  
  // Centro-Oeste
  { uf: 'DF', nome: 'Distrito Federal', irradiacao: 5.2, regiao: 'Centro-Oeste' },
  { uf: 'GO', nome: 'Goiás', irradiacao: 5.2, regiao: 'Centro-Oeste' },
  { uf: 'MT', nome: 'Mato Grosso', irradiacao: 5.1, regiao: 'Centro-Oeste' },
  { uf: 'MS', nome: 'Mato Grosso do Sul', irradiacao: 5.0, regiao: 'Centro-Oeste' },
  
  // Sudeste
  { uf: 'ES', nome: 'Espírito Santo', irradiacao: 4.9, regiao: 'Sudeste' },
  { uf: 'MG', nome: 'Minas Gerais', irradiacao: 5.1, regiao: 'Sudeste' },
  { uf: 'RJ', nome: 'Rio de Janeiro', irradiacao: 4.8, regiao: 'Sudeste' },
  { uf: 'SP', nome: 'São Paulo', irradiacao: 4.9, regiao: 'Sudeste' },
  
  // Sul
  { uf: 'PR', nome: 'Paraná', irradiacao: 4.6, regiao: 'Sul' },
  { uf: 'RS', nome: 'Rio Grande do Sul', irradiacao: 4.5, regiao: 'Sul' },
  { uf: 'SC', nome: 'Santa Catarina', irradiacao: 4.2, regiao: 'Sul' }
];

export default function DimensionamentoPage() {
  const { user } = useAuth()
  
  // =====================================================
  // ESTADOS DO FORMULÁRIO
  // =====================================================
  
  const [step, setStep] = useState(1) // Controle de etapas
  const [showHistorico, setShowHistorico] = useState(false) // Mostrar histórico
  
  // Etapa 1: Tipo de Sistema
  const [tipoSistema, setTipoSistema] = useState<TipoSistema | ''>('')
  
  // Etapa 2: Tipo de Consumidor
  const [tipoConsumidor, setTipoConsumidor] = useState<TipoConsumidor | ''>('')
  
  // Etapa 3: Objetivo da Bateria (condicional)
  const [objetivoBateria, setObjetivoBateria] = useState<ObjetivoBateria | ''>('')
  const [backupComFV, setBackupComFV] = useState(true)
  
  // Etapa 4: Tipo de Ligação (condicional)
  const [tipoLigacao, setTipoLigacao] = useState<TipoLigacao | ''>('')
  
  // Etapa 5: Dados do Consumo
  const [modoCalculo, setModoCalculo] = useState<'consumo' | 'potencia'>('consumo')
  const [consumoMensal, setConsumoMensal] = useState("")
  const [potenciaDesejadaKwp, setPotenciaDesejadaKwp] = useState("")
  const [estado, setEstado] = useState("")
  const [irradiacao, setIrradiacao] = useState<number>(4.2)
  const [autonomiaHoras, setAutonomiaHoras] = useState("24")
  const [potenciaModulo, setPotenciaModulo] = useState("550")
  const [fatorDesempenho, setFatorDesempenho] = useState(0.80)
  
  // Etapa 6: Cargas Elétricas (opcional)
  const [mostrarCargas, setMostrarCargas] = useState(false)
  const [cargas, setCargas] = useState<Carga[]>([])
  const [seletorCarga, setSeletorCarga] = useState('')
  
  // Resultados
  const [resultado, setResultado] = useState<any>(null)
  const [salvando, setSalvando] = useState(false)
  
  // Histórico
  const [historico, setHistorico] = useState<Dimensionamento[]>([])
  const [carregandoHistorico, setCarregandoHistorico] = useState(false)

  // =====================================================
  // EFEITOS
  // =====================================================

  // Atualiza a irradiação quando o estado muda
  useEffect(() => {
    if (estado) {
      const estadoSelecionado = estadosIrradiacao.find(e => e.uf === estado);
      if (estadoSelecionado) {
        setIrradiacao(estadoSelecionado.irradiacao);
      }
    }
  }, [estado]);

  // Carregar histórico ao abrir
  useEffect(() => {
    if (showHistorico && user?.id) {
      carregarHistorico();
    }
  }, [showHistorico, user?.id]);

  // =====================================================
  // FUNÇÕES AUXILIARES
  // =====================================================

  // Obter o nome do estado a partir da UF
  const getNomeEstado = (uf: string) => {
    const estadoSelecionado = estadosIrradiacao.find(e => e.uf === uf);
    return estadoSelecionado ? estadoSelecionado.nome : "";
  };

  // Verificar se pode avançar para próxima etapa
  const podeAvancar = () => {
    if (step === 1) return tipoSistema !== '';
    if (step === 2) return tipoConsumidor !== '';
    if (step === 3) {
      // Etapa 3 só existe para híbrido/off-grid
      if (tipoSistema === 'on-grid') return true;
      if (tipoSistema === 'hibrido') return objetivoBateria !== '';
      return true; // off-grid não precisa de objetivo
    }
    if (step === 4) {
      // Etapa 4 só existe se tem inversor
      if (tipoSistema === 'on-grid') return tipoLigacao !== '';
      if (tipoSistema === 'hibrido' || tipoSistema === 'off-grid') return tipoLigacao !== '';
      return true;
    }
    if (step === 5) {
      const estadoValido = estado !== '';
      const autonomiaValida = (tipoSistema === 'on-grid') || parseFloat(autonomiaHoras) > 0;
      if (modoCalculo === 'potencia') {
        return parseFloat(potenciaDesejadaKwp) > 0 && estadoValido;
      }
      const consumoValido = parseFloat(consumoMensal) > 0;
      return consumoValido && estadoValido && autonomiaValida;
    }
    return true;
  };

  // Avançar etapa
  const avancarEtapa = () => {
    if (podeAvancar()) {
      let proximaEtapa = step + 1;
      // Pular etapa 3 para on-grid e off-grid (só híbrido tem objetivo de bateria)
      if (step === 2 && (tipoSistema === 'on-grid' || tipoSistema === 'off-grid')) {
        proximaEtapa = 4;
      }
      setStep(proximaEtapa);
    }
  };

  // Voltar etapa
  const voltarEtapa = () => {
    let etapaAnterior = step - 1;
    // Pular etapa 3 ao voltar para on-grid e off-grid
    if (step === 4 && (tipoSistema === 'on-grid' || tipoSistema === 'off-grid')) {
      etapaAnterior = 2;
    }
    setStep(etapaAnterior);
  };

  // Resetar formulário
  const resetarFormulario = () => {
    setStep(1);
    setTipoSistema('');
    setTipoConsumidor('');
    setObjetivoBateria('');
    setBackupComFV(true);
    setTipoLigacao('');
    setConsumoMensal('');
    setEstado('');
    setAutonomiaHoras('24');
    setPotenciaModulo('550');
    setCargas([]);
    setSeletorCarga('');
    setMostrarCargas(false);
    setResultado(null);
    setModoCalculo('consumo');
    setPotenciaDesejadaKwp('');
    setFatorDesempenho(0.80);
  };

  // =====================================================
  // FUNÇÕES DE CÁLCULO
  // =====================================================

  const calcular = () => {
    try {
      if (!tipoSistema || !tipoConsumidor) {
        toast({ title: "Dados incompletos", description: "Preencha todos os campos obrigatórios", variant: "destructive" });
        return;
      }

      const potencia = parseFloat(potenciaModulo) || 550;
      const autonomia = parseFloat(autonomiaHoras);

      // Modo: calcular a partir do kWp desejado
      if (modoCalculo === 'potencia') {
        const kwp = parseFloat(potenciaDesejadaKwp);
        if (isNaN(kwp) || kwp <= 0) {
          toast({ title: "Potência inválida", description: "Informe uma potência em kWp válida", variant: "destructive" });
          return;
        }
        const sistemaFV = calcularPorPotenciaKwp(kwp, irradiacao, potencia, fatorDesempenho);
        setResultado({ sistema_fv: sistemaFV, economia_mensal: null });
        toast({ title: "Cálculo por potência concluído!", description: `Sistema de ${sistemaFV.potencia} kWp dimensionado` });
        return;
      }

      // Modo padrão: calcular a partir do consumo
      const consumo = parseFloat(consumoMensal);
      if (isNaN(consumo) || consumo <= 0) {
        toast({ title: "Consumo inválido", description: "Informe um consumo mensal válido", variant: "destructive" });
        return;
      }

      devLog.log('[dimensionamento] Calculando:', { tipoSistema, consumo, irradiacao, potencia, autonomia, fatorDesempenho });

      const resultadoCalculo = calcularDimensionamento({
        tipoSistema: tipoSistema as TipoSistema,
        consumoMensal: consumo,
        irradiacao,
        potenciaModulo: potencia,
        autonomiaHoras: autonomia,
        backupComFV,
        tipoLigacao: tipoLigacao as TipoLigacao,
        cargas: cargas.length > 0 ? cargas : undefined,
        fatorDesempenho,
      });

      setResultado(resultadoCalculo);
      toast({ title: "Dimensionamento calculado!", description: "Os resultados foram gerados com sucesso" });

    } catch (error) {
      devLog.error('[dimensionamento] Erro ao calcular:', error);
      toast({ title: "Erro ao calcular", description: "Ocorreu um erro ao calcular o dimensionamento", variant: "destructive" });
    }
  };

  // =====================================================
  // FUNÇÕES DE HISTÓRICO
  // =====================================================

  const salvarDimensionamento = async () => {
    if (!user?.id || !resultado) {
      toast({
        title: "Erro ao salvar",
        description: "Usuário não autenticado ou sem resultados para salvar",
        variant: "destructive",
      });
      return;
    }

    try {
      setSalvando(true);

      const tenantId = (user as any).tenant_id || user.id;

      await createDimensionamento(
        {
          tipo_sistema: tipoSistema as TipoSistema,
          tipo_consumidor: tipoConsumidor as TipoConsumidor,
          objetivo_bateria: objetivoBateria as ObjetivoBateria || undefined,
          backup_com_fv: backupComFV,
          tipo_ligacao: tipoLigacao as TipoLigacao || undefined,
          consumo_mensal: parseFloat(consumoMensal),
          estado,
          irradiacao,
          autonomia_desejada: parseFloat(autonomiaHoras) || undefined,
          potencia_modulo: parseFloat(potenciaModulo),
          fator_desempenho: fatorDesempenho,
          cargas: cargas.length > 0 ? cargas : undefined,
        },
        user.id,
        tenantId,
        resultado
      );

      toast({
        title: "Dimensionamento salvo!",
        description: "O dimensionamento foi salvo no histórico",
      });

      // Recarregar histórico se estiver aberto
      if (showHistorico) {
        carregarHistorico();
      }

    } catch (error) {
      devLog.error('[dimensionamento] Erro ao salvar:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar o dimensionamento",
        variant: "destructive",
      });
    } finally {
      setSalvando(false);
    }
  };

  const carregarHistorico = async () => {
    if (!user?.id) return;

    try {
      setCarregandoHistorico(true);
      const dados = await getDimensionamentos(user.id, { limit: 20 });
      setHistorico(dados);
    } catch (error) {
      devLog.error('[dimensionamento] Erro ao carregar histórico:', error);
      toast({
        title: "Erro ao carregar histórico",
        description: "Não foi possível carregar o histórico de dimensionamentos",
        variant: "destructive",
      });
    } finally {
      setCarregandoHistorico(false);
    }
  };

  const carregarDimensionamento = (dim: Dimensionamento) => {
    setTipoSistema(dim.tipo_sistema);
    setTipoConsumidor(dim.tipo_consumidor);
    setObjetivoBateria(dim.objetivo_bateria || '');
    setBackupComFV(dim.backup_com_fv || true);
    setTipoLigacao(dim.tipo_ligacao || '');
    setConsumoMensal(dim.consumo_mensal.toString());
    setEstado(dim.estado);
    setIrradiacao(dim.irradiacao);
    setAutonomiaHoras(dim.autonomia_desejada?.toString() || '24');
    setPotenciaModulo(dim.potencia_modulo?.toString() || '550');
    setFatorDesempenho(dim.fator_desempenho || 0.85);
    setCargas(dim.cargas || []);
    
    // Recriar resultado
    const resultadoRecriado = {
      sistema_fv: dim.sistema_fv,
      sistema_baterias: dim.sistema_baterias,
      sistema_inversor: dim.sistema_inversor,
      economia_mensal: dim.economia_mensal,
    };
    
    setResultado(resultadoRecriado);
    setShowHistorico(false);
    setStep(5); // Ir para a etapa de visualização de resultados
    
    toast({
      title: "Dimensionamento carregado!",
      description: "Os dados foram carregados com sucesso",
    });
  };

  // =====================================================
  // FUNÇÕES DE CARGAS
  // =====================================================

  const adicionarCarga = () => {
    const novaCarga: Carga = {
      nome: '',
      potencia: 0,
      quantidade: 1,
      horasDia: 1,
      consumoDiario: 0,
      prioritaria: false,
    };
    setCargas([...cargas, novaCarga]);
  };

  const adicionarCargaPreDefinida = (nome: string) => {
    if (nome === '__custom') {
      adicionarCarga();
      return;
    }
    const aparelho = APARELHOS_PRE_DEFINIDOS.find(a => a.nome === nome);
    if (!aparelho) return;
    const horasPadrao = 4;
    const novaCarga: Carga = {
      nome: aparelho.nome,
      potencia: aparelho.potencia,
      quantidade: 1,
      horasDia: horasPadrao,
      consumoDiario: (aparelho.potencia * 1 * horasPadrao) / 1000,
      prioritaria: true,
    };
    setCargas(prev => [...prev, novaCarga]);
  };

  const categoriasAparelhos = Array.from(new Set(APARELHOS_PRE_DEFINIDOS.map(a => a.categoria)));

  const removerCarga = (index: number) => {
    setCargas(cargas.filter((_, i) => i !== index));
  };

  const atualizarCarga = (index: number, campo: keyof Carga, valor: any) => {
    const novasCargas = [...cargas];
    novasCargas[index] = {
      ...novasCargas[index],
      [campo]: valor,
    };
    
    // Recalcular consumo diário
    if (campo === 'potencia' || campo === 'quantidade' || campo === 'horasDia') {
      novasCargas[index].consumoDiario = 
        (novasCargas[index].potencia * novasCargas[index].quantidade * novasCargas[index].horasDia) / 1000;
    }
    
    setCargas(novasCargas);
  };

  const consumoTotalCargas = cargas.reduce((total, carga) => total + carga.consumoDiario, 0);

  // =====================================================
  // RENDERIZAÇÃO
  // =====================================================

  // Se estiver mostrando histórico
  if (showHistorico) {
    return (
      <div className="space-y-6 pb-10">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 p-8 text-white shadow-lg">
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Histórico de Dimensionamentos</h1>
              <p className="mt-2 text-amber-100">
                Visualize e recupere dimensionamentos anteriores
              </p>
            </div>
            <Button
              onClick={() => setShowHistorico(false)}
              variant="secondary"
              className="bg-white text-amber-600 hover:bg-amber-50"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </div>
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-500/30"></div>
          <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-orange-500/30"></div>
        </div>

        {/* Lista de histórico */}
        {carregandoHistorico ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-muted-foreground">Carregando histórico...</p>
            </CardContent>
          </Card>
        ) : historico.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <History className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Nenhum dimensionamento salvo</p>
              <p className="text-sm text-muted-foreground">
                Seus dimensionamentos salvos aparecerão aqui
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {historico.map((dim) => (
              <Card key={dim.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => carregarDimensionamento(dim)}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {dim.tipo_sistema === 'on-grid' && <Zap className="h-5 w-5 text-amber-500" />}
                      {dim.tipo_sistema === 'hibrido' && <BatteryCharging className="h-5 w-5 text-blue-500" />}
                      {dim.tipo_sistema === 'off-grid' && <Battery className="h-5 w-5 text-green-500" />}
                      {LABELS_TIPO_SISTEMA[dim.tipo_sistema]}
                    </CardTitle>
                    <Badge variant={dim.tipo_consumidor === 'residencial' ? 'default' : 'secondary'}>
                      {LABELS_TIPO_CONSUMIDOR[dim.tipo_consumidor]}
                    </Badge>
                  </div>
                  <CardDescription>
                    {new Date(dim.created_at!).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Consumo:</span>
                      <span className="font-medium">{dim.consumo_mensal} kWh/mês</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Estado:</span>
                      <span className="font-medium">{getNomeEstado(dim.estado)}</span>
                    </div>
                    {dim.sistema_fv && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Potência FV:</span>
                        <span className="font-medium">{dim.sistema_fv.potencia} kWp</span>
                      </div>
                    )}
                    {dim.sistema_baterias && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Baterias:</span>
                        <span className="font-medium">{dim.sistema_baterias.capacidadeTotal} kWh</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Welcome Header with Gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 p-8 text-white shadow-lg">
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              Dimensionamento de Sistemas Fotovoltaicos
            </h1>
            <p className="mt-2 text-amber-100">
              On-Grid, Híbridos e Off-Grid - Dimensionamento completo e profissional
            </p>
          </div>
          <Button
            onClick={() => setShowHistorico(true)}
            variant="secondary"
            className="bg-white text-amber-600 hover:bg-amber-50"
          >
            <History className="mr-2 h-4 w-4" />
            Histórico
          </Button>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-500/30"></div>
        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-orange-500/30"></div>
      </div>

      {/* Progress Indicator */}
      <Card className="border-0 shadow-sm">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4, 5, 6].map((s) => {
              // Pular etapa 3 para on-grid e off-grid; pular etapa 6 para on-grid
              if (s === 3 && (tipoSistema === 'on-grid' || tipoSistema === 'off-grid')) return null;
              if (s === 6 && tipoSistema === 'on-grid') return null;
              
              const isActive = s === step;
              const isCompleted = s < step;
              
              return (
                <div key={s} className="flex items-center flex-1">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                    isActive ? 'border-amber-500 bg-amber-500 text-white' : 
                    isCompleted ? 'border-green-500 bg-green-500 text-white' :
                    'border-gray-300 text-gray-300'
                  }`}>
                    {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : s}
                  </div>
                  {s < 6 && (
                    <div className={`flex-1 h-0.5 mx-2 ${
                      isCompleted ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Formulário de Cálculo */}
        <Card className="border-0 shadow-md md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Etapa {step} de {tipoSistema === 'hibrido' ? 6 : 5}
            </CardTitle>
            <CardDescription>
              {step === 1 && 'Selecione o tipo de sistema'}
              {step === 2 && 'Qual o tipo de consumidor?'}
              {step === 3 && 'Objetivo do armazenamento'}
              {step === 4 && 'Tipo de ligação da rede'}
              {step === 5 && 'Dados do consumo e local'}
              {step === 6 && 'Cargas elétricas (opcional)'}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {/* ETAPA 1: Tipo de Sistema */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  {(['on-grid', 'hibrido', 'off-grid'] as TipoSistema[]).map((tipo) => (
                    <button
                      key={tipo}
                      onClick={() => setTipoSistema(tipo)}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        tipoSistema === tipo
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                          : 'border-gray-200 hover:border-amber-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {tipo === 'on-grid' && <Zap className="h-6 w-6 text-amber-500" />}
                        {tipo === 'hibrido' && <BatteryCharging className="h-6 w-6 text-blue-500" />}
                        {tipo === 'off-grid' && <Battery className="h-6 w-6 text-green-500" />}
                        <div className="flex-1">
                          <p className="font-medium">{LABELS_TIPO_SISTEMA[tipo]}</p>
                          <p className="text-sm text-muted-foreground">
                            {tipo === 'on-grid' && 'Geração de energia conectada à rede elétrica'}
                            {tipo === 'hibrido' && 'Sistema com baterias e conexão à rede'}
                            {tipo === 'off-grid' && 'Sistema isolado, apenas com baterias'}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <Button 
                  onClick={avancarEtapa} 
                  disabled={!podeAvancar()}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Próximo
                </Button>
              </div>
            )}

            {/* ETAPA 2: Tipo de Consumidor */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  {(['residencial', 'comercial'] as TipoConsumidor[]).map((tipo) => (
                    <button
                      key={tipo}
                      onClick={() => setTipoConsumidor(tipo)}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        tipoConsumidor === tipo
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                          : 'border-gray-200 hover:border-amber-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {tipo === 'residencial' ? (
                          <Home className="h-6 w-6 text-blue-500" />
                        ) : (
                          <Building2 className="h-6 w-6 text-purple-500" />
                        )}
                        <div className="flex-1">
                          <p className="font-medium">{LABELS_TIPO_CONSUMIDOR[tipo]}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={voltarEtapa} 
                    variant="outline"
                    className="flex-1"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar
                  </Button>
                  <Button 
                    onClick={avancarEtapa} 
                    disabled={!podeAvancar()}
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    Próximo
                  </Button>
                </div>
              </div>
            )}

            {/* ETAPA 3: Objetivo da Bateria (apenas híbrido) */}
            {step === 3 && tipoSistema === 'hibrido' && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setObjetivoBateria('backup');
                      setBackupComFV(true);
                    }}
                    className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                      objetivoBateria === 'backup' && backupComFV
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                        : 'border-gray-200 hover:border-amber-300'
                    }`}
                  >
                    <p className="font-medium">Backup com Sistema Fotovoltaico</p>
                    <p className="text-sm text-muted-foreground">
                      Energia de reserva com geração solar
                    </p>
                  </button>
                  
                  <button
                    onClick={() => {
                      setObjetivoBateria('backup');
                      setBackupComFV(false);
                    }}
                    className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                      objetivoBateria === 'backup' && !backupComFV
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                        : 'border-gray-200 hover:border-amber-300'
                    }`}
                  >
                    <p className="font-medium">Backup sem Sistema Fotovoltaico</p>
                    <p className="text-sm text-muted-foreground">
                      Apenas baterias para backup
                    </p>
                  </button>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={voltarEtapa} 
                    variant="outline"
                    className="flex-1"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar
                  </Button>
                  <Button 
                    onClick={avancarEtapa} 
                    disabled={!podeAvancar()}
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    Próximo
                  </Button>
                </div>
              </div>
            )}

            {/* ETAPA 4: Tipo de Ligação */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  {(['monofasica-127', 'monofasica-220', 'bifasica-127', 'bifasica', 'trifasica-127', 'trifasica'] as TipoLigacao[]).map((tipo) => (
                    <button
                      key={tipo}
                      onClick={() => setTipoLigacao(tipo)}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        tipoLigacao === tipo
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                          : 'border-gray-200 hover:border-amber-300'
                      }`}
                    >
                      <p className="font-medium">{LABELS_TIPO_LIGACAO[tipo]}</p>
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={voltarEtapa} 
                    variant="outline"
                    className="flex-1"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar
                  </Button>
                  <Button 
                    onClick={avancarEtapa} 
                    disabled={!podeAvancar()}
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    Próximo
                  </Button>
                </div>
              </div>
            )}

            {/* ETAPA 5: Dados para Cálculo */}
            {step === 5 && (
              <div className="space-y-4">

                {/* Toggle: modo de cálculo */}
                <div>
                  <Label className="mb-2 block">Modo de Cálculo</Label>
                  <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                    <button
                      onClick={() => setModoCalculo('consumo')}
                      className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                        modoCalculo === 'consumo'
                          ? 'bg-amber-500 text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      Por Consumo (kWh/mês)
                    </button>
                    <button
                      onClick={() => setModoCalculo('potencia')}
                      className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                        modoCalculo === 'potencia'
                          ? 'bg-amber-500 text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      Por Potência (kWp)
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {modoCalculo === 'consumo'
                      ? 'Informe o consumo e o sistema calcula o kWp necessário'
                      : 'Informe o kWp desejado e veja quantas placas e qual geração'}
                  </p>
                </div>

                {/* Campo principal conforme modo */}
                {modoCalculo === 'consumo' ? (
                  <div className="space-y-2">
                    <Label htmlFor="consumo">Consumo Mensal (kWh) *</Label>
                    <Input
                      id="consumo"
                      type="number"
                      value={consumoMensal}
                      onChange={(e) => setConsumoMensal(e.target.value)}
                      placeholder="Ex: 500"
                      className="focus-visible:ring-amber-500"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="kwp">Potência do Sistema (kWp) *</Label>
                    <Input
                      id="kwp"
                      type="number"
                      step="0.05"
                      value={potenciaDesejadaKwp}
                      onChange={(e) => setPotenciaDesejadaKwp(e.target.value)}
                      placeholder="Ex: 3.85"
                      className="focus-visible:ring-amber-500"
                    />
                    <p className="text-xs text-muted-foreground">
                      O sistema calculará módulos necessários e geração estimada
                    </p>
                  </div>
                )}

                {/* Estado */}
                <div className="space-y-2">
                  <Label htmlFor="estado">Estado *</Label>
                  <Select value={estado} onValueChange={setEstado}>
                    <SelectTrigger id="estado" className="focus-visible:ring-amber-500">
                      <SelectValue placeholder="Selecione o estado" />
                    </SelectTrigger>
                    <SelectContent position="item-aligned" align="start" side="bottom" className="max-h-[300px] overflow-y-auto">
                      {['Norte','Nordeste','Centro-Oeste','Sudeste','Sul'].map(regiao => (
                        <React.Fragment key={regiao}>
                          <div className="px-2 pt-1 pb-0.5 text-xs font-medium text-gray-500 bg-gray-50">
                            Região {regiao}
                          </div>
                          {estadosIrradiacao.filter(e => e.regiao === regiao).map(est => (
                            <SelectItem key={est.uf} value={est.uf}>{est.nome}</SelectItem>
                          ))}
                        </React.Fragment>
                      ))}
                    </SelectContent>
                  </Select>
                  {estado && (
                    <p className="text-xs text-amber-600 font-medium">
                      Irradiação: {irradiacao} HSP
                    </p>
                  )}
                </div>

                {/* Cargas Elétricas — híbrido/off-grid, antes da autonomia */}
                {modoCalculo === 'consumo' && (tipoSistema === 'hibrido' || tipoSistema === 'off-grid') && (
                  <div className="space-y-3 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-800">
                    <div>
                      <Label className="text-sm font-medium">Levantamento de Cargas</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {tipoSistema === 'hibrido'
                          ? 'Cargas marcadas como prioritárias dimensionam as baterias'
                          : 'Todas as cargas são consideradas no dimensionamento — não há rede elétrica de apoio'}
                      </p>
                    </div>

                    <Select value={seletorCarga} onValueChange={(val) => { adicionarCargaPreDefinida(val); setSeletorCarga(''); }}>
                      <SelectTrigger className="focus-visible:ring-amber-500 bg-white dark:bg-gray-900">
                        <SelectValue placeholder="Adicionar aparelho..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-[250px] overflow-y-auto">
                        {categoriasAparelhos.map(cat => (
                          <React.Fragment key={cat}>
                            <div className="px-2 pt-1 pb-0.5 text-xs font-medium text-gray-500 bg-gray-50 dark:bg-gray-800">
                              {cat}
                            </div>
                            {APARELHOS_PRE_DEFINIDOS.filter(a => a.categoria === cat).map(a => (
                              <SelectItem key={a.nome} value={a.nome}>
                                {a.nome} — {a.potencia}W
                              </SelectItem>
                            ))}
                          </React.Fragment>
                        ))}
                      </SelectContent>
                    </Select>

                    {cargas.length === 0 && (
                      <p className="text-xs text-center text-muted-foreground py-1">Nenhum aparelho adicionado ainda</p>
                    )}

                    {cargas.length > 0 && (
                      <div className="space-y-2 max-h-[240px] overflow-y-auto pr-0.5">
                        {cargas.map((carga, index) => (
                          <div key={index} className="p-2.5 bg-white dark:bg-gray-900 border rounded-lg space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium truncate flex-1">{carga.nome}</span>
                              {tipoSistema === 'hibrido' && (
                                <label className="flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-400 cursor-pointer whitespace-nowrap">
                                  <input
                                    type="checkbox"
                                    checked={carga.prioritaria ?? false}
                                    onChange={(e) => atualizarCarga(index, 'prioritaria', e.target.checked)}
                                    className="accent-blue-500 cursor-pointer"
                                  />
                                  Prioritária
                                </label>
                              )}
                              <button onClick={() => removerCarga(index)} className="text-gray-400 hover:text-red-500 transition-colors ml-1">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <div className="grid grid-cols-3 gap-1.5">
                              <div>
                                <p className="text-[10px] text-muted-foreground mb-0.5">Potência (W)</p>
                                <Input type="number" value={carga.potencia || ''} onChange={(e) => atualizarCarga(index, 'potencia', parseFloat(e.target.value) || 0)} className="h-7 text-xs" />
                              </div>
                              <div>
                                <p className="text-[10px] text-muted-foreground mb-0.5">Qtd</p>
                                <Input type="number" value={carga.quantidade || ''} onChange={(e) => atualizarCarga(index, 'quantidade', parseInt(e.target.value) || 1)} className="h-7 text-xs" />
                              </div>
                              <div>
                                <p className="text-[10px] text-muted-foreground mb-0.5">h/dia</p>
                                <Input type="number" value={carga.horasDia || ''} onChange={(e) => atualizarCarga(index, 'horasDia', parseFloat(e.target.value) || 0)} className="h-7 text-xs" />
                              </div>
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                              {carga.consumoDiario.toFixed(2)} kWh/dia
                              {tipoSistema === 'hibrido' && carga.prioritaria && <span className="ml-1.5 text-blue-600 dark:text-blue-400 font-medium">★ prioritária</span>}
                            </p>
                          </div>
                        ))}
                        <p className="text-xs font-medium text-right text-muted-foreground">
                          Total: <span className="text-foreground">{consumoTotalCargas.toFixed(2)} kWh/dia</span>
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Autonomia — apenas para híbrido/off-grid no modo consumo */}
                {modoCalculo === 'consumo' && (tipoSistema === 'hibrido' || tipoSistema === 'off-grid') && (
                  <div className="space-y-2">
                    <Label htmlFor="autonomia">Autonomia Desejada (horas) *</Label>
                    <Input
                      id="autonomia"
                      type="number"
                      value={autonomiaHoras}
                      onChange={(e) => setAutonomiaHoras(e.target.value)}
                      placeholder="Ex: 48"
                      className="focus-visible:ring-amber-500"
                    />
                    {tipoSistema === 'off-grid' ? (
                      <div className="text-xs space-y-1 p-2.5 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                        <p className="font-medium text-gray-700 dark:text-gray-300">Referência de autonomia para off-grid:</p>
                        <p className="text-muted-foreground">• <span className="font-medium">24h (1 dia)</span> — Lazer, chácara ou uso esporádico</p>
                        <p className="text-muted-foreground">• <span className="font-medium text-amber-600">48h (2 dias)</span> — Residencial padrão (recomendado)</p>
                        <p className="text-muted-foreground">• <span className="font-medium">72h (3 dias)</span> — Residencial em região com baixa irradiação</p>
                        <p className="text-muted-foreground">• <span className="font-medium">96–120h (4–5 dias)</span> — Sistemas críticos (saúde, segurança, telecom)</p>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Tempo que as cargas prioritárias devem funcionar sem rede elétrica.
                      </p>
                    )}
                  </div>
                )}

                {/* Potência do módulo */}
                <div className="space-y-2">
                  <Label htmlFor="potenciaModulo">Potência do Módulo (W)</Label>
                  <Input
                    id="potenciaModulo"
                    type="number"
                    value={potenciaModulo}
                    onChange={(e) => setPotenciaModulo(e.target.value)}
                    placeholder="Ex: 550"
                    className="focus-visible:ring-amber-500"
                  />
                </div>

                {/* Fator de Desempenho (PR) — slider */}
                <div className="space-y-2 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-100 dark:border-amber-800">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Fator de Desempenho (PR)</Label>
                    <span className="text-base font-bold text-amber-600">
                      {Math.round(fatorDesempenho * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={60}
                    max={100}
                    step={1}
                    value={Math.round(fatorDesempenho * 100)}
                    onChange={(e) => setFatorDesempenho(Number(e.target.value) / 100)}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-amber-500 bg-amber-200"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>60% (perdas altas)</span>
                    <span className="font-medium text-amber-600">80% padrão</span>
                    <span>100% ideal</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Valor padrão de 80% considera um sistema real com perdas típicas de temperatura, cabeamento e eficiência do inversor. Ajuste para cima apenas em instalações sem sombreamento, módulos limpos e condições ideais.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button onClick={voltarEtapa} variant="outline" className="flex-1">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar
                  </Button>
                  <Button
                    onClick={() => { if (podeAvancar()) { calcular(); if (tipoSistema !== 'on-grid') setStep(6); } }}
                    disabled={!podeAvancar()}
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    Calcular
                  </Button>
                </div>
              </div>
            )}

            {/* ETAPA 6: Resultado calculado */}
            {step === 6 && (
              <div className="space-y-4">
                <div className="p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800 text-center">
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">Dimensionamento concluído</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Veja o resultado completo ao lado</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={voltarEtapa}
                    variant="outline"
                    className="flex-1"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar
                  </Button>
                  <Button
                    onClick={resetarFormulario}
                    variant="outline"
                    className="flex-1"
                  >
                    Novo Cálculo
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resultados */}
        <Card className="border-0 shadow-md md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-500" />
                  Resultado do Dimensionamento
                </CardTitle>
                <CardDescription>
                  {resultado 
                    ? "Detalhes do sistema dimensionado" 
                    : "Complete as etapas para ver os resultados"}
                </CardDescription>
              </div>
              {resultado && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={salvarDimensionamento}
                    disabled={salvando}
                  >
                    {salvando ? 'Salvando...' : 'Salvar'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        const sucesso = await gerarEBaixarPDF(
                          {
                            ...resultado,
                            tipo_sistema: tipoSistema as TipoSistema,
                            tipo_consumidor: tipoConsumidor as TipoConsumidor,
                            consumo_mensal: parseFloat(consumoMensal) || 0,
                            estado,
                            irradiacao,
                            autonomia_desejada: parseFloat(autonomiaHoras) || undefined,
                            potencia_modulo: parseFloat(potenciaModulo),
                            fator_desempenho: fatorDesempenho,
                            cargas: cargas.length > 0 ? cargas : undefined,
                          },
                          getNomeEstado(estado),
                          (user as any)?.company_name || 'SGF - Sistema de Gerenciamento Fotovoltaico',
                          fatorDesempenho
                        );
                        
                        if (sucesso) {
                          toast({
                            title: "PDF gerado!",
                            description: "O arquivo foi baixado com sucesso",
                          });
                        } else {
                          throw new Error('Falha ao gerar PDF');
                        }
                      } catch (error) {
                        toast({
                          title: "Erro ao gerar PDF",
                          description: "Não foi possível exportar o relatório",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    <FileDown className="mr-2 h-4 w-4" />
                    PDF
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          
          <CardContent>
            {resultado ? (
              <div className="space-y-6">
                {/* Resumo do Sistema */}
                <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-100">
                  <h3 className="font-medium text-amber-800 dark:text-amber-300 mb-3">
                    📊 Resumo do Sistema
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Tipo:</p>
                      <p className="font-medium">{tipoSistema && LABELS_TIPO_SISTEMA[tipoSistema]}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Consumidor:</p>
                      <p className="font-medium">{tipoConsumidor && LABELS_TIPO_CONSUMIDOR[tipoConsumidor]}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Consumo:</p>
                      <p className="font-medium">{consumoMensal} kWh/mês</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Local:</p>
                      <p className="font-medium">{estado && getNomeEstado(estado)}</p>
                    </div>
                  </div>
                </div>

                {/* Sistema Fotovoltaico */}
                {resultado.sistema_fv && (
                  <div>
                    <h3 className="font-medium text-lg mb-3 flex items-center gap-2">
                      <Zap className="h-5 w-5 text-amber-500" />
                      Sistema Fotovoltaico
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-3 border rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Potência</p>
                        <p className="text-2xl font-bold">{resultado.sistema_fv.potencia} <span className="text-sm font-normal">kWp</span></p>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Módulos</p>
                        <p className="text-2xl font-bold">{resultado.sistema_fv.modulos} <span className="text-sm font-normal">un</span></p>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Área</p>
                        <p className="text-2xl font-bold">{resultado.sistema_fv.area} <span className="text-sm font-normal">m²</span></p>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Geração Diária</p>
                        <p className="text-2xl font-bold">{resultado.sistema_fv.geracaoDiaria.toFixed(1)} <span className="text-sm font-normal">kWh/dia</span></p>
                      </div>
                      {resultado.sistema_fv.geracaoMensal && (
                        <div className="col-span-2 md:col-span-4 grid grid-cols-2 gap-4">
                          <div className="p-3 border border-green-200 rounded-lg bg-green-50 dark:bg-green-900/10">
                            <p className="text-sm text-muted-foreground mb-1">Geração Mensal Estimada</p>
                            <p className="text-2xl font-bold text-green-700 dark:text-green-400">{resultado.sistema_fv.geracaoMensal.toFixed(0)} <span className="text-sm font-normal">kWh/mês</span></p>
                          </div>
                          <div className="p-3 border border-green-200 rounded-lg bg-green-50 dark:bg-green-900/10">
                            <p className="text-sm text-muted-foreground mb-1">Geração Anual Estimada</p>
                            <p className="text-2xl font-bold text-green-700 dark:text-green-400">{(resultado.sistema_fv.geracaoMensal * 12).toFixed(0)} <span className="text-sm font-normal">kWh/ano</span></p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Sistema de Baterias */}
                {resultado.sistema_baterias && (
                  <div>
                    <h3 className="font-medium text-lg mb-3 flex items-center gap-2">
                      <Battery className="h-5 w-5 text-blue-500" />
                      Sistema de Baterias
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="p-3 border rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Capacidade Útil</p>
                        <p className="text-2xl font-bold">{resultado.sistema_baterias.capacidadeUtil} <span className="text-sm font-normal">kWh</span></p>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Capacidade Total</p>
                        <p className="text-2xl font-bold">{resultado.sistema_baterias.capacidadeTotal} <span className="text-sm font-normal">kWh</span></p>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Quantidade de Baterias</p>
                        <p className="text-2xl font-bold">{resultado.sistema_baterias.modulos} <span className="text-sm font-normal">un</span></p>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Tensão</p>
                        <p className="text-2xl font-bold">{resultado.sistema_baterias.tensao} <span className="text-sm font-normal">V</span></p>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Corrente Máx.</p>
                        <p className="text-2xl font-bold">{resultado.sistema_baterias.correnteMaxima} <span className="text-sm font-normal">A</span></p>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Autonomia Real</p>
                        <p className="text-2xl font-bold">{resultado.sistema_baterias.autonomiaReal.toFixed(1)} <span className="text-sm font-normal">h</span></p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sistema Inversor */}
                {resultado.sistema_inversor && (
                  <div>
                    <h3 className="font-medium text-lg mb-3 flex items-center gap-2">
                      <BatteryCharging className="h-5 w-5 text-green-500" />
                      Inversor
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="p-3 border rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Potência Mínima</p>
                        <p className="text-2xl font-bold">≥{resultado.sistema_inversor.potenciaMinima} <span className="text-sm font-normal">kW</span></p>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Tipo</p>
                        <p className="text-lg font-medium">{resultado.sistema_inversor.tipo}</p>
                      </div>
                      {resultado.sistema_inversor.entradaFV && (
                        <div className="p-3 border rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Entrada FV</p>
                          <p className="text-2xl font-bold">{resultado.sistema_inversor.entradaFV} <span className="text-sm font-normal">kWp</span></p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tabela de cargas consideradas no dimensionamento das baterias */}
                {resultado.sistema_baterias && cargas.length > 0 && (() => {
                  const cargasExibidas = tipoSistema === 'hibrido'
                    ? cargas.filter(c => c.prioritaria)
                    : cargas;
                  if (cargasExibidas.length === 0) return null;
                  const totalDiario = cargasExibidas.reduce((t, c) => t + c.consumoDiario, 0);
                  const autonomiaReal = resultado.sistema_baterias.autonomiaReal;
                  return (
                    <div>
                      <h3 className="font-medium text-lg mb-1 flex items-center gap-2">
                        <Battery className="h-5 w-5 text-blue-500" />
                        {tipoSistema === 'hibrido' ? 'Cargas Prioritárias — Base do Dimensionamento das Baterias' : 'Cargas Consideradas — Base do Dimensionamento das Baterias'}
                      </h3>
                      <p className="text-xs text-muted-foreground mb-3">
                        {tipoSistema === 'hibrido'
                          ? 'As baterias foram dimensionadas para suportar apenas as cargas marcadas como prioritárias durante a autonomia desejada.'
                          : 'Em sistemas off-grid, todas as cargas são consideradas no dimensionamento das baterias, pois não há rede elétrica de apoio.'}
                      </p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800">
                              <th className="text-left p-2.5 border-b font-medium text-muted-foreground">Aparelho</th>
                              <th className="text-center p-2.5 border-b font-medium text-muted-foreground">Potência (W)</th>
                              <th className="text-center p-2.5 border-b font-medium text-muted-foreground">Qtd</th>
                              <th className="text-center p-2.5 border-b font-medium text-muted-foreground">h/dia</th>
                              <th className="text-right p-2.5 border-b font-medium text-muted-foreground">Consumo (kWh/dia)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cargasExibidas.map((c, i) => (
                              <tr key={i} className="border-b last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                <td className="p-2.5 font-medium">{c.nome}</td>
                                <td className="p-2.5 text-center text-muted-foreground">{c.potencia}</td>
                                <td className="p-2.5 text-center text-muted-foreground">{c.quantidade}</td>
                                <td className="p-2.5 text-center text-muted-foreground">{c.horasDia}</td>
                                <td className="p-2.5 text-right font-medium">{c.consumoDiario.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-blue-50 dark:bg-blue-900/10">
                              <td colSpan={4} className="p-2.5 font-medium text-blue-700 dark:text-blue-400">Total</td>
                              <td className="p-2.5 text-right font-bold text-blue-700 dark:text-blue-400">{totalDiario.toFixed(2)} kWh/dia</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                          Com a capacidade instalada de {resultado.sistema_baterias.capacidadeUtil} kWh úteis, o sistema suporta estas cargas por aproximadamente <span className="font-bold">{autonomiaReal.toFixed(1)} horas</span>.
                        </p>
                      </div>
                    </div>
                  );
                })()}

              </div>
            ) : (
              <div className="flex items-center justify-center h-[400px] text-center">
                <div className="max-w-md">
                  <Alert className="h-16 w-16 text-amber-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhum resultado ainda</h3>
                  <p className="text-sm text-muted-foreground">
                    Complete as etapas do formulário e clique em "Calcular" para ver os resultados do dimensionamento
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 