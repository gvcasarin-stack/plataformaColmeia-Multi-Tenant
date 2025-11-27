# 📋 RELATÓRIO: Acesso ao domínio www.gerenciamentofotovoltaico.com.br/admin/login

## 🔍 RESUMO EXECUTIVO

**Situação:** Um colaborador (membro da equipe de um cliente) conseguiu acessar `https://www.gerenciamentofotovoltaico.com.br/admin/login` e fazer login, mas não viu o Kanban/projetos.

**Status:** ⚠️ **ISSO NÃO DEVERIA ACONTECER** - É uma falha de segurança

---

## 🐛 O PROBLEMA

### 1. Domínio `www` não tem tenant associado

No arquivo `src/middleware.ts` (linhas 96-100):

```typescript
// 6. DOMÍNIO PRINCIPAL - SITE MARKETING (sem subdomínio)
if (hostname === 'gerenciamentofotovoltaico.com.br' ||
    hostname === 'www.gerenciamentofotovoltaico.com.br') {
  devLog.log(`[Middleware] Domínio principal detectado: ${hostname}`);
  return response; // ❌ APENAS FAZ BYPASS - NÃO SETA TENANT
}
```

**O que acontece:**
- O middleware identifica como "domínio principal/marketing"
- **NÃO define nenhum header de tenant** (`x-tenant-id`, `x-tenant-slug`, etc.)
- Deixa a requisição passar sem associação a tenant

### 2. Página de login `/admin/login` é acessível

A página `/admin/login` existe em:
- `src/app/admin/login/page.tsx`
- `src/app/admin/login/layout.tsx`

**Comportamento atual:**
- Renderiza normalmente em qualquer domínio
- Não valida se o domínio tem tenant antes de mostrar o formulário
- Apenas mostra warnings heurísticos (linhas 80-126) baseados no email
- **MAS PERMITE O LOGIN MESMO SEM TENANT**

### 3. Login funciona mas dados ficam isolados

Quando o colaborador faz login:

1. **Autenticação Supabase funciona** → Usuário é autenticado
2. **Validação de role funciona** (linha 183-197) → Se é admin/superadmin, permite
3. **Redireciona para `/admin/painel`** (linha 209)

**No painel:**
- As queries de projetos filtram por `tenant_id` do usuário
- Como o usuário tem um `tenant_id` válido na tabela `users`
- MAS o domínio `www` não tem tenant configurado
- **Resultado:** As queries retornam vazio ou falham silenciosamente

---

## 🔐 POR QUE ISSO É UM PROBLEMA?

### Riscos de Segurança:

1. **Confusão de contexto**
   - Colaborador não sabe em qual tenant está
   - Pode tentar ações que não deveria

2. **Bypass acidental de isolamento**
   - Se houver algum bug nas queries, dados de outros tenants podem vazar
   - O middleware não está garantindo isolamento no domínio `www`

3. **Experiência ruim**
   - Usuário consegue logar mas não vê dados
   - Parece que o sistema está quebrado

4. **Logs confusos**
   - Impossível rastrear qual tenant o usuário estava tentando acessar
   - Debugging fica muito difícil

---

## ✅ O QUE DEVERIA ACONTECER?

### Comportamento Correto:

1. **Acesso a `www.gerenciamentofotovoltaico.com.br/admin/login`**
   - Middleware detecta que não há tenant
   - Redireciona para `/tenant-not-found` ou página de erro

2. **OU alternativamente:**
   - Middleware redireciona automaticamente para o domínio tenant correto
   - Exemplo: Detecta o email → redireciona para `empresa-x.gerenciamentofotovoltaico.com.br/admin/login`

3. **Login só é possível em:**
   - `{slug-tenant}.gerenciamentofotovoltaico.com.br/admin/login`
   - Onde `{slug-tenant}` é um tenant ativo no banco

---

## 🔧 SOLUÇÕES PROPOSTAS

### Opção 1: Bloquear acesso ao `/admin` no domínio `www` (RECOMENDADO)

