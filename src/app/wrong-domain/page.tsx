'use client';

import React from 'react';
import { AlertTriangle, Home, Building2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function WrongDomainPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
          {/* Header com ícone */}
          <div className="bg-gradient-to-r from-orange-500/20 to-amber-500/20 p-8 text-center border-b border-white/10">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-orange-500/20 mb-4">
              <AlertTriangle className="h-10 w-10 text-orange-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Domínio Incorreto
            </h1>
            <p className="text-slate-300 text-lg">
              Você está tentando acessar uma área restrita pelo domínio principal
            </p>
          </div>

          {/* Conteúdo */}
          <div className="p-8 space-y-6">
            <div className="text-center space-y-4">
              <p className="text-slate-300 text-base leading-relaxed">
                As áreas administrativas e de clientes <span className="font-semibold text-white">não estão disponíveis</span> através do domínio principal <span className="font-mono text-blue-400">www.gerenciamentofotovoltaico.com.br</span>
              </p>

              <p className="text-slate-400 text-sm leading-relaxed">
                Cada empresa possui seu próprio subdomínio personalizado para acesso ao sistema.
              </p>
            </div>

            {/* Seção de como acessar */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-400" />
                Como acessar corretamente
              </h2>
              <div className="space-y-4 text-slate-300 text-sm">
                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/30">
                  <p className="font-semibold text-white mb-2">O endereço correto deve ser:</p>
                  <div className="bg-slate-950/50 rounded px-3 py-2 border border-blue-500/30">
                    <code className="text-blue-400 text-xs">
                      https://<span className="text-orange-400 font-bold">nome-da-empresa</span>.gerenciamentofotovoltaico.com.br
                    </code>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="font-medium text-white">Exemplos:</p>
                  <ul className="space-y-2 pl-4">
                    <li className="flex items-start gap-2">
                      <ArrowRight className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span>Se sua empresa é <span className="font-semibold text-white">"Solar Tech"</span>, acesse:<br/>
                      <code className="text-blue-400 text-xs">solar-tech.gerenciamentofotovoltaico.com.br</code></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ArrowRight className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span>Se sua empresa é <span className="font-semibold text-white">"Energia Verde"</span>, acesse:<br/>
                      <code className="text-blue-400 text-xs">energia-verde.gerenciamentofotovoltaico.com.br</code></span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Seção de ajuda */}
            <div className="bg-blue-500/10 rounded-xl p-6 border border-blue-500/20">
              <h2 className="text-lg font-semibold text-white mb-3">
                Não sabe qual é o subdomínio da sua empresa?
              </h2>
              <p className="text-slate-300 text-sm mb-4">
                Entre em contato com o administrador da sua empresa ou com o responsável que criou a conta.
                Ele poderá informar o endereço correto de acesso.
              </p>
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/30">
                <p className="text-slate-400 text-xs">
                  <span className="font-semibold text-white">Dica:</span> O subdomínio geralmente é escolhido no momento da criação da conta e normalmente corresponde ao nome ou sigla da empresa.
                </p>
              </div>
            </div>

            {/* Botão de navegação */}
            <div className="flex justify-center pt-4">
              <Link
                href="https://gerenciamentofotovoltaico.com.br"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-lg transition-all shadow-md hover:shadow-lg"
              >
                <Home className="h-4 w-4" />
                Voltar para o Site Principal
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-500 text-sm mt-6">
          SGF - Sistema de Gerenciamento Fotovoltaico © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
