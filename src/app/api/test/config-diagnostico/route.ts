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

    // ETAPA 4: Verificar se config já existe
    diagnostico.etapas.push({
      etapa: '4. Verificar config existente',
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
        diagnostico.etapas[3].status = '⚠️ Erro ao verificar';
        diagnostico.etapas[3].error = {
          message: checkError.message,
          code: checkError.code,
          details: checkError.details,
          hint: checkError.hint
        };
      } else {
        diagnostico.etapas[3].status = existing ? '✅ Config já existe' : '✅ Config não existe';
        diagnostico.etapas[3].existing = existing;
      }
    } catch (error: any) {
      diagnostico.etapas[3].status = '❌ Exceção ao verificar';
      diagnostico.etapas[3].error = {
        message: error.message,
        stack: error.stack
      };
    }

    // ETAPA 5: Tentar INSERT
    diagnostico.etapas.push({
      etapa: '5. Tentar INSERT',
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
        .insert({
          id: testId,
          key: 'test_diagnostico',
          value: testValue,
          description: 'Configuração de teste para diagnóstico',
          category: 'test',
          tenant_id: tenantId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        diagnostico.etapas[4].status = '❌ Erro no INSERT';
        diagnostico.etapas[4].error = {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint
        };
        diagnostico.etapas[4].insertPayload = {
          id: testId,
          key: 'test_diagnostico',
          tenant_id: tenantId,
          valueType: typeof testValue
        };
      } else {
        diagnostico.etapas[4].status = '✅ INSERT bem-sucedido!';
        diagnostico.etapas[4].insertedData = insertData;
      }
    } catch (error: any) {
      diagnostico.etapas[4].status = '❌ Exceção no INSERT';
      diagnostico.etapas[4].error = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }

    // ETAPA 6: Tentar UPDATE
    diagnostico.etapas.push({
      etapa: '6. Tentar UPDATE',
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
        diagnostico.etapas[5].status = '❌ Erro no UPDATE';
        diagnostico.etapas[5].error = {
          message: updateError.message,
          code: updateError.code,
          details: updateError.details,
          hint: updateError.hint
        };
      } else {
        diagnostico.etapas[5].status = updateData ? '✅ UPDATE bem-sucedido!' : '⚠️ Nenhum registro atualizado';
        diagnostico.etapas[5].updatedData = updateData;
      }
    } catch (error: any) {
      diagnostico.etapas[5].status = '❌ Exceção no UPDATE';
      diagnostico.etapas[5].error = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }

    // ETAPA 7: Limpar teste (DELETE)
    diagnostico.etapas.push({
      etapa: '7. Limpar teste (DELETE)',
      status: 'limpando...'
    });

    try {
      const { error: deleteError } = await supabase
        .from('configs')
        .delete()
        .eq('key', 'test_diagnostico')
        .eq('tenant_id', tenantId);

      if (deleteError) {
        diagnostico.etapas[6].status = '⚠️ Erro ao limpar (não crítico)';
        diagnostico.etapas[6].error = {
          message: deleteError.message,
          code: deleteError.code
        };
      } else {
        diagnostico.etapas[6].status = '✅ Teste limpo';
      }
    } catch (error: any) {
      diagnostico.etapas[6].status = '⚠️ Exceção ao limpar (não crítico)';
      diagnostico.etapas[6].error = {
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
