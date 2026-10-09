'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import {
  AlertCircle, AlertTriangle, Check, ChevronDown, Eye, EyeOff, Globe, Info, KeyRound, Loader2, Lock, Mail,
  MessageSquare, Pencil, Phone, Plus, Save, Search, Trash2, Unlock, User, Users, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { devLog } from '@/lib/utils/productionLogger';
import { DISTRIBUIDORAS } from '@/lib/constants/distribuidoras';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

// As rotas /api/admin/credenciais identificam o usuário pelo access token da sessão,
// enviado em Authorization: Bearer (a sessão não chega ao servidor por cookie).
const authFetch = async (url: string, init: RequestInit = {}) => {
  const { data: { session } } = await createSupabaseBrowserClient().auth.getSession();
  const headers = new Headers(init.headers);
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }
  return fetch(url, { ...init, headers });
};

type Envio = 'plataforma' | 'email';

interface Contato {
  nome: string;
  cargo: string;
  telefone: string;
  email: string;
}

interface Credencial {
  id: string;
  nome: string;
  estado: string;
  envio: Envio;
  portal_url: string;
  portal_login: string;
  tem_senha: boolean;
  email_envio: string;
  contatos: Contato[];
  observacoes: string;
}

interface FormState {
  nome: string;
  estados: string[];
  envio: Envio;
  portalUrl: string;
  portalLogin: string;
  emailEnvio: string;
  contatos: Contato[];
  observacoes: string;
}

// Estado do campo de senha do portal:
// - 'nova': não há senha salva (ou o usuário está digitando uma nova) — campo comum, com olho para ver o que digita
// - 'bloqueada': há senha salva e ela ainda não foi revelada — mostra •••••••• até reautenticar
// - 'revelada': senha salva revelada após reautenticação, visível e editável por 60 segundos
type SenhaModo = 'nova' | 'bloqueada' | 'revelada';

const ESTADOS_BR = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

// Mesma lista de distribuidoras do restante do sistema; "Outro" vira a opção "Outra credencial"
const DISTRIBUIDORAS_CONHECIDAS = DISTRIBUIDORAS.filter(nome => nome !== 'Outro');

const UNLOCK_MS = 60000;
const SENHA_MASCARA = '••••••••';

const EMPTY_FORM: FormState = {
  nome: '',
  estados: [],
  envio: 'plataforma',
  portalUrl: '',
  portalLogin: '',
  emailEnvio: '',
  contatos: [],
  observacoes: '',
};

const inputClass =
  'h-9 w-full rounded-lg border border-gray-300 bg-white px-[11px] text-[13px] text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:outline-none focus:ring-[3px] focus:ring-amber-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100';
const fieldLabelClass = 'mb-[5px] block text-xs font-semibold text-gray-700 dark:text-gray-300';
const sectionLabelClass = 'mb-2.5 flex items-center gap-[7px] text-[11px] font-bold uppercase tracking-wide text-gray-400';

// Completa = forma de envio preenchida (portal: URL + login + senha; e-mail: endereço) e ao menos um contato
const isComplete = (c: Credencial) => {
  const envioOk = c.envio === 'plataforma'
    ? !!(c.portal_url && c.portal_login && c.tem_senha)
    : !!c.email_envio;
  return envioOk && c.contatos.length > 0;
};

