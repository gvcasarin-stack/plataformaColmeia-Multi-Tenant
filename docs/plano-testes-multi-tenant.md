# 🧪 PLANO DE TESTES - SISTEMA MULTI-TENANT

## 📋 **OBJETIVO**
Testar completamente o fluxo de registro e funcionamento do sistema multi-tenant antes de implementar a integração com Stripe.

---

## 🎯 **CENÁRIOS DE TESTE**

### **1. TESTE DE REGISTRO DE ORGANIZAÇÃO**

#### **🔍 Pré-requisitos:**
- Sistema compilado com sucesso ✅
- Acesso ao domínio: `registro.gerenciamentofotovoltaico.com.br`
- Banco de dados Supabase funcionando

#### **📝 Passos do Teste:**

**1.1 Acesso ao Formulário de Registro:**
```bash
# URL para teste:
https://registro.gerenciamentofotovoltaico.com.br
```
- ✅ Verificar se o formulário carrega corretamente
- ✅ Verificar se os 3 passos são exibidos
- ✅ Verificar se a validação de slug funciona em tempo real

**1.2 Preenchimento do Formulário:**
```
DADOS DE TESTE:
- Nome da Empresa: "Empresa Teste Solar"
- Slug: "empresa-teste-solar" (verificar se está disponível)
- Nome do Admin: "Admin Teste"
- Email: "admin@empresatestesolar.com"
- Senha: "MinhaSenh@123"
- Plano: "Starter" (gratuito)
```

**1.3 Validações Esperadas:**
- [ ] Slug deve ser validado em tempo real
- [ ] Senha deve atender aos requisitos de segurança
- [ ] Email deve ser único no sistema
- [ ] Todos os campos obrigatórios validados

**1.4 Submissão do Formulário:**
- [ ] Registro deve ser criado no banco
- [ ] Usuário deve ser criado no Supabase Auth
- [ ] Organização deve ter trial de 7 dias
- [ ] Redirecionamento deve funcionar

---

### **2. TESTE DE VALIDAÇÃO DE SLUG**

#### **🔍 API Endpoint:**
```bash
GET /api/check-slug?slug=empresa-teste-solar
```

**2.1 Testes de Validação:**
- [ ] Slug disponível retorna `{ available: true }`
- [ ] Slug ocupado retorna `{ available: false }`
- [ ] Slug inválido retorna sugestões
- [ ] Slug reservado é rejeitado
- [ ] Rate limiting funciona (máximo 10 requests/minuto)

**2.2 Formatos a Testar:**
```bash
# Válidos:
- "empresa-teste"
- "solar123"
- "abc-def-ghi"

# Inválidos:
- "em" (muito curto)
- "-empresa" (começa com hífen)
- "empresa-" (termina com hífen)
- "EMPRESA" (maiúsculas)
- "empresa_teste" (underscore)
```

---

### **3. TESTE DE ACESSO POR SUBDOMÍNIO**

#### **🔍 Após Registro Bem-sucedido:**

**3.1 URL de Redirecionamento:**
```bash
https://empresa-teste-solar.gerenciamentofotovoltaico.com.br/admin/login?welcome=true&email=admin@empresatestesolar.com
```

**3.2 Verificações do Middleware:**
- [ ] Subdomínio é detectado corretamente
- [ ] Tenant é validado no banco de dados
- [ ] Headers `x-tenant-id`, `x-tenant-slug` são definidos
- [ ] Organização inativa redireciona para `/tenant-not-found`

**3.3 Teste de Login:**
- [ ] Página de login carrega com email pré-preenchido
- [ ] Login com credenciais criadas funciona
- [ ] Usuário é redirecionado para painel administrativo
- [ ] Context `TenantContext` carrega informações corretas

---

### **4. TESTE DE ISOLAMENTO ENTRE TENANTS**

#### **🔍 Criar Segunda Organização:**
```
DADOS TENANT 2:
- Nome: "Solar Tech Solutions"
- Slug: "solar-tech-solutions"
- Email: "admin@solartech.com"
- Senha: "OutraSenh@456"
```

