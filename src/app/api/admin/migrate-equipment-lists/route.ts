import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';

function str(val: any): string {
  return val !== undefined && val !== null ? String(val) : '';
}

export async function POST() {
  try {
    const hdrs = headers();
    const tenantId = hdrs.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'Tenant não identificado' }, { status: 400 });
    }

    const supabase = createSupabaseServiceRoleClient();

    // Buscar projetos sem modulos_lista ou inversores_lista ainda não migrados
    const { data: projects, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('tenant_id', tenantId)
      .or('modulos_lista.is.null,inversores_lista.is.null');

    if (fetchError) throw fetchError;
    if (!projects || projects.length === 0) {
      return NextResponse.json({ success: true, migrated: 0, message: 'Nenhum projeto para migrar.' });
    }

    let migrated = 0;

    for (const project of projects) {
      const update: Record<string, any> = {};

      // Migrar módulos
      if (!project.modulos_lista) {
        const fabricante = str(project.modulos_fabricante);
        const modelo = str(project.modulos_modelo);
        const potencia_wp = str(project.modulos_potencia_wp);
        const quantidade = str(project.modulos_quantidade) || '1';

        if (fabricante || modelo || potencia_wp) {
          const moduloItem = {
            fabricante,
            modelo,
            potencia_wp,
            quantidade,
            voc: str(project.modulos_voc),
            isc: str(project.modulos_isc),
            vpmp: str(project.modulos_vpmp),
            ipmp: str(project.modulos_ipmp),
            eficiencia: str(project.modulos_eficiencia),
            comprimento_m: str(project.modulos_comprimento_m),
            largura_m: str(project.modulos_largura_m),
            area_unitaria_m2: str(project.modulos_area_unitaria_m2),
            peso_kg: str(project.modulos_peso_kg),
          };
          update.modulos_lista = JSON.stringify([moduloItem]);
        } else {
          update.modulos_lista = JSON.stringify([]);
        }
      }

      // Migrar inversores
      if (!project.inversores_lista) {
        const fabricante = str(project.inversores_fabricante);
        const modelo = str(project.inversores_modelo);
        const potencia = str(project.inversores_potencia);
        const quantidade = str(project.inversores_quantidade) || '1';

        if (fabricante || modelo || potencia) {
          const inversorItem = {
            fabricante,
            modelo,
            potencia,
            quantidade,
            potencia_max_saida: str(project.inversores_potencia_max_saida),
            tensao: str(project.inversores_tensao),
            tensao_max_ca: str(project.inversores_tensao_max_ca),
            tensao_min_ca: str(project.inversores_tensao_min_ca),
            faixa_tensao: str(project.inversores_faixa_tensao),
            vcc_max: str(project.inversores_vcc_max),
            icc_max: str(project.inversores_icc_max),
            vpmp_max: str(project.inversores_vpmp_max),
            vpmp_min: str(project.inversores_vpmp_min),
            vcc_partida: str(project.inversores_vcc_partida),
            corrente_nominal: str(project.inversores_corrente_nominal),
            quantidade_mppt: str(project.inversores_quantidade_mppt),
            entradas_por_mppt: str(project.inversores_entradas_por_mppt),
            tipo_conexao_saida: str(project.inversores_tipo_conexao_saida),
            fator_potencia: str(project.inversores_fator_potencia),
            rendimento: str(project.inversores_rendimento),
            dht_corrente: str(project.inversores_dht_corrente),
          };
          update.inversores_lista = JSON.stringify([inversorItem]);
        } else {
          update.inversores_lista = JSON.stringify([]);
        }
      }

      if (Object.keys(update).length === 0) continue;

      const { error: updateError } = await supabase
        .from('projects')
        .update(update)
        .eq('id', project.id)
        .eq('tenant_id', tenantId);

      if (updateError) {
        devLog.error(`[migrate-equipment-lists] Erro ao migrar projeto ${project.id}:`, updateError);
      } else {
        migrated++;
      }
    }

    return NextResponse.json({
      success: true,
      migrated,
      total: projects.length,
      message: `${migrated} de ${projects.length} projetos migrados com sucesso.`,
    });
  } catch (error: any) {
    devLog.error('[API /admin/migrate-equipment-lists POST] Erro:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
