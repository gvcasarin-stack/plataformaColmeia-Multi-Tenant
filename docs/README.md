# Documentação da Plataforma Colmeia

Este diretório contém a documentação técnica para o desenvolvimento e manutenção da Plataforma Colmeia.

## Índice

1. [Documentação da API](#documentação-da-api)
2. [Limpeza de Código](#limpeza-de-código)
3. [Notificações](#notificações)
4. [Guias de Migração](#guias-de-migração)
5. [Convenções](#convenções)

## Documentação da API

- [Referência da API](./api-reference.md) - Documentação completa dos endpoints da API, incluindo parâmetros, respostas e exemplos.

A API da Plataforma Colmeia está passando por uma refatoração para seguir convenções RESTful e melhorar a nomenclatura dos endpoints. O processo de migração inclui:

- Renomeação de endpoints com prefixo "test-" que são usados em produção
- Padronização de nomenclatura seguindo convenções RESTful
- Implementação de redirecionamentos para manter compatibilidade durante a transição

**Atualização (21/05/2024):** Iniciada a implementação dos novos endpoints RESTful com redirecionamento automático.

## Limpeza de Código

- [Registro de Alterações](./code-cleanup.md) - Documentação detalhada das alterações realizadas para limpeza e refatoração do código.

Este documento registra todas as alterações feitas para melhorar a organização, manutenção e legibilidade do código, incluindo:

- Remoção de componentes duplicados
- Unificação de interfaces
- Refatoração de serviços
- Padronização de convenções de código

**Atualização (21/05/2024):** Implementada nova API simplificada para o serviço de notificações.

## Notificações

- [Guia de Notificações](./notifications-guide.md) - Guia completo para o sistema de notificações da plataforma.

O sistema de notificações foi refatorado para:

- Incluir informações do remetente (nome e tipo)
- Garantir que notificações Cliente→Admin cheguem corretamente
- Exibir o nome real do administrador nas notificações (em vez de "administrador")
- Simplificar a criação de notificações com a nova API `createNotificationDirectly`

**Atualização (21/05/2024):** Implementada a API simplificada com exemplos completos de uso.

## Guias de Migração

- [Migração Kanban](./kanban-migration.md) - Detalhes sobre a migração dos componentes Kanban.

## Convenções

- [Nomenclatura e Convenções](./nomenclatura-e-convenções.md) - Padrões e convenções para nomeação de arquivos, componentes e implementação de código.

