'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Users, Target, DollarSign } from 'lucide-react';

interface PipelineMetric {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

interface PipelineMetricsCardsProps {
  totalLeads: number;
  activeOpportunities: number;
  totalValue: number;
}

export function PipelineMetricsCards({
  totalLeads,
  activeOpportunities,
  totalValue
}: PipelineMetricsCardsProps) {
  const metrics: PipelineMetric[] = [
    {
      title: 'Total de Leads',
      value: totalLeads,
      icon: <Users className="h-6 w-6" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20'
    },
    {
      title: 'Oportunidades Ativas',
      value: activeOpportunities,
      icon: <Target className="h-6 w-6" />,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/20'
    },
    {
      title: 'Valor Total no Pipeline',
      value: `R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: <DollarSign className="h-6 w-6" />,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900/20'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      {metrics.map((metric, index) => (
        <Card key={index} className="border-2 border-gray-200 dark:border-gray-700 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {metric.title}
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {metric.value}
                </p>
              </div>
              <div className={`p-3 rounded-full ${metric.bgColor} ${metric.color}`}>
                {metric.icon}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
