'use client';

import React from 'react';
import { SearchX, Home, UserPlus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function TenantNotFoundPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
          {/* Header com ícone */}
          <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 p-8 text-center border-b border-white/10">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-500/20 mb-4">
              <SearchX className="h-10 w-10 text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Organização Não Encontrada
            </h1>
            <p className="text-slate-300 text-lg">
              Este subdomínio não está cadastrado em nossa plataforma
            </p>
          </div>

          {/* Conteúdo */}
          <div className="p-8 space-y-6">
            <div className="text-center space-y-4">
              <p className="text-slate-300 text-base leading-relaxed">
                A organização que você está tentando acessar <span className="font-semibold text-white">não existe</span> ou nunca foi cadastrada em nosso sistema.
              </p>

              <p className="text-slate-400 text-sm leading-relaxed">
                Verifique se você digitou o endereço corretamente. Se você está tentando acessar uma organização existente, entre em contato com o administrador.
              </p>
            </div>

            {/* Seção de possíveis causas */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
              <h2 className="text-lg font-semibold text-white mb-3">
                Possíveis causas
              </h2>
              <ul className="space-y-2 text-slate-300 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span>O endereço foi digitado incorretamente</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span>A organização ainda não foi cadastrada na plataforma</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span>O subdomínio foi alterado pelo administrador</span>
                </li>
              </ul>
            </div>

            {/* Seção de ações */}
            <div className="bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 rounded-xl p-6 border border-emerald-500/20">
              <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-emerald-400" />
                Quer criar sua própria organização?
              </h2>
              <p className="text-slate-300 text-sm mb-4">
                Se você ainda não possui uma conta, pode se cadastrar gratuitamente e começar seu período de teste:
              </p>
              <Link
                href="https://registro.gerenciamentofotovoltaico.com.br"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-medium rounded-lg transition-all shadow-md hover:shadow-lg text-sm"
              >
                <UserPlus className="h-4 w-4" />
                Criar conta gratuita
              </Link>
            </div>

            {/* Botão de navegação */}
            <div className="flex justify-center pt-4">
              <Link
                href="https://gerenciamentofotovoltaico.com.br"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-all"
              >
                <Home className="h-4 w-4" />
                Página Inicial
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-500 text-sm mt-6">
          SGF Multi-Tenant © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}