# Documentação do Blog SGF

## 📋 Visão Geral

Sistema de blog integrado à página de marketing do SGF, com foco em conteúdo sobre energia fotovoltaica, homologação de projetos e gestão de empresas do setor.

---

## 🏗️ Arquitetura Técnica

### Estrutura de Rotas (Next.js App Router)

- **`/app/blog/page.tsx`** - Página principal do blog (listagem de posts)
- **`/app/blog/[slug]/page.tsx`** - Página individual de cada artigo

### Gerenciamento de Conteúdo

- **Formato**: Arquivos MDX (Markdown + JSX)
- **Localização**: `/content/blog/`
- **Metadados**: Cada post contém:
  - Título
  - Descrição
  - Autor
  - Data de publicação
  - Categoria
  - Imagem de capa
  - Tempo de leitura estimado
  - Featured (destaque)
  - Slug (URL amigável)

### Geração de Páginas

- **SSG (Static Site Generation)** para melhor performance e SEO
- Páginas geradas em build time
- Metadata otimizada para SEO e Open Graph

---

## 🎨 Design e Layout

### Categorias Definidas

1. **Técnico** - Badge azul (`blue-600`)
2. **Vendas** - Badge verde (`green-600`)
3. **Mercado** - Badge roxo (`purple-600`)
4. **Software** - Badge laranja (`orange-600`)

### Página Principal (/blog)

#### 1. Hero Section
- Título: "Blog SGF - Insights sobre Energia Fotovoltaica"
- Subtítulo descritivo
- Fundo gradiente azul similar ao CTA da landing page
- Barra de busca centralizada

#### 2. Post em Destaque (Featured Post)
- Card grande horizontal
- Imagem à esquerda (acima em mobile)
- Badge "Artigo em Destaque"
- Título, resumo, data, categoria e botão "Ler mais"

#### 3. Grid de Posts
- **Layout**: 3 colunas (desktop) / 2 (tablet) / 1 (mobile)
- **Componentes do Card**:
  - Imagem de capa (aspect ratio 16:9)
  - Badge de categoria colorido
  - Título do post
  - Resumo (2-3 linhas)
  - Data de publicação
  - Tempo de leitura
  - Botão "Continuar lendo"
- **Interações**: Hover com elevação e sombra

#### 4. Paginação
- Botão "Carregar mais artigos" com loading state

#### 5. Sidebar
- **NÃO IMPLEMENTAR** (decisão do cliente)

### Página de Post Individual (/blog/[slug])

#### 1. Header do Artigo
- Imagem de capa em largura total com overlay escuro
- Badge de categoria
- Título do artigo
- Metadados: Autor, Data, Tempo de leitura
- Breadcrumb: Home > Blog > Categoria > Título

#### 2. Conteúdo do Artigo
- Largura máxima otimizada para leitura (`max-w-3xl`)
- Tipografia hierárquica:
  - `h2`, `h3` para subtítulos
  - `p` para parágrafos
  - `ul`, `ol` para listas
- Code blocks com syntax highlighting
- Imagens responsivas com legendas
- Quotes estilizados

#### 3. Sidebar Flutuante (Desktop)
- Índice (Table of Contents) com scroll automático
- Botões de compartilhamento (LinkedIn, WhatsApp, Email)

#### 4. Footer do Artigo
- Bio do autor com foto
- Tags do artigo
- CTA "Experimente o SGF gratuitamente"

#### 5. Seção de Posts Relacionados
- 3 cards de posts similares (mesma categoria)
- Layout horizontal

---

## 🎨 Identidade Visual

### Paleta de Cores

- **Primary**: `blue-600` - Botões, links, badges principais
- **Secondary**: `green-600` - Categoria Vendas
- **Accent Purple**: `purple-600` - Categoria Mercado
- **Accent Orange**: `orange-600` - Categoria Software
- **Backgrounds**: `white`, `gray-50`, `gray-100`
- **Text**: `slate-800` (headings), `slate-600` (body)

### Componentes Reutilizados da Landing Page

- Buttons (mesmo estilo do CTA e Pricing)
- Cards com shadows e hover effects
- Intersection Observer para animações de scroll
- Gradientes sutis para headers

### Typography

- **Headings**: Bold, tracking-tight
- **Body**: `text-base` ou `text-lg` para legibilidade
- **Code**: Monospace com background destacado
- **Links**: `text-blue-600` com underline no hover

---

## ⚙️ Funcionalidades

