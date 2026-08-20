'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { PlusCircle, Trash2, Edit, Users, Search, Mail, Phone, Building2, Loader2, Check, X, Key, Eye, EyeOff } from "lucide-react";
import { devLog } from "@/lib/utils/productionLogger";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { PermissionsCheckboxes } from '@/components/admin/PermissionsCheckboxes';
import { UserPermissions, ADMIN_PERMISSIONS, COLABORADOR_PERMISSIONS } from '@/types/user';
import { generateSecurePassword } from '@/lib/utils/passwordGenerator';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  department?: string;
  status?: string;
  created_at?: string;
}

interface FormData {
  name: string;
  email: string;
  role: string;
  phone: string;
  department: string;
  permissions: UserPermissions;
  password: string;
}

interface Cliente {
  id: string;
  name: string;
  email: string;
  company_name?: string;
  billing_mode?: string;
}

export default function EquipePage() {
  const { user, refreshUserProfile } = useAuth();
  const router = useRouter();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<{ id: string; name: string; projectCount?: number } | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    role: 'colaborador',
    phone: '',
    department: '',
    permissions: COLABORADOR_PERMISSIONS, // ✅ Preset padrão para colaborador
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);

  // 🔒 VALIDAÇÃO DE EMAIL: Estados para verificar se email já existe
  const [emailCheckLoading, setEmailCheckLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);

  // 🆕 CLIENTES PERMITIDOS: Estados para controlar acesso de colaboradores
  const [clientesDisponiveis, setClientesDisponiveis] = useState<Cliente[]>([]);
  const [clientesSelecionados, setClientesSelecionados] = useState<string[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [buscaCliente, setBuscaCliente] = useState('');
  const [permitirTodosClientes, setPermitirTodosClientes] = useState(true);
  const [clientesPermitidosCarregados, setClientesPermitidosCarregados] = useState(false);

  // Filtrar membros baseado na busca
  const filteredMembers = teamMembers.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (member.department && member.department.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  useEffect(() => {
    if (user?.id) {
      fetchTeamMembers();
    }
  }, [user]);

  // 🆕 Carregar clientes disponíveis do tenant
  const fetchClientesDisponiveis = async () => {
    if (!user?.id) return [];

    try {
      setLoadingClientes(true);
      const { createTenantHeaders } = await import('@/lib/utils/tenant-helper');
      const headers = await createTenantHeaders(user.id);

      const response = await fetch('/api/admin/clientes', { headers });
      const result = await response.json();

      if (result.success) {
        setClientesDisponiveis(result.data || []);
        devLog.log('[EquipePage] Clientes carregados:', result.data?.length || 0);
        return result.data || [];
      }
      return [];
    } catch (error) {
      devLog.error('[EquipePage] Erro ao carregar clientes:', error);
      return [];
    } finally {
      setLoadingClientes(false);
    }
  };

  // 🆕 Carregar clientes permitidos de um colaborador
  const fetchClientesPermitidos = async (colaboradorId: string, clientesDisponiveisParam: Cliente[]) => {
    if (!user?.id) return;

    try {
      const { createTenantHeaders } = await import('@/lib/utils/tenant-helper');
      const headers = await createTenantHeaders(user.id);

      const response = await fetch(`/api/admin/team-members/${colaboradorId}/clientes-permitidos`, { headers });
      const result = await response.json();

      if (result.success) {
        const clienteIds = result.cliente_ids || [];
        const temRestricao = result.tem_restricao || false;

        setClientesSelecionados(clienteIds);

        // ✅ LÓGICA CORRIGIDA:
        // - Se NÃO tem restrição → Checkbox "permitir todos" = true
        // - Se TEM restrição e tem TODOS os clientes → Checkbox = true
        // - Caso contrário → Checkbox = false
        if (!temRestricao) {
          setPermitirTodosClientes(true);
        } else {
          // ✅ CORREÇÃO RACE CONDITION: Usar parâmetro ao invés do estado React
          const todosClientesIds = clientesDisponiveisParam.map(c => c.id);
          const temTodos = todosClientesIds.length > 0 &&
                          clienteIds.length === todosClientesIds.length &&
                          todosClientesIds.every(id => clienteIds.includes(id));
          setPermitirTodosClientes(temTodos);
        }

        devLog.log('[EquipePage] Clientes permitidos carregados:', {
          quantidade: clienteIds.length,
          temRestricao,
          permitirTodos: !temRestricao
        });

        // ✅ Marcar como carregado
        setClientesPermitidosCarregados(true);
      }
    } catch (error) {
      devLog.error('[EquipePage] Erro ao carregar clientes permitidos:', error);
      setClientesPermitidosCarregados(true); // Marcar como carregado mesmo com erro
    }
  };

  // 🆕 Salvar clientes permitidos
  const salvarClientesPermitidos = async (colaboradorId: string) => {
    if (!user?.id) return;

    try {
      const { createTenantHeaders } = await import('@/lib/utils/tenant-helper');
      const headers = await createTenantHeaders(user.id);

      // ✅ Enviar array real de IDs selecionados (API decide a lógica)
      const clienteIds = clientesSelecionados;

      const response = await fetch(`/api/admin/team-members/${colaboradorId}/clientes-permitidos`, {
        method: 'PUT',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cliente_ids: clienteIds }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erro ao salvar clientes permitidos');
      }

      devLog.log('[EquipePage] Clientes permitidos salvos:', {
        quantidade: clienteIds.length,
        temRestricao: result.tem_restricao
      });
    } catch (error) {
      devLog.error('[EquipePage] Erro ao salvar clientes permitidos:', error);
      toast({
        title: 'Aviso',
        description: 'Membro salvo, mas houve erro ao atualizar clientes permitidos.',
        variant: 'default'
      });
    }
  };

  // 🔒 VALIDAÇÃO DE EMAIL: Verificar se email já existe no sistema
  const checkEmailAvailability = async (email: string) => {
    // Resetar estados
    setEmailError(null);
    setEmailAvailable(null);

    // Validação básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return;
    }

    setEmailCheckLoading(true);

    try {
      const response = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        devLog.error('[EquipePage] Erro ao verificar email:', data.error);
        return;
      }

      if (data.exists) {
        setEmailAvailable(false);
        setEmailError('Este e-mail já está cadastrado no sistema. Use outro e-mail.');
      } else {
        setEmailAvailable(true);
      }

    } catch (error) {
      devLog.error('[EquipePage] Erro ao verificar email:', error);
    } finally {
      setEmailCheckLoading(false);
    }
  };

  // Disparar verificação de email quando usuário terminar de digitar (debounce)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Apenas verificar se não estiver em modo de edição
      if (formData.email && !editMode) {
        checkEmailAvailability(formData.email);
      }
    }, 800); // Aguarda 800ms após usuário parar de digitar

    return () => clearTimeout(timeoutId);
  }, [formData.email, editMode]);

  const fetchTeamMembers = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      devLog.log('[EquipePage] Buscando membros da equipe');
      
      const { createTenantHeaders } = await import('@/lib/utils/tenant-helper');
      const headers = await createTenantHeaders(user.id);
      
      const response = await fetch('/api/admin/team-members', {
        method: 'GET',
        headers,
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setTeamMembers(result.data || []);
          devLog.log('[EquipePage] Membros carregados:', result.data?.length || 0);
        } else {
          throw new Error(result.error || 'Erro ao carregar membros');
        }
      } else {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
    } catch (error: any) {
      devLog.error('[EquipePage] Erro ao buscar membros da equipe:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os membros da equipe.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleRoleChange = (value: string) => {
    // ✅ Aplicar preset de permissões baseado no role
    const permissions = value === 'admin' || value === 'superadmin'
      ? ADMIN_PERMISSIONS
      : COLABORADOR_PERMISSIONS;

    setFormData(prev => ({
      ...prev,
      role: value,
      permissions
    }));
  };

  const handlePermissionsChange = (permissions: UserPermissions) => {
    setFormData(prev => ({
      ...prev,
      permissions
    }));
  };

  // 🆕 Handlers para Clientes Permitidos
  const handleTogglePermitirTodos = () => {
    const novoEstado = !permitirTodosClientes;
    setPermitirTodosClientes(novoEstado);

    if (novoEstado) {
      // ✅ Marcou "permitir todos" → Selecionar TODOS os clientes
      setClientesSelecionados(clientesDisponiveis.map(c => c.id));
    } else {
      // ✅ Desmarcou "permitir todos" → Limpar array (sem acesso)
      setClientesSelecionados([]);
    }
  };

  const handleToggleCliente = (clienteId: string) => {
    setClientesSelecionados(prev => {
      const novoArray = prev.includes(clienteId)
        ? prev.filter(id => id !== clienteId)
        : [...prev, clienteId];

      // ✅ Atualizar checkbox "permitir todos" baseado na seleção
      const todosClientesIds = clientesDisponiveis.map(c => c.id);
      const temTodos = todosClientesIds.length > 0 &&
                      novoArray.length === todosClientesIds.length &&
                      todosClientesIds.every(id => novoArray.includes(id));
      setPermitirTodosClientes(temTodos);

      return novoArray;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) return;

    // ✅ VERIFICAÇÃO GLOBAL: Verificar email antes de submeter (apenas para novos membros)
    if (!editMode) {
      devLog.log("[EquipePage] handleSubmit: Verificando disponibilidade do email...");
      await checkEmailAvailability(formData.email);

      // Se o email não estiver disponível, bloquear submissão
      if (emailAvailable === false || emailError) {
        devLog.warn("[EquipePage] handleSubmit: Email não disponível, bloqueando submissão");
        toast({
          title: "Email já cadastrado",
          description: emailError || "Este email já está em uso no sistema.",
          variant: "destructive",
        });
        return;
      }

      // ✅ Senha é obrigatória para novos membros (definida pelo admin, na hora)
      if (!formData.password || formData.password.length < 8) {
        toast({
          title: "Senha obrigatória",
          description: "Defina uma senha de pelo menos 8 caracteres para o novo membro.",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      setLoading(true);
      
      const { createTenantHeaders } = await import('@/lib/utils/tenant-helper');
      const headers = await createTenantHeaders(user.id);
      
      const url = editMode ? `/api/admin/team-members/${currentUserId}` : '/api/admin/team-members';
      const method = editMode ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        if (result.success) {
          // 🆕 Salvar clientes permitidos (apenas para colaboradores)
          if (formData.role === 'colaborador' && (editMode || result.userId)) {
            const userId = editMode ? currentUserId : result.userId;
            await salvarClientesPermitidos(userId!);
          }

          toast({
            title: editMode ? 'Sucesso' : '✅ Membro adicionado com sucesso!',
            description: editMode
              ? 'Membro atualizado com sucesso!'
              : `Senha definida: ${formData.password}. Um e-mail com essas credenciais também foi enviado para ${formData.email}.`,
            duration: editMode ? undefined : 20000,
          });

          resetForm();
          setOpen(false);
          fetchTeamMembers();

          // ✅ NOVO: Se editou o próprio usuário, atualizar perfil no AuthContext
          if (editMode && currentUserId === user?.id) {
            devLog.log('[EquipePage] Atualizando perfil próprio após edição');
            await refreshUserProfile();
          }
        } else {
          throw new Error(result.error || 'Erro ao salvar membro');
        }
      } else {
        // ✅ CORREÇÃO: Pegar mensagem de erro do JSON response
        throw new Error(result.error || `Erro HTTP: ${response.status}`);
      }
    } catch (error: any) {
      devLog.error('[EquipePage] Erro ao salvar membro:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao salvar membro da equipe.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (member: TeamMember) => {
    // ✅ Carregar permissions do membro (com fallback baseado no role)
    const memberPermissions = (member as any).permissions ||
      (member.role === 'admin' || member.role === 'superadmin' ? ADMIN_PERMISSIONS : COLABORADOR_PERMISSIONS);

    setFormData({
      name: member.name,
      email: member.email,
      role: member.role,
      phone: member.phone || '',
      department: member.department || '',
      permissions: memberPermissions,
      password: ''
    });
    setCurrentUserId(member.id);
    setEditMode(true);
    setOpen(true);

    // 🆕 Carregar clientes disponíveis e clientes permitidos para colaboradores
    if (member.role === 'colaborador') {
      // ✅ CORREÇÃO RACE CONDITION: Passar dados diretamente ao invés de depender do estado
      const clientes = await fetchClientesDisponiveis();
      await fetchClientesPermitidos(member.id, clientes || []);
    }
  };

  const handleDeleteClick = async (memberId: string, memberName: string) => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // ✅ Verificar quantos projetos o membro é responsável
      const { createTenantHeaders } = await import('@/lib/utils/tenant-helper');
      const headers = await createTenantHeaders(user.id);

      const response = await fetch(`/api/admin/team-members/${memberId}`, {
        method: 'GET',
        headers,
      });

      if (response.ok) {
        const result = await response.json();
        const projectCount = result.projectCount || 0;

        // Armazenar a contagem para usar no modal
        setMemberToDelete({ id: memberId, name: memberName, projectCount });
        setDeleteDialogOpen(true);
      } else {
        throw new Error('Erro ao verificar projetos do membro');
      }
    } catch (error: any) {
      devLog.error('[EquipePage] Erro ao verificar projetos:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível verificar os projetos do membro.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!user?.id || !memberToDelete) return;

    try {
      setLoading(true);

      const { createTenantHeaders } = await import('@/lib/utils/tenant-helper');
      const headers = await createTenantHeaders(user.id);

      const response = await fetch(`/api/admin/team-members/${memberToDelete.id}`, {
        method: 'DELETE',
        headers,
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          toast({
            title: 'Sucesso',
            description: 'Membro removido da equipe com sucesso!',
          });
          fetchTeamMembers();
          setDeleteDialogOpen(false);
          setMemberToDelete(null);
        } else {
          throw new Error(result.error || 'Erro ao remover membro');
        }
      } else {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
    } catch (error: any) {
      devLog.error('[EquipePage] Erro ao remover membro:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao remover membro da equipe.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      role: 'colaborador',
      phone: '',
      department: '',
      permissions: COLABORADOR_PERMISSIONS, // ✅ Reset com preset padrão
      password: ''
    });
    setShowPassword(false);
    setEditMode(false);
    setCurrentUserId(null);
    // Resetar estados de validação de email
    setEmailCheckLoading(false);
    setEmailError(null);
    setEmailAvailable(null);
    // 🆕 Resetar estados de clientes permitidos
    setClientesSelecionados([]);
    setBuscaCliente('');
    setPermitirTodosClientes(true);
    setClientesPermitidosCarregados(false); // ✅ Resetar flag de carregamento
  };

  // ✅ Função para abrir modal de adicionar (usado pelos botões "Adicionar Membro")
  const handleAddMember = async () => {
    resetForm();
    // 🆕 Carregar clientes disponíveis quando abrir para adicionar novo membro
    const clientes = await fetchClientesDisponiveis();

    // ✅ Inicializar novo colaborador com todos os clientes selecionados
    if (clientes && clientes.length > 0) {
      setClientesSelecionados(clientes.map(c => c.id));
      setPermitirTodosClientes(true);
    }

    // ✅ Marcar como carregado (novo membro não tem dados para carregar)
    setClientesPermitidosCarregados(true);

    setOpen(true);
  };

  // ✅ DEBUG: Verificar roles do usuário
  useEffect(() => {
    if (user) {
      devLog.log('[Admin Equipe] Verificando roles do usuário:', {
        userId: user.id,
        userRole: user.role,
        profileRole: user.profile?.role,
        userObject: user
      });
    }
  }, [user]);


  // ✅ CORREÇÃO: Verificar se é admin completo ou tem permissão de gerenciar equipe
  const userPermissions = user?.permissions || (user?.profile as any)?.permissions || {};
  const isFullAdmin = user?.role === 'admin' || user?.role === 'superadmin' ||
                      user?.profile?.role === 'admin' || user?.profile?.role === 'superadmin';
  const canManageTeam = isFullAdmin || userPermissions.can_manage_team === true;

  devLog.log('[Admin Equipe] Resultado da verificação de permissões:', {
    isFullAdmin,
    canManageTeam,
    userRole: user?.role,
    profileRole: user?.profile?.role,
    permissions: userPermissions
  });

  if (!user || !canManageTeam) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Acesso Restrito</CardTitle>
            <CardDescription>
              Você não tem permissão para gerenciar a equipe.
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

  return (
    <div className="space-y-8">
      {/* Header com Gradiente Melhorado */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 p-8 text-white shadow-lg">
        <div className="relative z-10 max-w-3xl">
          <h1 className="text-3xl font-bold flex items-center">
            <Users className="h-8 w-8 mr-3 text-white/80" />
            Equipe
          </h1>
          <p className="mt-2 text-teal-100 text-lg">
            Gerencie os membros da sua equipe e suas permissões de acesso
          </p>
          <p className="mt-4 bg-white/20 px-4 py-2 rounded-lg inline-flex items-center text-sm">
            <span className="font-semibold mr-2">{teamMembers.length}</span> 
            {teamMembers.length === 1 ? 'membro' : 'membros'} na equipe
          </p>
        </div>
        
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-teal-500/20"></div>
        <div className="absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-emerald-500/20"></div>
        <div className="absolute right-40 bottom-10 h-16 w-16 rounded-full bg-white/10"></div>
      </div>

      {/* Controles */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar membros..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={handleAddMember}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Adicionar Membro
            </Button>
          </DialogTrigger>
          
          <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>
                {editMode ? 'Editar Membro' : 'Adicionar Novo Membro'}
              </DialogTitle>
              <DialogDescription>
                {editMode ? 'Atualize as informações do membro da equipe.' : 'Adicione um novo membro à sua equipe.'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="overflow-y-auto flex-1 pr-3 py-1 space-y-4 custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Nome completo"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <div className="relative">
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="email@exemplo.com"
                      required
                      disabled={editMode}
                      className={`${editMode ? 'bg-gray-100 cursor-not-allowed' : ''} ${emailError ? 'border-red-500' : emailAvailable ? 'border-green-500' : ''}`}
                    />
                    {!editMode && emailCheckLoading && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      </div>
                    )}
                    {!editMode && emailAvailable === true && !emailCheckLoading && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Check className="w-5 h-5 text-green-500" />
                      </div>
                    )}
                    {!editMode && emailAvailable === false && !emailCheckLoading && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <X className="w-5 h-5 text-red-500" />
                      </div>
                    )}
                  </div>
                  {editMode && (
                    <p className="text-xs text-gray-500">O email não pode ser alterado</p>
                  )}
                  {!editMode && emailError && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <X className="h-4 w-4" />
                      {emailError}
                    </p>
                  )}
                  {!editMode && emailAvailable === true && !emailCheckLoading && (
                    <p className="text-sm text-green-600 flex items-center gap-1">
                      <Check className="h-4 w-4" />
                      Email disponível!
                    </p>
                  )}
                </div>
              </div>

              {/* ✅ Senha de acesso — definida pelo admin na hora (digitada ou gerada),
                  em vez de depender do e-mail de convite para o próprio usuário criar. */}
              {!editMode && (
                <div className="space-y-2">
                  <Label htmlFor="password">Senha de Acesso</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={handleInputChange}
                        placeholder="Senha do membro"
                        autoComplete="new-password"
                        className="pr-10"
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        onClick={() => setShowPassword((p) => !p)}
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5 whitespace-nowrap"
                      onClick={() => {
                        const pwd = generateSecurePassword();
                        setFormData(prev => ({ ...prev, password: pwd }));
                        setShowPassword(true);
                      }}
                    >
                      <Key className="h-3.5 w-3.5" />
                      Gerar Senha Segura
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">Mínimo 8 caracteres. As credenciais também serão enviadas por e-mail.</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Função</Label>
                  <Select value={formData.role} onValueChange={handleRoleChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a função" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="colaborador">Colaborador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="department">Departamento</Label>
                  <Select
                    value={formData.department}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, department: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o departamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Engenharia">Engenharia</SelectItem>
                      <SelectItem value="Financeiro">Financeiro</SelectItem>
                      <SelectItem value="Administrativo">Administrativo</SelectItem>
                      <SelectItem value="Diretor">Diretor</SelectItem>
                      <SelectItem value="Marketing">Marketing</SelectItem>
                      <SelectItem value="Comercial">Comercial</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="(11) 99999-9999"
                />
              </div>

              {/* ✅ Componente de Permissões */}
              <PermissionsCheckboxes
                role={formData.role}
                permissions={formData.permissions}
                onChange={handlePermissionsChange}
              />

              {/* 🆕 CLIENTES PERMITIDOS - Apenas para Colaboradores */}
              {formData.role === 'colaborador' && (
                <div className="space-y-4 mt-6 pt-6 border-t">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-teal-600" />
                    <Label className="text-base font-semibold">Clientes Permitidos</Label>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Selecione os clientes cujos projetos este colaborador pode acessar
                  </p>

                  {/* ✅ Loading skeleton enquanto carrega */}
                  {editMode && !clientesPermitidosCarregados ? (
                    <div className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg animate-pulse">
                      <div className="h-4 w-4 bg-gray-300 rounded"></div>
                      <div className="h-4 bg-gray-300 rounded w-64"></div>
                    </div>
                  ) : (
                    /* Checkbox: Permitir todos */
                    <div className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                      <input
                        type="checkbox"
                        id="permitir-todos-clientes"
                        checked={permitirTodosClientes}
                        onChange={handleTogglePermitirTodos}
                        className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor="permitir-todos-clientes"
                        className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer"
                      >
                        Permitir acesso a todos os clientes ({clientesDisponiveis.length})
                      </label>
                    </div>
                  )}

                  {/* Busca de Clientes */}
                  {!permitirTodosClientes && (
                    <>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          placeholder="Buscar cliente..."
                          value={buscaCliente}
                          onChange={(e) => setBuscaCliente(e.target.value)}
                          className="pl-10"
                        />
                      </div>

                      {/* Lista de Clientes */}
                      <div className="border rounded-lg p-4 max-h-64 overflow-y-auto space-y-3 bg-white dark:bg-gray-900">
                        {loadingClientes ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
                          </div>
                        ) : clientesDisponiveis.length === 0 ? (
                          <p className="text-sm text-gray-500 text-center py-4">
                            Nenhum cliente cadastrado
                          </p>
                        ) : (
                          <>
                            {/* Selecionados */}
                            {clientesSelecionados.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                  Selecionados ({clientesSelecionados.length})
                                </p>
                                {clientesDisponiveis
                                  .filter(cliente => 
                                    clientesSelecionados.includes(cliente.id) &&
                                    (cliente.company_name || cliente.name).toLowerCase().includes(buscaCliente.toLowerCase())
                                  )
                                  .map(cliente => (
                                    <div key={cliente.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded">
                                      <input
                                        type="checkbox"
                                        id={`cliente-${cliente.id}`}
                                        checked={true}
                                        onChange={() => handleToggleCliente(cliente.id)}
                                        className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                                      />
                                      <label 
                                        htmlFor={`cliente-${cliente.id}`}
                                        className="text-sm text-gray-900 dark:text-gray-100 cursor-pointer flex-1"
                                      >
                                        {cliente.company_name || cliente.name}
                                        {cliente.email && (
                                          <span className="text-xs text-gray-500 ml-2">({cliente.email})</span>
                                        )}
                                      </label>
                                    </div>
                                  ))}
                              </div>
                            )}

                            {/* Disponíveis */}
                            {clientesDisponiveis.some(c => !clientesSelecionados.includes(c.id)) && (
                              <div className="space-y-2 mt-4">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                  Disponíveis ({clientesDisponiveis.filter(c => !clientesSelecionados.includes(c.id)).length})
                                </p>
                                {clientesDisponiveis
                                  .filter(cliente => 
                                    !clientesSelecionados.includes(cliente.id) &&
                                    (cliente.company_name || cliente.name).toLowerCase().includes(buscaCliente.toLowerCase())
                                  )
                                  .map(cliente => (
                                    <div key={cliente.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded">
                                      <input
                                        type="checkbox"
                                        id={`cliente-${cliente.id}`}
                                        checked={false}
                                        onChange={() => handleToggleCliente(cliente.id)}
                                        className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                                      />
                                      <label 
                                        htmlFor={`cliente-${cliente.id}`}
                                        className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer flex-1"
                                      >
                                        {cliente.company_name || cliente.name}
                                        {cliente.email && (
                                          <span className="text-xs text-gray-500 ml-2">({cliente.email})</span>
                                        )}
                                      </label>
                                    </div>
                                  ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      <p className="text-xs text-gray-500 dark:text-gray-400 italic flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        Dica: Deixe vazio para bloquear acesso a todos os clientes
                      </p>
                    </>
                  )}
                </div>
              )}
              </div>

              <DialogFooter className="flex-shrink-0 mt-4 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loading || (!editMode && (emailAvailable === false || emailCheckLoading))}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  {loading ? 'Salvando...' : editMode ? 'Atualizar' : 'Adicionar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Mostrar resumo dos resultados quando estiver filtrando */}
      {searchQuery && (
        <div className="text-sm text-gray-500">
          Exibindo {filteredMembers.length} de {teamMembers.length} membros
        </div>
      )}

      {/* Lista de Membros */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading && teamMembers.length === 0 ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-3">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredMembers.length > 0 ? (
          filteredMembers.map((member) => {
            // ✅ Gerar cor do avatar baseada no nome (hash simples)
            const getAvatarColor = (name: string) => {
              const colors = [
                'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
                'bg-orange-500', 'bg-indigo-500', 'bg-teal-500', 'bg-red-500'
              ];
              const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
              return colors[hash % colors.length];
            };

            // ✅ Extrair iniciais do nome
            const getInitials = (name: string) => {
              const parts = name.trim().split(' ');
              if (parts.length >= 2) {
                return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
              }
              return name.substring(0, 2).toUpperCase();
            };

            // ✅ Obter permissões do membro
            const memberPermissions = (member as any).permissions || {};
            const isAdmin = member.role === 'admin' || member.role === 'superadmin';

            // ✅ Contar permissões ativas
            const activePermissions = Object.values(memberPermissions).filter(v => v === true).length;
            const totalPermissions = 12;

            // ✅ Mapear permissões para labels legíveis
            const permissionLabels: { [key: string]: string } = {
              can_view_dashboard: 'Painel',
              can_view_dashboard_financials: 'Painel Completo',
              can_create_projects: 'Criar Projetos',
              can_edit_projects: 'Editar Projetos',
              can_view_clients: 'Ver Clientes',
              can_edit_clients: 'Editar Clientes',
              can_view_financials: 'Financeiro',
              can_manage_team: 'Gerenciar Equipe',
              can_edit_preferences: 'Preferências',
              can_view_dimensionamento: 'Dimensionamento',
              can_view_assinaturas: 'Assinaturas'
            };

            // ✅ Obter as 3 primeiras permissões ativas
            const activePermissionsList = Object.entries(memberPermissions)
              .filter(([_, value]) => value === true)
              .map(([key, _]) => permissionLabels[key])
              .filter(label => label)
              .slice(0, 3);

            return (
              <Card key={member.id} className="hover:shadow-lg transition-all duration-200 border-gray-200">
                <CardHeader className="pb-4">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className={`flex-shrink-0 w-12 h-12 rounded-full ${getAvatarColor(member.name)} flex items-center justify-center text-white font-semibold text-lg shadow-md`}>
                      {getInitials(member.name)}
                    </div>

                    {/* Nome e Role */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-lg font-semibold text-gray-900 truncate">
                          {member.name}
                        </CardTitle>
                        {/* Badge de Role */}
                        {isAdmin ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                            Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                            Colaborador
                          </span>
                        )}
                      </div>

                      {member.department && (
                        <div className="flex items-center text-sm text-gray-500 mt-1">
                          <Building2 className="h-3.5 w-3.5 mr-1.5" />
                          {member.department}
                        </div>
                      )}
                    </div>

                    {/* Ações */}
                    <div className="flex space-x-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(member)}
                        disabled={loading}
                        className="h-8 w-8 p-0 hover:bg-gray-100"
                        title="Editar membro"
                      >
                        <Edit className="h-4 w-4 text-gray-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(member.id, member.name)}
                        disabled={loading}
                        className="h-8 w-8 p-0 hover:bg-red-50 text-red-600 hover:text-red-700"
                        title="Remover membro"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-0">
                  {/* Informações de Contato */}
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{member.email}</span>
                    </div>

                    {member.phone && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Phone className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                        {member.phone}
                      </div>
                    )}
                  </div>

                  {/* Seção de Permissões */}
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-700 flex items-center">
                        🔐 Permissões
                      </span>
                      {isAdmin ? (
                        <span className="text-xs font-semibold text-orange-600">
                          Acesso Total
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-gray-500">
                          {activePermissions} de {totalPermissions}
                        </span>
                      )}
                    </div>

                    {isAdmin ? (
                      <p className="text-xs text-gray-500 italic">
                        Administradores têm acesso completo a todas as funcionalidades
                      </p>
                    ) : activePermissionsList.length > 0 ? (
                      <>
                        <div className="flex flex-wrap gap-1.5">
                          {activePermissionsList.map((label, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200"
                            >
                              ✓ {label}
                            </span>
                          ))}
                          {activePermissions > 3 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                              +{activePermissions - 3} mais
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleEdit(member)}
                          className="text-xs text-teal-600 hover:text-teal-700 font-medium mt-2 hover:underline"
                        >
                          Ver todas as permissões →
                        </button>
                      </>
                    ) : (
                      <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                        ⚠️ Nenhuma permissão ativa
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full">
            <Card className="text-center py-12">
              <CardContent>
                <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchQuery ? 'Nenhum membro encontrado' : 'Nenhum membro na equipe'}
                </h3>
                <p className="text-gray-500 mb-4">
                  {searchQuery 
                    ? 'Tente ajustar sua busca ou limpar o filtro.' 
                    : 'Comece adicionando membros à sua equipe.'
                  }
                </p>
                {!searchQuery && (
                  <Button
                    onClick={handleAddMember}
                    className="bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Adicionar Primeiro Membro
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Modal de Confirmação de Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja remover este membro?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Você está prestes a remover <strong className="text-gray-900 dark:text-gray-100">{memberToDelete?.name}</strong> da equipe.
              </p>

              {memberToDelete?.projectCount && memberToDelete.projectCount > 0 ? (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 space-y-2">
                  <p className="font-medium text-amber-900 dark:text-amber-100">
                    ⚠️ Este membro é responsável por {memberToDelete.projectCount} {memberToDelete.projectCount === 1 ? 'projeto' : 'projetos'}.
                  </p>
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    Ao excluir, {memberToDelete.projectCount === 1 ? 'esse projeto ficará' : 'esses projetos ficarão'} sem responsável.
                    Você poderá atribuir um novo responsável posteriormente.
                  </p>
                </div>
              ) : null}

              <p className="text-sm text-gray-600 dark:text-gray-400">
                Esta ação não pode ser desfeita e o membro perderá acesso imediatamente ao sistema.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {loading ? 'Removendo...' : 'Sim, remover membro'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}