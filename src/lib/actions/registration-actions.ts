'use server'

import { createSupabaseServiceRoleClient } from '@/lib/supabase/server'
import { devLog } from '@/lib/utils/productionLogger'
import { registrationLogger } from '@/lib/utils/registrationLogger'
import { setupNewTenantConfigs } from '@/lib/services/tenantConfigSetup'

export interface RegistrationData {
  companyName: string
  slug: string
  adminName: string
  adminEmail: string
  adminPassword: string
  plan: 'basico' | 'profissional'
}

interface RegistrationResult {
  success: boolean
  message: string
  error?: string
  organizationId?: string
  userId?: string
  redirectUrl?: string
}

// Função para enviar email de boas-vindas (placeholder)
async function sendWelcomeEmail(
  email: string, 
  name: string, 
  slug: string, 
  plan: string
): Promise<void> {
  devLog.log('[sendWelcomeEmail] Enviando email de boas-vindas:', {
    email,
    name,
    slug,
    plan
  })
  
  // TODO: Implementar envio real de email
  // Por enquanto, apenas log
  devLog.log('[sendWelcomeEmail] Email seria enviado para:', email)
}

export async function registerOrganization(data: RegistrationData): Promise<RegistrationResult> {
  // Sanitização defensiva do slug para consistência com middleware e banco
  const sanitizedSlug = data.slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/--+/g, '-')
    .replace(/(^-|-$)/g, '');

  registrationLogger.log('INICIO', 'Iniciando processo de registro', {
    companyName: data.companyName,
    slug: sanitizedSlug,
    adminEmail: data.adminEmail,
    plan: data.plan
  })

  devLog.log('[registerOrganization] Iniciando registro:', {
    companyName: data.companyName,
    slug: sanitizedSlug,
    adminEmail: data.adminEmail,
    plan: data.plan
  })

  try {
    registrationLogger.log('CONFIG', 'Verificando configuração do Supabase', {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV
    })

    const supabase = createSupabaseServiceRoleClient()
    registrationLogger.log('SUPABASE', 'Cliente Supabase criado com sucesso')

    // 1. Verificar se slug ainda está disponível
    registrationLogger.log('SLUG_CHECK', 'Verificando disponibilidade do slug', { slug: sanitizedSlug })
    
    const { data: existingOrg, error: slugCheckError } = await supabase
      .from('organizations')
      .select('slug')
      .eq('slug', sanitizedSlug)
      .single()

    if (slugCheckError && slugCheckError.code !== 'PGRST116') {
      registrationLogger.error('SLUG_CHECK', 'Erro ao verificar slug', slugCheckError)
      return {
        success: false,
        error: 'SLUG_CHECK_ERROR',
        message: 'Erro ao verificar disponibilidade do slug. Tente novamente.'
      }
    }

    if (existingOrg) {
      registrationLogger.log('SLUG_CHECK', 'Slug já existe', { slug: data.slug, existingOrg })
      return {
        success: false,
        error: 'SLUG_TAKEN',
        message: 'Slug já está em uso. Escolha outro.'
      }
    }

    registrationLogger.log('SLUG_CHECK', 'Slug disponível', { slug: sanitizedSlug })

    // 2. Criar usuário no Supabase Auth
    registrationLogger.log('AUTH_USER', 'Criando usuário no Supabase Auth', { 
      email: data.adminEmail,
      name: data.adminName 
    })

    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: data.adminEmail,
      password: data.adminPassword,
      email_confirm: true, // Confirmar email automaticamente
      user_metadata: {
        name: data.adminName,
        role: 'admin'
      }
    })

    if (authError || !authUser.user) {
      registrationLogger.error('AUTH_USER', 'Erro ao criar usuário no Auth', authError)
      devLog.error('[registerOrganization] Erro ao criar usuário:', authError)
      return {
        success: false,
        error: 'AUTH_ERROR',
        message: 'Erro ao criar usuário. Verifique se o email já não está em uso.'
      }
    }

    const userId = authUser.user.id
    registrationLogger.log('AUTH_USER', 'Usuário criado com sucesso', { 
      userId, 
      email: data.adminEmail 
    })
    devLog.log('[registerOrganization] Usuário criado:', { userId, email: data.adminEmail })

    // 3. Criar organização usando a função SQL
    registrationLogger.log('SQL_FUNCTION', 'Chamando initialize_new_organization', {
      org_name: data.companyName,
      org_slug: sanitizedSlug,
      admin_email: data.adminEmail,
      admin_name: data.adminName,
      plan_type: data.plan,
      start_trial: true,
      userId: userId
    })

    const sqlParams = {
      org_name: data.companyName,
      org_slug: sanitizedSlug,
      admin_email: data.adminEmail,
      admin_name: data.adminName,
      plan_type: data.plan,
      start_trial: true // Sempre com trial para novos registros
    }
    
    console.log('🎯 CHAMANDO FUNÇÃO SQL COM PARÂMETROS:', sqlParams)
    
    const { data: orgResult, error: orgError } = await supabase.rpc('initialize_new_organization', sqlParams)

    if (orgError || !orgResult) {
      // Log mais detalhado do erro SQL
      console.error('🔥 ERRO CRÍTICO NA FUNÇÃO SQL:', {
        orgError,
        orgResult,
        errorCode: orgError?.code,
        errorMessage: orgError?.message,
        errorDetails: orgError?.details,
        errorHint: orgError?.hint,
        fullError: orgError
      })
      
      registrationLogger.error('SQL_FUNCTION', 'Erro na função SQL initialize_new_organization', {
        orgError,
        orgResult,
        errorDetails: {
          code: orgError?.code,
          message: orgError?.message,
          details: orgError?.details,
          hint: orgError?.hint,
          full_error: orgError
        }
      })
      
      devLog.error('[registerOrganization] Erro ao criar organização:', orgError)
      
      // Limpar usuário criado se falhou
      registrationLogger.log('CLEANUP', 'Removendo usuário criado devido ao erro', { userId })
      await supabase.auth.admin.deleteUser(userId)
      
      return {
        success: false,
        error: 'ORG_CREATION_ERROR',
        message: `Erro ao criar organização: ${orgError?.message || 'Erro desconhecido'}. Código: ${orgError?.code || 'N/A'}`,
        debugInfo: {
          sqlError: orgError,
          sqlResult: orgResult,
          sqlParams: sqlParams,
          timestamp: new Date().toISOString()
        }
      }
    }

    const organizationId = orgResult
    registrationLogger.log('SQL_FUNCTION', 'Organização criada com sucesso', { 
      organizationId, 
      slug: sanitizedSlug 
    })
    devLog.log('[registerOrganization] Organização criada:', { organizationId, slug: data.slug })

    // 4. Atualizar usuário na tabela users com tenant_id
    registrationLogger.log('USER_TABLE', 'Inserindo usuário na tabela users', {
      userId,
      email: data.adminEmail,
      name: data.adminName,
      organizationId
    })

    const { error: userError } = await supabase
      .from('users')
      .upsert({
        id: userId,
        email: data.adminEmail,
        name: data.adminName,
        role: 'admin',
        tenant_id: organizationId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (userError) {
      registrationLogger.error('USER_TABLE', 'Erro ao inserir usuário na tabela', userError)
      devLog.error('[registerOrganization] Erro ao criar usuário na tabela:', userError)
      
      // Limpar recursos criados
      registrationLogger.log('CLEANUP', 'Limpando recursos devido ao erro na tabela users', {
        userId,
        organizationId
      })
      await supabase.auth.admin.deleteUser(userId)
      await supabase.from('organizations').delete().eq('id', organizationId)
      
      return {
        success: false,
        error: 'USER_TABLE_ERROR',
        message: 'Erro ao configurar usuário. Tente novamente.'
      }
    }

    registrationLogger.log('USER_TABLE', 'Usuário inserido na tabela com sucesso')

    // 4.1. Criar configs padrão para a organização usando serviço robusto
    try {
      registrationLogger.log('CONFIG_CREATE', 'Iniciando setup de configs padrão para novo tenant', {
        organizationId,
        companyName: data.companyName,
        userId
      });
      
      const setupResult = await setupNewTenantConfigs(
        organizationId,
        data.companyName,
        userId
      );

      if (setupResult.success) {
        registrationLogger.log('CONFIG_CREATE', 'Setup de configs concluído com sucesso', {
          configsCreated: setupResult.configsCreated
        });
        devLog.log('[registerOrganization] Configurações criadas:', { 
          configsCreated: setupResult.configsCreated,
          organizationId 
        });
      } else {
        registrationLogger.error('CONFIG_CREATE', 'Falha no setup de configs', { 
          error: setupResult.error 
        });
        devLog.warn('[registerOrganization] Falha ao criar configs (não crítico):', setupResult.error);
        // Não falhar o registro por causa das configs
      }
    } catch (configError) {
      registrationLogger.error('CONFIG_CREATE', 'Exceção inesperada no setup de configs', configError);
      devLog.warn('[registerOrganization] Exceção no setup de configs (não crítico):', configError);
      // Não falhar o registro por causa das configs
    }

    // 5. Criar notificação de boas-vindas
    try {
      registrationLogger.log('NOTIFICATION', 'Criando notificação de boas-vindas')
      
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          tenant_id: organizationId,
          user_id: userId,
          title: 'Bem-vindo! Trial de 7 dias iniciado 🚀',
          message: 'Você tem 7 dias para explorar todos os recursos. Aproveite!',
          type: 'success',
          category: 'system',
          data: {
            is_trial: true,
            trial_days: 7,
            plan: data.plan
          }
        })

      if (notificationError) {
        registrationLogger.error('NOTIFICATION', 'Erro ao criar notificação', notificationError)
        // Não falhar o registro por causa da notificação
      } else {
        registrationLogger.log('NOTIFICATION', 'Notificação criada com sucesso')
      }
    } catch (notificationError) {
      registrationLogger.error('NOTIFICATION', 'Erro inesperado ao criar notificação', notificationError)
      // Não falhar o registro por causa da notificação
    }

    // 6. Enviar email de boas-vindas (opcional, não falhar o registro se der erro)
    try {
      await sendWelcomeEmail(data.adminEmail, data.adminName, data.slug, data.plan)
    } catch (emailError) {
      devLog.warn('[registerOrganization] Erro ao enviar email de boas-vindas:', emailError)
      // Não falhar o registro por causa do email
    }

    // 6. Log de sucesso
    devLog.log('[registerOrganization] Registro concluído com sucesso:', {
      organizationId,
      userId,
      slug: data.slug,
      plan: data.plan
    })

    // 7. Preparar redirecionamento para o tenant
    const redirectUrl = `https://${sanitizedSlug}.gerenciamentofotovoltaico.com.br/admin/login?welcome=true&email=${encodeURIComponent(data.adminEmail)}`

    registrationLogger.log('SUCCESS', 'Registro concluído com sucesso', {
      organizationId,
      userId,
      slug: data.slug,
      plan: data.plan,
      redirectUrl
    })

    return {
      success: true,
      organizationId,
      userId,
      message: 'Conta criada com sucesso! Redirecionando...',
      redirectUrl
    }

  } catch (error) {
    registrationLogger.error('UNEXPECTED', 'Erro inesperado durante o registro', error)
    devLog.error('[registerOrganization] Erro inesperado:', error)
    return {
      success: false,
      error: 'UNEXPECTED_ERROR',
      message: 'Erro inesperado. Tente novamente.'
    }
  }
}

// Função para verificar se uma organização existe
export async function checkOrganizationExists(slug: string): Promise<boolean> {
  try {
    const supabase = createSupabaseServiceRoleClient()
    
    const { data, error } = await supabase
      .from('organizations')
      .select('slug')
      .eq('slug', slug)
      .single()

    return !error && !!data
  } catch {
    return false
  }
}

// Função para obter informações básicas de uma organização
export async function getOrganizationInfo(slug: string) {
  try {
    const supabase = createSupabaseServiceRoleClient()
    
    const { data, error } = await supabase
      .from('organizations')
      .select('id, name, slug, plan, status, is_trial, trial_ends_at')
      .eq('slug', slug)
      .single()

    if (error) {
      return null
    }

    return data
  } catch {
    return null
  }
}