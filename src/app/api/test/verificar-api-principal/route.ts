import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const hdrs = headers();
    const tenantId = hdrs.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json({
        erro: 'Sem tenant-id',
        mensagem: 'Precisa estar autenticado'
      });
    }

    // Chamar a API principal
    const baseUrl = request.nextUrl.origin;
    const response = await fetch(`${baseUrl}/api/admin/cliente-assinaturas`, {
      headers: {
        'x-tenant-id': tenantId
      }
    });

    const data = await response.json();
    const assinatura = data.data?.[0];

    const resultado = {
      '✅ TESTE DA API PRINCIPAL': '================================',
      'Total assinaturas retornadas': data.data?.length || 0,
      'Assinatura ID': assinatura?.id?.substring(0, 30) + '...',
      'Usuario': assinatura?.users?.name || assinatura?.users?.company_name || '❌ NÃO IDENTIFICADO',
      'Plano': assinatura?.planos_assinatura?.nome || '❌ SEM PLANO',
      'Projetos usados (contador DB)': assinatura?.projetos_usados_mes_atual,
      'Projetos mensais': assinatura?.projetos_mensais,
      'Total projetos vinculados (array completo)': assinatura?.projetos?.length || 0,
      '🎯 ProjetosDoMesAtual (o que importa)': assinatura?.projetosDoMesAtual?.length || 0,
      '': '================================',
      'LISTA DE PROJETOS EM projetosDoMesAtual': assinatura?.projetosDoMesAtual?.map((p: any) => ({
        numero: p.number,
        cliente: p.nome_cliente_final,
        potencia: `${p.potencia} kWp`,
        status: p.status,
        data_criacao: p.created_at?.substring(0, 10)
      })) || [],
      ' ': '================================',
      '❌ PROBLEMA IDENTIFICADO?': assinatura?.projetosDoMesAtual?.length === 0 ?
        'SIM! ProjetosDoMesAtual está vazio. O código ANTIGO ainda está em produção!' :
        'Não. A API está retornando projetos corretamente.',
      'AÇÃO NECESSÁRIA': assinatura?.projetosDoMesAtual?.length === 0 ?
        'Fazer deploy do branch clean-main para produção' :
        'Verificar por que o frontend não está renderizando'
    };

    return NextResponse.json(resultado, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    });

  } catch (error: any) {
    return NextResponse.json({
      erro: 'Erro ao testar API',
      mensagem: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
