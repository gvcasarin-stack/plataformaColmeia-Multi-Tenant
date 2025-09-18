import { NextRequest, NextResponse } from 'next/server';
import { getTenantFromUser } from '@/lib/utils/tenant-security';
import { devLog } from '@/lib/utils/productionLogger';

/**
 * 🔒 API para buscar informações de tenant do usuário
 * Usada pelo client-side para validação de login
 *
 * @route POST /api/user/tenant-info
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID é obrigatório'
      }, { status: 400 });
    }

    devLog.log('[API] /user/tenant-info - Buscando tenant para usuário:', userId);

    const tenantInfo = await getTenantFromUser(userId);

    if (!tenantInfo) {
      return NextResponse.json({
        success: false,
        error: 'Tenant não encontrado para este usuário'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      tenantInfo: {
        tenant_id: tenantInfo.tenant_id,
        organization: {
          name: tenantInfo.organization?.name || 'Organização Desconhecida'
        }
      }
    });

  } catch (error: any) {
    devLog.error('[API] /user/tenant-info - Erro:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}