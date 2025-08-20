"use client";

import React from 'react';

export default function RootLoading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-gray-950">
      {/* Logo SVG inline para carregamento rápido */}
      <div className="flex flex-col items-center">
        <svg
          width="120"
          height="120"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Colmeia Projetos Logo"
          className="mb-4"
        >
          <path
            d="M50 0L93.3 25V75L50 100L6.7 75V25L50 0Z"
            fill="#4F46E5"
            opacity="0.2"
          />
          <path
            d="M50 20L79.4 37.5V72.5L50 90L20.6 72.5V37.5L50 20Z"
            fill="#4F46E5"
            opacity="0.6"
          />
          <path
            d="M50 40L64.7 50V70L50 80L35.3 70V50L50 40Z"
            fill="#4F46E5"
          />
          <path
            d="M50 0L93.3 25V75L50 100L6.7 75V25L50 0Z"
            stroke="#4F46E5"
            strokeWidth="2"
            opacity="0.8"
          />
        </svg>
        
        {/* Spinner de carregamento com SVG inline */}
        <div className="relative">
          <svg
            className="w-12 h-12 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="Carregando..."
            role="status"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="#4F46E5"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="#4F46E5"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        </div>
        
        <div className="mt-4 text-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Colmeia Projetos
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Carregando aplicação...
          </p>
        </div>
      </div>
    </div>
  );
} 