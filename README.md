# Colmeia Projetos

Plataforma de gestão de projetos de engenharia para monitoramento e acompanhamento de projetos, clientes e documentação.

## Tecnologias Utilizadas

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Autenticação**: Firebase Authentication
- **Banco de Dados**: Firestore
- **Armazenamento**: Firebase Storage
- **Gestão de Estado**: React Hooks customizados
- **UI/UX**: Componentes personalizados, shadcn/ui, Radix UI

## Funcionalidades Principais

- Sistema de autenticação multi-nível (superadmin, admin, cliente)
- Gestão de projetos com quadro Kanban
- Upload e gerenciamento de documentos
- Acompanhamento de prazos e status
- Interface de cliente para visualização de projetos
- Notificações e alertas

## Instalação e Setup

1. Clone o repositório
2. Instale as dependências:
   \`\`\`
   pnpm install
   \`\`\`
3. Configure as variáveis de ambiente (ver seção abaixo)
4. Execute o servidor de desenvolvimento:
   \`\`\`
   pnpm dev
   \`\`\`

## Variáveis de Ambiente

Para configurar o projeto corretamente, você precisa definir as variáveis de ambiente necessárias:

1. Copie o arquivo `.env.example` para um novo arquivo chamado `.env.local`:
   \`\`\`
   cp .env.example .env.local
   \`\`\`

2. Preencha o arquivo `.env.local` com suas credenciais:
   - Firebase Client SDK (variáveis públicas com prefixo NEXT_PUBLIC_)
   - Firebase Admin SDK (variáveis privadas para o servidor)
   - NextAuth para autenticação
   - AWS SES para envio de emails

3. ⚠️ **IMPORTANTE: Nunca compartilhe ou cometa arquivos .env no repositório** ⚠️
   - O arquivo `.env.local` contém informações sensíveis e está no `.gitignore`
   - Para implantação, configure as variáveis de ambiente no seu serviço de hospedagem

## Documentação do Projeto

A documentação sobre alterações importantes e limpeza de código está disponível na pasta `docs/`:

- [`docs/kanban-migration.md`](docs/kanban-migration.md) - Documentação sobre a unificação dos componentes Kanban
- [`docs/login-components-cleanup.md`](docs/login-components-cleanup.md) - Documentação sobre a remoção de componentes duplicados de login
- [`docs/code-cleanup.md`](docs/code-cleanup.md) - Plano de refatoração abrangente (notificações, API, estrutura de diretórios)
- [`docs/api-reference.md`](docs/api-reference.md) - Referência completa da API e plano de migração de endpoints
- [`docs/notifications-guide.md`](docs/notifications-guide.md) - Guia de integração com o sistema de notificações padronizadas

Esta documentação é importante para manter o histórico de decisões técnicas e facilitar a compreensão do código por novos desenvolvedores.

## Estrutura de Diretórios

- `src/app/` - Componentes de página e API routes (Next.js App Router)
- `src/components/` - Componentes React reutilizáveis
- `src/lib/` - Utilitários, hooks e serviços
  - `services/` - Serviços específicos (notificação, email, etc.)
  - `hooks/` - React hooks customizados
  - `utils/` - Funções utilitárias, incluindo o sistema de monitoramento de migração
- `docs/` - Documentação técnica do projeto

*Nota: A estrutura de diretórios passou por uma refatoração para unificar os diretórios administrativos. Todas as rotas administrativas agora residem em `admin/`, conforme documentado em [`docs/code-cleanup.md`](docs/code-cleanup.md).*

### Ferramentas de Desenvolvimento

Para desenvolvedores, oferecemos ferramentas internas para monitorar a migração:

- **Logs de Migração**: Sistema de logs centralizado para monitorar redirecionamentos e acessos
- **Documentação Detalhada**: Consulte `docs/code-cleanup.md` para detalhes sobre a migração

## Build e Deployment

Para gerar uma build de produção:

\`\`\`
pnpm build
\`\`\`

O projeto está configurado para deploy na Vercel, que detecta automaticamente as configurações do Next.js.
