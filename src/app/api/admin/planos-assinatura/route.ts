import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';
import { headers } from 'next/headers';

// GET: Listar todos os planos de assinatura do tenant
export async function GET(request: NextRequest) {
  try {
    devLog.log('[API /admin/planos-assinatura GET] Iniciando requisição');

    const hdrs = headers();
    const tenantId = hdrs.get('x-tenant-id');

    if (!tenantId) {
      devLog.warn('[API /admin/planos-assinatura GET] Sem tenant-id no header');
      return NextResponse.json({ success: true, data: [] });
    }

    const supabase = createSupabaseServiceRoleClient();

    // Buscar planos do tenant
    const { data: planos, error } = await supabase
      .from('planos_assinatura')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      devLog.error('[API /admin/planos-assinatura GET] Erro ao buscar planos:', error);
      return NextResponse.json({ success: true, data: [] });
    }

    devLog.log('[API /admin/planos-assinatura GET] Planos encontrados:', planos?.length);

    return NextResponse.json({
      success: true,
      data: planos || []
    });

  } catch (error: any) {
    devLog.error('[API /admin/planos-assinatura GET] Erro:', error);
    return NextResponse.json({ success: true, data: [] });
  }
}

// POST: Criar novo plano de assinatura
export async function POST(request: NextRequest) {
  try {
    devLog.log('[API /admin/planos-assinatura POST] Iniciando criação de plano');

    const hdrs = headers();
    const tenantId = hdrs.get('x-tenant-id');

    if (!tenantId) {
      devLog.warn('[API /admin/planos-assinatura POST] Sem tenant-id no header');
      return NextResponse.json(
        { success: false, error: 'Tenant não identificado' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceRoleClient();

    // Obter dados do body
    const body = await request.json();
    const { nome, quantidade_mensal, valor_mensal, dia_renovacao, potencia_maxima_kwp } = body;

    // Validações
    if (!nome || !quantidade_mensal || valor_mensal === undefined) {
      return NextResponse.json(
        { success: false, error: 'Campos obrigatórios faltando' },
        { status: 400 }
      );
    }

    if (quantidade_mensal <= 0) {
      return NextResponse.json(
        { success: false, error: 'Quantidade mensal deve ser maior que zero' },
        { status: 400 }
      );
    }

    if (valor_mensal < 0) {
      return NextResponse.json(
        { success: false, error: 'Valor não pode ser negativo' },
        { status: 400 }
      );
    }

    const diaRenovacao = dia_renovacao || 1;
    if (diaRenovacao < 1 || diaRenovacao > 31) {
      return NextResponse.json(
        { success: false, error: 'Dia de renovação deve estar entre 1 e 31' },
        { status: 400 }
      );
    }

    // Validar potência máxima (opcional, pode ser NULL para ilimitado)
    if (potencia_maxima_kwp !== undefined && potencia_maxima_kwp !== null && potencia_maxima_kwp <= 0) {
      return NextResponse.json(
        { success: false, error: 'Potência máxima deve ser maior que zero ou ilimitado' },
        { status: 400 }
      );
    }

    // Criar plano
    const { data: novoPlano, error } = await supabase
      .from('planos_assinatura')
      .insert({
        tenant_id: tenantId,
        nome,
        quantidade_mensal,
        valor_mensal,
        dia_renovacao: diaRenovacao,
        potencia_maxima_kwp: potencia_maxima_kwp !== undefined ? potencia_maxima_kwp : null,
        ativo: true
      })
      .select()
      .single();

    if (error) {
      devLog.error('[API /admin/planos-assinatura POST] Erro ao criar plano:', error);
      throw error;
    }

    devLog.log('[API /admin/planos-assinatura POST] Plano criado:', novoPlano.id);

    return NextResponse.json({
      success: true,
      data: novoPlano
    });

  } catch (error: any) {
    devLog.error('[API /admin/planos-assinatura POST] Erro:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao criar plano' },
      { status: 500 }
    );
  }
}
