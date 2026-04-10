'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  FolderArchive,
  Plus,
  Trash2,
  Upload,
  Image as ImageIcon,
  Loader2,
  Edit,
  Save,
  X,
  Search,
  FileText,
  Zap,
  LayoutGrid,
} from 'lucide-react';

const DISTRIBUIDORAS = [
  'Enel', 'Copel', 'Cemig', 'CPFL', 'Neoenergia Cosern',
  'Light', 'EDP', 'Celesc', 'Energisa', 'Equatorial',
  'RGE', 'Amazonas Energia', 'Outro',
];

const CATEGORIAS = [
  { value: 'caixa_medicao', label: 'Modelo da Caixa de Medição' },
  { value: 'padrao_entrada', label: 'Padrão de Entrada' },
  { value: 'diagrama_unifilar', label: 'Diagrama Unifilar' },
  { value: 'placa_advertencia', label: 'Placa de Advertência' },
  { value: 'outro', label: 'Outro' },
];

const TIPOS_DOCUMENTO = [
  { value: 'datasheet', label: 'Datasheet' },
  { value: 'inmetro', label: 'Registro Inmetro' },
];

const TAB_SINGULAR: Record<string, string> = {
  inversores: 'Inversor',
  modulos: 'Módulo',
};

type ActiveTab = 'distribuidoras' | 'inversores' | 'modulos';

interface AcervoItem {
  id: string;
  distribuidora: string;
  categoria: string;
  nome: string;
  descricao: string | null;
  imagem_url: string | null;
  condicoes: Record<string, any>;
  comprimento_mm: number | null;
  altura_mm: number | null;
  largura_mm: number | null;
  created_at: string;
}

interface EquipamentoItem {
  id: string;
  tipo: string;
  fabricante: string;
  modelo: string;
  tipo_documento: string;
  nome: string;
  descricao: string | null;
  arquivo_url: string | null;
  imagem_url: string | null;
  created_at: string;
}

