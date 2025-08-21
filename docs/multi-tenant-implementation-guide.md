# 🏢 Guia de Implementação Multi-Tenant

## 📋 Visão Geral

Este guia detalha como transformar a aplicação SGF de single-tenant para **multi-tenant** usando o modelo **"Shared Database, Shared Schema"** com subdomínios.

### 🎯 Modelo Escolhido: **SUBDOMÍNIO**
- **URL**: `empresa1.seuapp.com`, `empresa2.seuapp.com`
- **Vantagens**: Mais seguro, profissional, padrão de mercado
- **Isolamento**: Completo por `tenant_id` + RLS

## 🗃️ Estrutura do Banco de Dados

### Hierarquia Multi-Tenant
```
organizations (tenant principal)
├── users (tenant_id)
├── projects (tenant_id)
├── clients (tenant_id)
├── configs (tenant_id)
├── notifications (tenant_id)
├── active_sessions (tenant_id)
└── financial_transactions (tenant_id)
```

### 📊 Planos e Limites

| Recurso | Basic | Premium | Enterprise |
|---------|--------|---------|------------|
| **Usuários** | 5 | 25 | Ilimitado |
| **Projetos** | 10 | 100 | Ilimitado |
| **Clientes** | 50 | 500 | Ilimitado |
| **Storage** | 1GB | 10GB | 100GB |
| **Transações/mês** | 100 | 1.000 | Ilimitado |

## 🚀 Passo a Passo de Implementação

### **FASE 1: Configuração do Banco (PRIMEIRO)**

#### 1.1 Executar Scripts SQL
```sql
-- No Supabase SQL Editor, execute:
\i supabase/sql/00_run_all_setup.sql
```

Ou execute os arquivos individualmente:
1. `01_create_organizations_table.sql` - Tabela de organizações
2. `02_create_users_table.sql` - Usuários com tenant_id
3. `03_create_projects_table.sql` - Projetos com tenant_id
4. `04_create_clients_table.sql` - Clientes com tenant_id
5. `05_create_supporting_tables.sql` - Tabelas auxiliares
6. `06_setup_rls_policies.sql` - Políticas de segurança
7. `07_plan_limits_and_utilities.sql` - Funções de controle
8. `08_initial_data_and_setup.sql` - Dados iniciais

#### 1.2 Criar Usuário Super Admin
```sql
-- 1. Criar no Supabase Auth Dashboard
-- 2. Inserir na tabela users:
INSERT INTO public.users (
    id, -- UUID do Supabase Auth
    tenant_id, -- ID da organização
    email,
    name,
    role,
    user_type,
    permissions,
    status
) VALUES (
    'UUID_DO_SUPABASE_AUTH',
    (SELECT id FROM public.organizations WHERE slug = 'sgf-energia'),
    'admin@sgfenergia.com.br',
    'Super Administrador',
    'superadmin',
    'superadmin',
    '{
        "can_create_projects": true,
        "can_edit_projects": true,
        "can_delete_projects": true,
        "can_manage_users": true,
        "can_view_financials": true,
        "can_export_data": true,
        "can_manage_organization": true
    }',
    'active'
);
```

### **FASE 2: Configuração de DNS e Subdomínios**

#### 2.1 Configuração DNS
```dns
# Adicionar registros DNS:
*.seuapp.com    CNAME    seuapp.com
empresa1.seuapp.com    CNAME    seuapp.com
empresa2.seuapp.com    CNAME    seuapp.com
```

#### 2.2 SSL Wildcard
- Obter certificado SSL wildcard para `*.seuapp.com`
- Configurar no Vercel/Netlify/servidor

### **FASE 3: Atualização do Código**

#### 3.1 Middleware de Tenant Detection
```typescript
// src/middleware.ts
export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const subdomain = hostname.split('.')[0]
  
  // Detectar tenant pelo subdomínio
  const tenant = await getTenantBySlug(subdomain)
  
  if (!tenant) {
    return NextResponse.redirect(new URL('/tenant-not-found', request.url))
  }
  
  // Adicionar tenant_id ao header
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-tenant-id', tenant.id)
  
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}
```

#### 3.2 Context de Tenant
```typescript
// src/lib/contexts/TenantContext.tsx
interface TenantContextType {
  tenant: Organization | null
  isLoading: boolean
  switchTenant: (slug: string) => void
}

export const TenantProvider = ({ children }: { children: ReactNode }) => {
  const [tenant, setTenant] = useState<Organization | null>(null)
  
  // Lógica para obter tenant atual
  useEffect(() => {
    const hostname = window.location.hostname
    const subdomain = hostname.split('.')[0]
    loadTenant(subdomain)
  }, [])
  
  return (
    <TenantContext.Provider value={{ tenant, isLoading, switchTenant }}>
      {children}
    </TenantContext.Provider>
  )
}
```

