'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServiceRoleClient } from '@/lib/supabase/server'
import { devLog } from '@/lib/utils/productionLogger'
import { Project, CreateProjectClientData } from '@/types/project'
import { User } from '@/types/user'

/**
 * Server Action para criar projeto com isolamento multi-tenant
 */
export async function createProjectMultiTenant(
  projectData: CreateProjectClientData,
  user: { id: string; email?: string | null; name?: string | null }
): Promise<{ data?: Project; error?: string; message?: string }> {
  try {
    devLog.log('[createProjectMultiTenant] Iniciando criação de projeto:', {
      userId: user.id,
      projectName: projectData.name || 'Sem nome'
    })

    if (!user.id) {
      return { error: 'Usuário não autenticado' }
    }

    const supabase = createSupabaseServiceRoleClient()

    // 1. Obter dados do usuário e tenant_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('tenant_id, role, status')
      .eq('id', user.id)
      .single()

    if (userError || !userData || !userData.tenant_id) {
      devLog.error('[createProjectMultiTenant] Erro ao obter dados do usuário:', userError)
      return { error: 'Usuário não encontrado ou sem organização' }
    }

    if (userData.status !== 'active') {
      return { error: 'Usuário não está ativo' }
    }

    const tenantId = userData.tenant_id

    // 2. Verificar se pode criar projetos (limites + trial)
    const { data: canCreate, error: limitError } = await supabase
      .rpc('can_create_resource', { 
        org_id: tenantId, 
        resource_type: 'projects' 
      })

    if (limitError) {
      devLog.error('[createProjectMultiTenant] Erro ao verificar limite:', limitError)
      return { error: 'Erro ao verificar limites da organização' }
    }

    if (!canCreate) {
      // Obter detalhes do limite para mensagem mais específica
      const { data: limitInfo } = await supabase
        .rpc('check_limit', { 
          org_id: tenantId, 
          limit_type: 'projects' 
        })

      const details = Array.isArray(limitInfo) ? limitInfo[0] : limitInfo
      const message = details?.message || 'Limite de projetos atingido'
      
      return { 
        error: 'Limite excedido', 
        message: `${message}. Faça upgrade do seu plano para criar mais projetos.` 
      }
    }

    // 3. Preparar dados do projeto
    const projectToCreate = {
      // Campos obrigatórios multi-tenant
      tenant_id: tenantId,
      created_by: user.id,
      
      // Dados básicos
      name: projectData.name || 'Projeto sem nome',
      description: projectData.description || '',
      
      // Dados específicos de energia solar
      empresa_integradora: projectData.empresaIntegradora || '',
      nome_cliente_final: projectData.nomeClienteFinal || '',
      distribuidora: projectData.distribuidora || '',
      potencia: projectData.potencia || 0,
      data_entrega: projectData.dataEntrega || null,
      
      // Status e prioridade
      status: 'Não Iniciado',
      prioridade: projectData.prioridade || 'Baixa',
      
      // Campos financeiros
      valor_projeto: projectData.valorProjeto || 0,
      pagamento: projectData.pagamento || null,
      
      // Dados técnicos específicos
      lista_materiais: projectData.listaMateriais || [],
      disjuntor_padrao_entrada: projectData.disjuntorPadraoEntrada || null,
      tipo_ligacao: projectData.tipoLigacao || null,
      tensao_nominal: projectData.tensaoNominal || null,
      coordenadas: projectData.coordenadas || null,
      endereco_instalacao: projectData.enderecoInstalacao || null,
      
      // Campos JSONB
      timeline_events: [],
      documents: [],
      files: [],
      comments: [],
      history: [],
      
      // Configurações
      settings: {
        notifications_enabled: true,
        auto_timeline: true,
        require_approval: false
      }
      
      // Nota: o campo 'number' será gerado automaticamente pelo trigger do banco
    }

    // 4. Criar projeto no banco
    const { data: newProject, error: createError } = await supabase
      .from('projects')
      .insert(projectToCreate)
      .select(`
        id,
        name,
        number,
        tenant_id,
        created_by,
        empresa_integradora,
        nome_cliente_final,
        distribuidora,
        potencia,
        data_entrega,
        status,
        prioridade,
        valor_projeto,
        created_at,
        updated_at
      `)
      .single()

    if (createError || !newProject) {
      devLog.error('[createProjectMultiTenant] Erro ao criar projeto:', createError)
      return { error: 'Erro ao criar projeto no banco de dados' }
    }

    // 5. Adicionar evento inicial na timeline
    try {
      await supabase.rpc('add_timeline_event', {
        project_id: newProject.id,
        event_type: 'project_created',
        event_description: `Projeto "${newProject.name}" criado por ${user.name || user.email}`,
        created_by_id: user.id
      })
    } catch (timelineError) {
      devLog.warn('[createProjectMultiTenant] Erro ao adicionar evento na timeline:', timelineError)
      // Não falhar a criação por causa da timeline
    }

    // 6. Criar notificação para admins da organização
    try {
      await supabase.rpc('create_notification', {
        org_id: tenantId,
        target_user_id: user.id, // Pode ser melhorado para notificar outros admins
        notification_title: 'Novo Projeto Criado',
        notification_message: `O projeto "${newProject.name}" foi criado com sucesso.`,
        notification_type: 'success',
        notification_category: 'project',
        notification_data: { 
          project_id: newProject.id,
          project_number: newProject.number,
          created_by: user.name || user.email
        },
        created_by_id: user.id
      })
    } catch (notificationError) {
      devLog.warn('[createProjectMultiTenant] Erro ao criar notificação:', notificationError)
      // Não falhar a criação por causa da notificação
    }

    devLog.log('[createProjectMultiTenant] Projeto criado com sucesso:', {
      projectId: newProject.id,
      projectNumber: newProject.number,
      tenantId,
      userId: user.id
    })

    // 7. Revalidar cache das páginas relevantes
    revalidatePath('/admin/projetos')
    revalidatePath('/admin/painel')
    revalidatePath('/cliente/projetos')
    revalidatePath('/cliente/painel')

    return {
      data: newProject as Project,
      message: 'Projeto criado com sucesso!'
    }

  } catch (error) {
    devLog.error('[createProjectMultiTenant] Erro inesperado:', error)
    return {
      error: 'Erro interno',
      message: 'Erro inesperado ao criar projeto. Tente novamente.'
    }
  }
}