export default function AcervoTecnicoPage() {
  const { user } = useAuth();

  // Tab state
  const [activeTab, setActiveTab] = useState<ActiveTab>('distribuidoras');

  // ── Distribuidoras state (existing, unchanged) ──
  const [selectedDistribuidora, setSelectedDistribuidora] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState('');
  const [items, setItems] = useState<AcervoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AcervoItem | null>(null);

  const [newNome, setNewNome] = useState('');
  const [newDescricao, setNewDescricao] = useState('');
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newPreview, setNewPreview] = useState<string | null>(null);
  const [newComprimento, setNewComprimento] = useState('');
  const [newAltura, setNewAltura] = useState('');
  const [newLargura, setNewLargura] = useState('');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editNome, setEditNome] = useState('');
  const [editDescricao, setEditDescricao] = useState('');
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editPreview, setEditPreview] = useState<string | null>(null);
  const [editComprimento, setEditComprimento] = useState('');
  const [editAltura, setEditAltura] = useState('');
  const [editLargura, setEditLargura] = useState('');
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // ── Equipamentos state (new) ──
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTipoDocumento, setSelectedTipoDocumento] = useState('');
  const [equipamentos, setEquipamentos] = useState<EquipamentoItem[]>([]);
  const [loadingEquipamentos, setLoadingEquipamentos] = useState(false);
  const [showAddEquipForm, setShowAddEquipForm] = useState(false);
  const [editingEquipId, setEditingEquipId] = useState<string | null>(null);
  const [deleteEquipTarget, setDeleteEquipTarget] = useState<EquipamentoItem | null>(null);
  const [savingEquip, setSavingEquip] = useState(false);

  const [equipFabricante, setEquipFabricante] = useState('');
  const [equipModelo, setEquipModelo] = useState('');
  const [equipTipoDoc, setEquipTipoDoc] = useState('datasheet');
  const [equipNome, setEquipNome] = useState('');
  const [equipDescricao, setEquipDescricao] = useState('');
  const [equipFile, setEquipFile] = useState<File | null>(null);
  const [equipPreview, setEquipPreview] = useState<string | null>(null);
  const [equipIsPdf, setEquipIsPdf] = useState(false);
  const equipFileInputRef = useRef<HTMLInputElement>(null);

  const [editEquipFabricante, setEditEquipFabricante] = useState('');
  const [editEquipModelo, setEditEquipModelo] = useState('');
  const [editEquipTipoDoc, setEditEquipTipoDoc] = useState('');
  const [editEquipNome, setEditEquipNome] = useState('');
  const [editEquipDescricao, setEditEquipDescricao] = useState('');
  const [editEquipFile, setEditEquipFile] = useState<File | null>(null);
  const [editEquipPreview, setEditEquipPreview] = useState<string | null>(null);
  const editEquipFileInputRef = useRef<HTMLInputElement>(null);

  const isSuperAdmin = user?.role === 'superadmin' || user?.profile?.role === 'superadmin';

  // ── Distribuidoras fetch (existing, unchanged) ──
  const fetchItems = useCallback(async () => {
    if (!selectedDistribuidora) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ distribuidora: selectedDistribuidora });
      if (selectedCategoria) params.set('categoria', selectedCategoria);
      const resp = await fetch(`/api/acervo-tecnico?${params.toString()}`);
      const result = await resp.json();
      if (result.error) {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' });
        return;
      }
      setItems(result.data || []);
    } catch {
      toast({ title: 'Erro', description: 'Falha ao carregar acervo técnico.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [selectedDistribuidora, selectedCategoria]);

  useEffect(() => {
    if (selectedDistribuidora) fetchItems();
  }, [selectedDistribuidora, selectedCategoria, fetchItems]);

  // ── Equipamentos fetch (new) ──
  const fetchEquipamentos = useCallback(async () => {
    const tipo = activeTab === 'inversores' ? 'inversor' : 'modulo';
    setLoadingEquipamentos(true);
    try {
      const params = new URLSearchParams({ tipo });
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (selectedTipoDocumento) params.set('tipo_documento', selectedTipoDocumento);
      const resp = await fetch(`/api/acervo-equipamentos?${params.toString()}`);
      const result = await resp.json();
      if (result.error) {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' });
        return;
      }
      setEquipamentos(result.data || []);
    } catch {
      toast({ title: 'Erro', description: 'Falha ao carregar equipamentos.', variant: 'destructive' });
    } finally {
      setLoadingEquipamentos(false);
    }
  }, [activeTab, searchQuery, selectedTipoDocumento]);

  useEffect(() => {
    if (activeTab === 'inversores' || activeTab === 'modulos') {
      fetchEquipamentos();
    }
  }, [activeTab, searchQuery, selectedTipoDocumento, fetchEquipamentos]);

  // ── Distribuidoras handlers (existing, unchanged) ──
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, mode: 'new' | 'edit') => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    if (mode === 'new') { setNewFile(file); setNewPreview(url); }
    else { setEditFile(file); setEditPreview(url); }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('distribuidora', selectedDistribuidora);
    formData.append('categoria', selectedCategoria || 'geral');
    const resp = await fetch('/api/acervo-tecnico/upload', { method: 'POST', body: formData });
    const result = await resp.json();
    if (result.error) {
      toast({ title: 'Erro no upload', description: result.error, variant: 'destructive' });
      return null;
    }
    return result.url;
  };

  const handleAdd = async () => {
    if (!newNome.trim() || !selectedDistribuidora || !selectedCategoria) {
      toast({ title: 'Preencha os campos', description: 'Nome, distribuidora e categoria são obrigatórios.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      let imageUrl: string | null = null;
      if (newFile) imageUrl = await uploadImage(newFile);
      const resp = await fetch('/api/acervo-tecnico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          distribuidora: selectedDistribuidora,
          categoria: selectedCategoria,
          nome: newNome.trim(),
          descricao: newDescricao.trim() || null,
          imagem_url: imageUrl,
          comprimento_mm: newComprimento ? parseFloat(newComprimento) : null,
          altura_mm: newAltura ? parseFloat(newAltura) : null,
          largura_mm: newLargura ? parseFloat(newLargura) : null,
        }),
      });
      const result = await resp.json();
      if (result.error) {
        toast({ title: 'Erro ao salvar', description: result.error, variant: 'destructive' });
        return;
      }
      toast({ title: 'Item adicionado', description: `"${newNome}" foi adicionado ao acervo.` });
      resetNewForm();
      fetchItems();
    } catch {
      toast({ title: 'Erro', description: 'Falha ao adicionar item.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string) => {
    setSaving(true);
    try {
      let imageUrl: string | undefined;
      if (editFile) {
        const url = await uploadImage(editFile);
        if (url) imageUrl = url;
      }
      const body: Record<string, any> = {
        id,
        nome: editNome.trim(),
        descricao: editDescricao.trim() || null,
        comprimento_mm: editComprimento ? parseFloat(editComprimento) : null,
        altura_mm: editAltura ? parseFloat(editAltura) : null,
        largura_mm: editLargura ? parseFloat(editLargura) : null,
      };
      if (imageUrl) body.imagem_url = imageUrl;
      const resp = await fetch('/api/acervo-tecnico', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await resp.json();
      if (result.error) {
        toast({ title: 'Erro ao atualizar', description: result.error, variant: 'destructive' });
        return;
      }
      toast({ title: 'Item atualizado', description: `"${editNome}" foi atualizado.` });
      setEditingId(null);
      fetchItems();
    } catch {
      toast({ title: 'Erro', description: 'Falha ao atualizar item.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const resp = await fetch(`/api/acervo-tecnico?id=${deleteTarget.id}`, { method: 'DELETE' });
      const result = await resp.json();
      if (result.error) {
        toast({ title: 'Erro ao excluir', description: result.error, variant: 'destructive' });
        return;
      }
      toast({ title: 'Item excluído', description: `"${deleteTarget.nome}" foi removido.` });
      setDeleteTarget(null);
      fetchItems();
    } catch {
      toast({ title: 'Erro', description: 'Falha ao excluir item.', variant: 'destructive' });
    }
  };

  const startEdit = (item: AcervoItem) => {
    setEditingId(item.id);
    setEditNome(item.nome);
    setEditDescricao(item.descricao || '');
    setEditPreview(item.imagem_url);
    setEditFile(null);
    setEditComprimento(item.comprimento_mm?.toString() || '');
    setEditAltura(item.altura_mm?.toString() || '');
    setEditLargura(item.largura_mm?.toString() || '');
  };

  const resetNewForm = () => {
    setShowAddForm(false);
    setNewNome(''); setNewDescricao(''); setNewFile(null);
    setNewPreview(null); setNewComprimento(''); setNewAltura(''); setNewLargura('');
  };

  // ── Equipamentos handlers (new) ──
  const handleEquipFileSelect = (e: React.ChangeEvent<HTMLInputElement>, mode: 'new' | 'edit') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isPdf = file.type === 'application/pdf';
    const isImage = file.type.startsWith('image/');
    if (!isPdf && !isImage) return;
    if (mode === 'new') {
      setEquipFile(file);
      setEquipIsPdf(isPdf);
      setEquipPreview(isPdf ? null : URL.createObjectURL(file));
    } else {
      setEditEquipFile(file);
      setEditEquipPreview(isPdf ? null : URL.createObjectURL(file));
    }
  };

  const uploadEquipFile = async (file: File, tipoDoc: string): Promise<{ url: string; isPdf: boolean } | null> => {
    const tipo = activeTab === 'inversores' ? 'inversor' : 'modulo';
    const formData = new FormData();
    formData.append('file', file);
    formData.append('tipo', tipo);
    formData.append('tipo_documento', tipoDoc);
    const resp = await fetch('/api/acervo-equipamentos/upload', { method: 'POST', body: formData });
    const result = await resp.json();
    if (result.error) {
      toast({ title: 'Erro no upload', description: result.error, variant: 'destructive' });
      return null;
    }
    return { url: result.url, isPdf: result.isPdf };
  };

  const handleAddEquip = async () => {
    if (!equipFabricante.trim() || !equipModelo.trim()) {
      toast({ title: 'Preencha os campos', description: 'Fabricante e modelo são obrigatórios.', variant: 'destructive' });
      return;
    }
    setSavingEquip(true);
    try {
      let arquivoUrl: string | null = null;
      let imagemUrl: string | null = null;
      if (equipFile) {
        const uploaded = await uploadEquipFile(equipFile, equipTipoDoc);
        if (uploaded) {
          if (uploaded.isPdf) arquivoUrl = uploaded.url;
          else imagemUrl = uploaded.url;
        }
      }
      const tipo = activeTab === 'inversores' ? 'inversor' : 'modulo';
      const nomeAuto = `${equipFabricante.trim()} ${equipModelo.trim()}`;
      const resp = await fetch('/api/acervo-equipamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo, fabricante: equipFabricante.trim(), modelo: equipModelo.trim(),
          tipo_documento: equipTipoDoc, nome: nomeAuto,
          descricao: null, arquivo_url: arquivoUrl, imagem_url: imagemUrl,
        }),
      });
      const result = await resp.json();
      if (result.error) {
        toast({ title: 'Erro ao salvar', description: result.error, variant: 'destructive' });
        return;
      }
      toast({ title: 'Item adicionado', description: `"${nomeAuto}" foi adicionado.` });
      resetEquipForm();
      fetchEquipamentos();
    } catch {
      toast({ title: 'Erro', description: 'Falha ao adicionar item.', variant: 'destructive' });
    } finally {
      setSavingEquip(false);
    }
  };

  const handleUpdateEquip = async (id: string) => {
    setSavingEquip(true);
    try {
      let arquivoUrl: string | undefined;
      let imagemUrl: string | undefined;
      if (editEquipFile) {
        const uploaded = await uploadEquipFile(editEquipFile, editEquipTipoDoc);
        if (uploaded) {
          if (uploaded.isPdf) arquivoUrl = uploaded.url;
          else imagemUrl = uploaded.url;
        }
      }
      const nomeAutoEdit = `${editEquipFabricante.trim()} ${editEquipModelo.trim()}`;
      const body: Record<string, any> = {
        id, fabricante: editEquipFabricante.trim(), modelo: editEquipModelo.trim(),
        tipo_documento: editEquipTipoDoc, nome: nomeAutoEdit,
        descricao: null,
      };
      if (arquivoUrl) body.arquivo_url = arquivoUrl;
      if (imagemUrl) body.imagem_url = imagemUrl;
      const resp = await fetch('/api/acervo-equipamentos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await resp.json();
      if (result.error) {
        toast({ title: 'Erro ao atualizar', description: result.error, variant: 'destructive' });
        return;
      }
      toast({ title: 'Item atualizado', description: `"${nomeAutoEdit}" foi atualizado.` });
      setEditingEquipId(null);
      fetchEquipamentos();
    } catch {
      toast({ title: 'Erro', description: 'Falha ao atualizar item.', variant: 'destructive' });
    } finally {
      setSavingEquip(false);
    }
  };

  const handleDeleteEquip = async () => {
    if (!deleteEquipTarget) return;
    try {
      const resp = await fetch(`/api/acervo-equipamentos?id=${deleteEquipTarget.id}`, { method: 'DELETE' });
      const result = await resp.json();
      if (result.error) {
        toast({ title: 'Erro ao excluir', description: result.error, variant: 'destructive' });
        return;
      }
      toast({ title: 'Item excluído', description: `"${deleteEquipTarget.nome}" foi removido.` });
      setDeleteEquipTarget(null);
      fetchEquipamentos();
    } catch {
      toast({ title: 'Erro', description: 'Falha ao excluir item.', variant: 'destructive' });
    }
  };

  const startEditEquip = (item: EquipamentoItem) => {
    setEditingEquipId(item.id);
    setEditEquipFabricante(item.fabricante);
    setEditEquipModelo(item.modelo);
    setEditEquipTipoDoc(item.tipo_documento);
    setEditEquipNome(item.nome);
    setEditEquipDescricao(item.descricao || '');
    setEditEquipFile(null);
    setEditEquipPreview(item.imagem_url || null);
  };

  const resetEquipForm = () => {
    setShowAddEquipForm(false);
    setEquipFabricante(''); setEquipModelo(''); setEquipTipoDoc('datasheet');
    setEquipNome(''); setEquipDescricao(''); setEquipFile(null);
    setEquipPreview(null); setEquipIsPdf(false);
  };

  const categoriaLabel = (cat: string) => CATEGORIAS.find(c => c.value === cat)?.label || cat;
  const tipoDocLabel = (td: string) => TIPOS_DOCUMENTO.find(t => t.value === td)?.label || td;

  const filteredItems = selectedCategoria
    ? items.filter(i => i.categoria === selectedCategoria)
    : items;

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-gray-500 text-lg">Acesso restrito a superadmins.</p>
      </div>
    );
  }

  const tabLabel = activeTab === 'inversores' ? 'Inversores' : 'Módulos';
  const tabSingular = TAB_SINGULAR[activeTab] ?? tabLabel;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <FolderArchive className="h-7 w-7 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Acervo Técnico</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Gerencie imagens e recursos técnicos por distribuidora.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {([
          { key: 'distribuidoras' as const, label: 'Distribuidoras', icon: FolderArchive },
          { key: 'inversores' as const, label: 'Inversores', icon: Zap },
          { key: 'modulos' as const, label: 'Módulos', icon: LayoutGrid },
        ]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === key
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab: Distribuidoras (existing content, unchanged) ── */}
      {activeTab === 'distribuidoras' && (
        <>
          <div className="flex flex-wrap gap-4">
            <div className="w-64">
              <Label className="text-sm font-medium mb-1 block">Distribuidora</Label>
              <Select value={selectedDistribuidora} onValueChange={(v) => { setSelectedDistribuidora(v); setSelectedCategoria(''); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a distribuidora" />
                </SelectTrigger>
                <SelectContent>
                  {DISTRIBUIDORAS.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedDistribuidora && (
              <div className="w-72">
                <Label className="text-sm font-medium mb-1 block">Categoria</Label>
                <Select value={selectedCategoria} onValueChange={setSelectedCategoria}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as categorias" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {selectedDistribuidora && selectedCategoria && (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-blue-500" />
                  {categoriaLabel(selectedCategoria)} — {selectedDistribuidora}
                  <Badge variant="secondary" className="ml-2">{filteredItems.length} itens</Badge>
                </h2>
                {!showAddForm && (
                  <Button onClick={() => setShowAddForm(true)} className="bg-green-600 hover:bg-green-700 text-white" size="sm">
                    <Plus className="h-4 w-4 mr-1" /> Adicionar
                  </Button>
                )}
              </div>

              {showAddForm && (
                <Card className="border-green-200 dark:border-green-800 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Plus className="h-4 w-4 text-green-600" /> Novo Item
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm">Nome *</Label>
                      <Input value={newNome} onChange={e => setNewNome(e.target.value)} placeholder="Ex: Caixa Monofásica Padrão" className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-sm">Descrição</Label>
                      <Textarea value={newDescricao} onChange={e => setNewDescricao(e.target.value)} placeholder="Descrição opcional do item..." className="mt-1 min-h-[60px]" />
                    </div>
                    {selectedCategoria === 'caixa_medicao' && (
                      <div>
                        <Label className="text-sm">Dimensões (mm)</Label>
                        <div className="mt-1 grid grid-cols-3 gap-2">
                          <div>
                            <Label className="text-xs text-gray-500">Comprimento</Label>
                            <Input type="number" value={newComprimento} onChange={e => setNewComprimento(e.target.value)} placeholder="260" className="mt-0.5 h-8 text-sm" />
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">Altura</Label>
                            <Input type="number" value={newAltura} onChange={e => setNewAltura(e.target.value)} placeholder="423" className="mt-0.5 h-8 text-sm" />
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">Largura</Label>
                            <Input type="number" value={newLargura} onChange={e => setNewLargura(e.target.value)} placeholder="130" className="mt-0.5 h-8 text-sm" />
                          </div>
                        </div>
                      </div>
                    )}
                    <div>
                      <Label className="text-sm">Imagem</Label>
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleFileSelect(e, 'new')} />
                      <div className="mt-1 flex items-center gap-3">
                        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                          <Upload className="h-4 w-4 mr-1" /> Selecionar imagem
                        </Button>
                        {newFile && <span className="text-xs text-gray-500">{newFile.name}</span>}
                      </div>
                      {newPreview && <img src={newPreview} alt="Preview" className="mt-3 max-h-40 rounded-md border border-gray-200 dark:border-gray-700 object-contain" />}
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button onClick={handleAdd} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white" size="sm">
                        {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />} Salvar
                      </Button>
                      <Button variant="ghost" size="sm" onClick={resetNewForm}>
                        <X className="h-4 w-4 mr-1" /> Cancelar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                  <span className="ml-2 text-gray-500">Carregando...</span>
                </div>
              ) : filteredItems.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <ImageIcon className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">Nenhum item cadastrado nesta categoria.</p>
                    <p className="text-sm text-gray-400 mt-1">Clique em &quot;Adicionar&quot; para começar.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredItems.map(item => (
                    <Card key={item.id} className="overflow-hidden group hover:shadow-md transition-shadow">
                      {editingId === item.id ? (
                        <CardContent className="p-4 space-y-3">
                          <div>
                            <Label className="text-xs">Nome</Label>
                            <Input value={editNome} onChange={e => setEditNome(e.target.value)} className="mt-1 h-8 text-sm" />
                          </div>
                          <div>
                            <Label className="text-xs">Descrição</Label>
                            <Textarea value={editDescricao} onChange={e => setEditDescricao(e.target.value)} className="mt-1 min-h-[50px] text-sm" />
                          </div>
                          {item.categoria === 'caixa_medicao' && (
                            <div>
                              <Label className="text-xs">Dimensões (mm)</Label>
                              <div className="mt-1 grid grid-cols-3 gap-1.5">
                                <div>
                                  <Label className="text-[10px] text-gray-500">Comp.</Label>
                                  <Input type="number" value={editComprimento} onChange={e => setEditComprimento(e.target.value)} placeholder="260" className="mt-0.5 h-7 text-xs" />
                                </div>
                                <div>
                                  <Label className="text-[10px] text-gray-500">Altura</Label>
                                  <Input type="number" value={editAltura} onChange={e => setEditAltura(e.target.value)} placeholder="423" className="mt-0.5 h-7 text-xs" />
                                </div>
                                <div>
                                  <Label className="text-[10px] text-gray-500">Largura</Label>
                                  <Input type="number" value={editLargura} onChange={e => setEditLargura(e.target.value)} placeholder="130" className="mt-0.5 h-7 text-xs" />
                                </div>
                              </div>
                            </div>
                          )}
                          <div>
                            <input ref={editFileInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleFileSelect(e, 'edit')} />
                            <Button variant="outline" size="sm" onClick={() => editFileInputRef.current?.click()} className="text-xs">
                              <Upload className="h-3 w-3 mr-1" /> Alterar imagem
                            </Button>
                          </div>
                          {editPreview && <img src={editPreview} alt="Preview" className="max-h-32 rounded border object-contain" />}
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleUpdate(item.id)} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
                              {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />} Salvar
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setEditingId(null)} className="text-xs">
                              <X className="h-3 w-3 mr-1" /> Cancelar
                            </Button>
                          </div>
                        </CardContent>
                      ) : (
                        <>
                          <div className="aspect-video bg-gray-50 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                            {item.imagem_url ? (
                              <img src={item.imagem_url} alt={item.nome} className="w-full h-full object-contain p-2" />
                            ) : (
                              <ImageIcon className="h-12 w-12 text-gray-300" />
                            )}
                          </div>
                          <CardContent className="p-4">
                            <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-200">{item.nome}</h3>
                            {item.descricao && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.descricao}</p>}
                            {(item.comprimento_mm || item.altura_mm || item.largura_mm) && (
                              <p className="text-xs text-gray-500 mt-1">
                                Dimensões: {item.comprimento_mm || '—'} × {item.altura_mm || '—'} × {item.largura_mm || '—'} mm
                              </p>
                            )}
                            <div className="flex items-center justify-between mt-3">
                              <Badge variant="outline" className="text-xs">{categoriaLabel(item.categoria)}</Badge>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="sm" onClick={() => startEdit(item)} className="h-7 w-7 p-0">
                                  <Edit className="h-3.5 w-3.5 text-blue-500" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(item)} className="h-7 w-7 p-0">
                                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}

          {selectedDistribuidora && !selectedCategoria && (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <FolderArchive className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">Selecione uma categoria para ver e gerenciar o acervo.</p>
              </CardContent>
            </Card>
          )}

          {!selectedDistribuidora && (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <FolderArchive className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg">Selecione uma distribuidora para começar.</p>
                <p className="text-sm text-gray-400 mt-1">O acervo técnico é organizado por distribuidora e categoria.</p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ── Tabs: Inversores / Módulos (new) ── */}
      {(activeTab === 'inversores' || activeTab === 'modulos') && (
        <>
          {/* Search and filters */}
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px] max-w-sm">
              <Label className="text-sm font-medium mb-1 block">Buscar por fabricante ou modelo</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={activeTab === 'inversores' ? 'Ex: Fronius, Deye, SMA...' : 'Ex: Canadian, Risen, BYD...'}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="w-56">
              <Label className="text-sm font-medium mb-1 block">Tipo de Documento</Label>
              <Select value={selectedTipoDocumento || 'all'} onValueChange={v => setSelectedTipoDocumento(v === 'all' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {TIPOS_DOCUMENTO.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!showAddEquipForm && (
              <Button onClick={() => setShowAddEquipForm(true)} className="bg-green-600 hover:bg-green-700 text-white" size="sm">
                <Plus className="h-4 w-4 mr-1" /> Adicionar
              </Button>
            )}
          </div>

          {/* Add form */}
          {showAddEquipForm && (
            <Card className="border-green-200 dark:border-green-800 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Plus className="h-4 w-4 text-green-600" /> Novo {tabSingular}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">Fabricante *</Label>
                    <Input value={equipFabricante} onChange={e => setEquipFabricante(e.target.value)} placeholder="Ex: Fronius" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-sm">Modelo *</Label>
                    <Input value={equipModelo} onChange={e => setEquipModelo(e.target.value)} placeholder="Ex: Symo 10.0-3-M" className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label className="text-sm">Tipo de Documento</Label>
                  <Select value={equipTipoDoc} onValueChange={setEquipTipoDoc}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_DOCUMENTO.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">Arquivo (imagem ou PDF)</Label>
                  <input ref={equipFileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={e => handleEquipFileSelect(e, 'new')} />
                  <div className="mt-1 flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={() => equipFileInputRef.current?.click()}>
                      <Upload className="h-4 w-4 mr-1" /> Selecionar arquivo
                    </Button>
                    {equipFile && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        {equipIsPdf ? <FileText className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
                        {equipFile.name}
                      </span>
                    )}
                  </div>
                  {equipPreview && <img src={equipPreview} alt="Preview" className="mt-3 max-h-40 rounded-md border border-gray-200 dark:border-gray-700 object-contain" />}
                  {equipIsPdf && equipFile && (
                    <div className="mt-3 flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-md border border-blue-200 dark:border-blue-800">
                      <FileText className="h-5 w-5 text-blue-500" />
                      <span className="text-sm text-blue-700 dark:text-blue-300">{equipFile.name}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={handleAddEquip} disabled={savingEquip} className="bg-green-600 hover:bg-green-700 text-white" size="sm">
                    {savingEquip ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />} Salvar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={resetEquipForm}>
                    <X className="h-4 w-4 mr-1" /> Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Items grid */}
          {loadingEquipamentos ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              <span className="ml-2 text-gray-500">Carregando...</span>
            </div>
          ) : equipamentos.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                {activeTab === 'inversores'
                  ? <Zap className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                  : <LayoutGrid className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                }
                <p className="text-gray-500">Nenhum item cadastrado em {tabLabel}.</p>
                <p className="text-sm text-gray-400 mt-1">Clique em &quot;Adicionar&quot; para começar.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {equipamentos.map(item => (
                <Card key={item.id} className="overflow-hidden group hover:shadow-md transition-shadow">
                  {editingEquipId === item.id ? (
                    <CardContent className="p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Fabricante</Label>
                          <Input value={editEquipFabricante} onChange={e => setEditEquipFabricante(e.target.value)} className="mt-1 h-8 text-sm" />
                        </div>
                        <div>
                          <Label className="text-xs">Modelo</Label>
                          <Input value={editEquipModelo} onChange={e => setEditEquipModelo(e.target.value)} className="mt-1 h-8 text-sm" />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Tipo de Documento</Label>
                        <Select value={editEquipTipoDoc} onValueChange={setEditEquipTipoDoc}>
                          <SelectTrigger className="mt-1 h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIPOS_DOCUMENTO.map(t => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <input ref={editEquipFileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={e => handleEquipFileSelect(e, 'edit')} />
                        <Button variant="outline" size="sm" onClick={() => editEquipFileInputRef.current?.click()} className="text-xs">
                          <Upload className="h-3 w-3 mr-1" /> Alterar arquivo
                        </Button>
                        {editEquipFile && <span className="text-xs text-gray-500 ml-2">{editEquipFile.name}</span>}
                      </div>
                      {editEquipPreview && <img src={editEquipPreview} alt="Preview" className="max-h-32 rounded border object-contain" />}
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleUpdateEquip(item.id)} disabled={savingEquip} className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
                          {savingEquip ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />} Salvar
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setEditingEquipId(null)} className="text-xs">
                          <X className="h-3 w-3 mr-1" /> Cancelar
                        </Button>
                      </div>
                    </CardContent>
                  ) : (
                    <>
                      <div className="aspect-video bg-gray-50 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                        {item.imagem_url ? (
                          <img src={item.imagem_url} alt={item.nome} className="w-full h-full object-contain p-2" />
                        ) : item.arquivo_url ? (
                          <a href={item.arquivo_url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 text-blue-600 hover:text-blue-700">
                            <FileText className="h-12 w-12" />
                            <span className="text-xs font-medium">Abrir PDF</span>
                          </a>
                        ) : (
                          <FileText className="h-12 w-12 text-gray-300" />
                        )}
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-200">{item.nome}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">{item.fabricante} · {item.modelo}</p>
                        {item.descricao && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{item.descricao}</p>}
                        <div className="flex items-center justify-between mt-3">
                          <Badge variant="outline" className="text-xs">{tipoDocLabel(item.tipo_documento)}</Badge>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="sm" onClick={() => startEditEquip(item)} className="h-7 w-7 p-0">
                              <Edit className="h-3.5 w-3.5 text-blue-500" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setDeleteEquipTarget(item)} className="h-7 w-7 p-0">
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </>
                  )}
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Delete dialog — Distribuidoras */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir &quot;{deleteTarget?.nome}&quot;? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete dialog — Equipamentos */}
      <AlertDialog open={!!deleteEquipTarget} onOpenChange={(open) => { if (!open) setDeleteEquipTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir &quot;{deleteEquipTarget?.nome}&quot;? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEquip} className="bg-red-600 hover:bg-red-700 text-white">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
