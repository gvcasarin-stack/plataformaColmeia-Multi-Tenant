"use client"

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useForm, Controller } from "react-hook-form"
import { devLog } from "@/lib/utils/productionLogger"

const LEAD_STATUS = [
  { value: 'novo', label: 'Novo' },
  { value: 'contatado', label: 'Contatado' },
  { value: 'qualificado', label: 'Qualificado' },
  { value: 'proposta_enviada', label: 'Proposta Enviada' },
  { value: 'em_negociacao', label: 'Em Negociação' },
  { value: 'ganho', label: 'Ganho' },
  { value: 'perdido', label: 'Perdido' }
]

const LEAD_SOURCES = [
  { value: 'site', label: 'Site' },
  { value: 'indicacao', label: 'Indicação' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'google', label: 'Google' },
  { value: 'telefone', label: 'Telefone' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'email', label: 'E-mail' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'outro', label: 'Outro' }
]

interface AddLeadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: LeadFormData) => Promise<void>
  teamMembers?: Array<{ id: string; full_name?: string; email?: string }>
  initialData?: any
  isEdit?: boolean
}

interface LeadFormData {
  name: string
  email?: string
  phone?: string
  company?: string
  estimated_power?: number
  estimated_value?: number
  address?: string
  city?: string
  state?: string
  status: string
  source?: string
  responsible_id?: string
  notes?: string
}

