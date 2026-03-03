'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart } from 'lucide-react';

interface Opportunity {
  created_at: string;
  estimated_value: number | null;
}

interface PipelineTrendCardProps {
  opportunities: Opportunity[];
}

export function PipelineTrendCard({ opportunities }: PipelineTrendCardProps) {
  // Calcular tendência dos últimos 30 dias
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Agrupar oportunidades por semana
  const weeklyData: { [key: string]: { count: number; value: number } } = {};

  opportunities.forEach(opp => {
    const createdDate = new Date(opp.created_at);
    if (createdDate >= thirtyDaysAgo) {
      // Calcular número da semana (1-4)
      const weekNumber = Math.floor((now.getTime() - createdDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
      const weekLabel = `${4 - weekNumber}ª semana`;

      if (!weeklyData[weekLabel]) {
        weeklyData[weekLabel] = { count: 0, value: 0 };
      }

      weeklyData[weekLabel].count++;
      weeklyData[weekLabel].value += opp.estimated_value || 0;
    }
  });

  // Garantir que temos todas as 4 semanas
  const weeks = ['1ª semana', '2ª semana', '3ª semana', '4ª semana'];
  const chartData = weeks.map(week => ({
    week,
    count: weeklyData[week]?.count || 0,
    value: weeklyData[week]?.value || 0
  }));

  const maxCount = Math.max(...chartData.map(d => d.count), 1);
  const totalThisMonth = chartData.reduce((sum, d) => sum + d.count, 0);
  const totalValue = chartData.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <BarChart className="h-5 w-5 text-blue-600" />
          Tendência do Mês
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Resumo */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Novas Oportunidades</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalThisMonth}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Valor Total</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                R$ {(totalValue / 1000).toFixed(0)}k
              </p>
            </div>
          </div>

          {/* Gráfico simples de barras */}
          <div className="space-y-3">
            {chartData.map(data => {
              const heightPercentage = (data.count / maxCount) * 100;

              return (
                <div key={data.week} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {data.week}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      {data.count} oportunidade{data.count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="relative h-8 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-blue-500 dark:bg-blue-600 transition-all duration-500 flex items-center justify-end pr-2"
                      style={{
                        width: `${heightPercentage}%`,
                        minWidth: data.count > 0 ? '30px' : '0'
                      }}
                    >
                      {data.count > 0 && data.value > 0 && (
                        <span className="text-white text-xs font-semibold">
                          R$ {(data.value / 1000).toFixed(0)}k
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
