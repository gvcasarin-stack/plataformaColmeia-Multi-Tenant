// ✅ SUPABASE - TEMPORARIAMENTE DESABILITADO: Código Firebase migrado
// Este arquivo precisa ser migrado para usar API routes ou serviço Supabase
// Importações para Firebase e Next.js
// import { doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
// import { db } from '@/lib/firebase/config';
import { revalidatePath } from 'next/cache';
import { devLog } from "@/lib/utils/productionLogger";
import { Project } from '@/types/project';

export async function deleteCommentAction(
  projectId: string,
  commentId: string,
  user: { uid: string; email: string | null; role?: string }
) {
  devLog.log('[deleteCommentAction] [SUPABASE] Função temporariamente desabilitada durante migração');
  
  // ✅ SUPABASE - TODO: Implementar usando API routes ou serviço Supabase
  return { 
    error: 'Funcionalidade temporariamente desabilitada durante migração para Supabase. Use o botão de recarregar para ver comentários atualizados.' 
  };
  
  /* 
  // ✅ SUPABASE - CÓDIGO ORIGINAL COMENTADO PARA MIGRAÇÃO
  devLog.log('[deleteCommentAction] Iniciando', { projectId, commentId, userEmail: user.email });

  try {
    // Validação básica
    if (!projectId || !commentId || !user?.uid) {
      devLog.error('[deleteCommentAction] Dados inválidos:', { projectId, commentId, user });
      return { error: 'Dados incompletos para deletar o comentário' };
    }

    // Limpar o commentId, removendo qualquer prefixo 'comment-' se existir
    let cleanCommentId = commentId;
    if (commentId.startsWith('comment-')) {
      cleanCommentId = commentId.replace('comment-', '');
    }

    // Obter o projeto
    const projectRef = doc(db, 'projects', projectId);
    const projectSnap = await getDoc(projectRef);

    if (!projectSnap.exists()) {
      devLog.error('[deleteCommentAction] Projeto não encontrado:', projectId);
      return { error: 'Projeto não encontrado' };
    }

    const projectData = projectSnap.data() as Project;

    // Verificar permissões explicitamente
    const isAdmin = user.role === 'admin' || user.role === 'superadmin';
    const isOwner = projectData.ownerId === user.uid;
    const isClient = projectData.clientId === user.uid;
    const canDelete = isAdmin || isOwner || isClient;

    if (!canDelete) {
      devLog.error('[deleteCommentAction] Permissão negada:', { userRole: user.role, userId: user.uid });
      return { error: 'Você não tem permissão para excluir este comentário' };
    }

    // Obter comentários existentes
    const comments = projectData.comments || [];
    const timelineEvents = projectData.timelineEvents || [];

    // Encontrar o comentário a ser excluído - verificando tanto com quanto sem prefixo
    const commentToDelete = comments.find(c => 
      c.id === cleanCommentId || c.id === commentId || c.id === `comment-${cleanCommentId}`
    );

    if (!commentToDelete) {
      devLog.warn('[deleteCommentAction] Comentário não encontrado no array de comentários:', commentId);
      // Não retornar erro aqui, pois pode estar apenas na timeline
    }

    // Verificar se o usuário é o autor do comentário ou tem permissões adequadas
    if (commentToDelete && !isAdmin && commentToDelete.userId !== user.uid) {
      devLog.error('[deleteCommentAction] Usuário não é o autor do comentário:', { 
        commentAuthor: commentToDelete.userId, 
        requestUser: user.uid 
      });
      return { error: 'Você só pode excluir seus próprios comentários' };
    }

    // Filtrar comentários (remover o comentário a ser excluído)
    const updatedComments = comments.filter(c => 
      c.id !== cleanCommentId && c.id !== commentId && c.id !== `comment-${cleanCommentId}`
    );

    // Filtrar eventos da timeline
    const updatedTimelineEvents = timelineEvents.filter(event => {
      if (event.type !== 'comment') return true;
      
      return event.id !== cleanCommentId && 
             event.id !== commentId && 
             event.id !== `comment-${cleanCommentId}`;
    });

    try {
      // Usar transação para garantir a consistência
      await runTransaction(db, async (transaction) => {
        // Atualizar o documento do projeto
        transaction.update(projectRef, {
          comments: updatedComments,
          timelineEvents: updatedTimelineEvents,
          updatedAt: serverTimestamp()
        });
      });

      devLog.log('[deleteCommentAction] Comentário excluído com sucesso');

      // Tentar revalidar o caminho, mas não falhar se der erro
      try {
        // Usar setTimeout para evitar conflitos com a resposta
        setTimeout(() => {
          try {
            revalidatePath(`/projetos/${projectId}`);
            revalidatePath(`/admin/projetos/${projectId}`);
          } catch (revalidateError) {
            devLog.error('[deleteCommentAction] Erro na revalidação (não crítico):', revalidateError);
            // Não falhar por causa de erro na revalidação
          }
        }, 100);
      } catch (revalidateOuterError) {
        devLog.error('[deleteCommentAction] Erro externo na revalidação (ignorado):', revalidateOuterError);
      }

      // Obter o projeto atualizado
      const updatedProjectSnap = await getDoc(projectRef);
      if (!updatedProjectSnap.exists()) {
        devLog.warn('[deleteCommentAction] Não foi possível obter o projeto atualizado');
        return { 
          success: true,
          message: 'Comentário excluído com sucesso, mas não foi possível obter o projeto atualizado'
        };
      }

      // Retornar o projeto atualizado
      return { 
        success: true, 
        data: { 
          ...updatedProjectSnap.data() as Project,
          id: projectId
        }
      };
    } catch (dbError) {
      devLog.error('[deleteCommentAction] Erro ao atualizar no Firestore:', dbError);
      return { error: 'Erro ao salvar as alterações no banco de dados' };
    }
  } catch (error) {
    devLog.error('[deleteCommentAction] Erro:', error);
    
    if (error instanceof Error) {
      devLog.error('[deleteCommentAction] Detalhes do erro:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
    }
    
    return { error: 'Erro inesperado ao excluir o comentário' };
  }
  */
} 