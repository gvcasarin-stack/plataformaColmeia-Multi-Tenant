'use client'

export function ProjectSummary() {
  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Resumo de Projetos</h3>
      <div className="space-y-4">
        <div className="flex justify-between">
          <span>Projetos Ativos</span>
          <span className="font-semibold">12</span>
        </div>
        <div className="flex justify-between">
          <span>Em Andamento</span>
          <span className="font-semibold">8</span>
        </div>
        <div className="flex justify-between">
          <span>Concluídos</span>
          <span className="font-semibold">45</span>
        </div>
      </div>
    </div>
  )
}
