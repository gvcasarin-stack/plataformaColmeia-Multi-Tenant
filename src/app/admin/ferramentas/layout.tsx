import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";

export default function FerramentasLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ferramentas Administrativas</h1>
        <p className="text-muted-foreground">
          Ferramentas para administradores gerenciarem e diagnosticarem funcionalidades do sistema.
        </p>
      </div>
      
      <Tabs defaultValue="email" className="space-y-4">
        <TabsList>
          <Link href="/admin/ferramentas/email">
            <TabsTrigger value="email">Teste de Email</TabsTrigger>
          </Link>
          <Link href="/admin/ferramentas/template-email">
            <TabsTrigger value="template-email">Templates de Email</TabsTrigger>
          </Link>
        </TabsList>
        
        <div className="pt-4">
          {children}
        </div>
      </Tabs>
    </div>
  );
} 