'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { PlusCircle, Trash2, Edit, Users, Search, Mail, Phone, Building2, Loader2, Check, X, Key, Eye, EyeOff, UserPlus, AlertTriangle, Info, ShieldCheck } from "lucide-react";
import { devLog } from "@/lib/utils/productionLogger";
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { PermissionsCheckboxes, PERMISSION_KEYS, TOTAL_PERMISSIONS, countActivePermissions } from '@/components/admin/PermissionsCheckboxes';
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

type ModalTab = 'dados' | 'permissoes' | 'clientes';

const EMPTY_FORM: FormData = {
  name: '',
  email: '',
  role: 'colaborador',
  phone: '',
  department: '',
  permissions: COLABORADOR_PERMISSIONS,
  password: ''
};

const ROLE_OPTIONS: { value: 'colaborador' | 'admin'; label: string; description: string }[] = [
  { value: 'colaborador', label: 'Colaborador', description: 'Acesso definido pelas permissões e pelos clientes escolhidos' },
  { value: 'admin', label: 'Administrador', description: 'Acesso total a todas as funcionalidades e clientes' },
];

const isAdminRole = (role: string) => role === 'admin' || role === 'superadmin';

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
  'bg-orange-500', 'bg-indigo-500', 'bg-teal-500', 'bg-red-500'
];

const getMemberAvatarColor = (name: string) => {
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

const getMemberInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.trim().substring(0, 2).toUpperCase();
};

// Máscara (DDD) 99999-9999. Números com DDI (+) ou com mais de 11 dígitos ficam como foram digitados.
const maskPhone = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (value.trim().startsWith('+') || digits.length > 11) return value;
  if (!digits) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

// Fotografias do formulário e dos clientes permitidos, usadas para saber se há alterações não salvas
const serializeForm = (form: FormData) => JSON.stringify([
  form.name, form.email, form.password, form.phone, form.department, form.role,
  isAdminRole(form.role) ? 'all' : PERMISSION_KEYS.map(key => (form.permissions?.[key] ? 1 : 0)).join('')
]);

