'use server'

import { redirect } from 'next/navigation'
import { createSupabaseServiceRoleClient } from '@/lib/supabase/server'
import { devLog } from '@/lib/utils/productionLogger'

// Tipos para o formulário de registro
export interface RegistrationData {
  // Dados da empresa
  companyName: string
  slug: string
  
  // Dados do admin
  adminName: string
  adminEmail: string
  adminPassword: string
  
  // Plano escolhido
  plan: 'basico' | 'profissional'
  
  // Termos e condições
  acceptedTerms: boolean
  acceptedPrivacy: boolean
}

export interface RegistrationResult {
  success: boolean
  organizationId?: string
  userId?: string
  error?: string
  message?: string
  redirectUrl?: string
}

/**
 * Server Action principal para registro de nova organização
 */
export async function registerOrganization(data: RegistrationData): Promise<RegistrationResult> {
  try {
    devLog.log('[registerOrganization] Iniciando registro:', {
      companyName: data.companyName,
      slug: data.slug,
      adminEmail: data.adminEmail,
      plan: data.plan
    })

    // 1. Validações básicas
    const validation = validateRegistrationData(data)
    if (!validation.valid) {
      return {
        success: false,
        error: 'Dados inválidos',
        message: validation.message
      }
    }

    // 2. Verificar se slug ainda está disponível
    const slugCheck = await checkSlugAvailability(data.slug)
    if (!slugCheck.available) {
      return {
        success: false,
        error: 'Slug indisponível',
        message: slugCheck.message || 'Este nome já está em uso'
      }
    }

    const supabase = createSupabaseServiceRoleClient()

    // 3. Criar usuário no Supabase Auth primeiro
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: data.adminEmail,
      password: data.adminPassword,
      email_confirm: true, // Confirmar email automaticamente
      user_metadata: {
        name: data.adminName,
        role: 'superadmin'
      }
    })

    if (authError || !authUser.user) {
      devLog.error('[registerOrganization] Erro ao criar usuário no Auth:', authError)
      return {
        success: false,
        error: 'Erro ao criar usuário',
        message: 'Não foi possível criar a conta. Tente novamente.'
      }
    }

    const userId = authUser.user.id

    // 4. Criar organização usando função do banco
    const { data: orgResult, error: orgError } = await supabase
      .rpc('initialize_new_organization', {
        org_name: data.companyName,
        org_slug: data.slug,
        admin_email: data.adminEmail,
        admin_name: data.adminName,
        plan_type: data.plan,
        start_trial: true
      })

    if (orgError || !orgResult) {
      devLog.error('[registerOrganization] Erro ao criar organização:', orgError)
      
      // Limpar usuário criado se organização falhou
      await supabase.auth.admin.deleteUser(userId)
      
      return {
        success: false,
        error: 'Erro ao criar organização',
        message: 'Não foi possível criar a organização. Tente novamente.'
      }
    }

    const organizationId = orgResult

    // 5. Criar registro do usuário na tabela users
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: userId,
        tenant_id: organizationId,
        email: data.adminEmail,
        name: data.adminName,
        role: 'superadmin',
        user_type: 'superadmin',
        permissions: {
          can_create_projects: true,
          can_edit_projects: true,
          can_delete_projects: true,
          can_manage_users: true,
          can_view_financials: true,
          can_export_data: true,
          can_manage_organization: true
        },
        status: 'active',
        created_by: userId
      })

    if (userError) {
      devLog.error('[registerOrganization] Erro ao criar usuário na tabela:', userError)
      
      // Limpar recursos criados
      await supabase.auth.admin.deleteUser(userId)
      await supabase.from('organizations').delete().eq('id', organizationId)
      
      return {
        success: false,
        error: 'Erro ao configurar usuário',
        message: 'Não foi possível configurar a conta. Tente novamente.'
      }
    }

    // 6. Enviar email de boas-vindas (opcional, pode ser implementado depois)
    try {
      await sendWelcomeEmail(data.adminEmail, data.adminName, data.slug, data.plan)
    } catch (emailError) {
      devLog.warn('[registerOrganization] Erro ao enviar email de boas-vindas:', emailError)
      // Não falhar o registro por causa do email
    }

    // 7. Log de sucesso
    devLog.log('[registerOrganization] Registro concluído com sucesso:', {
      organizationId,
      userId,
      slug: data.slug,
      plan: data.plan
    })

    // 8. Preparar redirecionamento para o tenant
    const redirectUrl = `https://${data.slug}.gerenciamentofotovoltaico.com.br/admin/login?welcome=true&email=${encodeURIComponent(data.adminEmail)}`

    return {
      success: true,
      organizationId,
      userId,
      message: 'Conta criada com sucesso! Redirecionando...',
      redirectUrl
    }

  } catch (error) {
    devLog.error('[registerOrganization] Erro inesperado:', error)
    return {
      success: false,
      error: 'Erro interno',
      message: 'Erro inesperado. Tente novamente.'
    }
  }
}

