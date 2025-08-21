# 🏢 Multi-Tenant Implementation Checklist

## 📋 Visão Geral do Projeto

Transformação da aplicação SGF de single-tenant para multi-tenant usando subdomínios dedicados e sistema de trial de 7 dias.

### 🎯 Arquitetura Definida
- **Site Principal**: `gerenciamentofotovoltaico.com.br` (v0.dev/Vercel - Marketing)
- **Registro**: `registro.gerenciamentofotovoltaico.com.br` (Next.js - Onboarding)
- **Tenants**: `{slug}.gerenciamentofotovoltaico.com.br` (Next.js - Aplicação)

### 🔐 Modelo de Segurança
- Zero exposição de tenants (sem seletor público)
- URLs privadas por organização
- Redirecionamento direto pós-registro
- Controle interno de acesso por empresa

---

## ✅ Status Atual (Concluído)

### 🗃️ Banco de Dados Multi-Tenant
- [x] **Tabela organizations** criada com tenant_id
- [x] **Tabela users** com isolamento por tenant
- [x] **Tabela projects** com tenant_id obrigatório
- [x] **Tabela clients** com isolamento completo
- [x] **Tabelas auxiliares** (configs, notifications, sessions, transactions)
- [x] **Row Level Security (RLS)** configurado
- [x] **Políticas de isolamento** implementadas
- [x] **Funções de controle de limites** por plano

### 💳 Sistema de Trial
- [x] **Campos de trial** adicionados às organizations
- [x] **Planos básico e profissional** configurados
- [x] **Sistema de bloqueio suave** implementado
- [x] **Funções de controle** (get_trial_status, can_create_resource)
- [x] **Ativação de assinatura** via Stripe
- [x] **Sistema de notificações** automáticas
- [x] **Organização SGF** configurada como ativa (não trial)

### 📊 Limites dos Planos
- [x] **Básico**: 30 projetos, 3GB, 10 usuários, 100 clientes
- [x] **Profissional**: 100 projetos, 10GB, 50 usuários, 1000 clientes

---

## 🚧 Implementação Pendente

### 🔧 PASSO 1: MIDDLEWARE DE DETECÇÃO DE SUBDOMÍNIO
**Status**: ✅ **CONCLUÍDO**

#### Tarefas:
- [x] **Criar middleware multi-tenant** em `src/middleware.ts`
  - [x] Detectar `registro.gerenciamentofotovoltaico.com.br`
  - [x] Detectar `{slug}.gerenciamentofotovoltaico.com.br`
  - [x] Ignorar `gerenciamentofotovoltaico.com.br` (site principal)
  - [x] Extrair slug do subdomínio
  - [x] Adicionar `x-tenant-id` e `x-tenant-slug` aos headers
  - [x] Validar se tenant existe no banco
  - [x] Redirecionar para 404 se tenant não existir

#### Código Base:
```typescript
// src/middleware.ts
const hostname = request.headers.get('host') || ''
const isMainSite = hostname === 'gerenciamentofotovoltaico.com.br'
const isRegistroSite = hostname === 'registro.gerenciamentofotovoltaico.com.br'
const isSubdomain = hostname.includes('.gerenciamentofotovoltaico.com.br') && !isMainSite && !isRegistroSite

if (isRegistroSite) {
  // Lógica para página de registro
} else if (isSubdomain) {
  // Lógica para tenant específico
  const slug = hostname.split('.')[0]
  // Validar tenant existe
  // Adicionar headers
}
```

---

### 📁 PASSO 2: ESTRUTURA DE ROTAS
**Status**: ✅ **CONCLUÍDO**

#### Tarefas:
- [x] **Reorganizar estrutura de pastas**
  ```
  src/app/
  ├── (registro)/              # Para registro.gerenciamento...
  │   ├── page.tsx            # Formulário de registro
  │   ├── layout.tsx          # Layout específico
  │   └── loading.tsx         # Loading state
  ├── (tenant)/               # Para {slug}.gerenciamento...
  │   ├── admin/
  │   │   ├── login/page.tsx  # Login integradores
  │   │   └── painel/page.tsx # Dashboard admin
  │   ├── cliente/
  │   │   ├── login/page.tsx  # Login clientes finais
  │   │   └── painel/page.tsx # Dashboard cliente
  │   └── layout.tsx          # Layout tenant
  └── globals.css
  ```

