import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';

/**
 * API para listar projetos existentes e encontrar IDs válidos
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createSupabaseServiceRoleClient();
    
    // Buscar alguns projetos para debug
    const { data: projects, error } = await supabase
      .from('projects')
      .select('id, name, number, created_by, userId')
      .limit(10);
    
    if (error) {
      console.error('Erro ao buscar projetos:', error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }
    
    // Buscar alguns usuários também
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, full_name, role')
      .limit(10);
    
    if (usersError) {
      console.error('Erro ao buscar usuários:', usersError);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Projetos e usuários encontrados',
      data: {
        projects: projects || [],
        users: users || [],
        totalProjects: projects?.length || 0,
        totalUsers: users?.length || 0,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error: any) {
    console.error('Erro geral:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}