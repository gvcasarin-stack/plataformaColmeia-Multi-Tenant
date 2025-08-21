"use client";

import { Button } from "@/components/ui/button";
import { ReloadIcon } from "@radix-ui/react-icons";
import { useRouter } from "next/navigation";

interface TimeoutErrorProps {
  message?: string;
  subMessage?: string;
}

export function TimeoutError({
  message = "Ops! Algo demorou mais que o esperado",
  subMessage = "Estamos com problemas para carregar os dados necessários."
}: TimeoutErrorProps) {
  const router = useRouter();

  const handleRetry = () => {
    // Recarregar a página atual
    window.location.reload();
  };

  const handleGoHome = () => {
    // Navegar para a página inicial
    router.push('/');
  };

  return (
    <div className="w-full flex flex-col items-center justify-center p-8 text-center min-h-[300px] rounded-lg border border-gray-200 bg-white/50 shadow-sm">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className="h-8 w-8 text-red-500"
        >
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
      <h2 className="text-2xl font-bold mb-2 text-gray-900">{message}</h2>
      <p className="text-gray-600 mb-6 max-w-md">{subMessage}</p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Button onClick={handleRetry} variant="default" className="gap-2">
          <ReloadIcon className="h-4 w-4" />
          Tentar novamente
        </Button>
        <Button 
          onClick={handleGoHome}
          variant="outline"
        >
          Voltar ao início
        </Button>
      </div>
    </div>
  );
}
