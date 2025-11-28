# 🎯 CAUSA RAIZ CONFIRMADA: Pacotes da Empresa Integradora

**Data:** 28/01/2025
**Severidade:** 🔴 **ALTA** - Modelo de negócio não suportado
**Status:** ✅ **CAUSA RAIZ CONFIRMADA**

---

## 📊 DADOS OBTIDOS DO PROJETO FV-2025-377

```json
{
  "project_id": "3e77f97a-94a4-42b0-aefd-52e39b53734c",
  "project_number": "FV-2025-377",
  "owner_id": "b772107b-bfa8-48e7-81ac-995331e66623",
  "billing_mode": "avulso",
  "tenant_id": "061ff77b-8b3a-4732-9158-a574c1f1690a",
  "nome_cliente_final": "Teste Pacote 6",         // 🔍 Cliente final
  "empresa_integradora": "Catarina Solar",       // 🔍 Empresa que executa
  "created_at": "2025-11-27 23:49:07.063027+00"
}
```

---

## 🎯 CAUSA RAIZ IDENTIFICADA

### Problema: **Modelo de Negócio B2B (Empresa Integradora)**

O sistema está operando em um modelo onde:

1. **"Catarina Solar"** = Empresa Integradora (B2B)
   - Faz projetos para outros clientes
   - Tem pacotes contratados (Pacote Ouro 0/5)

2. **"Teste Pacote 6"** = Cliente Final (B2C)
   - Recebe o projeto da Catarina Solar
   - NÃO tem pacote próprio

3. **Projeto FV-2025-377:**
   - `empresa_integradora`: "Catarina Solar" (quem executa)
   - `nome_cliente_final`: "Teste Pacote 6" (quem recebe)
   - `owner_id`: Pode ser do cliente final ou admin
   - `billing_mode`: "avulso" (estava sem pacote)

---

## ❌ POR QUE A API NÃO ENCONTRA O PACOTE

### Lógica Atual (Incorreta):

```typescript
// 1. Buscar projeto
const { data: project } = await supabase
  .from('projects')
  .select('owner_id, billing_mode')
  .eq('id', projectId)
  .single();

const userId = project.owner_id;  // "id-do-cliente-final" ou "id-do-admin"

// 2. Buscar pacotes DO OWNER
const { data: pacotes } = await supabase
  .from('cliente_pacotes')
  .eq('user_id', userId)  // ❌ Busca pacotes do cliente final
  .eq('status', 'ativo');
```

### Resultado:
- ❌ Busca pacotes de `"Teste Pacote 6"` (cliente final)
- ❌ Mas pacote está em `"Catarina Solar"` (empresa integradora)
- ❌ Não encontra nada → "Nenhuma opção disponível"

---

## ✅ COMPORTAMENTO CORRETO ESPERADO

Em um modelo **B2B de Empresa Integradora**, os pacotes devem:

1. **Pertencer à EMPRESA** (Catarina Solar), não ao cliente final
2. **Ser usados para TODOS os projetos** da empresa
3. **Ser selecionáveis independente** de quem é o `owner_id`

### Exemplo Real:

```
Catarina Solar (Empresa):
  - Pacote Ouro: 0/5 projetos
  - Pode criar 5 projetos para QUALQUER cliente

Projetos da Catarina Solar:
  #FV-2025-377 → Cliente: "Teste Pacote 6"  → Usar pacote da Catarina
  #FV-2025-378 → Cliente: "João Silva"      → Usar pacote da Catarina
  #FV-2025-379 → Cliente: "Maria Santos"    → Usar pacote da Catarina
```

**Todos os projetos acima devem poder ser convertidos para o Pacote Ouro da Catarina Solar!**

---

## 🔧 SOLUÇÕES PROPOSTAS

### ⭐ Solução #1: **Buscar Pacotes do Tenant Inteiro** (RECOMENDADA)

**Lógica:**
- Modal mostra TODOS os pacotes ativos do tenant
- Admin escolhe manualmente qual pacote usar
- Valida apenas quota disponível

