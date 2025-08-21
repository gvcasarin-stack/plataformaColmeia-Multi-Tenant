import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { devLog } from "@/lib/utils/productionLogger";
import { markNotificationAsRead } from '@/lib/services/notificationService/queries';

export async function POST(request: NextRequest) {
  try {
    devLog.log('🔍 [API notifications/mark-read] Iniciando...');
    
    // Verificar autenticação
    const supabase = createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      devLog.error('🔍 [API notifications/mark-read] Erro de autenticação:', authError?.message);
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
    
    devLog.log('🔍 [API notifications/mark-read] Marcando como lida:', {
      notificationId,
      userId: user.id
    });
    
    // Marcar como lida
    await markNotificationAsRead(notificationId);
    
    devLog.log('🔍 [API notifications/mark-read] Sucesso');
    
    return NextResponse.json({
      success: true,
      message: 'Notification marked as read'
    });
    
  } catch (error) {
    devLog.error('🔍 [API notifications/mark-read] Erro:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
