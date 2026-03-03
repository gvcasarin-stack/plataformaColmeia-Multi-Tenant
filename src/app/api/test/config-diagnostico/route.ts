import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { randomUUID } from 'crypto';

/**
 * API DE DIAGNÓSTICO - Testar INSERT na tabela configs
 *
 * Como usar:
 * 1. Acesse em produção: https://seu-tenant.gerenciamentofotovoltaico.com.br/api/test/config-diagnostico
 * 2. Veja a resposta JSON completa com todos os detalhes do erro
 */
export async function GET(request: NextRequest) {
  const diagnostico: any = {
    timestamp: new Date().toISOString(),
    etapas: []
  };

  try {
    // ETAPA 1: Verificar headers
    diagnostico.etapas.push({
      etapa: '1. Verificar headers',
      status: 'iniciando...'
    });

    const headersList = headers();
    const tenantId = headersList.get('x-tenant-id');

    diagnostico.headers = {
      'x-tenant-id': tenantId,
      'x-tenant-slug': headersList.get('x-tenant-slug'),
      'x-tenant-name': headersList.get('x-tenant-name'),
    };

    diagnostico.etapas[0].status = tenantId ? '✅ Headers OK' : '❌ Tenant ID ausente';
    diagnostico.etapas[0].tenantId = tenantId;

    if (!tenantId) {
      return NextResponse.json({
        success: false,
        error: 'Tenant ID não encontrado',
        diagnostico
      }, { status: 400 });
    }

    // ETAPA 2: Verificar variáveis de ambiente
    diagnostico.etapas.push({
      etapa: '2. Verificar variáveis de ambiente',
      status: 'verificando...'
    });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    diagnostico.env = {
      hasUrl: !!supabaseUrl,
      urlPrefix: supabaseUrl?.substring(0, 30),
      hasServiceKey: !!supabaseKey,
      keyLength: supabaseKey?.length,
      isPlaceholder: supabaseUrl?.includes('placeholder')
    };

    diagnostico.etapas[1].status = supabaseUrl && supabaseKey ? '✅ Variáveis OK' : '❌ Variáveis faltando';

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        success: false,
        error: 'Variáveis de ambiente faltando',
        diagnostico
      }, { status: 500 });
    }

    if (supabaseUrl.includes('placeholder')) {
      return NextResponse.json({
        success: false,
        error: 'Usando credenciais placeholder',
        diagnostico
      }, { status: 500 });
    }

    // ETAPA 3: Criar cliente Supabase
    diagnostico.etapas.push({
      etapa: '3. Criar cliente Supabase',
      status: 'criando...'
    });

    let supabase;
    try {
      supabase = createSupabaseServiceRoleClient();
      diagnostico.etapas[2].status = '✅ Cliente criado';
    } catch (error: any) {
      diagnostico.etapas[2].status = '❌ Erro ao criar cliente';
      diagnostico.etapas[2].error = {
        message: error.message,
        stack: error.stack
      };
      return NextResponse.json({
        success: false,
        error: 'Erro ao criar cliente Supabase',
        diagnostico
      }, { status: 500 });
    }

    // ETAPA 4: Buscar usuário para created_by
    diagnostico.etapas.push({
      etapa: '4. Buscar usuário para created_by',
      status: 'buscando...'
    });

    let userId: string | null = null;

    try {
      // Tentar buscar admin/superadmin primeiro
      const { data: adminUser, error: adminError } = await supabase
        .from('users')
        .select('id, role, email')
        .eq('tenant_id', tenantId)
        .in('role', ['superadmin', 'admin'])
        .limit(1)
        .maybeSingle();

      if (adminUser && !adminError) {
        userId = adminUser.id;
        diagnostico.etapas[3].status = '✅ Admin encontrado';
        diagnostico.etapas[3].admin = {
          id: adminUser.id,
          role: adminUser.role,
          email: adminUser.email
        };
      } else {
        diagnostico.etapas[3].status = '⚠️ Admin não encontrado, buscando qualquer usuário...';
        diagnostico.etapas[3].adminError = adminError;

        // Se não encontrou admin, buscar qualquer usuário do tenant
        const { data: anyUser, error: anyUserError } = await supabase
          .from('users')
          .select('id, role, email')
          .eq('tenant_id', tenantId)
          .limit(1)
          .maybeSingle();

        if (anyUser && !anyUserError) {
          userId = anyUser.id;
          diagnostico.etapas[3].status = '✅ Usuário encontrado';
          diagnostico.etapas[3].user = {
            id: anyUser.id,
            role: anyUser.role,
            email: anyUser.email
          };
        } else {
          diagnostico.etapas[3].status = '❌ Nenhum usuário encontrado';
          diagnostico.etapas[3].userError = anyUserError;

          // Contar quantos usuários existem no tenant
          const { count } = await supabase
            .from('users')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId);

          diagnostico.etapas[3].userCount = count;
        }
      }
    } catch (error: any) {
      diagnostico.etapas[3].status = '❌ Exceção ao buscar usuário';
      diagnostico.etapas[3].error = {
        message: error.message,
        stack: error.stack
      };
    }

    diagnostico.etapas[3].userId = userId;

    // ETAPA 5: Verificar se config já existe
    diagnostico.etapas.push({
      etapa: '5. Verificar config existente',
      status: 'verificando...'
    });

    try {
      const { data: existing, error: checkError } = await supabase
        .from('configs')
        .select('id, key, value')
        .eq('key', 'test_diagnostico')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (checkError) {
        diagnostico.etapas[4].status = '⚠️ Erro ao verificar';
        diagnostico.etapas[4].error = {
          message: checkError.message,
          code: checkError.code,
          details: checkError.details,
          hint: checkError.hint
        };
      } else {
        diagnostico.etapas[4].status = existing ? '✅ Config já existe' : '✅ Config não existe';
        diagnostico.etapas[4].existing = existing;
      }
    } catch (error: any) {
      diagnostico.etapas[4].status = '❌ Exceção ao verificar';
      diagnostico.etapas[4].error = {
        message: error.message,
        stack: error.stack
      };
    }

    // ETAPA 6: Buscar categoria válida
    diagnostico.etapas.push({
      etapa: '6. Buscar categoria válida',
      status: 'buscando...'
    });

    let categoryValida = 'general';  // fallback padrão
    try {
      const { data: exampleConfig } = await supabase
        .from('configs')
        .select('category')
        .eq('tenant_id', tenantId)
        .limit(1)
        .maybeSingle();

      if (exampleConfig?.category) {
        categoryValida = exampleConfig.category;
        diagnostico.etapas[5].status = '✅ Categoria válida encontrada';
        diagnostico.etapas[5].category = categoryValida;
      } else {
        diagnostico.etapas[5].status = '⚠️ Nenhuma config existente, usando fallback';
        diagnostico.etapas[5].category = categoryValida;
      }
    } catch (catError: any) {
      diagnostico.etapas[5].status = '⚠️ Erro ao buscar categoria, usando fallback';
      diagnostico.etapas[5].error = {
        message: catError.message
      };
      diagnostico.etapas[5].category = categoryValida;
    }

    // ETAPA 7: Tentar INSERT
    diagnostico.etapas.push({
      etapa: '7. Tentar INSERT',
      status: 'tentando...'
    });

    const testId = randomUUID();
    const testValue = {
      test: true,
      timestamp: new Date().toISOString(),
      message: 'Teste de diagnóstico'
    };

    try {
      const { data: insertData, error: insertError } = await supabase
        .from('configs')
        .insert([{
          id: testId,
          key: 'test_diagnostico',
          value: testValue,
          description: 'Configuração de teste para diagnóstico',
          category: categoryValida,  // ✅ Usar categoria válida do banco
          tenant_id: tenantId,
          is_system: false,
          is_encrypted: false,
          created_by: userId,
          updated_by: userId
        }])
        .select()
        .single();

      if (insertError) {
        diagnostico.etapas[6].status = '❌ Erro no INSERT';
        diagnostico.etapas[6].error = {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint
        };
        diagnostico.etapas[6].insertPayload = {
          id: testId,
          key: 'test_diagnostico',
          tenant_id: tenantId,
          valueType: typeof testValue,
          userId: userId,
          category: categoryValida
        };
      } else {
        diagnostico.etapas[6].status = '✅ INSERT bem-sucedido!';
        diagnostico.etapas[6].insertedData = insertData;
      }
    } catch (error: any) {
      diagnostico.etapas[6].status = '❌ Exceção no INSERT';
      diagnostico.etapas[6].error = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }

    // ETAPA 8: Tentar UPDATE
    diagnostico.etapas.push({
      etapa: '8. Tentar UPDATE',
      status: 'tentando...'
    });

    try {
      const { data: updateData, error: updateError } = await supabase
        .from('configs')
        .update({
          value: { ...testValue, updated: true },
          updated_at: new Date().toISOString()
        })
        .eq('key', 'test_diagnostico')
        .eq('tenant_id', tenantId)
        .select()
        .maybeSingle();

      if (updateError) {
        diagnostico.etapas[7].status = '❌ Erro no UPDATE';
        diagnostico.etapas[7].error = {
          message: updateError.message,
          code: updateError.code,
          details: updateError.details,
          hint: updateError.hint
        };
      } else {
        diagnostico.etapas[7].status = updateData ? '✅ UPDATE bem-sucedido!' : '⚠️ Nenhum registro atualizado';
        diagnostico.etapas[7].updatedData = updateData;
      }
    } catch (error: any) {
      diagnostico.etapas[7].status = '❌ Exceção no UPDATE';
      diagnostico.etapas[7].error = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }

    // ETAPA 9: Limpar teste (DELETE)
    diagnostico.etapas.push({
      etapa: '9. Limpar teste (DELETE)',
      status: 'limpando...'
    });

    try {
      const { error: deleteError } = await supabase
        .from('configs')
        .delete()
        .eq('key', 'test_diagnostico')
        .eq('tenant_id', tenantId);

      if (deleteError) {
        diagnostico.etapas[8].status = '⚠️ Erro ao limpar (não crítico)';
        diagnostico.etapas[8].error = {
          message: deleteError.message,
          code: deleteError.code
        };
      } else {
        diagnostico.etapas[8].status = '✅ Teste limpo';
      }
    } catch (error: any) {
      diagnostico.etapas[8].status = '⚠️ Exceção ao limpar (não crítico)';
      diagnostico.etapas[8].error = {
        message: error.message
      };
    }

    // Resumo final
    const temErro = diagnostico.etapas.some((e: any) => e.status.includes('❌'));
    diagnostico.resumo = {
      sucesso: !temErro,
      mensagem: temErro
        ? 'Encontrados erros durante o diagnóstico'
        : 'Todas as operações funcionaram corretamente!'
    };

    return NextResponse.json({
      success: !temErro,
      diagnostico
    });

  } catch (error: any) {
    diagnostico.erroGeral = {
      message: error.message,
      stack: error.stack,
      name: error.name
    };

    return NextResponse.json({
      success: false,
      error: 'Erro geral no diagnóstico',
      diagnostico
    }, { status: 500 });
  }
}
