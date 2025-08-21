"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import { RegisterForm } from "@/components/client/register-form";

export default function ClientRegisterPage() {
  const { user } = useAuth();

  // ✅ SIMPLICIDADE EXTREMA: Apenas renderiza o formulário
  // Se já está logado, o layout vai redirecionar
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Criar Conta
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Cadastre-se para acessar a área do cliente
            </p>
          </div>
          
          <RegisterForm />
        </div>
      </div>
    </div>
  );
}
