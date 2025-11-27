'use client';

import { useState, useCallback, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  MoreVertical,
  User,
  DollarSign,
  Calendar,
  PenSquare,
  Trash2,
  TrendingUp,
  Building2,
  Phone,
  Mail
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { devLog } from '@/lib/utils/productionLogger';
import { cn } from '@/lib/utils';
import { EditColumnDialog } from './EditColumnDialog';
import { EditOpportunityModal } from './EditOpportunityModal';

interface OpportunityStatus {
  id: string;
  name: string;
  color: string;
  position: number;
  is_won: boolean;
  is_lost: boolean;
  is_final: boolean;
  is_default: boolean;
}

interface Opportunity {
  id: string;
  title: string;
  estimated_value: number | null;
  probability: number;
  expected_close_date: string | null;
  lead_id: string | null;
  responsible_id: string | null;
  status_id: string;
  position: number;
  description: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  lead?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
  } | null;
  responsible?: {
    id: string;
    name: string;
    email: string;
  } | null;
  status?: OpportunityStatus;
}

interface SalesFunnelKanbanProps {
  opportunities: Opportunity[];
  statuses: OpportunityStatus[];
  onOpportunityUpdate: () => void;
}

export function SalesFunnelKanban({ opportunities, statuses, onOpportunityUpdate }: SalesFunnelKanbanProps) {
  const [isEditColumnOpen, setIsEditColumnOpen] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState<OpportunityStatus | null>(null);
  const [isDeleteOpportunityDialogOpen, setIsDeleteOpportunityDialogOpen] = useState(false);
  const [opportunityToDelete, setOpportunityToDelete] = useState<Opportunity | null>(null);
  const [isDeleteColumnDialogOpen, setIsDeleteColumnDialogOpen] = useState(false);
  const [columnToDelete, setColumnToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isEditOpportunityOpen, setIsEditOpportunityOpen] = useState(false);
  const [opportunityToEdit, setOpportunityToEdit] = useState<Opportunity | null>(null);

  // ✅ Estado local para optimistic updates
  const [opportunitiesState, setOpportunitiesState] = useState<Opportunity[]>(opportunities);

  // ✅ Sincronizar estado local com props quando props mudam (do servidor)
  useEffect(() => {
    setOpportunitiesState(opportunities);
  }, [opportunities]);

  // Agrupar oportunidades por status (usando estado local)
  const opportunitiesByStatus = statuses.reduce((acc, status) => {
    acc[status.id] = opportunitiesState
      .filter(opp => opp.status_id === status.id)
      .sort((a, b) => a.position - b.position);
    return acc;
  }, {} as Record<string, Opportunity[]>);

  // Drag and drop handler
  const handleDragEnd = useCallback(async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    // Se não há destino, retornar
    if (!destination) return;

    // Se largou no mesmo lugar, retornar
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    devLog.log('[SalesFunnelKanban] Drag end:', {
      opportunityId: draggableId,
      from: source.droppableId,
      to: destination.droppableId,
      fromIndex: source.index,
      toIndex: destination.index
    });

    // ✅ OPTIMISTIC UPDATE: Atualizar UI imediatamente (antes da API)
    // Encontrar a oportunidade que está sendo movida
    const movingOpportunity = opportunitiesState.find(opp => opp.id === draggableId);

    if (movingOpportunity) {
      // Criar cópia atualizada das oportunidades
      const updatedOpportunities = opportunitiesState.map(opp => {
        if (opp.id === draggableId) {
          // Atualizar status e position da oportunidade movida
          return {
            ...opp,
            status_id: destination.droppableId,
            position: destination.index
          };
        }
        return opp;
      });

      // Atualizar estado local imediatamente para feedback visual instantâneo
      setOpportunitiesState(updatedOpportunities);
    }

    try {
      // Chamar API em background
      const response = await fetch('/api/opportunities/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunityId: draggableId,
          newStatusId: destination.droppableId,
          newPosition: destination.index
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Erro ao mover oportunidade');
      }

      toast({
        title: 'Oportunidade movida!',
        description: 'A oportunidade foi movida com sucesso'
      });

      // Sincronizar com o servidor para garantir estado correto
      onOpportunityUpdate();

    } catch (error: any) {
      devLog.error('[SalesFunnelKanban] Erro ao mover oportunidade:', error);

      // ✅ ROLLBACK: Reverter para estado anterior em caso de erro
      onOpportunityUpdate();

      toast({
        title: 'Erro ao mover',
        description: error.message || 'Não foi possível mover a oportunidade',
        variant: 'destructive'
      });
    }
  }, [opportunitiesState, onOpportunityUpdate]);

  const handleEditColumn = (status: OpportunityStatus) => {
    devLog.log('[SalesFunnelKanban] Editando coluna:', status);
    setSelectedColumn(status);
    setIsEditColumnOpen(true);
  };

  const handleDeleteColumn = (statusId: string, statusName: string) => {
    setColumnToDelete({ id: statusId, name: statusName });
    setIsDeleteColumnDialogOpen(true);
  };

  const confirmDeleteColumn = async () => {
    if (!columnToDelete) return;

    try {
      const response = await fetch(`/api/opportunity-statuses/${columnToDelete.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Erro ao excluir coluna');
      }

      toast({
        title: 'Coluna excluída!',
        description: 'A coluna foi excluída com sucesso'
      });

      setIsDeleteColumnDialogOpen(false);
      setColumnToDelete(null);
      onOpportunityUpdate();

    } catch (error: any) {
      devLog.error('[SalesFunnelKanban] Erro ao excluir coluna:', error);
      toast({
        title: 'Erro ao excluir coluna',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleEditOpportunity = (opportunity: Opportunity) => {
    devLog.log('[SalesFunnelKanban] Editando oportunidade:', opportunity);
    setOpportunityToEdit(opportunity);
    setIsEditOpportunityOpen(true);
  };

  const handleDeleteOpportunity = (opportunity: Opportunity) => {
    setOpportunityToDelete(opportunity);
    setIsDeleteOpportunityDialogOpen(true);
  };

  const confirmDeleteOpportunity = async () => {
    if (!opportunityToDelete) return;

    try {
      const response = await fetch(`/api/opportunities/${opportunityToDelete.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Erro ao excluir');
      }

      toast({
        title: 'Oportunidade excluída!',
        description: 'A oportunidade foi excluída com sucesso'
      });

      setIsDeleteOpportunityDialogOpen(false);
      setOpportunityToDelete(null);
      onOpportunityUpdate();

    } catch (error: any) {
      devLog.error('[SalesFunnelKanban] Erro ao excluir:', error);
      toast({
        title: 'Erro ao excluir',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Não definida';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="h-full overflow-x-auto overflow-y-hidden p-6">
          <div className="flex gap-4 h-full min-w-max">
            {statuses.map((status) => {
              const statusOpportunities = opportunitiesByStatus[status.id] || [];
              const totalValue = statusOpportunities.reduce((sum, opp) => sum + (opp.estimated_value || 0), 0);

              return (
                <div
                  key={status.id}
                  className="flex-shrink-0 w-80 flex flex-col"
                  style={{ maxHeight: 'calc(100vh - 240px)' }}
                >
                  {/* Column Header */}
                  <div
                    className="rounded-t-lg px-4 py-3 mb-3"
                    style={{ backgroundColor: `${status.color}20`, borderBottom: `3px solid ${status.color}` }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: status.color }}
                        />
                        {status.name}
                      </h3>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditColumn(status)}>
                            <PenSquare className="w-4 h-4 mr-2" />
                            Editar coluna
                          </DropdownMenuItem>
                          {!status.is_default && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleDeleteColumn(status.id, status.name)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Excluir coluna
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>{statusOpportunities.length} oportunidade(s)</span>
                      <span className="font-medium">{formatCurrency(totalValue)}</span>
                    </div>
                  </div>

                  {/* Droppable Area */}
                  <Droppable droppableId={status.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "flex-1 overflow-y-auto space-y-3 px-2 py-2 rounded-lg transition-colors",
                          snapshot.isDraggingOver && "bg-blue-50/50"
                        )}
                      >
                        {statusOpportunities.map((opportunity, index) => (
                          <Draggable
                            key={opportunity.id}
                            draggableId={opportunity.id}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <Card
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={cn(
                                  "p-4 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow",
                                  snapshot.isDragging && "shadow-lg rotate-2"
                                )}
                                onClick={() => handleEditOpportunity(opportunity)}
                              >
                                {/* Opportunity Card Content */}
                                <div className="space-y-3">
                                  {/* Title and Menu */}
                                  <div className="flex items-start justify-between gap-2">
                                    <h4 className="font-medium text-gray-900 text-sm line-clamp-2 flex-1">
                                      {opportunity.title}
                                    </h4>

                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0 flex-shrink-0"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <MoreVertical className="w-3 h-3" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleEditOpportunity(opportunity)}>
                                          <PenSquare className="w-4 h-4 mr-2" />
                                          Editar
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          className="text-red-600"
                                          onClick={() => handleDeleteOpportunity(opportunity)}
                                        >
                                          <Trash2 className="w-4 h-4 mr-2" />
                                          Excluir
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>

                                  {/* Lead Info */}
                                  {opportunity.lead && (
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2 text-xs text-gray-600">
                                        <Building2 className="w-3 h-3" />
                                        <span className="truncate">{opportunity.lead.company || opportunity.lead.name}</span>
                                      </div>
                                      {opportunity.lead.phone && (
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                          <Phone className="w-3 h-3" />
                                          <span>{opportunity.lead.phone}</span>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Value and Probability */}
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1 text-green-700 font-medium text-sm">
                                      <DollarSign className="w-4 h-4" />
                                      {formatCurrency(opportunity.estimated_value)}
                                    </div>
                                    <div className="flex items-center gap-1 text-blue-600 text-xs">
                                      <TrendingUp className="w-3 h-3" />
                                      {opportunity.probability}%
                                    </div>
                                  </div>

                                  {/* Responsible */}
                                  {opportunity.responsible && (
                                    <div className="flex items-center gap-2 text-xs text-gray-600">
                                      <User className="w-3 h-3" />
                                      <span className="truncate">{opportunity.responsible.name}</span>
                                    </div>
                                  )}

                                  {/* Expected Close Date */}
                                  {opportunity.expected_close_date && (
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                      <Calendar className="w-3 h-3" />
                                      <span>Previsão: {formatDate(opportunity.expected_close_date)}</span>
                                    </div>
                                  )}

                                  {/* Tags */}
                                  {opportunity.tags && opportunity.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {opportunity.tags.map((tag, idx) => (
                                        <Badge
                                          key={idx}
                                          variant="outline"
                                          className="text-xs px-2 py-0"
                                        >
                                          {tag}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </Card>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}

                        {/* Empty State */}
                        {statusOpportunities.length === 0 && (
                          <div className="text-center py-8 text-gray-400 text-sm">
                            Nenhuma oportunidade
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </div>
      </DragDropContext>

      {/* Edit Column Dialog */}
      {selectedColumn && (
        <EditColumnDialog
          open={isEditColumnOpen}
          onOpenChange={setIsEditColumnOpen}
          column={selectedColumn}
          onSuccess={onOpportunityUpdate}
        />
      )}

      {/* Edit Opportunity Modal */}
      <EditOpportunityModal
        open={isEditOpportunityOpen}
        onOpenChange={setIsEditOpportunityOpen}
        opportunity={opportunityToEdit}
        onSuccess={onOpportunityUpdate}
        statuses={statuses}
      />

      {/* Delete Opportunity Confirmation Dialog */}
      <Dialog open={isDeleteOpportunityDialogOpen} onOpenChange={setIsDeleteOpportunityDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a oportunidade "{opportunityToDelete?.title}"?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteOpportunityDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteOpportunity}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Column Confirmation Dialog */}
      <Dialog open={isDeleteColumnDialogOpen} onOpenChange={setIsDeleteColumnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão de Coluna</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a coluna "{columnToDelete?.name}"?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteColumnDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteColumn}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
