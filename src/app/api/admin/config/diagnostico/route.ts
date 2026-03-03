import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { devLog } from "@/lib/utils/productionLogger";
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { randomUUID } from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const diagnostico: any = {
      timestamp: new Date().toISOString(),
      etapa: 'INICIO',
      checks: []
    };

    // 1. Verificar headers
    diagnostico.etapa = 'VERIFICANDO_HEADERS';
    const headersList = headers();
    const tenantId = headersList.get('x-tenant-id');
    
    diagnostico.checks.push({
      nome: 'Tenant ID nos headers',
      sucesso: !!tenantId,
      valor: tenantId || 'NÃO ENCONTRADO',
    });

    // 2. Verificar Service Role Key
    diagnostico.etapa = 'VERIFICANDO_SERVICE_ROLE_KEY';
    diagnostico.checks.push({
      nome: 'Service Role Key configurada',
      sucesso: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      valor: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'CONFIGURADA' : 'NÃO CONFIGURADA',
    });

    // 3. Tentar criar cliente Supabase
    diagnostico.etapa = 'CRIANDO_SUPABASE_CLIENT';
    let supabase;
    try {
      supabase = createSupabaseServiceRoleClient();
      diagnostico.checks.push({
        nome: 'Cliente Supabase criado',
        sucesso: true,
      });
    } catch (error: any) {
      diagnostico.checks.push({
        nome: 'Cliente Supabase criado',
        sucesso: false,
        erro: error.message,
      });
    }

    // 4. Tentar obter user_id
    diagnostico.etapa = 'OBTENDO_USER_ID';
    let userId: string | null = null;
    try {
      const supabaseAuth = createSupabaseServerClient();
      const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
      
      diagnostico.checks.push({
        nome: 'Autenticação do usuário',
        sucesso: !!user && !authError,
        user_id: user?.id || null,
        erro: authError?.message || null,
      });
      
      if (user) {
        userId = user.id;
      }
    } catch (error: any) {
      diagnostico.checks.push({
        nome: 'Autenticação do usuário',
        sucesso: false,
        erro: error.message,
      });
    }

    // 5. Listar TODOS os usuários do tenant para investigação
    if (supabase && tenantId) {
      diagnostico.etapa = 'LISTANDO_USUARIOS_TENANT';
      try {
        const { data: allUsers, error: usersError } = await supabase
          .from('users')
          .select('id, name, email, role')
          .eq('tenant_id', tenantId);

        diagnostico.checks.push({
          nome: 'Listar todos os usuários do tenant',
          sucesso: !usersError,
          total_usuarios: allUsers?.length || 0,
          usuarios: allUsers || [],
          erro: usersError?.message || null,
        });
      } catch (error: any) {
        diagnostico.checks.push({
          nome: 'Listar todos os usuários do tenant',
          sucesso: false,
          erro: error.message,
        });
      }
    }

    // 6. FALLBACK: Se não conseguiu user_id, buscar usuário do tenant (cascata)
    if (!userId && supabase && tenantId) {
      diagnostico.etapa = 'BUSCANDO_USER_FALLBACK';
      
      // Tentar superadmin/admin primeiro
      try {
        const { data: adminUser, error: adminError } = await supabase
          .from('users')
          .select('id, name, email, role')
          .eq('tenant_id', tenantId)
          .in('role', ['superadmin', 'admin'])
          .limit(1)
          .maybeSingle();

        if (adminUser && !adminError) {
          userId = adminUser.id;
        }

        diagnostico.checks.push({
          nome: 'Buscar admin/superadmin do tenant',
          sucesso: !!adminUser && !adminError,
          user_id: adminUser?.id || null,
          user_name: adminUser?.name || null,
          user_email: adminUser?.email || null,
          user_role: adminUser?.role || null,
          erro: adminError?.message || null,
        });

        // Se não encontrou, buscar qualquer usuário
        if (!userId) {
          const { data: anyUser, error: anyUserError } = await supabase
            .from('users')
            .select('id, name, email, role')
            .eq('tenant_id', tenantId)
            .limit(1)
            .maybeSingle();

          if (anyUser && !anyUserError) {
            userId = anyUser.id;
          }

          diagnostico.checks.push({
            nome: 'Buscar qualquer usuário do tenant (fallback final)',
            sucesso: !!anyUser && !anyUserError,
            user_id: anyUser?.id || null,
            user_name: anyUser?.name || null,
            user_email: anyUser?.email || null,
            user_role: anyUser?.role || null,
            erro: anyUserError?.message || null,
          });
        }
      } catch (error: any) {
        diagnostico.checks.push({
          nome: 'Buscar usuário do tenant (fallback)',
          sucesso: false,
          erro: error.message,
        });
      }
    }

    // 8. Verificar estrutura da tabela configs
    if (supabase && tenantId) {
      diagnostico.etapa = 'VERIFICANDO_ESTRUTURA_TABELA';
      try {
        const { data: tableInfo, error: tableError } = await supabase
          .from('configs')
          .select('*')
          .eq('tenant_id', tenantId)
          .limit(5);

        // Obter valores únicos de category existentes
        const categoriesExistentes = tableInfo ? [...new Set(tableInfo.map((r: any) => r.category))] : [];

        diagnostico.checks.push({
          nome: 'Estrutura da tabela configs',
          sucesso: !tableError,
          tem_dados: tableInfo && tableInfo.length > 0,
          total_configs: tableInfo?.length || 0,
          colunas: tableInfo && tableInfo.length > 0 ? Object.keys(tableInfo[0]) : [],
          categories_existentes: categoriesExistentes,
          exemplo_config: tableInfo && tableInfo.length > 0 ? tableInfo[0] : null,
          erro: tableError?.message || null,
        });

      } catch (error: any) {
        diagnostico.checks.push({
          nome: 'Estrutura da tabela configs',
          sucesso: false,
          erro: error.message,
        });
      }

      // 9. Descobrir category válida
      let categoryValida = 'business';
      try {
        const { data: configExample } = await supabase
          .from('configs')
          .select('category')
          .eq('tenant_id', tenantId)
          .limit(1)
          .maybeSingle();
        
        if (configExample?.category) {
          categoryValida = configExample.category;
        }
      } catch (error) {
        // Usar valor padrão
      }

      // 10. Teste de INSERT REAL (com category válida)
      diagnostico.etapa = 'TESTE_INSERT_REAL';
      try {
        const testId = randomUUID();  // ✅ UUID puro, sem prefixo
        const testValue = { teste: 'diagnostico', timestamp: new Date().toISOString() };
        
        const { data: insertData, error: insertError } = await supabase
          .from('configs')
          .insert([{
            id: testId,
            key: 'test_diagnostico_' + Date.now(),
            value: testValue,
            description: 'Teste diagnóstico',
            category: categoryValida,  // ✅ Usar category válida do banco
            tenant_id: tenantId,
            is_system: false,
            is_encrypted: false,
            created_by: userId,
            updated_by: userId
            // created_at e updated_at serão gerados automaticamente
          }])
          .select();

        if (insertError) {
          diagnostico.checks.push({
            nome: 'Teste de INSERT real',
            sucesso: false,
            category_usada: categoryValida,
            erro: insertError.message,
            erro_code: insertError.code,
            erro_details: insertError.details,
            erro_hint: insertError.hint,
          });
        } else {
          diagnostico.checks.push({
            nome: 'Teste de INSERT real',
            sucesso: true,
            mensagem: 'INSERT funcionou! Dados inseridos e removidos.',
            category_usada: categoryValida,
            test_id: testId
          });

          // Deletar o registro de teste
          await supabase.from('configs').delete().eq('id', testId);
        }

      } catch (error: any) {
        diagnostico.checks.push({
          nome: 'Teste de INSERT real',
          sucesso: false,
          erro: error.message,
          stack: error.stack,
        });
      }
    }

    diagnostico.etapa = 'CONCLUIDO';
    diagnostico.sucesso = true;

    // Gerar HTML formatado
    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🔍 Diagnóstico da API de Configuração</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 { font-size: 32px; margin-bottom: 10px; }
    .header .timestamp { opacity: 0.9; font-size: 14px; }
    .content { padding: 30px; }
    .check {
      background: #f8f9fa;
      border-left: 4px solid #ccc;
      padding: 20px;
      margin-bottom: 15px;
      border-radius: 8px;
    }
    .check.success { border-left-color: #28a745; background: #d4edda; }
    .check.error { border-left-color: #dc3545; background: #f8d7da; }
    .check-title {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .check-icon { font-size: 24px; }
    .check-details {
      font-size: 14px;
      color: #666;
      margin-top: 8px;
    }
    .check-details pre {
      background: #fff;
      padding: 10px;
      border-radius: 4px;
      overflow-x: auto;
      margin-top: 8px;
    }
    .summary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      text-align: center;
      font-size: 18px;
      font-weight: bold;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: bold;
      margin-left: 10px;
    }
    .badge.success { background: #28a745; color: white; }
    .badge.error { background: #dc3545; color: white; }
    .btn-refresh {
      display: inline-block;
      margin-top: 20px;
      padding: 12px 24px;
      background: white;
      color: #667eea;
      text-decoration: none;
      border-radius: 8px;
      font-weight: bold;
      transition: transform 0.2s;
    }
    .btn-refresh:hover { transform: scale(1.05); }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔍 Diagnóstico da API de Configuração</h1>
      <div class="timestamp">Executado em: ${new Date(diagnostico.timestamp).toLocaleString('pt-BR')}</div>
      <a href="/api/admin/config/diagnostico" class="btn-refresh">🔄 Atualizar Diagnóstico</a>
    </div>
    
    <div class="content">
      ${diagnostico.checks.map((check: any, index: number) => `
        <div class="check ${check.sucesso ? 'success' : 'error'}">
          <div class="check-title">
            <span class="check-icon">${check.sucesso ? '✅' : '❌'}</span>
            <span>${index + 1}. ${check.nome}</span>
            <span class="badge ${check.sucesso ? 'success' : 'error'}">
              ${check.sucesso ? 'SUCESSO' : 'ERRO'}
            </span>
          </div>
          <div class="check-details">
            ${check.valor ? `<div><strong>Valor:</strong> ${check.valor}</div>` : ''}
            ${check.user_id ? `<div><strong>User ID:</strong> ${check.user_id}</div>` : ''}
            ${check.mensagem ? `<div><strong>Mensagem:</strong> ${check.mensagem}</div>` : ''}
            ${check.tem_dados !== undefined ? `<div><strong>Tem dados na tabela:</strong> ${check.tem_dados ? 'SIM' : 'NÃO'}</div>` : ''}
            ${check.colunas && check.colunas.length > 0 ? `<div><strong>Colunas:</strong> ${check.colunas.join(', ')}</div>` : ''}
            ${check.erro ? `<div style="color: #dc3545;"><strong>Erro:</strong> ${check.erro}</div>` : ''}
            ${check.erro_code ? `<div><strong>Código do Erro:</strong> ${check.erro_code}</div>` : ''}
            ${check.erro_details ? `<div><strong>Detalhes:</strong> ${check.erro_details}</div>` : ''}
            ${check.erro_hint ? `<div><strong>Dica:</strong> ${check.erro_hint}</div>` : ''}
            ${check.stack ? `<pre>${check.stack}</pre>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
    
    <div class="summary">
      ${diagnostico.checks.filter((c: any) => c.sucesso).length} de ${diagnostico.checks.length} checks passaram
      ${diagnostico.checks.every((c: any) => c.sucesso) ? '🎉' : '⚠️'}
    </div>
  </div>
</body>
</html>
    `;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });

  } catch (error: any) {
    devLog.error('[API] [Config] [Diagnostico] Erro na rota de diagnóstico:', error);
    
    const errorHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Erro no Diagnóstico</title>
  <style>
    body { font-family: sans-serif; padding: 40px; background: #f8d7da; }
    .error { background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #dc3545; }
    pre { background: #f8f9fa; padding: 10px; border-radius: 4px; overflow-x: auto; }
  </style>
</head>
<body>
  <div class="error">
    <h1>❌ Erro ao executar diagnóstico</h1>
    <p><strong>Mensagem:</strong> ${error.message}</p>
    <pre>${error.stack}</pre>
  </div>
</body>
</html>
    `;
    
    return new NextResponse(errorHtml, {
      status: 500,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const diagnostico: any = {
      timestamp: new Date().toISOString(),
      etapa: 'INICIO',
      checks: []
    };

    // 1. Verificar headers
    diagnostico.etapa = 'VERIFICANDO_HEADERS';
    const headersList = headers();
    const tenantId = headersList.get('x-tenant-id');
    
    diagnostico.checks.push({
      nome: 'Tenant ID nos headers',
      sucesso: !!tenantId,
      valor: tenantId || 'NÃO ENCONTRADO',
    });

    if (!tenantId) {
      diagnostico.erro = 'Tenant ID não encontrado';
      return NextResponse.json({ diagnostico, sucesso: false });
    }

    // 2. Verificar Service Role Key
    diagnostico.etapa = 'VERIFICANDO_SERVICE_ROLE_KEY';
    diagnostico.checks.push({
      nome: 'Service Role Key configurada',
      sucesso: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      valor: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'CONFIGURADA' : 'NÃO CONFIGURADA',
    });

    // 3. Tentar criar cliente Supabase
    diagnostico.etapa = 'CRIANDO_SUPABASE_CLIENT';
    let supabase;
    try {
      supabase = createSupabaseServiceRoleClient();
      diagnostico.checks.push({
        nome: 'Cliente Supabase criado',
        sucesso: true,
      });
    } catch (error: any) {
      diagnostico.checks.push({
        nome: 'Cliente Supabase criado',
        sucesso: false,
        erro: error.message,
      });
      diagnostico.erro = 'Erro ao criar cliente Supabase';
      return NextResponse.json({ diagnostico, sucesso: false });
    }

    // 4. Tentar obter user_id
    diagnostico.etapa = 'OBTENDO_USER_ID';
    let userId: string | null = null;
    try {
      const supabaseAuth = createSupabaseServerClient();
      const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
      
      diagnostico.checks.push({
        nome: 'Autenticação do usuário',
        sucesso: !!user && !authError,
        user_id: user?.id || null,
        erro: authError?.message || null,
      });
      
      if (user) {
        userId = user.id;
      }
    } catch (error: any) {
      diagnostico.checks.push({
        nome: 'Autenticação do usuário',
        sucesso: false,
        erro: error.message,
      });
    }

    // 5. FALLBACK: Se não conseguiu user_id, buscar admin do tenant
    if (!userId) {
      diagnostico.etapa = 'BUSCANDO_ADMIN_TENANT';
      try {
        const { data: adminUser, error: adminError } = await supabase
          .from('users')
          .select('id, name, email, role')
          .eq('tenant_id', tenantId)
          .eq('role', 'admin')
          .limit(1)
          .maybeSingle();

        if (adminUser && !adminError) {
          userId = adminUser.id;
        }

        diagnostico.checks.push({
          nome: 'Buscar admin do tenant (fallback)',
          sucesso: !!adminUser && !adminError,
          user_id: adminUser?.id || null,
          user_name: adminUser?.name || null,
          user_email: adminUser?.email || null,
          user_role: adminUser?.role || null,
          erro: adminError?.message || null,
        });
      } catch (error: any) {
        diagnostico.checks.push({
          nome: 'Buscar admin do tenant (fallback)',
          sucesso: false,
          erro: error.message,
        });
      }
    }

    // 6. Verificar body da requisição
    diagnostico.etapa = 'VERIFICANDO_BODY';
    let body;
    try {
      body = await request.json();
      diagnostico.checks.push({
        nome: 'Body da requisição',
        sucesso: true,
        body: body,
      });
    } catch (error: any) {
      diagnostico.checks.push({
        nome: 'Body da requisição',
        sucesso: false,
        erro: error.message,
      });
      diagnostico.erro = 'Erro ao parsear body';
      return NextResponse.json({ diagnostico, sucesso: false });
    }

    const { key, value, description } = body;

    diagnostico.checks.push({
      nome: 'Validação de campos obrigatórios',
      sucesso: !!(key && value !== undefined),
      key: key || 'NÃO FORNECIDO',
      value: value !== undefined ? 'FORNECIDO' : 'NÃO FORNECIDO',
      description: description || 'NÃO FORNECIDO',
    });

    // 6. Verificar se config já existe
    diagnostico.etapa = 'VERIFICANDO_CONFIG_EXISTENTE';
    try {
      const { data: existing, error: selectError } = await supabase
        .from('configs')
        .select('id, key, created_at')
        .eq('key', key)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      diagnostico.checks.push({
        nome: 'Busca de config existente',
        sucesso: !selectError,
        existe: !!existing,
        config_id: existing?.id || null,
        erro: selectError?.message || null,
      });

      if (selectError) {
        diagnostico.erro = `Erro ao buscar config: ${selectError.message}`;
        return NextResponse.json({ diagnostico, sucesso: false });
      }

    } catch (error: any) {
      diagnostico.checks.push({
        nome: 'Busca de config existente',
        sucesso: false,
        erro: error.message,
      });
      diagnostico.erro = 'Exceção ao buscar config';
      return NextResponse.json({ diagnostico, sucesso: false });
    }

    // 7. Verificar estrutura da tabela configs
    diagnostico.etapa = 'VERIFICANDO_ESTRUTURA_TABELA';
    try {
      const { data: tableInfo, error: tableError } = await supabase
        .from('configs')
        .select('*')
        .eq('tenant_id', tenantId)
        .limit(1);

      diagnostico.checks.push({
        nome: 'Estrutura da tabela configs',
        sucesso: !tableError,
        tem_dados: tableInfo && tableInfo.length > 0,
        colunas: tableInfo && tableInfo.length > 0 ? Object.keys(tableInfo[0]) : [],
        erro: tableError?.message || null,
      });

    } catch (error: any) {
      diagnostico.checks.push({
        nome: 'Estrutura da tabela configs',
        sucesso: false,
        erro: error.message,
      });
    }

    // 8. Teste de insert simulado (sem realmente inserir)
    diagnostico.etapa = 'SIMULACAO_COMPLETA';
    diagnostico.dados_que_seriam_inseridos = {
      key,
      value: typeof value === 'object' ? 'OBJETO' : value,
      tipo_value: typeof value,
      description: description || `Configuração ${key}`,
      tenant_id: tenantId,
      created_by: userId,
      updated_by: userId,
    };

    // 9. Tentar INSERT REAL para ver o erro exato
    diagnostico.etapa = 'TESTE_INSERT_REAL';
    try {
      const testId = randomUUID();  // ✅ UUID puro, sem prefixo
      
      const { data: insertData, error: insertError } = await supabase
        .from('configs')
        .insert([{
          id: testId,
          key: 'test_diagnostico_' + Date.now(),
          value: value,
          description: description || `Teste diagnóstico ${key}`,
          category: 'business',
          tenant_id: tenantId,
          is_system: false,
          is_encrypted: false,
          created_by: userId,
          updated_by: userId
          // created_at e updated_at serão gerados automaticamente
        }])
        .select();

      if (insertError) {
        diagnostico.checks.push({
          nome: 'Teste de INSERT real',
          sucesso: false,
          erro: insertError.message,
          erro_code: insertError.code,
          erro_details: insertError.details,
          erro_hint: insertError.hint,
        });

        // Deletar o teste se conseguiu inserir
        if (insertData) {
          await supabase.from('configs').delete().eq('id', testId);
        }
      } else {
        diagnostico.checks.push({
          nome: 'Teste de INSERT real',
          sucesso: true,
          mensagem: 'INSERT funcionou! Dados inseridos e removidos com sucesso.',
        });

        // Deletar o registro de teste
        await supabase.from('configs').delete().eq('id', testId);
      }

    } catch (error: any) {
      diagnostico.checks.push({
        nome: 'Teste de INSERT real',
        sucesso: false,
        erro: error.message,
        stack: error.stack,
      });
    }

    diagnostico.etapa = 'CONCLUIDO';
    diagnostico.sucesso = true;

    return NextResponse.json({ 
      diagnostico,
      sucesso: true,
      mensagem: 'Diagnóstico completo - todos os checks executados'
    });

  } catch (error: any) {
    devLog.error('[API] [Config] [Diagnostico] Erro na rota de diagnóstico:', error);
    return NextResponse.json({
      sucesso: false,
      erro: 'Erro na rota de diagnóstico',
      mensagem: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}

