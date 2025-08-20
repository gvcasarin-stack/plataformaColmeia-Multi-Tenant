"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import Check from "@/components/icons/check"
import Clock from "@/components/icons/clock"
import Alert from "@/components/icons/alert"
import Refresh from "@/components/icons/refresh"
import { useAuth } from '@/lib/hooks/useAuth'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
  const [consumo, setConsumo] = useState("")
  const [estado, setEstado] = useState<string>("") // Estado selecionado
  const [eficiencia, setEficiencia] = useState<number>(4.2) // Valor padrão médio para o Brasil
  const [potenciaModulo, setPotenciaModulo] = useState("550") // 550W por módulo (padrão)
  const [searchTerm, setSearchTerm] = useState("")
  const [resultado, setResultado] = useState<{
    potencia: number;
    modulos: number;
    area: number;
    economia: number;
  } | null>(null)

  // Atualiza a eficiência quando o estado muda
  useEffect(() => {
    if (estado) {
      const estadoSelecionado = estadosIrradiacao.find(e => e.uf === estado);
      if (estadoSelecionado) {
        setEficiencia(estadoSelecionado.irradiacao);
      }
    }
  }, [estado]);

  const calcular = () => {
    const consumoMensal = parseFloat(consumo)
    const potenciaModuloValue = parseFloat(potenciaModulo) / 1000 // converter para kW
    
    if (!consumoMensal || !eficiencia || !potenciaModuloValue) return

    const consumoDiario = consumoMensal / 30
    const producaoDiaria = eficiencia // média de horas de sol pico
    const potenciaNecessaria = consumoDiario / producaoDiaria
    const numeroModulos = Math.ceil(potenciaNecessaria / potenciaModuloValue)
    const areaTotal = numeroModulos * 2.2 // 2.2m² por módulo
    const economiaEstimada = consumoMensal * 0.85 // estimativa de economia de 85% na conta

    setResultado({
      potencia: potenciaNecessaria,
      modulos: numeroModulos,
      area: areaTotal,
      economia: economiaEstimada
    })
  }

  // Obter o nome do estado a partir da UF
  const getNomeEstado = (uf: string) => {
    const estadoSelecionado = estadosIrradiacao.find(e => e.uf === uf);
    return estadoSelecionado ? estadoSelecionado.nome : "";
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Welcome Header with Gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 p-8 text-white shadow-lg">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold">
            Dimensionamento
          </h1>
          <p className="mt-2 text-amber-100">
            Dimensione sistemas fotovoltaicos de forma rápida e precisa
          </p>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-500/30"></div>
        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-orange-500/30"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Formulário de Cálculo */}
        <Card className="border-0 shadow-md md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-5 h-5 text-amber-500">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="3" width="16" height="18" rx="2" ry="2"></rect>
                  <line x1="8" y1="7" x2="10" y2="7"></line>
                  <line x1="14" y1="7" x2="16" y2="7"></line>
                  <line x1="8" y1="11" x2="10" y2="11"></line>
                  <line x1="14" y1="11" x2="16" y2="11"></line>
                  <line x1="8" y1="15" x2="10" y2="15"></line>
                  <line x1="14" y1="15" x2="16" y2="15"></line>
                </svg>
              </div>
              Calculadora Solar
            </CardTitle>
            <CardDescription>
              Informe os dados para dimensionar seu sistema
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="consumo">Consumo Mensal (kWh)</Label>
                <Input
                  id="consumo"
                  type="number"
                  value={consumo}
                  onChange={(e) => setConsumo(e.target.value)}
                  placeholder="Ex: 500"
                  className="focus-visible:ring-amber-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estado">Estado</Label>
                <Select 
                  value={estado} 
                  onValueChange={setEstado}
                >
                  <SelectTrigger id="estado" className="focus-visible:ring-amber-500">
                    <SelectValue placeholder="Selecione o estado" />
                  </SelectTrigger>
                  <SelectContent position="item-aligned" align="start" side="bottom" className="max-h-[300px] overflow-y-auto">
                    {searchTerm !== "" && (
                      <div className="px-2 py-2 border-b border-gray-100">
                        <div className="flex items-center px-2 pb-1 text-sm text-gray-500">
                          <Refresh className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                          <Input
                            placeholder="Buscar estado..."
                            className="h-8 border-0 p-0 focus-visible:ring-0 text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                    
                    {/* Norte */}
                    <div className="px-2 pt-1 pb-0.5 text-xs font-medium text-gray-500 bg-gray-50">
                      Região Norte
                    </div>
                    {estadosIrradiacao
                      .filter(e => e.regiao === 'Norte')
                      .filter(e => searchTerm === "" || e.nome.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map(estado => (
                        <SelectItem key={estado.uf} value={estado.uf}>
                          {estado.nome}
                        </SelectItem>
                      ))
                    }
                    
                    {/* Nordeste */}
                    <div className="px-2 pt-1 pb-0.5 text-xs font-medium text-gray-500 bg-gray-50">
                      Região Nordeste
                    </div>
                    {estadosIrradiacao
                      .filter(e => e.regiao === 'Nordeste')
                      .filter(e => searchTerm === "" || e.nome.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map(estado => (
                        <SelectItem key={estado.uf} value={estado.uf}>
                          {estado.nome}
                        </SelectItem>
                      ))
                    }
                    
                    {/* Centro-Oeste */}
                    <div className="px-2 pt-1 pb-0.5 text-xs font-medium text-gray-500 bg-gray-50">
                      Região Centro-Oeste
                    </div>
                    {estadosIrradiacao
                      .filter(e => e.regiao === 'Centro-Oeste')
                      .filter(e => searchTerm === "" || e.nome.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map(estado => (
                        <SelectItem key={estado.uf} value={estado.uf}>
                          {estado.nome}
                        </SelectItem>
                      ))
                    }
                    
                    {/* Sudeste */}
                    <div className="px-2 pt-1 pb-0.5 text-xs font-medium text-gray-500 bg-gray-50">
                      Região Sudeste
                    </div>
                    {estadosIrradiacao
                      .filter(e => e.regiao === 'Sudeste')
                      .filter(e => searchTerm === "" || e.nome.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map(estado => (
                        <SelectItem key={estado.uf} value={estado.uf}>
                          {estado.nome}
                        </SelectItem>
                      ))
                    }
                    
                    {/* Sul */}
                    <div className="px-2 pt-1 pb-0.5 text-xs font-medium text-gray-500 bg-gray-50">
                      Região Sul
                    </div>
                    {estadosIrradiacao
                      .filter(e => e.regiao === 'Sul')
                      .filter(e => searchTerm === "" || e.nome.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map(estado => (
                        <SelectItem key={estado.uf} value={estado.uf}>
                          {estado.nome}
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    A irradiação solar será calculada automaticamente
                  </p>
                  {estado && (
                    <p className="text-xs text-amber-600 font-medium">
                      {estadosIrradiacao.find(e => e.uf === estado)?.irradiacao || 4.2} HSP
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="potencia">Potência do Módulo (W)</Label>
                <Input
                  id="potencia"
                  type="number"
                  value={potenciaModulo}
                  onChange={(e) => setPotenciaModulo(e.target.value)}
                  placeholder="Ex: 550"
                  className="focus-visible:ring-amber-500"
                />
              </div>

              <Button 
                onClick={calcular} 
                className="w-full bg-amber-600 hover:bg-amber-700 text-white"
              >
                <Check className="mr-2 h-4 w-4" />
                Calcular Sistema
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Resultados */}
        <Card className="border-0 shadow-md md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-5 h-5 text-amber-500">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
              </div>
              Resultado do Dimensionamento
            </CardTitle>
            <CardDescription>
              {resultado 
                ? "Detalhes do sistema fotovoltaico recomendado" 
                : "Preencha os dados ao lado e clique em 'Calcular Sistema'"}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {resultado ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Potência do Sistema</Label>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
                        <Check className="h-5 w-5 text-amber-600" />
                      </div>
                      <p className="text-3xl font-bold">{resultado.potencia.toFixed(2)} <span className="text-lg font-normal text-muted-foreground">kWp</span></p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Número de Módulos</Label>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                        <Clock className="h-5 w-5 text-blue-600" />
                      </div>
                      <p className="text-3xl font-bold">{resultado.modulos} <span className="text-lg font-normal text-muted-foreground">módulos</span></p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Área Necessária</Label>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                        <Check className="h-5 w-5 text-green-600" />
                      </div>
                      <p className="text-3xl font-bold">{resultado.area.toFixed(2)} <span className="text-lg font-normal text-muted-foreground">m²</span></p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Economia Estimada</Label>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                        <Alert className="h-5 w-5 text-purple-600" />
                      </div>
                      <p className="text-3xl font-bold">{resultado.economia.toFixed(0)} <span className="text-lg font-normal text-muted-foreground">kWh/mês</span></p>
                    </div>
                  </div>
                </div>
                
                <div className="col-span-1 md:col-span-2 bg-amber-50 dark:bg-amber-900/10 p-4 rounded-lg border border-amber-100 dark:border-amber-800/20">
                  <h3 className="font-medium text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-2">
                    <Check className="h-4 w-4" /> Informações Adicionais
                  </h3>
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    Este sistema solar foi dimensionado para atender um consumo mensal de {consumo} kWh 
                    {estado ? `, considerando a localização em ${getNomeEstado(estado)} com média de ${eficiencia} horas de sol pico por dia` : ''}
                    {potenciaModulo ? ` e módulos de ${potenciaModulo}W.` : '.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-center">
                <div className="max-w-md">
                  <Alert className="h-16 w-16 text-amber-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Sem cálculos ainda</h3>
                  <p className="text-sm text-muted-foreground">
                    Preencha o formulário e clique em calcular para ver os resultados
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