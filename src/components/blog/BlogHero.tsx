"use client"

import { useState } from 'react'
import { Search } from 'lucide-react'

interface BlogHeroProps {
  onSearch?: (query: string) => void
}

export default function BlogHero({ onSearch }: BlogHeroProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (onSearch) {
      onSearch(searchQuery)
    }
  }

  return (
    <section className="w-full py-12 md:py-20 relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-700">
      <div className="container mx-auto px-4 md:px-6 relative z-10 max-w-7xl">
        <div className="flex flex-col items-center justify-center space-y-6 text-center">
          {/* Título */}
          <div className="space-y-4">
            <h1 className="text-3xl font-bold tracking-tighter text-white sm:text-4xl md:text-5xl lg:text-6xl drop-shadow-md">
              Blog SGF
            </h1>
            <div className="flex items-center justify-center space-x-2">
              <span className="w-12 h-0.5 bg-white/60 rounded-full"></span>
              <span className="w-3 h-3 rounded-full bg-white/60"></span>
              <span className="w-12 h-0.5 bg-white/60 rounded-full"></span>
            </div>
            <p className="mx-auto max-w-[700px] text-white/90 md:text-xl drop-shadow-sm">
              Insights sobre <span className="font-bold">energia fotovoltaica</span>, homologação de projetos e gestão de empresas do setor solar.
            </p>
          </div>

          {/* Barra de Busca */}
          <form onSubmit={handleSearch} className="w-full max-w-2xl mt-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar artigos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-white/20 bg-white/95 backdrop-blur-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all duration-300 shadow-lg"
              />
            </div>
          </form>
        </div>
      </div>
    </section>
  )
}
