import React from 'react';
import { devLog } from "@/lib/utils/productionLogger";
import { TimelineEvent } from '@/types/project';

/**
 * Renderiza um evento de mudança de status na timeline
 */
export const renderStatusChangeEvent = (event: TimelineEvent) => {
  // Verificar se é um evento de status
  if (event.type !== 'status' && !event.isStatusChange && 
      !(event.content && event.content.includes('Status alterado de'))) {
    return null;
  }
  
  // Verificar se é um evento de status especial de criação de projeto com checklist
  if (event.userId === 'system' && 
      event.content && 
      event.content.includes('Seu projeto está prestes a ser desenvolvido')) {
    // Este é o evento especial de checklist de criação de projeto
    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="font-medium mb-3 text-blue-700 dark:text-blue-400">Checklist de Documentos Necessários para o Projeto</p>
        <div className="mb-3">
          <p>Seu projeto está prestes a ser desenvolvido. Porém antes vamos precisar que você nos encaminhe os seguintes documentos:</p>
        </div>
        <ul className="list-disc pl-5 space-y-1.5 mb-3">
          <li>Fatura de energia com dados legíveis.</li>
          <li>Lista de materiais contendo: marca, modelo e quantidade de módulos, inversores e demais componentes, como por exemplo Stringbox (se houver).</li>
          <li>Foto do documento completo (frente e verso) do responsável legal (CNH ou documento de identidade). Se a titularidade estiver em nome de pessoa jurídica (PJ), encaminhar também o cartão CNPJ e contrato social, além do documento de identidade do responsável legal pela unidade consumidora.</li>
          <li>Foto do padrão de entrada.</li>
          <li>Foto ou informação de qual é o DJ (disjuntor) do padrão de entrada.</li>
          <li>Coordenada geográfica exata do local de instalação.</li>
          <li>Instalação em telhado ou solo?</li>
          <li>Se for seu primeiro projeto conosco, encaminhe a logo de sua empresa para a elaboração dos documentos.</li>
          <li>Fotos complementares de onde será feita a instalação. Caso possuir, encaminhar imagens que auxiliam a avaliação do local, bem como possíveis fontes de sombreamento (caso houver)</li>
          <li>Para os projetos na distribuidora ENEL ou EQUATORIAL, encaminhar foto que contenha o número do poste que alimenta a unidade consumidora, ou o poste mais próximo do local de atendimento.</li>
        </ul>
        <div className="mb-2">
          <p>Uma vez que todos os documentos sejam encaminhados, nossa equipe avaliará e em até 24h retornará informando se a documentação está de acordo, ou se necessita de alguma correção ou adição de documentos. Se tudo estiver correto, seu projeto seguirá para a próxima etapa para ser desenvolvido.</p>
        </div>
      </div>
    );
  }
  
  // Para eventos normais de status, continuar com o comportamento padrão
  // Extrair oldStatus e newStatus de diferentes fontes possíveis
  const oldStatus = event.data?.oldStatus || 
                  (event.content && event.content.match(/de "([^"]+)"/)?.[1]) ||
                  (event.content && event.content.match(/de ([^"]+) para/)?.[1]);
  
  const newStatus = event.data?.newStatus || 
                  (event.content && event.content.match(/para "([^"]+)"/)?.[1]) ||
                  (event.content && event.content.match(/para ([^"]+)$/)?.[1]);
  
  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-md border-l-4 border-yellow-500">
      <div className="flex items-center mb-2">
        <span className="text-yellow-600 dark:text-yellow-400 mr-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 8v4"></path>
            <path d="M12 16h.01"></path>
          </svg>
        </span>
        <p className="font-medium text-gray-900 dark:text-gray-100">
          {event.fullName || event.user || 'Usuário'} - Alteração de Status
        </p>
      </div>
      
      <p className="text-gray-700 dark:text-gray-300">
        Status alterado de "{oldStatus}" para "{newStatus}"
      </p>
      
      <div className="mt-2 flex flex-wrap items-center text-sm">
        <div className="flex items-center mb-1 mr-2">
          <span className="font-medium text-gray-600 dark:text-gray-400 mr-1">De:</span>
          <span className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
            {oldStatus}
          </span>
        </div>
        
        <span className="mr-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </span>
        
        <div className="flex items-center mb-1">
          <span className="font-medium text-gray-600 dark:text-gray-400 mr-1">Para:</span>
          <span className="px-2 py-1 rounded bg-green-200 dark:bg-green-900 text-green-800 dark:text-green-200">
            {newStatus}
          </span>
        </div>
      </div>
      
      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {new Date(event.timestamp).toLocaleString('pt-BR')}
      </div>
    </div>
  );
};

/**
 * Renderiza um evento de checklist do sistema na timeline
 */
export const renderChecklistEvent = (event: TimelineEvent) => {
  // Verificar se é um evento de checklist explícito OU
  // um evento de sistema com a mensagem de checklist
  if ((event.userId !== 'system' && event.type !== 'checklist') || 
      !event.content || 
      (!event.content.includes('Checklist de Documentos Necessários') && 
       !event.content.includes('Seu projeto está prestes a ser desenvolvido'))) {
    return null;
  }
  
  // Usar a mensagem completa personalizada se disponível
  if (event.fullMessage) {
    // Processar a mensagem completa para render adequado
    const lines = event.fullMessage.split('\n');
    const title = event.title || lines[0] || 'Checklist de Documentos Necessários para o Projeto';
    
    // Dividir o texto em parágrafos introdutórios, itens de lista e parágrafos finais
    const introParas: string[] = [];
    const listItems: string[] = [];
    const finalParas: string[] = [];
    
    // Ignorar o título (primeira linha)
    // Identificar o formato esperado:
    // 1. Título (primeira linha)
    // 2. Parágrafo introdutório (segundas linhas não vazias até encontrar um item de lista)
    // 3. Lista de itens (linhas que começam com "-")
    // 4. Parágrafos finais (linhas que vêm depois dos itens de lista e não começam com "-")
    
    let inListSection = false;
    let pastListSection = false;
    
    // Pular a primeira linha (título)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Pular linhas vazias
      
      // Se a linha começa com "-", é um item de lista
      if (line.startsWith('-')) {
        inListSection = true;
        listItems.push(line.substring(1).trim()); // Remover o traço e espaços extras
      } 
      // Se já passamos pelos itens da lista e encontramos texto normal
      else if (inListSection) {
        pastListSection = true;
        finalParas.push(line);
      }
      // Se ainda não começamos a lista e não estamos após a lista, é um parágrafo introdutório
      else if (!inListSection && !pastListSection) {
        introParas.push(line);
      }
    }
    
    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="font-medium mb-3 text-blue-700 dark:text-blue-400">{title}</p>
        
        {/* Parágrafos introdutórios */}
        {introParas.length > 0 && introParas.map((paragraph, index) => (
          <div key={`intro-${index}`} className="mb-3">
            <p>{paragraph}</p>
          </div>
        ))}
        
        {/* Itens da lista */}
        {listItems.length > 0 && (
          <ul className="list-disc pl-5 space-y-1.5 mb-3">
            {listItems.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        )}
        
        {/* Parágrafos finais */}
        {finalParas.length > 0 && finalParas.map((paragraph, index) => (
          <div key={`final-${index}`} className="mb-2">
            <p>{paragraph}</p>
          </div>
        ))}
      </div>
    );
  }
  
  // Fallback para o comportamento anterior caso não tenha a mensagem completa
  // Isso é importante para manter a compatibilidade com projetos existentes
  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
      <p className="font-medium mb-3 text-blue-700 dark:text-blue-400">Checklist de Documentos Necessários para o Projeto</p>
      <div className="mb-3">
        <p>Seu projeto está prestes a ser desenvolvido. Porém antes vamos precisar que você nos encaminhe os seguintes documentos:</p>
      </div>
      <ul className="list-disc pl-5 space-y-1.5 mb-3">
        {event.subItems && event.subItems.length > 0 ? (
          // Usar os subitems do próprio evento
          event.subItems.map((item, index) => (
            <li key={index}>{item}</li>
          ))
        ) : (
          // Fallback para o checklist padrão
          <>
            <li>Fatura de energia com dados legíveis.</li>
            <li>Lista de materiais contendo: marca, modelo e quantidade de módulos, inversores e demais componentes, como por exemplo Stringbox (se houver).</li>
            <li>Foto do documento completo (frente e verso) do responsável legal (CNH ou documento de identidade). Se a titularidade estiver em nome de pessoa jurídica (PJ), encaminhar também o cartão CNPJ e contrato social, além do documento de identidade do responsável legal pela unidade consumidora.</li>
            <li>Foto do padrão de entrada.</li>
            <li>Foto ou informação de qual é o DJ (disjuntor) do padrão de entrada.</li>
            <li>Coordenada geográfica exata do local de instalação.</li>
            <li>Instalação em telhado ou solo?</li>
            <li>Se for seu primeiro projeto conosco, encaminhe a logo de sua empresa para a elaboração dos documentos.</li>
            <li>Fotos complementares de onde será feita a instalação. Caso possuir, encaminhar imagens que auxiliam a avaliação do local, bem como possíveis fontes de sombreamento (caso houver)</li>
            <li>Para os projetos na distribuidora ENEL ou EQUATORIAL, encaminhar foto que contenha o número do poste que alimenta a unidade consumidora, ou o poste mais próximo do local de atendimento.</li>
          </>
        )}
      </ul>
      <div className="mb-2">
        <p>Uma vez que todos os documentos sejam encaminhados, nossa equipe avaliará e em até 24h retornará informando se a documentação está de acordo, ou se necessita de alguma correção ou adição de documentos. Se tudo estiver correto, seu projeto seguirá para a próxima etapa para ser desenvolvido.</p>
      </div>
    </div>
  );
};

/**
 * Renderiza um evento de comentário na timeline
 */
export const renderCommentEvent = (
  event: TimelineEvent, 
  isAdmin?: boolean, 
  currentUserId?: string,
  onDeleteComment?: (commentId: string) => void
) => {
  if (event.type !== 'comment') {
    return null;
  }
  
  // Determinar se o usuário atual pode excluir este comentário
  // Admins podem excluir qualquer comentário
  // Usuários normais só podem excluir seus próprios comentários
  const isOwnComment = currentUserId && event.userId === currentUserId;
  const canDelete = isAdmin || isOwnComment;
  
  return (
    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
      <div className="flex justify-between items-start mb-2">
        <p className="font-medium text-gray-900 dark:text-gray-100">Comentário</p>
        {canDelete && onDeleteComment && (
          <button
            onClick={() => onDeleteComment(event.id)}
            className="flex items-center text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-xs"
            title="Excluir comentário"
            aria-label="Excluir comentário"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-1">
              <path d="M3 6h18"></path>
              <path d="M19 6l-1 14H6L5 6"></path>
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            Excluir
          </button>
        )}
      </div>
      <p className="whitespace-pre-wrap">{event.content}</p>
    </div>
  );
};

/**
 * Renderiza um evento de arquivo/documento na timeline
 */
export const renderFileEvent = (
  event: TimelineEvent, 
  isAdmin?: boolean,
  onDeleteFile?: (fileUrl: string, index: number) => void
) => {
  // Log detalhado do evento para depuração
  devLog.log('Rendering file event:', {
    id: event.id,
    type: event.type,
    fileUrl: event.fileUrl,
    fileName: event.fileName,
    content: event.content,
    user: event.user,
    userId: event.userId,
    uploadedByName: event.uploadedByName
  });

  // Verificar se é um evento de arquivo - condição mais restrita para diferenciar de comentários
  // Anteriormente estava marcando comentários com palavra "Documentos" como arquivos
  const isFileEvent = 
    // Tipo explícito de documento ou arquivo
    event.type === 'document' || event.type === 'file' ||
    // Tem uma URL de arquivo (indica upload real)
    !!event.fileUrl ||
    // Tem um nome de arquivo (indica upload real)
    !!event.fileName ||
    // Tem conteúdo específico de upload de documento
    (event.content && (
      // Frases específicas de arquivos criadas pelo sistema
      event.content.includes('foi adicionado ao projeto') ||
      // Formato específico do sistema para documentos
      event.content.match(/Documento "[^"]+" foi adicionado/) ||
      event.content.match(/Arquivo "[^"]+" foi adicionado/)
    ));
  
  // IMPORTANTE: Se for um comentário, NÃO tratar como arquivo
  // mesmo que contenha a palavra "Documentos" no conteúdo
  if (event.type === 'comment') {
    devLog.log('Is a comment, not a file event');
    return null;
  }
  
  if (!isFileEvent) {
    devLog.log('Not a file event, skipping render');
    return null;
  }
  
  // Determinar o nome do arquivo de várias fontes possíveis
  const fileName = event.fileName || 
    (event.content && event.content.match(/Documento "([^"]+)" foi adicionado/)?.[1]) ||
    (event.content && event.content.match(/Arquivo "([^"]+)" foi adicionado/)?.[1]) ||
    (event.fileUrl && decodeURIComponent(event.fileUrl.split('/').pop() || '')) ||
    'Arquivo';
  
  // Log do nome do arquivo encontrado
  devLog.log('Found file name:', fileName);
  
  // Determinar o nome do usuário que adicionou o arquivo
  // Nunca permitir que apareça "Sistema" ou valores genéricos para documentos
  let uploadedByUser;
  
  // Log detalhado de todos os campos disponíveis para tentar encontrar o nome real
  devLog.log('CARD DOCUMENTO - Detalhes reais disponíveis:', {
    id: event.id,
    uploadedByName: event.uploadedByName,
    uploadedByRole: event.uploadedByRole,
    user: event.user,
    clientName: event.clientName,
    userId: event.userId,
    userType: event.userType
  });
  
  // CORREÇÃO FINAL: Prioridade absoluta para uploadedByName
  // Isso garante que o nome do administrador será exibido corretamente
  if (event.uploadedByName) {
    uploadedByUser = event.uploadedByName;
    devLog.log('Usando uploadedByName (MAIOR PRIORIDADE):', uploadedByUser);
  } 
  // Verificar o campo user como segunda opção
  else if (event.user) {
    uploadedByUser = event.user;
    devLog.log('Usando user (SEGUNDA PRIORIDADE):', uploadedByUser);
  }
  // Verificar o campo clientName como terceira opção
  else if (event.clientName) {
    uploadedByUser = event.clientName;
    devLog.log('Usando clientName (TERCEIRA PRIORIDADE):', uploadedByUser);
  }
  // Em último caso, usar 'Administrador' ou 'Sistema'
  else {
    uploadedByUser = 'Administrador';
    devLog.log('Usando valor padrão:', uploadedByUser);
  }
  
  // Log final para depuração 
  devLog.log('Final uploaded by user:', uploadedByUser);
  
  devLog.log('DEBUG-NOME:', {
    id: event.id,
    clientName: event.clientName,
    uploadedByName: event.uploadedByName,
    user: event.user,
    userType: event.userType
  });
  
  // Verificar se o arquivo tem uma URL válida para exclusão
  const canDelete = isAdmin && onDeleteFile && event.fileUrl;
  
  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border-l-4 border-blue-500">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center">
          <span className="text-blue-600 dark:text-blue-400 mr-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </span>
          <p className="font-medium text-gray-900 dark:text-gray-100">
            {event.type === 'document' ? 'Documento Adicionado' : 'Arquivo Adicionado'}
          </p>
        </div>
        
        {canDelete && (
          <button
            onClick={() => onDeleteFile(event.fileUrl, -1)}
            className="flex items-center text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-xs"
            title="Excluir documento"
            aria-label="Excluir documento"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-1">
              <path d="M3 6h18"></path>
              <path d="M19 6l-1 14H6L5 6"></path>
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            Excluir
          </button>
        )}
      </div>
      
      <p className="text-gray-700 dark:text-gray-300">
        {event.content || `${event.type === 'document' ? 'Documento' : 'Arquivo'} "${fileName}" foi adicionado ao projeto.`}
      </p>
      
      {event.fileUrl && (
        <a 
          href={event.fileUrl} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="inline-flex items-center mt-2 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-1">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Baixar {fileName}
        </a>
      )}
      
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        <span className="mr-2">
          Adicionado por: <span className={event.userType === 'client' ? 'text-blue-600 dark:text-blue-400' : ''}>
            {/* Para arquivos, priorizar uploadedByName, depois fullName, depois user */}
            {(() => {
              const displayName = event.uploadedByName || event.fullName || event.user || 'Usuário';
              // Se ainda for "Sistema" ou "system", trocar por "Administrador"
              return (displayName === 'Sistema' || displayName === 'system') ? 'Administrador' : displayName;
            })()}
          </span>
        </span>
        <span>
          {new Date(event.timestamp).toLocaleString('pt-BR')}
        </span>
      </div>
    </div>
  );
};

/**
 * Renderiza um evento genérico na timeline
 */
/**
 * Renderiza um evento de responsabilidade na timeline
 */
export const renderResponsibilityEvent = (event: TimelineEvent) => {
  return (
    <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-md border-l-4 border-green-500">
      <div className="flex items-center mb-2">
        <span className="text-green-600 dark:text-green-400 mr-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        </span>
        <p className="font-medium text-gray-900 dark:text-gray-100">
          {event.fullName || event.user || 'Usuário'} - Responsabilidade Assumida
        </p>
      </div>
      
      <p className="text-gray-700 dark:text-gray-300">
        {event.content || 'Responsabilidade assumida pelo projeto'}
      </p>
      
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        {new Date(event.timestamp).toLocaleString('pt-BR')}
      </div>
    </div>
  );
};

export const renderGenericEvent = (event: TimelineEvent) => {
  return (
    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
      <p className="whitespace-pre-wrap">{event.content || 'Nenhum conteúdo'}</p>
    </div>
  );
};

/**
 * Obtém o conteúdo renderizado para o evento de timeline
 */
export const getEventContent = (
  event: TimelineEvent,
  isAdmin?: boolean,
  currentUserId?: string,
  onDeleteComment?: (commentId: string) => void,
  onDeleteFile?: (fileUrl: string, index: number) => void
) => {
  // Renderizar eventos de status
  if (event.type === 'status' || event.isStatusChange || 
     (event.content && event.content.includes('Status alterado de'))) {
    return renderStatusChangeEvent(event);
  }
  
  // Renderizar eventos de checklist
  if (event.type === 'checklist' || 
     (event.userId === 'system' && event.content && event.content.includes('Checklist de Documentos Necessários'))) {
    return renderChecklistEvent(event);
  }
  
  // Renderizar eventos de comentário
  if (event.type === 'comment') {
    return renderCommentEvent(event, isAdmin, currentUserId, onDeleteComment);
  }
  
  // Renderizar eventos de responsabilidade
  if (event.type === 'responsibility') {
    return renderResponsibilityEvent(event);
  }
  
  // Renderizar eventos de arquivo
  const isFileEvent = event.type === 'document' || 
                     event.type === 'file' || 
                     !!event.fileUrl || 
                     !!event.fileName;
  
  if (isFileEvent) {
    return renderFileEvent(event, isAdmin, onDeleteFile);
  }
  
  // Fallback para outros tipos de eventos
  return renderGenericEvent(event);
};

/**
 * Determina o ícone a ser usado com base no tipo de evento
 */
export const getEventIcon = (event: TimelineEvent) => {
  // Verificar se é um evento de mudança de status
  const isStatusChangeEvent = event.type === 'status' || 
                            event.isStatusChange || 
                            (event.content && event.content.includes('Status alterado de')) ||
                            (event.data && (event.data.oldStatus || event.data.newStatus));
  
  // Verificar se é um evento de arquivo/documento
  const isFileEvent = event.type === 'document' || 
                     event.type === 'file' || 
                     !!event.fileUrl ||
                     (event.content && event.content.includes('Documento'));
  
  // Log do tipo de evento para o ícone
  devLog.log('Getting icon for event:', {
    id: event.id,
    type: event.type,
    isStatusChange: isStatusChangeEvent,
    isFile: isFileEvent,
    userId: event.userId
  });
  
  if (isFileEvent) {
    return (
      <span className="text-blue-600 dark:text-blue-400 h-6 w-6 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      </span>
    );
  }
  
  if (isStatusChangeEvent) {
    return (
      <span className="text-yellow-600 dark:text-yellow-400 h-6 w-6 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12 8v4"></path>
          <path d="M12 16h.01"></path>
        </svg>
      </span>
    );
  }
  
  if (event.userId === 'system') {
    return (
      <span className="text-blue-600 dark:text-blue-400 h-6 w-6 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
        </svg>
      </span>
    );
  }
  
  if (event.type === 'comment') {
    return (
      <span className="text-gray-600 dark:text-gray-400 h-6 w-6 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </span>
    );
  }
  
  if (event.type === 'responsibility') {
    return (
      <span className="text-green-600 dark:text-green-400 h-6 w-6 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      </span>
    );
  }
  
  // Ícone padrão para outros tipos de eventos
  return (
    <span className="text-gray-600 dark:text-gray-400 h-6 w-6 flex items-center justify-center">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="16"></line>
        <line x1="8" y1="12" x2="16" y2="12"></line>
      </svg>
    </span>
  );
};

/**
 * Determina a classe de cor de fundo com base no tipo de evento
 */
export const getEventBgColorClass = (event: TimelineEvent) => {
  // Verificar se é um evento de mudança de status
  const isStatusChangeEvent = event.type === 'status' || 
                            event.isStatusChange || 
                            (event.content && event.content.includes('Status alterado de')) ||
                            (event.data && (event.data.oldStatus || event.data.newStatus));
  
  // Verificar se é um evento de arquivo/documento
  const isFileEvent = event.type === 'document' || 
                     event.type === 'file' || 
                     !!event.fileUrl ||
                     (event.content && event.content.includes('Documento'));
  
  // Log do tipo de evento para a cor de fundo
  devLog.log('Getting background color for event:', {
    id: event.id,
    type: event.type,
    isStatusChange: isStatusChangeEvent,
    isFile: isFileEvent,
    userId: event.userId
  });
  
  if (isStatusChangeEvent) {
    return 'bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500';
  }
  
  if (isFileEvent) {
    return 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500';
  }
  
  if (event.userId === 'system') {
    return 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500';
  }
  
  if (event.type === 'comment') {
    return 'bg-gray-50 dark:bg-gray-800 border-l-4 border-gray-500';
  }
  
  if (event.type === 'responsibility') {
    return 'bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500';
  }
  
  // Cor de fundo padrão para outros tipos de eventos
  return 'bg-gray-50 dark:bg-gray-800';
};