**4.1 Verificações de Isolamento:**
- [ ] Tenant 1 não vê dados do Tenant 2
- [ ] APIs filtram corretamente por `tenant_id`
- [ ] Projetos são isolados entre organizações
- [ ] Usuários não podem acessar outros tenants

**4.2 Teste de APIs Críticas:**
```bash
# Com headers corretos de tenant:
GET /api/projects/unified
GET /api/financial/transactions
GET /api/admin/config
```
- [ ] Retornam apenas dados do tenant correto
- [ ] Retornam 403 sem `x-tenant-id` header

---

### **5. TESTE DO SISTEMA DE TRIAL**

#### **🔍 Verificação de Trial Ativo:**

**5.1 APIs de Trial:**
```bash
GET /api/tenant/trial-status
GET /api/tenant/can-create?resource=projects
```

**5.2 Funcionalidades Durante Trial:**
- [ ] Criar projetos (dentro do limite)
- [ ] Criar clientes
- [ ] Acessar todas as funcionalidades
- [ ] Banner de trial é exibido

**5.3 Teste de Limites:**
```bash
# Plano Starter (trial):
- Projetos: 3
- Clientes: 10
- Usuários: 2
```
- [ ] Bloqueio ao atingir limite de projetos
- [ ] Mensagem específica sobre limite atingido
- [ ] FeatureGuard bloqueia criação de novos recursos

---

### **6. TESTE DE BLOQUEIO PÓS-TRIAL**

#### **🔍 Simular Trial Expirado:**
```sql
-- Executar no Supabase:
UPDATE organizations 
SET trial_ends_at = NOW() - INTERVAL '1 day',
    is_trial = true 
WHERE slug = 'empresa-teste-solar';
```

**6.1 Verificações de Bloqueio:**
- [ ] Modal de upgrade aparece
- [ ] Criação de projetos é bloqueada
- [ ] Modo somente leitura ativado
- [ ] FeatureGuard funciona corretamente

---

## 🚀 **EXECUÇÃO DOS TESTES**

### **Ordem Recomendada:**
1. ✅ **Build do Sistema** - Verificar compilação
2. 🔄 **Teste de Slug** - Validação de API
3. 📝 **Registro de Organização** - Fluxo completo
4. 🏢 **Acesso por Subdomínio** - Middleware e login
5. 🔒 **Isolamento de Dados** - Segurança multi-tenant
6. ⏰ **Sistema de Trial** - Limites e bloqueios

### **Critérios de Sucesso:**
- [ ] Todos os testes passam sem erros
- [ ] Isolamento entre tenants é garantido
- [ ] Sistema de trial funciona corretamente
- [ ] Formulário de registro é intuitivo
- [ ] Performance é aceitável

---

## 🐛 **REGISTRO DE PROBLEMAS**

### **Problemas Encontrados:**
_Documentar aqui qualquer problema durante os testes_

### **Soluções Aplicadas:**
_Documentar correções implementadas_

---

## ✅ **CHECKLIST FINAL**

Antes de prosseguir para integração Stripe:

- [ ] Registro de organização funciona 100%
- [ ] Validação de slug é robusta
- [ ] Acesso por subdomínio funciona
- [ ] Isolamento entre tenants é seguro
- [ ] Trial system bloqueia corretamente
- [ ] Performance é aceitável
- [ ] Não há vazamentos de dados
- [ ] Middleware detecta tenants corretamente
- [ ] Context carrega informações corretas
- [ ] FeatureGuard funciona como esperado

**Status:** 🟢 **PRONTO PARA TESTES**

---

## ✅ **MELHORIAS IMPLEMENTADAS**

### **🎨 UX do Formulário:**
- ✅ Botão "Voltar" funcionando em todos os passos
- ✅ Passo 3 reformulado com revisão de dados
- ✅ Botão final renomeado para "Criar Conta"
- ✅ Links funcionais para páginas legais

### **📜 Páginas Legais Criadas:**
- ✅ `/legal/termos-de-uso` - Termos completos e LGPD compliant
- ✅ `/legal/politica-de-privacidade` - Política detalhada conforme LGPD
- ✅ `/legal/` - Página índice dos documentos legais
- ✅ Layout responsivo e profissional

**Status:** 🟢 **PRONTO PARA TESTES**
