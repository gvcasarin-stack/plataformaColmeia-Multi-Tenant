import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { devLog } from "@/lib/utils/productionLogger";
import { markAllNotificationsAsRead } from '@/lib/services/notificationService/queries';

export async function POST(request: NextRequest) {
  try {
    devLog.log('🔍 [API notifications/mark-all-read] Iniciando...');
    
    // Verificar autenticação
    const supabase = createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      devLog.error('🔍 [API notifications/mark-all-read] Erro de autenticação:', authError?.message);
      return NextResponse.json({ 
        success: false, 
        error: 'Not authenticated' 
      }, { status: 401 });
    }
    
    devLog.log('🔍 [API notifications/mark-all-read] Marcando todas como lidas para usuário:', user.id);
    
    // Marcar todas como lidas
    await markAllNotificationsAsRead(user.id);
    
    devLog.log('🔍 [API notifications/mark-all-read] Sucesso');
    
    return NextResponse.json({
      success: true,
      message: 'All notifications marked as read'
    });
    
  } catch (error) {
    devLog.error('🔍 [API notifications/mark-all-read] Erro:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
