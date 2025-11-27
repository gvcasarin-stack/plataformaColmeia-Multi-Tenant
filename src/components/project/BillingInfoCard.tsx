'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Info, Package, Calendar, Zap } from 'lucide-react';

interface BillingWarning {
  type: string;
  severity?: 'low' | 'medium' | 'high';
  message: string;
}

interface BillingPacote {
  id: string;
  nome: string;
  projetos_usados: number;
  projetos_inclusos: number;
  potencia_maxima_kwp: number | null;
  data_expiracao: string;
  dias_restantes: number;
  status: string;
  payment_status: string;
}

interface BillingAssinatura {
  id: string;
  nome: string;
  projetos_usados_mes: number;
  projetos_mensais: number;
  potencia_maxima_kwp: number | null;
  proximo_reset: string | null;
  dias_para_renovacao: number;
  status: string;
  payment_status: string;
}

interface BillingStatus {
  billing_mode: 'avulso' | 'pacote' | 'assinatura';
  can_create: boolean;
  warnings: BillingWarning[];
  pacote?: BillingPacote;
  assinatura?: BillingAssinatura;
}

interface BillingInfoCardProps {
  billingStatus: BillingStatus | null;
  isLoading: boolean;
  isAdmin?: boolean; // true se for admin criando para cliente
  potenciaDigitada?: number | null; // potência digitada pelo usuário
}

export function BillingInfoCard({
  billingStatus,
  isLoading,
  isAdmin = false,
  potenciaDigitada = null
}: BillingInfoCardProps) {
  // Não mostrar nada se for avulso
  if (!isLoading && billingStatus?.billing_mode === 'avulso') {
    return null;
  }

  // Não mostrar nada se ainda estiver carregando
  if (isLoading) {
    return (
      <Card className="border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Verificando informações de faturamento...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Não mostrar se não tem billing status
  if (!billingStatus) {
    return null;
  }

  const { billing_mode, warnings, pacote, assinatura } = billingStatus;

  // Calcular severity geral
  const hasHighWarnings = warnings.some(w => w.severity === 'high');
  const hasMediumWarnings = warnings.some(w => w.severity === 'medium');

  // Validar potência digitada vs limite
  const potenciaMaxima = pacote?.potencia_maxima_kwp || assinatura?.potencia_maxima_kwp;
  const potenciaExcedeLimite = potenciaDigitada && potenciaMaxima && potenciaDigitada > potenciaMaxima;

  // Definir cor do card baseado em warnings
  const cardColor = hasHighWarnings || potenciaExcedeLimite
    ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
    : hasMediumWarnings
    ? 'border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20'
    : 'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-900/20';

  // Definir ícone
  const Icon = hasHighWarnings || potenciaExcedeLimite
    ? AlertCircle
    : hasMediumWarnings
    ? Info
    : CheckCircle;

  const iconColor = hasHighWarnings || potenciaExcedeLimite
    ? 'text-red-600 dark:text-red-400'
    : hasMediumWarnings
    ? 'text-yellow-600 dark:text-yellow-400'
    : 'text-green-600 dark:text-green-400';

  // Texto inicial (diferente para admin vs cliente)
  const prefixoTexto = isAdmin ? 'Este cliente possui' : 'Você possui';

  return (
    <Card className={`border-2 ${cardColor} transition-all duration-200`}>
      <CardContent className="p-4 space-y-3">
        {/* Cabeçalho com ícone e título */}
        <div className="flex items-start gap-3">
          <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${iconColor}`} />
          <div className="flex-1 space-y-2">
            {/* PACOTE */}
            {billing_mode === 'pacote' && pacote && (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <Package className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {prefixoTexto} {pacote.nome}
                  </span>
                  <Badge variant="outline" className="bg-white dark:bg-gray-800">
                    {pacote.projetos_usados} de {pacote.projetos_inclusos} projetos
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-700 dark:text-gray-300">
                  {pacote.potencia_maxima_kwp && (
                    <div className="flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-yellow-500" />
                      <span>Potência máxima: <strong>{pacote.potencia_maxima_kwp} kWp</strong></span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-blue-500" />
                    <span>
                      Válido até <strong>{new Date(pacote.data_expiracao).toLocaleDateString('pt-BR')}</strong>
                      {pacote.dias_restantes > 0 && ` (${pacote.dias_restantes} dias)`}
                    </span>
                  </div>
                </div>

                {/* Badge de pagamento */}
                {pacote.payment_status && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Status:</span>
                    <Badge className={
                      pacote.payment_status === 'pago'
                        ? 'bg-green-100 text-green-700 border-green-200'
                        : pacote.payment_status === 'parcela1'
                        ? 'bg-blue-100 text-blue-700 border-blue-200'
                        : 'bg-amber-100 text-amber-700 border-amber-200'
                    }>
                      {pacote.payment_status === 'pago' ? 'Pago' : pacote.payment_status === 'parcela1' ? '1ª Parcela' : 'Pendente'}
                    </Badge>
                  </div>
                )}
              </>
            )}

            {/* ASSINATURA */}
            {billing_mode === 'assinatura' && assinatura && (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {prefixoTexto} {assinatura.nome}
                  </span>
                  <Badge variant="outline" className="bg-white dark:bg-gray-800">
                    {assinatura.projetos_usados_mes} de {assinatura.projetos_mensais} projetos este mês
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-700 dark:text-gray-300">
                  {assinatura.potencia_maxima_kwp && (
                    <div className="flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-yellow-500" />
                      <span>Potência máxima: <strong>{assinatura.potencia_maxima_kwp} kWp</strong></span>
                    </div>
                  )}
                  {assinatura.proximo_reset && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-purple-500" />
                      <span>
                        Renova em <strong>{assinatura.dias_para_renovacao} {assinatura.dias_para_renovacao === 1 ? 'dia' : 'dias'}</strong>
                      </span>
                    </div>
                  )}
                </div>

                {/* Badge de pagamento */}
                {assinatura.payment_status && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Status:</span>
                    <Badge className={
                      assinatura.payment_status === 'pago'
                        ? 'bg-green-100 text-green-700 border-green-200'
                        : 'bg-amber-100 text-amber-700 border-amber-200'
                    }>
                      {assinatura.payment_status === 'pago' ? 'Pago' : 'Pendente'}
                    </Badge>
                  </div>
                )}
              </>
            )}

            {/* WARNINGS */}
            {warnings.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {warnings.map((warning, index) => (
                  <div
                    key={index}
                    className={`text-sm font-medium ${
                      warning.severity === 'high'
                        ? 'text-red-700 dark:text-red-300'
                        : warning.severity === 'medium'
                        ? 'text-yellow-700 dark:text-yellow-300'
                        : 'text-blue-700 dark:text-blue-300'
                    }`}
                  >
                    {warning.severity === 'high' && '⚠️ '}
                    {warning.severity === 'medium' && 'ℹ️ '}
                    {warning.message}
                  </div>
                ))}
              </div>
            )}

            {/* VALIDAÇÃO DE POTÊNCIA */}
            {potenciaExcedeLimite && (
              <div className="mt-3 text-sm font-medium text-red-700 dark:text-red-300">
                ⚠️ Potência informada ({potenciaDigitada} kWp) excede o limite do {billing_mode === 'pacote' ? 'pacote' : 'plano'} ({potenciaMaxima} kWp).
                A diferença será cobrada como avulso.
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
