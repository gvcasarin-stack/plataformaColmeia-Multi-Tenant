'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { PlusCircle, Trash2, Edit, Users, Search, Mail, Phone, Building2 } from "lucide-react";
import { devLog } from "@/lib/utils/productionLogger";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

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
}

export default function EquipePage() {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    role: 'cliente',
    phone: '',
    department: ''
  });

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
    setFormData(prev => ({
      ...prev,
      role: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) return;

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

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          toast({
            title: 'Sucesso',
            description: editMode ? 'Membro atualizado com sucesso!' : 'Membro adicionado com sucesso!',
          });
          
          resetForm();
          setOpen(false);
          fetchTeamMembers();
        } else {
          throw new Error(result.error || 'Erro ao salvar membro');
        }
      } else {
        throw new Error(`Erro HTTP: ${response.status}`);
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

  const handleEdit = (member: TeamMember) => {
    setFormData({
      name: member.name,
      email: member.email,
      role: member.role,
      phone: member.phone || '',
      department: member.department || ''
    });
    setCurrentUserId(member.id);
    setEditMode(true);
    setOpen(true);
  };

  const handleDelete = async (memberId: string) => {
    if (!user?.id) return;
    
    if (!confirm('Tem certeza que deseja remover este membro da equipe?')) {
      return;
    }

    try {
      setLoading(true);
      
      const { createTenantHeaders } = await import('@/lib/utils/tenant-helper');
      const headers = await createTenantHeaders(user.id);
      
      const response = await fetch(`/api/admin/team-members/${memberId}`, {
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
      role: 'cliente',
      phone: '',
      department: ''
    });
    setEditMode(false);
    setCurrentUserId(null);
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

  // ✅ CORREÇÃO: Verificar se é admin corretamente
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin' || 
                  user?.profile?.role === 'admin' || user?.profile?.role === 'superadmin';

  devLog.log('[Admin Equipe] Resultado da verificação de admin:', {
    isAdmin,
    userRole: user?.role,
    profileRole: user?.profile?.role
  });

  if (!user || !isAdmin) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Acesso Restrito</CardTitle>
            <CardDescription>
              Você não tem permissão para acessar esta página.
            </CardDescription>
          </CardHeader>
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
              onClick={resetForm}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Adicionar Membro
            </Button>
          </DialogTrigger>
          
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editMode ? 'Editar Membro' : 'Adicionar Novo Membro'}
              </DialogTitle>
              <DialogDescription>
                {editMode ? 'Atualize as informações do membro da equipe.' : 'Adicione um novo membro à sua equipe.'}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
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
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="email@exemplo.com"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Função</Label>
                  <Select value={formData.role} onValueChange={handleRoleChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a função" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="cliente">Cliente</SelectItem>
                      <SelectItem value="colaborador">Colaborador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="department">Departamento</Label>
                  <Input
                    id="department"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    placeholder="Ex: Vendas, Técnico"
                  />
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
              
              <DialogFooter>
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
                  disabled={loading}
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
          filteredMembers.map((member) => (
            <Card key={member.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{member.name}</CardTitle>
                    <CardDescription className="capitalize">
                      {member.role}
                    </CardDescription>
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(member)}
                      disabled={loading}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(member.id)}
                      disabled={loading}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="flex items-center text-sm text-gray-600">
                  <Mail className="h-4 w-4 mr-2 text-gray-400" />
                  {member.email}
                </div>
                
                {member.phone && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="h-4 w-4 mr-2 text-gray-400" />
                    {member.phone}
                  </div>
                )}
                
                {member.department && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Building2 className="h-4 w-4 mr-2 text-gray-400" />
                    {member.department}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
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
                    onClick={resetForm}
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
    </div>
  );
}