### Fase 1 - MVP (Implementação Atual)

- ✅ Listagem de posts
- ✅ Página individual de post com conteúdo MDX
- ✅ Categorias clicáveis (badges)
- ✅ Busca de posts (client-side)
- ✅ Tempo estimado de leitura
- ✅ Responsivo (mobile-first)
- ✅ SEO otimizado (metadata, Open Graph)
- ✅ Breadcrumbs para navegação
- ✅ Posts relacionados

### Fase 2 - Futuras Melhorias (NÃO IMPLEMENTAR)

- 🔲 Newsletter signup
- 🔲 Sistema de comentários
- 🔲 Dark mode toggle
- 🔲 RSS feed
- 🔲 Filtros avançados por categoria
- 🔲 Sistema de tags

---

## 📁 Estrutura de Arquivos

```
/app/blog/
  page.tsx                    # Listagem de posts
  [slug]/page.tsx             # Post individual

/components/blog/
  BlogHero.tsx               # Hero da página principal
  PostCard.tsx               # Card de post na listagem
  FeaturedPost.tsx           # Post em destaque
  PostHeader.tsx             # Header do artigo
  PostContent.tsx            # Conteúdo formatado MDX
  RelatedPosts.tsx           # Posts relacionados
  CategoryBadge.tsx          # Badge de categoria
  SearchBar.tsx              # Barra de busca
  TableOfContents.tsx        # Índice do artigo
  ShareButtons.tsx           # Botões de compartilhamento

/content/blog/
  exemplo-post.mdx           # Posts em formato MDX

/lib/blog/
  mdx.ts                     # Funções para ler e processar MDX
  utils.ts                   # Funções auxiliares (tempo de leitura, etc)
```

---

## 📝 Formato de Metadados (Frontmatter)

```yaml
---
title: "Como Acelerar a Homologação de Projetos Fotovoltaicos"
slug: "acelerar-homologacao-projetos-fotovoltaicos"
description: "Descubra 5 estratégias práticas para reduzir o tempo de homologação dos seus projetos solares"
author: "Equipe SGF"
date: "2025-01-15"
category: "Técnico"
image: "/images/blog/homologacao-rapida.jpg"
readTime: "8 min"
featured: true
tags: ["homologação", "projetos", "solar", "dicas"]
---
```

---

## 🎯 Decisões do Cliente

### ✅ Confirmado

1. **Categorias**: Técnico, Vendas, Mercado, Software
2. **Sem sidebar** na página principal
3. **Sem newsletter** (por enquanto)
4. **Conteúdo**: Cliente já possui posts prontos
5. **Prioridade**: Validação de layout primeiro

### ⏳ Pendente

1. **Autoria dos posts**: Definir se será "Equipe SGF" ou autores individuais
2. **Sistema de comentários**: Avaliar necessidade futura
3. **Newsletter**: Possível implementação em fase 2

---

## 🚀 Próximos Passos

1. ✅ Criar estrutura de pastas e componentes
2. ✅ Implementar página de listagem (/blog)
3. ✅ Implementar página individual (/blog/[slug])
4. ✅ Criar post de exemplo para validação
5. ⏳ Cliente validar layout
6. ⏳ Cliente adicionar posts reais
7. ⏳ Ajustes finais com base no feedback

---

## 📊 SEO e Performance

### Otimizações Implementadas

- **Metadata dinâmica** em cada página
- **Open Graph tags** para compartilhamento em redes sociais
- **Imagens otimizadas** com Next.js Image
- **Static Site Generation** para carregamento rápido
- **URLs amigáveis** com slugs descritivos
- **Breadcrumbs** para navegação
- **Sitemap** incluindo posts do blog

### Acessibilidade

- **Semantic HTML** (article, header, nav, etc)
- **Alt text** em todas as imagens
- **ARIA labels** em botões e navegação
- **Contrast ratio** adequado
- **Keyboard navigation** funcional

---

## 🔗 Integração com Landing Page

### Links de Navegação

- Header da landing page terá link "Blog"
- Footer terá link para posts recentes
- CTAs no blog direcionam para página de preços

### Consistência Visual

- Mesma paleta de cores
- Mesmos componentes de botão
- Mesma tipografia
- Mesmas animações e transições
- Mesmo estilo de cards

---

**Documento criado em**: 04/01/2026
**Última atualização**: 04/01/2026
**Status**: Em implementação - Fase 1 (MVP)