- [x] **Criar layouts específicos**
  - [x] Layout para página de registro
  - [x] Layout para tenants (com dados da organização)
  - [x] Componente de detecção de contexto

---

### 🔍 PASSO 3: API DE VALIDAÇÃO DE SLUG
**Status**: ✅ **CONCLUÍDO**

#### Tarefas:
- [x] **Criar API de verificação** `src/app/api/check-slug/route.ts`
  - [x] Validar se slug está disponível
  - [x] Verificar formato do slug (regex)
  - [x] Sugerir alternativas se ocupado
  - [x] Rate limiting para evitar abuse

#### Especificações:
```typescript
// GET /api/check-slug?slug=empresa-abc
interface SlugCheckResponse {
  available: boolean
  slug: string
  suggestions?: string[]
  error?: string
}
```

- [x] **Validação de formato**:
  - Apenas letras, números e hífen
  - Não pode começar/terminar com hífen
  - Mínimo 3, máximo 30 caracteres
  - Não pode ser palavras reservadas (admin, api, www, etc)

---

### ⚙️ PASSO 4: SERVER ACTIONS PARA REGISTRO
**Status**: ✅ **CONCLUÍDO**

#### Tarefas:
- [x] **Criar server action de registro** `src/lib/actions/registration-actions.ts`
  - [ ] Validar dados do formulário
  - [ ] Verificar slug disponível
  - [ ] Criar organização no Supabase
  - [ ] Criar usuário admin
  - [ ] Configurar trial de 7 dias
  - [ ] Enviar email de boas-vindas
  - [ ] Redirecionar para tenant

#### Especificações:
```typescript
interface RegistrationData {
  // Dados da empresa
  companyName: string
  slug: string
  
  // Dados do admin
  adminName: string
  adminEmail: string
  adminPassword: string
  
  // Plano escolhido
  plan: 'basico' | 'profissional'
}
```

- [ ] **Integração com sistema de trial**
  - [ ] Usar função `initialize_new_organization()`
  - [ ] Configurar trial_started_at e trial_ends_at
  - [ ] Definir limites baseados no plano

---

### 📝 PASSO 5: FORMULÁRIO DE REGISTRO
**Status**: ✅ **CONCLUÍDO**

#### Tarefas:
- [x] **Criar página de registro** `src/app/(registro)/page.tsx`
  - [x] Configurado para funcionar em `registro.gerenciamentofotovoltaico.com.br`
  - [x] Formulário com validação em tempo real
  - [x] Verificação de slug disponível (debounced)
  - [x] Seleção de plano (básico/profissional)
  - [x] Termos de uso e política de privacidade
  - [x] Loading states e error handling
  - [x] Redirecionamento para `{slug}.gerenciamentofotovoltaico.com.br/admin/login`

- [x] **Componentes necessários**:
  - [x] `RegistrationForm` principal com formulário multi-step
  - [x] Validação de slug em tempo real com API
  - [x] Seletor de planos integrado
  - [x] Validação de senha com requisitos visuais
  - [x] `SuccessMessage` integrado com redirecionamento

#### UX Requirements:
- [x] Validação em tempo real do slug
- [x] Indicador visual de disponibilidade
- [x] Preview da URL final
- [x] Comparação clara dos planos
- [x] Processo em etapas (3 passos implementados)
- [x] Redirecionamento automático para tenant após registro

---

### 📧 PASSO 6: SISTEMA DE EMAIL E REDIRECIONAMENTO
**Status**: ❌ **Pendente**

#### Tarefas:
- [ ] **Template de email de boas-vindas**
  - [ ] HTML responsivo
  - [ ] Link direto para tenant
  - [ ] Informações do trial
  - [ ] Dados de acesso

- [ ] **Configuração de email**
  - [ ] Integração com Amazon SES
  - [ ] Template engine (React Email ou similar)
  - [ ] Queue de emails (opcional)

- [ ] **Lógica de redirecionamento**
  - [ ] Redirect pós-registro para `{slug}.gerenciamentofotovoltaico.com.br/admin/login?welcome=true`
  - [ ] Query params para onboarding
  - [ ] Tratamento de erros de redirecionamento

---

### 🔄 PASSO 7: ATUALIZAÇÃO DE SERVER ACTIONS EXISTENTES
**Status**: ❌ **Pendente**

