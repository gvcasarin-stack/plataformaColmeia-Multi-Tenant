import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from "@/lib/utils/productionLogger";

export const dynamic = 'force-dynamic';

/**
 * GET /api/leads
 * Busca todos os leads do tenant atual
 */
export async function GET(request: NextRequest) {
  try {
    const hdrs = headers();
    const tenantId = hdrs.get('x-tenant-id');

    if (!tenantId) {
      devLog.error('[GET /api/leads] Tenant ID não encontrado no header');
      return NextResponse.json(
        { error: 'Tenant não identificado' },
        { status: 403 }
      );
    }

    devLog.log('[GET /api/leads] Buscando leads do tenant:', tenantId);

    const supabase = createSupabaseServiceRoleClient();

    // Buscar leads do tenant (service role bypassa RLS)
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_archived', false)
      .order('created_at', { ascending: false });

    if (error) {
      devLog.error('[GET /api/leads] Erro ao buscar leads:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    devLog.log('[GET /api/leads] Leads encontrados:', data?.length || 0);

    return NextResponse.json({
      success: true,
      data: data || []
    });

  } catch (error: any) {
    devLog.error('[GET /api/leads] Erro inesperado:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar leads' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/leads
 * Cria um novo lead no sistema
 */
export async function POST(request: NextRequest) {
  try {
    const hdrs = headers();
    const tenantId = hdrs.get('x-tenant-id');

    if (!tenantId) {
      devLog.error('[POST /api/leads] Tenant ID não encontrado no header');
      return NextResponse.json(
        { error: 'Tenant não identificado' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, ...leadData } = body;

    if (!userId) {
      devLog.error('[POST /api/leads] User ID não fornecido');
      return NextResponse.json(
        { error: 'Usuário não identificado' },
        { status: 400 }
      );
    }

    // Validar campo obrigatório: name
    if (!leadData.name || leadData.name.trim() === '') {
      return NextResponse.json(
        { error: 'Nome do lead é obrigatório' },
        { status: 400 }
      );
    }

    // Validar status se fornecido
    const validStatuses = ['novo', 'contatado', 'qualificado', 'proposta_enviada', 'em_negociacao', 'ganho', 'perdido'];
    if (leadData.status && !validStatuses.includes(leadData.status)) {
      return NextResponse.json(
        { error: `Status inválido. Valores permitidos: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    devLog.log('[POST /api/leads] Criando lead:', {
      name: leadData.name,
      email: leadData.email,
      tenantId,
      userId
    });

    const supabase = createSupabaseServiceRoleClient();

    // Preparar dados para inserção
    const insertData = {
      ...leadData,
      tenant_id: tenantId,      // ✅ CRÍTICO: ID do tenant
      created_by: userId,       // ✅ ID do usuário que criou
      status: leadData.status || 'novo',  // Default: 'novo'
      is_new: true,             // Badge "NOVO" na UI
      is_archived: false,       // Não arquivado
    };

    // Inserir lead no banco (service role bypassa RLS)
    const { data, error } = await supabase
      .from('leads')
      .insert(insertData)
      .select('*')
      .single();

    if (error) {
      devLog.error('[POST /api/leads] Erro ao inserir lead:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    devLog.log('[POST /api/leads] Lead criado com sucesso:', data.id);

    return NextResponse.json({
      success: true,
      data
    }, { status: 201 });

  } catch (error: any) {
    devLog.error('[POST /api/leads] Erro inesperado:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao criar lead' },
      { status: 500 }
    );
  }
}
