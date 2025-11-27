"use client"

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useForm, Controller } from "react-hook-form"
import { useAuth } from "@/lib/hooks/useAuth"
import { UserData as AuthUserData } from "@/lib/services/authService.supabase"
import { devLog } from "@/lib/utils/productionLogger";
import logger from '@/lib/utils/logger'
import { BillingInfoCard } from "@/components/project/BillingInfoCard"

// Lista de distribuidoras de energia
const DISTRIBUIDORAS = [
  "Enel",
  "Copel",
  "Cemig",
  "CPFL",
  "Neoenergia Cosern",
  "Neoenergia Elektro",
  "Neoenergia Coelba",
  "Neoenergia Pernambuco",
  "Celesc",
  "Energisa",
  "Equatorial",
  "RGE",
  "Amazonas Energia",
  "Outro" // Opção para o usuário inserir uma distribuidora personalizada
];

// Adicionar tipo à interface Window
declare global {
  interface Window {
    _isCreatingProject?: boolean;
  }
}

interface ClientCreateProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ClientFormData & { owner_id?: string }) => Promise<void>;
  isAdmin?: boolean;  // 🆕 Se true, mostra campo de proprietário
  currentUserId?: string;  // 🆕 ID do usuário atual (admin)
}

interface ClientFormData {
  nomeClienteFinal: string;
  cpf_cnpj_cliente_final?: string;  // ✅ NOVO CAMPO: CPF/CNPJ (opcional)
  endereco_local?: string;           // ✅ NOVO CAMPO: Endereço (opcional)
  distribuidora: string;
  distribuidoraOutro?: string;
  power: number;
  havera_beneficiarias?: boolean;    // ✅ NOVO CAMPO: Compensação de Créditos (opcional)
  listaMateriais?: string;
  disjuntorPadraoEntrada?: string;
  empresaIntegradora?: string;
  description?: string;
  dataEntrega: string;
  valorProjeto?: number;
}

