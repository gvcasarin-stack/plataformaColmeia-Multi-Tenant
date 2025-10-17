import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { devLog } from "@/lib/utils/productionLogger";
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';

/**
 * GET /api/admin/config/faixas-potencia
 *
 * Retorna as faixas de potência configuradas para o tenant
 * Útil para debug e verificação de configurações
 */
export async function GET(request: NextRequest) {
  try {
    devLog.log('[API] [Faixas Potência] Buscando faixas de potência do tenant');

    // ✅ SEGURANÇA: Obter tenant_id dos headers
    const headersList = headers();
    const tenantId = headersList.get('x-tenant-id');

    if (!tenantId) {
      devLog.error('[API] [Faixas Potência] Tenant ID não encontrado nos headers');
      return NextResponse.json(
        { error: 'Acesso negado: tenant não identificado' },
        { status: 403 }
      );
    }

    const supabase = createSupabaseServiceRoleClient();

    // Buscar configuração de faixas_potencia
    const { data: configData, error: configError } = await supabase
      .from('configs')
      .select('key, value, description, created_at, updated_at')
      .eq('key', 'faixas_potencia')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (configError) {
      devLog.error('[API] [Faixas Potência] Erro ao buscar configuração:', configError);
      return NextResponse.json({
        success: false,
        error: configError.message,
        tenantId,
        encontrado: false
      });
    }

    if (!configData) {
      devLog.warn('[API] [Faixas Potência] Configuração não encontrada para tenant:', tenantId);
      return NextResponse.json({
        success: true,
        encontrado: false,
        tenantId,
        message: 'Configuração de faixas_potencia não encontrada para este tenant',
        faixasPadrao: [
          { potenciaMin: 0, potenciaMax: 5, valorBase: 600 },
          { potenciaMin: 5, potenciaMax: 10, valorBase: 700 },
          { potenciaMin: 10, potenciaMax: 20, valorBase: 800 },
          { potenciaMin: 20, potenciaMax: 30, valorBase: 1000 },
          { potenciaMin: 30, potenciaMax: 40, valorBase: 1200 },
          { potenciaMin: 40, potenciaMax: 50, valorBase: 1750 },
          { potenciaMin: 50, potenciaMax: 75, valorBase: 2500 },
          { potenciaMin: 75, potenciaMax: 150, valorBase: 3000 },
          { potenciaMin: 150, potenciaMax: 300, valorBase: 4000 },
          { potenciaMin: 300, potenciaMax: 999999, valorBase: 4000 }
        ]
      });
    }

    // Configuração encontrada
    devLog.log('[API] [Faixas Potência] Configuração encontrada:', {
      key: configData.key,
      tipoValue: typeof configData.value,
      isArray: Array.isArray(configData.value),
      quantidadeFaixas: Array.isArray(configData.value) ? configData.value.length : 'N/A'
    });

    return NextResponse.json({
      success: true,
      encontrado: true,
      tenantId,
      configuracao: {
        key: configData.key,
        value: configData.value,
        description: configData.description,
        created_at: configData.created_at,
        updated_at: configData.updated_at
      },
      faixas: Array.isArray(configData.value) ? configData.value : JSON.parse(configData.value)
    });

  } catch (error: any) {
    devLog.error('[API] [Faixas Potência] Exceção:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    }, { status: 500 });
  }
}
