'use client';

import React, { useState, useEffect } from 'react';
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

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  department?: string;
}

interface FormData {
  name: string;
  email: string;
  role: string;
  phone: string;
  department: string;
}

export default function EquipePage() {
  const { user, hasAdminAccess } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
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
    setLoading(true);
    
    try {
      devLog.log('[EquipePage] Buscando membros da equipe');
      
      const response = await fetch('/api/admin/team-members', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setTeamMembers(result.members || []);
          devLog.log('[EquipePage] Membros carregados:', result.members?.length || 0);
        } else {
          devLog.error('[EquipePage] Erro na resposta:', result.message);
        }
      } else {
        devLog.error('[EquipePage] Erro HTTP:', response.status);
      }
    } catch (error: any) {
      devLog.error('[EquipePage] Erro ao buscar membros:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar membros da equipe",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleRoleChange = (value: string) => {
    setFormData({
      ...formData,
      role: value
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      role: 'cliente',
      phone: '',
      department: ''
    });
  };

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
        
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-teal-500/20"></div>
        <div className="absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-emerald-500/20"></div>
        <div className="absolute right-40 bottom-10 h-16 w-16 rounded-full bg-white/10"></div>
      </div>

      {/* Mensagem temporária */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <h2 className="text-lg font-semibold text-yellow-800 mb-2">
          Seção de Equipe em Manutenção
        </h2>
        <p className="text-yellow-700">
          Esta seção está temporariamente indisponível enquanto implementamos melhorias.
          Será restaurada em breve.
        </p>
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
