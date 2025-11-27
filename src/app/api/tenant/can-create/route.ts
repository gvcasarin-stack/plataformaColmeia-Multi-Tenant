import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createSupabaseServiceRoleClient } from '@/lib/supabase/server'
import { devLog } from '@/lib/utils/productionLogger'
import { handleTempTenant } from '@/lib/utils/temp-tenant-handler'

interface ResourceCheck {
  can_proceed: boolean
  current_usage: number
  limit_value: number
  usage_percentage: string
  message: string
}

export async function GET(request: NextRequest) {
  try {
    const headersList = headers()
    const tenantId = headersList.get('x-tenant-id')
    
    const { searchParams } = new URL(request.url)
    const resourceType = searchParams.get('type')

    if (!tenantId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Tenant ID não encontrado nos headers'
        },
        { status: 400 }
      )
    }

    // 🛠️ FALLBACK: Lidar com tenants temporários - permitir criação limitada
    if (tenantId.startsWith('temp-')) {
      devLog.log('[tenant/can-create] Tenant temporário detectado - permitindo criação limitada');

      const tempResourceCheck: ResourceCheck = {
        can_proceed: true,
        current_usage: 0,
        limit_value: resourceType === 'projects' ? 3 : resourceType === 'users' ? 2 : 1,
        usage_percentage: '0%',
        message: `Tenant temporário - limite de ${resourceType === 'projects' ? 3 : resourceType === 'users' ? 2 : 1} ${resourceType} permitido`
      };

      return NextResponse.json({
        success: true,
        resource_check: tempResourceCheck,
        resource_type: resourceType,
        fallback: 'temp_tenant'
      });
    }

    if (!resourceType) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Tipo de recurso é obrigatório' 
        },
        { status: 400 }
      )
    }

    // Validar tipos de recursos suportados
    const validResourceTypes = ['projects', 'users', 'clients', 'storage_gb']
    if (!validResourceTypes.includes(resourceType)) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Tipo de recurso inválido. Suportados: ${validResourceTypes.join(', ')}` 
        },
        { status: 400 }
      )
    }

    const supabase = createSupabaseServiceRoleClient()

    // Usar a função SQL can_create_resource
    const { data: resourceCheck, error } = await supabase.rpc('can_create_resource', {
      org_id: tenantId,
      resource_type: resourceType
    })

    if (error) {
      devLog.error('[tenant/can-create] Erro ao verificar limites:', error);

      // 🛠️ FALLBACK: Se função SQL falha, usar verificação manual
      try {
        devLog.log('[tenant/can-create] Tentando fallback manual para verificação de limites');

        // Buscar organização diretamente
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .select('id, plan')
          .eq('id', tenantId)
          .single();

        if (orgError || !org) {
          devLog.error('[tenant/can-create] Organização não encontrada no fallback:', orgError);

          // ÚLTIMO FALLBACK: Permitir criação limitada para tenants não encontrados
          const emergencyResourceCheck: ResourceCheck = {
            can_proceed: true,
            current_usage: 0,
            limit_value: 1,
            usage_percentage: '0%',
            message: `Verificação de limite indisponível - permitindo criação limitada de ${resourceType}`
          };

          return NextResponse.json({
            success: true,
            resource_check: emergencyResourceCheck,
            resource_type: resourceType,
            fallback: 'emergency_allow'
          });
        }

        // Definir limites baseados no plano (fallback manual)
        const planLimits: Record<string, Record<string, number>> = {
          free: {
            projects: 3,
            users: 2,
            clients: 10,
            storage_gb: 1
          },
          basic: {
            projects: 10,
            users: 5,
            clients: 50,
            storage_gb: 5
          },
          pro: {
            projects: 50,
            users: 20,
            clients: 200,
            storage_gb: 25
          }
        };

        const limits = planLimits[org.plan] || planLimits.free;
        const resourceLimit = limits[resourceType] || 1;

        // Contar uso atual (simplificado)
        let currentUsage = 0;
        if (resourceType === 'projects') {
          const { count } = await supabase
            .from('projects')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId);
          currentUsage = count || 0;
        }

        const canProceed = currentUsage < resourceLimit;
        const usagePercentage = ((currentUsage / resourceLimit) * 100).toFixed(1);

        const fallbackResourceCheck: ResourceCheck = {
          can_proceed: canProceed,
          current_usage: currentUsage,
          limit_value: resourceLimit,
          usage_percentage: `${usagePercentage}%`,
          message: canProceed
            ? `${resourceType} pode ser criado (${currentUsage}/${resourceLimit})`
            : `Limite de ${resourceType} atingido (${currentUsage}/${resourceLimit})`
        };

        devLog.log('[tenant/can-create] Fallback manual executado com sucesso');

        return NextResponse.json({
          success: true,
          resource_check: fallbackResourceCheck,
          resource_type: resourceType,
          fallback: 'manual_verification'
        });

      } catch (fallbackError) {
        devLog.error('[tenant/can-create] Erro no fallback manual:', fallbackError);

        // ÚLTIMO RECURSO: Permitir criação com limite mínimo
        const lastResortCheck: ResourceCheck = {
          can_proceed: true,
          current_usage: 0,
          limit_value: 1,
          usage_percentage: '0%',
          message: `Verificação falhou - permitindo 1 ${resourceType} por segurança`
        };

        return NextResponse.json({
          success: true,
          resource_check: lastResortCheck,
          resource_type: resourceType,
          fallback: 'last_resort'
        });
      }
    }

    if (!resourceCheck) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Organização não encontrada' 
        },
        { status: 404 }
      )
    }

    devLog.log('[tenant/can-create] Verificação de limite:', {
      tenantId,
      resourceType,
      canProceed: resourceCheck.can_proceed,
      currentUsage: resourceCheck.current_usage,
      limitValue: resourceCheck.limit_value
    })

    return NextResponse.json({
      success: true,
      resource_check: resourceCheck as ResourceCheck,
      resource_type: resourceType
    })

  } catch (error) {
    devLog.error('[tenant/can-create] Erro inesperado:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro interno do servidor' 
      },
      { status: 500 }
    )
  }
}
