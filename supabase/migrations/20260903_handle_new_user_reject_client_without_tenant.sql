-- ═══════════════════════════════════════════════════════════════════════════
-- Endurece a função handle_new_user() (trigger on_auth_user_created em
-- auth.users) para nunca mais criar um cliente "órfão" (tenant_id NULL)
-- silenciosamente.
--
-- Causa raiz identificada: quando um cadastro de cliente (role metadata
-- 'cliente'/'client') chega sem um tenant_slug válido nos metadados do
-- usuário, a função caía num fallback para o slug literal 'default' — que
-- não corresponde a nenhuma organização real. A busca não encontrava nada,
-- e mesmo assim o INSERT em public.users prosseguia normalmente, gravando
-- tenant_id = NULL e status = 'pending', sem erro nenhum. O cliente ficava
-- "fantasma": logava normalmente, mas sem organização associada, e qualquer
-- ação dependente de tenant_id ficava imprevisível até alguém notar e
-- corrigir manualmente o registro.
--
-- Esse cenário ocorreu de fato no cadastro de um cliente (30/10/2025) feito
-- pelo domínio próprio de um tenant (ex: app.colmeiasolar.com): o formulário
-- de cadastro (src/components/client/register-form.tsx) só sabia detectar o
-- tenant a partir de subdomínios *.gerenciamentofotovoltaico.com.br, então
-- em domínio próprio o tenant_slug chegava ausente. Esse bug foi corrigido
-- separadamente no formulário (agora ele resolve o tenant via
-- /api/tenant/organization, que usa os headers do middleware e funciona em
-- qualquer domínio). Esta migration é a segunda camada: garante que, mesmo
-- que algum caminho futuro volte a enviar um cadastro de cliente sem tenant
-- resolvido, o cadastro falhe de forma clara e visível, em vez de criar um
-- registro quebrado silenciosamente.
--
-- Importante — o que NÃO muda:
-- - Autocadastro de nova organização (src/lib/actions/registration-actions.ts,
--   rota /registro): envia role='admin' e nunca envia tenant_slug de propósito
--   (a organização ainda não existe nesse momento; tenant_id é preenchido logo
--   em seguida por um UPSERT explícito). Não é afetado, pois a trava só age
--   quando role normalizado é 'cliente'/'client'.
-- - Criação de membro de equipe (src/app/api/admin/team-members/route.ts):
--   não envia role nem tenant_slug nos metadados do Auth (o tenant_id correto
--   é gravado depois, via INSERT explícito da própria rota). Como a role não
--   normaliza para 'cliente'/'client', também não é afetada.
-- - Criação de cliente pelo admin (src/app/api/admin/create-client/route.ts):
--   já envia um tenant_slug correto (lido do header x-tenant-id/x-tenant-slug
--   do middleware), então sempre resolve a organização normalmente.
--
-- Ou seja: a trava só entra em ação exatamente no cenário problemático —
-- cadastro explicitamente marcado como cliente que não conseguiu resolver
-- nenhuma organização.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
  DECLARE
      user_metadata JSONB;
      tenant_slug_value TEXT;
      tenant_record RECORD;
      user_role TEXT;
  BEGIN
      -- Obter metadados do usuário
      user_metadata := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);

      -- Log para debug (melhorado)
      RAISE LOG 'handle_new_user: Processing user % with metadata %',
  NEW.id, user_metadata;

      -- Obter tenant_slug dos metadados
      tenant_slug_value := user_metadata->>'tenant_slug';

      -- Buscar tenant_id baseado no slug. Mantemos a consulta sempre executada
      -- (mesmo com tenant_slug_value NULL) para que "tenant_record" sempre
      -- fique num estado "atribuído" — em plpgsql, um RECORD nunca atribuído
      -- via SELECT INTO gera erro ao acessar seus campos (ex: tenant_record.id),
      -- diferente de um SELECT INTO que roda e não encontra linha (nesse caso
      -- os campos ficam simplesmente NULL, sem erro). Não usamos mais o
      -- fallback fictício 'default': com slug NULL/vazio, "WHERE slug = ..."
      -- já não encontra nenhuma linha naturalmente.
      SELECT id INTO tenant_record
      FROM organizations
      WHERE slug = tenant_slug_value
      LIMIT 1;

      IF NOT FOUND THEN
          RAISE LOG 'handle_new_user: Tenant not found for slug %', COALESCE(tenant_slug_value, '(vazio)');
      END IF;

      -- Normalizar role: "cliente" -> "client"
      user_role := user_metadata->>'role';
      IF user_role = 'cliente' THEN
          user_role := 'client';
      END IF;

      -- 🔒 TRAVA DE SEGURANÇA: um cadastro explicitamente marcado como cliente
      -- sempre precisa resolver para uma organização existente. Se não
      -- resolver, abortamos a criação do usuário com um erro claro, em vez de
      -- silenciosamente gravar um cliente órfão (tenant_id NULL) como ocorria
      -- antes desta migration.
      IF user_role IN ('cliente', 'client') AND tenant_record.id IS NULL THEN
          RAISE EXCEPTION 'Não foi possível identificar a organização (tenant) para este cadastro de cliente (slug recebido: %). Cadastro cancelado.',
              COALESCE(tenant_slug_value, '(vazio)')
              USING ERRCODE = 'P0101';
      END IF;

      -- Log dos dados que serão inseridos
      RAISE LOG 'handle_new_user: Inserting - phone: %, cpf: %, isCompany: \r\n   %, role: %',
          user_metadata->>'phone',
          user_metadata->>'cpf',
          user_metadata->>'isCompany',
          user_role;

      -- Inserir/atualizar dados na tabela users
      INSERT INTO users (
          id,
          email,
          name,
          phone,
          role,
          tenant_id,
          cpf,
          is_company,
          company_name,
          cnpj,
          status,
          permissions,
          settings,
          auth_provider,
          created_at,
          updated_at
      ) VALUES (
          NEW.id,
          NEW.email,
          COALESCE(user_metadata->>'full_name', NEW.email),
          user_metadata->>'phone',
          COALESCE(user_role, 'client'), -- Usar role corrigido
          tenant_record.id,
          user_metadata->>'cpf',
          COALESCE((user_metadata->>'isCompany')::boolean, false),
          user_metadata->>'companyName',
          user_metadata->>'cnpj',
          'pending',
          jsonb_build_object(
              'can_export_data', false,
              'can_manage_users', false,
              'can_edit_projects', false,
              'can_create_projects', true,
              'can_delete_projects', false,
              'can_view_financials', false
          ),
          jsonb_build_object(
              'preferences', jsonb_build_object(
                  'theme', 'light',
                  'language', 'pt-BR',
                  'timezone', 'America/Sao_Paulo'
              ),
              'notifications', jsonb_build_object(
                  'push', true,
                  'email', true,
                  'system_alerts', true,
                  'project_updates', true
              )
          ),
          'supabase',
          NOW(),
          NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email,
          name = COALESCE(EXCLUDED.name, users.name),
          phone = COALESCE(EXCLUDED.phone, users.phone),
          cpf = COALESCE(EXCLUDED.cpf, users.cpf),
          is_company = COALESCE(EXCLUDED.is_company, users.is_company),
          company_name = COALESCE(EXCLUDED.company_name,
  users.company_name),
          cnpj = COALESCE(EXCLUDED.cnpj, users.cnpj),
          updated_at = NOW();

      RAISE LOG 'handle_new_user: Successfully processed user %', NEW.id;

      RETURN NEW;
  EXCEPTION
      WHEN OTHERS THEN
          -- A cláusula original capturava e silenciava QUALQUER erro (o que
          -- incluiria a nossa nova RAISE EXCEPTION acima, anulando a trava).
          -- Por isso, só o nosso erro específico (ERRCODE P0101 = tenant não
          -- encontrado para cadastro de cliente) é deixado propagar, cancelando
          -- a criação do usuário. Qualquer outro erro mantém o comportamento
          -- original: fica só no log, sem bloquear o cadastro.
          IF SQLSTATE = 'P0101' THEN
              RAISE;
          END IF;
          RAISE LOG 'handle_new_user: Error processing user %: %', NEW.id, SQLERRM;
          RETURN NEW;
  END;
  $function$
;
