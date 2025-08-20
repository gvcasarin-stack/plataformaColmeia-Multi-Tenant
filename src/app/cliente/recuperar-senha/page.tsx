"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import { RecoverPasswordForm } from "@/components/shared/recover-password-form";

export default function RecoverPasswordPage() {
  const { sendPasswordResetEmail } = useAuth();

  // ✅ SIMPLICIDADE EXTREMA: Apenas renderiza o formulário
  // Se já está logado, o layout vai redirecionar
  const handlePasswordReset = async (email: string) => {
    const { error } = await sendPasswordResetEmail(email);
    if (error) {
      throw error;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Recuperar Senha
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Digite seu email para receber um link de recuperação
            </p>
          </div>
          
          <RecoverPasswordForm 
            onSubmit={handlePasswordReset}
            loginUrl="/cliente/login"
            variant="client"
          />
        </div>
      </div>
    </div>
  );
} 