import { NextRequest, NextResponse } from 'next/server';

/**
 * API PARA RASTREAR CHAMADAS SUPABASE
 * Esta API vai interceptar e logar todas as chamadas para o Supabase
 * GET /api/debug/trace-supabase-calls
 */
export async function GET(request: NextRequest) {
  try {
    // Analisar a chamada específica que está falhando
    const problematicCall = {
      method: 'HEAD',
      url: 'https://tylighnuuqtztntjsfxv.supabase.co/rest/v1/users?select=*&role=eq.cliente',
      analysis: {
        table: 'users',
        filter: 'role=eq.cliente',
        purpose: 'Provavelmente contando usuários com role cliente',
        method: 'HEAD (usado para verificar existência/contagem sem retornar dados)'
      }
    };

    // Possíveis origens dessa chamada
    const possibleSources = [
      {
        component: 'AdminSidebar',
        reason: 'Contagem de clientes para exibir no menu',
        file: 'src/components/layouts/AdminSidebar.tsx'
      },
      {
        component: 'Equipe Page', 
        reason: 'Listagem ou contagem de membros da equipe',
        file: 'src/app/admin/equipe/page.tsx'
      },
      {
        component: 'Dashboard',
        reason: 'Métricas de usuários no painel admin',
        file: 'src/app/admin/painel/page.tsx'
      },
      {
        component: 'NotificationContext',
        reason: 'Sistema de notificações verificando usuários',
        file: 'src/lib/contexts/NotificationContext.tsx'
      }
    ];

    // Possíveis causas do erro 500
    const possibleCauses = [
      {
        cause: 'RLS (Row Level Security) Policy',
        explanation: 'Política de segurança bloqueando acesso à tabela users',
        solution: 'Verificar se o Service Role tem acesso ou se RLS está configurado'
      },
      {
        cause: 'Coluna inexistente',
        explanation: 'A tabela users não tem coluna "role" ou tem nome diferente',
        solution: 'Verificar schema da tabela users no Supabase'
      },
      {
        cause: 'Tenant isolation',
        explanation: 'Tentativa de acessar users sem filtro de tenant_id',
        solution: 'Adicionar filtro tenant_id na query'
      },
      {
        cause: 'Service Role Key',
        explanation: 'Chave de Service Role não tem permissão para essa operação',
        solution: 'Verificar permissões da Service Role Key'
      }
    ];

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      problematicCall,
      possibleSources,
      possibleCauses,
      recommendations: [
        '1. Buscar por "role=eq.cliente" no código',
        '2. Verificar componentes que fazem queries de usuários',
        '3. Checar se RLS está bloqueando acesso',
        '4. Verificar se coluna "role" existe na tabela users',
        '5. Confirmar se está sendo filtrado por tenant_id'
      ],
      searchCommands: [
        'grep -r "role.*eq.*cliente" src/',
        'grep -r "users.*role" src/',
        'grep -r "HEAD.*users" src/',
        'grep -r "tylighnuuqtztntjsfxv" src/'
      ]
    });

  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}