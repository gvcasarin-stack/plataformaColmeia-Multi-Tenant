'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Opportunity {
  id: string;
  title: string;
  estimated_value: number | null;
  probability: number;
  lead?: {
    name: string;
  } | null;
  status?: {
    name: string;
    color: string;
  };
}

interface TopOpportunitiesCardProps {
  opportunities: Opportunity[];
}

export function TopOpportunitiesCard({ opportunities }: TopOpportunitiesCardProps) {
  // Ordenar por valor estimado e pegar os top 5
  const topOpportunities = [...opportunities]
    .filter(opp => opp.estimated_value && opp.estimated_value > 0)
    .sort((a, b) => (b.estimated_value || 0) - (a.estimated_value || 0))
    .slice(0, 5);

  return (
    <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-600" />
          Top Oportunidades
        </CardTitle>
      </CardHeader>
      <CardContent>
        {topOpportunities.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-8">
            Nenhuma oportunidade com valor estimado
          </p>
        ) : (
          <div className="space-y-3">
            {topOpportunities.map((opp, index) => (
              <div
                key={opp.id}
                className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-xs font-bold">
                        {index + 1}
                      </span>
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm truncate flex-1">
                        {opp.title}
                      </h4>
                    </div>
                    {opp.lead && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 ml-8">
                        {opp.lead.name}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2 ml-8">
                      {opp.status && (
                        <Badge
                          variant="secondary"
                          className="text-xs"
                          style={{
                            backgroundColor: opp.status.color + '20',
                            color: opp.status.color,
                            borderColor: opp.status.color
                          }}
                        >
                          {opp.status.name}
                        </Badge>
                      )}
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {opp.probability}% probabilidade
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-lg font-bold text-green-600 dark:text-green-400">
                      R$ {(opp.estimated_value || 0).toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
