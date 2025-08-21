"use client";

import { cn } from "@/lib/utils";

/**
 * Componente Skeleton Loading para projetos
 * Proporciona uma experiência visual melhor do que um simples spinner
 */
export default function Loading() {
  // Gerar skeletons aleatórios para simular diferentes alturas
  const skeletonItems = Array.from({ length: 3 }).map((_, i) => {
    const randomHeight = Math.floor(Math.random() * 2) + 1; // 1 ou 2
    return (
      <div 
        key={i}
        className={cn(
          "bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700",
          "animate-pulse"
        )}
      >
        <div className="p-5">
          <div className="flex justify-between items-start">
            <div className="w-2/3">
              {/* Título */}
              <div className="h-6 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-3"></div>
              
              {/* Descrição */}
              <div className="h-4 w-full bg-gray-100 dark:bg-gray-600 rounded mb-2"></div>
              <div className="h-4 w-5/6 bg-gray-100 dark:bg-gray-600 rounded mb-2"></div>
              <div className="h-4 w-4/6 bg-gray-100 dark:bg-gray-600 rounded"></div>
            </div>
            
            {/* Badge de status */}
            <div className="h-8 w-24 rounded-full bg-orange-100 dark:bg-orange-900/30"></div>
          </div>
          
          {/* Metadados */}
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="h-5 bg-gray-100 dark:bg-gray-600 rounded"></div>
            <div className="h-5 bg-gray-100 dark:bg-gray-600 rounded"></div>
          </div>
          
          {/* Linha horizontal */}
          <div className="my-4 h-px w-full bg-gray-100 dark:bg-gray-700"></div>
          
          {/* Footer */}
          <div className="flex justify-between items-center">
            <div className="h-8 w-28 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700"></div>
          </div>
        </div>
      </div>
    );
  });
  
  return (
    <div className="w-full max-w-7xl mx-auto animate-fadeIn">
      <div className="mb-6">
        <div className="h-10 w-64 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
        <div className="h-5 w-full max-w-2xl bg-gray-100 dark:bg-gray-600 rounded"></div>
      </div>
      
      {/* Barra de pesquisa skeleton */}
      <div className="flex justify-between items-center mb-6">
        <div className="h-12 w-72 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        <div className="flex gap-3">
          <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          <div className="h-10 w-10 bg-orange-200 dark:bg-orange-700 rounded-lg"></div>
        </div>
      </div>

      {/* Grid de projetos skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {skeletonItems}
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
