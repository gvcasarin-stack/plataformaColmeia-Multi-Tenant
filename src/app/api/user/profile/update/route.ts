import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';

/**
 * 🔍 API DE UPDATE DE PERFIL COM DIAGNÓSTICO
 * POST /api/user/profile/update
 *
 * Suporta mode de teste com testMode: true
 */
export async function POST(request: NextRequest) {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    steps: [],
    errors: []
  };

  try {
    devLog.log('🔍 [API user/profile/update] Iniciando atualização de perfil...');

    const body = await request.json();
    const {
      userId,
      name,
      phone,
      cpf,
      cnpj,
      isCompany,
      companyName,
      testMode = false // 🔍 Mode de teste para diagnóstico
    } = body;

    diagnostics.steps.push({
      step: 1,
      action: 'Dados recebidos',
      data: {
        userId,
        name,
        phone,
        cpf: cpf ? '[EXISTS]' : null,
        cnpj: cnpj ? '[EXISTS]' : null,
        isCompany,
        companyName,
        testMode
      }
    });

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'userId é obrigatório',
        diagnostics
      }, { status: 400 });
    }

    devLog.log('🔍 [API user/profile/update] Dados recebidos:', {
      userId,
      name,
      phone,
      cpf: cpf ? '[REDACTED]' : null,
      cnpj: cnpj ? '[REDACTED]' : null,
      isCompany,
      companyName,
      testMode
    });

    // Usar ServiceRole para ter permissão total
    const supabase = createSupabaseServiceRoleClient();

    // 🔍 PASSO 2: Buscar dados atuais do usuário
    const { data: currentUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    diagnostics.steps.push({
      step: 2,
      action: 'Buscar usuário atual',
      success: !fetchError,
      currentUser: currentUser ? {
        id: currentUser.id,
        name: currentUser.name,
        is_company: currentUser.is_company,
        company_name: currentUser.company_name,
        cnpj: currentUser.cnpj
      } : null,
      error: fetchError?.message
    });

    if (fetchError) {
      devLog.error('🔍 [API user/profile/update] Erro ao buscar usuário:', fetchError);
      diagnostics.errors.push({
        step: 2,
        error: fetchError
      });
      return NextResponse.json({
        success: false,
        error: 'Usuário não encontrado',
        diagnostics
      }, { status: 404 });
    }

    // 🔍 PASSO 3: Preparar dados para update
    const updatePayload = {
      name: name,
      phone: phone,
      cpf: cpf ? cpf.replace(/\D/g, '') : null, // Remove pontuação do CPF
      cnpj: cnpj ? cnpj.replace(/\D/g, '') : null, // Remove pontuação do CNPJ
      is_company: isCompany,
      company_name: companyName,
      updated_at: new Date().toISOString()
    };

    diagnostics.steps.push({
      step: 3,
      action: 'Preparar dados para update',
      updatePayload: {
        ...updatePayload,
        cpf: cpf ? '[REDACTED]' : null,
        cnpj: cnpj ? '[REDACTED]' : null
      }
    });

    // 🔍 Se testMode, retornar sem fazer update
    if (testMode) {
      devLog.log('🔍 [API user/profile/update] MODE DE TESTE - nenhum dado foi alterado');
      return NextResponse.json({
        success: true,
        message: 'Modo de teste - nenhum dado foi alterado',
        testMode: true,
        diagnostics,
        wouldUpdate: updatePayload
      });
    }

    // 🔍 PASSO 4: Executar UPDATE
    const { data, error } = await supabase
      .from('users')
      .update(updatePayload)
      .eq('id', userId)
      .select();

    diagnostics.steps.push({
      step: 4,
      action: 'Executar UPDATE',
      success: !error,
      error: error ? {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      } : null
    });

    if (error) {
      devLog.error('🔍 [API user/profile/update] Erro no Supabase:', error);
      diagnostics.errors.push({
        step: 4,
        error: error
      });

      // Diagnosticar tipo específico de erro
      if (error.message?.includes('column') && error.message?.includes('does not exist')) {
        diagnostics.errors.push({
          type: 'SCHEMA_ERROR',
          message: 'Um ou mais campos não existem na tabela users'
        });
      }

      if (error.code === '23505') {
        diagnostics.errors.push({
          type: 'UNIQUE_VIOLATION',
          message: 'CNPJ ou CPF já existe para outro usuário'
        });
      }

      return NextResponse.json({
        success: false,
        error: 'Erro ao atualizar perfil no banco de dados',
        details: error.message,
        diagnostics
      }, { status: 500 });
    }

    if (!data || data.length === 0) {
      devLog.warn('🔍 [API user/profile/update] Usuário não encontrado:', userId);
      diagnostics.errors.push({
        type: 'NOT_FOUND',
        message: 'Nenhum registro foi atualizado'
      });
      return NextResponse.json({
        success: false,
        error: 'Usuário não encontrado',
        diagnostics
      }, { status: 404 });
    }

    // 🔍 PASSO 5: Verificar dados após update
    diagnostics.steps.push({
      step: 5,
      action: 'Dados atualizados com sucesso',
      updatedUser: {
        id: data[0].id,
        name: data[0].name,
        is_company: data[0].is_company,
        company_name: data[0].company_name,
        cnpj: data[0].cnpj ? '[EXISTS]' : null
      }
    });

    devLog.log('🔍 [API user/profile/update] Perfil atualizado com sucesso:', userId);

    return NextResponse.json({
      success: true,
      message: 'Perfil atualizado com sucesso',
      data: data[0],
      diagnostics
    });

  } catch (error) {
    devLog.error('🔍 [API user/profile/update] Erro interno:', error);
    diagnostics.errors.push({
      type: 'INTERNAL_ERROR',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Unknown error',
      diagnostics
    }, { status: 500 });
  }
}