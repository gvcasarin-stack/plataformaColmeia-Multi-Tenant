import { 
  collection, 
  addDoc,
  setDoc, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where,
  serverTimestamp
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { devLog } from "@/lib/utils/productionLogger";
import { db, auth } from '@/lib/firebase';

// Cache mechanism to avoid excessive Firebase API calls
const CACHE_EXPIRY_TIME = 2 * 60 * 1000; // 2 minutes
let clientRequestsCache = {
  data: [] as ClientRequest[],
  timestamp: 0,
  refreshing: false
};

// Token refresh tracking to prevent excessive token refreshes
let lastTokenRefresh = 0;
const TOKEN_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

export interface ClientRequest {
  id: string;
  userId?: string;
  email: string;
  name: string;
  phone: string;
  password?: string;
  status?: 'pending' | 'approved' | 'rejected';
  isCompany: boolean;
  razaoSocial?: string;
  nomeCompleto?: string;
  cnpj?: string;
  cpf?: string;
  createdAt: any;
  updatedAt: any;
  rejectionReason?: string;
}

const clientRequestsCollection = collection(db, 'clientRequests');

export async function createClientRequest(data: Omit<ClientRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>) {
  let userCredential = null;

  try {
    devLog.log('[ClientRequestService] Starting registration process:', {
      email: data.email,
      name: data.name,
      isCompany: data.isCompany
    });

    if (!data.password || data.password.length < 6) {
      throw new Error('A senha deve ter pelo menos 6 caracteres.');
    }

    // Validate company data if isCompany is true
    if (data.isCompany) {
      if (!data.razaoSocial) {
        throw new Error('Razão Social é obrigatório para cadastros empresariais.');
      }
      if (!data.cnpj) {
        throw new Error('CNPJ é obrigatório para cadastros empresariais.');
      }
    }

    // Validate CPF if individual registration
    if (!data.isCompany && !data.cpf) {
      throw new Error('CPF é obrigatório para cadastros de pessoa física.');
    }

    // 1. Create Firebase Auth user
    userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
    devLog.log('[ClientRequestService] Created auth user:', userCredential.user.uid);

    // 2. Update user profile with name and metadata
    await updateProfile(userCredential.user, {
      displayName: data.name
    });
    devLog.log('[ClientRequestService] Updated user profile');

    // Force token refresh to ensure we have the latest claims
    await userCredential.user.getIdToken(true);

    // 3. Create user document in Firestore with pending approval status
    const userId = userCredential.user.uid;
    
    try {
      // Create user document with pendingApproval flag
      await setDoc(doc(db, 'users', userId), {
        id: userId,
        email: data.email,
        name: data.name,
        role: 'user',
        phone: data.phone,
        isCompany: data.isCompany,
        razaoSocial: data.isCompany ? data.razaoSocial : null,
        nomeCompleto: !data.isCompany ? data.nomeCompleto : null,
        cnpj: data.isCompany ? data.cnpj : null,
        cpf: !data.isCompany ? data.cpf : null,
        pendingApproval: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // Configurações padrão para notificações por e-mail
        emailNotificationStatus: true,
        emailNotificationDocuments: true,
        emailNotificationComments: true,
        emailNotificacaoStatus: true,
        emailNotificacaoDocumentos: true,
        emailNotificacaoComentarios: true
      });
      devLog.log('[ClientRequestService] Created user document with pendingApproval flag');

      // 5. Create notification for admins about new registration
      try {
        // Get all admin users
        const adminQuery = query(collection(db, 'users'), where('role', 'in', ['admin', 'superadmin']));
        const adminSnapshot = await getDocs(adminQuery);
        
        if (!adminSnapshot.empty) {
          // Create notifications for each admin
          const batch = adminSnapshot.docs.map(async (adminDoc) => {
            const adminId = adminDoc.id;
            
            await addDoc(collection(db, 'notifications'), {
              type: 'new_client_registration',
              title: 'Novo Cadastro de Cliente',
              message: `${data.name} solicitou cadastro na plataforma.`,
              userId: adminId, // The admin who will receive this notification
              adminId: 'system',
              read: false,
              createdAt: serverTimestamp(),
              metadata: {
                clientId: userId,
                clientName: data.name,
                isCompany: data.isCompany,
                companyName: data.isCompany ? data.razaoSocial : null
              }
            });
          });
          
          await Promise.all(batch);
          devLog.log('[ClientRequestService] Created admin notifications');
        }
        
        // Also create a special notification for all admins
        await addDoc(collection(db, 'notifications'), {
          type: 'new_client_registration',
          title: 'Novo Cadastro de Cliente',
          message: `${data.name} solicitou cadastro na plataforma.`,
          userId: 'all_admins', // Special marker for admin-visible notifications
          projectId: 'system',
          projectNumber: 'N/A',
          read: false,
          createdAt: new Date().toISOString(),
          data: {
            clientId: userId,
            clientName: data.name,
            isCompany: data.isCompany,
            companyName: data.isCompany ? data.razaoSocial : null
          }
        });
        devLog.log('[ClientRequestService] Created global admin notification for client registration');
        
      } catch (notificationError) {
        devLog.error('[ClientRequestService] Error creating notifications:', notificationError);
        // Non-blocking error, continue with registration
      }

      return {
        success: true,
        userId,
        message: 'Cadastro realizado com sucesso! Aguarde a aprovação do administrador.'
      };
    } catch (firestoreError) {
      devLog.error('[ClientRequestService] Error creating user document:', firestoreError);
      
      // If we fail to create the user document, delete the auth user
      try {
        await userCredential.user.delete();
        devLog.log('[ClientRequestService] Deleted auth user after Firestore error');
      } catch (deleteError) {
        devLog.error('[ClientRequestService] Error deleting auth user after Firestore error:', deleteError);
      }
      
      throw firestoreError;
    }
  } catch (error: any) {
    devLog.error('[ClientRequestService] Error in createClientRequest:', error);
    
    // If we created a user but failed later, try to clean up
    if (userCredential?.user) {
      try {
        await userCredential.user.delete();
        devLog.log('[ClientRequestService] Cleaned up auth user after error');
      } catch (cleanupError) {
        devLog.error('[ClientRequestService] Error cleaning up auth user:', cleanupError);
      }
    }
    
    throw error;
  }
}

export async function getPendingClientRequests(): Promise<ClientRequest[]> {
  try {
    devLog.log('[ClientRequestService] Fetching pending client requests');
    
    // Check if we have valid cached data
    const now = Date.now();
    if (clientRequestsCache.timestamp > 0 && now - clientRequestsCache.timestamp < CACHE_EXPIRY_TIME) {
      devLog.log('[ClientRequestService] Returning cached client requests');
      return clientRequestsCache.data;
    }
    
    // If another request is already fetching data, wait for it to complete
    if (clientRequestsCache.refreshing) {
      devLog.log('[ClientRequestService] Another request is already fetching data, waiting...');
      
      // Wait for up to 3 seconds for the other request to complete
      for (let i = 0; i < 30; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // If cache was updated while waiting, return the cached data
        if (clientRequestsCache.timestamp > 0 && now - clientRequestsCache.timestamp < CACHE_EXPIRY_TIME) {
          devLog.log('[ClientRequestService] Cache was updated while waiting, returning cached data');
          return clientRequestsCache.data;
        }
      }
    }
    
    // Mark as refreshing to prevent parallel requests
    clientRequestsCache.refreshing = true;
    
    try {
      // Check if user is authenticated
      const currentUser = auth.currentUser;
      if (!currentUser) {
        devLog.error('[ClientRequestService] No authenticated user');
        throw new Error('Você precisa estar autenticado para acessar esta funcionalidade.');
      }
      
      // Only refresh token if enough time has passed since last refresh
      if (now - lastTokenRefresh >= TOKEN_REFRESH_INTERVAL) {
        devLog.log('[ClientRequestService] Refreshing token (limited by time interval)');
        await currentUser.getIdToken(true);
        lastTokenRefresh = now;
      } else {
        devLog.log('[ClientRequestService] Using existing token (refresh skipped due to rate limiting)');
      }
      
      const idToken = await currentUser.getIdToken();
      
      try {
        // Call the API to get pending client requests
        const response = await fetch('/api/admin/client-requests', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          // Add a cache-busting parameter to avoid browser cache
          cache: 'no-store'
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          devLog.error('[ClientRequestService] Error fetching client requests:', errorData);
          throw new Error(errorData.error || 'Erro ao buscar solicitações de clientes');
        }
        
        const data = await response.json();
        devLog.log('[ClientRequestService] Fetched client requests:', data);
        
        // Update cache
        clientRequestsCache.data = data.clientRequests || [];
        clientRequestsCache.timestamp = now;
        
        return clientRequestsCache.data;
      } catch (fetchError) {
        devLog.error('[ClientRequestService] Fetch error in getPendingClientRequests:', fetchError);
        throw new Error('Erro ao comunicar com o servidor. Por favor, tente novamente.');
      }
    } finally {
      // Mark as no longer refreshing
      clientRequestsCache.refreshing = false;
    }
  } catch (error) {
    devLog.error('[ClientRequestService] Error in getPendingClientRequests:', error);
    
    // If there's cached data, return it even if it's expired in case of error
    if (clientRequestsCache.data.length > 0) {
      devLog.log('[ClientRequestService] Returning stale cached data due to error');
      return clientRequestsCache.data;
    }
    
    throw error;
  }
}

export async function approveClientRequest(requestId: string): Promise<void> {
  try {
    devLog.log('[ClientRequestService] Approving client request:', requestId);
    
    // Check if user is authenticated
    const currentUser = auth.currentUser;
    if (!currentUser) {
      devLog.error('[ClientRequestService] No authenticated user');
      throw new Error('Você precisa estar autenticado para acessar esta funcionalidade.');
    }
    
    // Refresh token to ensure we have the latest claims
    await currentUser.getIdToken(true);
    const idToken = await currentUser.getIdToken();
    
    // Call the API to approve the client request
    const response = await fetch('/api/admin/client-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({
        requestId,
        action: 'approve'
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      devLog.error('[ClientRequestService] Error approving client request:', errorData);
      throw new Error(errorData.error || 'Erro ao aprovar solicitação de cliente');
    }
    
    devLog.log('[ClientRequestService] Client request approved successfully');
  } catch (error: any) {
    devLog.error('[ClientRequestService] Error in approveClientRequest:', error);
    throw error;
  }
}

export async function rejectClientRequest(requestId: string, reason?: string): Promise<void> {
  try {
    devLog.log('[ClientRequestService] Rejecting client request:', requestId);
    
    // Check if user is authenticated
    const currentUser = auth.currentUser;
    if (!currentUser) {
      devLog.error('[ClientRequestService] No authenticated user');
      throw new Error('Você precisa estar autenticado para acessar esta funcionalidade.');
    }
    
    // Refresh token to ensure we have the latest claims
    await currentUser.getIdToken(true);
    const idToken = await currentUser.getIdToken();
    
    // Call the API to reject the client request
    const response = await fetch('/api/admin/client-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({
        requestId,
        action: 'reject',
        reason
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      devLog.error('[ClientRequestService] Error rejecting client request:', errorData);
      throw new Error(errorData.error || 'Erro ao rejeitar solicitação de cliente');
    }
    
    devLog.log('[ClientRequestService] Client request rejected successfully');
  } catch (error: any) {
    devLog.error('[ClientRequestService] Error in rejectClientRequest:', error);
    throw error;
  }
}

export async function getClientRequestById(requestId: string) {
  try {
    const requestRef = doc(clientRequestsCollection, requestId);
    const request = await getDoc(requestRef);
    
    if (!request.exists()) {
      throw new Error('Client request not found');
    }

    return {
      id: requestId,
      ...request.data(),
      createdAt: request.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: request.data().updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
    } as ClientRequest;
  } catch (error) {
    devLog.error('[ClientRequest] Error getting request:', error);
    throw error;
  }
} 