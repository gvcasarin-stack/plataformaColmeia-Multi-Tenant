'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { PlusCircle, Trash2, Edit, Users } from "lucide-react";
import { devLog } from "@/lib/utils/productionLogger";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
// ✅ SUPABASE - REMOVIDO: Firebase imports que causavam erros de API
// import { getFirestore, collection, getDocs, deleteDoc, doc, updateDoc, where, query } from 'firebase/firestore';

export default function EquipePage() {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(false); // Mudança: não carrega automaticamente
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'admin', // Por padrão, criamos como admin
    phone: '',
    department: '',
  });

  const isSuperAdmin = user?.profile?.role === 'superadmin';
  
  // Mudança: Verificar se o usuário é admin ou superadmin
  const hasAdminAccess = user?.profile?.role === 'admin' || user?.profile?.role === 'superadmin';

  // State para pesquisa
  const [searchQuery, setSearchQuery] = useState('');
  
  // ✅ SUPABASE - DESABILITADO: Carregamento automático até migração completa
  // useEffect(() => {
  //   if (user) {
  //     fetchTeamMembers();
  //   }
  // }, [user]);

  const fetchTeamMembers = async () => {
    toast({
      title: 'Funcionalidade Temporariamente Indisponível',
      description: 'A gestão de equipe será migrada para Supabase em breve.',
      variant: 'default'
    });
    
    // ✅ SUPABASE - TODO: Implementar busca usando Supabase
    // try {
    //   setLoading(true);
    //   const supabase = createSupabaseServiceRoleClient();
    //   const { data: members, error } = await supabase
    //     .from('users')
    //     .select('*')
    //     .eq('role', 'admin');
    //   
    //   if (error) throw error;
    //   setTeamMembers(members || []);
    // } catch (error) {
    //   devLog.error('Erro ao buscar membros da equipe:', error);
    //   toast({
    //     title: 'Erro',
    //     description: 'Não foi possível carregar os membros da equipe.',
    //     variant: 'destructive'
    //   });
    // } finally {
    //   setLoading(false);
    // }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleRoleChange = (value) => {
    setFormData({
      ...formData,
      role: value
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      role: 'admin',
      phone: '',
      department: ''
    });
    setEditMode(false);
    setCurrentUserId(null);
  };

  const handleCreateUser = async () => {
    toast({
      title: 'Funcionalidade Temporariamente Indisponível',
      description: 'A criação de usuários será migrada para Supabase em breve.',
      variant: 'default'
    });
    return;
    
    // ✅ SUPABASE - TODO: Implementar criação usando Supabase
    // Código original comentado para evitar erros de API do Firebase
  };

  const handleEditUser = async () => {
    toast({
      title: 'Funcionalidade Temporariamente Indisponível',
      description: 'A edição de usuários será migrada para Supabase em breve.',
      variant: 'default'
    });
    return;
    
    // ✅ SUPABASE - TODO: Implementar edição usando Supabase
    // Código original comentado para evitar erros de API do Firebase
  };

  const handleDeleteUser = async (userId) => {
    toast({
      title: 'Funcionalidade Temporariamente Indisponível',
      description: 'A exclusão de usuários será migrada para Supabase em breve.',
      variant: 'default'
    });
    return;
    
    // ✅ SUPABASE - TODO: Implementar exclusão usando Supabase
    // Código original comentado para evitar erros de API do Firebase
  };

  const startEdit = (member) => {
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

  // Filtrando membros baseado na pesquisa
  const filteredMembers = teamMembers.filter(member => 
    member.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    member.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Se não for admin ou superadmin, não pode ver esta página
  if (!hasAdminAccess) {
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
        
        {/* Elementos decorativos */}
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-teal-500/20"></div>
        <div className="absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-emerald-500/20"></div>
        <div className="absolute right-40 bottom-10 h-16 w-16 rounded-full bg-white/10"></div>
      </div>

      {/* Barra de ações */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Membros da Equipe</h2>
          <p className="text-gray-500 dark:text-gray-400">Administre os funcionários com acesso ao sistema</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500">🔍</span>
            <Input
              placeholder="Buscar membros..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-teal-600 hover:bg-teal-700 w-full sm:w-auto">
                <PlusCircle className="h-4 w-4 mr-2" />
                Adicionar Membro
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
              <DialogHeader>
                <DialogTitle>{editMode ? 'Editar Membro da Equipe' : 'Adicionar Novo Membro'}</DialogTitle>
                <DialogDescription>
                  {editMode 
                    ? 'Atualize as informações do membro da equipe.' 
                    : 'Preencha os dados para criar um novo membro da equipe. Após a criação, um email de redefinição de senha será enviado.'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Nome
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="col-span-3"
                    placeholder="Nome completo"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    Email
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="col-span-3"
                    placeholder="email@exemplo.com"
                    disabled={editMode} // Não permitir editar o email
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="role" className="text-right">
                    Função
                  </Label>
                  <Select
                    value={formData.role}
                    onValueChange={handleRoleChange}
                    disabled={editMode} // Não permitir editar a função
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Selecione uma função" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="phone" className="text-right">
                    Telefone
                  </Label>
                  <div className="col-span-3 space-y-1">
                    <Input
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="(00) 00000-0000 (opcional)"
                    />
                    <p className="text-xs text-muted-foreground">
                      Campo opcional para contato direto
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="department" className="text-right">
                    Departamento
                  </Label>
                  <Input
                    id="department"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    className="col-span-3"
                    placeholder="Ex: Engenharia, Marketing, etc."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  resetForm();
                  setOpen(false);
                }}>
                  Cancelar
                </Button>
                <Button 
                  onClick={editMode ? handleEditUser : handleCreateUser} 
                  disabled={loading}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  {loading ? 'Processando...' : editMode ? 'Salvar Alterações' : 'Criar Membro'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Lista de membros da equipe - layout melhorado */}
      <div className={`grid grid-cols-1 ${filteredMembers.length > 0 ? 'gap-4 sm:grid-cols-2 lg:grid-cols-3' : ''}`}>
        {loading ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16">
            <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
            <p className="mt-4 text-gray-500 dark:text-gray-400">Carregando membros da equipe...</p>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="col-span-full bg-white dark:bg-gray-800 rounded-lg border border-dashed p-10 text-center min-h-[300px] flex flex-col items-center justify-center">
            {searchQuery ? (
              <>
                <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full">
                  <span className="text-xl">🔍</span>
                </div>
                <h3 className="mt-4 text-lg font-medium">Nenhum resultado encontrado</h3>
                <p className="mt-1 text-sm text-gray-500 max-w-md">
                  Não encontramos nenhum membro com &quot;{searchQuery}&quot;. Tente outro termo ou limpe a busca.
                </p>
                <Button 
                  variant="outline"
                  className="mt-4" 
                  onClick={() => setSearchQuery('')}
                >
                  Limpar busca
                </Button>
              </>
            ) : (
              <>
                <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full">
                  <Users className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="mt-4 text-lg font-medium">Nenhum membro da equipe</h3>
                <p className="mt-1 text-sm text-gray-500 max-w-md">
                  Adicione membros à sua equipe para começar a gerenciar permissões de acesso ao sistema.
                </p>
                <Button 
                  className="mt-4 bg-teal-600 hover:bg-teal-700" 
                  onClick={() => setOpen(true)}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Adicionar Membro
                </Button>
              </>
            )}
          </div>
        ) : (
          filteredMembers.map(member => (
            <Card key={member.id} className="overflow-hidden transition-all duration-200 hover:shadow-md">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/80 dark:to-gray-800/50 p-4 pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1 overflow-hidden">
                    <CardTitle className="text-lg truncate">{member.name}</CardTitle>
                    <CardDescription className="truncate">{member.email}</CardDescription>
                  </div>
                  <div className="bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300 text-xs px-2 py-1 rounded-full">
                    {member.role === 'admin' ? 'Administrador' : member.role}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-3">
                <div className="space-y-3">
                  {member.department && (
                    <div className="flex items-center text-sm">
                      <div className="flex-shrink-0 w-8 flex justify-center">
                        <span className="text-gray-400">🏢</span>
                      </div>
                      <span className="ml-2 truncate">{member.department}</span>
                    </div>
                  )}
                  {member.phone && (
                    <div className="flex items-center text-sm">
                      <div className="flex-shrink-0 w-8 flex justify-center">
                        <span className="text-gray-400">📞</span>
                      </div>
                      <span className="ml-2">{member.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center text-sm">
                    <div className="flex-shrink-0 w-8 flex justify-center">
                      <span className="text-gray-400">📅</span>
                    </div>
                    <span className="ml-2 text-gray-500 text-xs">
                      Adicionado em {new Date(member.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t bg-white dark:bg-gray-800 p-3 flex justify-end gap-1">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 px-2 text-xs" 
                  onClick={() => startEdit(member)}
                >
                  <Edit className="h-3.5 w-3.5 mr-1" />
                  Editar
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 px-2 text-xs hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20" 
                  onClick={() => handleDeleteUser(member.id)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Excluir
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
      {/* Mostrar resumo dos resultados quando estiver filtrando */}
      {searchQuery && filteredMembers.length > 0 && (
        <div className="text-sm text-gray-500 mt-2">
          Exibindo {filteredMembers.length} de {teamMembers.length} membros
        </div>
      )}
    </div>
  );
}