**Vantagens:**
- ✅ Funciona para B2B e B2C
- ✅ Admin tem controle total
- ✅ Suporta múltiplas empresas no mesmo tenant
- ✅ Flexibilidade comercial

**Código:**
```typescript
// Buscar TODOS os pacotes ativos do tenant
const { data: pacotes } = await supabase
  .from('cliente_pacotes')
  .select(`
    *,
    pacote:pacotes_definicoes(*),
    user:users!user_id(id, email, name)  // 🆕 Incluir dados do dono
  `)
  .eq('tenant_id', tenantId)
  .eq('status', 'ativo');

// Filtrar apenas com quota disponível
const pacotesDisponiveis = pacotes.filter(p =>
  p.projetos_usados < p.projetos_inclusos
);

// 🆕 Modal mostra: "Pacote Ouro (Catarina Solar) - 0/5"
//                  "Pacote Prata (Outra Empresa) - 2/3"
```

---

### Solução #2: **Buscar por Empresa Integradora**

**Lógica:**
- Identificar empresa integradora do projeto
- Buscar pacotes dessa empresa

**Código:**
```typescript
// 1. Buscar projeto com empresa integradora
const { data: project } = await supabase
  .from('projects')
  .select('empresa_integradora, tenant_id')
  .eq('id', projectId)
  .single();

// 2. Buscar usuário da empresa integradora
const { data: empresa } = await supabase
  .from('users')
  .select('id')
  .eq('name', project.empresa_integradora)  // ou email
  .eq('tenant_id', project.tenant_id)
  .single();

// 3. Buscar pacotes da empresa
const { data: pacotes } = await supabase
  .from('cliente_pacotes')
  .eq('user_id', empresa.id)
  .eq('status', 'ativo');
```

**Problema:**
- ⚠️ Depende de `empresa_integradora` ser nome exato do usuário
- ⚠️ Não funciona se empresa tiver nome diferente

---

### Solução #3: **Adicionar Campo `empresa_id` no Projeto**

**Lógica:**
- Projetos têm `empresa_id` (FK para users)
- Separado de `owner_id` (quem criou)
- Pacotes pertencem à empresa

**Migração Necessária:**
```sql
ALTER TABLE projects
  ADD COLUMN empresa_id UUID REFERENCES users(id);

-- Popular empresa_id baseado em empresa_integradora
UPDATE projects
SET empresa_id = (
  SELECT id FROM users
  WHERE name = projects.empresa_integradora
  LIMIT 1
);
```

**Vantagens:**
- ✅ Estrutura de dados clara
- ✅ Queries rápidas e diretas

**Desvantagens:**
- ❌ Requer migration
- ❌ Precisa preencher dados históricos

---

## 📋 COMPARAÇÃO DAS SOLUÇÕES

| Aspecto | Solução #1 (Tenant) | Solução #2 (Nome Empresa) | Solução #3 (FK empresa_id) |
|---------|---------------------|---------------------------|---------------------------|
| **Complexidade** | ⭐⭐ Baixa | ⭐⭐⭐ Média | ⭐⭐⭐⭐ Alta |
| **Migration** | ❌ Não precisa | ❌ Não precisa | ✅ Precisa |
| **Flexibilidade** | ✅ Alta | ⚠️ Média | ✅ Alta |
| **Performance** | ⭐⭐⭐ Boa | ⭐⭐ Razoável | ⭐⭐⭐⭐ Ótima |
| **UX Admin** | ✅ Escolhe manual | ❌ Automático | ✅ Automático |
| **Multi-empresa** | ✅ Suporta | ⚠️ Depende de nome | ✅ Suporta |

---

## 🎯 RECOMENDAÇÃO FINAL

**Implementar Solução #1 (Buscar por Tenant) AGORA**

**Motivos:**
1. ✅ Correção rápida (30 min)
2. ✅ Sem migration necessária
3. ✅ Funciona para B2B e B2C
4. ✅ Admin mantém controle
5. ✅ Já funciona com estrutura atual

**Interface do Modal (após correção):**

