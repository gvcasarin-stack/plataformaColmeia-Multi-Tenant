"use client"

import React, { useState, useEffect } from 'react'
import { Project } from "@/types/project"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { 
  Edit2, 
  Building2, 
  User, 
  Zap, 
  Calendar,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  PauseCircle,
  XCircle
} from "lucide-react"
import { devLog } from "@/lib/utils/productionLogger";
import { getDisplayStatus } from "@/lib/services/kanbanService"

/**
 * Interface para as props do componente ProjectTable
 */
interface ProjectTableProps {
  /** Lista de projetos a serem exibidos na tabela */
  projects: Project[]
  /** Função chamada quando um projeto é clicado */
  onProjectClick: (project: Project) => void
}

/**
 * Determina a configuração visual para um status de projeto
 * 
 * @param status Status do projeto
 * @returns Objeto com ícone e classes CSS de cor
 */
const getStatusConfig = (status: string) => {
  switch (status) {
    case 'Não Iniciado':
      return { icon: Clock, color: 'text-gray-500 bg-gray-50 border-gray-200' };
    case 'Em Desenvolvimento':
      return { icon: Activity, color: 'text-blue-600 bg-blue-50 border-blue-200' };
    case 'Aguardando':
      return { icon: Clock, color: 'text-orange-600 bg-orange-50 border-orange-200' };
    case 'Homologação':
      return { icon: AlertTriangle, color: 'text-purple-600 bg-purple-50 border-purple-200' };
    case 'Projeto Aprovado':
      return { icon: CheckCircle2, color: 'text-green-600 bg-green-50 border-green-200' };
    case 'Aguardando Vistoria':
      return { icon: Clock, color: 'text-amber-600 bg-amber-50 border-amber-200' };
    case 'Projeto Pausado':
      return { icon: PauseCircle, color: 'text-yellow-600 bg-yellow-50 border-yellow-200' };
    case 'Em Vistoria':
      return { icon: Activity, color: 'text-cyan-600 bg-cyan-50 border-cyan-200' };
    case 'Finalizado':
      return { icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
    case 'Cancelado':
      return { icon: XCircle, color: 'text-red-600 bg-red-50 border-red-200' };
    default:
      return { icon: Clock, color: 'text-gray-500 bg-gray-50 border-gray-200' };
  }
};

/**
 * Determina a configuração visual para uma prioridade de projeto
 * 
 * @param priority Prioridade do projeto
 * @returns Objeto com ícone e classes CSS de cor
 */
const getPriorityConfig = (priority: string) => {
  switch (priority) {
    case 'Alta':
      return { color: 'text-red-700 bg-red-50 border-red-200', icon: Zap };
    case 'Média':
      return { color: 'text-yellow-700 bg-yellow-50 border-yellow-200', icon: Zap };
    case 'Baixa':
      return { color: 'text-green-700 bg-green-50 border-green-200', icon: Zap };
    case 'Urgente':
      return { color: 'text-purple-700 bg-purple-50 border-purple-200', icon: Zap };
    default:
      return { color: 'text-gray-700 bg-gray-50 border-gray-200', icon: Zap };
  }
};

/**
 * Componente de tabela para visualizar projetos
 * 
 * Exibe uma tabela interativa com informações dos projetos,
 * incluindo status, prioridade e detalhes principais
 */
export function ProjectTable({ projects, onProjectClick }: ProjectTableProps) {
  const [statusTitles, setStatusTitles] = useState<Record<string, string>>({});
  
  // Carregar os títulos personalizados para todos os projetos
  useEffect(() => {
    const loadStatusTitles = async () => {
      try {
        // Cria um conjunto de status únicos de todos os projetos
        const uniqueStatuses = new Set(projects.map(p => p.status).filter(Boolean));
        
        // Para cada status único, busca o título personalizado
        const statusMap: Record<string, string> = {};
        await Promise.all(
          Array.from(uniqueStatuses).map(async (status) => {
            if (status) {
              const displayStatus = await getDisplayStatus(status);
              statusMap[status] = displayStatus;
            }
          })
        );
        
        setStatusTitles(statusMap);
      } catch (error) {
        devLog.error("Erro ao carregar títulos de status:", error);
      }
    };
    
    loadStatusTitles();
  }, [projects]);
  
  return (
    <div className="rounded-xl border border-gray-200/60 shadow-sm overflow-hidden bg-white">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
            <TableHead className="font-semibold text-gray-700">Número</TableHead>
            <TableHead className="font-semibold text-gray-700">Empresa Integradora</TableHead>
            <TableHead className="font-semibold text-gray-700">Cliente Final</TableHead>
            <TableHead className="font-semibold text-gray-700">Distribuidora</TableHead>
            <TableHead className="font-semibold text-gray-700">Potência</TableHead>
            <TableHead className="font-semibold text-gray-700">Data de Entrega</TableHead>
            <TableHead className="font-semibold text-gray-700">Status</TableHead>
            <TableHead className="font-semibold text-gray-700">Prioridade</TableHead>
            <TableHead className="text-right font-semibold text-gray-700 pr-6">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => {
            const statusConfig = getStatusConfig(project.status);
            const StatusIcon = statusConfig.icon;
            const priorityConfig = getPriorityConfig(project.prioridade);
            const PriorityIcon = priorityConfig.icon;
            // Usar o título personalizado se disponível, ou o status original
            const displayStatus = statusTitles[project.status] || project.status;

            return (
              <TableRow
                key={project.id}
                className="hover:bg-gray-50/60 cursor-pointer group"
                onClick={() => onProjectClick(project)}
              >
                <TableCell className="font-medium text-gray-900">
                  {project.number}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-3.5 w-3.5 text-blue-500" />
                    </div>
                    <span className="text-gray-700">{project.empresaIntegradora || 'N/A'}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-purple-50 border border-purple-100 flex items-center justify-center flex-shrink-0">
                      <User className="h-3.5 w-3.5 text-purple-500" />
                    </div>
                    <span className="text-gray-700">{project.nomeClienteFinal || 'N/A'}</span>
                  </div>
                </TableCell>
                <TableCell className="text-gray-700">{project.distribuidora || 'N/A'}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0">
                      <Zap className="h-3.5 w-3.5 text-amber-500" />
                    </div>
                    <span className="text-gray-700">{project.potencia} kWp</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0">
                      <Calendar className="h-3.5 w-3.5 text-red-500" />
                    </div>
                    <span className="text-gray-700">
                      {project.dataEntrega ? new Date(project.dataEntrega).toLocaleDateString('pt-BR') : 'N/A'}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${statusConfig.color}`}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    <span className="text-sm font-medium">{displayStatus}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${priorityConfig.color}`}>
                    <PriorityIcon className="w-3.5 h-3.5" />
                    <span className="text-sm font-medium">{project.prioridade}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right pr-6">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-gray-600 hover:text-gray-900 border-gray-200 hover:bg-gray-50/80 hover:border-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  )
} 