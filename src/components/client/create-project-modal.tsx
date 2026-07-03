"use client"

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
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
import { AdminCreateClientModal } from "@/components/modals/AdminCreateClientModal"
import { ChevronDown, UserPlus, Check, AlertCircle, User } from 'lucide-react'

const DISTRIBUIDORAS = [
  "Enel",
  "Copel",
  "Cemig",
  "CPFL",
  "Neoenergia Brasília",
  "Neoenergia Cosern",
  "Neoenergia Elektro",
  "Neoenergia Coelba",
  "Neoenergia Pernambuco",
  "Celesc",
  "Energisa",
  "Equatorial",
  "RGE",
  "Amazonas Energia",
  "Outro",
];

declare global {
  interface Window {
    _isCreatingProject?: boolean;
  }
}

interface ClientCreateProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ClientFormData & { owner_id?: string }) => Promise<void>;
  isAdmin?: boolean;
  currentUserId?: string;
}

interface ClientFormData {
  nomeClienteFinal: string;
  cpf_cnpj_cliente_final?: string;
  endereco_local?: string;
  distribuidora: string;
  distribuidoraOutro?: string;
  power: number;
  havera_beneficiarias?: boolean;
  listaMateriais?: string;
  disjuntorPadraoEntrada?: string;
  empresaIntegradora?: string;
  description?: string;
  dataEntrega: string;
  valorProjeto?: number;
}

