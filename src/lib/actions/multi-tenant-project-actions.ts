'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServiceRoleClient } from '@/lib/supabase/server'
import { devLog } from '@/lib/utils/productionLogger'
import { Project, CreateProjectClientData } from '@/types/project'
import { User } from '@/types/user'
import { notifyNewProject } from '@/lib/services/notificationService'
import { getAllAdminUsersByTenant } from '@/lib/services/userService/core'
import { sendBillingNotifications } from '@/lib/services/billingNotificationService'

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
      projectName: projectData.nome_cliente_final || 'Sem nome'
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

    // ✅ CÁLCULO AUTOMÁTICO: Calcular valor do projeto antes de criar
    let valorCalculado = projectData.valorProjeto || 0;

    if (projectData.potencia && projectData.potencia >= 0) {
      try {
        // Buscar configuração de faixas de potência do tenant
        const { data: configData } = await supabase
          .from('configs')
          .select('value')
          .eq('key', 'faixas_potencia')
          .eq('tenant_id', tenantId)
          .maybeSingle();

        if (configData?.value) {
          const faixas = Array.isArray(configData.value) ? configData.value : JSON.parse(configData.value);

          // Encontrar faixa correspondente
          const faixaEncontrada = faixas.find((f: any) =>
            projectData.potencia! >= f.potenciaMin && projectData.potencia! < f.potenciaMax
          );

          if (faixaEncontrada) {
            valorCalculado = faixaEncontrada.valorBase;
            devLog.log('[createProjectMultiTenant] Valor calculado automaticamente:', {
              potencia: projectData.potencia,
              faixa: faixaEncontrada,
              valorCalculado
            });
          }
        }
      } catch (calcError) {
        devLog.error('[createProjectMultiTenant] Erro ao calcular valor automático:', calcError);
        // Continuar com valor do formulário em caso de erro
      }
    }

    // 2. ✅ NOVO SISTEMA: Verificar modalidade de faturamento e quota disponível
    let billingMode: 'avulso' | 'pacote' | 'assinatura' = 'avulso'
    let billingSnapshot: any = null
    const billingWarnings: Array<{ type: string; severity?: 'low' | 'medium' | 'high'; message: string }> = []

    let pacoteAtivo: any = null
    let assinaturaAtiva: any = null

    devLog.log('[createProjectMultiTenant] Verificando modalidade de faturamento do usuário')

    // 2.1. Buscar pacote ativo do usuário
    const { data: pacotesData, error: pacotesError } = await supabase
      .from('cliente_pacotes')
      .select(`
        id,
        pacote_id,
        projetos_inclusos,
        projetos_usados,
        data_expiracao,
        status,
        pacotes_definicoes:pacote_id (
          nome,
          quantidade_projetos,
          valor,
          validade_dias
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'ativo')
      .gte('data_expiracao', new Date().toISOString())
      .order('data_expiracao', { ascending: false })
      .limit(1)

    if (pacotesData && pacotesData.length > 0) {
      pacoteAtivo = pacotesData[0]
      devLog.log('[createProjectMultiTenant] Pacote ativo encontrado:', {
        pacoteId: pacoteAtivo.id,
        projetosInclusos: pacoteAtivo.projetos_inclusos,
        projetosUsados: pacoteAtivo.projetos_usados,
        projetosDisponiveis: pacoteAtivo.projetos_inclusos - pacoteAtivo.projetos_usados
      })
    }

    // 2.2. Buscar assinatura ativa do usuário
    const { data: assinaturasData, error: assinaturasError } = await supabase
      .from('cliente_assinaturas')
      .select(`
        id,
        plano_id,
        projetos_mensais,
        projetos_usados_mes_atual,
        dia_renovacao,
        proximo_reset,
        status,
        planos_assinatura:plano_id (
          nome,
          quantidade_mensal,
          valor_mensal,
          dia_renovacao
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'ativa')
      .order('data_inicio', { ascending: false })
      .limit(1)

    if (assinaturasData && assinaturasData.length > 0) {
      assinaturaAtiva = assinaturasData[0]
      devLog.log('[createProjectMultiTenant] Assinatura ativa encontrada:', {
        assinaturaId: assinaturaAtiva.id,
        projetosMensais: assinaturaAtiva.projetos_mensais,
        projetosUsados: assinaturaAtiva.projetos_usados_mes_atual,
        projetosDisponiveis: assinaturaAtiva.projetos_mensais - assinaturaAtiva.projetos_usados_mes_atual
      })
    }

    // 2.3. Determinar modalidade de faturamento e validar quota
    if (pacoteAtivo) {
      const projetosDisponiveis = pacoteAtivo.projetos_inclusos - pacoteAtivo.projetos_usados

      // Verificar se pacote ainda tem quota
      if (projetosDisponiveis > 0) {
        billingMode = 'pacote'
        billingSnapshot = {
          mode: 'pacote',
          pacote_id: pacoteAtivo.id,
          pacote_nome: pacoteAtivo.pacotes_definicoes?.nome || 'Pacote',
          projetos_inclusos: pacoteAtivo.projetos_inclusos,
          projetos_usados_antes: pacoteAtivo.projetos_usados,
          projetos_usados_depois: pacoteAtivo.projetos_usados + 1,
          data_expiracao: pacoteAtivo.data_expiracao,
          timestamp: new Date().toISOString()
        }
        devLog.log('[createProjectMultiTenant] Projeto será criado com PACOTE (quota disponível)')
      } else {
        // Pacote esgotado - projeto será avulso
        billingMode = 'avulso'
        billingWarnings.push({
          type: 'package_exhausted',
          severity: 'high',
          message: 'Pacote esgotado - projeto será cobrado como avulso'
        })
        devLog.warn('[createProjectMultiTenant] Pacote esgotado - projeto será avulso')
      }

      // Verificar se pacote está próximo de expirar
      const diasParaExpirar = Math.ceil(
        (new Date(pacoteAtivo.data_expiracao).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      )
      if (diasParaExpirar <= 7 && diasParaExpirar > 0) {
        billingWarnings.push({
          type: 'package_expiring_soon',
          severity: 'medium',
          message: `Pacote expira em ${diasParaExpirar} dias`
        })
      }
    } else if (assinaturaAtiva) {
      const projetosDisponiveis = assinaturaAtiva.projetos_mensais - assinaturaAtiva.projetos_usados_mes_atual

      // Verificar se assinatura ainda tem quota mensal
      if (projetosDisponiveis > 0) {
        billingMode = 'assinatura'
        billingSnapshot = {
          mode: 'assinatura',
          assinatura_id: assinaturaAtiva.id,
          plano_nome: assinaturaAtiva.planos_assinatura?.nome || 'Assinatura',
          projetos_mensais: assinaturaAtiva.projetos_mensais,
          projetos_usados_antes: assinaturaAtiva.projetos_usados_mes_atual,
          projetos_usados_depois: assinaturaAtiva.projetos_usados_mes_atual + 1,
          dia_renovacao: assinaturaAtiva.dia_renovacao,
          proximo_reset: assinaturaAtiva.proximo_reset,
          timestamp: new Date().toISOString()
        }
        devLog.log('[createProjectMultiTenant] Projeto será criado com ASSINATURA (quota disponível)')
      } else {
        // Assinatura esgotada - projeto será avulso
        billingMode = 'avulso'
        billingWarnings.push({
          type: 'subscription_exhausted',
          severity: 'high',
          message: 'Cota mensal esgotada - projeto será cobrado como avulso'
        })
        devLog.warn('[createProjectMultiTenant] Assinatura esgotada - projeto será avulso')
      }
    } else {
      // Nenhum pacote ou assinatura - projeto avulso
      billingMode = 'avulso'
      billingSnapshot = {
        mode: 'avulso',
        potencia: projectData.potencia || 0,
        valor_projeto: valorCalculado,
        timestamp: new Date().toISOString()
      }
      devLog.log('[createProjectMultiTenant] Projeto será criado como AVULSO (sem pacote/assinatura)')
    }

    // 3. Verificar se pode criar projetos (limites organizacionais + trial)
    // ✅ CORREÇÃO: Pular verificação de limites se usuário tem pacote/assinatura ativo
    // Usuários com pacote/assinatura podem criar projetos como avulso mesmo com quota esgotada
    const hasPacoteOuAssinatura = pacoteAtivo || assinaturaAtiva

    if (!hasPacoteOuAssinatura) {
      devLog.log('[createProjectMultiTenant] Verificando limites organizacionais (sem pacote/assinatura)')

      const { data: canCreate, error: limitError } = await supabase
        .rpc('can_create_resource', {
          org_id: tenantId,
          resource_type: 'projects'
        })

      if (limitError) {
        devLog.error('[createProjectMultiTenant] Erro ao verificar limite:', limitError)
        // ✅ CORREÇÃO: Não bloquear se RPC falhar - permitir criação
        devLog.warn('[createProjectMultiTenant] Erro ao verificar limites, mas permitindo criação')
      } else if (!canCreate) {
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
    } else {
      devLog.log('[createProjectMultiTenant] Pulando verificação de limites - usuário tem pacote/assinatura ativo')
    }

    // 4. Preparar dados do projeto
    const projectToCreate = {
      // Campos obrigatórios multi-tenant
      tenant_id: tenantId,
      created_by: user.id,
      owner_id: projectData.owner_id || user.id, // ✅ CORRIGIDO: Adicionar owner_id (admin pode passar owner_id diferente)

      // Dados básicos
      name: projectData.nomeClienteFinal || projectData.nome_cliente_final || 'Projeto sem nome',
      description: projectData.description || '',

      // Dados específicos de energia solar
      empresa_integradora: projectData.empresaIntegradora || '',
      nome_cliente_final: projectData.nomeClienteFinal || projectData.nome_cliente_final || '',
      distribuidora: projectData.distribuidora || '',
      potencia: projectData.potencia || 0,
      data_entrega: projectData.dataEntrega || null,

      // ✅ NOVOS CAMPOS: CPF/CNPJ e Endereço (opcionais)
      cpf_cnpj_cliente_final: projectData.cpf_cnpj_cliente_final || null,
      endereco_local: projectData.endereco_local || null,
      havera_beneficiarias: projectData.havera_beneficiarias || false, // ✅ CORRIGIDO: Adicionar campo faltante

      // Status e prioridade
      status: 'nao-iniciado', // ✅ CORRIGIDO: Usar slug ao invés de name
      prioridade: projectData.prioridade || 'Baixa',

      // Campos financeiros
      valor_projeto: valorCalculado, // ✅ USAR VALOR CALCULADO AUTOMATICAMENTE
      pagamento: projectData.pagamento || 'pendente', // ✅ CORRIGIDO: Default 'pendente' como no OLD

      // ✅ NOVO SISTEMA: Modalidade de faturamento
      billing_mode: billingMode,
      billing_snapshot: billingSnapshot,

      // ✅ CORRIGIDO: FKs para vincular projeto ao pacote/assinatura específico
      cliente_pacote_id: billingMode === 'pacote' && pacoteAtivo ? pacoteAtivo.id : null,
      cliente_assinatura_id: billingMode === 'assinatura' && assinaturaAtiva ? assinaturaAtiva.id : null,
      
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
      },

      // ✅ CORRIGIDO: Metadados de última atualização
      last_update_by: {
        uid: user.id,
        email: user.email || null,
        name: user.name || user.email || 'Usuário',
        role: userData.role || 'cliente',
        timestamp: new Date().toISOString()
      }

      // ✅ ISOLAMENTO MULTI-TENANT IMPLEMENTADO (2025-01-11)
      // O campo 'number' é gerado automaticamente pelo trigger do banco:
      // - Trigger: set_project_number_by_tenant
      // - Função: generate_project_number_by_tenant()
      // - Formato: FV-YYYY-NNN (ex: FV-2025-001)
      // - Isolamento: Cada tenant tem sua própria sequência numérica
      // - Script: scripts/fix-project-number-by-tenant.sql
    }

    // Log detalhado do objeto antes do insert
    devLog.log('[createProjectMultiTenant] Dados que serão inseridos:', {
      tenant_id: projectToCreate.tenant_id,
      created_by: projectToCreate.created_by,
      name: projectToCreate.name,
      status: projectToCreate.status,
      billing_mode: projectToCreate.billing_mode,
      billing_snapshot: projectToCreate.billing_snapshot
    })

    // 4. Criar projeto no banco
    const { data: newProject, error: createError } = await supabase
      .from('projects')
      .insert(projectToCreate)
      .select('*')
      .single()

    if (createError || !newProject) {
      devLog.error('[createProjectMultiTenant] Erro ao criar projeto:', {
        error: createError,
        message: createError?.message,
        details: createError?.details,
        hint: createError?.hint,
        code: createError?.code
      })
      return {
        error: 'Erro ao criar projeto no banco de dados',
        message: createError?.message || 'Erro desconhecido ao inserir projeto'
      }
    }

    // 5. ✅ NOVO SISTEMA: Decrementar quota de pacote/assinatura
    try {
      if (billingMode === 'pacote' && pacoteAtivo) {
        devLog.log('[createProjectMultiTenant] Decrementando quota do pacote:', pacoteAtivo.id)

        const { error: updatePacoteError } = await supabase
          .from('cliente_pacotes')
          .update({
            projetos_usados: pacoteAtivo.projetos_usados + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', pacoteAtivo.id)

        if (updatePacoteError) {
          devLog.error('[createProjectMultiTenant] Erro ao decrementar quota do pacote:', updatePacoteError)
          // Não falhar a criação por causa da quota
        } else {
          devLog.log('[createProjectMultiTenant] Quota do pacote decrementada com sucesso')
        }
      } else if (billingMode === 'assinatura' && assinaturaAtiva) {
        devLog.log('[createProjectMultiTenant] Decrementando quota da assinatura:', assinaturaAtiva.id)

        const { error: updateAssinaturaError } = await supabase
          .from('cliente_assinaturas')
          .update({
            projetos_usados_mes_atual: assinaturaAtiva.projetos_usados_mes_atual + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', assinaturaAtiva.id)

        if (updateAssinaturaError) {
          devLog.error('[createProjectMultiTenant] Erro ao decrementar quota da assinatura:', updateAssinaturaError)
          // Não falhar a criação por causa da quota
        } else {
          devLog.log('[createProjectMultiTenant] Quota da assinatura decrementada com sucesso')
        }
      }
    } catch (quotaError) {
      devLog.error('[createProjectMultiTenant] Erro ao decrementar quota:', quotaError)
      // Não falhar a criação por causa da quota
    }

    // 6. Adicionar evento inicial na timeline
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

    // 7. ✅ NOVO SISTEMA: Criar notificação e enviar email para admins da organização
    try {
      devLog.log('[createProjectMultiTenant] ✅ NOVO SISTEMA: Chamando notifyNewProject');

      // ✅ CORREÇÃO: Remover busca duplicada - notifyNewProject já faz isso internamente
      const result = await notifyNewProject({
        projectId: newProject.id,
        projectNumber: newProject.number,
        projectName: newProject.nome_cliente_final || newProject.name || 'Novo Projeto',
        clientName: user.name || user.email || 'Cliente',
        clientId: user.id,
        potencia: projectToCreate.potencia,
        distribuidora: projectToCreate.distribuidora,
        senderId: user.id,
        senderName: user.name || user.email
      });

      devLog.log('[createProjectMultiTenant] ✅ NOVO SISTEMA: Resultado notifyNewProject:', {
        notificationIds: result.notificationIds.length,
        emailSent: result.emailSent
      });

      if (result.notificationIds.length > 0 || result.emailSent) {
        devLog.log('[createProjectMultiTenant] Notificações e emails enviados com sucesso');
      } else {
        devLog.warn('[createProjectMultiTenant] Nenhuma notificação foi criada - verificar logs');
      }
    } catch (notificationError) {
      devLog.error('[createProjectMultiTenant] ❌ ERRO ao criar notificação/email:', notificationError);
      // Não falhar a criação por causa da notificação
    }

    // 8. ✅ NOVO SISTEMA: Enviar notificações de billing (pacote/assinatura esgotado)
    try {
      if (billingWarnings.length > 0) {
        devLog.log('[createProjectMultiTenant] ✅ NOVO SISTEMA: Enviando notificações de billing:', {
          warningsCount: billingWarnings.length,
          billingMode
        });

        await sendBillingNotifications({
          projectId: newProject.id,
          projectNumber: newProject.number,
          userId: user.id,
          userName: user.name || 'Cliente',
          userEmail: user.email || 'cliente@exemplo.com',
          billingMode,
          warnings: billingWarnings,
          potencia: projectToCreate.potencia,
          pacoteNome: pacoteAtivo?.pacotes_definicoes?.nome,
          assinaturaNome: assinaturaAtiva?.planos_assinatura?.nome
        });

        devLog.log('[createProjectMultiTenant] ✅ NOVO SISTEMA: Notificações de billing enviadas com sucesso');
      } else {
        devLog.log('[createProjectMultiTenant] Nenhum warning de billing - notificações não necessárias');
      }
    } catch (billingNotificationError) {
      devLog.error('[createProjectMultiTenant] ❌ ERRO ao enviar notificações de billing:', billingNotificationError);
      // Não falhar a criação por causa das notificações
    }

    devLog.log('[createProjectMultiTenant] Projeto criado com sucesso:', {
      projectId: newProject.id,
      projectNumber: newProject.number,
      tenantId,
      userId: user.id,
      billingMode,
      billingSnapshot
    })

    // 9. Revalidar cache das páginas relevantes
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
      query = query.or(`nome_cliente_final.ilike.%${filters.search}%,number.ilike.%${filters.search}%`)
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
