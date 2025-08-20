# Guia de Integração: Sistema de Notificações via Firestore e Cloud Function

Este guia explica a arquitetura e o uso do sistema de notificações, que se baseia na criação de documentos na coleção `notifications` do Firestore e no processamento desses documentos por uma Cloud Function para envio de e-mails e futuras notificações in-app.

## Visão Geral da Arquitetura

1.  **Origem do Evento**: Ações do usuário (ex: adicionar comentário, fazer upload de arquivo) são tratadas por Server Actions (ex: `src/lib/actions/project-actions.ts`) ou serviços de backend (ex: `src/lib/services/fileService/core.ts`).
2.  **Criação da Notificação no Firestore**:
    *   Essas actions/serviços utilizam a função `createNotification` de `src/lib/services/notificationService/core.ts`.
    *   `createNotification` é responsável por formatar e salvar um novo documento na coleção `notifications` do Firestore.
    *   Este documento contém todos os dados relevantes sobre o evento (tipo, remetente, destinatário, dados específicos).
3.  **Processamento pela Cloud Function**:
    *   Uma Cloud Function do Firebase chamada `processNotificationTrigger` (definida em `functions/src/index.ts`) é acionada automaticamente sempre que um novo documento é criado na coleção `notifications`.
    *   Esta função lê os dados da notificação.
    *   Identifica o(s) destinatário(s) (usuário específico ou todos os admins).
    *   Busca informações adicionais (ex: email do usuário, preferências de notificação).
    *   **Envia o e-mail correspondente** usando o Amazon SES.
    *   (Futuramente) Pode também disparar notificações in-app.

Este desacoplamento garante que a lógica de envio de e-mail seja centralizada e gerenciada pela Cloud Function, tornando o código das actions mais limpo e focado em registrar o evento.

## Estrutura do Documento de Notificação (Coleção `notifications`)

Cada documento na coleção `notifications` segue a interface `NotificacaoPadronizada` (definida em `src/lib/services/notificationService/types.ts`):

```typescript
interface NotificacaoPadronizada {
  id: string;                   // ID do documento (gerado pelo Firestore)
  type: NotificationType;       // Tipo de notificação (ex: 'new_comment', 'document_upload')
  title: string;                // Título da notificação (para UI e assunto do e-mail)
  message: string;              // Mensagem/descrição (para UI e corpo do e-mail)
  createdAt: Timestamp;         // Data de criação
  updatedAt?: Timestamp;        // Data de atualização
  read: boolean;                // Status de leitura (para notificações in-app)
  
  // Remetente
  senderId: string;             // ID do usuário/sistema que originou o evento
  senderName: string;           // Nome do remetente
  senderType: 'admin' | 'client' | 'system';
  
  // Destinatário
  userId: string;               // ID do usuário destinatário ou 'all_admins'
  isAdminNotification: boolean; // True se userId === 'all_admins'
  
  // Referências
  projectId?: string;
  projectNumber?: string;
  projectName?: string;         // Nome do projeto (IMPORTANTE para e-mails)
  
  // Dados específicos do tipo (essenciais para a Cloud Function construir o e-mail)
  data: {
    link?: string;              // Link para o item relevante (projeto, comentário, etc.)
    // Campos específicos por tipo de notificação...
    // Ex: commentText, authorName, documentName, documentUrl, clientName, etc.
    [key: string]: any;
  }
}
```

## Como Criar Notificações (Para Desenvolvedores)

Ao implementar uma funcionalidade que deve gerar uma notificação:

1.  **Importe `createNotification`:**
```typescript
    import { createNotification } from '@/lib/services/notificationService/core';
    // Importe também NotificationType se precisar referenciar os tipos literais de string
    // Ex: type: 'new_comment'
    ```

2.  **Chame `createNotification` com os parâmetros adequados:**
    Os parâmetros são definidos pela interface `CreateNotificationParams` em `src/lib/services/notificationService/types.ts`.

