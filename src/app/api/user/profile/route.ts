import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { devLog } from '@/lib/utils/productionLogger';

export async function GET(request: NextRequest) {
  try {
    devLog.log('[UserProfile] GET recebido');
    
    const supabase = createSupabaseServerClient();
    
    // Tentar obter userId da query string ou da sessão
    const { searchParams } = new URL(request.url);
    let userId = searchParams.get('userId');
    
    // Se não tem userId na query, tentar obter da sessão
    if (!userId) {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        devLog.error('[UserProfile] Erro ao verificar autenticação', { error: authError.message });
      }
      
      if (!authUser) {
        devLog.warn('[UserProfile] Usuário não autenticado e sem userId na query', { 
          error: authError?.message,
          hasSession: !!supabase.auth.getSession
        });
        return NextResponse.json({ 
          error: 'UNAUTHORIZED', 
          message: 'Usuário não autenticado ou userId não fornecido',
          debug: authError?.message || 'No user session found and no userId provided'
        }, { status: 401 });
      }
      
      userId = authUser.id;
    }
    
    devLog.log('[UserProfile] Buscando perfil para usuário:', userId);
    
    // Buscar perfil na tabela users usando Service Role (bypass RLS)
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, name, email, role, status, tenant_id, created_at, updated_at')
      .eq('id', userId)
      .single();
    
    if (profileError) {
      devLog.error('[UserProfile] Erro ao buscar perfil:', {
        userId,
        error: profileError.message,
        code: profileError.code
      });
      
      // Se usuário não existe na tabela users, retornar dados básicos
      if (profileError.code === 'PGRST116') {
        devLog.log('[UserProfile] Usuário não encontrado na tabela users, retornando dados básicos');
        return NextResponse.json({
          id: userId,
          name: 'Usuário',
          email: 'unknown@example.com',
          role: 'cliente',
          status: 'pending',
          tenant_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
      
      return NextResponse.json({ 
        error: 'PROFILE_ERROR', 
        message: 'Erro ao buscar perfil do usuário' 
      }, { status: 500 });
    }
    
    if (!userProfile) {
      devLog.warn('[UserProfile] Perfil não encontrado');
      return NextResponse.json({ 
        error: 'PROFILE_NOT_FOUND', 
        message: 'Perfil não encontrado' 
      }, { status: 404 });
    }
    
    devLog.log('[UserProfile] Perfil encontrado:', {
      userId: userProfile.id,
      email: userProfile.email,
      role: userProfile.role
    });
    
    return NextResponse.json(userProfile);
    
  } catch (error: any) {
    devLog.error('[UserProfile] Erro inesperado:', error);
    return NextResponse.json({ 
      error: 'INTERNAL_ERROR', 
      message: 'Erro interno do servidor' 
    }, { status: 500 });
  }
}

// Handler para requisições OPTIONS (CORS)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Allow': 'GET, OPTIONS',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}