const serializeClientes = (todos: boolean, ids: string[]) => (todos ? 'all' : [...ids].sort().join(','));

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

  // Modal: aba ativa, troca de função pendente, descarte de alterações e fotografias do estado inicial
  const [activeTab, setActiveTab] = useState<ModalTab>('dados');
  const [pendingAdmin, setPendingAdmin] = useState(false);
  const [stashedPermissions, setStashedPermissions] = useState<UserPermissions | null>(null);
  const [discardAsk, setDiscardAsk] = useState(false);
  const [baseline, setBaseline] = useState('');
  const [baselineClientes, setBaselineClientes] = useState<string | null>(null);
  const editRequestRef = useRef(0);

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
  const fetchClientesPermitidos = async (colaboradorId: string, clientesDisponiveisParam: Cliente[], requestId: number) => {
    if (!user?.id) return;

    try {
      const { createTenantHeaders } = await import('@/lib/utils/tenant-helper');
      const headers = await createTenantHeaders(user.id);

      const response = await fetch(`/api/admin/team-members/${colaboradorId}/clientes-permitidos`, { headers });
      const result = await response.json();

      // O modal já foi reaberto para outro membro: descarta esta resposta
      if (editRequestRef.current !== requestId) return;

      if (result.success) {
        const clienteIds = result.cliente_ids || [];
        const temRestricao = result.tem_restricao || false;

        setClientesSelecionados(clienteIds);

        // ✅ LÓGICA CORRIGIDA:
        // - Se NÃO tem restrição → "Todos os clientes"
        // - Se TEM restrição e tem TODOS os clientes → "Todos os clientes"
        // - Caso contrário → "Clientes específicos"
        let permitirTodos = true;
        if (temRestricao) {
          // ✅ CORREÇÃO RACE CONDITION: Usar parâmetro ao invés do estado React
          const todosClientesIds = clientesDisponiveisParam.map(c => c.id);
          permitirTodos = todosClientesIds.length > 0 &&
                          clienteIds.length === todosClientesIds.length &&
                          todosClientesIds.every(id => clienteIds.includes(id));
        }
        setPermitirTodosClientes(permitirTodos);
        setBaselineClientes(serializeClientes(permitirTodos, clienteIds));

        devLog.log('[EquipePage] Clientes permitidos carregados:', {
          quantidade: clienteIds.length,
          temRestricao,
          permitirTodos
        });
      } else {
        // Sem dados confiáveis: mantém o estado inicial; os clientes só são salvos se forem alterados
        setBaselineClientes(serializeClientes(true, []));
      }

      // ✅ Marcar como carregado
      setClientesPermitidosCarregados(true);
    } catch (error) {
      devLog.error('[EquipePage] Erro ao carregar clientes permitidos:', error);
      if (editRequestRef.current !== requestId) return;
      setBaselineClientes(serializeClientes(true, []));
      setClientesPermitidosCarregados(true); // Marcar como carregado mesmo com erro
    }
  };

  // 🆕 Salvar clientes permitidos
  const salvarClientesPermitidos = async (colaboradorId: string) => {
    if (!user?.id) return;

    try {
      const { createTenantHeaders } = await import('@/lib/utils/tenant-helper');
      const headers = await createTenantHeaders(user.id);

      // "Todos os clientes" = enviar todos os IDs (a API grava isso como sem restrição).
      // Sem a lista de clientes carregada não há como representar "todos": não altera nada.
      if (permitirTodosClientes && clientesDisponiveis.length === 0) return;

      // ✅ Enviar array real de IDs selecionados (API decide a lógica)
      const clienteIds = permitirTodosClientes ? clientesDisponiveis.map(c => c.id) : clientesSelecionados;

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

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const phone = maskPhone(e.target.value);
    setFormData(prev => ({ ...prev, phone }));
  };

  // Troca de função: virar Administrador pede confirmação; voltar para Colaborador
  // restaura as permissões que estavam configuradas em vez de zerar para o padrão.
  const handleRolePick = (value: 'colaborador' | 'admin') => {
    const current = isAdminRole(formData.role) ? 'admin' : formData.role;
    if (value === current) {
      setPendingAdmin(false);
      return;
    }

    if (value === 'admin') {
      setPendingAdmin(true);
      return;
    }

    setFormData(prev => ({
      ...prev,
      role: 'colaborador',
      permissions: stashedPermissions ?? (isAdminRole(prev.role) ? COLABORADOR_PERMISSIONS : prev.permissions)
    }));
    if (stashedPermissions) {
      toast({
        title: 'Permissões restauradas',
        description: 'As permissões que estavam configuradas antes da troca de função foram restauradas.',
      });
    }
    setPendingAdmin(false);
  };

  const handleConfirmAdmin = () => {
    if (!isAdminRole(formData.role)) {
      setStashedPermissions(formData.permissions);
    }
    setFormData(prev => ({
      ...prev,
      role: 'admin',
      permissions: ADMIN_PERMISSIONS
    }));
    setPendingAdmin(false);
  };

  const handlePermissionsChange = (permissions: UserPermissions) => {
    setFormData(prev => ({
      ...prev,
      permissions
    }));
  };

  // 🆕 Handlers para Clientes Permitidos
  // Trocar entre "Todos" e "Específicos" não apaga a seleção já feita
  const handleToggleCliente = (clienteId: string) => {
    setClientesSelecionados(prev =>
      prev.includes(clienteId)
        ? prev.filter(id => id !== clienteId)
        : [...prev, clienteId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) return;

    if (pendingAdmin) {
      setActiveTab('dados');
      toast({
        title: "Confirme a troca de função",
        description: "Confirme ou cancele a troca para Administrador antes de salvar.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.name.trim()) {
      setActiveTab('dados');
      toast({
        title: "Nome obrigatório",
        description: "Informe o nome do membro.",
        variant: "destructive",
      });
      return;
    }

    if (!editMode && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setActiveTab('dados');
      toast({
        title: "E-mail inválido",
        description: "Informe um e-mail válido para o novo membro.",
        variant: "destructive",
      });
      return;
    }

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

      // Administrador salva com acesso total. Colaborador sempre tem um dos dois painéis:
      // com ou sem dados financeiros (as duas chaves são excludentes).
      let permissionsToSave: UserPermissions = formData.permissions;
      if (isAdminRole(formData.role)) {
        permissionsToSave = ADMIN_PERMISSIONS;
      } else if (formData.role === 'colaborador') {
        permissionsToSave = {
          ...formData.permissions,
          can_view_dashboard: !formData.permissions?.can_view_dashboard_financials
        };
      }

      // Clientes permitidos só são enviados quando mudaram (ou quando o membro acabou de virar colaborador)
      const originalRole = editMode ? teamMembers.find(m => m.id === currentUserId)?.role : undefined;
      const clientesAlterados = !editMode ||
        originalRole !== 'colaborador' ||
        (baselineClientes !== null && serializeClientes(permitirTodosClientes, clientesSelecionados) !== baselineClientes);

      const response = await fetch(url, {
        method,
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...formData, name: formData.name.trim(), permissions: permissionsToSave }),
      });

      const result = await response.json();

      if (response.ok) {
        if (result.success) {
          // 🆕 Salvar clientes permitidos (apenas para colaboradores)
          if (formData.role === 'colaborador' && (editMode || result.userId) && clientesPermitidosCarregados && clientesAlterados) {
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

  const handleEdit = async (member: TeamMember, tab: ModalTab = 'dados') => {
    // ✅ Carregar permissions do membro (com fallback baseado no role)
    const memberPermissions = (member as any).permissions ||
      (member.role === 'admin' || member.role === 'superadmin' ? ADMIN_PERMISSIONS : COLABORADOR_PERMISSIONS);

    const memberForm: FormData = {
      name: member.name,
      email: member.email,
      role: member.role,
      phone: member.phone || '',
      department: member.department || '',
      permissions: memberPermissions,
      password: ''
    };

    const requestId = ++editRequestRef.current;

    setFormData(memberForm);
    setBaseline(serializeForm(memberForm));
    setCurrentUserId(member.id);
    setEditMode(true);
    setShowPassword(false);
    setActiveTab(tab === 'clientes' && member.role !== 'colaborador' ? 'dados' : tab);
    setPendingAdmin(false);
    setStashedPermissions(null);
    setDiscardAsk(false);
    // Limpa o estado de clientes do membro aberto anteriormente até o novo carregar
    setClientesSelecionados([]);
    setBuscaCliente('');
    setPermitirTodosClientes(true);
    setBaselineClientes(null);
    setClientesPermitidosCarregados(false);
    setOpen(true);

    // 🆕 Carregar clientes disponíveis (para qualquer função, caso o membro vire colaborador
    // na edição) e os clientes permitidos de quem já é colaborador
    // ✅ CORREÇÃO RACE CONDITION: Passar dados diretamente ao invés de depender do estado
    const clientes = await fetchClientesDisponiveis();
    if (editRequestRef.current !== requestId) return;

    if (member.role === 'colaborador') {
      await fetchClientesPermitidos(member.id, clientes || [], requestId);
    } else {
      setBaselineClientes(serializeClientes(true, []));
      setClientesPermitidosCarregados(true);
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
    setFormData(EMPTY_FORM); // ✅ Reset com preset padrão
    setBaseline(serializeForm(EMPTY_FORM));
    setBaselineClientes(serializeClientes(true, []));
    setActiveTab('dados');
    setPendingAdmin(false);
    setStashedPermissions(null);
    setDiscardAsk(false);
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
    const requestId = ++editRequestRef.current;
    resetForm();
    // 🆕 Carregar clientes disponíveis quando abrir para adicionar novo membro
    // (novo colaborador começa em "Todos os clientes", que ao salvar envia todos os IDs)
    await fetchClientesDisponiveis();
    if (editRequestRef.current !== requestId) return;

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

  // ---- Estado derivado do modal de membro ----
  const fullAccess = isAdminRole(formData.role);
  const isColaborador = formData.role === 'colaborador';
  const currentTab: ModalTab = activeTab === 'clientes' && !isColaborador ? 'dados' : activeTab;
  const shownRole = pendingAdmin || fullAccess ? 'admin' : formData.role;
  const headerName = formData.name.trim();
  const activeCount = countActivePermissions(formData.permissions);
  const clientesCarregando = loadingClientes || (editMode && !clientesPermitidosCarregados);
  const nenhumCliente = !permitirTodosClientes && clientesSelecionados.length === 0;
  const clientesFiltrados = clientesDisponiveis.filter(cliente =>
    (cliente.company_name || cliente.name || '').toLowerCase().includes(buscaCliente.toLowerCase().trim())
  );
  const isDirty = serializeForm(formData) !== baseline ||
    (isColaborador && baselineClientes !== null &&
      serializeClientes(permitirTodosClientes, clientesSelecionados) !== baselineClientes);

  const modalTabs: { id: ModalTab; label: string; badge?: string; warn?: boolean }[] = [
    { id: 'dados', label: 'Dados' },
    { id: 'permissoes', label: 'Permissões', badge: fullAccess ? 'Total' : `${activeCount}/${TOTAL_PERMISSIONS}` },
    ...(isColaborador
      ? [{
          id: 'clientes' as ModalTab,
          label: 'Clientes permitidos',
          badge: clientesCarregando ? '…' : permitirTodosClientes ? 'Todos' : String(clientesSelecionados.length),
          warn: !clientesCarregando && nenhumCliente,
        }]
      : []),
  ];

  const closeModal = () => {
    setOpen(false);
    setDiscardAsk(false);
    setPendingAdmin(false);
  };

  // Fechar (X, Cancelar, Esc, clique fora) pede confirmação se houver alterações não salvas
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setOpen(true);
      return;
    }
    if (loading) return;
    if (discardAsk) {
      setDiscardAsk(false);
      return;
    }
    if (isDirty) {
      setDiscardAsk(true);
      return;
    }
    closeModal();
  };

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
        
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button
              onClick={handleAddMember}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Adicionar Membro
            </Button>
          </DialogTrigger>

          <DialogContent className="flex h-[min(720px,90vh)] max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[640px]">
            {/* Cabeçalho com a identidade do membro */}
            <DialogHeader className="flex-shrink-0 flex-row items-center gap-3.5 space-y-0 pl-6 pr-14 pt-[22px] text-left">
              <div
                className={cn(
                  'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-base font-semibold',
                  headerName ? `${getMemberAvatarColor(headerName)} text-white` : 'bg-muted text-muted-foreground'
                )}
              >
                {headerName ? getMemberInitials(headerName) : <UserPlus className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="truncate text-[17px] font-semibold leading-6 tracking-tight">
                  <span className="sr-only">{editMode ? 'Editar membro: ' : 'Adicionar membro: '}</span>
                  {headerName || (editMode ? 'Membro sem nome' : 'Novo membro')}
                </DialogTitle>
                <DialogDescription className="mt-0.5 flex flex-wrap items-center gap-2 text-[13px] leading-[18px]">
                  <span className="min-w-0 truncate">
                    {editMode ? formData.email : (formData.email.trim() || 'Preencha os dados e defina o acesso')}
                  </span>
                  <span
                    className={cn(
                      'inline-flex flex-shrink-0 items-center rounded-full px-2 py-px text-[11.5px] font-semibold leading-4',
                      fullAccess
                        ? 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-200'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {fullAccess ? 'Administrador' : isColaborador ? 'Colaborador' : formData.role}
                  </span>
                </DialogDescription>
              </div>
            </DialogHeader>

            {/* Abas */}
            <div role="tablist" aria-label="Seções do membro" className="mt-3.5 flex flex-shrink-0 gap-1 overflow-x-auto border-b px-4">
              {modalTabs.map((tab) => {
                const selected = currentTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    id={`equipe-tab-${tab.id}`}
                    aria-selected={selected}
                    aria-controls={`equipe-panel-${tab.id}`}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      '-mb-px inline-flex items-center gap-2 whitespace-nowrap border-b-2 border-transparent px-2.5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-600',
                      selected && 'border-teal-600 text-teal-700 hover:text-teal-700 dark:text-teal-400'
                    )}
                  >
                    {tab.label}
                    {tab.badge && (
                      <span
                        className={cn(
                          'rounded-full px-[7px] py-px text-[11px] font-semibold leading-4 tabular-nums',
                          tab.warn
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
                            : selected
                              ? 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-200'
                              : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-[22px] [scrollbar-width:thin]">

                {/* Aba: Dados */}
                {currentTab === 'dados' && (
                  <div role="tabpanel" id="equipe-panel-dados" aria-labelledby="equipe-tab-dados" className="space-y-5">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className={cn('space-y-2', editMode && 'sm:col-span-2')}>
                        <Label htmlFor="name">Nome</Label>
                        <Input
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          placeholder="Nome completo"
                          autoComplete="off"
                          className="h-10 focus-visible:ring-teal-600"
                        />
                      </div>

                      {/* E-mail só é editável ao adicionar; na edição ele aparece no cabeçalho */}
                      {!editMode && (
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
                              autoComplete="off"
                              className={cn(
                                'h-10 pr-10 focus-visible:ring-teal-600',
                                emailError ? 'border-red-500' : emailAvailable ? 'border-green-500' : ''
                              )}
                            />
                            {emailCheckLoading && (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                              </div>
                            )}
                            {emailAvailable === true && !emailCheckLoading && (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <Check className="w-5 h-5 text-green-500" />
                              </div>
                            )}
                            {emailAvailable === false && !emailCheckLoading && (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <X className="w-5 h-5 text-red-500" />
                              </div>
                            )}
                          </div>
                          {emailError && (
                            <p className="text-[12.5px] text-red-500 flex items-center gap-1">
                              <X className="h-3.5 w-3.5 flex-shrink-0" />
                              {emailError}
                            </p>
                          )}
                          {emailAvailable === true && !emailCheckLoading && (
                            <p className="text-[12.5px] text-green-600 flex items-center gap-1">
                              <Check className="h-3.5 w-3.5 flex-shrink-0" />
                              Email disponível!
                            </p>
                          )}
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="phone">Telefone</Label>
                        <Input
                          id="phone"
                          name="phone"
                          inputMode="tel"
                          value={formData.phone}
                          onChange={handlePhoneChange}
                          placeholder="(11) 99999-9999"
                          autoComplete="off"
                          className="h-10 focus-visible:ring-teal-600"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="department">Departamento</Label>
                        <Select
                          value={formData.department}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, department: value }))}
                        >
                          <SelectTrigger id="department" className="focus:ring-teal-600">
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

                    <fieldset className="min-w-0 space-y-2">
                      <legend className="mb-2 text-sm font-medium leading-none">Função</legend>
                      {!fullAccess && !isColaborador && (
                        <p className="text-xs text-muted-foreground">
                          Função atual: {formData.role}. Escolher uma opção abaixo altera a função.
                        </p>
                      )}
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {ROLE_OPTIONS.map((option) => {
                          const checked = shownRole === option.value;
                          return (
                            <label
                              key={option.value}
                              className={cn(
                                'relative flex min-w-0 cursor-pointer items-start gap-2.5 rounded-lg border bg-background px-3.5 py-3 transition-colors hover:border-slate-300 focus-within:ring-2 focus-within:ring-teal-600 focus-within:ring-offset-2',
                                checked && 'border-teal-600 bg-teal-50 ring-1 ring-teal-600 hover:border-teal-600 dark:bg-teal-950/40'
                              )}
                            >
                              <input
                                type="radio"
                                name="equipe-role"
                                value={option.value}
                                checked={checked}
                                onChange={() => handleRolePick(option.value)}
                                className="sr-only"
                              />
                              <span
                                aria-hidden="true"
                                className={cn(
                                  'mt-0.5 h-4 w-4 flex-shrink-0 rounded-full border-[1.5px] border-slate-300 bg-background',
                                  checked && 'border-[5px] border-teal-600'
                                )}
                              />
                              <span>
                                <span className="block text-sm font-semibold leading-5">{option.label}</span>
                                <span className="mt-px block text-[12.5px] leading-[17px] text-muted-foreground">{option.description}</span>
                              </span>
                            </label>
                          );
                        })}
                      </div>

                      {pendingAdmin && (
                        <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-[13px] leading-[19px] text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                          <div>
                            <p>
                              <strong className="font-semibold">Tornar Administrador?</strong> Passa a ter acesso total, incluindo
                              financeiro, equipe e todos os clientes. As permissões atuais ficam guardadas caso você volte para
                              Colaborador antes de salvar.
                            </p>
                            <div className="mt-2.5 flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                onClick={handleConfirmAdmin}
                                className="h-8 bg-teal-600 text-[13px] text-white hover:bg-teal-700"
                              >
                                Tornar Administrador
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setPendingAdmin(false)}
                                className="h-8 text-[13px] text-foreground"
                              >
                                Manter Colaborador
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </fieldset>

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
                              className="h-10 pr-10 focus-visible:ring-teal-600"
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
                            className="gap-1.5 whitespace-nowrap px-3"
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
                  </div>
                )}

                {/* Aba: Permissões */}
                {currentTab === 'permissoes' && (
                  <div role="tabpanel" id="equipe-panel-permissoes" aria-labelledby="equipe-tab-permissoes">
                    <PermissionsCheckboxes
                      role={formData.role}
                      permissions={formData.permissions}
                      onChange={handlePermissionsChange}
                    />
                  </div>
                )}

                {/* Aba: Clientes permitidos — apenas para Colaboradores */}
                {currentTab === 'clientes' && isColaborador && (
                  <div role="tabpanel" id="equipe-panel-clientes" aria-labelledby="equipe-tab-clientes" className="space-y-5">
                    <p className="max-w-[68ch] text-[13px] leading-[19px] text-muted-foreground">
                      Define de quais clientes este colaborador enxerga projetos.{' '}
                      {formData.permissions?.can_view_all_projects
                        ? 'Como “Visualizar todos os projetos” está ligado, ele vê todos os projetos desses clientes.'
                        : 'Como “Visualizar todos os projetos” está desligado, ele vê apenas os projetos em que é responsável.'}{' '}
                      <button
                        type="button"
                        onClick={() => setActiveTab('permissoes')}
                        className="rounded-sm font-medium text-teal-700 underline underline-offset-2 hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 dark:text-teal-400"
                      >
                        Alterar em Permissões
                      </button>
                    </p>

                    {clientesCarregando ? (
                      <div className="flex items-center justify-center py-10">
                        <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
                      </div>
                    ) : (
                      <>
                        <div role="radiogroup" aria-label="Clientes permitidos" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {[
                            {
                              todos: true,
                              label: 'Todos os clientes',
                              description: `Os ${clientesDisponiveis.length} atuais e os que forem cadastrados depois`,
                            },
                            { todos: false, label: 'Clientes específicos', description: 'Somente os que você escolher abaixo' },
                          ].map((option) => {
                            const checked = permitirTodosClientes === option.todos;
                            return (
                              <label
                                key={option.label}
                                className={cn(
                                  'relative flex min-w-0 cursor-pointer items-start gap-2.5 rounded-lg border bg-background px-3.5 py-3 transition-colors hover:border-slate-300 focus-within:ring-2 focus-within:ring-teal-600 focus-within:ring-offset-2',
                                  checked && 'border-teal-600 bg-teal-50 ring-1 ring-teal-600 hover:border-teal-600 dark:bg-teal-950/40'
                                )}
                              >
                                <input
                                  type="radio"
                                  name="equipe-client-mode"
                                  checked={checked}
                                  onChange={() => setPermitirTodosClientes(option.todos)}
                                  className="sr-only"
                                />
                                <span
                                  aria-hidden="true"
                                  className={cn(
                                    'mt-0.5 h-4 w-4 flex-shrink-0 rounded-full border-[1.5px] border-slate-300 bg-background',
                                    checked && 'border-[5px] border-teal-600'
                                  )}
                                />
                                <span>
                                  <span className="block text-sm font-semibold leading-5">{option.label}</span>
                                  <span className="mt-px block text-[12.5px] leading-[17px] text-muted-foreground">{option.description}</span>
                                </span>
                              </label>
                            );
                          })}
                        </div>

                        {!permitirTodosClientes && (
                          <div className="space-y-3">
                            {nenhumCliente ? (
                              <div
                                role="status"
                                className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-[13px] leading-[19px] text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200"
                              >
                                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                                <p>
                                  <strong className="font-semibold">Nenhum cliente selecionado.</strong> Se salvar assim, este
                                  colaborador não verá nenhum projeto.
                                </p>
                              </div>
                            ) : (
                              <>
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <span className="text-[13px] font-medium leading-none">
                                    {clientesSelecionados.length} {clientesSelecionados.length === 1 ? 'cliente selecionado' : 'clientes selecionados'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setClientesSelecionados([])}
                                    className="rounded-sm text-[12.5px] font-medium text-teal-700 underline underline-offset-2 hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 dark:text-teal-400"
                                  >
                                    Limpar seleção
                                  </button>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {clientesDisponiveis
                                    .filter(cliente => clientesSelecionados.includes(cliente.id))
                                    .map(cliente => (
                                      <span
                                        key={cliente.id}
                                        className="inline-flex max-w-full items-center gap-1 rounded-full border border-teal-200 bg-teal-50 py-[3px] pl-2.5 pr-1 text-[13px] font-medium leading-[18px] text-teal-700 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-200"
                                      >
                                        <span className="truncate">{cliente.company_name || cliente.name}</span>
                                        <button
                                          type="button"
                                          onClick={() => handleToggleCliente(cliente.id)}
                                          aria-label={`Remover ${cliente.company_name || cliente.name}`}
                                          className="flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full hover:bg-teal-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:hover:bg-teal-900"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </span>
                                    ))}
                                </div>
                                {clientesDisponiveis.length > 0 && clientesDisponiveis.every(cliente => clientesSelecionados.includes(cliente.id)) && (
                                  <div className="flex items-start gap-2.5 rounded-lg border bg-muted/50 px-3.5 py-3 text-[13px] leading-[19px] text-muted-foreground">
                                    <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
                                    <p>
                                      Todos os clientes estão marcados. Ao salvar, isso equivale a “Todos os clientes”: os que
                                      forem cadastrados depois também entram.
                                    </p>
                                  </div>
                                )}
                              </>
                            )}

                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                              <Input
                                placeholder="Buscar cliente..."
                                aria-label="Buscar cliente"
                                value={buscaCliente}
                                onChange={(e) => setBuscaCliente(e.target.value)}
                                className="h-10 pl-10 focus-visible:ring-teal-600"
                              />
                            </div>

                            {/* Lista de clientes: ordem fixa, marcar não muda o item de lugar */}
                            <div className="max-h-[232px] divide-y divide-border overflow-y-auto rounded-lg border [scrollbar-width:thin]">
                              {clientesDisponiveis.length === 0 ? (
                                <p className="px-3 py-[18px] text-center text-[13px] text-muted-foreground">
                                  Nenhum cliente cadastrado
                                </p>
                              ) : clientesFiltrados.length === 0 ? (
                                <p className="px-3 py-[18px] text-center text-[13px] text-muted-foreground">
                                  Nenhum cliente encontrado para “{buscaCliente}”.
                                </p>
                              ) : (
                                clientesFiltrados.map(cliente => {
                                  const checked = clientesSelecionados.includes(cliente.id);
                                  return (
                                    <label
                                      key={cliente.id}
                                      htmlFor={`cliente-${cliente.id}`}
                                      className="flex cursor-pointer items-center gap-2.5 px-3 py-[9px] text-sm leading-5 hover:bg-muted/50"
                                    >
                                      <input
                                        type="checkbox"
                                        id={`cliente-${cliente.id}`}
                                        checked={checked}
                                        onChange={() => handleToggleCliente(cliente.id)}
                                        className="h-4 w-4 flex-shrink-0 cursor-pointer accent-teal-600"
                                      />
                                      <span className={cn('min-w-0 flex-1 break-words', checked ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                                        {cliente.company_name || cliente.name}
                                        {cliente.email && (
                                          <span className="ml-1.5 text-[12.5px] font-normal text-muted-foreground/80">{cliente.email}</span>
                                        )}
                                      </span>
                                    </label>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Rodapé: resumo do acesso + ações. Com alterações não salvas, fechar pede confirmação. */}
              {discardAsk ? (
                <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-4 border-t border-amber-200 bg-amber-50 px-6 py-3.5 dark:border-amber-800 dark:bg-amber-900/20">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Descartar as alterações não salvas?</p>
                  <div className="ml-auto flex gap-2">
                    <Button type="button" variant="outline" className="text-foreground" onClick={() => setDiscardAsk(false)}>
                      Continuar editando
                    </Button>
                    <Button type="button" className="bg-red-600 text-white hover:bg-red-700" onClick={closeModal}>
                      Descartar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-4 border-t bg-muted/40 px-6 py-3.5">
                  <div aria-live="polite" className="min-w-0 text-[13px] leading-[18px] text-muted-foreground">
                    {fullAccess ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0 text-teal-700 dark:text-teal-400" />
                        <strong className="font-semibold text-foreground">Acesso total</strong>
                        <span>a todas as funcionalidades e clientes</span>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span>
                          <strong className="font-semibold tabular-nums text-foreground">{activeCount}</strong> de {TOTAL_PERMISSIONS} permissões
                        </span>
                        {isColaborador && !clientesCarregando && (
                          <>
                            <span className="text-muted-foreground/50">·</span>
                            {permitirTodosClientes ? (
                              <span>Todos os clientes</span>
                            ) : nenhumCliente ? (
                              <span className="font-semibold text-amber-700 dark:text-amber-400">Nenhum cliente</span>
                            ) : (
                              <span>
                                <strong className="font-semibold tabular-nums text-foreground">{clientesSelecionados.length}</strong>{' '}
                                {clientesSelecionados.length === 1 ? 'cliente' : 'clientes'}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    )}
                    {editMode && isDirty && (
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs">
                        <span className="h-1.5 w-1.5 rounded-full bg-teal-600" />
                        Alterações não salvas
                      </div>
                    )}
                  </div>
                  <div className="ml-auto flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleOpenChange(false)}
                      disabled={loading}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading || (editMode ? !isDirty : (emailAvailable === false || emailCheckLoading))}
                      className="bg-teal-600 hover:bg-teal-700"
                    >
                      {loading ? 'Salvando...' : editMode ? 'Atualizar' : 'Adicionar'}
                    </Button>
                  </div>
                </div>
              )}
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
            // (mesma contagem do rodapé do modal, para os dois números baterem)
            const activePermissions = countActivePermissions(memberPermissions);
            const totalPermissions = TOTAL_PERMISSIONS;

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
                          onClick={() => handleEdit(member, 'permissoes')}
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