"use client"

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useForm, Controller } from "react-hook-form"
import { useAuth } from "@/lib/hooks/useAuth"
import { getUserDataSupabase, UserData as AuthUserData } from "@/lib/services/authService.supabase"
import { devLog } from "@/lib/utils/productionLogger";
import logger from '@/lib/utils/logger'

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
  onSubmit: (data: ClientFormData) => Promise<void>;
}

interface ClientFormData {
  nomeClienteFinal: string;
  distribuidora: string;
  distribuidoraOutro?: string;
  power: number;
  listaMateriais?: string;
  disjuntorPadraoEntrada?: string;
  empresaIntegradora?: string;
  name: string;
  description?: string;
  dataEntrega: string;
  valorProjeto?: number;
}

export function ClientCreateProjectModal({ open, onOpenChange, onSubmit }: ClientCreateProjectModalProps) {
  devLog.log('ClientCreateProjectModal rendered with props:', { open, hasOnOpenChange: !!onOpenChange, hasOnSubmit: !!onSubmit });
  
  const { user } = useAuth();
  const [userData, setUserData] = useState<AuthUserData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showOutroInput, setShowOutroInput] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { register, handleSubmit, reset, formState: { errors }, setValue, control, watch } = useForm<ClientFormData>({
    defaultValues: {
      nomeClienteFinal: "",
      distribuidora: "",
      distribuidoraOutro: "",
      power: 0,
      listaMateriais: "",
      disjuntorPadraoEntrada: "",
      empresaIntegradora: "",
      name: "",
      description: "",
      dataEntrega: new Date().toISOString().split('T')[0],
      valorProjeto: 0,
    }
  });
  
  // Observar mudanças no campo distribuidora para mostrar o campo "Outro" quando necessário
  const distribuidoraSelecionada = watch("distribuidora");
  
  useEffect(() => {
    setShowOutroInput(distribuidoraSelecionada === "Outro");
  }, [distribuidoraSelecionada]);
  
  // Efeito para carregar dados do usuário
  useEffect(() => {
    async function fetchUserData() {
      if (user?.id) {
        try {
          const data: AuthUserData = await getUserDataSupabase(user.id);
          setUserData(data);
          if (data?.isCompany && data?.companyName && !watch('empresaIntegradora')) {
            setValue('empresaIntegradora', data.companyName || '');
          }
          // Campo nomeClienteFinal permanece vazio para o usuário preencher manualmente
          // com o nome do cliente final (cliente do cliente)
          if (data?.name && !watch('name')){
            setValue('name', `Projeto ${data.name}`);
          }
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
      
      window._isCreatingProject = true;
      setLoading(true);
      devLog.log(`[${submitId}] Iniciando submissão de formulário`);
      
      const currentDisplayUser = userData || (user ? { name: user.profile?.full_name || user.email, email: user.email, uid: user.id } : {});

      const distribuidoraFinal = data.distribuidora === "Outro" ? data.distribuidoraOutro : data.distribuidora;
      
      const projectPayload: ClientFormData = {
        ...data,
        distribuidora: distribuidoraFinal || '',
        empresaIntegradora: data.empresaIntegradora || (currentDisplayUser as AuthUserData)?.companyName || (currentDisplayUser as any)?.name || 'Cliente Individual',
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
      <DialogContent className="max-w-[500px] p-6 rounded-lg border border-gray-200 shadow-lg">
        <DialogHeader className="space-y-3 pb-5 border-b border-gray-100">
          <DialogTitle className="text-2xl font-semibold text-gray-800">Criar Novo Projeto</DialogTitle>
          <p className="text-sm text-gray-500">Preencha os detalhes abaixo para criar um novo projeto solar.</p>
        </DialogHeader>
        
        {/* Exibir mensagem de erro detalhada se houver */}
        {error && (
          <div className="bg-red-50 p-4 rounded-md my-5 border-l-4 border-red-400">
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
        
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5 mt-2">
          <div className="space-y-2">
            <Label htmlFor="nomeClienteFinal" className="text-sm font-medium text-gray-700">
              Nome Cliente Final <span className="text-red-500">*</span>
            </Label>
            <Input
              id="nomeClienteFinal"
              {...register("nomeClienteFinal", { required: true })}
              placeholder="Ex: João da Silva ou Empresa XYZ"
              className="h-11 px-4 border-gray-300 focus:border-orange-400 focus:ring focus:ring-orange-200 transition-all"
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

          <div className="space-y-2">
            <Label htmlFor="distribuidora" className="text-sm font-medium text-gray-700">
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
                  <SelectTrigger className="h-11 px-4 border-gray-300 focus:border-orange-400 focus:ring focus:ring-orange-200 transition-all">
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
                  className="h-11 px-4 border-gray-300 focus:border-orange-400 focus:ring focus:ring-orange-200 transition-all"
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
            <Label htmlFor="power" className="text-sm font-medium text-gray-700">
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
                className="h-11 px-4 pr-12 border-gray-300 focus:border-orange-400 focus:ring focus:ring-orange-200 transition-all"
              />
              <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 text-sm font-medium">
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
            <Label htmlFor="listaMateriais" className="text-sm font-medium text-gray-700">
              Lista de Materiais
            </Label>
            <textarea
              id="listaMateriais"
              {...register("listaMateriais")}
              placeholder="Preencha Marca, Modelo e Quantidades dos Equipamentos que serão utilizados.&#10;&#10;Ex: 1x Inversor Growatt, MIN 5000TL-X e 10x Módulos Fotovoltaicos TSUN de 560W"
              className="w-full h-24 px-4 py-3 border border-gray-300 rounded-lg focus:border-orange-400 focus:ring focus:ring-orange-200 transition-all resize-none text-sm"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="disjuntorPadraoEntrada" className="text-sm font-medium text-gray-700">
              Disjuntor do Padrão de Entrada
            </Label>
            <Input
              id="disjuntorPadraoEntrada"
              {...register("disjuntorPadraoEntrada")}
              placeholder="Ex: Bifásico 63A, Trifásico 50A"
              className="h-11 px-4 border-gray-300 focus:border-orange-400 focus:ring focus:ring-orange-200 transition-all"
            />
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-gray-100 mt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="h-10 px-5 text-gray-700 border-gray-300 hover:bg-gray-50"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className={`h-10 px-5 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-all`}
              disabled={loading}
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
        </form>
      </DialogContent>
    </Dialog>
  )
}
