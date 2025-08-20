'use client'

export function RecentProjects() {
  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Projetos Recentes</h3>
      <div className="space-y-4">
        {/* Add your recent projects list here */}
        <div className="p-4 border rounded">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-medium">Projeto Solar Residencial</h4>
              <p className="text-sm text-gray-500">Cliente: João Silva</p>
            </div>
            <span className="px-2 py-1 text-sm bg-green-100 text-green-800 rounded">
              Em Andamento
            </span>
          </div>
        </div>
        {/* Add more project items */}
      </div>
    </div>
  )
} 