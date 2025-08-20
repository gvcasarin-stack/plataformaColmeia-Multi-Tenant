"use client";

import React from 'react';
import { Button } from '../ui/button';

export function AuthFallback() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white">
      <div className="w-full max-w-md p-8 border border-gray-200 rounded-lg shadow-sm bg-white">
        <div className="flex flex-col items-center mb-8">
          <svg viewBox="0 0 24 24" className="w-12 h-12">
            <path d="M21 16.5c0 0.38-0.21 0.71-0.53 0.88l-7.9 4.44c-0.16 0.12-0.36 0.18-0.57 0.18s-0.41-0.06-0.57-0.18l-7.9-4.44A0.991 0.991 0 0 1 3 16.5v-9c0-0.38 0.21-0.71 0.53-0.88l7.9-4.44c0.16-0.12 0.36-0.18 0.57-0.18s0.41 0.06 0.57 0.18l7.9 4.44c0.32 0.17 0.53 0.5 0.53 0.88v9z" 
              fill="white" 
              stroke="#F7761D" 
              strokeWidth="1.5"
            />
          </svg>
          <h1 className="mt-6 text-[#1A1A1A] text-2xl font-bold">Colmeia Projetos</h1>
          <p className="mt-2 text-center text-[#666666]">
            Estamos enfrentando problemas para carregar a página.
          </p>
        </div>
        
        <div className="mt-6 space-y-4">
          <p className="text-sm text-gray-600">
            Pode ser um problema temporário de conexão ou autenticação.
          </p>
          
          <div className="flex flex-col space-y-3">
            <Button
              onClick={() => window.location.reload()}
              className="w-full bg-orange-600 hover:bg-orange-700"
            >
              Tentar novamente
            </Button>
            
            <Button
              onClick={() => window.location.href = '/'}
              className="w-full border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            >
              Voltar para página inicial
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 