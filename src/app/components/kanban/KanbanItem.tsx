'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { KanbanCard, ProjectPriority, ProjectStatus } from '@/types/kanban';
import { Clock, AlertCircle, CheckCircle2, PauseCircle, XCircle, Zap } from 'lucide-react';

interface KanbanItemProps {
  card: KanbanCard;
}

const priorityColors: Record<ProjectPriority, { bg: string; text: string; ring: string; icon: JSX.Element }> = {
  Alta: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    ring: 'ring-red-600/20',
    icon: <Zap className="w-3 h-3 text-red-600" />
  },
  Média: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    ring: 'ring-yellow-600/20',
    icon: <Zap className="w-3 h-3 text-yellow-600" />
  },
  Baixa: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    ring: 'ring-green-600/20',
    icon: <Zap className="w-3 h-3 text-green-600" />
  },
  Urgente: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    ring: 'ring-purple-600/20',
    icon: <Zap className="w-3 h-3 text-purple-600" />
  }
};

const statusIcons: Record<ProjectStatus, { icon: JSX.Element; bg: string; border: string }> = {
  'Não Iniciado': {
    icon: <Clock className="w-4 h-4 text-gray-500" />,
    bg: 'bg-gray-50',
    border: 'border-gray-200'
  },
  'Em Desenvolvimento': {
    icon: <AlertCircle className="w-4 h-4 text-blue-500" />,
    bg: 'bg-blue-50',
    border: 'border-blue-200'
  },
  'Aguardando': {
    icon: <Clock className="w-4 h-4 text-orange-500" />,
    bg: 'bg-orange-50',
    border: 'border-orange-200'
  },
  'Homologação': {
    icon: <AlertCircle className="w-4 h-4 text-purple-500" />,
    bg: 'bg-purple-50',
    border: 'border-purple-200'
  },
  'Projeto Aprovado': {
    icon: <CheckCircle2 className="w-4 h-4 text-green-500" />,
    bg: 'bg-green-50',
    border: 'border-green-200'
  },
  'Aguardando Vistoria': {
    icon: <Clock className="w-4 h-4 text-orange-500" />,
    bg: 'bg-orange-50',
    border: 'border-orange-200'
  },
  'Projeto Pausado': {
    icon: <PauseCircle className="w-4 h-4 text-yellow-500" />,
    bg: 'bg-yellow-50',
    border: 'border-yellow-200'
  },
  'Em Vistoria': {
    icon: <AlertCircle className="w-4 h-4 text-blue-500" />,
    bg: 'bg-blue-50',
    border: 'border-blue-200'
  },
  'Finalizado': {
    icon: <CheckCircle2 className="w-4 h-4 text-green-500" />,
    bg: 'bg-green-50',
    border: 'border-green-200'
  },
  'Cancelado': {
    icon: <XCircle className="w-4 h-4 text-red-500" />,
    bg: 'bg-red-50',
    border: 'border-red-200'
  },
};

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(date);
};

export default function KanbanItem({ card }: KanbanItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const priorityStyle = priorityColors[card.priority || 'Média'];
  const statusStyle = statusIcons[card.status || 'Não Iniciado'];

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="group bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200/60 hover:border-gray-300/80 overflow-hidden"
    >
      <div className="px-3 py-2.5 space-y-2">
        {/* Header with Status */}
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-medium text-gray-900">{card.title}</h4>
          <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${statusStyle.bg} border ${statusStyle.border}`}>
            {statusStyle.icon}
          </div>
        </div>

        {/* Client Name */}
        <p className="text-sm text-gray-600 line-clamp-2">{card.clientName}</p>

        {/* Priority Badge */}
        <div className="flex items-center gap-1.5">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ring-1 ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.ring}`}>
            {priorityStyle.icon}
            {card.priority || 'Média'}
          </span>
        </div>

        {/* Dates */}
        <div className="flex items-center justify-between border-t border-gray-100 pt-2 mt-2">
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">Início</span>
            <span className="text-xs text-gray-700">{formatDate(card.createdAt)}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">Prazo</span>
            <span className="text-xs text-gray-700">{formatDate(card.dueDate || card.createdAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
