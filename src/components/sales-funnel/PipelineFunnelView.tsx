'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingDown } from 'lucide-react';

interface OpportunityStatus {
  id: string;
  name: string;
  color: string;
  position: number;
}

interface Opportunity {
  status_id: string;
  estimated_value: number | null;
}

interface PipelineFunnelViewProps {
  statuses: OpportunityStatus[];
  opportunities: Opportunity[];
}

export function PipelineFunnelView({ statuses, opportunities }: PipelineFunnelViewProps) {
  // Calcular dados para cada etapa
  const funnelData = statuses
    .sort((a, b) => a.position - b.position)
    .map((status, index) => {
      const oppsInStatus = opportunities.filter(opp => opp.status_id === status.id);
      const totalValue = oppsInStatus.reduce((sum, opp) => sum + (opp.estimated_value || 0), 0);

      return {
        ...status,
        count: oppsInStatus.length,
        value: totalValue,
        percentage: opportunities.length > 0 ? (oppsInStatus.length / opportunities.length) * 100 : 0,
        stepNumber: index + 1
      };
    });

  return (
    <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-violet-600" />
          Funil de Vendas
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Funil Visual Horizontal */}
        <div className="relative py-8 px-4">
          <div className="max-w-6xl mx-auto">
            {/* Container do funil horizontal */}
            <div className="relative" style={{ height: '200px' }}>
              {funnelData.map((stage, index) => {
                // Calcular posições e tamanhos para criar forma de funil HORIZONTAL
                const totalStages = funnelData.length;
                const leftHeight = 90; // Percentual da altura na esquerda (muito alto)
                const rightHeight = 55; // Percentual da altura na direita (maior ainda)

                // Altura de cada estágio (percentual)
                const leftStageHeight = leftHeight - ((leftHeight - rightHeight) / (totalStages - 1)) * index;
                const rightStageHeight = leftHeight - ((leftHeight - rightHeight) / (totalStages - 1)) * (index + 1);

                // Largura e posição horizontal
                const stageWidth = 100 / totalStages;
                const leftPosition = (stageWidth * index);

                return (
                  <div key={stage.id}>
                    {/* Forma do funil horizontal (trapézio) */}
                    <div
                      className="absolute top-1/2 transform -translate-y-1/2 transition-all duration-300 hover:brightness-110 cursor-pointer"
                      style={{
                        left: `${leftPosition}%`,
                        width: `${stageWidth}%`,
                        height: `${leftStageHeight}%`
                      }}
                    >
                      <div
                        className="w-full h-full relative flex flex-col items-center justify-center"
                        style={{
                          background: `linear-gradient(to right, ${stage.color || '#8B5CF6'} 0%, ${stage.color || '#8B5CF6'}dd 100%)`,
                          clipPath: `polygon(
                            0% ${((leftStageHeight - rightStageHeight) / 2 / leftStageHeight) * 100}%,
                            100% 0%,
                            100% 100%,
                            0% ${100 - ((leftStageHeight - rightStageHeight) / 2 / leftStageHeight) * 100}%
                          )`,
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                          border: '1px solid rgba(255, 255, 255, 0.2)'
                        }}
                      >
                        {/* Conteúdo da etapa */}
                        <div className="text-white text-center px-2">
                          <div className="text-[9px] opacity-75 mb-0.5">Step {stage.stepNumber}</div>
                          <div className="font-bold text-xs mb-1 leading-tight">{stage.name}</div>
                          <div className="flex flex-col items-center gap-0.5 text-xs">
                            <span className="font-bold text-lg">{stage.count}</span>
                            <span className="opacity-90 text-[10px]">{stage.percentage.toFixed(0)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Valor abaixo (fora do funil) */}
                    <div
                      className="absolute top-1/2 transform -translate-y-1/2 text-center"
                      style={{
                        left: `${leftPosition}%`,
                        width: `${stageWidth}%`,
                        top: `calc(50% + ${leftStageHeight / 2}% + 12px)`
                      }}
                    >
                      <div className="text-[10px] font-medium text-gray-600 dark:text-gray-400">
                        R$ {(stage.value / 1000).toFixed(0)}k
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Resumo total */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-around text-center">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Total de Etapas</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{funnelData.length}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Total de Oportunidades</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{opportunities.length}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Valor Total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                R$ {opportunities.reduce((sum, opp) => sum + (opp.estimated_value || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
