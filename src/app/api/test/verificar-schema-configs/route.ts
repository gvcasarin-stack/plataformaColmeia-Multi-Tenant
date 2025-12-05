import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';

/**
 * API para verificar a estrutura da tabela configs
 * Acesse: /api/test/verificar-schema-configs
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServiceRoleClient();

    // Buscar informações sobre as colunas da tabela configs
    // Usando query SQL direta para obter o schema
    const { data: columns, error } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT
            column_name,
            data_type,
            is_nullable,
            column_default
          FROM information_schema.columns
          WHERE table_name = 'configs'
          ORDER BY ordinal_position;
        `
      });

    if (error) {
      // Se o RPC não existir, tentar uma abordagem alternativa
      // Simplesmente buscar um registro e ver os campos disponíveis
      const { data: sample, error: sampleError } = await supabase
        .from('configs')
        .select('*')
        .limit(1)
        .maybeSingle();

      return NextResponse.json({
        method: 'sample_record',
        available_fields: sample ? Object.keys(sample) : [],
        sample_data: sample,
        note: 'Não foi possível usar RPC, mostrando campos de um registro de exemplo',
        error: sampleError
      });
    }

    return NextResponse.json({
      method: 'information_schema',
      columns: columns,
      total_columns: columns?.length || 0
    });

  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
