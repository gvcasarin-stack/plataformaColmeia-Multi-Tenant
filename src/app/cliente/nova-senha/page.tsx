"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { devLog } from "@/lib/utils/productionLogger";
import toast from "react-hot-toast";

function NovaSenhaContent() {
  const router = useRouter();
  const { session, user, isLoading, authState } = useAuth();
  const searchParams = useSearchParams();
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // ✅ CORREÇÃO: Verificar múltiplos parâmetros de recuperação
  const recoveryCode = searchParams.get('recovery_code');
  const accessToken = searchParams.get('access_token');
  const refreshToken = searchParams.get('refresh_token');
  const type = searchParams.get('type');
  const tokenHash = searchParams.get('token_hash');
  
  // ✅ CORREÇÃO: Aguardar o AuthContext processar antes de validar
  // Se ainda está carregando, mostrar loading
  if (isLoading || authState === 'initializing' || authState === 'loading-profile') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Processando...
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Verificando link de recuperação de senha
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ✅ CORREÇÃO: Validação mais robusta - verificar se há sessão OU parâmetros de recuperação
  const hasRecoveryParameters = recoveryCode || accessToken || (type === 'recovery') || tokenHash;
  const hasValidSession = session && user;
  
  devLog.log('[NovaSenha] Validação de parâmetros:', {
    hasRecoveryParameters,
    hasValidSession,
    recoveryCode: !!recoveryCode,
    accessToken: !!accessToken,
    type,
    tokenHash: !!tokenHash,
    authState,
    isLoading
  });

  // ✅ CORREÇÃO: Só mostrar "Link Inválido" se NÃO há sessão E NÃO há parâmetros de recuperação
  if (!hasValidSession && !hasRecoveryParameters) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            <h1 className="text-xl font-bold text-red-600 mb-4">Link Inválido</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Este link de recuperação é inválido ou expirou.
            </p>
            <button
              onClick={() => router.push('/cliente/recuperar-senha')}
              className="w-full bg-orange-500 text-white py-3 rounded-lg hover:bg-orange-600 transition-colors"
            >
              Solicitar Novo Link
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validações básicas
    if (!password || !confirmPassword) {
      setError("Todos os campos são obrigatórios.");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setIsUpdating(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        throw updateError;
      }

      setSuccess(true);
      toast.success("Senha atualizada com sucesso!");
      
      // Redirect após sucesso
      setTimeout(() => {
        router.push('/cliente/painel');
      }, 2000);

    } catch (err: any) {
      devLog.error('Error updating password:', err);
      setError(err.message || "Erro ao atualizar senha. Tente novamente.");
    } finally {
      setIsUpdating(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Senha Atualizada!
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Redirecionando para o painel...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Nova Senha
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Digite sua nova senha abaixo
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nova Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Digite sua nova senha"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Confirmar Senha
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Confirme sua nova senha"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isUpdating}
              className="w-full bg-orange-500 text-white py-3 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdating ? 'Atualizando...' : 'Atualizar Senha'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function NovaSenhaPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <NovaSenhaContent />
    </Suspense>
  );
}
