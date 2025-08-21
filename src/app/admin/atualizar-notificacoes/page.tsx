"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { devLog } from "@/lib/utils/productionLogger";
import { toast } from "@/components/ui/use-toast";

export default function UpdateNotificationsPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message?: string;
    stats?: {
      updated: number;
      skipped: number;
      total: number;
    };
    error?: string;
  } | null>(null);

  const handleUpdateNotifications = async () => {
    if (!confirm("Tem certeza que deseja atualizar as configurações de notificação para todos os usuários?")) {
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/admin/update-user-notification-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          authorization: "admin_update",
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: data.message,
          variant: "default",
        });
      } else {
        toast({
          title: "Erro",
          description: data.error || "Erro ao atualizar configurações de notificação",
          variant: "destructive",
        });
      }

      setResult(data);
    } catch (error) {
      devLog.error("Erro ao atualizar configurações de notificação:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao processar a solicitação",
        variant: "destructive",
      });
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Atualizar Configurações de Notificação</h1>
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Atualização em Massa</CardTitle>
          <CardDescription>
            Esta ferramenta atualizará as configurações de notificação padrão para todos os usuários
            que não possuem estas configurações definidas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-md">
              <h3 className="font-medium text-amber-800 mb-2">Atenção!</h3>
              <p className="text-amber-700 text-sm">
                Esta operação irá adicionar configurações padrão de notificação para todos os 
                usuários cadastrados no sistema que não possuem essas configurações definidas.
                As configurações serão definidas como ativadas por padrão.
              </p>
            </div>

            {result && (
              <div className={`p-4 rounded-md ${result.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                <h3 className={`font-medium mb-2 ${result.success ? "text-green-800" : "text-red-800"}`}>
                  {result.success ? "Operação Concluída" : "Erro na Operação"}
                </h3>
                <p className={`text-sm ${result.success ? "text-green-700" : "text-red-700"}`}>
                  {result.message || result.error}
                </p>
                {result.stats && (
                  <div className="mt-3 text-sm">
                    <p>Total de usuários: <strong>{result.stats.total}</strong></p>
                    <p>Usuários atualizados: <strong>{result.stats.updated}</strong></p>
                    <p>Usuários já configurados: <strong>{result.stats.skipped}</strong></p>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleUpdateNotifications} 
            disabled={loading}
            className="w-full"
          >
            {loading ? "Processando..." : "Atualizar Configurações de Notificação"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
