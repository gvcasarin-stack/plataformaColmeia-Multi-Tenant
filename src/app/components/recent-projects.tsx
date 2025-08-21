import { format } from 'date-fns/format'
import { useProjects } from '@/lib/hooks/useProjects'
import { User } from 'lucide-react'
// import { Timestamp } from 'firebase/firestore'

// ✅ CORREÇÃO REACT #130: Helper function to safely convert dates to timestamp
const getDateValue = (date: any): number => {
  if (!date) return 0;
  if (typeof date === 'string') return new Date(date).getTime();
  if (date.seconds) return date.seconds * 1000; // Firebase Timestamp compatibility
  if (typeof date === 'number') return date;
  return new Date(date).getTime();
};

// ✅ CORREÇÃO REACT #130: Helper function to format date from timestamp
const formatDateFromTimestamp = (timestamp: number): string => {
  if (!timestamp) return 'N/A';
  return format(new Date(timestamp), "dd/MM/yyyy, HH:mm:ss");
};

export function RecentProjects() {
  const { projects } = useProjects()

  const recentProjects = projects
    .sort((a, b) => {
      const dateA = getDateValue(a.updatedAt)
      const dateB = getDateValue(b.updatedAt)
      return dateB - dateA
    })
    .slice(0, 5)

  return (
    <div className="bg-white p-6 rounded-lg border">
      <h2 className="text-lg font-semibold mb-4">Projetos Recentemente Atualizados</h2>
      <div className="space-y-4">
        {recentProjects.map(project => (
          <div key={project.id} className="border-b pb-4 last:border-0 last:pb-0">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">{project.number}</span>
                <span className="text-gray-500">-</span>
                <span className="text-gray-600">{project.empresaIntegradora}</span>
              </div>
              <span className={`text-sm px-2 py-1 rounded-full ${
                project.status === 'Não Iniciado' ? 'bg-gray-100' :
                project.status === 'Em Desenvolvimento' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100'
              }`}>
                {project.status}
              </span>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User className="w-4 h-4" />
                <span>{project.nomeClienteFinal}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="w-4 h-4 flex items-center justify-center">⚡</span>
                <span>{project.potencia} kWp</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="w-4 h-4 flex items-center justify-center">🕒</span>
                <span>Atualizado: {formatDateFromTimestamp(getDateValue(project.updatedAt) || Date.now())}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
