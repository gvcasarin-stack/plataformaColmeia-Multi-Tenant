'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import { getCargaPotenciaTotalKw, getCargaDemandaKw, getTotalPotenciaCargas, getTotalDemandaCargas, fmtBR } from '@/lib/utils/equipmentParser';
import type { CargaItem } from '@/lib/utils/equipmentParser';

const EMPTY_CARGA: CargaItem = {
  quantidade: '1',
  equipamento: '',
  potencia_unitaria_w: '',
  fator_demanda: '1',
};

interface Props {
  items: CargaItem[];
  onChange: (items: CargaItem[]) => void;
}

export function RelacaoCargasEditor({ items, onChange }: Props) {
  function addItem() {
    onChange([...items, { ...EMPTY_CARGA }]);
  }

  function removeItem(idx: number) {
    onChange(items.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, patch: Partial<CargaItem>) {
    const copy = [...items];
    copy[idx] = { ...copy[idx], ...patch };
    onChange(copy);
  }

  return (
    <div className="space-y-2">
      {items.map((item, idx) => {
        const potenciaTotal = getCargaPotenciaTotalKw(item);
        const demanda = getCargaDemandaKw(item);
        return (
          <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
            <div className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-end">
              <div>
                <Label className="text-[11px] text-gray-500">Quantidade</Label>
                <Input
                  value={item.quantidade}
                  onChange={e => updateItem(idx, { quantidade: e.target.value })}
                  placeholder="1"
                  className="h-7 text-xs mt-0.5"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-[11px] text-gray-500">Equipamento</Label>
                <Input
                  value={item.equipamento}
                  onChange={e => updateItem(idx, { equipamento: e.target.value })}
                  placeholder="Ex: Chuveiro elétrico"
                  className="h-7 text-xs mt-0.5"
                />
              </div>
              <div>
                <Label className="text-[11px] text-gray-500">Pot. Unit. (W)</Label>
                <Input
                  value={item.potencia_unitaria_w}
                  onChange={e => updateItem(idx, { potencia_unitaria_w: e.target.value })}
                  placeholder="Ex: 5500"
                  className="h-7 text-xs mt-0.5"
                />
              </div>
              <div>
                <Label className="text-[11px] text-gray-500">Fator de Demanda</Label>
                <Input
                  value={item.fator_demanda}
                  onChange={e => updateItem(idx, { fator_demanda: e.target.value })}
                  placeholder="Ex: 0,8"
                  className="h-7 text-xs mt-0.5"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-gray-400 hover:text-red-500 shrink-0"
                  onClick={() => removeItem(idx)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-4 text-[11px] text-gray-500 dark:text-gray-400">
              <span>Potência total: <strong className="text-gray-700 dark:text-gray-300">{fmtBR(potenciaTotal)} kW</strong></span>
              <span>Demanda: <strong className="text-gray-700 dark:text-gray-300">{fmtBR(demanda)} kW</strong></span>
            </div>
          </div>
        );
      })}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addItem}
        className="w-full border-dashed text-gray-500 hover:text-gray-700 hover:border-gray-400"
      >
        <Plus className="h-3.5 w-3.5 mr-1" />
        Adicionar Carga
      </Button>

      {items.length > 0 && (
        <div className="flex items-center gap-4 text-xs font-medium text-gray-700 dark:text-gray-300 pt-1">
          <span>Potência total: {fmtBR(getTotalPotenciaCargas(items))} kW</span>
          <span>Demanda total: {fmtBR(getTotalDemandaCargas(items))} kW</span>
        </div>
      )}
    </div>
  );
}
