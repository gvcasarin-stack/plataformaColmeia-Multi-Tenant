"use client"

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import Link from "next/link";
import { resetPassword } from "@/lib/services/authService.supabase";
import { devLog } from "@/lib/utils/productionLogger";
import { X, Check } from "lucide-react";

export interface RecoverPasswordFormProps {
  /**
   * Função opcional para lidar com o envio do formulário. Se não fornecida, usará resetPassword por padrão.
   */
  onSubmit?: (email: string) => Promise<void>;
  /**
   * URL para onde voltar quando clicar no link "Voltar ao login"
   */
  loginUrl?: string;
  /**
   * URL para onde redirecionar após envio bem-sucedido
   */
  redirectUrl?: string;
  /**
   * Texto do botão
   */
  buttonText?: string;
  /**
   * Se deve mostrar o estado de sucesso ou redirecionar imediatamente
   */
  showSuccessState?: boolean;
  /**
   * Estilo variante para o componente
   */
  variant?: 'admin' | 'client';
}

export function RecoverPasswordForm({
  onSubmit,
  loginUrl = "/login",
  redirectUrl,
  buttonText = "Enviar email de recuperação",
  showSuccessState = true,
  variant = 'client'
}: RecoverPasswordFormProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação simples de email
    if (!email || !email.includes('@')) {
      setStatus("error");
      setErrorMessage("Por favor, insira um email válido");
      return;
    }
    
    setLoading(true);
    setStatus("idle");
    setErrorMessage("");
    
    try {
      // Usar a função onSubmit fornecida ou chamar resetPassword diretamente
      if (onSubmit) {
        await onSubmit(email);
      } else {
        await resetPassword(email);
      }
      
      setStatus("success");
      toast({
        title: "Email enviado",
        description: "Verifique sua caixa de entrada para redefinir sua senha.",
      });
      
      // Redirecionar ou mostrar estado de sucesso
      if (redirectUrl && !showSuccessState) {
        router.push(redirectUrl);
      } else if (!showSuccessState) {
        router.push(loginUrl);
      }
      // Se showSuccessState for true, aguardar antes de redirecionar
      else if (redirectUrl) {
        setTimeout(() => {
          router.push(redirectUrl);
        }, 5000);
      }
      
    } catch (error: any) {
      devLog.error("Erro na recuperação de senha:", error);
      setStatus("error");
      setErrorMessage(error.message || "Ocorreu um erro ao enviar o email de recuperação");
      
      toast({
        title: "Erro ao recuperar senha",
        description: error.message || "Ocorreu um erro ao enviar o email de recuperação",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-sm">
      {status === "success" && showSuccessState ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800">
          <div className="flex items-start">
            <Check className="h-5 w-5 text-green-500 mt-0.5 mr-3" />
            <div>
              <h5 className="font-medium mb-1">Email enviado com sucesso!</h5>
              <p className="text-sm text-green-700">
                Verifique sua caixa de entrada (e a pasta de spam) para encontrar o link de recuperação de senha. 
                Clique no link do email para redefinir sua senha diretamente pelo sistema seguro.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={status === "error" ? "border-red-300 focus:border-red-500" : ""}
            />
            
            {status === "error" && (
              <div className="flex items-center text-red-600 text-sm mt-1">
                <X className="h-4 w-4 mr-1" />
                <span>{errorMessage}</span>
              </div>
            )}
            
            <p className="text-xs text-gray-500 mt-1">
              Digite o email associado à sua conta para receber um link de recuperação de senha.
            </p>
          </div>
          
          <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700" disabled={loading}>
            {loading ? "Enviando..." : buttonText}
          </Button>
          
          <div className="text-center text-sm text-gray-600">
            Lembrou sua senha?{" "}
            <Link 
              href={loginUrl}
              className="font-medium text-orange-600 hover:text-orange-500"
            >
              Voltar ao login
            </Link>
          </div>
        </form>
      )}
    </div>
  );
} 