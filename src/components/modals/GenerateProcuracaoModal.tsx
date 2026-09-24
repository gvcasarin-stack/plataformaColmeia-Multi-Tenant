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
  validarCPF,
  formatarCPForCNPJ,
  formatarCPF,
  ESTADOS_BRASIL,
  removerFormatacao
} from '@/lib/utils/validators';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { updateProjectClientData } from '@/lib/actions/project-actions';
import { DISTRIBUIDORAS } from '@/lib/constants/distribuidoras';
import { SearchableSelect } from '@/components/ui/searchable-select';

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
    procuracao_responsavel_legal_nome?: string;
    procuracao_responsavel_legal_cpf?: string;
  }) => void;
}

interface ProcuracaoFormData {
  nome_cliente_final: string;
  cpf_cnpj_cliente_final: string;
  client_city: string;
  client_state: string;
  distribuidora: string;
  procuracao_responsavel_legal_nome: string;
  procuracao_responsavel_legal_cpf: string;
}

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
    watch
  } = useForm<ProcuracaoFormData>();

  const watchedCpfCnpj = watch('cpf_cnpj_cliente_final');
  const watchedState = watch('client_state');
  const watchedDistribuidora = watch('distribuidora');
  const watchedResponsavelLegalCpf = watch('procuracao_responsavel_legal_cpf');

  // ✅ Detecta CNPJ (pessoa jurídica) pelo tamanho do documento — nesse caso
  // a procuração precisa de um Responsável Legal pela UC (pessoa física)
  // diferente da empresa que aparece no cabeçalho do documento.
  const isCnpj = removerFormatacao(watchedCpfCnpj || '').length === 14;

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
      setValue('procuracao_responsavel_legal_nome', project.procuracao_responsavel_legal_nome || '');
      setValue('procuracao_responsavel_legal_cpf',
        project.procuracao_responsavel_legal_cpf
          ? formatarCPF(project.procuracao_responsavel_legal_cpf)
          : ''
      );

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
      const projetoEhCnpj = removerFormatacao(project.cpf_cnpj_cliente_final || '').length === 14;
      if (projetoEhCnpj) {
        if (!project.procuracao_responsavel_legal_nome) {
          missing.push('Nome do Responsável Legal pela Unidade Consumidora');
        }
        if (!project.procuracao_responsavel_legal_cpf) {
          missing.push('CPF do Responsável Legal pela Unidade Consumidora');
        }
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

  // Formatar CPF do Responsável Legal pela UC enquanto digita
  useEffect(() => {
    if (watchedResponsavelLegalCpf) {
      const formatted = formatarCPF(watchedResponsavelLegalCpf);
      if (formatted !== watchedResponsavelLegalCpf) {
        setValue('procuracao_responsavel_legal_cpf', formatted);
      }
    }
  }, [watchedResponsavelLegalCpf, setValue]);

  const handleGerarProcuracao = async () => {
    if (!project || missingFields.length > 0) return;

    try {
      // ✅ A rota busca os dados diretamente do projeto salvo no banco (escopado
      // ao tenant e validando permissão do usuário) — por isso só precisamos
      // informar qual projeto e quem está pedindo, não os valores do formulário.
      const payload = {
        project_id: project.id,
        userId
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

      const isCnpjSubmit = removerFormatacao(data.cpf_cnpj_cliente_final).length === 14;

      // Validar Responsável Legal pela UC (obrigatório apenas para CNPJ)
      if (isCnpjSubmit) {
        if (!data.procuracao_responsavel_legal_nome || data.procuracao_responsavel_legal_nome.trim().length < 3) {
          toast({
            title: 'Responsável Legal pela UC obrigatório',
            description: 'Informe o nome do Responsável Legal pela Unidade Consumidora.',
            variant: 'destructive'
          });
          setLoading(false);
          return;
        }
        if (!validarCPF(data.procuracao_responsavel_legal_cpf)) {
          toast({
            title: 'CPF do Responsável Legal pela UC inválido',
            description: 'Por favor, verifique os dígitos do CPF do Responsável Legal pela Unidade Consumidora.',
            variant: 'destructive'
          });
          setLoading(false);
          return;
        }
      }

      // Preparar dados para envio (remover formatação do CPF/CNPJ)
      const payload = {
        nome_cliente_final: data.nome_cliente_final.toUpperCase().trim(),
        cpf_cnpj_cliente_final: removerFormatacao(data.cpf_cnpj_cliente_final),
        client_city: data.client_city.toUpperCase().trim(),
        client_state: data.client_state.toUpperCase().trim(),
        distribuidora: data.distribuidora.trim(),
        ...(isCnpjSubmit ? {
          procuracao_responsavel_legal_nome: data.procuracao_responsavel_legal_nome.toUpperCase().trim(),
          procuracao_responsavel_legal_cpf: removerFormatacao(data.procuracao_responsavel_legal_cpf)
        } : {})
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
          {/* Nome do Cliente (Razão Social quando CNPJ) */}
          <div className="space-y-2">
            <Label htmlFor="nome_cliente_final" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {isCnpj ? 'Razão Social / Nome da Empresa *' : 'Nome do Cliente Final *'}
            </Label>
            <Input
              id="nome_cliente_final"
              placeholder={isCnpj ? 'Ex: GTR SOLUÇÕES LTDA' : 'Ex: JOÃO DA SILVA'}
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

          {/* Responsável Legal pela Unidade Consumidora — só para CNPJ, pois
              a assinatura da procuração precisa do nome/CPF de uma pessoa
              física (diferente da empresa que aparece no cabeçalho). */}
          {isCnpj && (
            <div className="space-y-4 rounded-lg border border-blue-200 bg-blue-50/50 p-4">
              <p className="text-sm font-medium text-blue-900">
                Como o CPF/CNPJ informado é um CNPJ, informe quem assina a procuração em nome da empresa:
              </p>

              <div className="space-y-2">
                <Label htmlFor="procuracao_responsavel_legal_nome" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Nome do Responsável Legal pela Unidade Consumidora *
                </Label>
                <Input
                  id="procuracao_responsavel_legal_nome"
                  placeholder="Ex: JOÃO DA SILVA"
                  {...register('procuracao_responsavel_legal_nome', {
                    required: isCnpj ? 'Nome do Responsável Legal pela Unidade Consumidora é obrigatório' : false,
                    minLength: {
                      value: 3,
                      message: 'Nome deve ter no mínimo 3 caracteres'
                    }
                  })}
                  className={errors.procuracao_responsavel_legal_nome ? 'border-red-500' : ''}
                  disabled={loading}
                />
                {errors.procuracao_responsavel_legal_nome && (
                  <p className="text-sm text-red-500">{errors.procuracao_responsavel_legal_nome.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="procuracao_responsavel_legal_cpf" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  CPF do Responsável Legal pela Unidade Consumidora *
                </Label>
                <Input
                  id="procuracao_responsavel_legal_cpf"
                  placeholder="Ex: 000.000.000-00"
                  {...register('procuracao_responsavel_legal_cpf', {
                    required: isCnpj ? 'CPF do Responsável Legal pela Unidade Consumidora é obrigatório' : false,
                    validate: (value) => {
                      if (!isCnpj) return true;
                      if (!validarCPF(value)) {
                        return 'CPF inválido. Verifique os dígitos.';
                      }
                      return true;
                    }
                  })}
                  className={errors.procuracao_responsavel_legal_cpf ? 'border-red-500' : ''}
                  disabled={loading}
                  maxLength={14}
                />
                {errors.procuracao_responsavel_legal_cpf && (
                  <p className="text-sm text-red-500">{errors.procuracao_responsavel_legal_cpf.message}</p>
                )}
              </div>
            </div>
          )}

          {/* Distribuidora */}
          <div className="space-y-2">
            <Label htmlFor="distribuidora" className="flex items-center gap-2">
              <Factory className="h-4 w-4" />
              Distribuidora *
            </Label>
            <SearchableSelect
              value={watchedDistribuidora}
              onChange={(value) => setValue('distribuidora', value)}
              options={DISTRIBUIDORAS}
              placeholder="Selecione a distribuidora"
              searchPlaceholder="Buscar distribuidora..."
              disabled={loading}
              className={errors.distribuidora ? 'border-red-500' : ''}
            />
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
