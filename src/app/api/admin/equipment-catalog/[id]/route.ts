import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { devLog } from '@/lib/utils/productionLogger';
import { updateEquipment, deleteEquipment } from '@/lib/services/equipmentCatalogService';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const hdrs = headers();
    const tenantId = hdrs.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'Tenant não identificado' }, { status: 400 });
    }

    const body = await request.json();
    const { id: _id, tenant_id: _tid, created_at: _ca, ...payload } = body;

    const item = await updateEquipment(tenantId, params.id, payload);
    return NextResponse.json({ success: true, data: item });
  } catch (error: any) {
    devLog.error('[API /admin/equipment-catalog/[id] PUT] Erro:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const hdrs = headers();
    const tenantId = hdrs.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'Tenant não identificado' }, { status: 400 });
    }

    await deleteEquipment(tenantId, params.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    devLog.error('[API /admin/equipment-catalog/[id] DELETE] Erro:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