export function AddLeadModal({ open, onOpenChange, onSubmit, teamMembers = [], initialData, isEdit = false }: AddLeadModalProps) {
  devLog.log('AddLeadModal rendered with props:', { open, hasOnOpenChange: !!onOpenChange, hasOnSubmit: !!onSubmit, isEdit, hasInitialData: !!initialData })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showOtherSource, setShowOtherSource] = useState(false)

  const { register, handleSubmit, reset, formState: { errors }, setValue, control, watch } = useForm<LeadFormData>({
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      company: "",
      estimated_power: undefined,
      estimated_value: undefined,
      address: "",
      city: "",
      state: "",
      status: "novo",
      source: "",
      responsible_id: "",
      notes: "",
    }
  })

  const sourceSelecionada = watch("source")

  useEffect(() => {
    setShowOtherSource(sourceSelecionada === "outro")
  }, [sourceSelecionada])

  // Preencher formulário quando editando
  useEffect(() => {
    if (isEdit && initialData && open) {
      devLog.log('Preenchendo formulário com dados:', initialData);

      // Preencher todos os campos
      setValue('name', initialData.name || '');
      setValue('email', initialData.email || '');
      setValue('phone', initialData.phone || '');
      setValue('company', initialData.company || '');

      // Converter para número (limpar qualquer formatação)
      const estimatedPower = initialData.estimated_power ? parseFloat(initialData.estimated_power) : undefined;
      const estimatedValue = initialData.estimated_value ? parseFloat(initialData.estimated_value) : undefined;

      setValue('estimated_power', estimatedPower);
      setValue('estimated_value', estimatedValue);
      setValue('address', initialData.address || '');
      setValue('city', initialData.city || '');
      setValue('state', initialData.state || '');
      setValue('status', initialData.status || 'novo');
      setValue('source', initialData.source || '');
      setValue('responsible_id', initialData.responsible_id || '');
      setValue('notes', initialData.notes || '');
    } else if (!open) {
      // Limpar formulário ao fechar
      reset();
    }
  }, [isEdit, initialData, open, setValue, reset]);

  const handleFormSubmit = async (data: LeadFormData) => {
    setError(null)

    try {
      if (loading) {
        devLog.log('Já existe uma submissão em andamento, ignorando clique duplo')
        return
      }

      setLoading(true)
      devLog.log('Iniciando submissão de formulário de lead:', data)

      await onSubmit(data)
      devLog.log('Submissão de lead concluída com sucesso')
      reset()
      onOpenChange(false)
    } catch (error: any) {
      devLog.error('Erro ao criar lead:', error)

      const errorMessage =
        `ERRO AO CRIAR LEAD:\n` +
        `Mensagem: ${error.message || 'Erro desconhecido'}\n` +
        `Código: ${error.code || 'N/A'}`

      setError(errorMessage)
    } finally {
      devLog.log('Finalizando estado de loading')
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[95vw] sm:max-w-[600px] max-h-[90vh] p-0 rounded-lg border border-gray-200 shadow-lg flex flex-col">
        <DialogHeader className="space-y-3 p-4 sm:p-6 pb-4 border-b border-gray-100 flex-shrink-0">
          <DialogTitle className="text-xl sm:text-2xl font-semibold text-gray-800">
            {isEdit ? 'Editar Lead' : 'Adicionar Novo Lead'}
          </DialogTitle>
          <p className="text-xs sm:text-sm text-gray-500">
            {isEdit
              ? 'Atualize as informações do lead abaixo.'
              : 'Preencha os detalhes abaixo para adicionar um novo lead ao sistema.'}
          </p>
        </DialogHeader>

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
          <form id="lead-form" onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 sm:space-y-5 py-4">

            {/* Informações Básicas */}
            <div className="space-y-4 pb-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Informações Básicas
              </h3>

              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs sm:text-sm font-medium text-gray-700">
                  Nome do Lead <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  {...register("name", { required: true })}
                  placeholder="Ex: João da Silva"
                  className="h-10 sm:h-11 px-3 sm:px-4 text-sm border-gray-300 focus:border-orange-400 focus:ring focus:ring-orange-200 transition-all"
                />
                {errors.name && (
                  <p className="text-sm text-red-500 flex items-center mt-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Nome do lead é obrigatório
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs sm:text-sm font-medium text-gray-700">
                    E-mail
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    {...register("email")}
                    placeholder="exemplo@email.com"
                    className="h-10 sm:h-11 px-3 sm:px-4 text-sm border-gray-300 focus:border-orange-400 focus:ring focus:ring-orange-200 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-xs sm:text-sm font-medium text-gray-700">
                    Telefone
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    {...register("phone")}
                    placeholder="(00) 00000-0000"
                    className="h-10 sm:h-11 px-3 sm:px-4 text-sm border-gray-300 focus:border-orange-400 focus:ring focus:ring-orange-200 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company" className="text-xs sm:text-sm font-medium text-gray-700">
                  Empresa
                </Label>
                <Input
                  id="company"
                  {...register("company")}
                  placeholder="Ex: Empresa XYZ Ltda"
                  className="h-10 sm:h-11 px-3 sm:px-4 text-sm border-gray-300 focus:border-orange-400 focus:ring focus:ring-orange-200 transition-all"
                />
              </div>
            </div>

            {/* Informações do Projeto */}
            <div className="space-y-4 pb-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Informações do Projeto Potencial
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="estimated_power" className="text-xs sm:text-sm font-medium text-gray-700">
                    Potência Estimada (kWp)
                  </Label>
                  <div className="relative">
                    <Input
                      id="estimated_power"
                      type="number"
                      step="0.01"
                      {...register("estimated_power", { valueAsNumber: true, min: 0 })}
                      placeholder="Ex: 5.76"
                      className="h-10 sm:h-11 px-3 sm:px-4 pr-10 sm:pr-12 text-sm border-gray-300 focus:border-orange-400 focus:ring focus:ring-orange-200 transition-all"
                    />
                    <span className="absolute inset-y-0 right-0 flex items-center pr-2 sm:pr-3 text-gray-500 text-xs sm:text-sm font-medium">
                      kWp
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estimated_value" className="text-xs sm:text-sm font-medium text-gray-700">
                    Valor Estimado (R$)
                  </Label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 sm:pl-4 text-gray-500 text-xs sm:text-sm font-medium pointer-events-none">
                      R$
                    </span>
                    <Input
                      id="estimated_value"
                      type="number"
                      step="0.01"
                      {...register("estimated_value", { valueAsNumber: true, min: 0 })}
                      placeholder="Ex: 25000.00"
                      className="h-10 sm:h-11 pl-14 sm:pl-16 pr-3 sm:pr-4 text-sm border-gray-300 focus:border-orange-400 focus:ring focus:ring-orange-200 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="text-xs sm:text-sm font-medium text-gray-700">
                  Endereço Completo
                </Label>
                <Input
                  id="address"
                  {...register("address")}
                  placeholder="Ex: Rua das Flores, 123 - Centro"
                  className="h-10 sm:h-11 px-3 sm:px-4 text-sm border-gray-300 focus:border-orange-400 focus:ring focus:ring-orange-200 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="city" className="text-xs sm:text-sm font-medium text-gray-700">
                    Cidade
                  </Label>
                  <Input
                    id="city"
                    {...register("city")}
                    placeholder="Ex: Florianópolis"
                    className="h-10 sm:h-11 px-3 sm:px-4 text-sm border-gray-300 focus:border-orange-400 focus:ring focus:ring-orange-200 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state" className="text-xs sm:text-sm font-medium text-gray-700">
                    Estado (UF)
                  </Label>
                  <Input
                    id="state"
                    {...register("state")}
                    placeholder="SC"
                    maxLength={2}
                    className="h-10 sm:h-11 px-3 sm:px-4 text-sm border-gray-300 focus:border-orange-400 focus:ring focus:ring-orange-200 transition-all uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Status e Classificação */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Status e Classificação
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-xs sm:text-sm font-medium text-gray-700">
                    Status <span className="text-red-500">*</span>
                  </Label>
                  <Controller
                    name="status"
                    control={control}
                    rules={{ required: true }}
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger className="h-10 sm:h-11 px-3 sm:px-4 text-sm border-gray-300 focus:border-orange-400 focus:ring focus:ring-orange-200 transition-all">
                          <SelectValue placeholder="Selecione o status" />
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
                          {LEAD_STATUS.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.status && (
                    <p className="text-sm text-red-500 flex items-center mt-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Status é obrigatório
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="source" className="text-xs sm:text-sm font-medium text-gray-700">
                    Origem do Lead
                  </Label>
                  <Controller
                    name="source"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger className="h-10 sm:h-11 px-3 sm:px-4 text-sm border-gray-300 focus:border-orange-400 focus:ring focus:ring-orange-200 transition-all">
                          <SelectValue placeholder="Selecione a origem" />
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
                          {LEAD_SOURCES.map((source) => (
                            <SelectItem key={source.value} value={source.value}>
                              {source.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              {teamMembers.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="responsible_id" className="text-xs sm:text-sm font-medium text-gray-700">
                    Responsável pelo Lead
                  </Label>
                  <Controller
                    name="responsible_id"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger className="h-10 sm:h-11 px-3 sm:px-4 text-sm border-gray-300 focus:border-orange-400 focus:ring focus:ring-orange-200 transition-all">
                          <SelectValue placeholder="Selecione o responsável" />
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
                          <SelectItem value="">Não atribuído</SelectItem>
                          {teamMembers.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.full_name || member.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-xs sm:text-sm font-medium text-gray-700">
                  Observações
                </Label>
                <textarea
                  id="notes"
                  {...register("notes")}
                  placeholder="Adicione observações ou anotações sobre este lead..."
                  className="w-full h-20 sm:h-24 px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:border-orange-400 focus:ring focus:ring-orange-200 transition-all resize-none text-xs sm:text-sm"
                  rows={3}
                />
              </div>
            </div>

          </form>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 p-4 sm:p-6 pt-4 border-t border-gray-100 flex-shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              reset()
              onOpenChange(false)
            }}
            disabled={loading}
            className="w-full sm:w-auto order-2 sm:order-1"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="lead-form"
            disabled={loading}
            className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white order-1 sm:order-2"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {isEdit ? 'Atualizando...' : 'Criando...'}
              </div>
            ) : (
              isEdit ? 'Atualizar Lead' : 'Adicionar Lead'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
