import { doc, getDoc, updateDoc, arrayUnion, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { devLog } from "@/lib/utils/productionLogger";
import { getAuth } from 'firebase/auth';

export async function getUserData(userId: string) {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return null;
    }
    return userDoc.data();
  } catch (error) {
    devLog.error('Error fetching user data:', error);
    return null;
  }
}

export async function setUserCustomClaims(
  uid: string,
  role: string,
  userType: string
) {
  try {
    const response = await fetch('/api/set-custom-claims', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uid,
        role,
        userType
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to set custom claims');
    }

    const result = await response.json();
    devLog.log('Custom claims set successfully:', result);
    
    // Force token refresh on the client
    const auth = getAuth();
    await auth.currentUser?.getIdToken(true);
    
    return result;
  } catch (error) {
    devLog.error('Error setting custom claims:', error);
    throw error;
  }
}

// Helper function to get current user claims
export async function getCurrentUserClaims() {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('No user logged in');
    }
    
    const token = await user.getIdTokenResult();
    return token.claims;
  } catch (error) {
    devLog.error('Error getting user claims:', error);
    throw error;
  }
}

/**
 * Função para marcar um projeto como visualizado pelo usuário
 * @param userId ID do usuário
 * @param projectId ID do projeto visualizado
 * @returns booleano indicando sucesso da operação
 */
export async function markProjectAsViewed(userId: string, projectId: string): Promise<boolean> {
  try {
    // Referência ao documento do usuário
    const userRef = doc(db, 'users', userId);
    
    // Verifica se o documento do usuário existe
    const userDoc = await getDoc(userRef);
    
    // Timestamp atual
    const now = Date.now();
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const viewedProjectsMap = userData.viewedProjectsMap || {};
      
      // Atualiza o mapa de projetos visualizados com o timestamp atual
      viewedProjectsMap[projectId] = now;
      
      // Atualiza o documento com o novo mapa e mantém o array existente para compatibilidade
      await updateDoc(userRef, {
        viewedProjects: arrayUnion(projectId),
        viewedProjectsMap: viewedProjectsMap,
        updatedAt: new Date().toISOString()
      });
    } else {
      // Se o documento não existir, cria com a informação
      const viewedProjectsMap = {};
      viewedProjectsMap[projectId] = now;
      
      await setDoc(userRef, {
        viewedProjects: [projectId],
        viewedProjectsMap: viewedProjectsMap,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    
    return true;
  } catch (error) {
    devLog.error('Erro ao marcar projeto como visualizado:', error);
    return false;
  }
}

/**
 * Função para obter a lista de projetos visualizados pelo usuário com timestamps
 * @param userId ID do usuário
 * @returns Mapa de IDs de projetos com timestamps de visualização ou null em caso de erro
 */
export async function getViewedProjects(userId: string): Promise<{ ids: string[], timestamps: Record<string, number> } | null> {
  try {
    // Obtém os dados do usuário
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      return { ids: [], timestamps: {} };
    }
    
    const userData = userDoc.data();
    const viewedProjects = userData.viewedProjects || [];
    const viewedProjectsMap = userData.viewedProjectsMap || {};
    
    return { 
      ids: viewedProjects,
      timestamps: viewedProjectsMap
    };
  } catch (error) {
    devLog.error('Erro ao obter projetos visualizados:', error);
    return null;
  }
} 