import { NextRequest, NextResponse } from 'next/server';
import { devLog } from "@/lib/utils/productionLogger";
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';

export async function GET(request: NextRequest) {
  try {
    devLog.log('[API] [Config] Buscando configurações administrativas');

    // ✅ PRODUÇÃO - Verificar se estamos em contexto de build
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      devLog.warn('[API] [Config] Service Role Key não disponível (provavelmente em build)');
      return NextResponse.json({
        success: true,
        data: null,
        note: 'Service Role Key não configurada'
      });
    }

    const supabase = createSupabaseServiceRoleClient();
    
    // Buscar configurações específicas do negócio
    const { data, error } = await supabase
      .from('configs')
      .select('key, value, description')
      .in('key', [
        'checklist_message',
        'tabela_precos', 
        'faixas_potencia',
        'dados_bancarios'
      ])
      .eq('is_active', true);

    if (error) {
      devLog.error('[API] [Config] Erro ao buscar configurações:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar configurações', details: error.message },
        { status: 500 }
      );
    }

    // Converter para formato esperado
    const config: any = {};
    data?.forEach(item => {
      config[item.key] = item.value;
    });

    devLog.log('[API] [Config] Configurações encontradas:', Object.keys(config));

    return NextResponse.json({
      success: true,
      data: config
    });

  } catch (error) {
    devLog.error('[API] [Config] Exceção:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    devLog.log('[API] [Config] Salvando configurações administrativas');

    // ✅ PRODUÇÃO - Verificar se estamos em contexto de build
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      devLog.warn('[API] [Config] Service Role Key não disponível (provavelmente em build)');
      return NextResponse.json({
        success: false,
        error: 'Service Role Key não configurada'
      });
    }

    const supabase = createSupabaseServiceRoleClient();
    const body = await request.json();
    
    const { key, value, description } = body;

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: 'Chave e valor são obrigatórios' },
        { status: 400 }
      );
    }

    devLog.log('[API] [Config] Salvando configuração:', { key, description });

    // Verificar se configuração já existe
    const { data: existing } = await supabase
      .from('configs')
      .select('id')
      .eq('key', key)
      .single();

    if (existing) {
      // Atualizar configuração existente
      const { error } = await supabase
        .from('configs')
        .update({
          value,
          description,
          updated_at: new Date().toISOString()
        })
        .eq('key', key);

      if (error) {
        devLog.error('[API] [Config] Erro ao atualizar configuração:', error);
        return NextResponse.json(
          { error: 'Erro ao atualizar configuração', details: error.message },
          { status: 500 }
        );
      }

      devLog.log('[API] [Config] Configuração atualizada:', key);
    } else {
      // Criar nova configuração
      const { error } = await supabase
        .from('configs')
        .insert([{
          key,
          value,
          description: description || `Configuração ${key}`,
          category: key.includes('preco') || key.includes('potencia') ? 'pricing' : 'business',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);

      if (error) {
        devLog.error('[API] [Config] Erro ao criar configuração:', error);
        return NextResponse.json(
          { error: 'Erro ao criar configuração', details: error.message },
          { status: 500 }
        );
      }

      devLog.log('[API] [Config] Nova configuração criada:', key);
    }

    return NextResponse.json({
      success: true,
      message: 'Configuração salva com sucesso'
    });

  } catch (error) {
    devLog.error('[API] [Config] Exceção:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}
