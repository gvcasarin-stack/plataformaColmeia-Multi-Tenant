'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { devLog } from '@/lib/utils/productionLogger';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, PlusCircle, Edit, Loader2, Eye, EyeOff } from 'lucide-react';
import { AddPackageModal } from './AddPackageModal';
import { EditPackageModal } from './EditPackageModal';

export interface PackageDefinition {
  id: string;
  tenant_id: string;
  nome: string;
  quantidade_projetos: number;
  valor: number;
  validade_dias: number;
  potencia_maxima_kwp?: number | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export function PackagesTab() {
  const [packages, setPackages] = useState<PackageDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<PackageDefinition | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/pacotes');
      const result = await response.json();

      if (result.success && result.data) {
        setPackages(result.data);
      } else {
        throw new Error(result.error || 'Erro ao carregar pacotes');
      }
    } catch (error: any) {
      devLog.error('[PackagesTab] Erro ao carregar pacotes:', error);
      toast({
        title: 'Erro ao carregar pacotes',
        description: error.message || 'Ocorreu um erro ao buscar os pacotes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (pkg: PackageDefinition) => {
    try {
      const response = await fetch(`/api/admin/pacotes/${pkg.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo: !pkg.ativo }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: pkg.ativo ? 'Pacote desativado' : 'Pacote ativado',
          description: `O pacote "${pkg.nome}" foi ${pkg.ativo ? 'desativado' : 'ativado'} com sucesso`,
        });
        loadPackages();
      } else {
        throw new Error(result.error || 'Erro ao alterar status');
      }
    } catch (error: any) {
      devLog.error('[PackagesTab] Erro ao alterar status:', error);
      toast({
        title: 'Erro ao alterar status',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const filteredPackages = showInactive
    ? packages
    : packages.filter(pkg => pkg.ativo);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowInactive(!showInactive)}
          >
            {showInactive ? (
              <>
                <EyeOff className="h-4 w-4 mr-2" />
                Ocultar Inativos
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Mostrar Inativos
              </>
            )}
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Novo Pacote
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <span className="ml-3 text-gray-600">Carregando pacotes...</span>
        </div>
      ) : filteredPackages.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
          <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {showInactive
              ? 'Nenhum pacote cadastrado'
              : 'Nenhum pacote ativo encontrado'}
          </p>
          <Button onClick={() => setShowAddModal(true)}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Criar Primeiro Pacote
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                <TableHead className="font-semibold">Nome do Pacote</TableHead>
                <TableHead className="font-semibold">Quantidade de Projetos</TableHead>
                <TableHead className="font-semibold">Potência Máxima</TableHead>
                <TableHead className="font-semibold">Valor</TableHead>
                <TableHead className="font-semibold">Validade</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPackages.map((pkg) => (
                <TableRow key={pkg.id} className={!pkg.ativo ? 'opacity-60' : ''}>
                  <TableCell className="font-medium">{pkg.nome}</TableCell>
                  <TableCell>{pkg.quantidade_projetos} projetos</TableCell>
                  <TableCell>
                    {pkg.potencia_maxima_kwp
                      ? `${pkg.potencia_maxima_kwp} kWp`
                      : 'Ilimitado'
                    }
                  </TableCell>
                  <TableCell>
                    R$ {pkg.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>{pkg.validade_dias} dias</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        pkg.ativo
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                      }`}
                    >
                      {pkg.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingPackage(pkg)}
                        title="Editar pacote"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleStatus(pkg)}
                        title={pkg.ativo ? 'Desativar' : 'Ativar'}
                      >
                        {pkg.ativo ? (
                          <EyeOff className="h-4 w-4 text-red-500" />
                        ) : (
                          <Eye className="h-4 w-4 text-green-500" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Modals */}
      <AddPackageModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSuccess={loadPackages}
      />

      <EditPackageModal
        open={!!editingPackage}
        onOpenChange={(open) => !open && setEditingPackage(null)}
        package={editingPackage}
        onSuccess={loadPackages}
      />
    </div>
  );
}
