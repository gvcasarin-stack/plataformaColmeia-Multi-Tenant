/**
 * UTILITÁRIOS DE SEGURANÇA MULTI-TENANT
 * Funções para garantir isolamento de dados entre organizações
 */

import { createSupabaseServiceRoleClient } from '@/lib/supabase/server'
import { devLog } from '@/lib/utils/productionLogger'

export interface TenantInfo {
  tenant_id: string
  role: string
  status: string
  organization: {
    id: string
    name: string
    slug: string
    is_trial: boolean
    subscription_status: string
  }
}

/**
 * Busca informações do tenant do usuário
 */
export async function getTenantFromUser(userId: string): Promise<TenantInfo | null> {
  try {
    if (!userId) {
      devLog.error('[getTenantFromUser] User ID não fornecido')
      return null
    }

    const supabase = createSupabaseServiceRoleClient()

    const { data: userData, error } = await supabase
      .from('users')
      .select(`
        tenant_id,
        role,
        status,
        organizations!users_tenant_id_fkey (
          id,
          name,
          slug,
          is_trial,
          subscription_status
        )
      `)
      .eq('id', userId)
      .single()

    // ✅ DEBUG: Adicionar logs detalhados para debug
    devLog.log('[getTenantFromUser] DEBUG - Query result:', {
      userId,
      userData,
      error,
      hasTenantId: !!userData?.tenant_id,
      status: userData?.status,
      role: userData?.role
    });

    if (error || !userData) {
      devLog.error('[getTenantFromUser] Erro ao buscar dados do usuário:', error)
      return null
    }

    if (!userData.tenant_id) {
      devLog.error('[getTenantFromUser] Usuário sem tenant_id:', { userId, userData })
      return null
    }

    // ✅ CORREÇÃO: Permitir usuários com status null/undefined (podem ser novos)
    if (userData.status && userData.status !== 'active') {
      devLog.error('[getTenantFromUser] Usuário não está ativo:', { userId, status: userData.status })
      return null
    }

    return {
      tenant_id: userData.tenant_id,
      role: userData.role,
      status: userData.status,
      organization: Array.isArray(userData.organizations) 
        ? userData.organizations[0] 
        : userData.organizations
    }
  } catch (error) {
    devLog.error('[getTenantFromUser] Erro inesperado:', error)
    return null
  }
}

/**
 * Verifica se o usuário pode acessar um recurso específico
 */
export async function canUserAccessResource(
  userId: string, 
  resourceType: 'project' | 'client' | 'user' | 'financial',
  resourceId?: string
): Promise<{ allowed: boolean; tenantInfo?: TenantInfo; message?: string }> {
  
  const tenantInfo = await getTenantFromUser(userId)
  
  if (!tenantInfo) {
    return { 
      allowed: false, 
      message: 'Usuário não encontrado ou sem organização' 
    }
  }

  // Verificar se trial expirou
  if (tenantInfo.organization.is_trial && 
      tenantInfo.organization.subscription_status === 'expired') {
    return {
      allowed: false,
      tenantInfo,
      message: 'Período de trial expirado. Faça upgrade para continuar.'
    }
  }

  // Se resourceId fornecido, verificar se pertence ao tenant
  if (resourceId) {
    const belongsToTenant = await verifyResourceOwnership(
      tenantInfo.tenant_id,
      resourceType,
      resourceId
    )

    if (!belongsToTenant) {
      return {
        allowed: false,
        tenantInfo,
        message: 'Recurso não encontrado ou não pertence à sua organização'
      }
    }
  }

  return { allowed: true, tenantInfo }
}

/**
 * Verifica se um recurso pertence ao tenant
 */
export async function verifyResourceOwnership(
  tenantId: string,
  resourceType: 'project' | 'client' | 'user' | 'financial',
  resourceId: string
): Promise<boolean> {
  try {
    const supabase = createSupabaseServiceRoleClient()

    let tableName: string
    let tenantColumn = 'tenant_id'

    switch (resourceType) {
      case 'project':
        tableName = 'projects'
        break
      case 'client':
        tableName = 'clients'
        break
      case 'user':
        tableName = 'users'
        break
      case 'financial':
        tableName = 'financial_transactions'
        break
      default:
        devLog.error('[verifyResourceOwnership] Tipo de recurso inválido:', resourceType)
        return false
    }

    const { data, error } = await supabase
      .from(tableName)
      .select('id')
      .eq('id', resourceId)
      .eq(tenantColumn, tenantId)
      .single()

    if (error || !data) {
      devLog.warn('[verifyResourceOwnership] Recurso não encontrado ou não pertence ao tenant:', {
        resourceType,
        resourceId,
        tenantId,
        error: error?.message
      })
      return false
    }

    return true
  } catch (error) {
    devLog.error('[verifyResourceOwnership] Erro inesperado:', error)
    return false
  }
}

/**
 * HOF para adicionar verificação de tenant em server actions
 */
export function withTenantValidation<T extends any[], R>(
  action: (tenantInfo: TenantInfo, ...args: T) => Promise<R>
) {
  return async (user: { id: string }, ...args: T): Promise<R | { error: string }> => {
    try {
      const tenantInfo = await getTenantFromUser(user.id)
      
      if (!tenantInfo) {
        return { error: 'Usuário não encontrado ou sem organização' }
      }

      // Verificar se pode usar funcionalidades
      if (tenantInfo.organization.is_trial && 
          tenantInfo.organization.subscription_status === 'expired') {
        return { 
          error: 'Período de trial expirado. Faça upgrade para continuar usando todas as funcionalidades.' 
        }
      }

      return await action(tenantInfo, ...args)
    } catch (error) {
      devLog.error('[withTenantValidation] Erro inesperado:', error)
      return { error: 'Erro interno do servidor' }
    }
  }
}

/**
 * Verifica se pode criar um recurso (limites + trial)
 */
export async function canCreateResource(
  tenantId: string,
  resourceType: string
): Promise<{ allowed: boolean; message?: string }> {
  try {
    const supabase = createSupabaseServiceRoleClient()

    const { data: canCreate, error } = await supabase
      .rpc('can_create_resource', {
        org_id: tenantId,
        resource_type: resourceType
      })

    if (error) {
      devLog.error('[canCreateResource] Erro ao verificar limites:', error)
      return { 
        allowed: false, 
        message: 'Erro ao verificar limites da organização' 
      }
    }

    if (!canCreate) {
      // Obter detalhes do limite
      const { data: limitInfo } = await supabase
        .rpc('check_limit', {
          org_id: tenantId,
          limit_type: resourceType
        })

      const details = Array.isArray(limitInfo) ? limitInfo[0] : limitInfo
      const message = details?.message || 'Limite atingido'

      return {
        allowed: false,
        message: `${message}. Faça upgrade do seu plano para criar mais recursos.`
      }
    }

    return { allowed: true }
  } catch (error) {
    devLog.error('[canCreateResource] Erro inesperado:', error)
    return { 
      allowed: false, 
      message: 'Erro ao verificar limites' 
    }
  }
}
