import { useState, useEffect, useCallback } from 'react';
import { getClients } from '@/lib/services/clientService.supabase';
import { toast } from '@/components/ui/use-toast';
import { devLog } from '@/lib/utils/productionLogger';

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  isCompany: boolean;
  razaoSocial?: string;
  cnpj?: string;
  cpf?: string;
  createdAt: string;
  updatedAt: string;
  isBlocked?: boolean;
  blockedReason?: string;
  blockedAt?: string;
  blockedBy?: string;
}

interface UseClientsReturn {
  clients: Client[];
  loading: boolean;
  error: string | null;
  refreshClients: () => Promise<void>;
  updateClientOptimistic: (clientId: string, updates: Partial<Client>) => void;
  revertOptimisticUpdate: (clientId: string) => void;
}

export function useClients(): UseClientsReturn {
  const [clients, setClients] = useState<Client[]>([]);
  const [originalClients, setOriginalClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    try {
      devLog.log('[useClients] Iniciando busca de clientes...');
      
      const clientsList = await getClients();
      devLog.log('[useClients] Clientes brutos do Supabase:', clientsList);
      
      // Format the client data
      const formattedClients = clientsList.map(client => ({
        id: client.id,
        name: client.full_name || client.name || '',
        email: client.email || '',
        phone: client.phone || '',
        isCompany: client.is_company || false,
        razaoSocial: client.company_name || '',
        cnpj: client.cnpj || '',
        cpf: client.cpf || '',
        createdAt: client.created_at 
          ? new Date(client.created_at).toISOString()
          : new Date().toISOString(),
        updatedAt: client.updated_at 
          ? new Date(client.updated_at).toISOString()
          : new Date().toISOString(),
        // Campos de bloqueio
        isBlocked: client.isBlocked || false,
        blockedReason: client.blockedReason,
        blockedAt: client.blockedAt,
        blockedBy: client.blockedBy,
      }));
      
      devLog.log('[useClients] Clientes formatados:', formattedClients);
      setClients(formattedClients);
      setOriginalClients(formattedClients); // Backup para rollback
      setError(null);
      
    } catch (err: any) {
      devLog.error('[useClients] Erro ao buscar clientes:', err);
      setError(err.message || 'Erro ao carregar clientes');
      toast({
        title: "Erro ao carregar clientes",
        description: "Não foi possível carregar a lista de clientes. Tente recarregar a página.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshClients = useCallback(async () => {
    setLoading(true);
    await fetchClients();
  }, [fetchClients]);

  // Atualização otimista - atualiza UI imediatamente
  const updateClientOptimistic = useCallback((clientId: string, updates: Partial<Client>) => {
    setClients(prevClients => 
      prevClients.map(client => 
        client.id === clientId 
          ? { ...client, ...updates }
          : client
      )
    );
  }, []);

  // Reverte atualização otimista em caso de erro
  const revertOptimisticUpdate = useCallback((clientId: string) => {
    const originalClient = originalClients.find(c => c.id === clientId);
    if (originalClient) {
      setClients(prevClients => 
        prevClients.map(client => 
          client.id === clientId ? originalClient : client
        )
      );
    }
  }, [originalClients]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  return {
    clients,
    loading,
    error,
    refreshClients,
    updateClientOptimistic,
    revertOptimisticUpdate,
  };
} 