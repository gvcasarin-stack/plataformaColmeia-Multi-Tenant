export function Loading() {
  return (
    <div className="flex flex-col items-center justify-center h-32 gap-4">
      <div className="relative">
        <div className="h-24 w-24">
          <div className="absolute h-16 w-16 rounded-full border-4 border-solid border-orange-500 opacity-100 animate-ping"></div>
          <div className="absolute h-16 w-16 rounded-full border-4 border-solid border-orange-500 opacity-75"></div>
        </div>
      </div>
      <p className="text-gray-500">Carregando projetos...</p>
    </div>
  );
} 