'use client';

import { useCallback, useRef, useState } from 'react';
import { Bold, Italic, AlignLeft, AlignCenter, AlignJustify, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

type VarColor = 'blue' | 'purple' | 'emerald' | 'amber';

interface VarMeta {
  label: string;
  color: VarColor;
}

const DOCSEC_VARS: Record<string, VarMeta> = {
  cliente_nome: { label: 'Nome do Cliente', color: 'blue' },
  cliente_tipo: { label: 'Tipo (CPF/CNPJ)', color: 'blue' },
  cliente_rg: { label: 'RG do Cliente', color: 'blue' },
  cliente_cpf: { label: 'CPF do Cliente', color: 'blue' },
  cliente_cnpj: { label: 'CNPJ do Cliente', color: 'blue' },
  cliente_responsavel_legal_nome: { label: 'Nome do Responsável Legal', color: 'purple' },
  cliente_responsavel_legal_cpf: { label: 'CPF do Responsável Legal', color: 'purple' },
  responsavel_nome: { label: 'Nome do Responsável Técnico', color: 'emerald' },
  responsavel_cpf: { label: 'CPF do Responsável Técnico', color: 'emerald' },
  responsavel_rg: { label: 'RG do Responsável Técnico', color: 'emerald' },
  responsavel_orgao_expeditor: { label: 'Órgão Expeditor', color: 'emerald' },
  responsavel_profissao: { label: 'Profissão', color: 'emerald' },
  responsavel_registro: { label: 'Nº de Registro', color: 'emerald' },
  responsavel_instituicao: { label: 'Instituição (CREA/CFT)', color: 'emerald' },
  responsavel_estado: { label: 'Estado do Registro', color: 'emerald' },
  distribuidora: { label: 'Distribuidora', color: 'amber' },
  cidade: { label: 'Cidade', color: 'amber' },
  estado: { label: 'Estado', color: 'amber' },
  data: { label: 'Data', color: 'amber' },
};

const COLOR_CLASSES: Record<VarColor, string> = {
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  purple: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

const VAR_GROUPS: { label: string; note?: string; vars: string[] }[] = [
  { label: 'Do Cliente', vars: ['cliente_nome', 'cliente_tipo', 'cliente_rg', 'cliente_cpf', 'cliente_cnpj'] },
  {
    label: 'Responsável Legal pela UC (quem assina)',
    note: 'Se o cliente for CPF, repete os dados do próprio cliente; se for CNPJ, usa o Responsável Legal pela UC informado ao gerar a procuração.',
    vars: ['cliente_responsavel_legal_nome', 'cliente_responsavel_legal_cpf'],
  },
  {
    label: 'Do Responsável Técnico',
    vars: [
      'responsavel_nome',
      'responsavel_cpf',
      'responsavel_rg',
      'responsavel_orgao_expeditor',
      'responsavel_profissao',
      'responsavel_registro',
      'responsavel_instituicao',
      'responsavel_estado',
    ],
  },
  { label: 'Do Projeto', vars: ['distribuidora', 'cidade', 'estado', 'data'] },
];

function pillMarkup(varName: string): string {
  const meta = DOCSEC_VARS[varName] || { label: varName, color: 'blue' as const };
  const cls = COLOR_CLASSES[meta.color];
  return `<span class="var-pill inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${cls}" contenteditable="false" data-var="${varName}">${meta.label}</span>`;
}

// Converte o texto bruto salvo ({{variavel}}) para os "chips" coloridos exibidos ao usuário —
// usado tanto na pré-visualização quanto ao entrar no modo de edição do editor rico.
export function varsToPills(html: string): string {
  return html.replace(/\{\{(\w+)\}\}/g, (_match, varName: string) => pillMarkup(varName));
}

// Caminho inverso: lê o HTML atual do editor (com os chips) e devolve o texto bruto com
// {{variavel}} — é esse valor que continua sendo salvo no banco, mantendo compatibilidade
// total com a geração real de procurações (que já espera esse formato).
function pillsToVars(container: HTMLElement): string {
  const clone = container.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('.var-pill').forEach((pill) => {
    const varName = pill.getAttribute('data-var') || '';
    pill.replaceWith(document.createTextNode(`{{${varName}}}`));
  });
  return clone.innerHTML;
}

interface ProcuracaoRichEditorProps {
  value: string;
  onChange: (value: string) => void;
}

// Editor de texto rico (WYSIWYG) para o Texto da Procuração — substitui o textarea de HTML
// bruto. As variáveis aparecem como chips legíveis e coloridos (clicáveis/arrastáveis a partir
// do painel acima), nunca como {{variavel}}; formatação básica via botões (negrito, itálico,
// alinhamento). O <div contentEditable> é "não controlado" após a montagem — só é populado uma
// vez a partir de `value`, e daí em diante o DOM é a fonte da verdade enquanto o usuário edita,
// evitando resetar o cursor a cada tecla (problema clássico de contentEditable controlado).
export function ProcuracaoRichEditor({ value, onChange }: ProcuracaoRichEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // `value` só é usado para popular o editor UMA vez, na montagem — daí em diante o DOM
  // é a fonte da verdade (ver comentário acima do componente). useRef ignora o argumento
  // em re-renders subsequentes, então isso captura fielmente "o valor no momento do mount".
  const initialValueRef = useRef(value);

  const setEditorRef = useCallback((node: HTMLDivElement | null) => {
    editorRef.current = node;
    if (node && !node.dataset.populated) {
      node.innerHTML = varsToPills(initialValueRef.current);
      node.dataset.populated = 'true';
    }
  }, []);

  const syncChange = useCallback(() => {
    if (editorRef.current) {
      onChange(pillsToVars(editorRef.current));
    }
  }, [onChange]);

  const saveSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  }, []);

  const restoreSelection = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const sel = window.getSelection();
    if (!sel) return;
    sel.removeAllRanges();
    if (savedRangeRef.current) {
      sel.addRange(savedRangeRef.current);
    } else {
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      sel.addRange(range);
    }
  }, []);

  const insertVar = (varName: string) => {
    restoreSelection();
    document.execCommand('insertHTML', false, pillMarkup(varName) + '&nbsp;');
    saveSelection();
    syncChange();
  };

  const exec = (cmd: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false);
    syncChange();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const varName = e.dataTransfer.getData('text/plain');
    const editor = editorRef.current;
    if (!varName || !DOCSEC_VARS[varName] || !editor) return;

    let range: Range | null = null;
    if (document.caretRangeFromPoint) {
      range = document.caretRangeFromPoint(e.clientX, e.clientY);
    } else if ((document as unknown as { caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null }).caretPositionFromPoint) {
      const pos = (document as unknown as { caretPositionFromPoint: (x: number, y: number) => { offsetNode: Node; offset: number } | null }).caretPositionFromPoint(e.clientX, e.clientY);
      if (pos) {
        range = document.createRange();
        range.setStart(pos.offsetNode, pos.offset);
        range.collapse(true);
      }
    }
    if (range) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
    editor.focus();
    document.execCommand('insertHTML', false, pillMarkup(varName) + '&nbsp;');
    saveSelection();
    syncChange();
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">Variáveis Disponíveis</h4>
        <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
          Clique numa variável para inserir no texto na posição do cursor, ou arraste-a até o ponto desejado.
        </p>
        <div className="space-y-3">
          {VAR_GROUPS.map((group) => (
            <div key={group.label}>
              <span className="block text-[11px] font-bold uppercase tracking-wide text-blue-900 dark:text-blue-100 mb-1.5">
                {group.label}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {group.vars.map((varName) => {
                  const meta = DOCSEC_VARS[varName];
                  return (
                    <span
                      key={varName}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('text/plain', varName)}
                      onClick={() => insertVar(varName)}
                      className={cn(
                        'inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full cursor-grab select-none transition hover:shadow-sm active:scale-95',
                        COLOR_CLASSES[meta.color]
                      )}
                    >
                      <GripVertical className="h-2.5 w-2.5 opacity-50" />
                      {meta.label}
                    </span>
                  );
                })}
              </div>
              {group.note && (
                <p className="text-[11px] italic text-blue-700/80 dark:text-blue-300/80 mt-1">{group.note}</p>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs italic text-blue-700 dark:text-blue-300 mt-3">
          <strong>Dica:</strong> use os botões de formatação acima do texto para negrito, itálico e alinhamento —
          não é preciso escrever nenhum código.
        </p>
      </div>

      <div
        className={cn(
          'border rounded-lg overflow-hidden transition-shadow',
          isDragOver ? 'border-blue-400 ring-2 ring-blue-100 dark:ring-blue-900/40' : 'border-gray-300 dark:border-gray-600'
        )}
      >
        <div className="flex items-center gap-1 p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <button
            type="button"
            title="Negrito"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec('bold')}
            className="w-8 h-8 rounded-md flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-white hover:border hover:border-gray-300 dark:hover:bg-gray-700"
          >
            <Bold className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Itálico"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec('italic')}
            className="w-8 h-8 rounded-md flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-white hover:border hover:border-gray-300 dark:hover:bg-gray-700"
          >
            <Italic className="h-3.5 w-3.5" />
          </button>
          <span className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />
          <button
            type="button"
            title="Alinhar à esquerda"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec('justifyLeft')}
            className="w-8 h-8 rounded-md flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-white hover:border hover:border-gray-300 dark:hover:bg-gray-700"
          >
            <AlignLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Centralizar"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec('justifyCenter')}
            className="w-8 h-8 rounded-md flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-white hover:border hover:border-gray-300 dark:hover:bg-gray-700"
          >
            <AlignCenter className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Justificar"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec('justifyFull')}
            className="w-8 h-8 rounded-md flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-white hover:border hover:border-gray-300 dark:hover:bg-gray-700"
          >
            <AlignJustify className="h-3.5 w-3.5" />
          </button>
        </div>
        <div
          ref={setEditorRef}
          contentEditable
          suppressContentEditableWarning
          className="min-h-[400px] max-h-[560px] overflow-y-auto p-6 text-sm leading-relaxed text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-900 focus:outline-none"
          onInput={syncChange}
          onKeyUp={saveSelection}
          onMouseUp={saveSelection}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
        />
      </div>
    </div>
  );
}

// Pré-visualização (modo leitura) — mesmas regras de estilo do texto real, mas mostrando os
// chips coloridos em vez de {{variavel}} crua, igual ao editor.
export function ProcuracaoPreview({ html }: { html: string }) {
  return (
    <div
      className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm"
      dangerouslySetInnerHTML={{ __html: varsToPills(html) }}
    />
  );
}
