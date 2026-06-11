'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BookOpen,
  Plus,
  Trash2,
  Loader2,
  Edit,
  Search,
  Zap,
  LayoutGrid,
} from 'lucide-react';
import type { EquipmentCatalogItem } from '@/lib/services/equipmentCatalogService';

type ActiveTab = 'modulo' | 'inversor';

type FormData = Partial<Omit<EquipmentCatalogItem, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>>;

const EMPTY_FORM: FormData = {
  tipo: 'modulo',
  fabricante: '',
  modelo: '',
  potencia_wp: undefined,
  voc: undefined,
  isc: undefined,
  vpmp: undefined,
  ipmp: undefined,
  eficiencia: undefined,
  comprimento_m: undefined,
  largura_m: undefined,
  area_unitaria_m2: undefined,
  peso_kg: undefined,
  potencia_kw: undefined,
  tensao: '',
  vcc_max: undefined,
  icc_max: undefined,
  vpmp_max: undefined,
  vpmp_min: undefined,
  vcc_partida: undefined,
  faixa_tensao: '',
  corrente_nominal: undefined,
  fator_potencia: '',
  rendimento: undefined,
  dht_corrente: undefined,
  entradas_por_mppt: undefined,
  quantidade_mppt: undefined,
  potencia_max_saida: undefined,
  tensao_max_ca: undefined,
  tensao_min_ca: undefined,
  tipo_conexao_saida: '',
};

function numField(val: number | null | undefined): string {
  if (val === null || val === undefined) return '';
  return String(val);
}

function parseNum(val: string): number | null {
  if (val === '' || val === undefined) return null;
  const n = parseFloat(val.replace(',', '.'));
  return isNaN(n) ? null : n;
}

function FieldNum({
  label, value, onChange, placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <Label className="text-xs text-gray-500">{label}</Label>
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? ''}
        className="mt-1 h-8 text-sm"
      />
    </div>
  );
}