```
┌─────────────────────────────────────────┐
│ Converter Projeto para Pacote          │
├─────────────────────────────────────────┤
│ Projeto: FV-2025-377                   │
│ Cliente Final: Teste Pacote 6          │
│ Empresa: Catarina Solar                │
│                                         │
│ Pacotes Disponíveis:                   │
│ ○ Pacote Ouro (Catarina Solar)        │
│   0/5 projetos • 5 vagas disponíveis   │
│                                         │
│ ○ Pacote Prata (Outra Empresa)        │
│   2/3 projetos • 1 vaga disponível     │
│                                         │
│ [Cancelar]  [Confirmar Conversão]      │
└─────────────────────────────────────────┘
```

**Admin vê claramente:**
- Qual empresa tem qual pacote
- Quantas vagas disponíveis
- Pode escolher manualmente

---

## 📝 IMPLEMENTAÇÃO DA SOLUÇÃO #1

### Arquivo: `src/app/api/admin/projects/[id]/available-billing/route.ts`

**Alteração na linha 46-66:**

```typescript
// ❌ ANTES: Buscava pacotes do owner_id
const { data: pacotes } = await supabase
  .from('cliente_pacotes')
  .select(`...`)
  .eq('user_id', userId)  // ❌ Filtro por user_id específico
  .eq('tenant_id', tenantId)
  .eq('status', 'ativo');

// ✅ DEPOIS: Busca TODOS os pacotes do tenant
const { data: pacotes } = await supabase
  .from('cliente_pacotes')
  .select(`
    id,
    pacote_id,
    user_id,  // 🆕 Importante para mostrar no modal
    status,
    projetos_inclusos,
    projetos_usados,
    data_ativacao,
    data_expiracao,
    pacote:pacotes_definicoes(
      id,
      nome,
      quantidade_projetos,
      potencia_maxima
    ),
    user:users!user_id(  // 🆕 Buscar dados do dono do pacote
      id,
      email,
      name
    )
  `)
  .eq('tenant_id', tenantId)  // ✅ Apenas filtro de tenant
  .eq('status', 'ativo');
```

**Alteração no retorno (linha 117-123):**

```typescript
// 🆕 Incluir nome do dono do pacote
pacotes: pacotesDisponiveis.map(p => ({
  id: p.id,
  nome: p.pacote.nome,
  empresa: p.user.name,  // 🆕 "Catarina Solar"
  quota: `${p.projetos_usados}/${p.projetos_inclusos}`,
  vagas_disponiveis: p.projetos_inclusos - p.projetos_usados,
  expira_em: p.data_expiracao
}))
```

---

## ✅ APÓS CORREÇÃO

### Teste Esperado:

1. Admin abre modal de conversão para projeto FV-2025-377
2. Modal mostra:
   - ✅ "Pacote Ouro (Catarina Solar) - 0/5 • 5 vagas"
   - ✅ Outros pacotes ativos do tenant (se houver)
3. Admin clica em "Pacote Ouro (Catarina Solar)"
4. Conversão funciona! 🎉

---

## 📎 ARQUIVOS AFETADOS

1. **API:** `src/app/api/admin/projects/[id]/available-billing/route.ts`
   - Linha 46-66: Remover filtro `eq('user_id', userId)`
   - Linha 49-63: Adicionar JOIN com `users`
   - Linha 117-123: Incluir `empresa` no retorno

2. **Modal:** `src/app/admin/financeiro/page.tsx`
   - Linha 2900-2909: Mostrar nome da empresa no card do pacote

---

## 🚀 PRÓXIMOS PASSOS

1. ✅ Aplicar Solução #1 (correção rápida)
2. ✅ Testar com Catarina Solar
3. ✅ Validar em produção
4. 📅 Considerar Solução #3 (migration) para v2.0

---

**PRIORIDADE:** 🔴 **CRÍTICA** - Aplicar correção imediatamente

**Tempo estimado:** 20-30 minutos
- 10 min: Alterar API
- 5 min: Alterar Modal
- 10 min: Testar
- 5 min: Deploy

---

**CONCLUSÃO:** Problema identificado e solução definida. Aguardando aprovação para implementar! ✅
