"use client"

import React, { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useForm, Controller } from "react-hook-form"
import { Project } from "@/types/project"
import { generateUniqueProjectNumberAction, isProjectNumberUsedAction } from "@/lib/actions/project-actions"
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

interface ProjectFormProps {
  /**
   * Função chamada quando um projeto é criado
   */
  onProjectCreated: (project: Project) => Promise<void>;
  /**
   * Último número de projeto usado (para manter sequência)
   */
  lastProjectNumber?: string;
  /**
   * Lista de números de projeto já existentes
   */
  existingProjectNumbers?: string[];
  /**
   * Elemento filho que servirá como trigger para abrir o modal
   */
  children?: React.ReactNode;
}

interface FormData {
  projectNumber: string;
  empresaIntegradora: string;
  nomeClienteFinal: string;
  distribuidora: string;
  distribuidoraOutro?: string;
  power: number;
  dataEntrega: string;
  priority: 'Alta' | 'Média' | 'Baixa';
}

export function ProjectForm({ 
  onProjectCreated, 
  lastProjectNumber, 
  existingProjectNumbers = [],
  children 
}: ProjectFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [projectNumber, setProjectNumber] = useState<string | null>(null);
  const [showOutroInput, setShowOutroInput] = useState(false);

  const { register, handleSubmit, control, reset, setValue, watch } = useForm<FormData>({
    defaultValues: {
      projectNumber: "",  // Será preenchido de forma assíncrona
      empresaIntegradora: "",
      nomeClienteFinal: "",
      distribuidora: "",
      distribuidoraOutro: "",
      power: 0,
      dataEntrega: "",
      priority: "Baixa"
    }
  });

  // Observar mudanças no campo distribuidora para mostrar o campo "Outro" quando necessário
  const distribuidoraSelecionada = watch("distribuidora");
  
  useEffect(() => {
    setShowOutroInput(distribuidoraSelecionada === "Outro");
  }, [distribuidoraSelecionada]);

  // Atualizar o número do projeto quando o modal for aberto
  useEffect(() => {
    async function generateProjectNumberLogic() {
      if (open && !projectNumber) {
        setLoading(true);
        logger.debug("Gerando número de projeto para o modal via Server Actions");
        
        try {
          let newNumberResult = await generateUniqueProjectNumberAction();
          if (newNumberResult.error || !newNumberResult.number) {
            logger.error('[ProjectForm] Erro ao gerar número via action:', newNumberResult.error);
            // Fallback em caso de erro
            const fallbackNumber = `FV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
            setValue('projectNumber', fallbackNumber);
            setProjectNumber(fallbackNumber);
            setLoading(false);
            return;
          }
          
          let currentNumber = newNumberResult.number;
          let verificationResult = await isProjectNumberUsedAction(currentNumber);
          
          let attempts = 0;
          const maxAttempts = 5; // Para evitar loop infinito

          while (verificationResult.isUsed && attempts < maxAttempts) {
            logger.warn(`[ProjectForm] Número ${currentNumber} já está em uso (verificado via action), gerando outro...`);
            attempts++;
            newNumberResult = await generateUniqueProjectNumberAction();
            if (newNumberResult.error || !newNumberResult.number) {
              logger.error('[ProjectForm] Erro ao gerar novo número na tentativa:', newNumberResult.error);
              break; // Sai do loop se houver erro na geração
            }
            currentNumber = newNumberResult.number;
            if (attempts < maxAttempts) { // Só verifica se não for a última tentativa (para evitar chamada extra)
                 verificationResult = await isProjectNumberUsedAction(currentNumber);
            } else {
                logger.warn('[ProjectForm] Máximo de tentativas atingido para verificar se número está em uso.');
            }
          }
          
          if (verificationResult.isUsed) { // Se ainda estiver em uso após tentativas
            logger.error('[ProjectForm] Não foi possível gerar um número de projeto único após múltiplas tentativas via actions');
            const fallbackNumber = `FV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
            setValue('projectNumber', fallbackNumber);
            setProjectNumber(fallbackNumber);
          } else {
            logger.info('[ProjectForm] Número de projeto gerado e verificado com sucesso via actions:', currentNumber);
            setValue('projectNumber', currentNumber);
            setProjectNumber(currentNumber);
          }

        } catch (error) {
          logger.error('[ProjectForm] Erro catastrófico ao gerar número de projeto:', error);
          const fallbackNumber = `FV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
          setValue('projectNumber', fallbackNumber);
          setProjectNumber(fallbackNumber);
        } finally {
          setLoading(false);
        }
      }
    }
    
    generateProjectNumberLogic();
  }, [open, setValue, projectNumber]);

  const handleFormSubmit = async (data: FormData) => {
    try {
      // Verificar se é uma distribuidora personalizada
      const distribuidoraFinal = data.distribuidora === "Outro" ? data.distribuidoraOutro : data.distribuidora;
      
      const submitData = {
        ...data,
        distribuidora: distribuidoraFinal,
        projectNumber: projectNumber,
      };
      
      setLoading(true);
      await onProjectCreated(submitData as unknown as Project);
      reset();
      setProjectNumber("");
      setOpen(false);
    } catch (error) {
      devLog.error('Error creating project:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Renderizar o children como trigger */}
      {children && (
        <div onClick={() => setOpen(true)} className="cursor-pointer">
          {children}
        </div>
      )}
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Novo Projeto</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 mt-2">
            <div className="grid gap-2">
              <Label htmlFor="projectNumber">Número do Projeto</Label>
              <Input
                id="projectNumber"
                placeholder="Número do Projeto (gerado automaticamente)"
                disabled={true}
                {...register("projectNumber")}
                value={projectNumber || "Gerando..."}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="empresaIntegradora">Empresa Integradora</Label>
              <Input
                id="empresaIntegradora"
                placeholder="Nome da Empresa Integradora"
                {...register("empresaIntegradora", { required: true })}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="nomeClienteFinal">Nome do Cliente Final</Label>
              <Input
                id="nomeClienteFinal"
                placeholder="Nome do Cliente Final"
                {...register("nomeClienteFinal", { required: true })}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="distribuidora">Distribuidora</Label>
              <Controller
                name="distribuidora"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <SelectTrigger id="distribuidora">
                      <SelectValue placeholder="Selecione a distribuidora" />
                    </SelectTrigger>
                    <SelectContent>
                      {DISTRIBUIDORAS.map((dist) => (
                        <SelectItem key={dist} value={dist}>{dist}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            
            {/* Campo para distribuidora personalizada */}
            {showOutroInput && (
              <div className="grid gap-2">
                <Label htmlFor="distribuidoraOutro">Nome da Distribuidora</Label>
                <Input
                  id="distribuidoraOutro"
                  placeholder="Digite o nome da distribuidora"
                  {...register("distribuidoraOutro", { 
                    required: distribuidoraSelecionada === "Outro" 
                  })}
                />
              </div>
            )}
            
            <div className="grid gap-2">
              <Label htmlFor="power">Potência (kWp)</Label>
              <Input
                id="power"
                type="number"
                min="0"
                step="0.01"
                placeholder="Ex: 5.76"
                {...register("power", { 
                  required: true,
                  valueAsNumber: true,
                  min: 0 
                })}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="dataEntrega">Data de Entrega Prevista</Label>
              <Input
                id="dataEntrega"
                type="date"
                {...register("dataEntrega", { required: true })}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="priority">Prioridade</Label>
              <Controller
                name="priority"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <SelectTrigger id="priority">
                      <SelectValue placeholder="Selecione a prioridade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Alta">Alta</SelectItem>
                      <SelectItem value="Média">Média</SelectItem>
                      <SelectItem value="Baixa">Baixa</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Criando..." : "Criar Projeto"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ProjectForm;