export function ClientCreateProjectModal({ open, onOpenChange, onSubmit, isAdmin = false, currentUserId }: ClientCreateProjectModalProps) {
  devLog.log('ClientCreateProjectModal rendered with props:', { open, isAdmin });

  const { user } = useAuth();
  const [userData, setUserData] = useState<AuthUserData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showOutroInput, setShowOutroInput] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [clients, setClients] = useState<Array<{ id: string; name: string; email: string; companyName?: string; isCompany?: boolean }>>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>(currentUserId || '');
  const [selectedOwnerData, setSelectedOwnerData] = useState<{ name: string; companyName?: string } | null>(null);
  const [organizationName, setOrganizationName] = useState<string>('');
  const [clientSearchQuery, setClientSearchQuery] = useState<string>('');
  const [ownerPopoverOpen, setOwnerPopoverOpen] = useState(false);
  const [isCreateClientModalOpen, setIsCreateClientModalOpen] = useState(false);

  const [billingStatus, setBillingStatus] = useState<any | null>(null);
  const [loadingBillingStatus, setLoadingBillingStatus] = useState(false);

  const { register, handleSubmit, reset, formState: { errors }, setValue, control, watch } = useForm<ClientFormData>({
    defaultValues: {
      nomeClienteFinal: "",
      cpf_cnpj_cliente_final: "",
      endereco_local: "",
      distribuidora: "",
      distribuidoraOutro: "",
      power: 0,
      havera_beneficiarias: false,
      listaMateriais: "",
      disjuntorPadraoEntrada: "",
      empresaIntegradora: "",
      description: "",
      dataEntrega: new Date().toISOString().split('T')[0],
      valorProjeto: 0,
    }
  });

  const distribuidoraSelecionada = watch("distribuidora");
  const nomeClienteFinalValue = watch("nomeClienteFinal");
  const distribuidoraOutroValue = watch("distribuidoraOutro");
  const powerValue = watch("power");

  const requiredFilled = [
    !!(nomeClienteFinalValue?.trim()),
    distribuidoraSelecionada === "Outro"
      ? !!(distribuidoraOutroValue?.trim())
      : !!(distribuidoraSelecionada),
    !!(powerValue && powerValue > 0),
  ].filter(Boolean).length;

  useEffect(() => {
    setShowOutroInput(distribuidoraSelecionada === "Outro");
  }, [distribuidoraSelecionada]);

  useEffect(() => {
    if (!open) setOwnerPopoverOpen(false);
  }, [open]);

  useEffect(() => {
    async function fetchAdminData() {
      if (!isAdmin || !open) return;
      setLoadingClients(true);
      try {
        const clientsResponse = await fetch('/api/admin/clients', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (clientsResponse.ok) {
          const clientsResult = await clientsResponse.json();
          const mappedClients = (clientsResult.data || []).map((client: any) => ({
            id: client.id,
            name: client.name,
            email: client.email,
            companyName: client.company_name,
            isCompany: client.is_company,
          }));
          setClients(mappedClients);
          devLog.log('[CreateProjectModal] Clientes carregados:', mappedClients.length);
        }

        const orgResponse = await fetch('/api/tenant/organization', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (orgResponse.ok) {
          const orgResult = await orgResponse.json();
          if (orgResult.success && orgResult.data?.name) {
            setOrganizationName(orgResult.data.name);
          }
        }
      } catch (err) {
        devLog.error('[CreateProjectModal] Erro ao buscar dados:', err);
      } finally {
        setLoadingClients(false);
      }
    }
    fetchAdminData();
  }, [isAdmin, open]);

  useEffect(() => {
    if (!isAdmin) return;
    if (selectedOwnerId === currentUserId) {
      setSelectedOwnerData(null);
    } else {
      const selectedClient = clients.find(c => c.id === selectedOwnerId);
      if (selectedClient) {
        setSelectedOwnerData({
          name: selectedClient.name || selectedClient.email,
          companyName: selectedClient.companyName,
        });
      }
    }
  }, [selectedOwnerId, clients, currentUserId, isAdmin]);

  useEffect(() => {
    async function fetchBillingStatus() {
      const targetUserId = isAdmin ? selectedOwnerId : user?.id;
      if (!open || !targetUserId) {
        setBillingStatus(null);
        return;
      }
      setLoadingBillingStatus(true);
      try {
        const response = await fetch(`/api/user/${targetUserId}/billing-status`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setBillingStatus(result);
            devLog.log('[CreateProjectModal] Billing status carregado:', result);
          }
        }
      } catch (err) {
        devLog.error('[CreateProjectModal] Erro ao buscar billing status:', err);
      } finally {
        setLoadingBillingStatus(false);
      }
    }
    fetchBillingStatus();
  }, [open, isAdmin, selectedOwnerId, user?.id]);

  useEffect(() => {
    async function fetchUserData() {
      if (user?.id) {
        try {
          const response = await fetch(`/api/user/profile?userId=${user.id}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
          if (!response.ok) throw new Error(`Erro na API: ${response.status}`);
          const data: AuthUserData = await response.json();
          setUserData(data);
          if (data?.isCompany && data?.companyName && !watch('empresaIntegradora')) {
            setValue('empresaIntegradora', data.companyName || '');
          }
        } catch (err) {
          devLog.error("Error fetching user data:", err);
        }
      }
    }
    fetchUserData();
  }, [user, setValue, watch]);

  const selectedOwnerDisplay = (() => {
    if (!selectedOwnerId) return '';
    if (selectedOwnerId === currentUserId) return 'Minha conta';
    const c = clients.find(cl => cl.id === selectedOwnerId);
    if (!c) return '';
    return c.isCompany && c.companyName ? `${c.companyName} (${c.name})` : c.name;
  })();

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

      window._isCreatingProject = true;
      setLoading(true);
      devLog.log(`[${submitId}] Iniciando submissão de formulário`);

      const currentDisplayUser = userData || (user ? { name: user.profile?.full_name || user.email, email: user.email, uid: user.id } : {});
      const distribuidoraFinal = data.distribuidora === "Outro" ? data.distribuidoraOutro : data.distribuidora;

      let empresaIntegradoraFinal = data.empresaIntegradora;
      if (!empresaIntegradoraFinal) {
        if (isAdmin) {
          if (selectedOwnerId === currentUserId) {
            empresaIntegradoraFinal = organizationName || 'Cliente Individual';
          } else {
            empresaIntegradoraFinal = selectedOwnerData?.companyName || selectedOwnerData?.name || 'Cliente Individual';
          }
        } else {
          empresaIntegradoraFinal = (currentDisplayUser as AuthUserData)?.companyName || (currentDisplayUser as any)?.name || 'Cliente Individual';
        }
      }

      const projectPayload = {
        ...data,
        distribuidora: distribuidoraFinal || '',
        empresaIntegradora: empresaIntegradoraFinal,
        ...(isAdmin && { owner_id: selectedOwnerId }),
      };

      devLog.log(`[${submitId}] Dados do formulário para onSubmit:`, projectPayload);
      await onSubmit(projectPayload);
      devLog.log(`[${submitId}] Submissão concluída com sucesso`);
      reset();
      onOpenChange(false);
    } catch (err: any) {
      devLog.error(`[${submitId}] Erro ao criar projeto:`, err);
      if (!err) {
        setError("Erro desconhecido ao criar projeto");
      } else if (typeof err === 'string') {
        setError(`Erro: ${err}`);
      } else {
        setError(`ERRO AO CRIAR PROJETO:\nMensagem: ${err.message || 'Erro desconhecido'}\nCódigo: ${err.code || 'N/A'}`);
      }
    } finally {
      devLog.log(`[${submitId}] Finalizando estado de loading`);
      setLoading(false);
      window._isCreatingProject = false;
    }
  };

  const filteredClients = clients.filter(c => {
    const q = clientSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return c.name?.toLowerCase().includes(q) || c.companyName?.toLowerCase().includes(q);
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        {(() => { devLog.log('Dialog rendering with open:', open); return null; })()}
        <DialogContent className="w-full max-w-[95vw] sm:max-w-[520px] max-h-[90vh] p-0 rounded-lg border border-gray-200 shadow-lg flex flex-col">
          <DialogHeader className="space-y-1 p-4 sm:p-6 pb-4 border-b border-gray-100 flex-shrink-0">
            <DialogTitle className="text-xl sm:text-2xl font-semibold text-gray-800">Criar Novo Projeto</DialogTitle>
            <p className="text-xs sm:text-sm text-gray-500">Preencha os detalhes abaixo para criar um novo projeto solar.</p>
          </DialogHeader>

          {error && (
            <div className="bg-red-50 p-4 mx-4 sm:mx-6 rounded-md my-3 border-l-4 border-red-400 flex-shrink-0">
              <Label className="text-sm font-medium text-red-600">Diagnóstico do Erro</Label>
              <pre className="whitespace-pre-wrap text-xs font-mono mt-2 text-red-700 max-h-40 overflow-auto">
                {error}
              </pre>
              <Button variant="outline" className="mt-2" onClick={() => setError(null)}>
                Limpar Erro
              </Button>
            </div>
          )}

          <div className="overflow-y-auto flex-1 px-4 sm:px-6">
            <form id="project-form" onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5 py-4">

              {/* ─── ADMIN: Proprietário do Projeto (topo) ─── */}
              {isAdmin && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <Label className="text-sm font-semibold text-blue-800">Proprietário do Projeto</Label>
                  </div>

                  <div className="flex gap-2">
                    {/* Combobox de proprietário */}
                    <Popover open={ownerPopoverOpen} onOpenChange={setOwnerPopoverOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          disabled={loadingClients}
                          className="flex-1 min-w-0 h-10 border border-gray-300 bg-white rounded-md px-3 flex items-center justify-between gap-2 text-sm hover:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className={`truncate ${selectedOwnerDisplay ? 'text-gray-800' : 'text-gray-400'}`}>
                            {loadingClients ? 'Carregando...' : selectedOwnerDisplay || 'Selecione o proprietário'}
                          </span>
                          <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="p-0 w-[var(--radix-popover-trigger-width)] min-w-[220px]"
                        align="start"
                        sideOffset={4}
                      >
                        <div className="p-2 border-b">
                          <Input
                            type="text"
                            placeholder="Buscar por nome ou empresa..."
                            value={clientSearchQuery}
                            onChange={(e) => setClientSearchQuery(e.target.value)}
                            className="h-8 text-xs"
                            autoFocus
                          />
                        </div>
                        <div className="max-h-[220px] overflow-y-auto py-1" onWheel={(e) => e.stopPropagation()}>
                          {/* Minha conta */}
                          <button
                            type="button"
                            className={`w-full flex items-start gap-2 px-3 py-2 text-sm hover:bg-gray-50 text-left transition-colors ${selectedOwnerId === currentUserId ? 'bg-blue-50' : ''}`}
                            onClick={() => {
                              setSelectedOwnerId(currentUserId || '');
                              setOwnerPopoverOpen(false);
                              setClientSearchQuery('');
                            }}
                          >
                            <div className="w-4 h-4 flex-shrink-0 mt-0.5 flex items-center justify-center">
                              {selectedOwnerId === currentUserId && <Check className="h-3.5 w-3.5 text-blue-600" />}
                            </div>
                            <div>
                              <p className="font-medium text-gray-800 text-sm">Minha conta</p>
                              <p className="text-xs text-gray-500">O projeto ficará na sua lista</p>
                            </div>
                          </button>

                          {clients.length > 0 && (
                            <>
                              <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide border-t border-gray-100 mt-1">
                                Clientes
                              </div>
                              {filteredClients.map(client => (
                                <button
                                  key={client.id}
                                  type="button"
                                  className={`w-full flex items-start gap-2 px-3 py-2 text-sm hover:bg-gray-50 text-left transition-colors ${selectedOwnerId === client.id ? 'bg-blue-50' : ''}`}
                                  onClick={() => {
                                    setSelectedOwnerId(client.id);
                                    setOwnerPopoverOpen(false);
                                    setClientSearchQuery('');
                                  }}
                                >
                                  <div className="w-4 h-4 flex-shrink-0 mt-0.5 flex items-center justify-center">
                                    {selectedOwnerId === client.id && <Check className="h-3.5 w-3.5 text-blue-600" />}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-medium text-gray-800 text-sm truncate">
                                      {client.isCompany && client.companyName
                                        ? <>{client.companyName} <span className="text-gray-500 font-normal">({client.name})</span></>
                                        : client.name}
                                    </p>
                                    <p className="text-xs text-gray-500 truncate">{client.email}</p>
                                  </div>
                                </button>
                              ))}
                              {filteredClients.length === 0 && clientSearchQuery && (
                                <p className="px-3 py-3 text-xs text-gray-400 text-center">
                                  Nenhum cliente encontrado
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>

                    {/* Botão + Novo Cliente */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5 whitespace-nowrap h-10 px-3 border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400 flex-shrink-0"
                      onClick={() => setIsCreateClientModalOpen(true)}
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Novo Cliente
                    </Button>
                  </div>

                  {/* BillingInfoCard para admin */}
                  <BillingInfoCard
                    billingStatus={billingStatus}
                    isLoading={loadingBillingStatus}
                    isAdmin={isAdmin}
                    potenciaDigitada={powerValue && powerValue > 0 ? powerValue : null}
                  />
                </div>
              )}

              {/* ─── Campos obrigatórios (destaque) ─── */}
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-500 flex-shrink-0" />
                  <span className="text-sm font-semibold text-orange-700">Campos obrigatórios</span>
                </div>

                {/* Nome Cliente Final */}
                <div className="space-y-1.5">
                  <Label htmlFor="nomeClienteFinal" className="text-sm font-medium text-gray-700">
                    Nome Cliente Final <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="nomeClienteFinal"
                    {...register("nomeClienteFinal", { required: true })}
                    placeholder="Ex: João da Silva ou Empresa XYZ"
                    className="h-10 sm:h-11 px-3 sm:px-4 text-sm border-gray-300 focus:border-orange-400 focus:ring focus:ring-orange-200 transition-all"
                  />
                  {errors.nomeClienteFinal && (
                    <p className="text-xs text-red-500">Nome do cliente é obrigatório</p>
                  )}
                </div>

                {/* Distribuidora de Energia */}
                <div className="space-y-1.5">
                  <Label htmlFor="distribuidora" className="text-sm font-medium text-gray-700">
                    Distribuidora de Energia <span className="text-red-500">*</span>
                  </Label>
                  <Controller
                    name="distribuidora"
                    control={control}
                    rules={{ required: true }}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                          {DISTRIBUIDORAS.map((d) => (
                            <SelectItem key={d} value={d}>{d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.distribuidora && (
                    <p className="text-xs text-red-500">Distribuidora é obrigatória</p>
                  )}
                  {showOutroInput && (
                    <div className="mt-2">
                      <Input
                        {...register("distribuidoraOutro", { required: distribuidoraSelecionada === "Outro" })}
                        placeholder="Digite o nome da distribuidora"
                        className="h-10 sm:h-11 px-3 sm:px-4 text-sm border-gray-300 focus:border-orange-400 focus:ring focus:ring-orange-200 transition-all"
                      />
                      {errors.distribuidoraOutro && (
                        <p className="text-xs text-red-500 mt-1">Nome da distribuidora é obrigatório</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Potência (kWp) */}
                <div className="space-y-1.5">
                  <Label htmlFor="power" className="text-sm font-medium text-gray-700">
                    Potência (kWp) <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="power"
                      type="number"
                      step="0.01"
                      {...register("power", { required: true, valueAsNumber: true, min: 0 })}
                      placeholder="Ex: 5.76"
                      className="h-10 sm:h-11 px-3 sm:px-4 pr-12 text-sm border-gray-300 focus:border-orange-400 focus:ring focus:ring-orange-200 transition-all"
                    />
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 text-sm font-medium">
                      kWp
                    </span>
                  </div>
                  {errors.power && (
                    <p className="text-xs text-red-500">Potência é obrigatória e deve ser maior que 0</p>
                  )}
                </div>
              </div>

              {/* ─── Campos opcionais ─── */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className="text-xs text-gray-400 font-medium px-1 whitespace-nowrap">Campos opcionais</span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>

                {/* CPF/CNPJ */}
                <div className="space-y-1.5">
                  <Label htmlFor="cpf_cnpj_cliente_final" className="text-sm font-medium text-gray-700">
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

                {/* Endereço */}
                <div className="space-y-1.5">
                  <Label htmlFor="endereco_local" className="text-sm font-medium text-gray-700">
                    Endereço do Local
                  </Label>
                  <Input
                    id="endereco_local"
                    {...register("endereco_local")}
                    placeholder="Ex: Rua das Flores, 123 - Centro - Florianópolis/SC"
                    className="h-10 sm:h-11 px-3 sm:px-4 text-sm border-gray-300 focus:border-orange-400 focus:ring focus:ring-orange-200 transition-all"
                  />
                </div>

                {/* Haverá Compensação de Créditos */}
                <div className="space-y-1.5">
                  <Label htmlFor="havera_beneficiarias" className="text-sm font-medium text-gray-700">
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
                  {watch("havera_beneficiarias") && (
                    <div className="mt-2 p-3 bg-purple-50 border border-purple-200 rounded-lg flex items-start gap-2">
                      <span className="text-purple-600 text-base leading-none mt-0.5 flex-shrink-0">⚡</span>
                      <div>
                        <p className="text-sm font-semibold text-purple-900 mb-0.5">
                          Atenção: Este projeto possui compensação de créditos
                        </p>
                        <p className="text-xs text-purple-700">
                          Envie as <strong>Faturas das Unidades Beneficiárias</strong> na Linha do Tempo do Projeto no campo adequado após a criação.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Lista de Materiais */}
                <div className="space-y-1.5">
                  <Label htmlFor="listaMateriais" className="text-sm font-medium text-gray-700">
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

                {/* Disjuntor do Padrão de Entrada */}
                <div className="space-y-1.5">
                  <Label htmlFor="disjuntorPadraoEntrada" className="text-sm font-medium text-gray-700">
                    Disjuntor do Padrão de Entrada
                  </Label>
                  <Input
                    id="disjuntorPadraoEntrada"
                    {...register("disjuntorPadraoEntrada")}
                    placeholder="Ex: Bifásico 63A, Trifásico 50A"
                    className="h-10 sm:h-11 px-3 sm:px-4 text-sm border-gray-300 focus:border-orange-400 focus:ring focus:ring-orange-200 transition-all"
                  />
                </div>
              </div>

              {/* BillingInfoCard para cliente */}
              {!isAdmin && (
                <BillingInfoCard
                  billingStatus={billingStatus}
                  isLoading={loadingBillingStatus}
                  isAdmin={false}
                  potenciaDigitada={powerValue && powerValue > 0 ? powerValue : null}
                />
              )}

              {/* Nota sobre documentos */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-start gap-2">
                <span className="text-sm leading-none mt-0.5 flex-shrink-0">📎</span>
                <p className="text-xs text-gray-500">
                  Documentos e arquivos são enviados após a criação do projeto, diretamente na <strong>linha do tempo</strong> do projeto.
                </p>
              </div>

            </form>
          </div>

          {/* Footer */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 p-4 sm:p-6 pt-4 border-t border-gray-100 flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto h-10 px-4 sm:px-5 text-sm text-gray-700 border-gray-300 hover:bg-gray-50"
            >
              Cancelar
            </Button>
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <span className="text-xs text-gray-400 whitespace-nowrap">
                {requiredFilled}/3 campos preenchidos
              </span>
              <Button
                type="submit"
                form="project-form"
                className="h-10 px-4 sm:px-5 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading || requiredFilled < 3 || (typeof window !== 'undefined' && window._isCreatingProject)}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Criando projeto...
                  </div>
                ) : (
                  'Criar Projeto'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AdminCreateClientModal renderizado fora do Dialog do projeto para evitar conflito de z-index */}
      {isAdmin && (
        <AdminCreateClientModal
          open={isCreateClientModalOpen}
          onOpenChange={(v) => { if (!v) setIsCreateClientModalOpen(false); }}
          onSuccess={(clientId, clientName, clientEmail) => {
            if (clientId && clientName && clientEmail) {
              setClients(prev => {
                if (prev.some(c => c.id === clientId)) return prev;
                return [...prev, { id: clientId, name: clientName, email: clientEmail }];
              });
              setSelectedOwnerId(clientId);
            }
          }}
        />
      )}
    </>
  );
}