#### 3.3 Atualização das Server Actions
```typescript
// Exemplo: src/lib/actions/project-actions.ts
export async function createProjectAction(
  projectData: CreateProjectData,
  user: User
) {
  // Obter tenant_id do usuário
  const tenantId = await getUserTenantId(user.id)
  
  // Verificar limites
  const canCreate = await checkProjectLimit(tenantId)
  if (!canCreate) {
    throw new Error('Limite de projetos excedido')
  }
  
  // Criar projeto com tenant_id
  const { data, error } = await supabase
    .from('projects')
    .insert({
      ...projectData,
      tenant_id: tenantId, // OBRIGATÓRIO
      created_by: user.id
    })
    
  return { data, error }
}
```

#### 3.4 Atualização dos Componentes
```typescript
// Exemplo: src/components/ProjectList.tsx
export function ProjectList() {
  const { tenant } = useTenant()
  const { data: projects } = useQuery({
    queryKey: ['projects', tenant?.id],
    queryFn: () => getProjectsByTenant(tenant?.id),
    enabled: !!tenant
  })
  
  return (
    <div>
      <h2>Projetos - {tenant?.name}</h2>
      {projects?.map(project => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  )
}
```

### **FASE 4: Sistema de Registro de Organizações**

#### 4.1 Página de Registro
```typescript
// src/app/register-organization/page.tsx
export default function RegisterOrganization() {
  const handleSubmit = async (data: {
    orgName: string
    slug: string
    adminEmail: string
    adminName: string
    plan: 'basic' | 'premium' | 'enterprise'
  }) => {
    // Validar slug disponível
    const available = await checkSlugAvailability(data.slug)
    if (!available) {
      throw new Error('Subdomínio já está em uso')
    }
    
    // Criar organização
    const orgId = await initializeNewOrganization(
      data.orgName,
      data.slug,
      data.adminEmail,
      data.adminName,
      data.plan
    )
    
    // Redirecionar para subdomínio
    window.location.href = `https://${data.slug}.seuapp.com/login`
  }
  
  return <OrganizationRegistrationForm onSubmit={handleSubmit} />
}
```

## 🔒 Segurança e Isolamento

### Row Level Security (RLS)
```sql
-- Exemplo de política RLS
CREATE POLICY "tenant_isolation" ON public.projects
FOR ALL USING (
    tenant_id = (
        SELECT tenant_id 
        FROM public.users 
        WHERE id = auth.uid()
    )
);
```

### Verificações de Limite
```typescript
// Antes de criar recursos
const canCreate = await checkLimit(tenantId, 'projects')
if (!canCreate.can_proceed) {
  throw new Error(`Limite excedido: ${canCreate.message}`)
}
```

## 📊 Monitoramento e Analytics

### Dashboard de Organização
```sql
SELECT * FROM get_organization_dashboard('org-uuid-here');
```

### Estatísticas de Uso
```sql
SELECT * FROM get_usage_statistics(
    'org-uuid-here',
    '2024-01-01'::date,
    '2024-12-31'::date
);
```

## 🧪 Testes de Isolamento

### Teste 1: Isolamento de Dados
```typescript
// Verificar se usuário da Org A não vê dados da Org B
test('tenant isolation', async () => {
  const userOrgA = await createTestUser('org-a')
  const userOrgB = await createTestUser('org-b')
  
  const projectsA = await getProjects(userOrgA)
  const projectsB = await getProjects(userOrgB)
  
  expect(projectsA).not.toContain(projectsB[0])
})
```

### Teste 2: Limites de Plano
```typescript
test('plan limits enforcement', async () => {
  const basicOrg = await createTestOrg('basic')
  
  // Tentar criar mais projetos que o limite
  const promises = Array(15).fill(null).map(() => 
    createProject(basicOrg.id)
  )
  
  await expect(Promise.all(promises))
    .rejects.toThrow('Limite de projetos excedido')
})
```

## 🚨 Troubleshooting

### Problemas Comuns

**1. RLS não funciona**
```sql
-- Verificar se RLS está habilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

**2. Tenant não detectado**
```typescript
// Verificar middleware
console.log('Headers:', request.headers.get('x-tenant-id'))
```

**3. Limites não respeitados**
```sql
-- Verificar função de limites
SELECT * FROM check_limit('tenant-id', 'projects');
```

## 📈 Próximos Passos

1. **Implementar cache** para tenant detection
2. **Configurar CDN** por subdomínio
3. **Analytics separados** por tenant
4. **Backup automático** por organização
5. **API rate limiting** por tenant

## 🔧 Comandos Úteis

```sql
-- Verificar configuração do sistema
SELECT * FROM verify_system_setup();

-- Dashboard de organização
SELECT * FROM get_organization_dashboard('org-id');

-- Verificar limites
SELECT * FROM check_limit('org-id', 'users');

-- Limpeza de dados antigos
SELECT * FROM cleanup_old_data('org-id');

-- Upgrade de plano
SELECT upgrade_organization_plan('org-id', 'premium', 'user-id');
```

## 📞 Suporte

Para dúvidas ou problemas:
1. Verificar logs do Supabase
2. Executar `verify_system_setup()`
3. Consultar documentação das funções SQL
4. Testar isolamento entre tenants

---

**🎉 Parabéns! Seu sistema multi-tenant está pronto para produção!**
