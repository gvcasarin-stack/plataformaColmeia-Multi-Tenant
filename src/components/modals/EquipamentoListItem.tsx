'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  ChevronDown, ChevronRight, Trash2, Loader2, CheckCircle2,
} from 'lucide-react';
import type { ModuloItem, InversorItem } from '@/lib/utils/equipmentParser';
import type { EquipmentCatalogItem } from '@/lib/services/equipmentCatalogService';

type Tipo = 'modulo' | 'inversor';

// ─── helpers ────────────────────────────────────────────────────────────────

function n2s(v: number | null | undefined): string {
  if (v === null || v === undefined) return '';
  return String(v).replace('.', ',');
}

function s2s(v: string | null | undefined): string {
  return v || '';
}

function Field({
  label, value, onChange, suffix, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void;
  suffix?: string; placeholder?: string;
}) {
  return (
    <div>
      <Label className="text-[11px] text-gray-500">{label}</Label>
      <div className="flex mt-0.5">
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-7 text-xs rounded-r-none border-r-0"
        />
        {suffix && (
          <span className="h-7 px-2 flex items-center text-xs bg-gray-50 dark:bg-gray-800 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r text-gray-500">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface EquipamentoListItemModuloProps {
  tipo: 'modulo';
  item: ModuloItem;
  index: number;
  onUpdate: (updated: ModuloItem) => void;
  onRemove: () => void;
}

interface EquipamentoListItemInversorProps {
  tipo: 'inversor';
  item: InversorItem;
  index: number;
  onUpdate: (updated: InversorItem) => void;
  onRemove: () => void;
}

type Props = EquipamentoListItemModuloProps | EquipamentoListItemInversorProps;

// ─── Component ──────────────────────────────────────────────────────────────

export function EquipamentoListItem(props: Props) {
  const { tipo, index, onRemove } = props;
  const [expanded, setExpanded] = useState(index === 0);

  // Autocomplete state
  const [fabricanteInput, setFabricanteInput] = useState('');
  const [modeloInput, setModeloInput] = useState('');
  const [suggestions, setSuggestions] = useState<EquipmentCatalogItem[]>([]);
  const [loadingSugg, setLoadingSugg] = useState(false);
  const [showSugg, setShowSugg] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize inputs from item
  useEffect(() => {
    setFabricanteInput(props.item.fabricante || '');
    setModeloInput(props.item.modelo || '');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const searchCatalog = useCallback(async (q: string) => {
    if (q.length < 2) { setSuggestions([]); return; }
    setLoadingSugg(true);
    try {
      const params = new URLSearchParams({ tipo, q });
      const resp = await fetch(`/api/admin/equipment-catalog?${params}`);
      const result = await resp.json();
      setSuggestions(result.data?.slice(0, 8) || []);
    } catch {
      setSuggestions([]);
    } finally {
      setLoadingSugg(false);
    }
  }, [tipo]);

  function handleFabricanteChange(val: string) {
    setFabricanteInput(val);
    updateField('fabricante', val);
    setShowSugg(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchCatalog(val), 300);
  }

  function handleModeloChange(val: string) {
    setModeloInput(val);
    updateField('modelo', val);
    setShowSugg(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchCatalog(fabricanteInput ? `${fabricanteInput} ${val}` : val), 300);
  }

  function fillFromCatalog(cat: EquipmentCatalogItem) {
    setFabricanteInput(cat.fabricante);
    setModeloInput(cat.modelo);
    setSuggestions([]);
    setShowSugg(false);

    if (tipo === 'modulo') {
      const updated: ModuloItem = {
        catalog_id: cat.id,
        fabricante: cat.fabricante,
        modelo: cat.modelo,
        potencia_wp: n2s(cat.potencia_wp),
        quantidade: (props.item as ModuloItem).quantidade || '1',
        voc: n2s(cat.voc),
        isc: n2s(cat.isc),
        vpmp: n2s(cat.vpmp),
        ipmp: n2s(cat.ipmp),
        eficiencia: n2s(cat.eficiencia),
        comprimento_m: n2s(cat.comprimento_m),
        largura_m: n2s(cat.largura_m),
        area_unitaria_m2: n2s(cat.area_unitaria_m2),
        peso_kg: n2s(cat.peso_kg),
      };
      (props as EquipamentoListItemModuloProps).onUpdate(updated);
    } else {
      const updated: InversorItem = {
        catalog_id: cat.id,
        fabricante: cat.fabricante,
        modelo: cat.modelo,
        potencia: n2s(cat.potencia_kw),
        quantidade: (props.item as InversorItem).quantidade || '1',
        potencia_max_saida: n2s(cat.potencia_max_saida),
        tensao: s2s(cat.tensao),
        tensao_max_ca: n2s(cat.tensao_max_ca),
        tensao_min_ca: n2s(cat.tensao_min_ca),
        faixa_tensao: s2s(cat.faixa_tensao),
        vcc_max: n2s(cat.vcc_max),
        icc_max: n2s(cat.icc_max),
        vpmp_max: n2s(cat.vpmp_max),
        vpmp_min: n2s(cat.vpmp_min),
        vcc_partida: n2s(cat.vcc_partida),
        corrente_nominal: n2s(cat.corrente_nominal),
        quantidade_mppt: n2s(cat.quantidade_mppt),
        entradas_por_mppt: n2s(cat.entradas_por_mppt),
        tipo_conexao_saida: s2s(cat.tipo_conexao_saida),
        fator_potencia: s2s(cat.fator_potencia),
        rendimento: n2s(cat.rendimento),
        dht_corrente: n2s(cat.dht_corrente),
      };
      (props as EquipamentoListItemInversorProps).onUpdate(updated);
    }
  }

  function updateField(field: string, value: string) {
    if (tipo === 'modulo') {
      (props as EquipamentoListItemModuloProps).onUpdate({
        ...(props.item as ModuloItem),
        [field]: value,
      });
    } else {
      (props as EquipamentoListItemInversorProps).onUpdate({
        ...(props.item as InversorItem),
        [field]: value,
      });
    }
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSugg(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const m = props.item as ModuloItem;
  const inv = props.item as InversorItem;
  const summaryLabel = tipo === 'modulo'
    ? (m.fabricante && m.modelo
      ? `${m.fabricante} / ${m.modelo}${m.potencia_wp ? ` — ${m.potencia_wp} Wp` : ''}${m.quantidade && m.quantidade !== '1' ? ` × ${m.quantidade}` : ''}`
      : `Módulo ${index + 1}`)
    : (inv.fabricante && inv.modelo
      ? `${inv.fabricante} / ${inv.modelo}${inv.potencia ? ` — ${inv.potencia} kW` : ''}${inv.quantidade && inv.quantidade !== '1' ? ` × ${inv.quantidade}` : ''}`
      : `Inversor ${index + 1}`);

  const isFilled = tipo === 'modulo'
    ? !!(m.fabricante && m.modelo && m.potencia_wp)
    : !!(inv.fabricante && inv.modelo && inv.potencia);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800/50 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded
          ? <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
          : <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />}
        <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">{summaryLabel}</span>
        {isFilled && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 hover:text-red-500 shrink-0"
          onClick={e => { e.stopPropagation(); onRemove(); }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {expanded && (
        <div className="p-3 space-y-3" ref={containerRef}>
          {/* Identificação + Autocomplete */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Identificação</p>
            <div className="grid grid-cols-2 gap-2 mb-2">
              {/* Fabricante com autocomplete */}
              <div className="relative">
                <Label className="text-[11px] text-gray-500">Fabricante *</Label>
                <Input
                  value={fabricanteInput}
                  onChange={e => handleFabricanteChange(e.target.value)}
                  onFocus={() => fabricanteInput.length >= 2 && setShowSugg(true)}
                  placeholder="Ex: JA Solar"
                  className="mt-0.5 h-7 text-xs"
                />
                {showSugg && (loadingSugg || suggestions.length > 0) && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-0.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded shadow-lg max-h-48 overflow-y-auto">
                    {loadingSugg
                      ? <div className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-400"><Loader2 className="h-3 w-3 animate-spin" /> Buscando...</div>
                      : suggestions.map(s => (
                        <button
                          key={s.id}
                          type="button"
                          className="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                          onMouseDown={e => { e.preventDefault(); fillFromCatalog(s); }}
                        >
                          <span className="font-medium text-gray-800 dark:text-gray-200">{s.fabricante}</span>
                          <span className="text-gray-500 ml-1">{s.modelo}</span>
                          {tipo === 'modulo' && s.potencia_wp && (
                            <Badge variant="outline" className="ml-1.5 text-[10px] py-0 h-4">{s.potencia_wp} Wp</Badge>
                          )}
                          {tipo === 'inversor' && s.potencia_kw && (
                            <Badge variant="outline" className="ml-1.5 text-[10px] py-0 h-4">{s.potencia_kw} kW</Badge>
                          )}
                        </button>
                      ))
                    }
                  </div>
                )}
              </div>

              {/* Modelo */}
              <div>
                <Label className="text-[11px] text-gray-500">Modelo *</Label>
                <Input
                  value={modeloInput}
                  onChange={e => handleModeloChange(e.target.value)}
                  placeholder={tipo === 'modulo' ? 'Ex: JAM72S30-545' : 'Ex: Primo 5.0-1'}
                  className="mt-0.5 h-7 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Field
                label={tipo === 'modulo' ? 'Potência (Wp) *' : 'Potência nominal (kW) *'}
                value={tipo === 'modulo' ? (m.potencia_wp || '') : (inv.potencia || '')}
                onChange={v => updateField(tipo === 'modulo' ? 'potencia_wp' : 'potencia', v)}
                suffix={tipo === 'modulo' ? 'Wp' : 'kW'}
                placeholder={tipo === 'modulo' ? '650' : '5,0'}
              />
              <Field
                label="Quantidade"
                value={props.item.quantidade || '1'}
                onChange={v => updateField('quantidade', v)}
                placeholder="1"
              />
            </div>
          </div>

          {/* Módulo: parâmetros elétricos */}
          {tipo === 'modulo' && (
            <>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Parâmetros Elétricos</p>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Voc (V)" value={m.voc || ''} onChange={v => updateField('voc', v)} suffix="V" placeholder="49,2" />
                  <Field label="Isc (A)" value={m.isc || ''} onChange={v => updateField('isc', v)} suffix="A" placeholder="13,97" />
                  <Field label="Vpmp (V)" value={m.vpmp || ''} onChange={v => updateField('vpmp', v)} suffix="V" placeholder="41,4" />
                  <Field label="Ipmp (A)" value={m.ipmp || ''} onChange={v => updateField('ipmp', v)} suffix="A" placeholder="13,38" />
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Parâmetros Físicos</p>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Eficiência (%)" value={m.eficiencia || ''} onChange={v => updateField('eficiencia', v)} suffix="%" placeholder="20,1" />
                  <Field label="Comprimento (m)" value={m.comprimento_m || ''} onChange={v => updateField('comprimento_m', v)} suffix="m" placeholder="2,278" />
                  <Field label="Largura (m)" value={m.largura_m || ''} onChange={v => updateField('largura_m', v)} suffix="m" placeholder="1,134" />
                  <Field label="Área unit. (m²)" value={m.area_unitaria_m2 || ''} onChange={v => updateField('area_unitaria_m2', v)} suffix="m²" placeholder="2,583" />
                  <Field label="Peso (kg)" value={m.peso_kg || ''} onChange={v => updateField('peso_kg', v)} suffix="kg" placeholder="32,0" />
                </div>
              </div>
            </>
          )}

          {/* Inversor: parâmetros */}
          {tipo === 'inversor' && (
            <>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Potência / Tensão CA</p>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Pot. máx. saída (kW)" value={inv.potencia_max_saida || ''} onChange={v => updateField('potencia_max_saida', v)} suffix="kW" />
                  <Field label="Tensão nom. CA (V)" value={inv.tensao || ''} onChange={v => updateField('tensao', v)} suffix="V" placeholder="220" />
                  <Field label="Tensão máx. CA (V)" value={inv.tensao_max_ca || ''} onChange={v => updateField('tensao_max_ca', v)} suffix="V" placeholder="253" />
                  <Field label="Tensão mín. CA (V)" value={inv.tensao_min_ca || ''} onChange={v => updateField('tensao_min_ca', v)} suffix="V" placeholder="180" />
                  <Field label="Corrente nom. (A)" value={inv.corrente_nominal || ''} onChange={v => updateField('corrente_nominal', v)} suffix="A" placeholder="22,8" />
                  <Field label="Tipo de conexão" value={inv.tipo_conexao_saida || ''} onChange={v => updateField('tipo_conexao_saida', v)} placeholder="Monofásico" />
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Tensão CC / MPPT</p>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Vcc máx. (V)" value={inv.vcc_max || ''} onChange={v => updateField('vcc_max', v)} suffix="V" placeholder="600" />
                  <Field label="Icc máx. (A)" value={inv.icc_max || ''} onChange={v => updateField('icc_max', v)} suffix="A" placeholder="18" />
                  <Field label="Vpmp máx. (V)" value={inv.vpmp_max || ''} onChange={v => updateField('vpmp_max', v)} suffix="V" placeholder="500" />
                  <Field label="Vpmp mín. (V)" value={inv.vpmp_min || ''} onChange={v => updateField('vpmp_min', v)} suffix="V" placeholder="200" />
                  <Field label="Vcc partida (V)" value={inv.vcc_partida || ''} onChange={v => updateField('vcc_partida', v)} suffix="V" placeholder="150" />
                  <Field label="Faixa de tensão" value={inv.faixa_tensao || ''} onChange={v => updateField('faixa_tensao', v)} placeholder="200-500" />
                  <Field label="Qtd. MPPT" value={inv.quantidade_mppt || ''} onChange={v => updateField('quantidade_mppt', v)} placeholder="2" />
                  <Field label="Entradas/MPPT" value={inv.entradas_por_mppt || ''} onChange={v => updateField('entradas_por_mppt', v)} placeholder="2" />
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Qualidade</p>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Rendimento (%)" value={inv.rendimento || ''} onChange={v => updateField('rendimento', v)} suffix="%" placeholder="98" />
                  <Field label="DHT corrente (%)" value={inv.dht_corrente || ''} onChange={v => updateField('dht_corrente', v)} suffix="%" placeholder="3" />
                  <Field label="Fator de potência" value={inv.fator_potencia || ''} onChange={v => updateField('fator_potencia', v)} placeholder="1" />
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
