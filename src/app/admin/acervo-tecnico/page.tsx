'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  Pencil,
  Save,
  X,
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

interface AcervoItem {
  id: string;
  distribuidora: string;
  categoria: string;
  nome: string;
  descricao: string | null;
  imagem_url: string | null;
  condicoes: Record<string, any>;
  created_at: string;
}

export default function AcervoTecnicoPage() {
  const { user } = useAuth();
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
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editNome, setEditNome] = useState('');
  const [editDescricao, setEditDescricao] = useState('');
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editPreview, setEditPreview] = useState<string | null>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const isSuperAdmin = user?.role === 'superadmin' || user?.profile?.role === 'superadmin';

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, mode: 'new' | 'edit') => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    if (mode === 'new') {
      setNewFile(file);
      setNewPreview(url);
    } else {
      setEditFile(file);
      setEditPreview(url);
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('distribuidora', selectedDistribuidora);
    formData.append('categoria', selectedCategoria || 'geral');

    const resp = await fetch('/api/acervo-tecnico/upload', {
      method: 'POST',
      body: formData,
    });
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
      if (newFile) {
        imageUrl = await uploadImage(newFile);
      }

      const resp = await fetch('/api/acervo-tecnico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          distribuidora: selectedDistribuidora,
          categoria: selectedCategoria,
          nome: newNome.trim(),
          descricao: newDescricao.trim() || null,
          imagem_url: imageUrl,
          tenant_id: user?.tenantId || (user?.profile as any)?.tenant_id,
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

      const body: Record<string, any> = { id, nome: editNome.trim(), descricao: editDescricao.trim() || null };
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
  };

  const resetNewForm = () => {
    setShowAddForm(false);
    setNewNome('');
    setNewDescricao('');
    setNewFile(null);
    setNewPreview(null);
  };

  const categoriaLabel = (cat: string) => CATEGORIAS.find(c => c.value === cat)?.label || cat;

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

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <FolderArchive className="h-7 w-7 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Acervo Técnico</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Gerencie imagens e recursos técnicos por distribuidora.
          </p>
        </div>
      </div>

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
                  <Input
                    value={newNome}
                    onChange={e => setNewNome(e.target.value)}
                    placeholder="Ex: Caixa Monofásica Padrão"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm">Descrição</Label>
                  <Textarea
                    value={newDescricao}
                    onChange={e => setNewDescricao(e.target.value)}
                    placeholder="Descrição opcional do item..."
                    className="mt-1 min-h-[60px]"
                  />
                </div>
                <div>
                  <Label className="text-sm">Imagem</Label>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleFileSelect(e, 'new')} />
                  <div className="mt-1 flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="h-4 w-4 mr-1" /> Selecionar imagem
                    </Button>
                    {newFile && <span className="text-xs text-gray-500">{newFile.name}</span>}
                  </div>
                  {newPreview && (
                    <img src={newPreview} alt="Preview" className="mt-3 max-h-40 rounded-md border border-gray-200 dark:border-gray-700 object-contain" />
                  )}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={handleAdd} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white" size="sm">
                    {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                    Salvar
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
                      <div>
                        <input ref={editFileInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleFileSelect(e, 'edit')} />
                        <Button variant="outline" size="sm" onClick={() => editFileInputRef.current?.click()} className="text-xs">
                          <Upload className="h-3 w-3 mr-1" /> Alterar imagem
                        </Button>
                      </div>
                      {editPreview && (
                        <img src={editPreview} alt="Preview" className="max-h-32 rounded border object-contain" />
                      )}
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
                        {item.descricao && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.descricao}</p>
                        )}
                        <div className="flex items-center justify-between mt-3">
                          <Badge variant="outline" className="text-xs">
                            {categoriaLabel(item.categoria)}
                          </Badge>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="sm" onClick={() => startEdit(item)} className="h-7 w-7 p-0">
                              <Pencil className="h-3.5 w-3.5 text-blue-500" />
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
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
