"use client";


/**
 * Componente Skeleton Loading para área administrativa
 * Proporciona uma experiência visual melhor do que um simples spinner
 */
export default function Loading() {
  // Gerar dados de exemplo para o skeleton
  const dashboardCards = Array.from({ length: 4 }).map((_, i) => (
    <div 
      key={`card-${i}`}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 animate-pulse"
    >
      <div className="flex items-center">
        <div className="w-12 h-12 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 mr-4"></div>
        <div className="flex-1">
          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
          <div className="h-6 w-20 bg-gray-300 dark:bg-gray-600 rounded"></div>
        </div>
      </div>
    </div>
  ));

  // Skeleton para tabela de dados
  const tableRows = Array.from({ length: 6 }).map((_, i) => (
    <div 
      key={`row-${i}`}
      className="grid grid-cols-12 gap-4 py-3 border-b border-gray-100 dark:border-gray-700 items-center"
    >
      <div className="col-span-1">
        <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700"></div>
      </div>
      <div className="col-span-3">
        <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
      <div className="col-span-3">
        <div className="h-4 w-5/6 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
      <div className="col-span-2">
        <div className="h-6 w-16 rounded-full bg-gray-200 dark:bg-gray-700"></div>
      </div>
      <div className="col-span-2">
        <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
      <div className="col-span-1 flex justify-end">
        <div className="h-8 w-8 rounded-lg bg-gray-200 dark:bg-gray-700"></div>
      </div>
    </div>
  ));
  
  return (
    <div className="w-full max-w-7xl mx-auto px-4 animate-fadeIn">
      <div className="mb-6">
        <div className="h-10 w-64 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
        <div className="h-5 w-full max-w-2xl bg-gray-100 dark:bg-gray-600 rounded"></div>
      </div>
      
      {/* Cards Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {dashboardCards}
      </div>

      {/* Cabeçalho tabela */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-9 w-36 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        </div>
        
        {/* Corpo tabela */}
        <div className="p-5">
          {tableRows}
        </div>
        
        {/* Paginação */}
        <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div className="h-8 w-28 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="flex gap-2">
            <div className="h-8 w-8 rounded-md bg-gray-200 dark:bg-gray-700"></div>
            <div className="h-8 w-8 rounded-md bg-gray-200 dark:bg-gray-700"></div>
            <div className="h-8 w-8 rounded-md bg-orange-200 dark:bg-orange-700"></div>
            <div className="h-8 w-8 rounded-md bg-gray-200 dark:bg-gray-700"></div>
            <div className="h-8 w-8 rounded-md bg-gray-200 dark:bg-gray-700"></div>
          </div>
        </div>
      </div>
      
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}
