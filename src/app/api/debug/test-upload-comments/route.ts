import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';

/**
 * API de debug para testar upload de arquivos e comentários
 * 
 * Casos de teste:
 * 1. Verificar se usuário pode acessar projeto
 * 2. Testar adição de comentário
 * 3. Verificar configuração do storage
 * 4. Simular upload de arquivo
 * 
 * USO:
 * GET /api/debug/test-upload-comments?action=check_access&userId=ID&projectId=ID
 * GET /api/debug/test-upload-comments?action=test_comment&userId=ID&projectId=ID
 * GET /api/debug/test-upload-comments?action=storage_config
 * GET /api/debug/test-upload-comments?action=list_projects&userId=ID
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');
    const projectId = searchParams.get('projectId');

    devLog.log('[DEBUG Upload Comments] Ação solicitada:', { action, userId, projectId });

    const supabase = createSupabaseServiceRoleClient();

    switch (action) {
      case 'check_access':
        if (!userId) {
          return NextResponse.json({
            error: 'userId é obrigatório',
            usage: '/api/debug/test-upload-comments?action=check_access&userId=ID&projectId=ID'
          }, { status: 400 });
        }

        // Verificar dados do usuário
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, tenant_id, role, name, email, status')
          .eq('id', userId)
          .single();

        if (userError || !userData) {
          return NextResponse.json({
            success: false,
            error: 'Usuário não encontrado',
            details: userError?.message
          }, { status: 404 });
        }

        // Se projectId fornecido, verificar acesso ao projeto
        let projectAccess = null;
        if (projectId) {
          const { data: projectData, error: projectError } = await supabase
            .from('projects')
            .select('id, nome_cliente_final, created_by, tenant_id, status')
            .eq('id', projectId)
            .single();

          if (projectError || !projectData) {
            projectAccess = {
              hasAccess: false,
              error: 'Projeto não encontrado',
              details: projectError?.message
            };
          } else {
            const hasAccess = 
              projectData.tenant_id === userData.tenant_id && // Mesmo tenant
              (userData.role === 'admin' || userData.role === 'superadmin' || projectData.created_by === userId); // Admin ou dono

            projectAccess = {
              hasAccess,
              project: projectData,
              reason: hasAccess ? 'Acesso permitido' : 'Sem permissão (tenant diferente ou não é dono/admin)'
            };
          }
        }

        return NextResponse.json({
          success: true,
          userData,
          projectAccess,
          canUploadFiles: userData.status === 'active' && (projectAccess?.hasAccess !== false),
          canAddComments: userData.status === 'active' && (projectAccess?.hasAccess !== false)
        });

      case 'test_comment':
        if (!userId || !projectId) {
          return NextResponse.json({
            error: 'userId e projectId são obrigatórios',
            usage: '/api/debug/test-upload-comments?action=test_comment&userId=ID&projectId=ID'
          }, { status: 400 });
        }

        try {
          // Importar e testar addCommentAction
          const { addCommentAction } = await import('@/lib/actions/project-actions');
          
          // Buscar dados do usuário para o teste
          const { data: testUser, error: testUserError } = await supabase
            .from('users')
            .select('id, name, email, role')
            .eq('id', userId)
            .single();

          if (testUserError || !testUser) {
            return NextResponse.json({
              success: false,
              error: 'Usuário não encontrado para teste',
              details: testUserError?.message
            }, { status: 404 });
          }

          const testComment = {
            text: `Comentário de teste - ${new Date().toLocaleTimeString()}`,
            timestamp: new Date().toISOString()
          };

          const userForAction = {
            id: testUser.id,
            email: testUser.email,
            name: testUser.name || testUser.email,
            role: testUser.role
          };

          const result = await addCommentAction(projectId, testComment, userForAction);

          return NextResponse.json({
            success: !result.error,
            testResult: result,
            testData: {
              userId,
              projectId,
              comment: testComment,
              user: userForAction
            }
          });

        } catch (error) {
          return NextResponse.json({
            success: false,
            error: 'Erro ao testar comentário',
            details: error instanceof Error ? error.message : 'Erro desconhecido'
          }, { status: 500 });
        }

      case 'storage_config':
        // Verificar configuração do Supabase Storage
        const storageConfig = {
          supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          serviceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
          storageBucket: process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'project-files',
          timestamp: new Date().toISOString()
        };

        // Testar conexão com storage
        let storageTest = null;
        try {
          const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
          storageTest = {
            success: !bucketsError,
            buckets: buckets?.map(b => b.name) || [],
            error: bucketsError?.message
          };
        } catch (storageError) {
          storageTest = {
            success: false,
            error: storageError instanceof Error ? storageError.message : 'Erro ao testar storage'
          };
        }

        return NextResponse.json({
          success: true,
          storageConfig,
          storageTest
        });

      case 'list_projects':
        if (!userId) {
          return NextResponse.json({
            error: 'userId é obrigatório',
            usage: '/api/debug/test-upload-comments?action=list_projects&userId=ID'
          }, { status: 400 });
        }

        // Buscar projetos do usuário para teste
        const { data: userForProjects, error: userForProjectsError } = await supabase
          .from('users')
          .select('tenant_id, role')
          .eq('id', userId)
          .single();

        if (userForProjectsError || !userForProjects) {
          return NextResponse.json({
            success: false,
            error: 'Usuário não encontrado',
            details: userForProjectsError?.message
          }, { status: 404 });
        }

        const { data: projects, error: projectsError } = await supabase
          .from('projects')
          .select('id, nome_cliente_final, number, created_by, status, tenant_id')
          .eq('tenant_id', userForProjects.tenant_id)
          .limit(10);

        return NextResponse.json({
          success: true,
          projects: projects || [],
          userRole: userForProjects.role,
          tenantId: userForProjects.tenant_id,
          canAccessProjects: projects?.length || 0
        });

      default:
        return NextResponse.json({
          error: 'Ação inválida',
          availableActions: ['check_access', 'test_comment', 'storage_config', 'list_projects'],
          usage: {
            checkAccess: '/api/debug/test-upload-comments?action=check_access&userId=ID&projectId=ID',
            testComment: '/api/debug/test-upload-comments?action=test_comment&userId=ID&projectId=ID',
            storageConfig: '/api/debug/test-upload-comments?action=storage_config',
            listProjects: '/api/debug/test-upload-comments?action=list_projects&userId=ID'
          }
        }, { status: 400 });
    }

  } catch (error) {
    devLog.error('[DEBUG Upload Comments] Erro:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
