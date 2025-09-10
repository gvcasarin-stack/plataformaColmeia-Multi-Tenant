/**
 * API de Debug para testar a busca de organização
 * Permite diagnosticar problemas na API /api/tenant/organization
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/server';
import { devLog } from '@/lib/utils/productionLogger';

export async function GET(request: NextRequest) {
  try {
    devLog.log('[Organization-Debug] Iniciando teste da organização');
    
    const headersList = headers();
    const tenantId = headersList.get('x-tenant-id');
    const tenantSlug = headersList.get('x-tenant-slug');

    const debugInfo = {
      headers: {
        tenantId,
        tenantSlug,
        allHeaders: Object.fromEntries(headersList.entries())
      }
    };

    devLog.log('[Organization-Debug] Headers recebidos:', debugInfo.headers);

    if (!tenantId) {
      return NextResponse.json({
        success: false,
        error: 'Tenant ID não encontrado',
        debug: debugInfo
      }, { status: 400 });
    }

    const supabase = createSupabaseServiceRoleClient();

    // Primeiro, vamos testar se a tabela organizations existe
    devLog.log('[Organization-Debug] Testando estrutura da tabela...');
    
    try {
      const { data: tableTest, error: tableError } = await supabase
        .from('organizations')
        .select('id')
        .limit(1);

      debugInfo.tableTest = {
        exists: !tableError,
        error: tableError?.message,
        hasData: !!tableTest && tableTest.length > 0
      };

      devLog.log('[Organization-Debug] Teste da tabela:', debugInfo.tableTest);
    } catch (err) {
      debugInfo.tableTest = {
        exists: false,
        error: err.message
      };
    }

    // Agora vamos testar a busca específica
    devLog.log('[Organization-Debug] Buscando organização com ID:', tenantId);
    
    try {
      const { data: organization, error } = await supabase
        .from('organizations')
        .select(`
          id,
          name,
          slug,
          tenant_id,
          plan_id,
          settings,
          contact_email,
          status,
          is_trial,
          trial_started_at,
          trial_ends_at,
          subscription_status,
          stripe_customer_id,
          stripe_subscription_id,
          payment_method_added,
          next_billing_date,
          created_at,
          updated_at
        `)
        .eq('id', tenantId)
        .single();

      debugInfo.organizationQuery = {
        success: !error,
        error: error?.message,
        errorCode: error?.code,
        errorDetails: error?.details,
        errorHint: error?.hint,
        hasOrganization: !!organization,
        organizationFields: organization ? Object.keys(organization) : null
      };

      if (organization) {
        debugInfo.organization = {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          tenant_id: organization.tenant_id,
          status: organization.status,
          is_trial: organization.is_trial,
          hasAllRequiredFields: !!(organization.id && organization.tenant_id && organization.name)
        };
      }

      devLog.log('[Organization-Debug] Resultado da query:', debugInfo.organizationQuery);
      devLog.log('[Organization-Debug] Dados da organização:', debugInfo.organization);

      return NextResponse.json({
        success: true,
        debug: debugInfo,
        message: 'Teste concluído - veja os logs para detalhes'
      });

    } catch (queryError) {
      debugInfo.organizationQuery = {
        success: false,
        error: queryError.message,
        stack: queryError.stack
      };

      devLog.error('[Organization-Debug] Erro na query:', queryError);

      return NextResponse.json({
        success: false,
        error: 'Erro na query da organização',
        debug: debugInfo
      }, { status: 500 });
    }

  } catch (error: any) {
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      name: error.name
    };

    devLog.error('[Organization-Debug] Erro geral:', errorDetails);

    return NextResponse.json({
      success: false,
      error: 'Erro interno no teste',
      details: errorDetails
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Permite testar com dados customizados
  try {
    const body = await request.json();
    const { tenantId: customTenantId } = body;

    if (!customTenantId) {
      return NextResponse.json({
        success: false,
        error: 'Forneça um tenantId no body para testar'
      }, { status: 400 });
    }

    const supabase = createSupabaseServiceRoleClient();

    const { data: organization, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', customTenantId)
      .single();

    return NextResponse.json({
      success: !error,
      data: organization,
      error: error?.message,
      debug: {
        tenantId: customTenantId,
        queryError: error,
        hasResult: !!organization
      }
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
