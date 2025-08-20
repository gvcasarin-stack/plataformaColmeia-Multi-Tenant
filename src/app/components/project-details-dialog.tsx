import { useEffect, useState } from 'react'
import { Project, ProjectHistory } from '@/types/project'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from '@/lib/hooks/useAuth'
// import { format } from 'date-fns'
import { Edit } from 'lucide-react'
import { devLog } from "@/lib/utils/productionLogger";
import { isAdminUser } from '@/lib/utils/auth'

// Helper function para formatação de datas usando Intl API
const formatDate = (date: Date | string) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(dateObj);
};

interface ProjectDetailsDialogProps {
  project: Project | null
  open: boolean
  onClose: () => void
  onUpdate: (project: Project) => void
}

const STATUS_OPTIONS = [
  'Não Iniciado',
  'Em Desenvolvimento',
  'Aprovado',
  'Aguardando Vistoria',
  'Pausado',
  'Em Vistoria',
  'Finalizado',
  'Cancelado'
]

const PRIORITY_OPTIONS = ['Alta', 'Média', 'Baixa']

export function ProjectDetailsDialog({ project, open, onClose, onUpdate }: ProjectDetailsDialogProps) {
  const { user } = useAuth()
  const isAdmin = isAdminUser(user?.email)
  const [editedProject, setEditedProject] = useState<Project | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [comment, setComment] = useState('')

  // Reset editedProject when project changes
  useEffect(() => {
    if (project) {
      setEditedProject({ ...project })
      setIsEditing(false)
      setHasChanges(false)
    }
  }, [project])

  const handleChange = (field: keyof Project, value: any) => {
    if (!isEditing || !isAdmin) return;
    
    setEditedProject(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [field]: value
      }
    });
    setHasChanges(true);
  }

  const handleSave = async () => {
    if (!editedProject || !hasChanges) return;
    try {
      await onUpdate(editedProject);
      await addHistoryEntry('info_update', 'Informações do projeto atualizadas');
      setHasChanges(false);
      setIsEditing(false);
    } catch (error) {
      devLog.error('Error updating project:', error);
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim()) return;
    
    try {
      devLog.log('Adding comment:', comment);  // Log the comment being added
      await addHistoryEntry('comment', comment);
      devLog.log('Comment added successfully');  // Log success
      
      // Show the comment immediately in UI
      setComment('');  // Clear the input
      
      // Optional: Scroll to the latest comment
      const historyContainer = document.querySelector('.history-list');
      if (historyContainer) {
        historyContainer.scrollTop = 0;  // Scroll to top since we're showing newest first
      }
    } catch (error) {
      devLog.error('Error adding comment:', error);
    }
  };

  const addHistoryEntry = async (type: 'info_update' | 'comment' | 'document', content: string) => {
    if (!editedProject || !user) return;

    const historyEntry: ProjectHistory = {
      type,
      content,
      createdBy: user.email!,
      createdAt: new Date().toISOString(),
    };

    // Create a new array if history doesn't exist
    const currentHistory = editedProject.history || [];
    
    const updatedProject = {
      ...editedProject,
      history: [...currentHistory, historyEntry]
    };

    setEditedProject(updatedProject); // Update local state
    await onUpdate(updatedProject); // Save to Firebase
  };

  if (!project || !editedProject) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle>Detalhes do Projeto {project.number}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4 dark:text-white">Informações do Projeto</h3>
            <p className="text-red-500">Debug: isAdmin={String(isAdmin)}, isEditing={String(isEditing)}</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Número</label>
                <Input 
                  value={editedProject.number}
                  onChange={e => handleChange('number', e.target.value)}
                  disabled={true}
                  className="bg-gray-50 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Empresa Integradora</label>
                <Input 
                  value={editedProject.empresaIntegradora}
                  onChange={e => handleChange('empresaIntegradora', e.target.value)}
                  disabled={!isEditing}
                  className={!isEditing ? 'bg-gray-50' : 'cursor-text'}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Cliente Final</label>
                <Input 
                  value={editedProject.nomeClienteFinal}
                  onChange={e => handleChange('nomeClienteFinal', e.target.value)}
                  disabled={!isEditing}
                  className={!isEditing ? 'bg-gray-50' : 'cursor-text'}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Distribuidora</label>
                <Input 
                  value={editedProject.distribuidora}
                  onChange={e => handleChange('distribuidora', e.target.value)}
                  disabled={!isEditing}
                  className={!isEditing ? 'bg-gray-50' : 'cursor-text'}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Potência (kWp)</label>
                <Input 
                  type="number"
                  value={editedProject.potencia}
                  onChange={e => handleChange('potencia', Number(e.target.value))}
                  disabled={!isEditing}
                  className={!isEditing ? 'bg-gray-50' : 'cursor-text'}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Data de Entrega</label>
                <Input 
                  type="date"
                  value={editedProject.dataEntrega}
                  onChange={e => handleChange('dataEntrega', e.target.value)}
                  disabled={!isEditing}
                  className={!isEditing ? 'bg-gray-50' : 'cursor-text'}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Status</label>
                <Select 
                  value={editedProject.status}
                  onValueChange={value => handleChange('status', value)}
                  disabled={!isEditing}
                >
                  <SelectTrigger className={!isEditing ? 'bg-gray-50' : 'cursor-pointer'}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(status => (
                      <SelectItem 
                        key={status} 
                        value={status}
                        className="cursor-pointer"
                      >
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Prioridade</label>
                <Select 
                  value={editedProject.prioridade}
                  onValueChange={value => handleChange('prioridade', value)}
                  disabled={!isEditing}
                >
                  <SelectTrigger className={!isEditing ? 'bg-gray-50' : 'cursor-pointer'}>
                    <SelectValue placeholder="Selecione a prioridade" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map(priority => (
                      <SelectItem key={priority} value={priority} className="cursor-pointer">
                        {priority}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {isAdmin && (
              <div className="mt-6 flex justify-end gap-2">
                {!isEditing ? (
                  <Button 
                    onClick={() => setIsEditing(true)}
                    variant="outline"
                    className="flex items-center"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Editar Informações
                  </Button>
                ) : (
                  <>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setEditedProject({ ...project });
                        setIsEditing(false);
                        setHasChanges(false);
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleSave}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={!hasChanges}
                    >
                      Salvar Alterações
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Anexar Documentos Section */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4">Anexar Documentos</h3>
            {/* Your document upload section */}
          </div>

          {/* Histórico Section */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4">Histórico</h3>
            
            {/* Add Comment */}
            <div className="mb-4">
              <Textarea
                placeholder="Adicionar comentário..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="mb-2"
              />
              <Button onClick={handleAddComment} className="cursor-pointer">
                Adicionar Comentário
              </Button>
            </div>

            {/* History List */}
            <div className="space-y-2 history-list">
              {editedProject.history?.map((entry, index) => (
                <div 
                  key={`${entry.createdAt}-${index}`}
                  className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md"
                >
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>{entry.createdBy}</span>
                    <span>{formatDate(entry.createdAt)}</span>
                  </div>
                  <div className="mt-1">
                    {entry.type === 'info_update' && (
                      <span className="text-blue-600">{entry.content}</span>
                    )}
                    {entry.type === 'comment' && (
                      <span>{entry.content}</span>
                    )}
                    {entry.type === 'document' && (
                      <span className="text-green-600">{entry.content}</span>
                    )}
                  </div>
                </div>
              )).reverse()}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose} className="cursor-pointer">
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 