#### Tarefas:
- [ ] **Atualizar project-actions.ts**
  - [ ] Adicionar tenant_id em todas as operações
  - [ ] Implementar verificações de trial
  - [ ] Usar `can_create_resource()` antes de criar

- [ ] **Atualizar client-actions.ts**
  - [ ] Isolamento por tenant
  - [ ] Verificações de limite

- [ ] **Atualizar user-actions.ts**
  - [ ] Controle de usuários por organização
  - [ ] Verificação de limites de usuários

---

### 🎨 PASSO 8: CONTEXT DE TENANT
**Status**: ❌ **Pendente**

#### Tarefas:
- [ ] **Criar TenantContext** `src/lib/contexts/TenantContext.tsx`
  - [ ] Provider com dados da organização atual
  - [ ] Hook `useTenant()` para componentes
  - [ ] Status do trial e limites
  - [ ] Funcionalidades disponíveis por plano

```typescript
interface TenantContextType {
  organization: Organization | null
  isLoading: boolean
  trialStatus: TrialStatus | null
  canCreateResource: (type: string) => boolean
  planFeatures: string[]
}
```

---

### 🧪 PASSO 9: TESTES DE ISOLAMENTO
**Status**: ❌ **Pendente**

#### Tarefas:
- [ ] **Criar segunda organização de teste**
  - [ ] Usar função `initialize_new_organization()`
  - [ ] Slug: `empresa-teste`
  - [ ] Plano: básico

- [ ] **Testes de isolamento**
  - [ ] Usuário da Org A não vê dados da Org B
  - [ ] Projetos isolados por tenant
  - [ ] Clientes isolados por tenant
  - [ ] Notificações isoladas

- [ ] **Testes de limites**
  - [ ] Verificar bloqueio ao atingir limite
  - [ ] Testar trial expirando
  - [ ] Verificar upgrade de plano

---

### 🔧 PASSO 10: CONFIGURAÇÕES DE INFRAESTRUTURA
**Status**: ❌ **Pendente**

#### Tarefas:
- [ ] **DNS Configuration**
  - [ ] Wildcard DNS: `*.gerenciamentofotovoltaico.com.br`
  - [ ] A record para `registro.gerenciamentofotovoltaico.com.br`

- [ ] **SSL Certificates**
  - [ ] Wildcard SSL para subdomínios
  - [ ] Configuração no Vercel

- [ ] **Environment Variables**
  - [ ] Configurar variáveis para multi-tenant
  - [ ] URLs base para diferentes ambientes

---

## 🎯 Próximos Passos Imediatos

### 1. **IMPLEMENTAR MIDDLEWARE** (Crítico - Fundação)
- Sem isso, nada funciona
- Base para todo o sistema de roteamento
- Detecção de contexto (registro vs tenant)

### 2. **ESTRUTURAR ROTAS** (Necessário)
- Organizar código por contexto
- Layouts específicos
- Componentes isolados

### 3. **API DE VALIDAÇÃO** (UX)
- Validação em tempo real
- Feedback imediato ao usuário
- Prevenção de conflitos

### 4. **FORMULÁRIO DE REGISTRO** (Interface)
- Interface final para usuários
- Integração com todas as APIs
- UX polida e profissional

---

## 📞 Comandos Úteis para Desenvolvimento

```sql
-- Verificar sistema multi-tenant
SELECT * FROM verify_system_setup();

-- Criar nova organização de teste
SELECT initialize_new_organization(
  'Empresa Teste', 
  'empresa-teste', 
  'teste@exemplo.com', 
  'Admin Teste', 
  'basico',
  true -- com trial
);

-- Verificar status do trial
SELECT * FROM get_trial_status('org-uuid-aqui');

-- Verificar limites
SELECT * FROM check_limit('org-uuid-aqui', 'projects');
```

---

## 🚨 Considerações Importantes

### Segurança
- Zero exposição de tenants públicos
- Validação rigorosa de slugs
- Rate limiting em APIs críticas
- Sanitização de inputs

### Performance  
- Middleware otimizado (cache de tenants)
- Queries indexadas por tenant_id
- CDN configurado para subdomínios

### Compliance
- LGPD/GDPR compliance
- Isolamento completo de dados
- Auditoria por organização

---

**🎉 Sistema Multi-Tenant SGF - Implementação Estruturada e Segura**