**No middleware.ts:**

```typescript
// 6. DOMÍNIO PRINCIPAL - SITE MARKETING (sem subdomínio)
if (hostname === 'gerenciamentofotovoltaico.com.br' ||
    hostname === 'www.gerenciamentofotovoltaico.com.br') {
  devLog.log(`[Middleware] Domínio principal detectado: ${hostname}`);

  // ❌ BLOQUEAR acesso a áreas administrativas
  if (pathname.startsWith('/admin') || pathname.startsWith('/cliente')) {
    devLog.log(`[Middleware] Tentativa de acesso admin/cliente no domínio www - BLOQUEADO`);
    return NextResponse.redirect(new URL('/tenant-not-found', request.url));
  }

  return response;
}
```

**Prós:**
- ✅ Simples e direto
- ✅ Não quebra nada existente
- ✅ Segurança imediata

**Contras:**
- ❌ Usuário não sabe para onde ir

### Opção 2: Redirecionar para tenant correto

**Criar endpoint `/api/find-tenant-by-email`:**

```typescript
// Usuário entra em www.com.br/admin/login
// Sistema pede o email
// Busca no banco qual tenant esse email pertence
// Redireciona para {tenant}.com.br/admin/login?email={email}
```

**Prós:**
- ✅ UX melhor
- ✅ Usuário é guiado automaticamente

**Contras:**
- ❌ Mais complexo
- ❌ Requer mudanças na página de login

### Opção 3: Página de seleção de tenant

**No `www` criar `/select-tenant`:**

```typescript
// Usuário entra em www.com.br/admin/login
// Sistema mostra lista de tenants disponíveis para aquele email
// Usuário clica no tenant desejado
// Sistema redireciona para {tenant}.com.br/admin/login
```

**Prós:**
- ✅ Funciona para usuários multi-tenant
- ✅ Transparente

**Contras:**
- ❌ Mais código
- ❌ Pode expor lista de clientes

---

## 📊 IMPACTO ATUAL

### O que funciona:
- ✅ Subdomínios tenant (`empresa.gerenciamentofotovoltaico.com.br`)
- ✅ Isolamento de dados entre tenants nos subdomínios corretos
- ✅ Validação de role (admin/cliente)

### O que NÃO funciona:
- ❌ Domínio `www` permite acesso a `/admin/login` sem tenant
- ❌ Colaboradores podem se confundir
- ❌ Logs ficam incompletos (não há tenant_id no contexto)

---

## 🎯 RECOMENDAÇÃO FINAL

**Implementar Opção 1 IMEDIATAMENTE:**
- Bloquear `/admin` e `/cliente` no domínio `www`
- Redirecionar para `/tenant-not-found` com mensagem clara

**Depois, considerar Opção 2 para UX:**
- Adicionar lógica para detectar tenant pelo email
- Redirecionar automaticamente

---

## 📝 CHECKLIST DE CORREÇÃO

- [ ] Atualizar middleware.ts para bloquear `/admin` e `/cliente` em `www`
- [ ] Testar acesso a `www.gerenciamentofotovoltaico.com.br/admin/login` → deve redirecionar
- [ ] Testar acesso a `www.gerenciamentofotovoltaico.com.br/cliente/login` → deve redirecionar
- [ ] Verificar que subdomínios tenant continuam funcionando
- [ ] Criar página de erro amigável em `/tenant-not-found` explicando o problema
- [ ] Adicionar log de tentativas de acesso bloqueadas para monitoramento

---

## 🔗 ARQUIVOS ENVOLVIDOS

- `src/middleware.ts` - Linhas 96-100
- `src/app/admin/login/page.tsx` - Toda a página
- `src/lib/utils/tenant-client.ts` - Função `getCurrentDomainTenantId()`

---

**Data do Relatório:** 2025-10-10
**Autor:** Claude Code
**Prioridade:** 🔴 ALTA (Segurança e UX)
