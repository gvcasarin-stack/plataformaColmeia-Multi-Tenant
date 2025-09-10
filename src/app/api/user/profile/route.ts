import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';

/**
 * API para buscar perfil do usuário
 * GET /api/user/profile?userId=ID
 * 
 * COMPATÍVEL COM MULTI-TENANT - Funciona tanto para admin quanto cliente
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId é obrigatório' },
        { status: 400 }
      );
    }

    devLog.log('[API User Profile] Buscando perfil do usuário:', userId);

    // ✅ MULTI-TENANT: Obter tenant_id dos headers se disponível
    const headersList = headers();
    const tenantId = headersList.get('x-tenant-id');
    
    devLog.log('[API User Profile] Headers multi-tenant:', {
      tenantId,
      userId,
      hostname: headersList.get('host')
    });

    const supabase = createSupabaseServiceRoleClient();
    
    // ✅ SEGURANÇA MULTI-TENANT: Tentar com filtro de tenant primeiro, fallback sem filtro
    let userData = null;
    let error = null;
    
    devLog.log('[API User Profile] Tentando busca com filtro de tenant:', tenantId);
    
    if (tenantId) {
      // Primeira tentativa: com filtro de tenant
      const { data: tenantUserData, error: tenantError } = await supabase
        .from('users')
        .select('id, name, email, role, tenant_id, status')
        .eq('id', userId)
        .eq('tenant_id', tenantId)
        .single();
      
      if (tenantError || !tenantUserData) {
        devLog.warn('[API User Profile] Busca com tenant falhou, tentando sem filtro:', {
          error: tenantError?.message,
          tenantId,
          userId
        });
        
        // Segunda tentativa: sem filtro de tenant
        const { data: fallbackUserData, error: fallbackError } = await supabase
          .from('users')
          .select('id, name, email, role, tenant_id, status')
          .eq('id', userId)
          .single();
        
        if (fallbackError || !fallbackUserData) {
          error = fallbackError;
          userData = null;
        } else {
          userData = fallbackUserData;
          error = null;
          
          devLog.warn('[API User Profile] Usuário encontrado sem filtro de tenant - possível inconsistência:', {
            userId,
            userTenantId: fallbackUserData.tenant_id,
            requestTenantId: tenantId,
            tenantMatch: fallbackUserData.tenant_id === tenantId
          });
        }
      } else {
        userData = tenantUserData;
        error = null;
        devLog.log('[API User Profile] Usuário encontrado com filtro de tenant com sucesso');
      }
    } else {
      // Sem tenant_id nos headers - busca direta
      devLog.warn('[API User Profile] Tenant_id não encontrado nos headers - busca direta');
      const { data: directUserData, error: directError } = await supabase
        .from('users')
        .select('id, name, email, role, tenant_id, status')
        .eq('id', userId)
        .single();
      
      userData = directUserData;
      error = directError;
    }
    
    if (error) {
      devLog.error('[API User Profile] Erro final ao buscar usuário:', {
        error: error.message,
        code: error.code,
        userId,
        tenantId
      });
      
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }
    
    if (!userData) {
      devLog.warn('[API User Profile] Usuário não encontrado:', userId);
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    devLog.log('[API User Profile] Perfil encontrado com sucesso:', {
      userId: userData.id,
      role: userData.role,
      tenantId: userData.tenant_id,
      requestTenant: tenantId,
      tenantMatch: userData.tenant_id === tenantId
    });
    
    return NextResponse.json({
      id: userData.id,
      name: userData.name,
      email: userData.email,
      role: userData.role
    });
    
  } catch (error) {
    devLog.error('[API User Profile] Erro inesperado:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}