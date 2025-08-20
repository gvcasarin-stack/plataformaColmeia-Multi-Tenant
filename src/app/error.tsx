'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <h2 className="text-2xl font-bold mb-4">Algo deu errado!</h2>
      <button
        className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
        onClick={() => reset()}
      >
        Tentar novamente
      </button>
    </div>
  )
} 