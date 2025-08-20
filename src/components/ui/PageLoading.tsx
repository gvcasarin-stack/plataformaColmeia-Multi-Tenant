import React from 'react';

export default function PageLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="w-16 h-16 border-4 border-gray-300 border-t-orange-500 rounded-full animate-spin"></div>
      <p className="mt-4 text-lg text-gray-600">Carregando...</p>
    </div>
  );
} 