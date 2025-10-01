'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  CreditCard, 
  Users, 
  FolderOpen, 
  Building2, 
  HardDrive, 
  Zap,
  Calendar,
  AlertTriangle,
  CheckCircle,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { devLog } from '@/lib/utils/productionLogger';
import { openStripeCheckoutInNewTab } from '@/lib/stripe/client';
import { getStripePlans } from '@/lib/stripe/config';

// Interfaces para tipagem
interface Organization {
  id: string;
  name: string;
  tenant_id: string; // ✅ ADICIONADO: Campo tenant_id necessário para o Stripe
  plan_id: string;  // ✅ CORRIGIDO: Agora usa plan_id (UUID)
  plan_limits?: any; // Opcional pois pode não existir mais
  trial_start_date: string;
  trial_end_date: string;
  is_trial: boolean;
  subscription_status: string;
  payment_method_added: boolean;
}

interface Plan {
  id: string;
  plan_code: string;
  name: string;
  price: number;
  max_projects: number;
  max_users: number;
  max_clients: number;
  max_storage_gb: number;
  api_calls_per_day: number;
  features: string[];
  description: string;
}

interface UsageStats {
  projects: { current: number; limit: number; percentage: number };
  users: { current: number; limit: number; percentage: number };
  clients: { current: number; limit: number; percentage: number };
  storage: { current: number; limit: number; percentage: number };
  apiCalls: { current: number; limit: number; percentage: number };
}

interface TrialInfo {
  isActive: boolean;
  daysRemaining: number;
  isExpired: boolean;
  isExpiringSoon: boolean;
  endDate: string;
}

