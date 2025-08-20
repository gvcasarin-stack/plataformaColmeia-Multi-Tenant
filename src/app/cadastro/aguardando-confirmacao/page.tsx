'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { devLog } from "@/lib/utils/productionLogger";
import Image from 'next/image'

export default function AguardandoConfirmacaoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    const emailParam = searchParams.get('email')
    if (emailParam) {
      setEmail(emailParam)
    }
  }, [searchParams])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg text-center">
        <div>
          <Image
            src="/logo.svg" // Certifique-se que este caminho está correto
            alt="Colmeia Solar Logo"
            width={120}
            height={40}
            className="mx-auto h-12 w-auto"
          />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Confirme seu E-mail
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {email
              ? <>Um e-mail de confirmação foi enviado para <strong className="font-medium text-orange-600">{email}</strong>.</>
              : 'Um e-mail de confirmação foi enviado.'}
          </p>
          <p className="mt-2 text-sm text-gray-600">
            Por favor, verifique sua caixa de entrada (e a pasta de spam/lixo eletrônico) e clique no link fornecido para ativar sua conta.
          </p>
        </div>
        <div className="mt-8">
          <p className="text-sm text-gray-500">
            Não recebeu o e-mail?{' '}
            {/* Adicionar funcionalidade de reenviar e-mail aqui no futuro, se necessário */}
            {/* <button
              onClick={() => devLog.log('Reenviar e-mail para:', email)} // Lógica de reenvio
              className="font-medium text-orange-600 hover:text-orange-500"
            >
              Reenviar e-mail
            </button> */}
          </p>
        </div>
        <div className="mt-6">
          <Link
            href="/cliente/login"
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
          >
            Ir para Login
          </Link>
        </div>
         <div className="mt-4 text-xs text-gray-400">
          <p>Se você já confirmou seu e-mail, pode tentar fazer login.</p>
        </div>
      </div>
    </div>
  )
} 