export default function CredenciaisPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [credenciais, setCredenciais] = useState<Credencial[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabelaAusente, setTabelaAusente] = useState(false);
  const [search, setSearch] = useState('');
  const [filterIncomplete, setFilterIncomplete] = useState(false);

  // Modal de nova/editar credencial
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [nomeListOpen, setNomeListOpen] = useState(false);
  const [estadoListOpen, setEstadoListOpen] = useState(false);
  const [estadoSearch, setEstadoSearch] = useState('');
  const nomeComboRef = useRef<HTMLDivElement>(null);
  const estadoComboRef = useRef<HTMLDivElement>(null);
  const nomeInputRef = useRef<HTMLInputElement>(null);

  // Senha do portal
  const [senhaModo, setSenhaModo] = useState<SenhaModo>('nova');
  const [senhaValue, setSenhaValue] = useState('');
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState(0);
  // true quando o usuário editou a senha revelada e o desbloqueio expirou: o que ele digitou vale como nova senha
  const [senhaAlterada, setSenhaAlterada] = useState(false);
  // Senhas reveladas ficam só em memória, por até 60 segundos: { id: { senha, ate } }
  const reveladasRef = useRef<Record<string, { senha: string; ate: number }>>({});
  const senhaValueRef = useRef('');
  senhaValueRef.current = senhaValue;

  // Reautenticação (desbloquear a senha salva)
  const [reauthOpen, setReauthOpen] = useState(false);
  const [reauthPassword, setReauthPassword] = useState('');
  const [reauthError, setReauthError] = useState('');
  const [reauthLoading, setReauthLoading] = useState(false);

  // Exclusão
  const [deleteTarget, setDeleteTarget] = useState<Credencial | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isFullAdmin = user?.role === 'admin' || user?.role === 'superadmin' ||
                      user?.profile?.role === 'admin' || user?.profile?.role === 'superadmin';

  const fetchCredenciais = useCallback(async () => {
    try {
      setLoading(true);
      const response = await authFetch('/api/admin/credenciais', { cache: 'no-store' });
      const result = await response.json().catch(() => ({}));

      if (response.ok && result.success) {
        setCredenciais(result.data || []);
        setTabelaAusente(false);
      } else if (result.code === 'tabela_ausente') {
        setCredenciais([]);
        setTabelaAusente(true);
      } else {
        throw new Error(result.error || `Erro HTTP: ${response.status}`);
      }
    } catch (error: any) {
      devLog.error('[CredenciaisPage] Erro ao carregar credenciais:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as credenciais.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.id && isFullAdmin) {
      fetchCredenciais();
    }
  }, [user?.id, isFullAdmin, fetchCredenciais]);

  // Fecha as listas dos seletores ao clicar fora
  useEffect(() => {
    if (!nomeListOpen && !estadoListOpen) return;
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (nomeComboRef.current && !nomeComboRef.current.contains(target)) setNomeListOpen(false);
      if (estadoComboRef.current && !estadoComboRef.current.contains(target)) setEstadoListOpen(false);
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [nomeListOpen, estadoListOpen]);

  // Contagem regressiva da senha revelada; ao acabar, a senha volta a ficar bloqueada
  useEffect(() => {
    if (!modalOpen || senhaModo !== 'revelada' || !editingId) return;

    const tick = () => {
      const revelada = reveladasRef.current[editingId];
      const restante = revelada ? revelada.ate - Date.now() : 0;

      if (restante <= 0) {
        delete reveladasRef.current[editingId];
        setSegundosRestantes(0);
        setSenhaVisivel(false);
        if (revelada && senhaValueRef.current !== revelada.senha) {
          // O usuário alterou a senha enquanto estava revelada: mantém o que digitou como nova senha
          setSenhaModo('nova');
          setSenhaAlterada(true);
        } else {
          setSenhaModo('bloqueada');
          setSenhaValue('');
        }
        return;
      }
      setSegundosRestantes(Math.max(0, Math.round(restante / 1000)));
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [modalOpen, senhaModo, editingId]);

  // ---- Abrir / fechar o modal ----
  const openModal = (credencial?: Credencial) => {
    setNomeListOpen(false);
    setEstadoListOpen(false);
    setEstadoSearch('');
    setSenhaVisivel(false);
    setSenhaAlterada(false);

    if (credencial) {
      setEditingId(credencial.id);
      setForm({
        nome: credencial.nome,
        estados: credencial.estado ? credencial.estado.split('/').map(s => s.trim()).filter(Boolean) : [],
        envio: credencial.envio,
        portalUrl: credencial.portal_url,
        portalLogin: credencial.portal_login,
        emailEnvio: credencial.email_envio,
        contatos: credencial.contatos.map(c => ({ ...c })),
        observacoes: credencial.observacoes,
      });

      const revelada = reveladasRef.current[credencial.id];
      if (credencial.tem_senha && revelada && revelada.ate > Date.now()) {
        // Ainda dentro dos 60 segundos de um desbloqueio anterior
        setSenhaModo('revelada');
        setSenhaValue(revelada.senha);
        setSenhaVisivel(true);
      } else if (credencial.tem_senha) {
        setSenhaModo('bloqueada');
        setSenhaValue('');
      } else {
        setSenhaModo('nova');
        setSenhaValue('');
      }
    } else {
      setEditingId(null);
      setForm(EMPTY_FORM);
      setSenhaModo('nova');
      setSenhaValue('');
    }

    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setNomeListOpen(false);
    setEstadoListOpen(false);
  };

  // ---- Seletores ----
  const nomeMatches = DISTRIBUIDORAS_CONHECIDAS.filter(nome =>
    nome.toLowerCase().includes(form.nome.toLowerCase().trim())
  );
  const estadoMatches = ESTADOS_BR.filter(uf => uf.includes(estadoSearch.toUpperCase().trim()));

  const toggleEstado = (uf: string) => {
    setForm(prev => ({
      ...prev,
      estados: prev.estados.includes(uf) ? prev.estados.filter(e => e !== uf) : [...prev.estados, uf],
    }));
  };

  // ---- Contatos ----
  const addContato = () => {
    setForm(prev => ({ ...prev, contatos: [...prev.contatos, { nome: '', cargo: '', telefone: '', email: '' }] }));
  };
  const updateContato = (index: number, field: keyof Contato, value: string) => {
    setForm(prev => ({
      ...prev,
      contatos: prev.contatos.map((c, i) => (i === index ? { ...c, [field]: value } : c)),
    }));
  };
  const removeContato = (index: number) => {
    setForm(prev => ({ ...prev, contatos: prev.contatos.filter((_, i) => i !== index) }));
  };

  // ---- Senha do portal ----
  const handleEyeClick = () => {
    if (senhaModo === 'bloqueada') {
      // Senha salva: só aparece depois de confirmar a senha da conta
      setReauthPassword('');
      setReauthError('');
      setReauthOpen(true);
      return;
    }
    setSenhaVisivel(v => !v);
  };

  const handleConfirmReauth = async () => {
    if (!editingId) return;
    if (!reauthPassword || reauthPassword.length < 4) {
      setReauthError('Digite sua senha para continuar.');
      return;
    }

    try {
      setReauthLoading(true);
      setReauthError('');

      const response = await authFetch(`/api/admin/credenciais/${editingId}/revelar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: reauthPassword }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success) {
        setReauthError(result.error || 'Não foi possível desbloquear a credencial.');
        return;
      }

      reveladasRef.current[editingId] = { senha: result.senha || '', ate: Date.now() + UNLOCK_MS };
      setSenhaValue(result.senha || '');
      setSenhaModo('revelada');
      setSenhaVisivel(true);
      setSegundosRestantes(Math.round(UNLOCK_MS / 1000));
      setReauthOpen(false);
      setReauthPassword('');
      toast({ title: 'Credencial desbloqueada por 60 segundos' });
    } catch (error: any) {
      devLog.error('[CredenciaisPage] Erro ao desbloquear credencial:', error);
      setReauthError('Não foi possível desbloquear a credencial.');
    } finally {
      setReauthLoading(false);
    }
  };

  const handleRelock = () => {
    if (editingId) delete reveladasRef.current[editingId];
    setSenhaModo('bloqueada');
    setSenhaValue('');
    setSenhaVisivel(false);
    toast({ title: 'Credencial bloqueada novamente' });
  };

  // ---- Salvar ----
  const handleSave = async () => {
    const nome = form.nome.trim();
    if (!nome) {
      toast({ title: 'Informe o nome da distribuidora', variant: 'destructive' });
      nomeInputRef.current?.focus();
      return;
    }

    const payload: Record<string, any> = {
      nome,
      estado: form.estados.join(' / '),
      envio: form.envio,
      portal_url: form.portalUrl.trim(),
      portal_login: form.portalLogin.trim(),
      email_envio: form.emailEnvio.trim(),
      contatos: form.contatos
        .map(c => ({ nome: c.nome.trim(), cargo: c.cargo.trim(), telefone: c.telefone.trim(), email: c.email.trim() }))
        .filter(c => c.nome || c.telefone || c.email),
      observacoes: form.observacoes.trim(),
    };

    // A senha só é enviada quando foi digitada ou alterada; bloqueada = mantém a que já está salva
    if (senhaModo === 'nova') {
      if (!editingId || senhaValue || senhaAlterada) payload.portal_senha = senhaValue;
    } else if (senhaModo === 'revelada' && editingId) {
      const revelada = reveladasRef.current[editingId];
      if (!revelada || senhaValue !== revelada.senha) payload.portal_senha = senhaValue;
    }

    try {
      setSaving(true);
      const response = await authFetch(editingId ? `/api/admin/credenciais/${editingId}` : '/api/admin/credenciais', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success) {
        throw new Error(result.error || `Erro HTTP: ${response.status}`);
      }

      // Se a senha mudou, a que estava revelada em memória deixa de valer
      if (editingId && 'portal_senha' in payload) delete reveladasRef.current[editingId];

      toast({ title: editingId ? 'Distribuidora atualizada com sucesso' : 'Distribuidora cadastrada com sucesso' });
      setModalOpen(false);
      fetchCredenciais();
    } catch (error: any) {
      devLog.error('[CredenciaisPage] Erro ao salvar credencial:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao salvar credencial.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // ---- Excluir ----
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    try {
      setDeleting(true);
      const response = await authFetch(`/api/admin/credenciais/${deleteTarget.id}`, { method: 'DELETE' });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success) {
        throw new Error(result.error || `Erro HTTP: ${response.status}`);
      }

      delete reveladasRef.current[deleteTarget.id];
      toast({ title: 'Distribuidora excluída' });
      setDeleteTarget(null);
      fetchCredenciais();
    } catch (error: any) {
      devLog.error('[CredenciaisPage] Erro ao excluir credencial:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao excluir credencial.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  if (!user || !isFullAdmin) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Acesso Restrito</CardTitle>
            <CardDescription>
              Você não tem permissão para acessar as credenciais.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => router.push('/admin/painel')}
              className="mt-4 w-full"
            >
              Voltar ao Painel
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- Lista filtrada ----
  const term = search.toLowerCase().trim();
  const incompleteTotal = credenciais.filter(c => !isComplete(c)).length;
  const filtered = credenciais.filter(c => {
    if (filterIncomplete && isComplete(c)) return false;
    if (!term) return true;
    return `${c.nome} ${c.estado}`.toLowerCase().includes(term);
  });

  const editing = editingId ? credenciais.find(c => c.id === editingId) : undefined;

  return (
    <div>
      {/* Hero */}
      <div className="relative mb-[22px] overflow-hidden rounded-2xl bg-gradient-to-r from-amber-600 to-amber-700 px-[30px] py-[26px] text-white">
        <div className="absolute -right-5 -top-[30px] h-[140px] w-[140px] rounded-full bg-white/[0.14]" />
        <div className="absolute -bottom-[30px] -left-2.5 h-[120px] w-[120px] rounded-full bg-white/10" />
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-extrabold leading-tight">Credenciais</h1>
            <p className="mt-1 text-[13px] text-orange-100">
              Acessos a portais de distribuidoras e outros órgãos, com contatos e forma de envio
            </p>
          </div>
          <Button
            onClick={() => openModal()}
            disabled={tabelaAusente}
            className="h-auto gap-1.5 rounded-[7px] bg-green-600 px-[13px] py-[7px] text-[12.5px] font-semibold text-white shadow-md hover:bg-green-700"
          >
            <Plus className="h-[13px] w-[13px]" />
            Nova Credencial
          </Button>
        </div>
      </div>

      {tabelaAusente && (
        <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-[13px] leading-[19px] text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <p>
            <strong className="font-semibold">A tabela de credenciais ainda não foi criada no banco de dados.</strong>{' '}
            Execute a migração <code className="rounded bg-amber-100 px-1 py-0.5 text-xs dark:bg-amber-900/40">supabase/migrations/20261010_create_credenciais_acesso.sql</code>{' '}
            para habilitar esta tela.
          </p>
        </div>
      )}

      {/* Barra de busca e filtro */}
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[220px] max-w-[360px] flex-1">
          <Search className="pointer-events-none absolute left-[11px] top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar distribuidora ou estado..."
            aria-label="Buscar distribuidora ou estado"
            className={cn(inputClass, 'pl-[33px]')}
          />
        </div>
        <button
          type="button"
          onClick={() => setFilterIncomplete(v => !v)}
          aria-pressed={filterIncomplete}
          className={cn(
            'inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg border px-[13px] text-[12.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500',
            filterIncomplete
              ? 'border-orange-200 bg-orange-50 text-amber-700'
              : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
          )}
        >
          <AlertTriangle className="h-3 w-3" />
          Só incompletas
          <span
            className={cn(
              'rounded-full px-1.5 py-px text-[10.5px]',
              filterIncomplete ? 'bg-orange-200 text-orange-800' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300'
            )}
          >
            {incompleteTotal}
          </span>
        </button>
        <span className="ml-auto text-xs text-gray-400">
          {filtered.length} {filtered.length === 1 ? 'distribuidora' : 'distribuidoras'}
        </span>
      </div>

      {/* Grid de cards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {loading && credenciais.length === 0 ? (
          <div className="col-span-full flex items-center justify-center py-[60px]">
            <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full px-5 py-[60px] text-center text-gray-400">
            <Search className="mx-auto mb-2.5 h-10 w-10 opacity-50" strokeWidth={1.6} />
            <p className="text-[13px]">
              {credenciais.length === 0 && !term && !filterIncomplete
                ? 'Nenhuma credencial cadastrada.'
                : 'Nenhuma distribuidora encontrada.'}
            </p>
          </div>
        ) : (
          filtered.map((credencial) => {
            const complete = isComplete(credencial);
            const firstContact = credencial.contatos[0];

            return (
              <div
                key={credencial.id}
                role="button"
                tabIndex={0}
                onClick={() => openModal(credencial)}
                onKeyDown={(e) => {
                  if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    openModal(credencial);
                  }
                }}
                className="relative cursor-pointer rounded-lg border border-gray-200 bg-white p-3.5 transition-[box-shadow,border-color] hover:border-gray-300 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="mb-2.5 flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-orange-500 text-[13px] font-bold text-white shadow">
                      {credencial.nome.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold leading-tight text-gray-900 dark:text-gray-100">{credencial.nome}</div>
                      <div className="mt-px text-[11px] text-gray-500">{credencial.estado || 'Região não informada'}</div>
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 gap-0.5">
                    <button
                      type="button"
                      title="Editar"
                      aria-label={`Editar ${credencial.nome}`}
                      onClick={(e) => { e.stopPropagation(); openModal(credencial); }}
                      className="flex h-6 w-6 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:hover:bg-gray-700"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Excluir"
                      aria-label={`Excluir ${credencial.nome}`}
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(credencial); }}
                      className="flex h-6 w-6 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:hover:bg-gray-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mb-2.5 flex flex-col gap-[7px]">
                  {firstContact ? (
                    <>
                      {firstContact.cargo && (
                        <span className="inline-flex self-start rounded-full border border-amber-200 bg-orange-50 px-[9px] py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                          {firstContact.cargo}
                        </span>
                      )}
                      <div className="flex min-w-0 items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                        <User className="h-3 w-3 flex-shrink-0 text-gray-400" />
                        <span className="truncate">{firstContact.nome}</span>
                      </div>
                      {firstContact.telefone && (
                        <div className="flex min-w-0 items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                          <Phone className="h-3 w-3 flex-shrink-0 text-gray-400" />
                          <span className="truncate">{firstContact.telefone}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex min-w-0 items-center gap-2 text-xs text-gray-400">
                      <AlertCircle className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">Nenhum contato cadastrado</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-gray-100 pt-2.5 dark:border-gray-700">
                  <span className="inline-flex items-center gap-[5px] text-[10.5px] font-semibold text-gray-600 dark:text-gray-300">
                    {credencial.envio === 'plataforma'
                      ? <Globe className="h-[11px] w-[11px] text-amber-700" />
                      : <Mail className="h-[11px] w-[11px] text-amber-700" />}
                    {credencial.envio === 'plataforma' ? 'Via Portal' : 'Via E-mail'}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-[9px] py-[3px] text-[10.5px] font-bold',
                      complete ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-700'
                    )}
                  >
                    {complete
                      ? <Check className="h-2.5 w-2.5" strokeWidth={3} />
                      : <AlertTriangle className="h-2.5 w-2.5" strokeWidth={3} />}
                    {complete ? 'Completa' : 'Incompleta'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ===== Modal: Nova/Editar Credencial ===== */}
      <Dialog open={modalOpen} onOpenChange={(open) => { if (!open) closeModal(); }}>
        <DialogContent
          className="flex max-h-[calc(100vh-48px)] flex-col gap-0 overflow-hidden rounded-xl p-0 sm:max-w-[620px] sm:rounded-xl"
          onEscapeKeyDown={(e) => {
            // Esc fecha primeiro a lista aberta, não o modal
            if (nomeListOpen || estadoListOpen) {
              e.preventDefault();
              setNomeListOpen(false);
              setEstadoListOpen(false);
            }
          }}
        >
          <div className="flex-shrink-0 border-b border-gray-100 px-[22px] py-[18px] pr-12 dark:border-gray-700">
            <DialogTitle className="flex items-center gap-[9px] text-base font-bold leading-normal tracking-normal text-gray-900 dark:text-gray-100">
              <span className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-500">
                <KeyRound className="h-[15px] w-[15px]" />
              </span>
              {editing ? 'Editar Credencial' : 'Nova Credencial'}
            </DialogTitle>
            <DialogDescription className="ml-[39px] mt-0.5 text-xs text-gray-500">
              {editing ? `Atualize as informações de ${editing.nome}` : 'Cadastre as informações de acesso e credencial'}
            </DialogDescription>
          </div>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-[22px] py-[18px] [scrollbar-width:thin]">
            {/* Informações Gerais */}
            <div>
              <div className={sectionLabelClass}>
                <Info className="h-3 w-3" />
                Informações Gerais
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="credencial-nome" className={fieldLabelClass}>
                    Nome da Distribuidora ou Credencial <span className="text-red-500">*</span>
                  </label>
                  <div className="relative" ref={nomeComboRef}>
                    <input
                      id="credencial-nome"
                      ref={nomeInputRef}
                      value={form.nome}
                      onChange={(e) => {
                        setForm(prev => ({ ...prev, nome: e.target.value }));
                        setEstadoListOpen(false);
                        setNomeListOpen(true);
                      }}
                      onFocus={() => { setEstadoListOpen(false); setNomeListOpen(true); }}
                      placeholder="Digite para buscar..."
                      autoComplete="off"
                      className={cn(inputClass, 'pr-[30px]')}
                    />
                    <ChevronDown className="pointer-events-none absolute right-[11px] top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-gray-400" />
                    {nomeListOpen && (
                      <div className="absolute left-0 right-0 top-[calc(100%+5px)] z-20 max-h-[216px] overflow-y-auto rounded-[9px] border border-gray-200 bg-white p-1 shadow-xl dark:border-gray-700 dark:bg-gray-800">
                        {nomeMatches.length === 0 ? (
                          <div className="px-2.5 py-2 text-[11.5px] italic text-gray-400">
                            Nenhuma distribuidora encontrada — selecione &quot;Outra credencial&quot; abaixo ou digite o nome livremente
                          </div>
                        ) : (
                          nomeMatches.map(nome => (
                            <button
                              key={nome}
                              type="button"
                              onClick={() => { setForm(prev => ({ ...prev, nome })); setNomeListOpen(false); }}
                              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] text-gray-700 hover:bg-orange-50 hover:text-amber-700 dark:text-gray-200 dark:hover:bg-gray-700"
                            >
                              {nome}
                            </button>
                          ))
                        )}
                        {/* "Outra credencial": não é uma distribuidora da lista (ex.: CREA, prefeitura) — limpa o campo para digitar o nome */}
                        <button
                          type="button"
                          onClick={() => {
                            setForm(prev => ({ ...prev, nome: '' }));
                            nomeInputRef.current?.focus();
                            // o foco reabre a lista; fecha de novo para deixar o campo livre para digitar
                            setTimeout(() => setNomeListOpen(false), 0);
                          }}
                          className="mt-1 flex w-full items-center gap-[7px] rounded-md border-t border-gray-100 px-2.5 pb-2 pt-[9px] text-left text-[13px] font-semibold text-amber-700 hover:bg-orange-50 dark:border-gray-700 dark:hover:bg-gray-700"
                        >
                          <Plus className="h-[13px] w-[13px]" />
                          Outra credencial (digitar nome)
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="credencial-estado" className={fieldLabelClass}>Estado / Região</label>
                  <div className="relative" ref={estadoComboRef}>
                    <input
                      id="credencial-estado"
                      value={form.estados.join(' / ')}
                      readOnly
                      onClick={() => {
                        setNomeListOpen(false);
                        setEstadoSearch('');
                        setEstadoListOpen(v => !v);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
                          e.preventDefault();
                          setNomeListOpen(false);
                          setEstadoListOpen(true);
                        }
                      }}
                      placeholder="Selecione os estados..."
                      className={cn(inputClass, 'cursor-pointer pr-[30px]')}
                    />
                    <ChevronDown className="pointer-events-none absolute right-[11px] top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-gray-400" />
                    {estadoListOpen && (
                      <div className="absolute left-0 right-0 top-[calc(100%+5px)] z-20 max-h-[216px] overflow-y-auto rounded-[9px] border border-gray-200 bg-white p-1 shadow-xl dark:border-gray-700 dark:bg-gray-800">
                        <div className="mb-1 border-b border-gray-100 px-1 pb-1.5 pt-1 dark:border-gray-700">
                          <input
                            value={estadoSearch}
                            onChange={(e) => setEstadoSearch(e.target.value)}
                            placeholder="Buscar UF..."
                            aria-label="Buscar UF"
                            autoFocus
                            className="h-[30px] w-full rounded-md border border-gray-200 px-[9px] text-xs focus:border-amber-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900"
                          />
                        </div>
                        {estadoMatches.length === 0 ? (
                          <div className="px-2.5 py-2 text-[11.5px] italic text-gray-400">Nenhum estado encontrado</div>
                        ) : (
                          estadoMatches.map(uf => {
                            const selected = form.estados.includes(uf);
                            return (
                              <button
                                key={uf}
                                type="button"
                                aria-pressed={selected}
                                onClick={() => toggleEstado(uf)}
                                className={cn(
                                  'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] hover:bg-orange-50 hover:text-amber-700 dark:hover:bg-gray-700',
                                  selected ? 'font-bold text-amber-700' : 'text-gray-700 dark:text-gray-200'
                                )}
                              >
                                <span
                                  className={cn(
                                    'flex h-[15px] w-[15px] flex-shrink-0 items-center justify-center rounded border-[1.5px]',
                                    selected ? 'border-amber-700 bg-amber-700 text-white' : 'border-gray-300 text-transparent'
                                  )}
                                >
                                  <Check className="h-2.5 w-2.5" strokeWidth={3} />
                                </span>
                                {uf}
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Forma de Envio do Projeto */}
            <div>
              <div className={sectionLabelClass}>
                <Mail className="h-3 w-3" />
                Forma de Envio do Projeto
              </div>
              <div className="inline-flex gap-0.5 rounded-[9px] bg-gray-100 p-[3px] dark:bg-gray-700">
                {([
                  { value: 'plataforma' as Envio, label: 'Portal / Plataforma', icon: Globe },
                  { value: 'email' as Envio, label: 'E-mail', icon: Mail },
                ]).map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={form.envio === value}
                    onClick={() => setForm(prev => ({ ...prev, envio: value }))}
                    className={cn(
                      'flex items-center gap-1.5 rounded-[7px] px-4 py-[7px] text-[12.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500',
                      form.envio === value
                        ? 'bg-white text-amber-700 shadow-sm dark:bg-gray-900'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-300'
                    )}
                  >
                    <Icon className="h-[13px] w-[13px]" />
                    {label}
                  </button>
                ))}
              </div>

              {form.envio === 'plataforma' ? (
                <div className="mt-3 space-y-3">
                  {senhaModo === 'revelada' && (
                    <div className="flex items-center gap-2 rounded-[9px] border border-green-200 bg-green-50 px-3 py-[9px] text-[11.5px] text-green-700">
                      <Unlock className="h-3.5 w-3.5 flex-shrink-0 text-green-600" />
                      <span>Credencial desbloqueada — {segundosRestantes}s restantes</span>
                      <button
                        type="button"
                        onClick={handleRelock}
                        className="ml-auto flex-shrink-0 text-[11px] font-bold text-green-700 underline"
                      >
                        Bloquear agora
                      </button>
                    </div>
                  )}
                  <div>
                    <label htmlFor="credencial-portal-url" className={fieldLabelClass}>URL do Portal</label>
                    <input
                      id="credencial-portal-url"
                      value={form.portalUrl}
                      onChange={(e) => setForm(prev => ({ ...prev, portalUrl: e.target.value }))}
                      placeholder="https://portal.distribuidora.com.br"
                      autoComplete="off"
                      className={inputClass}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor="credencial-portal-login" className={fieldLabelClass}>Login</label>
                      <input
                        id="credencial-portal-login"
                        value={form.portalLogin}
                        onChange={(e) => setForm(prev => ({ ...prev, portalLogin: e.target.value }))}
                        placeholder="usuário de acesso"
                        autoComplete="off"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="credencial-portal-senha" className={fieldLabelClass}>Senha</label>
                      <div className="relative">
                        <input
                          id="credencial-portal-senha"
                          type={senhaModo === 'bloqueada' || !senhaVisivel ? 'password' : 'text'}
                          value={senhaModo === 'bloqueada' ? SENHA_MASCARA : senhaValue}
                          readOnly={senhaModo === 'bloqueada'}
                          onChange={(e) => setSenhaValue(e.target.value)}
                          placeholder="••••••••"
                          autoComplete="new-password"
                          className={cn(inputClass, 'bg-gray-50 pr-[38px] font-mono tracking-wide dark:bg-gray-900')}
                        />
                        <button
                          type="button"
                          onClick={handleEyeClick}
                          aria-label={
                            senhaModo === 'bloqueada'
                              ? 'Desbloquear senha salva'
                              : senhaVisivel ? 'Ocultar senha' : 'Mostrar senha'
                          }
                          className="absolute right-[5px] top-1/2 flex h-[26px] w-[26px] -translate-y-1/2 items-center justify-center rounded-md text-gray-400 hover:bg-gray-200 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                        >
                          {senhaModo !== 'bloqueada' && senhaVisivel
                            ? <EyeOff className="h-[15px] w-[15px]" />
                            : <Eye className="h-[15px] w-[15px]" />}
                        </button>
                      </div>
                      {senhaModo === 'bloqueada' && (
                        <p className="mt-1 text-[11px] leading-4 text-gray-500">
                          Para ver ou alterar a senha salva, clique no olho e confirme a senha da sua conta.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-3">
                  <label htmlFor="credencial-email-envio" className={fieldLabelClass}>E-mail para envio dos projetos</label>
                  <input
                    id="credencial-email-envio"
                    type="email"
                    value={form.emailEnvio}
                    onChange={(e) => setForm(prev => ({ ...prev, emailEnvio: e.target.value }))}
                    placeholder="projetos@distribuidora.com.br"
                    autoComplete="off"
                    className={inputClass}
                  />
                </div>
              )}
            </div>

            {/* Contatos */}
            <div>
              <div className={sectionLabelClass}>
                <Users className="h-3 w-3" />
                CONTATOS DA DISTRIBUIDORA
              </div>
              {form.contatos.map((contato, index) => (
                <div key={index} className="relative mb-2 rounded-[10px] border border-gray-200 px-3 py-[11px] dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => removeContato(index)}
                    aria-label={`Remover contato ${index + 1}`}
                    className="absolute right-2 top-2 flex h-[22px] w-[22px] items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  >
                    <X className="h-[13px] w-[13px]" />
                  </button>
                  <div className="mb-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor={`contato-nome-${index}`} className={fieldLabelClass}>Nome</label>
                      <input
                        id={`contato-nome-${index}`}
                        value={contato.nome}
                        onChange={(e) => updateContato(index, 'nome', e.target.value)}
                        placeholder="Nome do contato"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor={`contato-cargo-${index}`} className={fieldLabelClass}>Cargo / Setor</label>
                      <input
                        id={`contato-cargo-${index}`}
                        value={contato.cargo}
                        onChange={(e) => updateContato(index, 'cargo', e.target.value)}
                        placeholder="Ex: Atendimento Técnico"
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor={`contato-telefone-${index}`} className={fieldLabelClass}>Telefone</label>
                      <input
                        id={`contato-telefone-${index}`}
                        value={contato.telefone}
                        onChange={(e) => updateContato(index, 'telefone', e.target.value)}
                        placeholder="(00) 0000-0000"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor={`contato-email-${index}`} className={fieldLabelClass}>E-mail</label>
                      <input
                        id={`contato-email-${index}`}
                        value={contato.email}
                        onChange={(e) => updateContato(index, 'email', e.target.value)}
                        placeholder="contato@distribuidora.com.br"
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addContato}
                className="inline-flex items-center gap-1.5 rounded px-1 py-[7px] text-xs font-semibold text-amber-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <Plus className="h-[13px] w-[13px]" />
                Adicionar contato
              </button>
            </div>

            {/* Observações */}
            <div>
              <div className={sectionLabelClass}>
                <MessageSquare className="h-3 w-3" />
                Observações
              </div>
              <textarea
                value={form.observacoes}
                onChange={(e) => setForm(prev => ({ ...prev, observacoes: e.target.value }))}
                aria-label="Observações"
                placeholder="Documentos extras exigidos, prazo médio de resposta, particularidades do processo..."
                className={cn(inputClass, 'h-auto min-h-[64px] resize-y py-[9px] leading-normal')}
              />
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center justify-end gap-2 border-t border-gray-100 px-[22px] py-3.5 dark:border-gray-700">
            <Button
              type="button"
              variant="outline"
              onClick={closeModal}
              disabled={saving}
              className="h-auto rounded-[7px] border-gray-300 px-[13px] py-[7px] text-[12.5px] font-semibold text-gray-700"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="h-auto gap-1.5 rounded-[7px] bg-green-600 px-[13px] py-[7px] text-[12.5px] font-semibold text-white hover:bg-green-700"
            >
              {saving ? <Loader2 className="h-[13px] w-[13px] animate-spin" /> : <Save className="h-[13px] w-[13px]" />}
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>

          {/* ===== Modal: Reautenticação (desbloquear a senha salva) ===== */}
          <Dialog open={reauthOpen} onOpenChange={(open) => { if (!open && !reauthLoading) setReauthOpen(false); }}>
            <DialogContent className="gap-0 rounded-xl p-[22px] text-center sm:max-w-[360px] sm:rounded-xl">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-50 text-amber-700">
                <Lock className="h-[22px] w-[22px]" />
              </div>
              <DialogTitle className="mb-1.5 text-center text-[15.5px] font-bold leading-normal tracking-normal text-gray-900 dark:text-gray-100">
                Confirme sua senha
              </DialogTitle>
              <DialogDescription className="mb-4 text-center text-xs leading-[1.5] text-gray-500">
                Por segurança, confirme a senha da sua conta para visualizar esta credencial. O acesso fica desbloqueado por 60 segundos.
              </DialogDescription>
              <input
                type="password"
                value={reauthPassword}
                onChange={(e) => { setReauthPassword(e.target.value); setReauthError(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmReauth(); }}
                placeholder="Sua senha"
                aria-label="Sua senha"
                autoComplete="current-password"
                className={cn(
                  inputClass,
                  'mb-2 h-[38px] text-center text-[13.5px]',
                  reauthError && 'border-red-300 bg-red-50'
                )}
              />
              <p className="mb-2.5 min-h-[14px] text-[11.5px] text-red-600" role="alert">{reauthError}</p>
              <div className="mt-1 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setReauthOpen(false)}
                  disabled={reauthLoading}
                  className="h-auto flex-1 rounded-[7px] border-gray-300 px-[13px] py-[7px] text-[12.5px] font-semibold text-gray-700"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmReauth}
                  disabled={reauthLoading}
                  className="h-auto flex-1 rounded-[7px] bg-amber-700 px-[13px] py-[7px] text-[12.5px] font-semibold text-white hover:bg-amber-800"
                >
                  {reauthLoading ? 'Verificando...' : 'Desbloquear'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </DialogContent>
      </Dialog>

      {/* ===== Modal: Confirmação de exclusão ===== */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open && !deleting) setDeleteTarget(null); }}>
        <AlertDialogContent className="sm:max-w-[360px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[14.5px]">Excluir distribuidora?</AlertDialogTitle>
            <AlertDialogDescription className="text-[12.5px] leading-[1.5]">
              Tem certeza que deseja excluir &quot;{deleteTarget?.nome}&quot;? Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDeleteConfirm(); }}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
