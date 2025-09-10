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
  CreditCard, 
  Calendar,
  TrendingUp,
  Users,
  FolderOpen,
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

interface OrganizationStats {
  projectCount: number;
  clientCount: number;
  estimatedValue: number;
  daysSinceExpired: number;
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
  const [stats, setStats] = useState<OrganizationStats | null>(null);

  useEffect(() => {
    if (showProjectStats) {
      fetchOrganizationStats();
    }
  }, [showProjectStats]);

  const fetchOrganizationStats = async () => {
    try {
      const { createTenantHeaders } = await import('@/lib/utils/tenant-helper');
      const headers = await createTenantHeaders(user?.id || '');
      
      const response = await fetch('/api/admin/billing/usage-stats', {
        method: 'GET',
        headers,
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setStats({
            projectCount: result.data.projects?.current || 0,
            clientCount: result.data.clients?.current || 0,
            estimatedValue: (result.data.projects?.current || 0) * 15000, // R$ 15k por projeto em média
            daysSinceExpired: 3 // Simulado - pode ser calculado
          });
        }
      }
    } catch (error) {
      devLog.error('[TrialExpiredBlocker] Erro ao buscar estatísticas:', error);
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
    <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 ${className}`}>
      <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <Card className="w-full bg-white dark:bg-gray-800 shadow-2xl border-red-200 relative">
          {/* Botão de fechar */}
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-4 right-4 z-10 hover:bg-red-100 text-red-600"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          
          <div className="max-h-[90vh] overflow-y-auto">
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

          {/* Estatísticas (se habilitado) */}
          {showProjectStats && stats && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                Projetos Bloqueados
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-300">Projetos:</span>
                  <span className="font-semibold ml-2">{stats.projectCount}</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-300">Clientes:</span>
                  <span className="font-semibold ml-2">{stats.clientCount}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-600 dark:text-gray-300">Valor estimado bloqueado:</span>
                  <span className="font-semibold ml-2 text-red-600">
                    R$ {stats.estimatedValue.toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Planos disponíveis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Plano Básico */}
            <div className="border rounded-lg p-4 bg-emerald-50 border-emerald-200">
              <h3 className="font-bold text-emerald-900 mb-2">Básico</h3>
              <p className="text-2xl font-bold text-green-600 mb-3">R$ 299/mês</p>
              <ul className="text-sm space-y-1 text-emerald-700 mb-4">
                <li>✓ 30 projetos</li>
                <li>✓ 10 usuários</li>
                <li>✓ 100 clientes</li>
                <li>✓ 3GB storage</li>
              </ul>
              <Button 
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                onClick={() => handleUpgrade('basico')}
                disabled={isUpgrading}
              >
                {isUpgrading ? 'Processando...' : 'Escolher Básico'}
              </Button>
            </div>

            {/* Plano Profissional */}
            <div className="border rounded-lg p-4 bg-blue-50 border-blue-200 relative">
              <Badge className="absolute -top-2 -right-2 bg-blue-600 text-white">
                Recomendado
              </Badge>
              <h3 className="font-bold text-blue-900 mb-2">Profissional</h3>
              <p className="text-2xl font-bold text-green-600 mb-3">R$ 399/mês</p>
              <ul className="text-sm space-y-1 text-blue-700 mb-4">
                <li>✓ 100 projetos</li>
                <li>✓ 25 usuários</li>
                <li>✓ 500 clientes</li>
                <li>✓ 10GB storage</li>
              </ul>
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={() => handleUpgrade('profissional')}
                disabled={isUpgrading}
              >
                {isUpgrading ? 'Processando...' : 'Escolher Profissional'}
              </Button>
            </div>
          </div>

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
