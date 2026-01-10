# 🌿 ESTRUTURA DE BRANCHES - PROJETO MULTI-TENANT

## ✅ BRANCH PRINCIPAL DE PRODUÇÃO
- **`clean-main`** - Branch principal para este projeto multi-tenant
- **Repositório:** https://github.com/gvcasarin-stack/plataformaColmeia-Multi-Tenant.git
- **Remote configurado como:** `multi-tenant`
- **Deploy Vercel:** https://vercel.com/gvcasarin-gmailcoms-projects/sgv-sistema-codigo

## ⚠️ NÃO USAR - BRANCHES DE OUTROS PROJETOS
- **`main`** - Branch de outro projeto (plataformaColmeiav0.4) - **NÃO TOCAR!**
- **Remote `origin`** - Repositório antigo (plataformaColmeiav0.4) - **NÃO USAR!**

## 🔄 FLUXO DE TRABALHO CORRETO

### 1. Branch Atual
```bash
git branch  # Deve mostrar: * clean-main
```

### 2. Fazer Mudanças
```bash
git add .
git commit -m "feat: descrição da mudança"
```

### 3. Push para Produção
```bash
git push multi-tenant clean-main
```

### 4. Deploy Automático
- A Vercel detecta mudanças na `clean-main`
- Deploy automático para produção

## 🚨 COMANDOS PROIBIDOS
```bash
# ❌ NUNCA FAZER:
git checkout main
git push origin main
git merge main
git push origin clean-main  # Wrong remote!
```

## 📋 VERIFICAÇÕES DE SEGURANÇA

Antes de qualquer operação Git, sempre verificar:

```bash
# 1. Branch correta
git branch
# Deve mostrar: * clean-main

# 2. Remote correto
git remote -v
# Deve mostrar multi-tenant como repositório Multi-Tenant

# 3. Status limpo
git status
```

## 🔧 CONFIGURAÇÃO DOS REMOTES

```bash
# Remote correto para este projeto
multi-tenant	https://github.com/gvcasarin-stack/plataformaColmeia-Multi-Tenant.git (fetch)
multi-tenant	https://github.com/gvcasarin-stack/plataformaColmeia-Multi-Tenant.git (push)

# Remote antigo (NÃO USAR)
origin	https://github.com/gvcasarin-stack/plataformaColmeiav0.4.git (fetch)
origin	https://github.com/gvcasarin-stack/plataformaColmeiav0.4.git (push)
```

## 📝 ÚLTIMAS ATUALIZAÇÕES

- **2026-01-10**: Correção crítica - Restauração de funções de geração de faturas
- **Commit**: `310cf61` - fix: restaurar funções de geração de faturas e separar dimensionamento
- **Mudanças**:
  - Restaurado pdfGenerator.ts do git (commit a17030b)
  - Criado pdfGeneratorDimensionamento.ts separado
  - Funções de fatura restauradas: generateInvoiceHTML, generateConsolidatedInvoiceHTML, downloadHTMLAsPDF
  - Adicionados comentários preventivos para evitar substituições futuras

- **2025-08-31**: Funcionalidade "Assumir Responsabilidade" reativada com Supabase
- **Commit**: `0f2d010` - feat: reativar funcionalidade 'Assumir Responsabilidade' com Supabase

---

> 🤖 **Lembrete para Claude Code**: SEMPRE consultar este arquivo antes de executar comandos Git!