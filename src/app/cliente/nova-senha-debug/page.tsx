"use client";

import { useEffect, useState, Suspense } from "react";
import { devLog } from "@/lib/utils/productionLogger";
import { useRouter, useSearchParams } from "next/navigation";

function DebugContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    // Extract all URL params
    const allParams = {};
    searchParams.forEach((value, key) => {
      (allParams as any)[key] = value;
    });

    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    const tokenHash = searchParams.get('token_hash');
    const type = searchParams.get('type');
    const errorParam = searchParams.get('error');
    const errorCode = searchParams.get('error_code');
    const next = searchParams.get('next');

    const debugData = {
      currentUrl: window.location.href,
      pathname: window.location.pathname,
      search: window.location.search,
      allParams,
      extractedParams: {
        accessToken: accessToken ? "present" : "missing",
        refreshToken: refreshToken ? "present" : "missing", 
        tokenHash: tokenHash ? "present" : "missing",
        type,
        errorParam,
        errorCode,
        next
      },
      rawValues: {
        accessToken,
        refreshToken,
        tokenHash,
        type,
        errorParam,
        errorCode,
        next
      }
    };

    devLog.log("🔍 [Debug] Complete URL analysis:", debugData);
    setDebugInfo(debugData);
  }, [searchParams]);

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-center">Debug: Nova Senha URL Parameters</h1>
        
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-lg font-semibold mb-4">URL Information</h2>
          <div className="space-y-2 text-sm">
            <p><strong>Current URL:</strong> {debugInfo.currentUrl}</p>
            <p><strong>Pathname:</strong> {debugInfo.pathname}</p>
            <p><strong>Search:</strong> {debugInfo.search}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-lg font-semibold mb-4">All URL Parameters</h2>
          <pre className="bg-gray-100 p-4 rounded text-xs overflow-x-auto">
            {JSON.stringify(debugInfo.allParams, null, 2)}
          </pre>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-lg font-semibold mb-4">Extracted Parameters</h2>
          <pre className="bg-gray-100 p-4 rounded text-xs overflow-x-auto">
            {JSON.stringify(debugInfo.extractedParams, null, 2)}
          </pre>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-lg font-semibold mb-4">Raw Values</h2>
          <pre className="bg-gray-100 p-4 rounded text-xs overflow-x-auto">
            {JSON.stringify(debugInfo.rawValues, null, 2)}
          </pre>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-lg font-semibold mb-4">Logic Check</h2>
          <div className="space-y-2 text-sm">
            <p><strong>Type is 'recovery':</strong> {debugInfo.extractedParams?.type === 'recovery' ? '✅ YES' : '❌ NO'}</p>
            <p><strong>Has token_hash:</strong> {debugInfo.extractedParams?.tokenHash === 'present' ? '✅ YES' : '❌ NO'}</p>
            <p><strong>Has access_token:</strong> {debugInfo.extractedParams?.accessToken === 'present' ? '✅ YES' : '❌ NO'}</p>
            <p><strong>Has error:</strong> {debugInfo.extractedParams?.errorParam ? `❌ YES (${debugInfo.extractedParams.errorParam})` : '✅ NO'}</p>
            <p><strong>Should proceed:</strong> {
              debugInfo.extractedParams?.type === 'recovery' && 
              (debugInfo.extractedParams?.tokenHash === 'present' || debugInfo.extractedParams?.accessToken === 'present') &&
              !debugInfo.extractedParams?.errorParam ? '✅ YES' : '❌ NO'
            }</p>
          </div>
        </div>

        <div className="flex space-x-4">
          <button
            onClick={() => router.push("/cliente/nova-senha")}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Go to Real Nova Senha Page
          </button>
          <button
            onClick={() => router.push("/cliente/login")}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DebugPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <DebugContent />
    </Suspense>
  );
}
