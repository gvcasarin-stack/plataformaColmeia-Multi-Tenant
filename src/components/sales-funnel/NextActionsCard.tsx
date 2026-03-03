'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Calendar, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

interface Opportunity {
  id: string;
  title: string;
  expected_close_date: string | null;
  estimated_value: number | null;
  lead?: {
    name: string;
  } | null;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  completed_at?: string;
  created_at?: string;
  updated_at?: string;
  opportunity?: {
    id: string;
    title: string;
  } | null;
  assigned_user?: {
    id: string;
    name: string;
  } | null;
}

interface NextActionsCardProps {
  opportunities: Opportunity[];
  tasks?: Task[];
  onTaskComplete?: (taskId: string, completed: boolean) => void;
}

export function NextActionsCard({ opportunities, tasks = [], onTaskComplete }: NextActionsCardProps) {
  const [showCompleted, setShowCompleted] = useState(false);

  // Filtrar oportunidades com data próxima (próximos 7 dias)
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const upcomingOpportunities = opportunities
    .filter(opp => {
      if (!opp.expected_close_date) return false;
      const closeDate = new Date(opp.expected_close_date);
      return closeDate >= now && closeDate <= sevenDaysFromNow;
    })
    .sort((a, b) => {
      const dateA = new Date(a.expected_close_date!).getTime();
      const dateB = new Date(b.expected_close_date!).getTime();
      return dateA - dateB;
    })
    .slice(0, 3);

  // Filtrar tarefas pendentes e próximas (próximos 7 dias ou sem data)
  const upcomingTasks = tasks
    .filter(task => !task.completed)
    .filter(task => {
      if (!task.due_date) return true; // Tarefas sem data sempre aparecem
      const dueDate = new Date(task.due_date);
      return dueDate <= sevenDaysFromNow;
    })
    .sort((a, b) => {
      // Ordenar por prioridade e depois por data
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      if (a.priority !== b.priority) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      if (a.due_date && b.due_date) {
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
      if (a.due_date) return -1;
      if (b.due_date) return 1;
      return 0;
    })
    .slice(0, 5);

  // Filtrar tarefas concluídas dos últimos 7 dias
  const completedTasks = tasks
    .filter(task => task.completed)
    .sort((a, b) => {
      // Ordenar por data de conclusão (mais recentes primeiro)
      return new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime();
    })
    .slice(0, 5);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  const getDaysUntil = (dateString: string) => {
    const date = new Date(dateString);
    const diff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const priorityConfig = {
    low: { color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/20', label: 'Baixa' },
    medium: { color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/20', label: 'Média' },
    high: { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/20', label: 'Alta' }
  };

  return (
    <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <Clock className="h-5 w-5 text-orange-600" />
          Próximas Ações
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Seção de Tarefas */}
          {upcomingTasks.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Tarefas Pendentes
              </h3>
              <div className="space-y-2">
                {upcomingTasks.map(task => {
                  const priority = priorityConfig[task.priority];
                  const daysUntil = task.due_date ? getDaysUntil(task.due_date) : null;
                  const isOverdue = daysUntil !== null && daysUntil < 0;
                  const isUrgent = daysUntil !== null && daysUntil <= 2 && daysUntil >= 0;

                  return (
                    <div
                      key={task.id}
                      className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={task.completed}
                          onCheckedChange={(checked) => onTaskComplete?.(task.id, !!checked)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                            {task.title}
                          </h4>
                          {task.description && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-1">
                              {task.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <Badge className={`text-xs ${priority.bg} ${priority.color} border-0`}>
                              {priority.label}
                            </Badge>
                            {task.due_date && (
                              <Badge
                                variant={isOverdue ? 'destructive' : isUrgent ? 'destructive' : 'secondary'}
                                className="text-xs"
                              >
                                <Calendar className="h-3 w-3 mr-1" />
                                {isOverdue ? 'Atrasado' : formatDate(task.due_date)}
                              </Badge>
                            )}
                            {task.opportunity && (
                              <span className="text-xs text-gray-600 dark:text-gray-400">
                                📊 {task.opportunity.title}
                              </span>
                            )}
                          </div>
                        </div>
                        {daysUntil !== null && (
                          <div className="text-right shrink-0">
                            <span
                              className={`text-xs font-semibold ${
                                isOverdue || isUrgent
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-gray-600 dark:text-gray-400'
                              }`}
                            >
                              {isOverdue
                                ? `${Math.abs(daysUntil)}d atraso`
                                : daysUntil === 0
                                ? 'Hoje'
                                : daysUntil === 1
                                ? 'Amanhã'
                                : `${daysUntil}d`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Seção de Tarefas Concluídas (Colapsável) */}
          {completedTasks.length > 0 && (
            <div>
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className="w-full flex items-center justify-between text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Tarefas Concluídas ({completedTasks.length})</span>
                </div>
                {showCompleted ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              {showCompleted && (
                <div className="space-y-2">
                  {completedTasks.map(task => {
                    const priority = priorityConfig[task.priority];

                    return (
                      <div
                        key={task.id}
                        className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors opacity-75"
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={task.completed}
                            onCheckedChange={(checked) => onTaskComplete?.(task.id, !!checked)}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 dark:text-white text-sm line-through opacity-60">
                              {task.title}
                            </h4>
                            {task.description && (
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-1">
                                {task.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <Badge className={`text-xs ${priority.bg} ${priority.color} border-0 opacity-75`}>
                                {priority.label}
                              </Badge>
                              {task.completed_at && (
                                <span className="text-xs text-gray-500 dark:text-gray-500">
                                  Concluída em {formatDate(task.completed_at)}
                                </span>
                              )}
                              {task.opportunity && (
                                <span className="text-xs text-gray-600 dark:text-gray-400">
                                  📊 {task.opportunity.title}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Seção de Oportunidades */}
          {upcomingOpportunities.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Oportunidades Próximas
              </h3>
              <div className="space-y-2">
                {upcomingOpportunities.map(opp => {
                  const daysUntil = getDaysUntil(opp.expected_close_date!);
                  const isUrgent = daysUntil <= 2;

                  return (
                    <div
                      key={opp.id}
                      className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 dark:text-white text-sm truncate">
                            {opp.title}
                          </h4>
                          {opp.lead && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                              {opp.lead.name}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge
                              variant={isUrgent ? 'destructive' : 'secondary'}
                              className="text-xs"
                            >
                              <Calendar className="h-3 w-3 mr-1" />
                              {formatDate(opp.expected_close_date!)}
                            </Badge>
                            {opp.estimated_value && (
                              <span className="text-xs text-gray-600 dark:text-gray-400">
                                R$ {opp.estimated_value.toLocaleString('pt-BR')}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span
                            className={`text-xs font-semibold ${
                              isUrgent
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            {daysUntil === 0 ? 'Hoje' : daysUntil === 1 ? 'Amanhã' : `${daysUntil}d`}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mensagem quando não há nada */}
          {upcomingTasks.length === 0 && upcomingOpportunities.length === 0 && (
            <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-8">
              Nenhuma ação programada nos próximos 7 dias
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
