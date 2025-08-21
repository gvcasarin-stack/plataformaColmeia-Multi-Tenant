'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  DollarSign, 
  ArrowUpDown, 
  Calculator,
  PlusCircle,
  Trash2,
  Edit,
  BarChart3,
  LineChart
} from 'lucide-react';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import AddTransactionModal from './AddTransactionModal';
import AddFixedCostModal from './AddFixedCostModal';

// ✅ CORREÇÃO REACT #130: Definir aliases para ícones que não existem
const Icons = {
  DollarSign,
  TrendingUp: ArrowUpDown,
  TrendingDown: ArrowUpDown,
  Calculator,
  Plus: PlusCircle,
  Trash2,
  Edit,
  BarChart3,
  LineChart
};

interface FinancialData {
  metrics: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    fixedCosts: number;
    projectRevenue: number;
    projectEstimatedRevenue: number;
    transactionRevenue: number;
    variableExpenses: number;
  };
  projects: any[];
  transactions: any[];
  fixedCosts: any[];
  transactionsByCategory: Record<string, any>;
  fixedCostsByCategory: Record<string, any>;
  period: {
    month: number;
    year: number;
  };
}

type AnalysisType = 'numerical' | 'graphical';

export default function FinancialHistoryPanel() {
  const { toast } = useToast();
  
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analysisType, setAnalysisType] = useState<AnalysisType>('numerical');
  
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  
  // Estado para armazenar dados do gráfico
  const [chartData, setChartData] = useState<any[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);
  
  // Estados para edição
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [editingFixedCost, setEditingFixedCost] = useState<any>(null);

  const months = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' }
  ];

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/financial/dashboard?month=${selectedMonth}&year=${selectedYear}`);
      
      if (!response.ok) {
        throw new Error('Erro ao buscar dados financeiros');
      }
      
      const data = await response.json();
      setFinancialData(data);
      
    } catch (error) {
      console.error('Erro ao carregar dados financeiros:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados financeiros.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancialData();
  }, [selectedMonth, selectedYear]);

  const formatCurrency = (value: any) => {
    const numValue = typeof value === 'number' ? value : parseFloat(String(value)) || 0;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numValue);
  };

  const safeNumber = (value: any): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return isNaN(value) ? 0 : value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    if (typeof value === 'object' && value !== null) {
      // ✅ CORREÇÃO REACT #130: Se for objeto, retornar 0 para evitar renderização inválida
      return 0;
    }
    return 0;
  };

  const safeString = (value: any): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'boolean') return value.toString();
    if (typeof value === 'object' && value !== null) {
      // ✅ CORREÇÃO REACT #130: Para objetos, retornar string vazia ao invés de [object Object]
      if (value.toString && typeof value.toString === 'function') {
        try {
          const result = value.toString();
          if (result === '[object Object]') {
            return '';
          }
          return result;
        } catch {
          return '';
        }
      }
      return '';
    }
    return String(value);
  };

  const safeUserName = (user: any): string => {
    if (!user) return '';
    if (typeof user === 'string') return user;
    if (typeof user === 'object') {
      return safeString(user.full_name || user.name || user.email || '');
    }
    return safeString(user);
  };

  const isSafeForRendering = (value: any): boolean => {
    return (
      value === null ||
      value === undefined ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    );
  };

  const getMonthName = (month: number) => {
    return months.find(m => m.value === month)?.label || '';
  };

  // Função para gerar dados REAIS de lucro líquido mensal
  const generateRealProfitData = async () => {
    const data = [];
    
    // Buscar dados dos últimos 12 meses
    for (let i = 0; i < 12; i++) {
      const monthDate = new Date(selectedYear, selectedMonth - 1 - i, 1);
      const month = monthDate.getMonth() + 1;
      const year = monthDate.getFullYear();
      const monthName = getMonthName(month);
      
      try {
        // Buscar dados financeiros reais para este mês
        const response = await fetch(`/api/financial/dashboard?month=${month}&year=${year}`);
        
        if (response.ok) {
          const monthData = await response.json();
          const monthMetrics = monthData.metrics || {};
          
          // Calcular lucro líquido real: receitas - despesas - custos fixos
          const revenue = safeNumber(monthMetrics.totalRevenue);
          const expenses = safeNumber(monthMetrics.totalExpenses);
          const netProfit = revenue - expenses;
          
          // Só adicionar se houver dados (receitas ou despesas)
          if (revenue > 0 || expenses > 0) {
            data.unshift({
              month: `${monthName}/${year}`,
              lucroLiquido: Math.round(netProfit),
              isCurrentMonth: month === selectedMonth && year === selectedYear,
              revenue: revenue,
              expenses: expenses
            });
          }
        }
      } catch (error) {
        console.error(`Erro ao buscar dados para ${monthName}/${year}:`, error);
      }
    }
    
    return data;
  };

  // Carregar dados do gráfico quando análise gráfica estiver ativa
  useEffect(() => {
    if (analysisType === 'graphical') {
      setLoadingChart(true);
      generateRealProfitData().then(data => {
        setChartData(data);
        setLoadingChart(false);
      });
    }
  }, [analysisType, selectedMonth, selectedYear]);

  const deleteTransaction = async (id: string) => {
    try {
      const response = await fetch(`/api/financial/transactions?id=${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Erro ao deletar transação');
      }
      
      toast({
        title: 'Transação deletada',
        description: 'A transação foi removida com sucesso.',
        variant: 'default',
      });
      
      fetchFinancialData();
      
    } catch (error) {
      console.error('Erro ao deletar transação:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível deletar a transação.',
        variant: 'destructive',
      });
    }
  };

  const deleteFixedCost = async (id: string) => {
    try {
      const response = await fetch(`/api/financial/fixed-costs?id=${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Erro ao deletar custo fixo');
      }
      
      toast({
        title: 'Custo fixo removido',
        description: 'O custo fixo foi removido com sucesso.',
        variant: 'default',
      });
      
      fetchFinancialData();
      
    } catch (error) {
      console.error('Erro ao deletar custo fixo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o custo fixo.',
        variant: 'destructive',
      });
    }
  };

  // Funções de edição
  const updateTransaction = async (id: string, data: { description: string; amount: number; category: string }) => {
    try {
      const response = await fetch('/api/financial/transactions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          ...data,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Erro ao atualizar transação');
      }
      
      toast({
        title: 'Transação atualizada',
        description: 'A transação foi atualizada com sucesso.',
        variant: 'default',
      });
      
      setEditingTransaction(null);
      fetchFinancialData();
      
    } catch (error) {
      console.error('Erro ao atualizar transação:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a transação.',
        variant: 'destructive',
      });
    }
  };

  const updateFixedCost = async (id: string, data: { name: string; amount: number; category: string; vigencia_inicio?: string; vigencia_fim?: string }) => {
    try {
      const response = await fetch('/api/financial/fixed-costs', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          ...data,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Erro ao atualizar custo fixo');
      }
      
      toast({
        title: 'Custo fixo atualizado',
        description: 'O custo fixo foi atualizado com sucesso.',
        variant: 'default',
      });
      
      setEditingFixedCost(null);
      fetchFinancialData();
      
    } catch (error) {
      console.error('Erro ao atualizar custo fixo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o custo fixo.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Carregando dados financeiros...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!financialData) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Erro ao carregar dados financeiros</p>
        </div>
      </div>
    );
  }

  // Extrair métricas com valores seguros
  const metrics = financialData.metrics || {};
  const totalRevenue = safeNumber(metrics.totalRevenue || 0);
  const totalExpenses = safeNumber(metrics.totalExpenses || 0);
  const netProfit = safeNumber(metrics.netProfit || 0);
  const fixedCosts = safeNumber(metrics.fixedCosts || 0);
  const variableExpenses = safeNumber(metrics.variableExpenses || 0);

  return (
    <div className="space-y-6">
      {/* Filtros de Mês e Ano */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Select
            value={selectedMonth.toString()}
            onValueChange={(value) => setSelectedMonth(parseInt(value))}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value.toString()}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedYear.toString()}
            onValueChange={(value) => setSelectedYear(parseInt(value))}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Marcadores Principais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-white dark:bg-gray-800 border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Icons.TrendingUp className="h-5 w-5 mr-2 text-green-500" />
              Receitas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(totalRevenue)}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {getMonthName(selectedMonth)} {selectedYear}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Icons.TrendingDown className="h-5 w-5 mr-2 text-red-500" />
              Despesas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(totalExpenses)}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Fixas: {formatCurrency(fixedCosts)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Calculator className="h-5 w-5 mr-2 text-blue-500" />
              Lucro Líquido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(netProfit)}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Margem: {totalRevenue > 0 ? 
                ((netProfit / totalRevenue) * 100).toFixed(1) : '0'}%
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <DollarSign className="h-5 w-5 mr-2 text-purple-500" />
              Custos Fixos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(fixedCosts)}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {(financialData.fixedCosts || []).length} itens ativos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Botões de Alternância */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          onClick={() => setAnalysisType('numerical')}
          className={`flex items-center gap-2 ${
            analysisType === 'numerical' 
              ? 'bg-blue-600 text-white' 
              : 'bg-white text-gray-700 border border-gray-300'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          Análise Numérica
        </Button>
        
        <Button
          onClick={() => setAnalysisType('graphical')}
          className={`flex items-center gap-2 ${
            analysisType === 'graphical' 
              ? 'bg-blue-600 text-white' 
              : 'bg-white text-gray-700 border border-gray-300'
          }`}
        >
          <LineChart className="h-4 w-4" />
          Análise Gráfica
        </Button>
      </div>

      {/* Análise Financeira Mensal */}
      <Card className="bg-white dark:bg-gray-800 border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-xl flex items-center">
            {analysisType === 'numerical' ? (
              <BarChart3 className="h-6 w-6 mr-2 text-blue-500" />
            ) : (
              <LineChart className="h-6 w-6 mr-2 text-blue-500" />
            )}
            Análise Financeira - {getMonthName(selectedMonth)} {selectedYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analysisType === 'numerical' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Demonstrativo Total do Mês */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Demonstrativo Total do Mês</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Receitas</span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(totalRevenue)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ 
                        width: `${totalRevenue > 0 ? 100 : 0}%` 
                      }}
                    ></div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Despesas</span>
                    <span className="font-medium text-red-600">
                      {formatCurrency(totalExpenses)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-red-500 h-2 rounded-full" 
                      style={{ 
                        width: `${totalExpenses > 0 ? 100 : 0}%` 
                      }}
                    ></div>
                  </div>

                  <div className="flex justify-between items-center border-t pt-3">
                    <span className="text-gray-600 font-semibold">Lucro Líquido</span>
                    <span className={`font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(netProfit)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Distribuição de Despesas */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Distribuição de Despesas</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Custos Fixos</span>
                    <span className="font-medium text-orange-600">
                      {formatCurrency(fixedCosts)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-orange-500 h-2 rounded-full" 
                      style={{ 
                        width: `${totalExpenses > 0 ? (fixedCosts / totalExpenses) * 100 : (fixedCosts > 0 ? 100 : 0)}%` 
                      }}
                    ></div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Despesas Variáveis</span>
                    <span className="font-medium text-purple-600">
                      {formatCurrency(variableExpenses)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-500 h-2 rounded-full" 
                      style={{ 
                        width: `${totalExpenses > 0 ? (variableExpenses / totalExpenses) * 100 : (variableExpenses > 0 ? 100 : 0)}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Lucro Líquido Mensal</h3>
                <p className="text-gray-600 mb-6">Dados reais baseados em receitas e despesas</p>
              </div>
              
              {loadingChart ? (
                <div className="flex items-center justify-center h-96">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-500">Carregando dados do gráfico...</p>
                  </div>
                </div>
              ) : chartData.length > 0 ? (
                <div className="h-96 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fontSize: 12 }}
                        stroke="#666"
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        stroke="#666"
                        tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip 
                        formatter={(value) => [formatCurrency(value as number), 'Lucro Líquido']}
                        labelStyle={{ color: '#333' }}
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #ccc',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="lucroLiquido" 
                        stroke="#3b82f6" 
                        strokeWidth={3}
                        dot={(props) => {
                          const { cx, cy, payload } = props;
                          return (
                            <circle
                              cx={cx}
                              cy={cy}
                              r={payload.isCurrentMonth ? 8 : 4}
                              fill={payload.isCurrentMonth ? "#ef4444" : "#3b82f6"}
                              stroke={payload.isCurrentMonth ? "#dc2626" : "#1d4ed8"}
                              strokeWidth={2}
                            />
                          );
                        }}
                        activeDot={{ r: 6, fill: "#1d4ed8" }}
                      />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p>Nenhum dado financeiro encontrado para os últimos 12 meses</p>
                  <p className="text-sm mt-2">Adicione receitas e despesas para visualizar o gráfico</p>
                </div>
              )}
              
              <div className="text-center text-sm text-gray-500">
                <p>● Ponto destacado indica o mês atual ({getMonthName(selectedMonth)})</p>
                <p>Dados baseados em receitas e despesas reais</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seções com Tabelas - Só mostrar na análise numérica */}
      {analysisType === 'numerical' && (
        <>
          {/* Primeira Linha: Despesas e Custos Fixos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Despesas Variáveis */}
            <Card className="bg-white dark:bg-gray-800 border-0 shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Despesas Variáveis</CardTitle>
                  <AddTransactionModal 
                    onTransactionAdded={fetchFinancialData} 
                    month={selectedMonth} 
                    year={selectedYear} 
                  />
                </div>
                <p className="text-sm text-gray-500">
                  {getMonthName(selectedMonth)} {selectedYear}
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(financialData.transactions || []).filter(t => t.type === 'despesa').length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead className="w-24">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(financialData.transactions || []).filter(t => t.type === 'despesa').map((transaction) => {
                          const isEditing = editingTransaction?.id === transaction.id;
                          
                          return (
                            <TableRow key={safeString(transaction.id) || Math.random()}>
                              <TableCell>
                                {isEditing ? (
                                  <div className="space-y-2">
                                    <input
                                      type="text"
                                      value={editingTransaction.description || ''}
                                      onChange={(e) => setEditingTransaction({...editingTransaction, description: e.target.value})}
                                      className="w-full px-2 py-1 text-sm border rounded"
                                      placeholder="Descrição"
                                    />
                                    <input
                                      type="text"
                                      value={editingTransaction.category || ''}
                                      onChange={(e) => setEditingTransaction({...editingTransaction, category: e.target.value})}
                                      className="w-full px-2 py-1 text-sm border rounded"
                                      placeholder="Categoria"
                                    />
                                  </div>
                                ) : (
                                  <div>
                                    <div className="font-medium">{safeString(transaction.description)}</div>
                                    <div className="text-sm text-gray-500">{safeString(transaction.category)}</div>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="font-medium text-red-600">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    value={editingTransaction.amount || ''}
                                    onChange={(e) => setEditingTransaction({...editingTransaction, amount: parseFloat(e.target.value) || 0})}
                                    className="w-full px-2 py-1 text-sm border rounded"
                                    placeholder="Valor"
                                    step="0.01"
                                  />
                                ) : (
                                  formatCurrency(safeNumber(transaction.amount))
                                )}
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <div className="flex space-x-1">
                                    <Button
                                      onClick={() => updateTransaction(safeString(transaction.id), {
                                        description: editingTransaction.description,
                                        amount: editingTransaction.amount,
                                        category: editingTransaction.category
                                      })}
                                      className="text-green-600 hover:text-green-800 bg-transparent border-none p-1"
                                      size="sm"
                                    >
                                      <Icons.Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      onClick={() => setEditingTransaction(null)}
                                      className="text-gray-500 hover:text-gray-700 bg-transparent border-none p-1"
                                      size="sm"
                                    >
                                      ✕
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex space-x-1">
                                    <Button
                                      onClick={() => setEditingTransaction(transaction)}
                                      className="text-blue-500 hover:text-blue-700 bg-transparent border-none p-1"
                                      size="sm"
                                    >
                                      <Icons.Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      onClick={() => deleteTransaction(safeString(transaction.id))}
                                      className="text-red-500 hover:text-red-700 bg-transparent border-none p-1"
                                      size="sm"
                                    >
                                      <Icons.Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>Nenhuma despesa variável registrada</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Custos Fixos Mensais */}
            <Card className="bg-white dark:bg-gray-800 border-0 shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Custos Fixos Mensais</CardTitle>
                  <AddFixedCostModal 
                    onCostAdded={fetchFinancialData} 
                  />
                </div>
                <p className="text-sm text-gray-500">
                  {getMonthName(selectedMonth)} {selectedYear}
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(financialData.fixedCosts || []).length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead className="w-24">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(financialData.fixedCosts || []).map((cost) => {
                          const isEditing = editingFixedCost?.id === cost.id;
                          
                          return (
                            <TableRow key={safeString(cost.id) || Math.random()}>
                              <TableCell>
                                {isEditing ? (
                                  <div className="space-y-2">
                                    <input
                                      type="text"
                                      value={editingFixedCost.name || ''}
                                      onChange={(e) => setEditingFixedCost({...editingFixedCost, name: e.target.value})}
                                      className="w-full px-2 py-1 text-sm border rounded"
                                      placeholder="Nome"
                                    />
                                    <input
                                      type="text"
                                      value={editingFixedCost.category || ''}
                                      onChange={(e) => setEditingFixedCost({...editingFixedCost, category: e.target.value})}
                                      className="w-full px-2 py-1 text-sm border rounded"
                                      placeholder="Categoria"
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                      <input
                                        type="month"
                                        value={editingFixedCost.vigencia_inicio || ''}
                                        onChange={(e) => setEditingFixedCost({...editingFixedCost, vigencia_inicio: e.target.value})}
                                        className="w-full px-2 py-1 text-sm border rounded"
                                        placeholder="Início"
                                      />
                                      <input
                                        type="month"
                                        value={editingFixedCost.vigencia_fim || ''}
                                        onChange={(e) => setEditingFixedCost({...editingFixedCost, vigencia_fim: e.target.value})}
                                        className="w-full px-2 py-1 text-sm border rounded"
                                        placeholder="Término (opcional)"
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <div className="font-medium">{safeString(cost.name)}</div>
                                    <div className="text-sm text-gray-500">{safeString(cost.category)}</div>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="font-medium text-orange-600">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    value={editingFixedCost.amount || ''}
                                    onChange={(e) => setEditingFixedCost({...editingFixedCost, amount: parseFloat(e.target.value) || 0})}
                                    className="w-full px-2 py-1 text-sm border rounded"
                                    placeholder="Valor"
                                    step="0.01"
                                  />
                                ) : (
                                  formatCurrency(safeNumber(cost.amount))
                                )}
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <div className="flex space-x-1">
                                    <Button
                                      onClick={() => updateFixedCost(safeString(cost.id), {
                                        name: editingFixedCost.name,
                                        amount: editingFixedCost.amount,
                                        category: editingFixedCost.category,
                                        vigencia_inicio: editingFixedCost.vigencia_inicio ? `${editingFixedCost.vigencia_inicio}-01` : undefined,
                                        vigencia_fim: editingFixedCost.vigencia_fim ? `${editingFixedCost.vigencia_fim}-01` : undefined
                                      })}
                                      className="text-green-600 hover:text-green-800 bg-transparent border-none p-1"
                                      size="sm"
                                    >
                                      <Icons.Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      onClick={() => setEditingFixedCost(null)}
                                      className="text-gray-500 hover:text-gray-700 bg-transparent border-none p-1"
                                      size="sm"
                                    >
                                      ✕
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex space-x-1">
                                    <Button
                                      onClick={() => setEditingFixedCost(cost)}
                                      className="text-blue-500 hover:text-blue-700 bg-transparent border-none p-1"
                                      size="sm"
                                    >
                                      <Icons.Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      onClick={() => deleteFixedCost(safeString(cost.id))}
                                      className="text-red-500 hover:text-red-700 bg-transparent border-none p-1"
                                      size="sm"
                                    >
                                      <Icons.Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>Nenhum custo fixo registrado</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Segunda Linha: Fontes de Receita Mensal */}
          <div className="grid grid-cols-1 gap-6">
            <Card className="bg-white dark:bg-gray-800 border-0 shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Fontes de Receita Mensal</CardTitle>
                  <AddTransactionModal 
                    onTransactionAdded={fetchFinancialData} 
                    month={selectedMonth} 
                    year={selectedYear} 
                  />
                </div>
                <p className="text-sm text-gray-500">
                  {getMonthName(selectedMonth)} {selectedYear}
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Projetos do Mês */}
                  <div>
                    <h4 className="font-medium text-sm text-gray-700 mb-3">Projetos do Mês</h4>
                    {(financialData.projects || []).length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Projeto</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Valor Pago</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(financialData.projects || []).map((project) => {
                            return (
                              <TableRow key={safeString(project.id) || Math.random()}>
                                <TableCell>
                                  <div>
                                    <div className="font-medium">{safeString(project.name)}</div>
                                    <div className="text-sm text-gray-500">
                                      {safeString(project.empresa_integradora)}
                                      {project.users && (
                                        <span className="ml-2 text-xs">
                                          ({safeUserName(project.users)})
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {(() => {
                                    const paymentStatus = project.pagamento || 'pendente';
                                    
                                    if (paymentStatus === 'pago') {
                                      return <Badge variant="default" className="bg-green-100 text-green-800">Pago</Badge>;
                                    } else if (paymentStatus === 'parcela1') {
                                      return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Parcial</Badge>;
                                    } else {
                                      return <Badge variant="secondary" className="bg-gray-100 text-gray-800">Pendente</Badge>;
                                    }
                                  })()}
                                </TableCell>
                                <TableCell className="font-medium text-green-600">
                                  {(() => {
                                    const totalValue = project.valor_projeto || project.valorProjeto || 0;
                                    const paymentStatus = project.pagamento || 'pendente';
                                    
                                    // ✅ CORREÇÃO: Mostrar apenas valor efetivamente pago
                                    if (paymentStatus === 'pago') {
                                      return formatCurrency(safeNumber(totalValue));
                                    } else if (paymentStatus === 'parcela1') {
                                      return formatCurrency(safeNumber(totalValue / 2));
                                    } else {
                                      // Se pendente, mostrar R$ 0,00
                                      return formatCurrency(0);
                                    }
                                  })()}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <p>Nenhum projeto no período</p>
                      </div>
                    )}
                  </div>

                  {/* Outras Receitas */}
                  <div>
                    <h4 className="font-medium text-sm text-gray-700 mb-3">Outras Receitas</h4>
                    {(financialData.transactions || []).filter(t => t.type === 'receita').length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Descrição</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead className="w-24">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(financialData.transactions || []).filter(t => t.type === 'receita').map((transaction) => {
                            const isEditing = editingTransaction?.id === transaction.id;
                            
                            return (
                              <TableRow key={safeString(transaction.id) || Math.random()}>
                                <TableCell>
                                  {isEditing ? (
                                    <div className="space-y-2">
                                      <input
                                        type="text"
                                        value={editingTransaction.description || ''}
                                        onChange={(e) => setEditingTransaction({...editingTransaction, description: e.target.value})}
                                        className="w-full px-2 py-1 text-sm border rounded"
                                        placeholder="Descrição"
                                      />
                                      <input
                                        type="text"
                                        value={editingTransaction.category || ''}
                                        onChange={(e) => setEditingTransaction({...editingTransaction, category: e.target.value})}
                                        className="w-full px-2 py-1 text-sm border rounded"
                                        placeholder="Categoria"
                                      />
                                    </div>
                                  ) : (
                                    <div>
                                      <div className="font-medium">{safeString(transaction.description)}</div>
                                      <div className="text-sm text-gray-500">{safeString(transaction.category)}</div>
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell className="font-medium text-green-600">
                                  {isEditing ? (
                                    <input
                                      type="number"
                                      value={editingTransaction.amount || ''}
                                      onChange={(e) => setEditingTransaction({...editingTransaction, amount: parseFloat(e.target.value) || 0})}
                                      className="w-full px-2 py-1 text-sm border rounded"
                                      placeholder="Valor"
                                      step="0.01"
                                    />
                                  ) : (
                                    formatCurrency(safeNumber(transaction.amount))
                                  )}
                                </TableCell>
                                <TableCell>
                                  {isEditing ? (
                                    <div className="flex space-x-1">
                                      <Button
                                        onClick={() => updateTransaction(safeString(transaction.id), {
                                          description: editingTransaction.description,
                                          amount: editingTransaction.amount,
                                          category: editingTransaction.category
                                        })}
                                        className="text-green-600 hover:text-green-800 bg-transparent border-none p-1"
                                        size="sm"
                                      >
                                        <Icons.Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        onClick={() => setEditingTransaction(null)}
                                        className="text-gray-500 hover:text-gray-700 bg-transparent border-none p-1"
                                        size="sm"
                                      >
                                        ✕
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="flex space-x-1">
                                      <Button
                                        onClick={() => setEditingTransaction(transaction)}
                                        className="text-blue-500 hover:text-blue-700 bg-transparent border-none p-1"
                                        size="sm"
                                      >
                                        <Icons.Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        onClick={() => deleteTransaction(safeString(transaction.id))}
                                        className="text-red-500 hover:text-red-700 bg-transparent border-none p-1"
                                        size="sm"
                                      >
                                        <Icons.Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <p>Nenhuma receita registrada</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
