# Guia de Gerenciamento de Posts do Blog

## 📁 Estrutura de Arquivos

Todos os posts do blog devem ser criados neste diretório (`content/blog/`) no formato `.mdx`.

## 🖼️ Imagens Necessárias

Para os posts de exemplo funcionarem corretamente, adicione as seguintes imagens em `public/images/blog/`:

1. **homologacao-projetos.jpg** - Post: Guia Completo Homologação (Featured)
   - Dimensões recomendadas: 1200x675px (16:9)
   - Sugestão: Imagem de painéis solares sendo instalados ou engenheiro revisando projeto

2. **vendas-solar.jpg** - Post: Como Aumentar Vendas
   - Dimensões recomendadas: 1200x675px (16:9)
   - Sugestão: Aperto de mãos, negociação, ou gráfico de crescimento

3. **mercado-solar.jpg** - Post: Tendências Mercado 2025
   - Dimensões recomendadas: 1200x675px (16:9)
   - Sugestão: Vista panorâmica de usina solar ou gráficos de mercado

4. **software-gestao.jpg** - Post: Como Escolher Software
   - Dimensões recomendadas: 1200x675px (16:9)
   - Sugestão: Dashboard de software, computador com gráficos, ou pessoa usando tablet

### 🎨 Diretrizes para Imagens

- **Formato**: JPG ou PNG
- **Aspect Ratio**: 16:9 (ideal para cards e headers)
- **Tamanho**: Máximo 500KB por imagem (otimize para web)
- **Qualidade**: Alta resolução, mas otimizada
- **Estilo**: Profissional, relacionado ao tema, cores que harmonizem com a identidade visual (azul, branco, cinza)

## ✍️ Como Criar um Novo Post

### 1. Criar Arquivo MDX

Crie um arquivo `.mdx` neste diretório com nome descritivo usando kebab-case:

```
nome-do-post.mdx
```

### 2. Adicionar Frontmatter

Todo post deve começar com metadados no formato YAML:

```yaml
---
title: "Título do Post que Aparece no Card e na Página"
slug: "url-amigavel-do-post"
description: "Descrição curta que aparece nos cards e no SEO (máximo 160 caracteres)"
author: "Nome do Autor"
date: "2025-01-04"
category: "Técnico"  # Opções: Técnico, Vendas, Mercado, Software
image: "/images/blog/nome-da-imagem.jpg"
readTime: "8 min"  # Tempo estimado de leitura
featured: false  # true para destacar na página principal
tags: ["tag1", "tag2", "tag3"]  # Opcional
---
```

### 3. Escrever Conteúdo

Após o frontmatter, escreva o conteúdo usando Markdown:

```markdown
## Título de Seção (H2)

Texto do parágrafo com **negrito** e *itálico*.

### Subtítulo (H3)

- Lista não ordenada
- Segundo item
- Terceiro item

1. Lista ordenada
2. Segundo item

> Citação em destaque

[Link para página](https://exemplo.com)

```código em destaque```
```

### 4. Elementos Especiais

#### Citações em Destaque

```markdown
> "Texto da citação que será destacado visualmente"
```

#### Código

````markdown
```javascript
const exemplo = "código com syntax highlighting"
```
````

#### Tabelas

```markdown
| Coluna 1 | Coluna 2 |
|----------|----------|
| Valor 1  | Valor 2  |
```

#### Imagens no Conteúdo

```markdown
![Texto alternativo](/images/blog/imagem-no-conteudo.jpg)
```

## 📋 Categorias Disponíveis

1. **Técnico** - Artigos técnicos sobre projetos, normas, homologação
2. **Vendas** - Estratégias comerciais, captação de clientes, propostas
3. **Mercado** - Análises de mercado, tendências, regulamentação
4. **Software** - Ferramentas, tecnologia, gestão digital

## 🎯 Boas Práticas

### SEO e Legibilidade

- **Título**: 60-70 caracteres, inclua palavra-chave principal
- **Descrição**: 150-160 caracteres, clara e atrativa
- **Slug**: Curto, descritivo, com palavras-chave
- **Headings**: Use hierarquia lógica (H2 > H3)
- **Parágrafos**: Curtos e escaneáveis
- **Listas**: Use para informações em tópicos

### Estrutura Recomendada

1. **Introdução** - Apresente o problema ou tema (1-2 parágrafos)
2. **Desenvolvimento** - Seções com H2 e H3
3. **Exemplos práticos** - Cases, listas, tabelas
4. **Conclusão** - Resumo e call-to-action

### Tempo de Leitura

Calcule aproximadamente:
- 200 palavras por minuto em português
- Use o campo `readTime` no frontmatter

## 🚀 Publicação

1. Crie o arquivo `.mdx` com frontmatter completo
2. Adicione a imagem em `public/images/blog/`
3. O post aparecerá automaticamente em `/blog`
4. Posts com `featured: true` aparecem em destaque
5. Ordenação automática por data (mais recentes primeiro)

## 🔍 Testando Localmente

1. Execute o servidor de desenvolvimento:
```bash
npm run dev
```

2. Acesse:
- Página principal do blog: `http://localhost:3000/blog`
- Post específico: `http://localhost:3000/blog/slug-do-post`

## 📝 Checklist de Publicação

Antes de publicar um post, verifique:

- [ ] Frontmatter completo e correto
- [ ] Slug único (não duplicado)
- [ ] Imagem adicionada em `public/images/blog/`
- [ ] Categoria válida
- [ ] Tempo de leitura estimado
- [ ] Tags relevantes (opcional)
- [ ] Conteúdo revisado (ortografia e gramática)
- [ ] Links funcionando
- [ ] Formatação Markdown correta
- [ ] Imagens otimizadas para web

## 🆘 Problemas Comuns

### Post não aparece no blog

- Verifique se o arquivo está em `content/blog/`
- Confirme que a extensão é `.mdx`
- Valide o frontmatter (YAML correto)
- Reinicie o servidor de desenvolvimento

### Imagem não carrega

- Confirme que a imagem está em `public/images/blog/`
- Verifique o caminho no frontmatter (começa com `/images/blog/`)
- Use formatos suportados (JPG, PNG, WebP)

### Erro de formatação

- Verifique fechamento de aspas no frontmatter
- Confirme que não há linhas em branco no frontmatter
- Use ferramentas de validação Markdown

## 📞 Suporte

Para dúvidas sobre a criação de posts, consulte:
- [Documentação Markdown](https://www.markdownguide.org/)
- [Sintaxe MDX](https://mdxjs.com/)
- Documentação principal do projeto em `/docs/Blog.md`
