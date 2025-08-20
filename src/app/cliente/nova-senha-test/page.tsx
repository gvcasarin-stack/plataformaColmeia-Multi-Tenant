export default function NovaSenhaTestPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-green-600">Página de Teste Nova Senha</h1>
        <p className="mt-4">Se você consegue ver esta página, o problema não é de roteamento geral.</p>
        <p className="mt-2 text-sm text-gray-600">
          Data/Hora: {new Date().toLocaleString()}
        </p>
      </div>
    </div>
  );
} 