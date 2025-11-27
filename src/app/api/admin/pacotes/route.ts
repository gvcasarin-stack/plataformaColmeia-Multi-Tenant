import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';
import { headers } from 'next/headers';

// GET: Listar todos os pacotes do tenant
export async function GET(request: NextRequest) {
  try {
    devLog.log('[API /admin/pacotes GET] Iniciando requisição');

    const hdrs = headers();
    const tenantId = hdrs.get('x-tenant-id');

    if (!tenantId) {
      devLog.warn('[API /admin/pacotes GET] Sem tenant-id no header');
      return NextResponse.json({ success: true, data: [] });
    }

    const supabase = createSupabaseServiceRoleClient();

    // Buscar pacotes do tenant
    const { data: pacotes, error } = await supabase
      .from('pacotes_definicoes')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      devLog.error('[API /admin/pacotes GET] Erro ao buscar pacotes:', error);
      return NextResponse.json({ success: true, data: [] });
    }

    devLog.log('[API /admin/pacotes GET] Pacotes encontrados:', pacotes?.length);

    return NextResponse.json({
      success: true,
      data: pacotes || []
    });

  } catch (error: any) {
    devLog.error('[API /admin/pacotes GET] Erro:', error);
    return NextResponse.json({ success: true, data: [] });
  }
}

// POST: Criar novo pacote
export async function POST(request: NextRequest) {
  try {
    devLog.log('[API /admin/pacotes POST] Iniciando criação de pacote');

    const hdrs = headers();
    const tenantId = hdrs.get('x-tenant-id');

    if (!tenantId) {
      devLog.warn('[API /admin/pacotes POST] Sem tenant-id no header');
      return NextResponse.json(
        { success: false, error: 'Tenant não identificado' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceRoleClient();

    // Obter dados do body
    const body = await request.json();
    const { nome, quantidade_projetos, valor, validade_dias, potencia_maxima_kwp } = body;

    // Validações
    if (!nome || !quantidade_projetos || valor === undefined || !validade_dias) {
      return NextResponse.json(
        { success: false, error: 'Campos obrigatórios faltando' },
        { status: 400 }
      );
    }

    if (quantidade_projetos <= 0) {
      return NextResponse.json(
        { success: false, error: 'Quantidade de projetos deve ser maior que zero' },
        { status: 400 }
      );
    }

    if (valor < 0) {
      return NextResponse.json(
        { success: false, error: 'Valor não pode ser negativo' },
        { status: 400 }
      );
    }

    if (validade_dias <= 0) {
      return NextResponse.json(
        { success: false, error: 'Validade deve ser maior que zero' },
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

    // Criar pacote
    const { data: novoPacote, error } = await supabase
      .from('pacotes_definicoes')
      .insert({
        tenant_id: tenantId,
        nome,
        quantidade_projetos,
        valor,
        validade_dias,
        potencia_maxima_kwp: potencia_maxima_kwp !== undefined ? potencia_maxima_kwp : null,
        ativo: true
      })
      .select()
      .single();

    if (error) {
      devLog.error('[API /admin/pacotes POST] Erro ao criar pacote:', error);
      throw error;
    }

    devLog.log('[API /admin/pacotes POST] Pacote criado:', novoPacote.id);

    return NextResponse.json({
      success: true,
      data: novoPacote
    });

  } catch (error: any) {
    devLog.error('[API /admin/pacotes POST] Erro:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao criar pacote' },
      { status: 500 }
    );
  }
}
