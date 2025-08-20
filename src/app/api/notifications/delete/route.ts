import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { devLog } from "@/lib/utils/productionLogger";
import { deleteNotification } from '@/lib/services/notificationService/queries';

export async function DELETE(request: NextRequest) {
  try {
    devLog.log('🔍 [API notifications/delete] Iniciando...');
    
    // Verificar autenticação
    const supabase = createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      devLog.error('🔍 [API notifications/delete] Erro de autenticação:', authError?.message);
      return NextResponse.json({ 
        success: false, 
        error: 'Not authenticated' 
      }, { status: 401 });
    }
    
    // Obter dados do body
    const { notificationId } = await request.json();
    
    if (!notificationId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Notification ID required' 
      }, { status: 400 });
    }
    
    devLog.log('🔍 [API notifications/delete] Deletando notificação:', {
      notificationId,
      userId: user.id
    });
    
    // Deletar notificação
    await deleteNotification(notificationId);
    
    devLog.log('🔍 [API notifications/delete] Sucesso');
    
    return NextResponse.json({
      success: true,
      message: 'Notification deleted'
    });
    
  } catch (error) {
    devLog.error('🔍 [API notifications/delete] Erro:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 