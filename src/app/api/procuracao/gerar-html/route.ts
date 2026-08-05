import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';

/**
 * API para gerar HTML da procuração
 * Usa o template configurado nas preferências do admin
 * e substitui as variáveis com os dados do projeto e responsável técnico
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { project_id, userId } = body;

    if (!project_id) {
      return NextResponse.json(
        { error: 'project_id é obrigatório' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Acesso negado: usuário não identificado' },
        { status: 401 }
      );
    }

    // Buscar configurações do sistema (template e responsável técnico)
    const headersList = headers();
    const tenantId = headersList.get('x-tenant-id');

    if (!tenantId) {
      console.error('[Procuracao API] Tenant ID não encontrado nos headers');
      return NextResponse.json(
        { error: 'Acesso negado: tenant não identificado' },
        { status: 403 }
      );
    }

    const supabase = createSupabaseServiceRoleClient();

    // ✅ Busca o projeto direto do banco, escopado ao tenant do request — garante
    // que cada tenant só gera procuração dos seus próprios projetos, e usa os
    // dados realmente salvos (não o que veio no corpo da requisição).
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, tenant_id, owner_id, created_by, nome_cliente_final, cpf_cnpj_cliente_final, client_city, client_state, distribuidora')
      .eq('id', project_id)
      .eq('tenant_id', tenantId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Projeto não encontrado' },
        { status: 404 }
      );
    }

    // ✅ Autorização: admin/superadmin/colaborador podem gerar de qualquer
    // projeto do tenant; qualquer outro usuário (cliente) só do projeto dele.
    const { data: requestingUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .eq('tenant_id', tenantId)
      .single();

    const isInternalRole = requestingUser?.role === 'admin' ||
      requestingUser?.role === 'superadmin' ||
      requestingUser?.role === 'colaborador';
    const isProjectOwner = project.owner_id === userId || project.created_by === userId;

    if (!isInternalRole && !isProjectOwner) {
      return NextResponse.json(
        { error: 'Você não tem permissão para gerar a procuração deste projeto' },
        { status: 403 }
      );
    }

    const nome_cliente_final = project.nome_cliente_final;
    const cpf_cnpj_cliente_final = project.cpf_cnpj_cliente_final;
    const client_city = project.client_city;
    const client_state = project.client_state;
    const distribuidora = project.distribuidora;

    // Validar campos obrigatórios (dados salvos no projeto)
    if (!nome_cliente_final || !cpf_cnpj_cliente_final || !client_city || !client_state || !distribuidora) {
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios. Salve os dados do projeto antes de gerar a procuração.' },
        { status: 400 }
      );
    }

    const { data: configData, error: configError } = await supabase
      .from('configs')
      .select('key, value')
      .eq('tenant_id', tenantId)
      .in('key', ['texto_procuracao', 'responsavel_tecnico'])
      .returns<{ key: string; value: any }[]>();

    if (configError) {
      console.error('[Procuracao API] Erro ao buscar configurações:', configError);
      return NextResponse.json(
        { error: 'Erro ao buscar configurações do sistema' },
        { status: 500 }
      );
    }

    // Extrair template e dados do responsável técnico
    // ✅ Parse dos valores JSONB que vêm como strings serializadas
    const configMap = new Map(configData?.map(item => {
      let parsedValue = item.value;

      // Se o valor for uma string, tentar fazer parse
      if (typeof item.value === 'string') {
        try {
          parsedValue = JSON.parse(item.value);
        } catch (e) {
          // Se falhar o parse, usar o valor original
        }
      }

      return [item.key, parsedValue];
    }) || []);

    const textoProcuracao = configMap.get('texto_procuracao');
    const responsavelTecnico = configMap.get('responsavel_tecnico');

    if (!textoProcuracao) {
      return NextResponse.json(
        { error: 'Template de procuração não configurado nas preferências' },
        { status: 400 }
      );
    }

    if (!responsavelTecnico) {
      return NextResponse.json(
        { error: 'Dados do responsável técnico não configurados nas preferências' },
        { status: 400 }
      );
    }

    // Formatar CPF/CNPJ
    const formatCpfCnpj = (value: string) => {
      const numbers = value.replace(/\D/g, '');
      if (numbers.length === 11) {
        // CPF: 000.000.000-00
        return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      } else if (numbers.length === 14) {
        // CNPJ: 00.000.000/0000-00
        return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
      }
      return value;
    };

    const cpfCnpjFormatado = formatCpfCnpj(cpf_cnpj_cliente_final);
    const isCpf = cpf_cnpj_cliente_final.replace(/\D/g, '').length === 11;
    const clienteTipo = isCpf ? 'inscrito(a) no CPF' : 'inscrito(a) no CNPJ';

    // Preparar dados para substituição de variáveis
    const dataAtual = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    // Mapa de variáveis para substituição
    const variaveis: Record<string, string> = {
      // Dados do cliente
      '{{cliente_nome}}': nome_cliente_final || '',
      '{{cliente_tipo}}': clienteTipo || '',
      '{{cliente_rg}}': '', // Não temos este dado no projeto
      '{{cliente_cpf}}': cpfCnpjFormatado || '',

      // Dados do responsável técnico
      '{{responsavel_nome}}': responsavelTecnico.nomeCompleto || '',
      '{{responsavel_cpf}}': formatCpfCnpj(responsavelTecnico.cpf || '') || '',
      '{{responsavel_rg}}': responsavelTecnico.rg || '',
      '{{responsavel_orgao_expeditor}}': responsavelTecnico.orgaoExpeditor || '',
      '{{responsavel_profissao}}': responsavelTecnico.profissao || '',
      '{{responsavel_instituicao}}': responsavelTecnico.instituicao || '',
      '{{responsavel_estado}}': responsavelTecnico.estadoRegistro || '',
      '{{responsavel_registro}}': responsavelTecnico.numeroRegistro || '',

      // Dados do projeto
      '{{distribuidora}}': distribuidora || '',
      '{{cidade}}': client_city || '',
      '{{estado}}': client_state || '',
      '{{data}}': dataAtual
    };

    // Substituir variáveis no template
    let conteudoProcuracao = textoProcuracao;
    Object.entries(variaveis).forEach(([variavel, valor]) => {
      conteudoProcuracao = conteudoProcuracao.replaceAll(variavel, valor);
    });

    // Gerar HTML completo da procuração
    const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Procuração - ${nome_cliente_final}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Times New Roman', Times, serif;
      line-height: 1.6;
      color: #000;
      background: #f5f5f5;
      padding: 20px;
    }

    .container {
      max-width: 210mm;
      margin: 0 auto;
      background: white;
      padding: 40mm 25mm;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
    }

    .toolbar {
      position: fixed;
      top: 20px;
      right: 20px;
      display: flex;
      gap: 10px;
      z-index: 1000;
    }

    .btn {
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .btn-primary {
      background: #2563eb;
      color: white;
    }

    .btn-primary:hover {
      background: #1d4ed8;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    }

    .btn-secondary {
      background: #64748b;
      color: white;
    }

    .btn-secondary:hover {
      background: #475569;
    }

    @media print {
      body {
        background: white;
        padding: 0;
      }

      .container {
        box-shadow: none;
        padding: 10mm;
        max-width: 100%;
      }

      .toolbar {
        display: none;
      }
    }

    @page {
      size: A4;
      margin: 15mm;
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button class="btn btn-secondary" onclick="window.close()">Fechar</button>
    <button class="btn btn-primary" onclick="window.print()">💾 Salvar PDF</button>
  </div>

  <div class="container">
    ${conteudoProcuracao}
  </div>
</body>
</html>
    `;

    // Retornar HTML como resposta
    return new NextResponse(htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
