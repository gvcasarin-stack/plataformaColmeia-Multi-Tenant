'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanColumn as KanbanColumnType, KanbanCard } from '@/types/kanban';
import KanbanItem from './KanbanItem';

interface KanbanColumnProps {
  column: KanbanColumnType;
  cards: KanbanCard[];
}

export default function KanbanColumn({ column, cards }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({
    id: column.id,
  });

  const getColumnStyle = (columnId: string) => {
    switch (columnId) {
      case 'nao-iniciados':
        return { border: 'border-l-gray-400', bg: 'from-gray-50/80 to-gray-50/30' };
      case 'em-desenvolvimento':
        return { border: 'border-l-blue-400', bg: 'from-blue-50/80 to-blue-50/30' };
      case 'aguardando-assinaturas':
        return { border: 'border-l-orange-400', bg: 'from-orange-50/80 to-orange-50/30' };
      case 'em-homologacao':
        return { border: 'border-l-purple-400', bg: 'from-purple-50/80 to-purple-50/30' };
      case 'projeto-aprovado':
        return { border: 'border-l-green-400', bg: 'from-green-50/80 to-green-50/30' };
      case 'aguardando-vistoria':
        return { border: 'border-l-amber-400', bg: 'from-amber-50/80 to-amber-50/30' };
      case 'projeto-pausado':
        return { border: 'border-l-yellow-400', bg: 'from-yellow-50/80 to-yellow-50/30' };
      case 'em-vistoria':
        return { border: 'border-l-cyan-400', bg: 'from-cyan-50/80 to-cyan-50/30' };
      case 'finalizado':
        return { border: 'border-l-emerald-400', bg: 'from-emerald-50/80 to-emerald-50/30' };
      case 'cancelado':
        return { border: 'border-l-red-400', bg: 'from-red-50/80 to-red-50/30' };
      default:
        return { border: 'border-l-gray-400', bg: 'from-gray-50/80 to-gray-50/30' };
    }
  };

  const columnStyle = getColumnStyle(column.id);

  return (
    <div className={`backdrop-blur-sm rounded-xl h-full flex flex-col min-w-[320px] shadow-sm border border-gray-200/60 ${columnStyle.border} border-l-4 bg-gradient-to-b ${columnStyle.bg}`}>
      <div className="px-4 py-3 border-b border-gray-200/80 bg-white/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">{column.title}</h3>
            <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-xs font-medium text-gray-600 bg-gray-100/80 rounded-full">
              {cards.length}
            </span>
          </div>
        </div>
      </div>
      <div
        ref={setNodeRef}
        className="p-3 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400"
      >
        <SortableContext
          items={cards.map(card => card.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2.5">
            {cards.map((card) => (
              <KanbanItem key={card.id} card={card} />
            ))}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}
