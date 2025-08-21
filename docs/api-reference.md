# Documentação da API da Plataforma Colmeia

## Visão Geral

Esta documentação contém detalhes sobre os endpoints disponíveis na API da Plataforma Colmeia. Todos os endpoints são rotas Next.js App Router usando os handlers `GET`, `POST`, `PUT`, e `DELETE`.

## Convenções de Nomenclatura Recomendadas

- **URLs RESTful**: Os endpoints devem seguir princípios RESTful
- **Recursos no plural**: Usar substantivos no plural para recursos (`/users` em vez de `/user`)
- **Ações como verbos HTTP**: Usar verbos HTTP (GET, POST, PUT, DELETE) em vez de verbos na URL
- **Versionamento**: Prefixar com `/v1/` quando implementar versionamento
- **Hierarquia clara**: Usar subrecursos quando existir relação hierárquica (`/projects/{id}/documents`)

## 1. Endpoints de Autenticação

### 1.1 Login

- **URL**: `/api/auth/login`
- **Método**: `POST`
- **Descrição**: Autentica um usuário e retorna um token JWT
- **Corpo**:
  \`\`\`json
  {
    "email": "usuario@email.com",
    "password": "senha123"
  }
  \`\`\`
- **Resposta**:
  \`\`\`json
  {
    "success": true,
    "token": "jwt-token-here",
    "user": {
      "id": "user-id",
      "email": "usuario@email.com",
      "name": "Nome do Usuário",
      "role": "admin|client"
    }
  }
  \`\`\`

### 1.2 Registro de Cliente

- **URL**: `/api/auth/register-client`
- **Método**: `POST`
- **Descrição**: Registra um novo cliente no sistema
- **Corpo**:
  \`\`\`json
  {
    "name": "Nome do Cliente",
    "email": "cliente@email.com",
    "password": "senha123",
    "company": "Nome da Empresa",
    "phone": "+5511999999999"
  }
  \`\`\`
- **Resposta**:
  \`\`\`json
  {
    "success": true,
    "userId": "user-id-created"
  }
  \`\`\`

### 1.3 Recuperação de Senha

- **URL**: `/api/auth/recover-password`
- **Método**: `POST`
- **Descrição**: Inicia o processo de recuperação de senha
- **Corpo**:
  \`\`\`json
  {
    "email": "usuario@email.com"
  }
  \`\`\`
- **Resposta**:
  \`\`\`json
  {
    "success": true,
    "message": "Email de recuperação enviado"
  }
  \`\`\`

## 2. Endpoints de Projetos

### 2.1 Listagem de Projetos

- **URL**: `/api/projects`
- **Método**: `GET`
- **Descrição**: Retorna a lista de projetos acessíveis pelo usuário atual
- **Parâmetros de Query**:
  - `limit`: Número máximo de projetos (padrão: 20)
  - `page`: Página de resultados (padrão: 1)
  - `status`: Filtrar por status (opcional)
- **Resposta**:
  \`\`\`json
  {
    "success": true,
    "projects": [
      {
        "id": "project-id",
        "number": "FV-2024-001",
        "title": "Projeto Solar Residencial",
        "client": "Nome do Cliente",
        "status": "em_andamento",
        "createdAt": "2024-05-08T12:00:00Z"
      }
    ],
    "pagination": {
      "total": 45,
      "pages": 3,
      "currentPage": 1
    }
  }
  \`\`\`

### 2.2 Atualização de Projeto

- **URL**: `/api/projects/update`
- **Método**: `POST`
- **Descrição**: Atualiza informações de um projeto existente
- **Corpo**:
  \`\`\`json
  {
    "projectId": "project-id",
    "data": {
      "title": "Novo Título",
      "status": "concluido",
      "description": "Nova descrição"
    }
  }
  \`\`\`
- **Resposta**:
  \`\`\`json
  {
    "success": true,
    "project": {
      "id": "project-id",
      "title": "Novo Título",
      "status": "concluido",
      "updatedAt": "2024-05-08T14:30:00Z"
    }
  }
  \`\`\`

### 2.3 Upload de Arquivo

- **URL**: `/api/projects/upload-file`
- **Método**: `POST`
- **Descrição**: Faz upload de um arquivo para um projeto
- **Corpo**: FormData com campos:
  - `projectId`: ID do projeto
  - `file`: Arquivo a ser enviado
  - `description`: Descrição opcional do arquivo
- **Resposta**:
  \`\`\`json
  {
    "success": true,
    "fileId": "file-id",
    "url": "https://storage.example.com/path/to/file"
  }
  \`\`\`

## 3. Endpoints de Notificações

### 3.1 Criação de Notificação

- **URL**: `/api/notifications/create`
- **Método**: `POST`
- **Descrição**: Cria uma nova notificação para usuário(s)
- **Corpo**:
  \`\`\`json
  {
    "type": "new_project",
    "title": "Novo Projeto Criado",
    "message": "Um novo projeto foi criado: FV-2024-001",
    "userId": "user-id",
    "projectId": "project-id",
    "projectNumber": "FV-2024-001",
    "data": {
      "additionalInfo": "Dados adicionais"
    },
    "options": {
      "notifyAllAdmins": false,
      "skipCreator": true
    }
  }
  \`\`\`
- **Resposta**:
  \`\`\`json
  {
    "success": true,
    "notificationId": "notification-id"
  }
  \`\`\`

### 3.2 Marcar Notificação como Lida

- **URL**: `/api/notifications/mark-read/[id]`
- **Método**: `POST`
- **Descrição**: Marca uma notificação específica como lida
- **Parâmetros de URL**:
  - `id`: ID da notificação
- **Resposta**:
  \`\`\`json
  {
    "success": true,
    "id": "notification-id"
  }
  \`\`\`

### 3.3 Obter Notificações

- **URL**: `/api/notifications/get`
- **Método**: `GET`
- **Descrição**: Obtém as notificações do usuário atual
- **Parâmetros de Query**:
  - `limit`: Número máximo de notificações (padrão: 20)
  - `unreadOnly`: Se `true`, retorna apenas não lidas (padrão: false)
- **Resposta**:
  \`\`\`json
  {
    "success": true,
    "notifications": [
      {
        "id": "notification-id",
        "type": "new_comment",
        "title": "Novo Comentário",
        "message": "Usuário comentou no projeto",
        "read": false,
        "createdAt": "2024-05-08T15:00:00Z"
      }
    ],
    "unreadCount": 5
  }
  \`\`\`

### 3.4 Notificação de Criação de Projetos

#### Nome Recomendado
- **URL**: `/api/notifications/project-created`
- **Método**: `GET`
- **Descrição**: Envia notificações de criação de projetos para administradores
- **Uso em Produção**: Utilizado no fluxo de criação de novos projetos
- **Parâmetros de Query**:
  - `projectId`: ID do projeto (obrigatório)
  - `clientName`: Nome do cliente (opcional)
  - `projectNumber`: Número do projeto (opcional)
- **Tratamento de Erros**:
  - Implementado tratamento padronizado com códigos de erro específicos
  - Validação de parâmetros obrigatórios (`projectId`)
  - Respostas com formato consistente em casos de sucesso e erro
- **Resposta de Sucesso**:
  \`\`\`json
  {
    "success": true,
    "message": "Notificação enviada com sucesso",
    "data": {
      "notificationId": "notification-id",
      "sentTo": ["admin1", "admin2"]
    }
  }
  \`\`\`
- **Resposta de Erro**:
  \`\`\`json
  {
    "success": false,
    "error": "ID do projeto é obrigatório",
    "errorCode": "MISSING_REQUIRED_FIELD"
  }
  \`\`\`
- **Notas**: Este endpoint foi migrado com sucesso do antigo `/api/test-notification/project-created` seguindo as convenções RESTful e implementando o novo sistema padronizado de tratamento de erros.

## 4. Endpoints de Administração

### 4.1 Aprovar Solicitação de Cliente

- **URL**: `/api/admin/client-requests`
- **Método**: `POST`
- **Descrição**: Aprova ou rejeita uma solicitação de cliente
- **Corpo**:
  \`\`\`json
  {
    "requestId": "request-id",
    "action": "approve|reject",
    "notes": "Motivo opcional para rejeição"
  }
  \`\`\`
- **Resposta**:
  \`\`\`json
  {
    "success": true,
    "message": "Solicitação aprovada com sucesso"
  }
  \`\`\`

### 4.2 Criar Membro da Equipe

- **URL**: `/api/admin/create-team-member`
- **Método**: `POST`
- **Descrição**: Adiciona um novo membro à equipe administrativa
- **Corpo**:
  \`\`\`json
  {
    "email": "membro@email.com",
    "name": "Nome do Membro",
    "role": "admin|editor|viewer",
    "permissions": ["projects.edit", "clients.view"]
  }
  \`\`\`
- **Resposta**:
  \`\`\`json
  {
    "success": true,
    "userId": "new-user-id",
    "inviteLink": "https://example.com/accept-invite/token"
  }
  \`\`\`

## 5. Endpoints de Armazenamento

### 5.1 Obter Token de Upload

- **URL**: `/api/storage/get-upload-token`
- **Método**: `POST`
- **Descrição**: Obtém um token assinado para upload direto
- **Corpo**:
  \`\`\`json
  {
    "fileName": "documento.pdf",
    "contentType": "application/pdf",
    "projectId": "project-id"
  }
  \`\`\`
- **Resposta**:
  \`\`\`json
  {
    "success": true,
    "uploadUrl": "https://storage.example.com/signed-url",
    "token": "upload-token",
    "expiresAt": "2024-05-08T17:00:00Z"
  }
  \`\`\`

### 5.2 Notificar Sucesso de Upload

- **URL**: `/api/storage/notify-upload-success`
- **Método**: `POST`
- **Descrição**: Notifica o sistema quando um upload é concluído
- **Corpo**:
  \`\`\`json
  {
    "token": "upload-token",
    "fileId": "file-id",
    "size": 1024567,
    "projectId": "project-id",
    "metadata": {
      "description": "Descrição do arquivo"
    }
  }
  \`\`\`
- **Resposta**:
  \`\`\`json
  {
    "success": true,
    "documentId": "document-id-in-database"
  }
  \`\`\`

## 6. Endpoints a Serem Renomeados (Usados em Produção)

> ⚠️ IMPORTANTE: Estes endpoints têm nomes que sugerem serem apenas para testes, mas são usados em produção. Listamos os nomes atuais e os propostos para uma futura refatoração.

### 6.1 Serviço de Emails

#### Nome Atual
- **URL**: `/api/test-email`
- **Método**: `POST`

#### Nome Recomendado
- **URL**: `/api/emails/send`
- **Método**: `POST`
- **Descrição**: Envia emails para usuários através do sistema
- **Uso em Produção**: Utilizado para comunicações oficiais com clientes
- **Corpo**:
  \`\`\`json
  {
    "email": "destinatario@email.com"
  }
  \`\`\`
- **Resposta**:
  \`\`\`json
  {
    "success": true,
    "message": "E-mail enviado com sucesso",
    "messageId": "message-id-reference"
  }
  \`\`\`

### 6.2 Serviço de Emails com Templates HTML

#### Nome Atual
- **URL**: `/api/test-ses`
- **Método**: `POST`

#### Nome Recomendado
- **URL**: `/api/emails/send-template`
- **Método**: `POST`
- **Descrição**: Interface para o serviço Amazon SES para envio de emails formatados em HTML
- **Uso em Produção**: Utilizado para enviar emails com templates HTML complexos
- **Corpo**:
  \`\`\`json
  {
    "email": "destinatario@email.com",
    "subject": "Assunto do email",
    "htmlContent": "<html>Conteúdo formatado em HTML</html>"
  }
  \`\`\`
- **Resposta**:
  \`\`\`json
  {
    "success": true,
    "messageId": "ses-message-id"
  }
  \`\`\`

### 6.3 Notificação de Criação de Projetos

#### Nome Atual
- **URL**: `/api/test-notification/project-created`
- **Método**: `GET`

#### Nome Recomendado
- **URL**: `/api/notifications/project-created`
- **Método**: `GET`
- **Descrição**: Envia notificações de criação de projetos para administradores
- **Uso em Produção**: Utilizado no fluxo de criação de novos projetos
- **Status**: ✅ **Migração Concluída** (Agosto/2024)
- **Detalhes Completos**: Ver seção [3.4 Notificação de Criação de Projetos](#34-notificação-de-criação-de-projetos)
- **Implementação**: Endpoint migrado com implementação do novo sistema padronizado de tratamento de erros e redirecionamento permanente configurado no Next.js

### 6.4 Plano de Migração para Renomeação de Endpoints

#### Fase 1: Implementação Paralela (Junho/2024)
- ✅ Criar novos endpoints com os nomes recomendados
  - Implementados `/api/emails/send` (substitui `/api/test-email`)
  - Implementados `/api/emails/send-template` (substitui `/api/test-ses`)
- ✅ Manter os endpoints antigos funcionando com redirecionamento para os novos
- ✅ Implementar logs detalhados para monitorar o uso de cada endpoint

#### Fase 2: Redirecionamento (Agosto/2024)
- ✅ Implementar redirecionamento dos endpoints antigos para os novos:
  \`\`\`typescript
  // Implementado em /api/test-email e /api/test-ses
  export async function POST(req: NextRequest) {
    console.warn("Endpoint legado sendo usado. Redirecionando para novo endpoint");
    // Redirecionar para o novo endpoint
    const url = new URL('/api/emails/send-template', req.url);
    // ... código de redirecionamento ...
  }
  \`\`\`
- ✅ Adicionar avisos de depreciação nos logs e nas respostas HTTP:
  \`\`\`json
  {
    "success": true,
    "message": "Email enviado com sucesso",
    "deprecationWarning": "Este endpoint está depreciado. Use /api/emails/send-template em vez disso."
  }
  \`\`\`

#### Fase 3: Atualização do Código Cliente (Agosto/2024)
- ✅ Atualizar o código de teste de emails em `/app/teste-email` para usar o novo endpoint 
- ✅ Mover o código para a nova localização em `/app/admin/ferramentas/email`
- ✅ Implementar redirecionamento automático da página antiga para a nova localização
- ⏳ Identificar e atualizar pontos restantes no código onde os endpoints antigos são chamados
- ⏳ Realizar testes completos para garantir funcionalidade correta

#### Fase 4: Monitoramento e Finalização (Setembro/2024)
- ⏳ Monitorar uso dos endpoints antigos por 2-4 semanas
- ⏳ Se não houver mais chamadas, desativar os endpoints antigos (mantendo apenas redirecionamentos)
- ⏳ Documentar as mudanças para referência futura

### 6.5 Progresso da Migração (Agosto/2024)

| Endpoint Antigo | Novo Endpoint | Status | Página Cliente Atualizada |
|----------------|---------------|--------|---------------------------|
| `/api/test-email` | `/api/emails/send` | ✅ Migrado | ✅ `/admin/ferramentas/email` |
| `/api/test-ses` | `/api/emails/send-template` | ✅ Migrado | ✅ `/admin/ferramentas/template-email` |
| `/api/test-notification/project-created` | `/api/notifications/project-created` | ✅ Migrado | ✅ Implementado via redirecionamento |

**Nota sobre a localização das ferramentas administrativas**: Durante a migração, as ferramentas administrativas foram reorganizadas, renomeando a pasta de `ferramentas-teste` para `ferramentas`. Esta mudança reflete melhor o propósito real desses componentes, que são ferramentas de produção para administradores, não apenas funcionalidades de teste. Implementamos redirecionamentos permanentes (301) a nível de configuração do Next.js, eliminando a necessidade de componentes de redirecionamento e garantindo uma arquitetura mais limpa.

**Nota sobre a API de notificações**: A API de notificações para novos projetos foi migrada de `/api/test-notification/project-created` para `/api/notifications/project-created`, seguindo as convenções RESTful. A nova API mantém total compatibilidade com a anterior, mas adiciona tratamento de erros aprimorado com códigos de erro específicos. Um redirecionamento permanente (301) foi configurado no Next.js para garantir que aplicativos existentes continuem funcionando sem interrupção.

### 6.6 Convenções de Nomenclatura RESTful para Novos Endpoints

Para garantir consistência na API, as seguintes convenções RESTful serão adotadas para todos os novos endpoints:

1. **Recursos no plural**: `/emails`, `/notifications`, `/projects`
2. **Verbos HTTP para ações**:
   - GET: Para leitura e recuperação de dados
   - POST: Para criação de recursos
   - PUT: Para atualização completa
   - PATCH: Para atualização parcial
   - DELETE: Para exclusão
3. **Hierarquia**:
   - Recursos aninhados: `/projects/{id}/documents`
   - Ações específicas: `/emails/send` em vez de `/send-email`
4. **Query parameters para filtragem**:
   - `/notifications?unread=true&limit=10` em vez de `/get-unread-notifications/10`
5. **Nomenclatura clara**:
   - Evitar verbos nos nomes de endpoints
   - Usar substantivos descritivos

## 7. Endpoints Exclusivos de Testes (NÃO USAR EM PRODUÇÃO)

> ⚠️ ATENÇÃO: Estes endpoints são realmente apenas para testes durante o desenvolvimento e devem ser removidos em ambiente de produção!

Esta seção lista endpoints usados exclusivamente para testes de funcionalidades durante o desenvolvimento, sem uso em produção.

### 7.1 Test Basic Endpoint

- **URL**: `/api/test-endpoint`
- **Método**: `GET`
- **Descrição**: Endpoint básico de teste para verificar se a API está funcionando

### 7.2 Test Storage

- **URL**: `/api/test-storage`
- **Método**: `GET`
- **Descrição**: Testa a conexão com o serviço de armazenamento

### 7.3 Example Delayed Response

- **URL**: `/api/example-delayed`
- **Método**: `GET`
- **Descrição**: Endpoint que simula uma resposta com atraso para testes de UI

## Notas de Implementação

1. **Segurança**: Todos os endpoints exigem autenticação via Bearer token, exceto endpoints públicos como login e registro.

2. **Tratamento de Erros**: Todos os erros seguem um formato padrão:
   \`\`\`json
   {
     "success": false,
     "error": "Mensagem de erro",
     "errorCode": "CODIGO_DE_ERRO",
     "details": "Detalhes adicionais (quando disponíveis)"
   }
   \`\`\`

3. **Padrão de Erros**: A partir de Agosto/2024, implementamos um sistema padronizado de tratamento de erros que inclui códigos de erro específicos para facilitar o tratamento pelos clientes da API:

   | Código de Erro | Descrição | Status HTTP |
   |----------------|-----------|-------------|
   | `VALIDATION_ERROR` | Erro de validação nos dados enviados | 400 |
   | `MISSING_REQUIRED_FIELD` | Campo obrigatório ausente | 400 |
   | `INVALID_FORMAT` | Formato de dados inválido | 400 |
   | `UNAUTHORIZED` | Autenticação necessária | 401 |
   | `FORBIDDEN` | Permissão negada | 403 |
   | `INVALID_TOKEN` | Token inválido ou expirado | 401 |
   | `TOKEN_EXPIRED` | Token de autenticação expirado | 401 |
   | `NOT_FOUND` | Recurso não encontrado | 404 |
   | `RECORD_NOT_FOUND` | Registro específico não encontrado no banco de dados | 404 |
   | `ALREADY_EXISTS` | Recurso já existe (conflito) | 409 |
   | `CONFLICT` | Conflito na operação | 409 |
   | `DATABASE_ERROR` | Erro de operação no banco de dados | 500 |
   | `STORAGE_ERROR` | Erro no sistema de armazenamento | 500 |
   | `FILE_TOO_LARGE` | Arquivo excede o tamanho máximo permitido | 413 |
   | `INVALID_FILE_TYPE` | Tipo de arquivo não suportado | 415 |
   | `INTERNAL_SERVER_ERROR` | Erro interno do servidor | 500 |
   | `EXTERNAL_SERVICE_ERROR` | Erro em serviço externo | 502 |
   | `OPERATION_FAILED` | Falha na operação solicitada | 500 |
   | `RATE_LIMIT_EXCEEDED` | Limite de requisições excedido | 429 |
   | `TOO_MANY_REQUESTS` | Muitas requisições em curto período | 429 |
   | `NOTIFICATION_PROCESSING_ERROR` | Erro no processamento de notificações | 500 |
   | `EMAIL_SENDING_ERROR` | Erro ao enviar email | 500 |
   | `FILE_UPLOAD_ERROR` | Erro no upload de arquivo | 500 |
   | `DUPLICATE_ENTRY` | Entrada duplicada não permitida | 409 |

   **Implementação**: Para padronizar o tratamento de erros, criamos o utilitário `apiErrorHandler.ts`, que fornece funções como:

   - `createApiSuccess()` - Cria respostas de sucesso padronizadas
   - `createApiError()` - Cria respostas de erro padronizadas
   - `handleApiError()` - Processa exceções em endpoints
   - `handleMissingRequiredField()` - Trata campos obrigatórios ausentes
   - `handleResourceNotFound()` - Trata erros de recursos não encontrados

   **Exemplo de uso**:
   \`\`\`typescript
   try {
     // Lógica do endpoint
     return createApiSuccess(data, "Operação concluída com sucesso");
   } catch (error) {
     return handleApiError(error, "Erro ao processar a solicitação", ApiErrorCode.INTERNAL_SERVER_ERROR);
   }
   \`\`\`

   Este padrão foi implementado nos seguintes endpoints:
   - `/api/auth/login`
   - `/api/projects`
   - `/api/notifications/get`
   - `/api/notifications/project-created`
   - `/api/projects/upload-file`

   A migração de todos os endpoints para este padrão está em andamento, com previsão de conclusão para setembro/2024.

4. **Rate Limiting**: Os endpoints são limitados a 100 requisições por minuto por usuário.

5. **Manutenção**: Esta API é mantida e atualizada regularmente. Verifique este documento para alterações.

## Próximos Passos na API

- **Migração de Endpoints (Em Andamento)**: 
  - Continuar migração dos endpoints restantes para nomenclatura RESTful
  - Priorização por grupos funcionais: autenticação, projetos, notificações
  - Status atual: 10% dos endpoints migrados (5 de 58 endpoints totais)

- **Padronização do Tratamento de Erros (Em Andamento)**:
  - Implementar o utilitário apiErrorHandler em todos os endpoints restantes
  - Adicionar validação consistente de parâmetros em todas as rotas
  - Prever conclusão até setembro/2024

- **Versionamento da API (Planejado)**:
  - Implementação de prefixos de versão (v1, v2)
  - Documentação por versão
  - Estratégia de depreciação de versões antigas

- **Documentação (Planejado)**:
  - Documentação automática via Swagger/OpenAPI
  - Exemplos de requisições para todos os endpoints
  - Ambiente de teste interativo

- **Melhorias de Performance (Planejado)**:
  - Adição de caching para endpoints frequentemente acessados
  - Otimização de consultas ao Firestore
  - Implementação de websockets para notificações em tempo real
