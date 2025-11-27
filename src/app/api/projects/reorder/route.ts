import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';

/**
 * API Route para atualizar a ordenação manual dos projetos no Kanban
 * POST /api/projects/reorder
 *
 * Body: {
 *   updates: Array<{ id: string; kanban_position: number }>
 * }
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[API /projects/reorder] Iniciando atualização de ordenação');

    const body = await request.json();
    const { updates } = body;

    console.log('[API /projects/reorder] Body recebido:', { updates });

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Lista de atualizações inválida' },
        { status: 400 }
      );
    }

    console.log('[API /projects/reorder] Updates recebidos:', updates.length);

    // Obter cliente Supabase Service Role (bypassa RLS para evitar recursão infinita)
    console.log('[API /projects/reorder] Criando cliente Supabase Service Role...');
    const supabase = createSupabaseServiceRoleClient();
    console.log('[API /projects/reorder] Cliente Supabase Service Role criado');

    // 🔒 SEGURANÇA: Obter tenant_id dos headers (injetado pelo middleware)
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      console.error('[API /projects/reorder] Tenant ID não encontrado nos headers');
      return NextResponse.json(
        { success: false, error: 'Tenant não identificado' },
        { status: 403 }
      );
    }

    console.log('[API /projects/reorder] Tenant ID:', tenantId);

    // Validar que todos os updates têm id e kanban_position
    for (const update of updates) {
      if (!update.id || typeof update.kanban_position !== 'number') {
        return NextResponse.json(
          { success: false, error: 'Formato de update inválido' },
          { status: 400 }
        );
      }
    }

    // Verificar se a coluna kanban_position existe
    // Se não existir, retornar erro informativo
    console.log('[API /projects/reorder] Verificando se coluna existe...');
    const { data: checkData, error: columnCheckError } = await supabase
      .from('projects')
      .select('kanban_position')
      .limit(1);

    console.log('[API /projects/reorder] Resultado verificação:', { checkData, columnCheckError });

    if (columnCheckError) {
      console.error('[API /projects/reorder] Erro ao verificar coluna:', columnCheckError);

      if (columnCheckError.message.includes('column') ||
          columnCheckError.code === '42703' ||
          columnCheckError.message.includes('kanban_position')) {
        return NextResponse.json(
          {
            success: false,
            error: 'A coluna kanban_position não existe no banco de dados. Execute o script SQL: scripts/add-kanban-position-field.sql',
            details: columnCheckError.message
          },
          { status: 500 }
        );
      }
    }

    // Atualizar cada projeto individualmente
    // Nota: Em um sistema de alta performance, isso poderia ser otimizado
    // com uma query SQL única, mas para segurança multi-tenant mantemos individual
    const results = [];
    const errors = [];

    console.log('[API /projects/reorder] Iniciando atualizações...');
    for (const update of updates) {
      console.log(`[API /projects/reorder] Atualizando projeto ${update.id} para posição ${update.kanban_position}`);

      // 🔒 CRITICAL: Garantir isolamento de tenant ao usar Service Role
      const { data, error } = await supabase
        .from('projects')
        .update({ kanban_position: update.kanban_position })
        .eq('id', update.id)
        .eq('tenant_id', tenantId) // ✅ PROTEÇÃO: Só atualiza se pertence ao tenant
        .select()
        .single();

      if (error) {
        console.error(`[API /projects/reorder] Erro ao atualizar projeto ${update.id}:`, error);
        errors.push({ id: update.id, error: error.message, code: error.code });
      } else {
        console.log(`[API /projects/reorder] Projeto ${update.id} atualizado com sucesso`);
        results.push(data);
      }
    }

    // Se houve algum erro, retornar detalhes
    if (errors.length > 0) {
      console.error('[API /projects/reorder] Erros ao atualizar:', errors);
      return NextResponse.json(
        {
          success: false,
          error: `Erro ao atualizar ${errors.length} projeto(s)`,
          details: errors,
          successCount: results.length
        },
        { status: 500 }
      );
    }

    console.log('[API /projects/reorder] ✅ Ordenação atualizada com sucesso:', results.length);

    return NextResponse.json({
      success: true,
      message: 'Ordenação atualizada com sucesso',
      updated: results.length
    });

  } catch (error: any) {
    console.error('[API /projects/reorder] Erro capturado:', error);
    console.error('[API /projects/reorder] Stack:', error.stack);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erro ao atualizar ordenação',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
