'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Loader2, FileText, User, CreditCard, MapPin, Map, AlertCircle, CheckCircle, Factory } from 'lucide-react';
import { Project } from '@/types/project';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  validarCPForCNPJ,
  formatarCPForCNPJ,
  ESTADOS_BRASIL,
  removerFormatacao
} from '@/lib/utils/validators';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { updateProjectClientData } from '@/lib/actions/project-actions';

interface GenerateProcuracaoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
  userId: string; // ✅ ID do usuário autenticado
  onSuccess: (savedFields: {
    nome_cliente_final: string;
    cpf_cnpj_cliente_final: string;
    client_city: string;
    client_state: string;
    distribuidora: string;
  }) => void;
}

interface ProcuracaoFormData {
  nome_cliente_final: string;
  cpf_cnpj_cliente_final: string;
  client_city: string;
  client_state: string;
  distribuidora: string;
}

// Lista de distribuidoras de energia
const DISTRIBUIDORAS = [
  "Enel",
  "Copel",
  "Cemig",
  "CPFL",
  "Neoenergia Cosern",
  "Light",
  "EDP",
  "Celesc",
  "Energisa",
  "Equatorial",
  "RGE",
  "Amazonas Energia",
  "Outro"
];

export function GenerateProcuracaoModal({
  open,
  onOpenChange,
  project,
  userId,
  onSuccess
}: GenerateProcuracaoModalProps) {
  const [loading, setLoading] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  // ✅ CSS personalizado para scrollbar laranja visível
  const scrollbarStyles = `
    .custom-orange-scrollbar [data-radix-select-viewport] {
      scrollbar-width: thin;
      scrollbar-color: #f97316 #f3f4f6;
    }

    .custom-orange-scrollbar [data-radix-select-viewport]::-webkit-scrollbar {
      width: 8px;
    }

    .custom-orange-scrollbar [data-radix-select-viewport]::-webkit-scrollbar-track {
      background: #f3f4f6;
      border-radius: 10px;
    }

    .custom-orange-scrollbar [data-radix-select-viewport]::-webkit-scrollbar-thumb {
      background: #f97316;
      border-radius: 10px;
    }

    .custom-orange-scrollbar [data-radix-select-viewport]::-webkit-scrollbar-thumb:hover {
      background: #ea580c;
    }
  `;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
    getValues
  } = useForm<ProcuracaoFormData>();

  const watchedCpfCnpj = watch('cpf_cnpj_cliente_final');
  const watchedState = watch('client_state');
  const watchedDistribuidora = watch('distribuidora');

  // Pré-preencher formulário e identificar campos faltantes
  useEffect(() => {
    if (open && project) {
      // Pré-preencher campos existentes
      setValue('nome_cliente_final', project.nome_cliente_final || project.nomeClienteFinal || '');
      setValue('cpf_cnpj_cliente_final',
        project.cpf_cnpj_cliente_final
          ? formatarCPForCNPJ(project.cpf_cnpj_cliente_final)
          : ''
      );
      setValue('client_city', project.client_city || '');
      setValue('client_state', project.client_state || '');
      setValue('distribuidora', project.distribuidora || '');

      // Identificar campos faltantes
      const missing: string[] = [];
      if (!project.nome_cliente_final && !project.nomeClienteFinal) {
        missing.push('Nome do cliente');
      }
      if (!project.cpf_cnpj_cliente_final) {
        missing.push('CPF/CNPJ');
      }
      if (!project.client_city) {
        missing.push('Cidade');
      }
      if (!project.client_state) {
        missing.push('Estado');
      }
      if (!project.distribuidora) {
        missing.push('Distribuidora');
      }

      setMissingFields(missing);
    }
  }, [open, project, setValue]);

  // Formatar CPF/CNPJ enquanto digita
  useEffect(() => {
    if (watchedCpfCnpj) {
      const formatted = formatarCPForCNPJ(watchedCpfCnpj);
      if (formatted !== watchedCpfCnpj) {
        setValue('cpf_cnpj_cliente_final', formatted);
      }
    }
  }, [watchedCpfCnpj, setValue]);

  const handleGerarProcuracao = async () => {
    if (!project || missingFields.length > 0) return;

    try {
      const formData = getValues();

      const payload = {
        nome_cliente_final: formData.nome_cliente_final,
        cpf_cnpj_cliente_final: removerFormatacao(formData.cpf_cnpj_cliente_final),
        client_city: formData.client_city,
        client_state: formData.client_state,
        distribuidora: formData.distribuidora
      };

      const response = await fetch('/api/procuracao/gerar-html', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const htmlContent = await response.text();
        const novaAba = window.open('', '_blank');

        if (novaAba) {
          novaAba.document.write(htmlContent);
          novaAba.document.close();
        } else {
          toast({
            title: 'Aviso',
            description: 'Não foi possível abrir a procuração. Verifique se o bloqueador de pop-ups está desativado.',
            variant: 'destructive'
          });
        }
      } else {
        const errorData = await response.json();
        toast({
          title: 'Erro ao gerar procuração',
          description: errorData.error || 'Erro desconhecido',
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao gerar procuração',
        description: error.message || 'Ocorreu um erro ao gerar a procuração.',
        variant: 'destructive'
      });
    }
  };

  const onSubmit = async (data: ProcuracaoFormData) => {
    if (!project) return;

    setLoading(true);

    try {
      // Validar CPF/CNPJ
      if (!validarCPForCNPJ(data.cpf_cnpj_cliente_final)) {
        toast({
          title: 'CPF/CNPJ inválido',
          description: 'Por favor, verifique os dígitos do CPF/CNPJ.',
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }

      // Preparar dados para envio (remover formatação do CPF/CNPJ)
      const payload = {
        nome_cliente_final: data.nome_cliente_final.toUpperCase().trim(),
        cpf_cnpj_cliente_final: removerFormatacao(data.cpf_cnpj_cliente_final),
        client_city: data.client_city.toUpperCase().trim(),
        client_state: data.client_state.toUpperCase().trim(),
        distribuidora: data.distribuidora.trim()
      };

      // ✅ CORREÇÃO: Usar Server Action ao invés de fetch
      const result = await updateProjectClientData(project.id, payload, userId);

      if (!result.success) {
        throw new Error(result.error || 'Erro ao salvar dados do cliente');
      }

      // Atualizar lista de campos faltantes
      setMissingFields([]);

      // Notificar atualização sem fechar o modal (o banner acima já reflete o sucesso)
      onSuccess(payload);

    } catch (error: any) {
      toast({
        title: 'Erro ao salvar dados',
        description: error.message || 'Ocorreu um erro ao salvar os dados do cliente.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onOpenChange(false);
      reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <style dangerouslySetInnerHTML={{ __html: scrollbarStyles }} />
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Gerar Procuração
          </DialogTitle>
          <DialogDescription>
            Preencha os dados necessários para gerar a procuração do projeto.
            {missingFields.length > 0 && (
              <span className="text-amber-600 font-medium">
                {' '}Alguns campos precisam ser preenchidos.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Mensagem Informativa */}
        {missingFields.length > 0 ? (
          <Alert className="border-blue-500 bg-blue-50">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              <strong>Como gerar a procuração:</strong>
              <ol className="mt-2 ml-4 list-decimal space-y-1 text-sm">
                <li>Preencha todos os campos obrigatórios abaixo</li>
                <li>Clique em <strong>"Salvar Dados"</strong> para salvar as informações</li>
                <li>Após salvar, o botão <strong>"Gerar Procuração"</strong> será habilitado</li>
              </ol>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-green-500 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-900">
              <strong>Pronto para gerar!</strong> Todos os dados necessários estão preenchidos.
              Clique no botão <strong>"Gerar Procuração"</strong> ao final do formulário para abrir o documento.
            </AlertDescription>
          </Alert>
        )}

        {missingFields.length > 0 && (
          <Alert className="border-amber-500 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-900">
              <strong>Campos faltantes:</strong> {missingFields.join(', ')}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Nome do Cliente */}
          <div className="space-y-2">
            <Label htmlFor="nome_cliente_final" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Nome do Cliente Final *
            </Label>
            <Input
              id="nome_cliente_final"
              placeholder="Ex: JOÃO DA SILVA"
              {...register('nome_cliente_final', {
                required: 'Nome do cliente é obrigatório',
                minLength: {
                  value: 3,
                  message: 'Nome deve ter no mínimo 3 caracteres'
                }
              })}
              className={errors.nome_cliente_final ? 'border-red-500' : ''}
              disabled={loading}
            />
            {errors.nome_cliente_final && (
              <p className="text-sm text-red-500">{errors.nome_cliente_final.message}</p>
            )}
          </div>

          {/* CPF/CNPJ */}
          <div className="space-y-2">
            <Label htmlFor="cpf_cnpj_cliente_final" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              CPF ou CNPJ *
            </Label>
            <Input
              id="cpf_cnpj_cliente_final"
              placeholder="Ex: 000.000.000-00 ou 00.000.000/0000-00"
              {...register('cpf_cnpj_cliente_final', {
                required: 'CPF ou CNPJ é obrigatório',
                validate: (value) => {
                  if (!validarCPForCNPJ(value)) {
                    return 'CPF/CNPJ inválido. Verifique os dígitos.';
                  }
                  return true;
                }
              })}
              className={errors.cpf_cnpj_cliente_final ? 'border-red-500' : ''}
              disabled={loading}
              maxLength={18}
            />
            {errors.cpf_cnpj_cliente_final && (
              <p className="text-sm text-red-500">{errors.cpf_cnpj_cliente_final.message}</p>
            )}
            <p className="text-xs text-gray-500">
              A formatação será aplicada automaticamente
            </p>
          </div>

          {/* Distribuidora */}
          <div className="space-y-2">
            <Label htmlFor="distribuidora" className="flex items-center gap-2">
              <Factory className="h-4 w-4" />
              Distribuidora *
            </Label>
            <Select
              value={watchedDistribuidora}
              onValueChange={(value) => setValue('distribuidora', value)}
              disabled={loading}
            >
              <SelectTrigger className={errors.distribuidora ? 'border-red-500' : ''}>
                <SelectValue placeholder="Selecione a distribuidora" />
              </SelectTrigger>
              <SelectContent className="custom-orange-scrollbar max-h-[200px]">
                {DISTRIBUIDORAS.map((dist) => (
                  <SelectItem key={dist} value={dist}>
                    {dist}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input
              type="hidden"
              {...register('distribuidora', {
                required: 'Distribuidora é obrigatória'
              })}
            />
            {errors.distribuidora && (
              <p className="text-sm text-red-500">{errors.distribuidora.message}</p>
            )}
          </div>

          {/* Cidade */}
          <div className="space-y-2">
            <Label htmlFor="client_city" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Cidade *
            </Label>
            <Input
              id="client_city"
              placeholder="Ex: SÃO PAULO"
              {...register('client_city', {
                required: 'Cidade é obrigatória',
                minLength: {
                  value: 2,
                  message: 'Cidade deve ter no mínimo 2 caracteres'
                }
              })}
              className={errors.client_city ? 'border-red-500' : ''}
              disabled={loading}
            />
            {errors.client_city && (
              <p className="text-sm text-red-500">{errors.client_city.message}</p>
            )}
          </div>

          {/* Estado */}
          <div className="space-y-2">
            <Label htmlFor="client_state" className="flex items-center gap-2">
              <Map className="h-4 w-4" />
              Estado *
            </Label>
            <Select
              value={watchedState}
              onValueChange={(value) => setValue('client_state', value)}
              disabled={loading}
            >
              <SelectTrigger className={errors.client_state ? 'border-red-500' : ''}>
                <SelectValue placeholder="Selecione o estado" />
              </SelectTrigger>
              <SelectContent className="custom-orange-scrollbar max-h-[200px]">
                {ESTADOS_BRASIL.map((estado) => (
                  <SelectItem key={estado} value={estado}>
                    {estado}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input
              type="hidden"
              {...register('client_state', {
                required: 'Estado é obrigatório'
              })}
            />
            {errors.client_state && (
              <p className="text-sm text-red-500">{errors.client_state.message}</p>
            )}
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Salvar Dados
                </>
              )}
            </Button>
            <Button
              type="button"
              onClick={handleGerarProcuracao}
              disabled={missingFields.length > 0 || loading}
              className="bg-green-600 hover:bg-green-700"
            >
              <FileText className="mr-2 h-4 w-4" />
              Gerar Procuração
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