/**
 * Validar dados do formulário de registro
 */
function validateRegistrationData(data: RegistrationData): { valid: boolean; message?: string } {
  // Validar nome da empresa
  if (!data.companyName || data.companyName.trim().length < 2) {
    return { valid: false, message: 'Nome da empresa deve ter pelo menos 2 caracteres' }
  }

  if (data.companyName.length > 100) {
    return { valid: false, message: 'Nome da empresa deve ter no máximo 100 caracteres' }
  }

  // Validar slug
  if (!data.slug || data.slug.trim().length < 3) {
    return { valid: false, message: 'Nome da empresa (slug) deve ter pelo menos 3 caracteres' }
  }

  const slugRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/
  if (!slugRegex.test(data.slug)) {
    return { valid: false, message: 'Nome da empresa deve conter apenas letras minúsculas, números e hífens' }
  }

  // Validar nome do admin
  if (!data.adminName || data.adminName.trim().length < 2) {
    return { valid: false, message: 'Nome do administrador deve ter pelo menos 2 caracteres' }
  }

  // Validar email
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
  if (!data.adminEmail || !emailRegex.test(data.adminEmail)) {
    return { valid: false, message: 'Email inválido' }
  }

  // Validar senha
  if (!data.adminPassword || data.adminPassword.length < 6) {
    return { valid: false, message: 'Senha deve ter pelo menos 6 caracteres' }
  }

  // Validar plano
  if (!['basico', 'profissional'].includes(data.plan)) {
    return { valid: false, message: 'Plano inválido' }
  }

  // Validar termos
  if (!data.acceptedTerms) {
    return { valid: false, message: 'Você deve aceitar os termos de uso' }
  }

  if (!data.acceptedPrivacy) {
    return { valid: false, message: 'Você deve aceitar a política de privacidade' }
  }

  return { valid: true }
}

/**
 * Verificar se slug está disponível
 */
async function checkSlugAvailability(slug: string): Promise<{ available: boolean; message?: string }> {
  try {
    const supabase = createSupabaseServiceRoleClient()
    
    const { data: existingOrg, error } = await supabase
      .from('organizations')
      .select('slug')
      .eq('slug', slug.toLowerCase())
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = não encontrado
      devLog.error('[checkSlugAvailability] Erro no banco:', error)
      return { available: false, message: 'Erro ao verificar disponibilidade' }
    }

    if (existingOrg) {
      return { available: false, message: 'Este nome já está em uso' }
    }

    return { available: true }
  } catch (error) {
    devLog.error('[checkSlugAvailability] Erro inesperado:', error)
    return { available: false, message: 'Erro ao verificar disponibilidade' }
  }
}

/**
 * Enviar email de boas-vindas (placeholder - implementar depois)
 */
async function sendWelcomeEmail(
  email: string, 
  name: string, 
  slug: string, 
  plan: string
): Promise<void> {
  // TODO: Implementar envio de email de boas-vindas
  // Pode usar Amazon SES ou outro serviço
  
  devLog.log('[sendWelcomeEmail] Email de boas-vindas seria enviado para:', {
    email,
    name,
    slug,
    plan,
    loginUrl: `https://${slug}.gerenciamentofotovoltaico.com.br/admin/login`
  })

  // Placeholder - não implementado ainda
  return Promise.resolve()
}

/**
 * Server Action para redirecionar após registro bem-sucedido
 */
export async function redirectToTenant(slug: string, email?: string) {
  const params = email ? `?welcome=true&email=${encodeURIComponent(email)}` : '?welcome=true'
  const url = `https://${slug}.gerenciamentofotovoltaico.com.br/admin/login${params}`
  
  devLog.log('[redirectToTenant] Redirecionando para:', url)
  redirect(url)
}