/**
 * Server Action para obter projetos da organização do usuário
 */
export async function getProjectsByTenant(
  user: { id: string },
  filters?: {
    status?: string
    prioridade?: string
    search?: string
    limit?: number
    offset?: number
  }
): Promise<{ data?: Project[]; error?: string; total?: number }> {
  try {
    if (!user.id) {
      return { error: 'Usuário não autenticado' }
    }

    const supabase = createSupabaseServiceRoleClient()

    // 1. Obter tenant_id do usuário
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.tenant_id) {
      return { error: 'Usuário não encontrado ou sem organização' }
    }

    // 2. Construir query base
    let query = supabase
      .from('projects')
      .select(`
        id,
        name,
        number,
        status,
        prioridade,
        valor_projeto,
        data_entrega,
        empresa_integradora,
        nome_cliente_final,
        created_at,
        updated_at
      `, { count: 'exact' })
      .eq('tenant_id', userData.tenant_id)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })

    // 3. Aplicar filtros
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.prioridade) {
      query = query.eq('prioridade', filters.prioridade)
    }

    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,number.ilike.%${filters.search}%,nome_cliente_final.ilike.%${filters.search}%`)
    }

    if (filters?.limit) {
      query = query.limit(filters.limit)
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
    }

    // 4. Executar query
    const { data: projects, error, count } = await query

    if (error) {
      devLog.error('[getProjectsByTenant] Erro ao buscar projetos:', error)
      return { error: 'Erro ao buscar projetos' }
    }

    return {
      data: projects as Project[],
      total: count || 0
    }

  } catch (error) {
    devLog.error('[getProjectsByTenant] Erro inesperado:', error)
    return { error: 'Erro interno ao buscar projetos' }
  }
}

/**
 * Server Action para atualizar projeto com verificações multi-tenant
 */
export async function updateProjectMultiTenant(
  projectId: string,
  updates: Partial<Project>,
  user: { id: string; email?: string | null; name?: string | null }
): Promise<{ data?: Project; error?: string; message?: string }> {
  try {
    if (!user.id || !projectId) {
      return { error: 'Parâmetros obrigatórios não fornecidos' }
    }

    const supabase = createSupabaseServiceRoleClient()

    // 1. Verificar se projeto existe e usuário tem acesso
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, tenant_id, created_by, name, status')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return { error: 'Projeto não encontrado' }
    }

    // 2. Verificar se usuário pertence ao mesmo tenant
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData || userData.tenant_id !== project.tenant_id) {
      return { error: 'Acesso negado ao projeto' }
    }

    // 3. Verificar permissões (criador ou admin)
    const canEdit = project.created_by === user.id || ['admin', 'superadmin'].includes(userData.role)
    
    if (!canEdit) {
      return { error: 'Sem permissão para editar este projeto' }
    }

    // 4. Preparar dados de atualização
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString(),
      last_update_by: {
        id: user.id,
        name: user.name,
        email: user.email,
        timestamp: new Date().toISOString()
      }
    }

    // Remover campos que não devem ser atualizados
    delete (updateData as any).id
    delete (updateData as any).tenant_id
    delete (updateData as any).created_by
    delete (updateData as any).created_at

    // 5. Atualizar projeto
    const { data: updatedProject, error: updateError } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', projectId)
      .select()
      .single()

    if (updateError || !updatedProject) {
      devLog.error('[updateProjectMultiTenant] Erro ao atualizar projeto:', updateError)
      return { error: 'Erro ao atualizar projeto' }
    }

    // 6. Adicionar evento na timeline se status mudou
    if (updates.status && updates.status !== project.status) {
      try {
        await supabase.rpc('add_timeline_event', {
          project_id: projectId,
          event_type: 'status_changed',
          event_description: `Status alterado de "${project.status}" para "${updates.status}" por ${user.name || user.email}`,
          created_by_id: user.id
        })
      } catch (timelineError) {
        devLog.warn('[updateProjectMultiTenant] Erro ao adicionar evento na timeline:', timelineError)
      }
    }

    devLog.log('[updateProjectMultiTenant] Projeto atualizado com sucesso:', {
      projectId,
      tenantId: project.tenant_id,
      userId: user.id,
      changes: Object.keys(updates)
    })

    // 7. Revalidar cache
    revalidatePath('/admin/projetos')
    revalidatePath('/admin/painel')
    revalidatePath('/cliente/projetos')
    revalidatePath(`/admin/projetos/${projectId}`)

    return {
      data: updatedProject as Project,
      message: 'Projeto atualizado com sucesso!'
    }

  } catch (error) {
    devLog.error('[updateProjectMultiTenant] Erro inesperado:', error)
    return { error: 'Erro interno ao atualizar projeto' }
  }
}

/**
 * Server Action para deletar/arquivar projeto
 */
export async function deleteProjectMultiTenant(
  projectId: string,
  user: { id: string; email?: string | null }
): Promise<{ success?: boolean; error?: string; message?: string }> {
  try {
    if (!user.id || !projectId) {
      return { error: 'Parâmetros obrigatórios não fornecidos' }
    }

    const supabase = createSupabaseServiceRoleClient()

    // 1. Verificar permissões (apenas admins podem deletar)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData || !['admin', 'superadmin'].includes(userData.role)) {
      return { error: 'Apenas administradores podem deletar projetos' }
    }

    // 2. Verificar se projeto existe e pertence ao tenant
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, tenant_id, name')
      .eq('id', projectId)
      .eq('tenant_id', userData.tenant_id)
      .single()

    if (projectError || !project) {
      return { error: 'Projeto não encontrado' }
    }

    // 3. Arquivar projeto (não deletar fisicamente)
    const { error: archiveError } = await supabase
      .rpc('archive_project', {
        project_id: projectId,
        archived_by_id: user.id
      })

    if (archiveError) {
      devLog.error('[deleteProjectMultiTenant] Erro ao arquivar projeto:', archiveError)
      return { error: 'Erro ao arquivar projeto' }
    }

    devLog.log('[deleteProjectMultiTenant] Projeto arquivado com sucesso:', {
      projectId,
      projectName: project.name,
      tenantId: project.tenant_id,
      archivedBy: user.id
    })

    // 4. Revalidar cache
    revalidatePath('/admin/projetos')
    revalidatePath('/admin/painel')

    return {
      success: true,
      message: 'Projeto arquivado com sucesso!'
    }

  } catch (error) {
    devLog.error('[deleteProjectMultiTenant] Erro inesperado:', error)
    return { error: 'Erro interno ao arquivar projeto' }
  }
}
