'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ChevronDown, ChevronRight, Trash2, Loader2, CheckCircle2, Plus, X,
} from 'lucide-react';
import type { ModuloItem, InversorItem, InversorUnitConfig } from '@/lib/utils/equipmentParser';
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

// Campo texto com sufixo opcional — corrige borda quando não há sufixo
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
          className={`h-7 text-xs${suffix ? ' rounded-r-none border-r-0' : ''}`}
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

// Campo select compacto
function SelectField({
  label, value, onChange, options, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; placeholder?: string;
}) {
  return (
    <div>
      <Label className="text-[11px] text-gray-500">{label}</Label>
      <Select value={value || ''} onValueChange={onChange}>
        <SelectTrigger className="h-7 text-xs mt-0.5">
          <SelectValue placeholder={placeholder ?? 'Selecione'} />
        </SelectTrigger>
        <SelectContent>
          {options.map(o => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

const TENSAO_OPTIONS = [
  { value: '127', label: '127 V' },
  { value: '220', label: '220 V' },
  { value: '380', label: '380 V' },
  { value: '800', label: '800 V' },
];

const TIPO_CONEXAO_OPTIONS = [
  { value: 'F+F+T', label: 'F+F+T' },
  { value: 'F+N+T', label: 'F+N+T' },
  { value: '3F+N+T', label: '3F+N+T' },
];

const DISJUNTOR_CORRENTE_OPTIONS = [
  10, 16, 20, 25, 30, 32, 40, 50, 60, 63, 70, 80, 100, 125, 150, 175, 200, 250,
].map(v => ({ value: String(v), label: `${v} A` }));

const DISJUNTOR_POLOS_OPTIONS = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
];

// ─── Props ──────────────────────────────────────────────────────────────────

interface EquipamentoListItemModuloProps {
  tipo: 'modulo';
  item: ModuloItem;
  index: number;
  onUpdate: (updated: ModuloItem) => void;
  onRemove: () => void;
  hideStrings?: boolean;
}

interface EquipamentoListItemInversorProps {
  tipo: 'inversor';
  item: InversorItem;
  index: number;
  onUpdate: (updated: InversorItem) => void;
  onRemove: () => void;
  modulosList?: ModuloItem[];
}

type Props = EquipamentoListItemModuloProps | EquipamentoListItemInversorProps;

// ─── Component ──────────────────────────────────────────────────────────────

export function EquipamentoListItem(props: Props) {
  const { tipo, index, onRemove } = props;
  const hideStrings = tipo === 'modulo' ? ((props as EquipamentoListItemModuloProps).hideStrings ?? false) : false;
  const [expanded, setExpanded] = useState(index === 0);
  const [savingToCatalog, setSavingToCatalog] = useState(false);
  const [catalogSaved, setCatalogSaved] = useState(false);

  // Autocomplete state
  const [fabricanteInput, setFabricanteInput] = useState('');
  const [modeloInput, setModeloInput] = useState('');
  const [suggestions, setSuggestions] = useState<EquipmentCatalogItem[]>([]);
  const [loadingSugg, setLoadingSugg] = useState(false);
  const [showSugg, setShowSugg] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
        // Mantém campos de arranjo do item atual
        total_strings: (props.item as ModuloItem).total_strings || '',
        strings_modulos: (props.item as ModuloItem).strings_modulos || '[]',
        area_m2: '',
        is_microinversor: (props.item as ModuloItem).is_microinversor || 'false',
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
        tipo_conexao_rede_ca: s2s(cat.tipo_conexao_saida),
        fator_potencia: s2s(cat.fator_potencia),
        rendimento: n2s(cat.rendimento),
        dht_corrente: n2s(cat.dht_corrente),
        // Mantém campos de proteção do item atual
        disjuntor_ca_corrente_a: (props.item as InversorItem).disjuntor_ca_corrente_a || '',
        disjuntor_ca_polos: (props.item as InversorItem).disjuntor_ca_polos || '',
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

  // Auto-calcula area_m2 do módulo quando area_unitaria ou quantidade mudam e area_m2 está vazia
  const modAreaUnitaria = tipo === 'modulo' ? (props.item as ModuloItem).area_unitaria_m2 : undefined;
  const modQtd = tipo === 'modulo' ? (props.item as ModuloItem).quantidade : undefined;
  const modAreaM2 = tipo === 'modulo' ? (props.item as ModuloItem).area_m2 : undefined;

  useEffect(() => {
    if (tipo !== 'modulo') return;
    const m = props.item as ModuloItem;
    if (m.area_m2 && parseFloat(String(m.area_m2).replace(',', '.')) > 0) return;
    const unitArea = parseFloat(String(m.area_unitaria_m2 || '').replace(',', '.'));
    const qty = parseInt(String(m.quantidade || '1')) || 1;
    if (isNaN(unitArea) || unitArea <= 0) return;
    const calc = (unitArea * qty).toFixed(2).replace('.', ',');
    updateField('area_m2', calc);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modAreaUnitaria, modQtd]);

  // Auto-calcula disjuntor_ca_corrente_a a partir de corrente_nominal quando vazio
  const invCorrNominal = tipo === 'inversor' ? (props.item as InversorItem).corrente_nominal : undefined;

  useEffect(() => {
    if (tipo !== 'inversor') return;
    const inv = props.item as InversorItem;
    if (inv.disjuntor_ca_corrente_a) return;
    const corr = parseFloat(String(inv.corrente_nominal || '').replace(',', '.'));
    if (isNaN(corr) || corr <= 0) return;
    const calc = corr * 1.25;
    const vals = [10, 16, 20, 25, 30, 32, 40, 50, 60, 63, 70, 80, 100, 125, 150, 175, 200, 250];
    const nearest = [...vals].reverse().find(v => v <= calc);
    if (nearest !== undefined) updateField('disjuntor_ca_corrente_a', String(nearest));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invCorrNominal]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSugg(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Propaga alteração no units_config do inversor
  function updateUnitsConfig(newConfig: InversorUnitConfig[]) {
    (props as EquipamentoListItemInversorProps).onUpdate({
      ...(props.item as InversorItem),
      units_config: newConfig,
    });
  }

  // Sincroniza comprimento de units_config com quantidade ao alterar
  const invQtdVal = tipo === 'inversor' ? (props.item as InversorItem).quantidade : undefined;
  const invUnitsLen = tipo === 'inversor' ? ((props.item as InversorItem).units_config || []).length : 0;

  useEffect(() => {
    if (tipo !== 'inversor') return;
    const inv = props.item as InversorItem;
    const qty = parseInt(String(inv.quantidade || '1')) || 1;
    const current = inv.units_config || [];
    if (current.length === qty) return;
    const synced: InversorUnitConfig[] = Array.from({ length: qty }, (_, i) =>
      current[i] ?? { modulo_idx: 0, total_strings: 0, strings_modulos: '[]' }
    );
    updateUnitsConfig(synced);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invQtdVal, invUnitsLen]);

  const m = props.item as ModuloItem;
  const inv = props.item as InversorItem;
  const modulosListProp = tipo === 'inversor' ? ((props as EquipamentoListItemInversorProps).modulosList || []) : [];
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

  const hasCatalogId = !!(props.item as any).catalog_id;

  async function handleSaveToCatalog() {
    if (savingToCatalog || hasCatalogId || !isFilled) return;
    setSavingToCatalog(true);
    try {
      const parseN = (v: string | undefined | null) => {
        const n = parseFloat(String(v || '').replace(',', '.'));
        return isNaN(n) ? null : n;
      };
      const payload: Record<string, any> = tipo === 'modulo'
        ? {
            tipo: 'modulo',
            fabricante: m.fabricante,
            modelo: m.modelo,
            potencia_wp: parseN(m.potencia_wp),
            voc: parseN(m.voc),
            isc: parseN(m.isc),
            vpmp: parseN(m.vpmp),
            ipmp: parseN(m.ipmp),
            eficiencia: parseN(m.eficiencia),
            comprimento_m: parseN(m.comprimento_m),
            largura_m: parseN(m.largura_m),
            area_unitaria_m2: parseN(m.area_unitaria_m2),
            peso_kg: parseN(m.peso_kg),
          }
        : {
            tipo: 'inversor',
            fabricante: inv.fabricante,
            modelo: inv.modelo,
            potencia_kw: parseN(inv.potencia),
            potencia_max_saida: parseN(inv.potencia_max_saida),
            tensao: inv.tensao || null,
            tensao_max_ca: parseN(inv.tensao_max_ca),
            tensao_min_ca: parseN(inv.tensao_min_ca),
            faixa_tensao: inv.faixa_tensao || null,
            vcc_max: parseN(inv.vcc_max),
            icc_max: parseN(inv.icc_max),
            vpmp_max: parseN(inv.vpmp_max),
            vpmp_min: parseN(inv.vpmp_min),
            vcc_partida: parseN(inv.vcc_partida),
            corrente_nominal: parseN(inv.corrente_nominal),
            quantidade_mppt: parseN(inv.quantidade_mppt),
            entradas_por_mppt: parseN(inv.entradas_por_mppt),
            tipo_conexao_saida: inv.tipo_conexao_saida || null,
            fator_potencia: inv.fator_potencia || null,
            rendimento: parseN(inv.rendimento),
            dht_corrente: parseN(inv.dht_corrente),
          };
      const resp = await fetch('/api/admin/equipment-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await resp.json();
      if (result.success && result.data?.id) {
        if (tipo === 'modulo') {
          (props as EquipamentoListItemModuloProps).onUpdate({ ...m, catalog_id: result.data.id });
        } else {
          (props as EquipamentoListItemInversorProps).onUpdate({ ...inv, catalog_id: result.data.id });
        }
        setCatalogSaved(true);
        setTimeout(() => setCatalogSaved(false), 3000);
      }
    } catch {
      // silent
    } finally {
      setSavingToCatalog(false);
    }
  }

  // Strings por módulo (módulo)
  const totalStrings = parseInt(String(m.total_strings || '0')) || 0;
  let stringsModulos: string[] = [];
  try { stringsModulos = JSON.parse(m.strings_modulos || '[]'); } catch { stringsModulos = []; }

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

            {/* Potência + Quantidade compacta */}
            <div className="flex gap-2">
              <div className="flex-1">
                <Field
                  label={tipo === 'modulo' ? 'Potência (Wp) *' : 'Potência nominal (kW) *'}
                  value={tipo === 'modulo' ? (m.potencia_wp || '') : (inv.potencia || '')}
                  onChange={v => updateField(tipo === 'modulo' ? 'potencia_wp' : 'potencia', v)}
                  suffix={tipo === 'modulo' ? 'Wp' : 'kW'}
                  placeholder={tipo === 'modulo' ? '650' : '5,0'}
                />
              </div>
              <div className="w-24">
                <Field
                  label="Quantidade"
                  value={props.item.quantidade || '1'}
                  onChange={v => updateField('quantidade', v)}
                  placeholder="1"
                />
              </div>
            </div>

            {/* Salvar no catálogo */}
            <div className="flex justify-end mt-1">
              {hasCatalogId ? (
                <span className="text-[11px] text-green-600 dark:text-green-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> No catálogo
                </span>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!isFilled || savingToCatalog}
                  onClick={handleSaveToCatalog}
                  className={`text-[11px] h-7 px-2 transition-colors ${
                    isFilled
                      ? 'border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400 dark:border-green-700 dark:text-green-400'
                      : 'border-red-200 text-red-400 opacity-50 cursor-not-allowed dark:border-red-800 dark:text-red-600'
                  }`}
                >
                  {savingToCatalog
                    ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Salvando...</>
                    : catalogSaved
                    ? <><CheckCircle2 className="h-3 w-3 mr-1" />Salvo!</>
                    : 'Salvar no catálogo'
                  }
                </Button>
              )}
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

              {/* Arranjo / Strings */}
              {!hideStrings && <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Arranjo / Strings</p>
                <div className="space-y-2">
                  {/* Microinversor */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`micro-${index}`}
                      checked={m.is_microinversor === 'true'}
                      onChange={e => {
                        const isMicro = e.target.checked;
                        updateField('is_microinversor', isMicro ? 'true' : 'false');
                        if (isMicro) {
                          updateField('total_strings', '');
                          updateField('strings_modulos', '[]');
                        }
                      }}
                      className="h-3 w-3 cursor-pointer"
                    />
                    <label htmlFor={`micro-${index}`} className="text-[11px] text-gray-500 cursor-pointer">
                      Microinversor (sem strings)
                    </label>
                  </div>

                  {m.is_microinversor !== 'true' && (
                    <>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Field
                            label="Total de Strings"
                            value={m.total_strings || ''}
                            onChange={v => {
                              updateField('total_strings', v);
                              const n = parseInt(v) || 0;
                              const arr = Array.from({ length: n }, (_, i) => stringsModulos[i] || '');
                              updateField('strings_modulos', JSON.stringify(arr));
                            }}
                            placeholder="Nº de strings"
                          />
                        </div>
                        <div className="flex-1">
                          <Field
                            label="Área do Arranjo (m²)"
                            value={m.area_m2 || ''}
                            onChange={v => updateField('area_m2', v)}
                            suffix="m²"
                            placeholder="auto"
                          />
                        </div>
                      </div>

                      {totalStrings > 0 && (
                        <div className="space-y-1 pl-2 border-l-2 border-blue-200 dark:border-blue-800">
                          {Array.from({ length: totalStrings }, (_, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <Label className="text-[10px] text-gray-500 whitespace-nowrap w-32">String {i + 1} — Módulos</Label>
                              <Input
                                type="number"
                                min="1"
                                value={stringsModulos[i] || ''}
                                onChange={e => {
                                  const arr = [...stringsModulos];
                                  while (arr.length < totalStrings) arr.push('');
                                  arr[i] = e.target.value;
                                  updateField('strings_modulos', JSON.stringify(arr));
                                }}
                                placeholder="Qtd."
                                className="h-7 text-xs"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {m.is_microinversor === 'true' && (
                    <p className="text-[11px] text-blue-500 italic">Microinversor — strings não se aplicam.</p>
                  )}
                </div>
              </div>}
            </>
          )}

          {/* Inversor: parâmetros */}
          {tipo === 'inversor' && (
            <>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Entrada CC</p>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Vcc máx. (V)" value={inv.vcc_max || ''} onChange={v => updateField('vcc_max', v)} suffix="V" placeholder="600" />
                  <Field label="Icc máx. (A)" value={inv.icc_max || ''} onChange={v => updateField('icc_max', v)} suffix="A" placeholder="18" />
                  <Field label="Vpmp máx. (V)" value={inv.vpmp_max || ''} onChange={v => updateField('vpmp_max', v)} suffix="V" placeholder="500" />
                  <Field label="Vpmp mín. (V)" value={inv.vpmp_min || ''} onChange={v => updateField('vpmp_min', v)} suffix="V" placeholder="200" />
                  <Field label="Vcc partida (V)" value={inv.vcc_partida || ''} onChange={v => updateField('vcc_partida', v)} suffix="V" placeholder="150" />
                  <Field label="Qtd. MPPT" value={inv.quantidade_mppt || ''} onChange={v => updateField('quantidade_mppt', v)} placeholder="2" />
                  <Field label="Entradas/MPPT" value={inv.entradas_por_mppt || ''} onChange={v => updateField('entradas_por_mppt', v)} placeholder="2" />
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Saída CA</p>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Pot. máx. saída (kW)" value={inv.potencia_max_saida || ''} onChange={v => updateField('potencia_max_saida', v)} suffix="kW" />
                  <SelectField
                    label="Tensão nom. CA (V) *"
                    value={inv.tensao || ''}
                    onChange={v => updateField('tensao', v)}
                    options={TENSAO_OPTIONS}
                    placeholder="Selecione"
                  />
                  <Field label="Tensão máx. CA (V)" value={inv.tensao_max_ca || ''} onChange={v => updateField('tensao_max_ca', v)} suffix="V" placeholder="253" />
                  <Field label="Tensão mín. CA (V)" value={inv.tensao_min_ca || ''} onChange={v => updateField('tensao_min_ca', v)} suffix="V" placeholder="180" />
                  <Field label="Faixa de tensão" value={inv.faixa_tensao || ''} onChange={v => updateField('faixa_tensao', v)} placeholder="200-500" />
                  <Field label="Corrente nom. (A)" value={inv.corrente_nominal || ''} onChange={v => updateField('corrente_nominal', v)} suffix="A" placeholder="22,8" />
                  <SelectField
                    label="Tipo de conexão *"
                    value={inv.tipo_conexao_saida || ''}
                    onChange={v => updateField('tipo_conexao_saida', v)}
                    options={TIPO_CONEXAO_OPTIONS}
                    placeholder="Selecione"
                  />
                  <SelectField
                    label="Conexão de rede CA *"
                    value={inv.tipo_conexao_rede_ca || ''}
                    onChange={v => updateField('tipo_conexao_rede_ca', v)}
                    options={[{ value: 'Monofásico', label: 'Monofásico' }, { value: 'Trifásico', label: 'Trifásico' }]}
                    placeholder="Selecione"
                  />
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Proteção CA</p>
                <div className="grid grid-cols-2 gap-2">
                  <SelectField
                    label="Disjuntor CA — Corrente (A) *"
                    value={inv.disjuntor_ca_corrente_a || ''}
                    onChange={v => updateField('disjuntor_ca_corrente_a', v)}
                    options={DISJUNTOR_CORRENTE_OPTIONS}
                    placeholder="Auto"
                  />
                  <SelectField
                    label="Disjuntor CA — Nº de Polos"
                    value={inv.disjuntor_ca_polos || ''}
                    onChange={v => updateField('disjuntor_ca_polos', v)}
                    options={DISJUNTOR_POLOS_OPTIONS}
                    placeholder="Polos"
                  />
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

              {/* Arranjo Fotovoltaico — strings e módulos por unidade */}
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Arranjo Fotovoltaico</p>
                <div className="space-y-4">
                  {Array.from({ length: Math.max(1, parseInt(String(inv.quantidade || '1')) || 1) }, (_, unitIdx) => {
                    const qty = parseInt(String(inv.quantidade || '1')) || 1;
                    const currentConfigs = inv.units_config || [];
                    const cfg: InversorUnitConfig = currentConfigs[unitIdx] ?? { modulo_idx: 0, total_strings: 0, strings_modulos: '[]' };
                    const unitTotalStrings = cfg.total_strings || 0;
                    let unitStringsModulos: string[] = [];
                    try { unitStringsModulos = JSON.parse(cfg.strings_modulos || '[]'); } catch {}
                    const selectedMod = modulosListProp[cfg.modulo_idx ?? 0];
                    const modPotWp = parseFloat(String(selectedMod?.potencia_wp || '').replace(',', '.'));
                    const unitTotalMods = unitStringsModulos.reduce((s, n) => s + (parseInt(String(n)) || 0), 0);
                    const unitKwpText = !isNaN(modPotWp) && modPotWp > 0 && unitTotalMods > 0
                      ? ((modPotWp * unitTotalMods) / 1000).toFixed(2).replace('.', ',')
                      : null;

                    function updateUnit(newCfg: InversorUnitConfig) {
                      const base = Array.from({ length: qty }, (_, i) =>
                        currentConfigs[i] ?? { modulo_idx: 0, total_strings: 0, strings_modulos: '[]' }
                      );
                      base[unitIdx] = newCfg;
                      updateUnitsConfig(base);
                    }

                    return (
                      <div key={unitIdx} className={qty > 1 ? 'pl-3 border-l-2 border-blue-100 dark:border-blue-900' : ''}>
                        {qty > 1 && (
                          <p className="text-[10px] font-semibold text-blue-500 dark:text-blue-400 mb-2">
                            Unidade {unitIdx + 1}
                          </p>
                        )}

                        {/* Módulo conectado */}
                        {modulosListProp.length === 0 && (
                          <p className="text-[11px] text-amber-500 italic mb-2">Configure os módulos fotovoltaicos primeiro.</p>
                        )}
                        {modulosListProp.length === 1 && (
                          <p className="text-[11px] text-gray-500 mb-2">
                            Módulo: <span className="font-medium text-gray-700 dark:text-gray-300">
                              {modulosListProp[0].fabricante} {modulosListProp[0].modelo}
                              {modulosListProp[0].potencia_wp ? ` — ${modulosListProp[0].potencia_wp} Wp` : ''}
                            </span>
                          </p>
                        )}
                        {modulosListProp.length > 1 && (
                          <SelectField
                            label="Módulo conectado"
                            value={String(cfg.modulo_idx ?? 0)}
                            onChange={v => updateUnit({ ...cfg, modulo_idx: parseInt(v) || 0 })}
                            options={modulosListProp.map((mm, mi) => ({
                              value: String(mi),
                              label: `${mm.fabricante} ${mm.modelo}${mm.potencia_wp ? ` (${mm.potencia_wp} Wp)` : ''}`,
                            }))}
                          />
                        )}

                        {/* Strings dinâmicas */}
                        <div className="mt-2 space-y-1">
                          {unitStringsModulos.map((count, si) => (
                            <div key={si} className="flex items-center gap-1.5">
                              <span className="text-[10px] text-gray-400 shrink-0 w-16">String {si + 1}</span>
                              <Input
                                type="number"
                                min="1"
                                value={String(count) || ''}
                                onChange={e => {
                                  const arr = [...unitStringsModulos];
                                  arr[si] = e.target.value;
                                  updateUnit({ ...cfg, total_strings: arr.length, strings_modulos: JSON.stringify(arr) });
                                }}
                                placeholder="Módulos"
                                className="h-7 text-xs flex-1"
                              />
                              <span className="text-[10px] text-gray-400 shrink-0">mód.</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-gray-400 hover:text-red-500 shrink-0"
                                onClick={() => {
                                  const arr = unitStringsModulos.filter((_, i) => i !== si);
                                  updateUnit({ ...cfg, total_strings: arr.length, strings_modulos: JSON.stringify(arr) });
                                }}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const arr = [...unitStringsModulos, ''];
                              updateUnit({ ...cfg, total_strings: arr.length, strings_modulos: JSON.stringify(arr) });
                            }}
                            className="w-full mt-0.5 border-dashed text-gray-500 hover:text-gray-700 hover:border-gray-400"
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Adicionar String
                          </Button>
                          {unitTotalMods > 0 && (
                            <p className="text-[11px] text-blue-600 dark:text-blue-400">
                              {unitTotalMods} módulos{unitKwpText ? ` — ${unitKwpText} kWp` : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