export function ClientCreateProjectModal({ open, onOpenChange, onSubmit, isAdmin = false, currentUserId }: ClientCreateProjectModalProps) {
  devLog.log('ClientCreateProjectModal rendered with props:', { open, hasOnOpenChange: !!onOpenChange, hasOnSubmit: !!onSubmit, isAdmin });

  const { user } = useAuth();
  const [userData, setUserData] = useState<AuthUserData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showOutroInput, setShowOutroInput] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🆕 Estados para admin: lista de clientes e proprietário selecionado
  const [clients, setClients] = useState<Array<{ id: string; name: string; email: string; companyName?: string; isCompany?: boolean }>>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>(currentUserId || '');
  const [selectedOwnerData, setSelectedOwnerData] = useState<{ name: string; companyName?: string } | null>(null); // 🆕 Dados do cliente selecionado
  const [organizationName, setOrganizationName] = useState<string>(''); // Nome da organização/tenant
  const [clientSearchQuery, setClientSearchQuery] = useState<string>(''); // 🆕 Query de busca de clientes

  // 🆕 Estados para billing info
  const [billingStatus, setBillingStatus] = useState<any | null>(null);
  const [loadingBillingStatus, setLoadingBillingStatus] = useState(false);

  const { register, handleSubmit, reset, formState: { errors }, setValue, control, watch } = useForm<ClientFormData>({
    defaultValues: {
      nomeClienteFinal: "",
      cpf_cnpj_cliente_final: "",     // ✅ NOVO CAMPO
      endereco_local: "",              // ✅ NOVO CAMPO
      distribuidora: "",
      distribuidoraOutro: "",
      power: 0,
      havera_beneficiarias: false,     // ✅ NOVO CAMPO
      listaMateriais: "",
      disjuntorPadraoEntrada: "",
      empresaIntegradora: "",
      description: "",
      dataEntrega: new Date().toISOString().split('T')[0],
      valorProjeto: 0,
    }
  });
  
  // Observar mudanças no campo distribuidora para mostrar o campo "Outro" quando necessário
  const distribuidoraSelecionada = watch("distribuidora");

  // 🆕 Observar mudanças no campo power para validação em tempo real
  const powerValue = watch("power");

  useEffect(() => {
    setShowOutroInput(distribuidoraSelecionada === "Outro");
  }, [distribuidoraSelecionada]);

  // 🆕 Buscar lista de clientes E nome da organização (apenas para admin)
  useEffect(() => {
    async function fetchAdminData() {
      if (!isAdmin || !open) return;

      setLoadingClients(true);
      try {
        // Buscar clientes
        const clientsResponse = await fetch('/api/admin/clients', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (clientsResponse.ok) {
          const clientsResult = await clientsResponse.json();
          // 🆕 Mapear company_name (snake_case) para companyName (camelCase)
          const mappedClients = (clientsResult.data || []).map((client: any) => ({
            id: client.id,
            name: client.name,
            email: client.email,
            companyName: client.company_name, // Mapear de snake_case para camelCase
            isCompany: client.is_company // 🔧 Incluir is_company
          }));
          setClients(mappedClients);
          devLog.log('[CreateProjectModal] Clientes carregados:', mappedClients.length);
        }

        // 🆕 Buscar nome da organização
        const orgResponse = await fetch('/api/tenant/organization', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (orgResponse.ok) {
          const orgResult = await orgResponse.json();
          if (orgResult.success && orgResult.data?.name) {
            setOrganizationName(orgResult.data.name);
            devLog.log('[CreateProjectModal] Nome da organização:', orgResult.data.name);
          }
        }
      } catch (error) {
        devLog.error('[CreateProjectModal] Erro ao buscar dados:', error);
      } finally {
        setLoadingClients(false);
      }
    }

    fetchAdminData();
  }, [isAdmin, open]);

  // 🆕 Efeito para atualizar dados do proprietário selecionado
  useEffect(() => {
    if (!isAdmin) return;

    if (selectedOwnerId === currentUserId) {
      // Admin selecionou a si mesmo - usar nome da organização
      setSelectedOwnerData(null);
    } else {
      // Admin selecionou um cliente - buscar dados do cliente
      const selectedClient = clients.find(c => c.id === selectedOwnerId);
      if (selectedClient) {
        setSelectedOwnerData({
          name: selectedClient.name || selectedClient.email,
          companyName: selectedClient.companyName
        });
      }
    }
  }, [selectedOwnerId, clients, currentUserId, isAdmin]);

  // 🆕 Buscar billing status quando selecionar proprietário (admin) ou abrir modal (cliente)
  useEffect(() => {
    async function fetchBillingStatus() {
      // Determinar o userId correto
      const targetUserId = isAdmin ? selectedOwnerId : user?.id;

      if (!open || !targetUserId) {
        setBillingStatus(null);
        return;
      }

      setLoadingBillingStatus(true);
      try {
        const response = await fetch(`/api/user/${targetUserId}/billing-status`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setBillingStatus(result);
            devLog.log('[CreateProjectModal] Billing status carregado:', result);
          }
        }
      } catch (error) {
        devLog.error('[CreateProjectModal] Erro ao buscar billing status:', error);
      } finally {
        setLoadingBillingStatus(false);
      }
    }

    fetchBillingStatus();
  }, [open, isAdmin, selectedOwnerId, user?.id]);

  // Efeito para carregar dados do usuário
  useEffect(() => {
    async function fetchUserData() {
      if (user?.id) {
        try {
          // ✅ CORREÇÃO: Substituir chamada direta ao Supabase por API segura
          const response = await fetch(`/api/user/profile?userId=${user.id}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error(`Erro na API: ${response.status}`);
          }

          const data: AuthUserData = await response.json();
          setUserData(data);
          if (data?.isCompany && data?.companyName && !watch('empresaIntegradora')) {
            setValue('empresaIntegradora', data.companyName || '');
          }
          // Campo nomeClienteFinal permanece vazio para o usuário preencher manualmente
          // com o nome do cliente final (cliente do cliente)
          // Nome do cliente final deve ser preenchido manualmente pelo usuário
        } catch (error) {
          devLog.error("Error fetching user data:", error);
        }
      }
    }
    
    fetchUserData();
  }, [user, setValue, watch]);
  
  const handleFormSubmit = async (data: ClientFormData) => {
    logger.debug('Formulário enviado com dados');
    setError(null);
    const submitId = `submit-${Date.now()}-${Math.random()}`;
    
    try {
      if (window._isCreatingProject === true) {
        logger.debug(`Já existe um projeto sendo criado globalmente, bloqueando duplicação`);
        setError("Erro: Já existe um projeto sendo criado. Aguarde a conclusão ou recarregue a página.");
        return;
      }
      
      if (loading) {
        devLog.log(`[${submitId}] Já existe uma submissão em andamento, ignorando clique duplo`);
        setError("Erro: Submissão já em andamento. Aguarde ou recarregue a página.");
        return;
      }
      
      // ✅ PROTEÇÃO ANTI-DUPLICAÇÃO: Definir flags IMEDIATAMENTE
      window._isCreatingProject = true;
      setLoading(true);
      devLog.log(`[${submitId}] Iniciando submissão de formulário`);
      
      const currentDisplayUser = userData || (user ? { name: user.profile?.full_name || user.email, email: user.email, uid: user.id } : {});

      const distribuidoraFinal = data.distribuidora === "Outro" ? data.distribuidoraOutro : data.distribuidora;

      // 🆕 CORRIGIDO: Determinar empresa integradora com base no proprietário selecionado
      let empresaIntegradoraFinal = data.empresaIntegradora;

      if (!empresaIntegradoraFinal) {
        if (isAdmin) {
          // Admin criando projeto
          if (selectedOwnerId === currentUserId) {
            // Admin é o proprietário - usar nome da organização
            empresaIntegradoraFinal = organizationName || 'Cliente Individual';
          } else {
            // Cliente é o proprietário - usar dados do cliente selecionado
            empresaIntegradoraFinal = selectedOwnerData?.companyName || selectedOwnerData?.name || 'Cliente Individual';
          }
        } else {
          // Cliente criando seu próprio projeto
          empresaIntegradoraFinal = (currentDisplayUser as AuthUserData)?.companyName || (currentDisplayUser as any)?.name || 'Cliente Individual';
        }
      }

      const projectPayload = {
        ...data,
        distribuidora: distribuidoraFinal || '',
        empresaIntegradora: empresaIntegradoraFinal,
        // 🆕 Adicionar owner_id: se admin, usa selecionado; se cliente, usa próprio userId
        ...(isAdmin && { owner_id: selectedOwnerId })
      };

      devLog.log(`[${submitId}] Dados do formulário para onSubmit:`, projectPayload);

      await onSubmit(projectPayload);
      devLog.log(`[${submitId}] Submissão (chamada a onSubmit) concluída com sucesso`);
      reset();
      onOpenChange(false);
    } catch (error: any) {
      devLog.error(`[${submitId}] Erro ao criar projeto:`, error);
      
      // Capturar detalhes do erro para exibição
      if (!error) {
        setError("Erro desconhecido ao criar projeto");
      } else if (typeof error === 'string') {
        setError(`Erro: ${error}`);
      } else {
        const errorMessage = 
          `ERRO AO CRIAR PROJETO:\n` +
          `Mensagem: ${error.message || 'Erro desconhecido'}\n` + 
          `Código: ${error.code || 'N/A'}`;
        
        setError(errorMessage);
      }
    } finally {
      devLog.log(`[${submitId}] Finalizando estado de loading`);
      setLoading(false);
      window._isCreatingProject = false;
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {(() => { devLog.log('Dialog rendering with open:', open); return null; })()}
      <DialogContent className="w-full max-w-[95vw] sm:max-w-[500px] max-h-[90vh] p-0 rounded-lg border border-gray-200 shadow-lg flex flex-col">
        <DialogHeader className="space-y-3 p-4 sm:p-6 pb-4 border-b border-gray-100 flex-shrink-0">
          <DialogTitle className="text-xl sm:text-2xl font-semibold text-gray-800">Criar Novo Projeto</DialogTitle>
          <p className="text-xs sm:text-sm text-gray-500">Preencha os detalhes abaixo para criar um novo projeto solar.</p>
        </DialogHeader>

        {/* Exibir mensagem de erro detalhada se houver */}
        {error && (
          <div className="bg-red-50 p-4 mx-4 sm:mx-6 rounded-md my-3 border-l-4 border-red-400 flex-shrink-0">
            <Label className="text-sm font-medium text-red-600">Diagnóstico do Erro</Label>
            <pre className="whitespace-pre-wrap text-xs font-mono mt-2 text-red-700 max-h-40 overflow-auto">
              {error}
            </pre>
            <Button
              variant="outline"
              className="mt-2"
              onClick={() => setError(null)}
            >
              Limpar Erro
            </Button>
          </div>
        )}

        <div className="overflow-y-auto flex-1 px-4 sm:px-6">
          <form id="project-form" onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 sm:space-y-5 py-4">
          <div className="space-y-2">
            <Label htmlFor="nomeClienteFinal" className="text-xs sm:text-sm font-medium text-gray-700">
              Nome Cliente Final <span className="text-red-500">*</span>
            </Label>
            <Input
              id="nomeClienteFinal"
              {...register("nomeClienteFinal", { required: true })}
              placeholder="Ex: João da Silva ou Empresa XYZ"
              className="h-10 sm:h-11 px-3 sm:px-4 text-sm border-gray-300 focus:border-orange-400 focus:ring focus:ring-orange-200 transition-all"
            />
            {errors.nomeClienteFinal && (
              <p className="text-sm text-red-500 flex items-center mt-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Nome do cliente é obrigatório
              </p>
            )}
          </div>

          {/* ✅ NOVO CAMPO: CPF/CNPJ do Cliente Final (opcional) */}
          <div className="space-y-2">
            <Label htmlFor="cpf_cnpj_cliente_final" className="text-xs sm:text-sm font-medium text-gray-700">
              CPF/CNPJ do Cliente Final
            </Label>
            <Input
              id="cpf_cnpj_cliente_final"
              {...register("cpf_cnpj_cliente_final")}
              placeholder="Ex: 000.000.000-00 ou 00.000.000/0000-00"
              maxLength={20}
              className="h-10 sm:h-11 px-3 sm:px-4 text-sm border-gray-300 focus:border-orange-400 focus:ring focus:ring-orange-200 transition-all"
            />
          </div>

          {/* ✅ NOVO CAMPO: Endereço do Local (opcional) */}
          <div className="space-y-2">
            <Label htmlFor="endereco_local" className="text-xs sm:text-sm font-medium text-gray-700">
              Endereço do Local
            </Label>
            <Input
              id="endereco_local"
              {...register("endereco_local")}
              placeholder="Ex: Rua das Flores, 123 - Centro - Florianópolis/SC"
              className="h-10 sm:h-11 px-3 sm:px-4 text-sm border-gray-300 focus:border-orange-400 focus:ring focus:ring-orange-200 transition-all"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="distribuidora" className="text-xs sm:text-sm font-medium text-gray-700">
              Distribuidora de Energia <span className="text-red-500">*</span>
            </Label>
            <Controller
              name="distribuidora"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <SelectTrigger className="h-10 sm:h-11 px-3 sm:px-4 text-sm border-gray-300 focus:border-orange-400 focus:ring focus:ring-orange-200 transition-all">
                    <SelectValue placeholder="Selecione uma distribuidora" />
                  </SelectTrigger>
                  <SelectContent 
                    position="popper" 
                    side="bottom" 
                    align="start" 
                    sideOffset={4}
                    avoidCollisions={false}
                    collisionPadding={20}
                    className="max-h-[300px] overflow-y-auto"
                  >
                    {DISTRIBUIDORAS.map((distribuidora) => (
                      <SelectItem key={distribuidora} value={distribuidora}>
                        {distribuidora}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.distribuidora && (
              <p className="text-sm text-red-500 flex items-center mt-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Distribuidora é obrigatória
              </p>
            )}
            
            {/* Campo adicional para "Outro" */}
            {showOutroInput && (
              <div className="mt-2">
                <Input
                  {...register("distribuidoraOutro", {
                    required: distribuidoraSelecionada === "Outro",
                  })}
                  placeholder="Digite o nome da distribuidora"
                  className="h-10 sm:h-11 px-3 sm:px-4 text-sm border-gray-300 focus:border-orange-400 focus:ring focus:ring-orange-200 transition-all"
                />
                {errors.distribuidoraOutro && (
                  <p className="text-sm text-red-500 flex items-center mt-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Nome da distribuidora é obrigatório
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="power" className="text-xs sm:text-sm font-medium text-gray-700">
              Potência (kWp) <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="power"
                type="number"
                step="0.01"
                {...register("power", { 
                  required: true, 
                  valueAsNumber: true,
                  min: 0
                })}
                placeholder="Ex: 5.76"
                className="h-10 sm:h-11 px-3 sm:px-4 pr-10 sm:pr-12 text-sm border-gray-300 focus:border-orange-400 focus:ring focus:ring-orange-200 transition-all"
              />
              <span className="absolute inset-y-0 right-0 flex items-center pr-2 sm:pr-3 text-gray-500 text-xs sm:text-sm font-medium">
                kWp
              </span>
            </div>
            {errors.power && (
              <p className="text-sm text-red-500 flex items-center mt-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Potência é obrigatória e deve ser maior que 0
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="havera_beneficiarias" className="text-xs sm:text-sm font-medium text-gray-700">
              Haverá Compensação de Créditos?
            </Label>
            <Controller
              name="havera_beneficiarias"
              control={control}
              render={({ field }) => (
                <Select
                  onValueChange={(value) => field.onChange(value === "true")}
                  value={field.value ? "true" : "false"}
                >
                  <SelectTrigger className="h-10 sm:h-11 px-3 sm:px-4 text-sm border-gray-300 focus:border-orange-400 focus:ring focus:ring-orange-200 transition-all">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    side="bottom"
                    align="start"
                    sideOffset={4}
                    avoidCollisions={false}
                    collisionPadding={20}
                  >
                    <SelectItem value="false">Não</SelectItem>
                    <SelectItem value="true">Sim</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />

            {/* Mensagem de aviso quando Sim for selecionado */}
            {watch("havera_beneficiarias") && (
              <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <span className="text-purple-600 text-lg flex-shrink-0">⚡</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-purple-900 mb-1">
                      Atenção: Este projeto possui compensação de créditos
                    </p>
                    <p className="text-xs text-purple-700">
                      Envie as <strong>Faturas das Unidades Beneficiárias</strong> na Linha do Tempo do Projeto no campo adequado após a criação.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="listaMateriais" className="text-xs sm:text-sm font-medium text-gray-700">
              Lista de Materiais
            </Label>
            <textarea
              id="listaMateriais"
              {...register("listaMateriais")}
              placeholder="Preencha Marca, Modelo e Quantidades dos Equipamentos que serão utilizados.&#10;&#10;Ex: 1x Inversor Growatt, MIN 5000TL-X e 10x Módulos Fotovoltaicos TSUN de 560W"
              className="w-full h-20 sm:h-24 px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:border-orange-400 focus:ring focus:ring-orange-200 transition-all resize-none text-xs sm:text-sm"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="disjuntorPadraoEntrada" className="text-xs sm:text-sm font-medium text-gray-700">
              Disjuntor do Padrão de Entrada
            </Label>
            <Input
              id="disjuntorPadraoEntrada"
              {...register("disjuntorPadraoEntrada")}
              placeholder="Ex: Bifásico 63A, Trifásico 50A"
              className="h-10 sm:h-11 px-3 sm:px-4 text-sm border-gray-300 focus:border-orange-400 focus:ring focus:ring-orange-200 transition-all"
            />
          </div>

          {/* 🆕 CAMPO APENAS PARA ADMIN: Proprietário do Projeto */}
          {isAdmin && (
            <div className="space-y-3 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <Label className="text-sm font-semibold text-gray-800">
                  Proprietário do Projeto
                </Label>
              </div>

              <Select
                value={selectedOwnerId}
                onValueChange={setSelectedOwnerId}
                disabled={loadingClients}
              >
                <SelectTrigger className="h-10 sm:h-11 px-3 sm:px-4 text-sm border-gray-300 focus:border-blue-400 focus:ring focus:ring-blue-200 transition-all">
                  <SelectValue placeholder={loadingClients ? "Carregando..." : "Selecione o proprietário"} />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  side="bottom"
                  align="start"
                  sideOffset={4}
                  avoidCollisions={false}
                  collisionPadding={20}
                  className="max-h-[300px] overflow-y-auto"
                >
                  {/* Opção: Minha conta (admin) */}
                  <SelectItem value={currentUserId || ''}>
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <div>
                        <p className="font-medium">Minha conta</p>
                        <p className="text-xs text-gray-500">O projeto ficará na sua lista</p>
                      </div>
                    </div>
                  </SelectItem>

                  {/* Clientes existentes */}
                  {clients.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50">
                        Atribuir a um cliente
                      </div>

                      {/* 🆕 Campo de busca */}
                      <div className="px-2 py-2 sticky top-0 bg-white border-b border-gray-200">
                        <div className="relative">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <Input
                            type="text"
                            placeholder="Buscar por empresa ou cliente..."
                            value={clientSearchQuery}
                            onChange={(e) => setClientSearchQuery(e.target.value)}
                            className="h-9 pl-9 pr-3 text-xs border-gray-300 focus:border-blue-400 focus:ring focus:ring-blue-200"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>

                      {/* Lista de clientes filtrada */}
                      {clients
                        .filter((client) => {
                          const query = clientSearchQuery.toLowerCase().trim();
                          if (!query) return true;

                          const nameMatch = client.name?.toLowerCase().includes(query);
                          const companyMatch = client.companyName?.toLowerCase().includes(query);

                          return nameMatch || companyMatch;
                        })
                        .map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            <div className="flex items-center gap-2">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              <div>
                                <p className="font-medium">
                                  {/* 🆕 INVERSÃO: Empresa primeiro, Nome entre parênteses */}
                                  {client.isCompany && client.companyName ? (
                                    <>
                                      {client.companyName}
                                      <span className="text-gray-600"> ({client.name})</span>
                                    </>
                                  ) : (
                                    client.name
                                  )}
                                </p>
                                <p className="text-xs text-gray-500">{client.email}</p>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                    </>
                  )}
                </SelectContent>
              </Select>

              {/* Dica útil */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800">
                  💡 <strong>Dica:</strong> Se o cliente ainda não tem conta, crie na sua conta. Depois você pode transferir usando o botão "Transferir Propriedade" na tela do projeto.
                </p>
              </div>

              {/* 🆕 Billing Info Card - Mostrar informações de faturamento */}
              <BillingInfoCard
                billingStatus={billingStatus}
                isLoading={loadingBillingStatus}
                isAdmin={isAdmin}
                potenciaDigitada={powerValue && powerValue > 0 ? powerValue : null}
              />
            </div>
          )}

          </form>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 p-4 sm:p-6 pt-4 border-t border-gray-100 flex-shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto h-10 px-4 sm:px-5 text-sm text-gray-700 border-gray-300 hover:bg-gray-50"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="project-form"
            className="w-full sm:w-auto h-10 px-4 sm:px-5 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-all text-sm"
            disabled={loading || (typeof window !== 'undefined' && window._isCreatingProject)}
          >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Criando projeto...
                </div>
              ) : (
                "Criar Projeto"
              )}
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 