import { NextRequest, NextResponse } from 'next/server';
import { devLog } from "@/lib/utils/productionLogger";
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';

export async function GET(request: NextRequest) {
  devLog.log('[DEBUG] Starting notification check...');
  
  try {
    const supabase = createSupabaseServiceRoleClient();
    
    // Buscar todas as notificações para debug
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      devLog.error('[DEBUG] Supabase error:', error);
      return NextResponse.json({ 
        error: 'Database error', 
        details: error.message,
        success: false 
      });
    }

    // Buscar alguns usuários para debug
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, email, role')
      .limit(5);

    if (userError) {
      devLog.error('[DEBUG] User fetch error:', userError);
      return NextResponse.json({ 
        error: 'User fetch error', 
        details: userError.message,
        success: false 
      });
    }

    devLog.log('[DEBUG] Check complete. Found:', {
      notificationsCount: notifications?.length || 0,
      usersCount: users?.length || 0
    });

    return NextResponse.json({ 
      success: true,
      data: {
        notifications: notifications || [],
        users: users || [],
        summary: {
          totalNotifications: notifications?.length || 0,
          unreadNotifications: notifications?.filter(n => !n.read).length || 0,
          totalUsers: users?.length || 0
        }
      }
    });
  } catch (error) {
    devLog.error('[DEBUG] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Server error', 
      details: error instanceof Error ? error.message : 'Unknown error',
      success: false 
    }, { status: 500 });
  }
} 