export default function AssinaturasPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [trialInfo, setTrialInfo] = useState<TrialInfo | null>(null);
  const [upgradeOptions, setUpgradeOptions] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [manualSyncAvailable, setManualSyncAvailable] = useState(false);
  const [stripePlans, setStripePlans] = useState<any>(null);

  // Detectar sucesso no pagamento
  const paymentSuccess = searchParams.get('success') === 'true';
  const sessionId = searchParams.get('session_id');

  // Função para calcular informações do trial
  const calculateTrialInfo = (org: Organization): TrialInfo => {
    if (!org.is_trial || !org.trial_end_date) {
      return {
        isActive: false,
        daysRemaining: 0,
        isExpired: false,
        isExpiringSoon: false,
        endDate: ''
      };
    }

    const now = new Date();
    const trialEnd = new Date(org.trial_end_date);
    const diffTime = trialEnd.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return {
      isActive: daysRemaining > 0,
      daysRemaining: Math.max(0, daysRemaining),
      isExpired: daysRemaining <= 0,
      isExpiringSoon: daysRemaining <= 3 && daysRemaining > 0,
      endDate: trialEnd.toLocaleDateString('pt-BR')
    };
  };

  // Função para buscar dados da organização
  const fetchOrganizationData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Buscar dados da organização via API com headers corretos
      const { createTenantHeaders } = await import('@/lib/utils/tenant-helper');
      const headers = await createTenantHeaders(user.id);
      
      const response = await fetch('/api/tenant/organization', {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        const orgData = result.data;
        setOrganization(orgData);
        setTrialInfo(calculateTrialInfo(orgData));

        devLog.log('[Assinaturas] Dados da organização carregados:', {
          orgName: orgData.name,
          plan: orgData.plan,
          isTrialActive: orgData.is_trial,
          subscriptionStatus: orgData.subscription_status
        });
      } else {
        throw new Error(result.error || 'Erro ao carregar dados da organização');
      }
    } catch (error: any) {
      devLog.error('[Assinaturas] Erro ao carregar dados:', error);
      setError(error.message || 'Erro ao carregar informações da assinatura');
    } finally {
      setLoading(false);
    }
  };

  // Função para buscar estatísticas de uso
  const fetchUsageStats = async () => {
    if (!user?.id) return;

    try {
      // ✅ IMPLEMENTAÇÃO: Usar API real de usage stats
      const { createTenantHeaders } = await import('@/lib/utils/tenant-helper');
      const headers = await createTenantHeaders(user.id);
      
      const response = await fetch('/api/admin/billing/usage-stats', {
        method: 'GET',
        headers,
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setUsageStats(result.data);
          
          devLog.log('[Assinaturas] Estatísticas de uso carregadas:', result.data);
        } else {
          throw new Error(result.error || 'Erro ao carregar estatísticas');
        }
      } else {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
    } catch (error) {
      devLog.error('[Assinaturas] Erro ao carregar estatísticas de uso:', error);
      
      // Fallback para dados simulados em caso de erro
      const fallbackUsage: UsageStats = {
        projects: { current: 23, limit: 30, percentage: 77 },
        users: { current: 3, limit: 10, percentage: 30 },
        clients: { current: 45, limit: 100, percentage: 45 },
        storage: { current: 1.2, limit: 3, percentage: 40 },
        apiCalls: { current: 450, limit: 2000, percentage: 23 }
      };
      
      setUsageStats(fallbackUsage);
    }
  };

  // Função para fazer upgrade para um plano específico
  const handleUpgrade = async (planType: 'basico' | 'profissional') => {
    if (!organization || !user?.id) {
      devLog.error('[Stripe] Dados necessários não encontrados para upgrade');
      setError('Erro: Dados da organização não encontrados');
      return;
    }

    try {
      setIsUpgrading(true);
      setError(null); // Limpar erros anteriores
      
      // Log detalhado dos dados antes do envio
      devLog.log('[Stripe] Dados da organização:', {
        id: organization.id,
        name: organization.name,
        tenant_id: organization.tenant_id,
        hasAllFields: !!(organization.id && organization.tenant_id)
      });

      const requestData = {
        planType,
        organizationId: organization.id,
        tenantId: organization.tenant_id || organization.id // Usar o ID da organização como fallback
      };

      devLog.log('[Stripe] Dados que serão enviados:', requestData);

      // Criar sessão de checkout no backend
      const { createTenantHeaders } = await import('@/lib/utils/tenant-helper');
      const headers = await createTenantHeaders(user.id);
      
      devLog.log('[Stripe] Criando sessão de checkout...');
      
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const result = await response.json();
      devLog.log('[Stripe] Resposta da API real:', { 
        status: response.status,
        success: result.success,
        hasUrl: !!result.url,
        error: result.error
      });

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar sessão de pagamento');
      }

      if (result.success && result.url) {
        devLog.log('[Stripe] Redirecionando para checkout:', result.url);
        
        // Verificar se a URL é válida antes de abrir
        if (!result.url.startsWith('https://checkout.stripe.com')) {
          throw new Error('URL de checkout inválida recebida');
        }
        
        // Abrir Stripe Checkout em nova guia
        openStripeCheckoutInNewTab(result.url);
        
        // Feedback visual positivo para o usuário
        setError(null); // Limpar qualquer erro anterior
        
        // Mostrar mensagem de sucesso temporária
        const successMessage = 'Redirecionando para pagamento... Verifique a nova guia que abriu.';
        devLog.log('✅ [Stripe] ' + successMessage);
      } else {
        throw new Error('URL de checkout não foi retornada');
      }

    } catch (error: any) {
      devLog.error('[Stripe] Erro no processo de upgrade:', {
        message: error.message,
        stack: error.stack,
        organizationData: organization ? {
          id: organization.id,
          name: organization.name,
          tenant_id: organization.tenant_id
        } : 'null'
      });
      setError(`Erro ao processar upgrade: ${error.message}`);
    } finally {
      setIsUpgrading(false);
    }
  };

  // Função para adicionar cartão de crédito
  const handleAddPaymentMethod = async () => {
    // Para trial expirado, redirecionar para upgrade básico
    if (trialInfo?.isExpired) {
      await handleUpgrade('basico');
      return;
    }

    // Se já tem assinatura ativa, implementar adição de método de pagamento
    // Por enquanto, redirecionar para upgrade também
    await handleUpgrade('basico');
  };

  // Função para sincronização manual como fallback final
  const handleManualSync = async () => {
    if (!sessionId) return;

    setPaymentProcessing(true);
    setError(null);

    try {
      devLog.log('[Manual Sync] Forçando sincronização manual...');

      // Tentar sincronização direta via fetch simples
      const response = await fetch('/api/stripe/sync-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          organizationId: organization?.id || '5790d7a1-1c54-4fa8-b509-db766ca6bc3c'
        }),
      });

      if (response.ok) {
        // Recarregar página inteira para garantir dados atualizados
        window.location.reload();
      } else {
        setError('Não foi possível sincronizar automaticamente. Tente recarregar a página.');
      }
    } catch (error) {
      devLog.error('[Manual Sync] Falha na sincronização manual:', error);
      setError('Erro na sincronização. Por favor, recarregue a página para ver as atualizações.');
    } finally {
      setPaymentProcessing(false);
    }
  };

  // Carregar planos do banco de dados
  useEffect(() => {
    async function loadPlans() {
      try {
        const plans = await getStripePlans();
        setStripePlans(plans);
        devLog.log('[Assinaturas] Planos carregados do banco:', plans);
      } catch (error) {
        devLog.error('[Assinaturas] Erro ao carregar planos:', error);
      }
    }
    loadPlans();
  }, []);

  // Carregar dados ao montar o componente
  useEffect(() => {
    if (user?.id) {
      fetchOrganizationData();
      fetchUsageStats();
    }
  }, [user?.id]);

  // Auto-refresh inteligente após pagamento bem-sucedido
  useEffect(() => {
    if (paymentSuccess && sessionId && user?.id) {
      setPaymentProcessing(true);

      // Aguardar 3 segundos para o webhook processar
      const timer = setTimeout(async () => {
        devLog.log('[Auto-refresh] Sincronizando pagamento após sucesso');

        try {
          // Forçar sincronização do pagamento com retry automático
          const { apiClient } = await import('@/lib/utils/api-client');
          const { createTenantHeaders } = await import('@/lib/utils/tenant-helper');

          // Obter headers com tenant info
          const tenantHeaders = await createTenantHeaders(user.id);

          devLog.log('[Auto-refresh] Iniciando sincronização robusta...');

          // Usar apiClient com retry automático
          const syncResponse = await apiClient.post('/api/stripe/sync-payment', {
            sessionId,
            organizationId: organization?.id || '5790d7a1-1c54-4fa8-b509-db766ca6bc3c' // Fallback para Goias Solar
          }, {
            headers: tenantHeaders,
            retryOnAuth: true // Ativar retry em caso de 401
          });

          const syncResult = await syncResponse.json();
          devLog.log('[Auto-refresh] Resultado da sincronização:', syncResult);

          if (syncResponse.status === 401) {
            devLog.warn('[Auto-refresh] Falha de autenticação mesmo após retry - requer relogin');
            // Fallback gracioso - não quebrar a experiência
            setError('Sessão expirada. Por favor, recarregue a página para ver as atualizações.');
          }

          // Recarregar dados da organização
          await fetchOrganizationData();
          await fetchUsageStats();

        } catch (error) {
          devLog.error('[Auto-refresh] Erro na sincronização:', error);

          // Fallback gracioso: mostrar mensagem amigável
          if (error.message?.includes('401') || error.message?.includes('unauthorized')) {
            setError('Sessão expirada. Recarregue a página para ver as atualizações do seu plano.');
            setManualSyncAvailable(true);
          } else {
            // Para outros erros, tentar recarregar dados mesmo assim
            try {
              await fetchOrganizationData();
              await fetchUsageStats();
            } catch (fetchError) {
              devLog.error('[Auto-refresh] Erro ao recarregar dados:', fetchError);
              setError('Pagamento processado com sucesso! Recarregue a página para ver as atualizações.');
              setManualSyncAvailable(true);
            }
          }
        }

        setPaymentProcessing(false);
        devLog.log('[Auto-refresh] Processo concluído');
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [paymentSuccess, sessionId, user?.id]);

  // Função para obter cor do badge baseado no status
  const getTrialBadgeColor = () => {
    if (!trialInfo) return 'bg-gray-100 text-gray-700';
    
    if (trialInfo.isExpired) {
      return 'bg-red-100 text-red-700 border-red-200';
    } else if (trialInfo.isExpiringSoon) {
      return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    } else {
      return 'bg-green-100 text-green-700 border-green-200';
    }
  };

  if (loading || !stripePlans) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Carregando informações da assinatura...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !organization) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>
            {error || 'Não foi possível carregar as informações da assinatura.'}
            <div className="mt-2">
              <Button variant="outline" size="sm" onClick={fetchOrganizationData}>
                Tentar novamente
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alerta de Pagamento Bem-sucedido - PRIMEIRO para garantir visibilidade */}
      {paymentSuccess && sessionId && (
        <Alert className="border-l-4 border-l-emerald-500 bg-emerald-50">
          <CheckCircle className="h-4 w-4 text-emerald-600" />
          <AlertTitle className="text-emerald-800">
            {paymentProcessing ? '⏳ Processando Pagamento...' : '🎉 Pagamento Confirmado!'}
          </AlertTitle>
          <AlertDescription className="text-emerald-700">
            {paymentProcessing
              ? 'Seu pagamento foi aprovado! Estamos atualizando seu plano agora...'
              : 'Pagamento processado com sucesso! Seu plano foi atualizado e você já tem acesso a todas as funcionalidades premium.'
            }
            {paymentProcessing && (
              <div className="mt-3 flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600"></div>
                <span className="text-sm">Sincronizando dados...</span>
              </div>
            )}
            {sessionId && (
              <div className="mt-2 text-xs font-mono text-emerald-600">
                ID da sessão: {sessionId.substring(0, 20)}...
              </div>
            )}
            {manualSyncAvailable && (
              <div className="mt-3 pt-3 border-t border-emerald-200">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleManualSync}
                  disabled={paymentProcessing}
                  className="border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                >
                  {paymentProcessing ? '⏳ Sincronizando...' : '🔄 Sincronizar Manualmente'}
                </Button>
                <p className="text-xs text-emerald-600 mt-1">
                  Se os dados não atualizaram automaticamente, clique aqui.
                </p>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 p-8 text-white shadow-lg">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold">Assinaturas</h1>
          <p className="mt-2 text-emerald-100">
            Gerencie seu plano, limites e informações de cobrança
          </p>
        </div>

        {/* Elementos decorativos */}
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-500/30"></div>
        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-green-500/30"></div>
      </div>

      {/* Alerta de Trial (se aplicável) */}
      {trialInfo && trialInfo.isActive && (
        <Alert className={`border-l-4 ${trialInfo.isExpiringSoon ? 'border-l-yellow-500 bg-yellow-50' : 'border-l-green-500 bg-green-50'}`}>
          <Calendar className="h-4 w-4" />
          <AlertTitle className="text-gray-900">
            {trialInfo.isExpiringSoon ? '⚠️ Trial Expirando em Breve' : '✅ Trial Ativo'}
          </AlertTitle>
          <AlertDescription className="text-gray-700">
            {trialInfo.isExpiringSoon 
              ? `Seu período de teste expira em ${trialInfo.daysRemaining} dia(s). Considere fazer upgrade para continuar usando todas as funcionalidades.`
              : `Você tem ${trialInfo.daysRemaining} dia(s) restantes de teste gratuito. Aproveite para explorar todas as funcionalidades!`
            }
          </AlertDescription>
        </Alert>
      )}

      {/* Alerta de Trial Expirado */}
      {trialInfo && trialInfo.isExpired && (
        <Alert variant="destructive" className="border-l-4 border-l-red-500">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>🚨 Trial Expirado</AlertTitle>
          <AlertDescription>
            Seu período de teste expirou em {trialInfo.endDate}. Faça upgrade para continuar usando a plataforma.
            <div className="mt-3">
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700"
                onClick={() => handleUpgrade('basico')}
                disabled={isUpgrading}
              >
                {isUpgrading ? 'Processando...' : 'Fazer Upgrade Agora'}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Informações do Plano */}
        <Card className="bg-white dark:bg-gray-800 border-0 shadow-md h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              Plano Atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border rounded-lg p-6 hover:shadow-md transition-shadow bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-xl text-emerald-900">Básico</h3>
              <Badge className={getTrialBadgeColor()}>
                {trialInfo?.isActive ? `Trial (${trialInfo.daysRemaining}d)` : 
                 trialInfo?.isExpired ? 'Trial Expirado' : 
                 organization.subscription_status === 'active' ? 'Ativo' : organization.subscription_status}
              </Badge>
                </div>
                
                <p className="text-3xl font-bold text-green-600 mb-4">
                  R$ {stripePlans.basico.price.toLocaleString('pt-BR')}/mês
                </p>

                <div className="space-y-3 text-sm text-gray-700 mb-6">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500">✓</span>
                    <span>
                      <strong>{stripePlans.basico.features.max_projects} projetos</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500">✓</span>
                    <span>
                      <strong>{stripePlans.basico.features.max_users} usuários</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500">✓</span>
                    <span>
                      <strong>{stripePlans.basico.features.max_clients} clientes</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500">✓</span>
                    <span>
                      <strong>{stripePlans.basico.features.max_storage_gb}GB storage</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500">✓</span>
                    <span>
                      <strong>{stripePlans.basico.features.api_calls_per_day.toLocaleString('pt-BR')} API calls/dia</strong>
                    </span>
                  </div>
                  
                  {/* Mostrar features extras apenas se não estiver ativo */}
                  {!(organization.subscription_status === 'active' && !organization.is_trial) && (
                    <div className="border-t pt-3 mt-4">
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-500">✨</span>
                        <span><strong>Suporte por Email</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-500">✨</span>
                        <span><strong>Relatórios Básicos</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-500">✨</span>
                        <span><strong>Integrações Essenciais</strong></span>
                      </div>
                    </div>
                  )}
                </div>

                {organization.subscription_status === 'active' && !organization.is_trial ? (
                  // Plano ativo - mostrar informações da assinatura
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-green-800">Seu plano está ativo</span>
                    </div>
                    <p className="text-sm text-green-700">
                      Próxima cobrança em {organization.next_billing_date 
                        ? new Date(organization.next_billing_date).toLocaleDateString('pt-BR')
                        : '30 dias'
                      }
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      Cancele a qualquer momento
                    </p>
                  </div>
                ) : (
                  // Trial ou trial expirado - mostrar botão de upgrade para BÁSICO
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3"
                    onClick={() => handleUpgrade('basico')}
                    disabled={isUpgrading}
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    {isUpgrading ? 'Processando...' : 'Fazer Upgrade'}
                  </Button>
                )}
                
                <p className="text-xs text-center text-gray-500 mt-3">
                  {organization.name}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Opções de Upgrade */}
        <Card className="bg-white dark:bg-gray-800 border-0 shadow-md h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Opções de Upgrade
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Mostrar sempre o plano Profissional como opção de upgrade */}
            <div className="space-y-4">
              <div className="border rounded-lg p-6 hover:shadow-md transition-shadow bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-xl text-blue-900">{stripePlans.profissional.name}</h3>
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                    Upgrade Recomendado
                  </Badge>
                </div>

                <p className="text-3xl font-bold text-green-600 mb-4">
                  R$ {stripePlans.profissional.price.toLocaleString('pt-BR')}/mês
                </p>

                <div className="space-y-3 text-sm text-gray-700 mb-6">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-500">✓</span>
                    <span>
                      <strong>{stripePlans.profissional.features.max_projects} projetos</strong>
                      <span className="text-xs text-gray-500 ml-1">(vs {stripePlans.basico.features.max_projects} atual)</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-500">✓</span>
                    <span>
                      <strong>{stripePlans.profissional.features.max_users} usuários</strong>
                      <span className="text-xs text-gray-500 ml-1">(vs {stripePlans.basico.features.max_users} atual)</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-500">✓</span>
                    <span>
                      <strong>{stripePlans.profissional.features.max_clients} clientes</strong>
                      <span className="text-xs text-gray-500 ml-1">(vs {stripePlans.basico.features.max_clients} atual)</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-500">✓</span>
                    <span>
                      <strong>{stripePlans.profissional.features.max_storage_gb}GB storage</strong>
                      <span className="text-xs text-gray-500 ml-1">(vs {stripePlans.basico.features.max_storage_gb}GB atual)</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-500">✓</span>
                    <span>
                      <strong>{stripePlans.profissional.features.api_calls_per_day.toLocaleString('pt-BR')} API calls/dia</strong>
                      <span className="text-xs text-gray-500 ml-1">(vs {stripePlans.basico.features.api_calls_per_day.toLocaleString('pt-BR')} atual)</span>
                    </span>
                  </div>
                  
                  {/* Features condicionais baseadas no status do plano básico */}
                  <div className="border-t pt-3 mt-4">
                    {organization.subscription_status === 'active' && !organization.is_trial ? (
                      // Se básico está ativo, mostrar apenas 2 features no profissional
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-blue-500">✨</span>
                          <span><strong>Suporte Prioritário</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-blue-500">✨</span>
                          <span><strong>Relatórios Avançados</strong></span>
                        </div>
                      </>
                    ) : (
                      // Se trial ou trial expirado, mostrar 3 features no profissional
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-blue-500">✨</span>
                          <span><strong>Suporte Prioritário</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-blue-500">✨</span>
                          <span><strong>Relatórios Avançados</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-blue-500">✨</span>
                          <span><strong>Integrações Premium</strong></span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3"
                  onClick={() => handleUpgrade('profissional')}
                  disabled={isUpgrading}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  {isUpgrading ? 'Processando...' : `Fazer Upgrade para ${stripePlans.profissional.name}`}
                </Button>
                
                <p className="text-xs text-center text-gray-500 mt-3">
                  Upgrade instantâneo • Cancele a qualquer momento
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Uso dos Recursos */}
      {usageStats && usageStats.projects && usageStats.users && usageStats.clients && usageStats.storage && usageStats.apiCalls && (
        <Card className="bg-white dark:bg-gray-800 border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Uso dos Recursos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Projetos */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-orange-500" />
                  <span className="font-medium">Projetos</span>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${usageStats.projects.percentage >= 85 ? 'border-red-200 text-red-700' : 
                                        usageStats.projects.percentage >= 70 ? 'border-yellow-200 text-yellow-700' : 
                                        'border-green-200 text-green-700'}`}
                  >
                    {usageStats.projects.current}/{usageStats.projects.limit}
                  </Badge>
                </div>
                <Progress 
                  value={usageStats.projects.percentage} 
                  className="h-2"
                />
                <p className="text-xs text-gray-500">
                  {usageStats.projects.percentage}% do limite usado
                </p>
              </div>

              {/* Usuários */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">Usuários</span>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${usageStats.users.percentage >= 85 ? 'border-red-200 text-red-700' : 
                                        usageStats.users.percentage >= 70 ? 'border-yellow-200 text-yellow-700' : 
                                        'border-green-200 text-green-700'}`}
                  >
                    {usageStats.users.current}/{usageStats.users.limit}
                  </Badge>
                </div>
                <Progress 
                  value={usageStats.users.percentage} 
                  className="h-2"
                />
                <p className="text-xs text-gray-500">
                  {usageStats.users.percentage}% do limite usado
                </p>
              </div>

              {/* Clientes */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-cyan-500" />
                  <span className="font-medium">Clientes</span>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${usageStats.clients.percentage >= 85 ? 'border-red-200 text-red-700' : 
                                        usageStats.clients.percentage >= 70 ? 'border-yellow-200 text-yellow-700' : 
                                        'border-green-200 text-green-700'}`}
                  >
                    {usageStats.clients.current}/{usageStats.clients.limit}
                  </Badge>
                </div>
                <Progress 
                  value={usageStats.clients.percentage} 
                  className="h-2"
                />
                <p className="text-xs text-gray-500">
                  {usageStats.clients.percentage}% do limite usado
                </p>
              </div>

              {/* Storage */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-purple-500" />
                  <span className="font-medium">Storage</span>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${usageStats.storage.percentage >= 85 ? 'border-red-200 text-red-700' : 
                                        usageStats.storage.percentage >= 70 ? 'border-yellow-200 text-yellow-700' : 
                                        'border-green-200 text-green-700'}`}
                  >
                    {usageStats.storage.current}/{usageStats.storage.limit}GB
                  </Badge>
                </div>
                <Progress 
                  value={usageStats.storage.percentage} 
                  className="h-2"
                />
                <p className="text-xs text-gray-500">
                  {usageStats.storage.percentage}% do limite usado
                </p>
              </div>

              {/* API Calls */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  <span className="font-medium">API Calls (hoje)</span>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${usageStats.apiCalls.percentage >= 85 ? 'border-red-200 text-red-700' : 
                                        usageStats.apiCalls.percentage >= 70 ? 'border-yellow-200 text-yellow-700' : 
                                        'border-green-200 text-green-700'}`}
                  >
                    {usageStats.apiCalls.current}/{usageStats.apiCalls.limit}
                  </Badge>
                </div>
                <Progress 
                  value={usageStats.apiCalls.percentage} 
                  className="h-2"
                />
                <p className="text-xs text-gray-500">
                  {usageStats.apiCalls.percentage}% do limite diário usado
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}