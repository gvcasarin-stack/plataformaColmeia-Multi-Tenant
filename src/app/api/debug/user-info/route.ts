import { NextRequest, NextResponse } from 'next/server';
import { devLog } from "@/lib/utils/productionLogger";
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  devLog.log('[DEBUG USER INFO] Starting user info check...');
  
  try {
    const supabase = createSupabaseServerClient();
    
    // Buscar usuário atual
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'User not authenticated', 
        details: authError?.message,
        success: false 
      });
    }

    // Buscar perfil do usuário
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    devLog.log('[DEBUG USER INFO] User data:', {
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      userMetadata: user.user_metadata,
      userAppMetadata: user.app_metadata,
      profile: profile,
      profileError: profileError
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        metadata: user.user_metadata,
        appMetadata: user.app_metadata
      },
      profile: profile,
      profileError: profileError?.message,
      // Simular a lógica do file-actions
      roleDetection: {
        userRole: user.role,
        profileRole: profile?.role,
        isAdmin: user.role === 'admin' || user.role === 'superadmin' || profile?.role === 'admin' || profile?.role === 'superadmin',
        detectedRole: user.role || profile?.role || 'user'
      }
    });

  } catch (error: any) {
    devLog.error('[DEBUG USER INFO] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message,
      success: false 
    });
  }
}
