'use client';

import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { EquipamentoListItem } from './EquipamentoListItem';
import type { ModuloItem, InversorItem } from '@/lib/utils/equipmentParser';

// ─── Módulos ────────────────────────────────────────────────────────────────

interface ModulosEditorProps {
  tipo: 'modulo';
  items: ModuloItem[];
  onChange: (items: ModuloItem[]) => void;
}

// ─── Inversores ─────────────────────────────────────────────────────────────

interface InversoresEditorProps {
  tipo: 'inversor';
  items: InversorItem[];
  onChange: (items: InversorItem[]) => void;
}

type Props = ModulosEditorProps | InversoresEditorProps;

const EMPTY_MODULO: ModuloItem = {
  fabricante: '', modelo: '', potencia_wp: '', quantidade: '1',
  voc: '', isc: '', vpmp: '', ipmp: '',
  eficiencia: '', comprimento_m: '', largura_m: '', area_unitaria_m2: '', peso_kg: '',
  total_strings: '', strings_modulos: '[]', area_m2: '', is_microinversor: 'false',
};

const EMPTY_INVERSOR: InversorItem = {
  fabricante: '', modelo: '', potencia: '', quantidade: '1',
  potencia_max_saida: '', tensao: '', tensao_max_ca: '', tensao_min_ca: '',
  faixa_tensao: '', vcc_max: '', icc_max: '', vpmp_max: '', vpmp_min: '',
  vcc_partida: '', corrente_nominal: '', quantidade_mppt: '', entradas_por_mppt: '',
  tipo_conexao_saida: '', fator_potencia: '', rendimento: '', dht_corrente: '',
  disjuntor_ca_corrente_a: '', disjuntor_ca_polos: '',
};

export function EquipamentoListEditor(props: Props) {
  const { tipo } = props;
  const label = tipo === 'modulo' ? 'Módulo' : 'Inversor';

  function addItem() {
    if (tipo === 'modulo') {
      const p = props as ModulosEditorProps;
      p.onChange([...p.items, { ...EMPTY_MODULO }]);
    } else {
      const p = props as InversoresEditorProps;
      p.onChange([...p.items, { ...EMPTY_INVERSOR }]);
    }
  }

  function removeItem(idx: number) {
    if (tipo === 'modulo') {
      const p = props as ModulosEditorProps;
      p.onChange(p.items.filter((_, i) => i !== idx));
    } else {
      const p = props as InversoresEditorProps;
      p.onChange(p.items.filter((_, i) => i !== idx));
    }
  }

  function updateItem(idx: number, updated: ModuloItem | InversorItem) {
    if (tipo === 'modulo') {
      const p = props as ModulosEditorProps;
      const copy = [...p.items];
      copy[idx] = updated as ModuloItem;
      p.onChange(copy);
    } else {
      const p = props as InversoresEditorProps;
      const copy = [...p.items];
      copy[idx] = updated as InversorItem;
      p.onChange(copy);
    }
  }

  const items = tipo === 'modulo'
    ? (props as ModulosEditorProps).items
    : (props as InversoresEditorProps).items;

  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        tipo === 'modulo' ? (
          <EquipamentoListItem
            key={idx}
            tipo="modulo"
            item={item as ModuloItem}
            index={idx}
            onUpdate={updated => updateItem(idx, updated)}
            onRemove={() => removeItem(idx)}
          />
        ) : (
          <EquipamentoListItem
            key={idx}
            tipo="inversor"
            item={item as InversorItem}
            index={idx}
            onUpdate={updated => updateItem(idx, updated)}
            onRemove={() => removeItem(idx)}
          />
        )
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addItem}
        className="w-full border-dashed text-gray-500 hover:text-gray-700 hover:border-gray-400"
      >
        <Plus className="h-3.5 w-3.5 mr-1" />
        Adicionar {label}
      </Button>
    </div>
  );
}
