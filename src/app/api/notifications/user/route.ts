import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { devLog } from "@/lib/utils/productionLogger";
import { getUserNotifications } from '@/lib/services/notificationService/queries';

export async function GET(request: NextRequest) {
  try {
    devLog.log('🔍 [API notifications/user] Iniciando busca de notificações...');
    
    // Verificar autenticação usando Supabase server client
    const supabase = createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      devLog.error('🔍 [API notifications/user] Erro de autenticação:', authError?.message);
      return NextResponse.json({ 
        success: false, 
        error: 'Not authenticated' 
      }, { status: 401 });
    }
    
    // Obter parâmetros da query
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    
    devLog.log('🔍 [API notifications/user] Buscando notificações para usuário:', {
      userId: user.id,
      limit
    });
    
    // Buscar notificações usando a função que já existe
    const notifications = await getUserNotifications(user.id, limit);
    
    devLog.log('🔍 [API notifications/user] Notificações encontradas:', {
      count: notifications.length,
      unreadCount: notifications.filter(n => !n.read).length
    });
    
    return NextResponse.json({
      success: true,
      data: notifications,
      count: notifications.length,
      unreadCount: notifications.filter(n => !n.read).length
    });
    
  } catch (error) {
    devLog.error('🔍 [API notifications/user] Erro:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 