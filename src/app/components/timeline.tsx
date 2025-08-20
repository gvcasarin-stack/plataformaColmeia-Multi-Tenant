import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface TimelineEvent {
  id: string;
  type: 'comment' | 'document';
  content: string;
  user: string;
  userName?: string;
  userEmail?: string;
  timestamp: Date;
  fileName?: string;
}

interface TimelineProps {
  events: TimelineEvent[]
  onDeleteDocument?: (id: string) => void
  onDownloadDocument?: (fileName: string) => void
  onEditComment?: (id: string, newContent: string) => void
  onDeleteComment?: (id: string) => void
}

export function Timeline({ events, onDeleteDocument, onDownloadDocument, onEditComment, onDeleteComment }: TimelineProps) {
  return (
    <div className="space-y-4">
      {events.map((event) => (
        <div key={event.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className="font-medium">
                {event.userName || event.user || 'Usuário'}
              </span>
              <span className="text-gray-500 text-sm ml-2">
                {new Date(event.timestamp).toLocaleString()}
              </span>
            </div>
            <div className="flex space-x-2">
              {event.type === 'document' && onDeleteDocument && onDownloadDocument && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => event.fileName && onDownloadDocument(event.fileName)}
                  >
                    Download
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteDocument(event.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              )}
              {event.type === 'comment' && onDeleteComment && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleteComment(event.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          <div className="whitespace-pre-wrap">{event.content}</div>
        </div>
      ))}
    </div>
  )
} 