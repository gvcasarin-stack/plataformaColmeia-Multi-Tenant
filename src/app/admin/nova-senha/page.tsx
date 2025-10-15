"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { Check, X } from "lucide-react";

const passwordRequirements = [
  { regex: /.{8,}/, message: "Pelo menos 8 caracteres" },
  { regex: /[A-Z]/, message: "Uma letra maiúscula" },
  { regex: /[a-z]/, message: "Uma letra minúscula" },
  { regex: /[0-9]/, message: "Um número" },
  { regex: /[^A-Za-z0-9]/, message: "Um caractere especial" },
];

function NovaSenhaContent() {
  const router = useRouter();
  const { session, isLoading } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true);
  const [passwordRequirementsMet, setPasswordRequirementsMet] = useState<boolean[]>(
    new Array(passwordRequirements.length).fill(false)
  );

  // Processar token do hash MANUALMENTE
  useEffect(() => {
    const processToken = async () => {
      const hash = window.location.hash;

      if (hash && hash.includes('access_token=')) {
        // Extrair parâmetros do hash
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          try {
            const supabase = createSupabaseBrowserClient();

            // Estabelecer sessão MANUALMENTE
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });

            if (error) {
              setError('Link inválido ou expirado. Solicite um novo link.');
            } else {
              // Limpar hash da URL
              window.history.replaceState(null, '', window.location.pathname);
            }
          } catch (err) {
            setError('Erro ao processar link de recuperação.');
          }
        }
      }

      setCheckingToken(false);
    };

    processToken();
  }, []);

  // Verificar requisitos da senha em tempo real
  useEffect(() => {
    const newRequirementsMet = passwordRequirements.map((req) =>
      req.regex.test(password)
    );
    setPasswordRequirementsMet(newRequirementsMet);
  }, [password]);

  // Loading
  if (isLoading || checkingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Sem sessão ou com erro
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <h1 className="text-xl font-bold text-red-600 mb-4">Link Inválido ou Expirado</h1>
            {error ? (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
                {error}
              </div>
            ) : (
              <p className="text-gray-600 mb-6">
                Solicite um novo link de recuperação.
              </p>
            )}
            <button
              onClick={() => router.push('/admin/login')}
              className="w-full bg-emerald-500 text-white py-3 rounded-lg hover:bg-emerald-600 mt-4"
            >
              Ir para Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password || !confirmPassword) {
      setError("Preencha todos os campos.");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    // Verificar se todos os requisitos foram atendidos
    if (!passwordRequirementsMet.every(met => met)) {
      setError("A senha não atende a todos os requisitos.");
      return;
    }

    setIsUpdating(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        // Traduzir mensagem de erro específica do Supabase
        if (updateError.message.includes('New password should be different')) {
          throw new Error('A nova senha deve ser diferente da senha anterior.');
        }
        throw updateError;
      }

      setSuccess(true);
      toast.success("Senha definida com sucesso!");

      // ✅ CORREÇÃO: Redirecionar para o domínio correto do tenant
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user?.id) {
          // Buscar tenant_id do usuário
          const { data: userData } = await supabase
            .from('users')
            .select('tenant_id')
            .eq('id', user.id)
            .single();

          if (userData?.tenant_id) {
            // Buscar slug da organização
            const { data: orgData } = await supabase
              .from('organizations')
              .select('slug')
              .eq('id', userData.tenant_id)
              .single();

            const slug = orgData?.slug;

            if (slug) {
              // Redirecionar para o domínio correto do tenant
              const tenantDomain = `https://${slug}.gerenciamentofotovoltaico.com.br/admin/painel`;
              setTimeout(() => {
                window.location.href = tenantDomain;
              }, 2000);
              return;
            }
          }
        }

        // Fallback: se não conseguir determinar o tenant, redirecionar para login
        setTimeout(() => router.push('/admin/login'), 2000);
      } catch (redirectError) {
        // Em caso de erro, redirecionar para login genérico
        setTimeout(() => router.push('/admin/login'), 2000);
      }
    } catch (err: any) {
      setError(err.message || "Erro ao definir senha.");
    } finally {
      setIsUpdating(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-green-600 text-5xl mb-4">✓</div>
          <h1 className="text-xl font-bold mb-2">Senha Definida!</h1>
          <p className="text-gray-600">Redirecionando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold text-center mb-8">Definir Senha</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                placeholder="Digite sua senha"
                required
              />

              {/* Requisitos da senha */}
              {password && (
                <div className="mt-2 space-y-1">
                  {passwordRequirements.map((req, index) => (
                    <div
                      key={index}
                      className={`flex items-center text-xs ${
                        passwordRequirementsMet[index]
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {passwordRequirementsMet[index] ? (
                        <Check className="w-3 h-3 mr-1" />
                      ) : (
                        <X className="w-3 h-3 mr-1" />
                      )}
                      {req.message}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirmar Senha
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                placeholder="Digite novamente"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isUpdating}
              className="w-full bg-emerald-500 text-white py-3 rounded-lg hover:bg-emerald-600 disabled:opacity-50"
            >
              {isUpdating ? 'Definindo...' : 'Definir Senha'}
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
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <NovaSenhaContent />
    </Suspense>
  );
}