```typescript
    // Exemplo dentro de uma Server Action ou serviço de backend
    // após um evento ocorrer (ex: novo comentário salvo).

    // User (quem realizou a ação)
    // const currentUser = { uid: '...', name: '...', role: '...' }; 
    // const project = { id: '...', number: '...', name: '...', clientOwnerId: '...' }; // clientOwnerId é o project.userId
    // const commentText = "Texto do comentário";
    // const commentId = "idDoComentario";

    let notificationRecipientId: string;
    let notificationDataLink: string;
    let title: string;
    let message: string;
    let senderType: 'admin' | 'client' | 'system';

    if (currentUser.role === 'admin' || currentUser.role === 'superadmin') { // Admin comentou/fez upload
        senderType = 'admin';
        if (project.clientOwnerId) { // project.clientOwnerId é o project.userId (dono do projeto)
            notificationRecipientId = project.clientOwnerId; 
            notificationDataLink = `${process.env.NEXT_PUBLIC_APP_URL}/cliente/projetos/${project.id}`; // Link para o cliente
            title = `Admin ${currentUser.name} interagiu com o projeto ${project.name}`;
            message = `Detalhes da ação do admin...`; // Seja específico sobre a ação
        } else {
            // Não há cliente para notificar ou é uma ação que não notifica cliente
            notificationRecipientId = null; // Para evitar erro se não houver destinatário
        }
    } else { // Cliente comentou/fez upload
        senderType = 'client';
        notificationRecipientId = 'all_admins';
        notificationDataLink = `${process.env.NEXT_PUBLIC_APP_URL}/admin/projetos/${project.id}`; // Link para o admin
        title = `Cliente ${currentUser.name} interagiu com o projeto ${project.name}`;
        message = `Detalhes da ação do cliente...`; // Seja específico sobre a ação
    }

    if (notificationRecipientId) { // Só cria se houver um destinatário válido
        await createNotification({
            type: 'tipo_da_notificacao_em_string', // Ex: 'new_comment', 'document_upload'
            title: title,
            message: message,
            
            userId: notificationRecipientId, // ID do destinatário ou 'all_admins'
            
            projectId: project.id,
            projectNumber: project.number,
            projectName: project.name, // Essencial para o e-mail
            
            senderId: currentUser.uid,
            senderName: currentUser.name,
            senderType: senderType,
            
            data: {
                link: notificationDataLink,
                // Outros dados específicos do evento que a Cloud Function possa precisar
                // para construir o e-mail (ex: commentText, documentName, authorName etc.)
                // Exemplo para novo comentário por um ADMIN para o CLIENTE:
                // commentText: commentText,
                // commentId: commentId,
                // authorId: currentUser.uid, // ID do admin
                // authorName: currentUser.name, // Nome do admin
                // createdByAdmin: true 
                
                // Exemplo para novo comentário por um CLIENTE para ADMINS:
                // commentText: commentText,
                // commentId: commentId,
                // authorId: currentUser.uid, // ID do cliente
                // authorName: currentUser.name, // Nome do cliente
                // fromClient: true,
                // clientName: currentUser.name 
            }
  });
}
``` 

### Tipos de Notificação Implementados e Dados Esperados em `data`:

*   **`'new_comment'`**:
    *   Criada por: `addCommentAction` em `src/lib/actions/project-actions.ts`.
    *   Disparada quando: Um novo comentário é adicionado a um projeto.
    *   `data` deve incluir:
        *   `link`: URL para o projeto/comentário (ex: `projectUrlClient` ou `projectUrlAdmin`).
        *   `commentText`: O texto do comentário.
        *   `commentId`: ID do comentário.
        *   `authorId`: ID do autor do comentário.
        *   `authorName`: Nome do autor do comentário.
        *   `fromClient`: (Opcional, inferido pelo `senderType`) `true` se o comentário foi feito por um cliente.
        *   `clientName`: Nome do cliente (se `fromClient` é true ou `senderType` é 'client').
        *   `createdByAdmin`: (Opcional, inferido pelo `senderType`) `true` se o comentário foi feito por um admin.

*   **`'document_upload'`**:
    *   Criada por: `sendFileNotifications` (chamada por `uploadProjectFile`) em `src/lib/services/fileService/core.ts`.
    *   Disparada quando: Um novo arquivo é carregado para um projeto.
    *   `data` deve incluir:
        *   `link`: URL para o projeto/documento.
        *   `documentName`: Nome do arquivo.
        *   `documentId`: Identificador do arquivo (atualmente `fileData.path`).
        *   `documentUrl`: URL de download do arquivo.
        *   `uploaderId`: ID do usuário que fez o upload.
        *   `uploaderName`: Nome do usuário que fez o upload.
        *   `fromClient`: (Opcional, inferido pelo `senderType`) `true` se o upload foi feito por um cliente.
        *   `clientName`: Nome do cliente (se `fromClient` é true ou `senderType` é 'client').
        *   `createdByAdmin`: (Opcional, inferido pelo `senderType`) `true` se o upload foi feito por um admin.

