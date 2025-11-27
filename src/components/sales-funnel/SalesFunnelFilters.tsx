'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Filter, X, RotateCcw } from 'lucide-react';
import { devLog } from '@/lib/utils/productionLogger';

export interface SalesFunnelFilterOptions {
  responsibleId?: string;
  minValue?: number;
  maxValue?: number;
  minProbability?: number;
  maxProbability?: number;
  dateFrom?: string;
  dateTo?: string;
  hasLead?: boolean;
}

interface SalesFunnelFiltersProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyFilters: (filters: SalesFunnelFilterOptions) => void;
  activeFiltersCount: number;
}

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
}

export function SalesFunnelFilters({
  open,
  onOpenChange,
  onApplyFilters,
  activeFiltersCount
}: SalesFunnelFiltersProps) {
  const [responsibleId, setResponsibleId] = useState<string>('');
  const [minValue, setMinValue] = useState<string>('');
  const [maxValue, setMaxValue] = useState<string>('');
  const [minProbability, setMinProbability] = useState<string>('');
  const [maxProbability, setMaxProbability] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [hasLead, setHasLead] = useState<string>('');

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);

  // Carregar membros da equipe
  useEffect(() => {
    if (open) {
      loadTeamMembers();
    }
  }, [open]);

  const loadTeamMembers = async () => {
    setLoadingTeam(true);
    try {
      const response = await fetch('/api/admin/team-members');
      const data = await response.json();

      if (data.success) {
        setTeamMembers(data.data || []);
      }
    } catch (error) {
      devLog.error('[SalesFunnelFilters] Erro ao carregar equipe:', error);
    } finally {
      setLoadingTeam(false);
    }
  };

  const handleApply = () => {
    const filters: SalesFunnelFilterOptions = {};

    if (responsibleId) filters.responsibleId = responsibleId;
    if (minValue) filters.minValue = parseFloat(minValue);
    if (maxValue) filters.maxValue = parseFloat(maxValue);
    if (minProbability) filters.minProbability = parseFloat(minProbability);
    if (maxProbability) filters.maxProbability = parseFloat(maxProbability);
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;
    if (hasLead === 'yes') filters.hasLead = true;
    if (hasLead === 'no') filters.hasLead = false;

    devLog.log('[SalesFunnelFilters] Aplicando filtros:', filters);
    onApplyFilters(filters);
    onOpenChange(false);
  };

  const handleClearAll = () => {
    setResponsibleId('');
    setMinValue('');
    setMaxValue('');
    setMinProbability('');
    setMaxProbability('');
    setDateFrom('');
    setDateTo('');
    setHasLead('');

    onApplyFilters({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Filter className="w-5 h-5 text-violet-600" />
            Filtros do Funil de Vendas
          </DialogTitle>
          <DialogDescription>
            Filtre as oportunidades por responsável, valor, probabilidade e mais
            {activeFiltersCount > 0 && (
              <span className="ml-2 text-violet-600 font-semibold">
                ({activeFiltersCount} filtro{activeFiltersCount > 1 ? 's' : ''} ativo{activeFiltersCount > 1 ? 's' : ''})
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Responsável */}
          <div className="space-y-2">
            <Label htmlFor="responsible" className="text-sm font-medium text-gray-700">
              Responsável
            </Label>
            <Select
              value={responsibleId}
              onValueChange={setResponsibleId}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Todos os responsáveis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os responsáveis</SelectItem>
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.full_name || member.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Valor Estimado */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Valor Estimado (R$)
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="minValue" className="text-xs text-gray-500">
                  Mínimo
                </Label>
                <div className="relative mt-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 text-sm pointer-events-none">
                    R$
                  </span>
                  <Input
                    id="minValue"
                    type="number"
                    step="0.01"
                    value={minValue}
                    onChange={(e) => setMinValue(e.target.value)}
                    placeholder="0.00"
                    className="h-11 pl-14"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="maxValue" className="text-xs text-gray-500">
                  Máximo
                </Label>
                <div className="relative mt-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 text-sm pointer-events-none">
                    R$
                  </span>
                  <Input
                    id="maxValue"
                    type="number"
                    step="0.01"
                    value={maxValue}
                    onChange={(e) => setMaxValue(e.target.value)}
                    placeholder="0.00"
                    className="h-11 pl-14"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Probabilidade */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Probabilidade (%)
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="minProbability" className="text-xs text-gray-500">
                  Mínima
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="minProbability"
                    type="number"
                    min="0"
                    max="100"
                    value={minProbability}
                    onChange={(e) => setMinProbability(e.target.value)}
                    placeholder="0"
                    className="h-11 pr-10"
                  />
                  <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 text-sm pointer-events-none">
                    %
                  </span>
                </div>
              </div>
              <div>
                <Label htmlFor="maxProbability" className="text-xs text-gray-500">
                  Máxima
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="maxProbability"
                    type="number"
                    min="0"
                    max="100"
                    value={maxProbability}
                    onChange={(e) => setMaxProbability(e.target.value)}
                    placeholder="100"
                    className="h-11 pr-10"
                  />
                  <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 text-sm pointer-events-none">
                    %
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Data de Fechamento Prevista */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Data de Fechamento Prevista
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dateFrom" className="text-xs text-gray-500">
                  De
                </Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-11 mt-1"
                />
              </div>
              <div>
                <Label htmlFor="dateTo" className="text-xs text-gray-500">
                  Até
                </Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-11 mt-1"
                />
              </div>
            </div>
          </div>

          {/* Vinculado a Lead */}
          <div className="space-y-2">
            <Label htmlFor="hasLead" className="text-sm font-medium text-gray-700">
              Vinculado a Lead
            </Label>
            <Select
              value={hasLead}
              onValueChange={setHasLead}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="yes">Sim - Convertido de lead</SelectItem>
                <SelectItem value="no">Não - Criado diretamente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={handleClearAll}
            className="flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Limpar Filtros
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleApply}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              <Filter className="w-4 h-4 mr-2" />
              Aplicar Filtros
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
