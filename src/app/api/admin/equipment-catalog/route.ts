import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { devLog } from '@/lib/utils/productionLogger';
import { listEquipment, createEquipment } from '@/lib/services/equipmentCatalogService';

export async function GET(request: NextRequest) {
  try {
    const hdrs = headers();
    const tenantId = hdrs.get('x-tenant-id');
    if (!tenantId) return NextResponse.json({ success: true, data: [] });

    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo') || undefined;
    const q = searchParams.get('q') || undefined;

    const data = await listEquipment(tenantId, tipo, q);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    devLog.error('[API /admin/equipment-catalog GET] Erro:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const hdrs = headers();
    const tenantId = hdrs.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'Tenant não identificado' }, { status: 400 });
    }

    const body = await request.json();
    const { tipo, fabricante, modelo } = body;

    if (!tipo || !fabricante || !modelo) {
      return NextResponse.json({ success: false, error: 'Campos obrigatórios: tipo, fabricante, modelo' }, { status: 400 });
    }
    if (tipo !== 'modulo' && tipo !== 'inversor') {
      return NextResponse.json({ success: false, error: 'tipo deve ser "modulo" ou "inversor"' }, { status: 400 });
    }

    const item = await createEquipment(tenantId, body);
    return NextResponse.json({ success: true, data: item });
  } catch (error: any) {
    devLog.error('[API /admin/equipment-catalog POST] Erro:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
