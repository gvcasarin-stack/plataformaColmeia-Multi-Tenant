/**
 * Component de bloqueio persistente quando trial expira
 * Usado para bloquear funcionalidades críticas do admin
 */

'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertTriangle,
  Lock,
  Calendar,
  Users,
  X
} from 'lucide-react';
import { openStripeCheckoutInNewTab } from '@/lib/stripe/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { devLog } from '@/lib/utils/productionLogger';

interface TrialExpiredBlockerProps {
  message?: string;
  blockedFeature?: string;
  showProjectStats?: boolean;
  className?: string;
  onClose?: () => void;
}

interface Plan {
  id: string;
  name: string;
  plan_code: string;
  price: string;
  max_projects: number;
  max_users: number;
  max_clients: number;
  max_storage_gb: number;
  features: string[];
}

export function TrialExpiredBlocker({
  message = "Funcionalidade bloqueada",
  blockedFeature = "esta funcionalidade",
  showProjectStats = false,
  className = "",
  onClose
}: TrialExpiredBlockerProps) {
  const { user } = useAuth();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setIsLoadingPlans(true);
      const response = await fetch('/api/plans');

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          devLog.log('[TrialExpiredBlocker] Planos carregados:', {
            count: result.data.length,
            plans: result.data
          });
          setPlans(result.data);
        } else {
          devLog.error('[TrialExpiredBlocker] Resposta sem dados:', result);
        }
      } else {
        devLog.error('[TrialExpiredBlocker] Erro HTTP:', response.status);
      }
    } catch (error) {
      devLog.error('[TrialExpiredBlocker] Erro ao buscar planos:', error);
    } finally {
      setIsLoadingPlans(false);
    }
  };

  const handleUpgrade = async (planType: 'basico' | 'profissional' = 'basico') => {
    if (!user?.id) return;

    try {
      setIsUpgrading(true);
      
      const { createTenantHeaders } = await import('@/lib/utils/tenant-helper');
      const headers = await createTenantHeaders(user.id);
      
      // Buscar dados da organização
      const orgResponse = await fetch('/api/tenant/organization', {
        method: 'GET',
        headers,
      });

      if (!orgResponse.ok) {
        throw new Error('Erro ao carregar dados da organização');
      }

      const orgResult = await orgResponse.json();
      if (!orgResult.success) {
        throw new Error('Dados da organização não encontrados');
      }

      const organization = orgResult.data;

      // Criar sessão de checkout
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planType,
          organizationId: organization.id,
          tenantId: organization.tenant_id || organization.id
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar sessão de pagamento');
      }

      if (result.success && result.url) {
        devLog.log('[TrialExpiredBlocker] Redirecionando para checkout:', result.url);
        openStripeCheckoutInNewTab(result.url);
      } else {
        throw new Error('URL de checkout não foi retornada');
      }

    } catch (error: any) {
      devLog.error('[TrialExpiredBlocker] Erro no upgrade:', error);
      alert(`Erro ao processar upgrade: ${error.message}`);
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 ${className}`}>
      <div className="w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
        <Card className="w-full bg-white dark:bg-gray-800 shadow-2xl border-red-200 relative">
          {/* Botão de fechar */}
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10 hover:bg-red-100 text-red-600"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          )}

          <div className="max-h-[85vh] sm:max-h-[80vh] overflow-y-auto">
            <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-red-100 rounded-full">
              <Lock className="h-8 w-8 text-red-600" />
            </div>
          </div>
          
          <CardTitle className="text-2xl font-bold text-red-700">
            🚨 Trial Expirado - Funcionalidade Bloqueada
          </CardTitle>
          
          <Badge variant="destructive" className="w-fit mx-auto mt-2">
            <AlertTriangle className="h-4 w-4 mr-1" />
            Pagamento Necessário
          </Badge>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Mensagem principal */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Acesso Bloqueado</AlertTitle>
            <AlertDescription className="text-base">
              Seu período de teste expirou e não é possível acessar <strong>{blockedFeature}</strong>. 
              Faça upgrade para reativar todas as funcionalidades.
            </AlertDescription>
          </Alert>

          {/* Impacto nos clientes */}
          <Alert className="border-orange-200 bg-orange-50">
            <Users className="h-4 w-4 text-orange-600" />
            <AlertTitle className="text-orange-800">Impacto nos Seus Clientes</AlertTitle>
            <AlertDescription className="text-orange-700">
              <strong>Seus clientes também estão sendo afetados:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Não conseguem criar novos projetos</li>
                <li>Não podem fazer upload de documentos</li>
                <li>Acesso limitado aos projetos existentes</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Planos disponíveis */}
          {isLoadingPlans ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Carregando planos...</p>
            </div>
          ) : plans.length === 0 ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Erro ao carregar planos</AlertTitle>
              <AlertDescription>
                Não foi possível carregar os planos disponíveis. Por favor, entre em contato com o suporte.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plans.map((plan, index) => {
                // Debug: log do plano
                devLog.log('[TrialExpiredBlocker] Renderizando plano:', {
                  name: plan.name,
                  plan_code: plan.plan_code,
                  price: plan.price,
                  fullPlan: plan
                });

                const isRecommended = plan.plan_code === 'profissional';
                const isBasic = plan.plan_code === 'basico';

                // Validação de segurança para dados do banco
                const priceMonthly = parseFloat(plan.price || '0');
                const maxProjects = plan.max_projects || 0;
                const maxUsers = plan.max_users || 0;
                const maxClients = plan.max_clients || 0;
                const maxStorageGb = plan.max_storage_gb || 0;

                return (
                  <div
                    key={plan.id}
                    className={`border rounded-lg p-4 relative ${
                      isBasic ? 'bg-emerald-50 border-emerald-200' : 'bg-blue-50 border-blue-200'
                    }`}
                  >
                    {isRecommended && (
                      <Badge className="absolute -top-2 -right-2 bg-blue-600 text-white">
                        Recomendado
                      </Badge>
                    )}
                    <h3 className={`font-bold mb-2 ${
                      isBasic ? 'text-emerald-900' : 'text-blue-900'
                    }`}>
                      {plan.name || 'Plano'}
                    </h3>
                    <p className="text-2xl font-bold text-green-600 mb-3">
                      R$ {priceMonthly.toLocaleString('pt-BR')}/mês
                    </p>
                    <ul className={`text-sm space-y-1 mb-4 ${
                      isBasic ? 'text-emerald-700' : 'text-blue-700'
                    }`}>
                      <li>✓ {maxProjects} projetos</li>
                      <li>✓ {maxUsers} usuários</li>
                      <li>✓ {maxClients} clientes</li>
                      <li>✓ {maxStorageGb}GB storage</li>
                    </ul>
                    <Button
                      className={`w-full ${
                        isBasic
                          ? 'bg-emerald-600 hover:bg-emerald-700'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                      onClick={() => handleUpgrade(plan.plan_code as 'basico' | 'profissional')}
                      disabled={isUpgrading}
                    >
                      {isUpgrading ? 'Processando...' : `Escolher ${plan.name || 'Plano'}`}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Mensagem de urgência */}
          <div className="text-center text-sm text-gray-600 dark:text-gray-300">
            <Calendar className="h-4 w-4 inline mr-1" />
            Reative sua conta agora e volte a trabalhar imediatamente
          </div>
        </CardContent>
          </div>
        </Card>
      </div>
    </div>
  );
}
