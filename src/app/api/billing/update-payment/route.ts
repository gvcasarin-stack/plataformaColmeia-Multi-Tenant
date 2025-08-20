import { NextRequest, NextResponse } from 'next/server';
import { devLog } from "@/lib/utils/productionLogger";
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, paymentStatus, paymentDetails } = body;

    devLog.log('[API] [Billing] [UpdatePayment] Iniciando processamento:', {
      projectId,
      paymentStatus,
      hasPaymentDetails: !!paymentDetails
    });

    if (!projectId || !paymentStatus) {
      return NextResponse.json(
        { error: 'Project ID e status de pagamento são obrigatórios' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceRoleClient();
    
    // ✅ PASSO 1: Verificar se o projeto existe
    devLog.log('[API] [Billing] [UpdatePayment] Verificando se projeto existe...');
    const { data: existingProject, error: fetchError } = await supabase
      .from('projects')
      .select('id, name, number, pagamento')
      .eq('id', projectId)
      .single();

    if (fetchError) {
      devLog.error('[API] [Billing] [UpdatePayment] Erro ao buscar projeto:', fetchError);
      return NextResponse.json(
        { error: 'Projeto não encontrado', details: fetchError.message },
        { status: 404 }
      );
    }

    devLog.log('[API] [Billing] [UpdatePayment] Projeto encontrado:', existingProject);

    // ✅ PASSO 2: Update APENAS do status de pagamento (sem detalhes)
    devLog.log('[API] [Billing] [UpdatePayment] Atualizando apenas status de pagamento...');
    
    const { data: updatedProject, error: updateError } = await supabase
      .from('projects')
      .update({
        pagamento: paymentStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)
      .select('id, name, number, pagamento, updated_at')
      .single();

    if (updateError) {
      devLog.error('[API] [Billing] [UpdatePayment] Erro no update do status:', updateError);
      return NextResponse.json(
        { 
          error: 'Erro ao atualizar status de pagamento', 
          details: updateError.message,
          hint: 'Verifique Row Level Security e permissões'
        },
        { status: 500 }
      );
    }

    devLog.log('[API] [Billing] [UpdatePayment] Status atualizado com sucesso:', updatedProject);

    // ✅ PASSO 3: Verificar se realmente foi atualizado
    if (updatedProject.pagamento !== paymentStatus) {
      devLog.error('[API] [Billing] [UpdatePayment] PROBLEMA: Status não foi atualizado!', {
        esperado: paymentStatus,
        recebido: updatedProject.pagamento
      });
      
      return NextResponse.json({
        error: 'Update não persistiu',
        details: `Esperado: ${paymentStatus}, mas permaneceu: ${updatedProject.pagamento}`,
        before: existingProject,
        after: updatedProject,
        hint: 'Possível problema com RLS ou política de segurança'
      }, { status: 500 });
    }

    devLog.log('[API] [Billing] [UpdatePayment] ✅ Status verificado e persistido com sucesso!');

    // ✅ PASSO 4: Se redefinindo para pendente, tentar limpar detalhes (se coluna existir)
    if (paymentStatus === 'pendente') {
      devLog.log('[API] [Billing] [UpdatePayment] Tentando limpar detalhes de pagamento...');
      
      const { error: clearError } = await supabase
        .from('projects')
        .update({ detalhePagamento: null })
        .eq('id', projectId);
      
      if (clearError) {
        devLog.warn('[API] [Billing] [UpdatePayment] Não foi possível limpar detalhes (pode ser normal se coluna não existir):', clearError.message);
      } else {
        devLog.log('[API] [Billing] [UpdatePayment] Detalhes de pagamento limpos com sucesso');
      }
    }

    // ✅ PASSO 5: Se tem detalhes de pagamento e não é pendente, tentar salvar (opcional)
    if (paymentDetails && paymentStatus !== 'pendente') {
      devLog.log('[API] [Billing] [UpdatePayment] Tentando salvar detalhes de pagamento...');
      
      const { error: detailsError } = await supabase
        .from('projects')
        .update({ detalhePagamento: paymentDetails })
        .eq('id', projectId);

      if (detailsError) {
        devLog.warn('[API] [Billing] [UpdatePayment] Não foi possível salvar detalhes:', detailsError.message);
        
        // Não falhar por causa dos detalhes - status já foi atualizado com sucesso
        return NextResponse.json({
          success: true,
          message: 'Status de pagamento atualizado com sucesso',
          warning: 'Detalhes de pagamento não foram salvos: ' + detailsError.message,
          status_updated: true,
          details_updated: false,
          project_data: updatedProject
        });
      }
      
      devLog.log('[API] [Billing] [UpdatePayment] Detalhes de pagamento salvos com sucesso');
    }

    devLog.log('[API] [Billing] [UpdatePayment] Operação concluída com sucesso');

    return NextResponse.json({
      success: true,
      message: 'Status de pagamento atualizado com sucesso',
      status_updated: true,
      details_updated: !!(paymentDetails && paymentStatus !== 'pendente'),
      before: existingProject,
      after: updatedProject
    });

  } catch (error) {
    devLog.error('[API] [Billing] [UpdatePayment] Exceção:', error);
    
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor', 
        details: error instanceof Error ? error.message : 'Erro desconhecido',
        type: 'exception'
      },
      { status: 500 }
    );
  }
} 