export default function CatalogoEquipamentosPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin'
    || user?.profile?.role === 'admin' || user?.profile?.role === 'superadmin';

  const [activeTab, setActiveTab] = useState<ActiveTab>('modulo');
  const [items, setItems] = useState<EquipmentCatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EquipmentCatalogItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EquipmentCatalogItem | null>(null);

  // Form state (string para inputs numéricos para evitar conflitos de formato)
  const [form, setForm] = useState<FormData>({ ...EMPTY_FORM, tipo: 'modulo' });
  const [numFields, setNumFields] = useState<Record<string, string>>({});

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ tipo: activeTab });
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      const resp = await fetch(`/api/admin/equipment-catalog?${params}`);
      const result = await resp.json();
      if (!result.success) throw new Error(result.error);
      setItems(result.data || []);
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message || 'Falha ao carregar catálogo.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  function openNew() {
    setEditingItem(null);
    const base: FormData = { ...EMPTY_FORM, tipo: activeTab };
    setForm(base);
    setNumFields({});
    setModalOpen(true);
  }

  function openEdit(item: EquipmentCatalogItem) {
    setEditingItem(item);
    setForm({
      tipo: item.tipo,
      fabricante: item.fabricante,
      modelo: item.modelo,
      tensao: item.tensao || '',
      faixa_tensao: item.faixa_tensao || '',
      fator_potencia: item.fator_potencia || '',
      tipo_conexao_saida: item.tipo_conexao_saida || '',
    });
    // Populate numeric fields as strings
    const nums: Record<string, string> = {};
    const numKeys = [
      'potencia_wp', 'voc', 'isc', 'vpmp', 'ipmp', 'eficiencia',
      'comprimento_m', 'largura_m', 'area_unitaria_m2', 'peso_kg',
      'potencia_kw', 'vcc_max', 'icc_max', 'vpmp_max', 'vpmp_min', 'vcc_partida',
      'corrente_nominal', 'rendimento', 'dht_corrente',
      'entradas_por_mppt', 'quantidade_mppt', 'potencia_max_saida',
      'tensao_max_ca', 'tensao_min_ca',
    ] as const;
    for (const key of numKeys) {
      nums[key] = numField((item as any)[key]);
    }
    setNumFields(nums);
    setModalOpen(true);
  }

  function setN(key: string, val: string) {
    setNumFields(prev => ({ ...prev, [key]: val }));
  }

  function setF(key: keyof FormData, val: string) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  function buildPayload(): FormData {
    const payload: any = {
      tipo: activeTab,
      fabricante: (form.fabricante || '').trim(),
      modelo: (form.modelo || '').trim(),
    };
    // String fields
    if (activeTab === 'inversor') {
      payload.tensao = form.tensao || null;
      payload.faixa_tensao = form.faixa_tensao || null;
      payload.fator_potencia = form.fator_potencia || null;
      payload.tipo_conexao_saida = form.tipo_conexao_saida || null;
    }
    // Numeric fields
    const numericKeys = activeTab === 'modulo'
      ? ['potencia_wp', 'voc', 'isc', 'vpmp', 'ipmp', 'eficiencia', 'comprimento_m', 'largura_m', 'area_unitaria_m2', 'peso_kg']
      : ['potencia_kw', 'vcc_max', 'icc_max', 'vpmp_max', 'vpmp_min', 'vcc_partida',
         'corrente_nominal', 'rendimento', 'dht_corrente',
         'entradas_por_mppt', 'quantidade_mppt', 'potencia_max_saida',
         'tensao_max_ca', 'tensao_min_ca'];
    for (const key of numericKeys) {
      payload[key] = parseNum(numFields[key] || '');
    }
    return payload;
  }

  async function handleSave() {
    const payload = buildPayload();
    if (!payload.fabricante || !payload.modelo) {
      toast({ title: 'Preencha os campos obrigatórios', description: 'Fabricante e modelo são obrigatórios.', variant: 'destructive' });
      return;
    }
    const potenciaKey = activeTab === 'modulo' ? 'potencia_wp' : 'potencia_kw';
    if (!payload[potenciaKey]) {
      toast({ title: 'Preencha os campos obrigatórios', description: 'Potência é obrigatória.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      let resp: Response;
      if (editingItem) {
        resp = await fetch(`/api/admin/equipment-catalog/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        resp = await fetch('/api/admin/equipment-catalog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      const result = await resp.json();
      if (!result.success) throw new Error(result.error);
      toast({ title: editingItem ? 'Equipamento atualizado' : 'Equipamento cadastrado' });
      setModalOpen(false);
      fetchItems();
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      const resp = await fetch(`/api/admin/equipment-catalog/${deleteTarget.id}`, { method: 'DELETE' });
      const result = await resp.json();
      if (!result.success) throw new Error(result.error);
      toast({ title: 'Equipamento excluído' });
      setDeleteTarget(null);
      fetchItems();
    } catch (err: any) {
      toast({ title: 'Erro ao excluir', description: err.message, variant: 'destructive' });
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-gray-500 text-lg">Acesso restrito a administradores.</p>
      </div>
    );
  }

  const isModulo = activeTab === 'modulo';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 p-8 text-white shadow-lg">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold">Catálogo de Equipamentos</h1>
          <p className="mt-2 text-emerald-100">Gerencie módulos fotovoltaicos e inversores com todos os parâmetros técnicos.</p>
        </div>
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-500/30" />
        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-teal-500/30" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {([
          { key: 'modulo' as const, label: 'Módulos Fotovoltaicos', icon: LayoutGrid },
          { key: 'inversor' as const, label: 'Inversores', icon: Zap },
        ]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => { setActiveTab(key); setSearchQuery(''); }}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === key
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Barra de busca + botão adicionar */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px] max-w-sm">
          <Label className="text-sm font-medium mb-1 block">Buscar por fabricante ou modelo</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={isModulo ? 'Ex: JA Solar, Canadian, BYD...' : 'Ex: Fronius, Deye, SMA...'}
              className="pl-9"
            />
          </div>
        </div>
        <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700 text-white" size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Novo {isModulo ? 'módulo' : 'inversor'}
        </Button>
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
          <span className="ml-2 text-gray-500">Carregando...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="border border-dashed rounded-lg py-16 text-center">
          {isModulo ? <LayoutGrid className="h-10 w-10 mx-auto text-gray-300 mb-3" /> : <Zap className="h-10 w-10 mx-auto text-gray-300 mb-3" />}
          <p className="text-gray-500">Nenhum {isModulo ? 'módulo' : 'inversor'} cadastrado.</p>
          <p className="text-sm text-gray-400 mt-1">Clique em &quot;Novo&quot; para adicionar o primeiro.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Fabricante</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Modelo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">
                  {isModulo ? 'Potência (Wp)' : 'Potência (kW)'}
                </th>
                {isModulo && <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Eficiência (%)</th>}
                {!isModulo && <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Tensão</th>}
                {!isModulo && <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Conexão</th>}
                <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{item.fabricante}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{item.modelo}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {isModulo
                      ? (item.potencia_wp != null ? item.potencia_wp : '—')
                      : (item.potencia_kw != null ? item.potencia_kw : '—')
                    }
                  </td>
                  {isModulo && (
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {item.eficiencia != null ? `${item.eficiencia}%` : '—'}
                    </td>
                  )}
                  {!isModulo && (
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{item.tensao || '—'}</td>
                  )}
                  {!isModulo && (
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {item.tipo_conexao_saida
                        ? <Badge variant="outline" className="text-xs">{item.tipo_conexao_saida}</Badge>
                        : '—'}
                    </td>
                  )}
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(item)} className="h-7 w-7 p-0">
                        <Edit className="h-3.5 w-3.5 text-blue-500" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(item)} className="h-7 w-7 p-0">
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de cadastro/edição */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isModulo ? <LayoutGrid className="h-5 w-5 text-emerald-600" /> : <Zap className="h-5 w-5 text-blue-600" />}
              {editingItem
                ? `Editar ${isModulo ? 'módulo' : 'inversor'}`
                : `Novo ${isModulo ? 'módulo' : 'inversor'}`}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Identificação */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Identificação</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Fabricante *</Label>
                  <Input
                    value={form.fabricante || ''}
                    onChange={e => setF('fabricante', e.target.value)}
                    placeholder="Ex: JA Solar"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm">Modelo *</Label>
                  <Input
                    value={form.modelo || ''}
                    onChange={e => setF('modelo', e.target.value)}
                    placeholder={isModulo ? 'Ex: JAM72S30-545/MR' : 'Ex: Primo 5.0-1'}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {isModulo ? (
              <>
                {/* Módulo: Potência */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Potência</p>
                  <div className="grid grid-cols-2 gap-3">
                    <FieldNum label="Potência (Wp) *" value={numFields.potencia_wp || ''} onChange={v => setN('potencia_wp', v)} placeholder="650" />
                    <FieldNum label="Eficiência (%)" value={numFields.eficiencia || ''} onChange={v => setN('eficiencia', v)} placeholder="20.1" />
                  </div>
                </div>
                {/* Módulo: Parâmetros Elétricos */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Parâmetros Elétricos</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <FieldNum label="Voc (V)" value={numFields.voc || ''} onChange={v => setN('voc', v)} placeholder="49.2" />
                    <FieldNum label="Isc (A)" value={numFields.isc || ''} onChange={v => setN('isc', v)} placeholder="13.97" />
                    <FieldNum label="Vpmp (V)" value={numFields.vpmp || ''} onChange={v => setN('vpmp', v)} placeholder="41.4" />
                    <FieldNum label="Ipmp (A)" value={numFields.ipmp || ''} onChange={v => setN('ipmp', v)} placeholder="13.38" />
                  </div>
                </div>
                {/* Módulo: Parâmetros Físicos */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Parâmetros Físicos</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <FieldNum label="Comprimento (m)" value={numFields.comprimento_m || ''} onChange={v => setN('comprimento_m', v)} placeholder="2.278" />
                    <FieldNum label="Largura (m)" value={numFields.largura_m || ''} onChange={v => setN('largura_m', v)} placeholder="1.134" />
                    <FieldNum label="Área unit. (m²)" value={numFields.area_unitaria_m2 || ''} onChange={v => setN('area_unitaria_m2', v)} placeholder="2.583" />
                    <FieldNum label="Peso (kg)" value={numFields.peso_kg || ''} onChange={v => setN('peso_kg', v)} placeholder="32.0" />
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Inversor: Potência */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Potência</p>
                  <div className="grid grid-cols-2 gap-3">
                    <FieldNum label="Potência nom. (kW) *" value={numFields.potencia_kw || ''} onChange={v => setN('potencia_kw', v)} placeholder="5.0" />
                    <FieldNum label="Potência máx. saída (kW)" value={numFields.potencia_max_saida || ''} onChange={v => setN('potencia_max_saida', v)} placeholder="5.5" />
                  </div>
                </div>
                {/* Inversor: Tensão CA */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tensão CA</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-xs text-gray-500">Tensão (V)</Label>
                      <Input value={form.tensao || ''} onChange={e => setF('tensao', e.target.value)} placeholder="220" className="mt-1 h-8 text-sm" />
                    </div>
                    <FieldNum label="Tensão máx. CA (V)" value={numFields.tensao_max_ca || ''} onChange={v => setN('tensao_max_ca', v)} placeholder="253" />
                    <FieldNum label="Tensão mín. CA (V)" value={numFields.tensao_min_ca || ''} onChange={v => setN('tensao_min_ca', v)} placeholder="180" />
                    <FieldNum label="Corrente nom. (A)" value={numFields.corrente_nominal || ''} onChange={v => setN('corrente_nominal', v)} placeholder="22.8" />
                  </div>
                </div>
                {/* Inversor: Tensão CC */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tensão CC / MPPT</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <FieldNum label="Vcc máx. (V)" value={numFields.vcc_max || ''} onChange={v => setN('vcc_max', v)} placeholder="600" />
                    <FieldNum label="Icc máx. (A)" value={numFields.icc_max || ''} onChange={v => setN('icc_max', v)} placeholder="18" />
                    <FieldNum label="Vpmp máx. (V)" value={numFields.vpmp_max || ''} onChange={v => setN('vpmp_max', v)} placeholder="500" />
                    <FieldNum label="Vpmp mín. (V)" value={numFields.vpmp_min || ''} onChange={v => setN('vpmp_min', v)} placeholder="200" />
                    <FieldNum label="Vcc partida (V)" value={numFields.vcc_partida || ''} onChange={v => setN('vcc_partida', v)} placeholder="150" />
                    <div>
                      <Label className="text-xs text-gray-500">Faixa de tensão</Label>
                      <Input value={form.faixa_tensao || ''} onChange={e => setF('faixa_tensao', e.target.value)} placeholder="200-500" className="mt-1 h-8 text-sm" />
                    </div>
                    <FieldNum label="Qtd. MPPT" value={numFields.quantidade_mppt || ''} onChange={v => setN('quantidade_mppt', v)} placeholder="2" />
                    <FieldNum label="Entradas/MPPT" value={numFields.entradas_por_mppt || ''} onChange={v => setN('entradas_por_mppt', v)} placeholder="2" />
                  </div>
                </div>
                {/* Inversor: Qualidade */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Qualidade</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <FieldNum label="Rendimento (%)" value={numFields.rendimento || ''} onChange={v => setN('rendimento', v)} placeholder="98" />
                    <FieldNum label="DHT Corrente (%)" value={numFields.dht_corrente || ''} onChange={v => setN('dht_corrente', v)} placeholder="3" />
                    <div>
                      <Label className="text-xs text-gray-500">Fator de potência</Label>
                      <Input value={form.fator_potencia || ''} onChange={e => setF('fator_potencia', e.target.value)} placeholder="1" className="mt-1 h-8 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Tipo de conexão</Label>
                      <Select value={form.tipo_conexao_saida || ''} onValueChange={v => setF('tipo_conexao_saida', v)}>
                        <SelectTrigger className="mt-1 h-8 text-sm">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Monofásico">Monofásico</SelectItem>
                          <SelectItem value="Bifásico">Bifásico</SelectItem>
                          <SelectItem value="Trifásico">Trifásico</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingItem ? 'Salvar alterações' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar exclusão */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteTarget?.fabricante} {deleteTarget?.modelo}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