*   **`'system_message'`** (usada para exclusão de arquivos):
    *   Criada por: `deleteProjectFile` em `src/lib/services/fileService/core.ts`.
    *   Disparada quando: Um arquivo é excluído de um projeto.
    *   `title` e `message` indicarão a remoção e o nome do arquivo.
    *   `data` deve incluir:
        *   `documentName`: Nome do arquivo removido.
        *   `action`: `'delete'`
        *   `itemType`: `'document'`
        *   `fromClient` / `clientName` ou `createdByAdmin` conforme quem removeu (inferido pelo `senderType` na notificação).

## Funcionamento da Cloud Function `processNotificationTrigger`

Localizada em `functions/src/index.ts`.

1.  **Gatilho**: `functions.firestore.document('notifications/{notificationId}').onCreate()`
2.  **Obtenção de Dados**: Lê o `NotificationData` (conforme a interface `NotificacaoPadronizada`) do snapshot do documento recém-criado.
3.  **Busca de Destinatários Específicos**: 
    *   Se `notification.userId` é `'all_admins'`, a função busca no Firestore (coleção `users`) todos os usuários com `role` 'admin' ou 'superadmin' para obter seus emails e preferências.
    *   Se `notification.userId` é um ID específico, busca os dados desse usuário (email, preferências).
4.  **Verificação de Preferências**: (Implementação Futura na Cloud Function) Antes de enviar, a função pode verificar as preferências de notificação por e-mail do usuário para aquele tipo de evento.
5.  **Preparação do Conteúdo do E-mail**:
    *   Com base no `notification.type` e nos campos em `notification.data` (como `projectName`, `commentText`, `documentName`, `link`, `senderName`), a função monta o assunto e o corpo HTML do e-mail.
    *   Utiliza templates HTML básicos (atualmente definidos dentro da própria Cloud Function, mas podem ser externalizados ou usar um serviço de templating).
6.  **Envio via AWS SES**:
    *   Usa o cliente `@aws-sdk/client-ses` para enviar o e-mail formatado.
    *   As credenciais da AWS (Access Key, Secret Key) e a Região do SES são configuradas como variáveis de ambiente da Cloud Function (ex: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `SES_SENDER_EMAIL`).
7.  **Tratamento de Erros e Logging**: Erros durante o processo (busca de usuário, envio de e-mail) são logados no console do Firebase Functions para depuração.

## Considerações Importantes

*   **Campos em `data`**: Certifique-se de que o objeto `data` na notificação criada contenha **todas as informações dinâmicas** que a Cloud Function `processNotificationTrigger` precisará para construir um e-mail informativo e correto. A Cloud Function não deve precisar fazer buscas complexas adicionais para obter dados básicos do evento.
*   **`projectName`**: Este campo é crucial para a maioria dos e-mails. Garanta que ele seja sempre fornecido ao chamar `createNotification`.
*   **Links**: Fornecer um `link` no objeto `data` permite que o e-mail contenha um botão/link direto para o item relevante na aplicação (ex: o projeto, o comentário específico, etc.).
*   **Funções Legadas e Serviços de E-mail Direto**:
    *   O arquivo `src/lib/utils/notificationHelper.ts` contém muitas funções legadas e está em processo de descontinuação. **Evite usá-lo para novas implementações de notificação.**
    *   Funções de envio direto de e-mail no `src/lib/services/emailService.ts` (como `notifyUserOfNewComment`, `notifyAdminAboutDocument`) **não devem mais ser usadas para os fluxos de comentários e uploads/exclusões de arquivos**, pois estes agora são gerenciados pela Cloud Function via `notifications`.
    *   O `emailService.ts` ainda é válido para e-mails que *não* devem gerar um registro na coleção `notifications` e que são enviados diretamente pela aplicação web (ex: e-mail de boas-vindas, confirmação de e-mail, redefinição de senha, ou a notificação de mudança de status que já funciona diretamente e não foi incluída nesta refatoração).

Este guia deve ajudar a manter a consistência e clareza no sistema de notificações. 