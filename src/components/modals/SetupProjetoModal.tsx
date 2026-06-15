'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Info, CheckCircle2 } from 'lucide-react';

export interface SetupProjetoData {
  setup_padrao_entrada: string;
  setup_quadro_cc: string;
  setup_mais_de_um_inversor: string;
  setup_tipo_inversor: string;
  setup_total_inversores: string;
  setup_configuracao_saidas: string;
  setup_tipo_transformador: string;
  setup_potencia_transformador: string;
  setup_concluido: string;
}

export const SETUP_DEFAULTS: SetupProjetoData = {
  setup_padrao_entrada: 'baixa_tensao',
  setup_quadro_cc: 'nao',
  setup_mais_de_um_inversor: 'nao',
  setup_tipo_inversor: 'string',
  setup_total_inversores: '2',
  setup_configuracao_saidas: 'independentes',
  setup_tipo_transformador: '',
  setup_potencia_transformador: '',
  setup_concluido: '',
};

interface Props {
  open: boolean;
  onClose: () => void;
  fields: Record<string, any>;
  onSave: (data: SetupProjetoData) => void;
}

function SelectQuestion({ label, description, value, onChange, options }: {
  label: string;
  description?: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</Label>
      {description && <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 text-sm">
          <SelectValue placeholder="Selecione" />
        </SelectTrigger>
        <SelectContent>
          {options.map(opt => (
            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function SetupProjetoModal({ open, onClose, fields, onSave }: Props) {
  const [local, setLocal] = useState<SetupProjetoData>({ ...SETUP_DEFAULTS });

  useEffect(() => {
    if (!open) return;
    setLocal({
      setup_padrao_entrada: fields.setup_padrao_entrada || SETUP_DEFAULTS.setup_padrao_entrada,
      setup_quadro_cc: fields.setup_quadro_cc || SETUP_DEFAULTS.setup_quadro_cc,
      setup_mais_de_um_inversor: fields.setup_mais_de_um_inversor || SETUP_DEFAULTS.setup_mais_de_um_inversor,
      setup_tipo_inversor: fields.setup_tipo_inversor || SETUP_DEFAULTS.setup_tipo_inversor,
      setup_total_inversores: fields.setup_total_inversores || SETUP_DEFAULTS.setup_total_inversores,
      setup_configuracao_saidas: fields.setup_configuracao_saidas || SETUP_DEFAULTS.setup_configuracao_saidas,
      setup_tipo_transformador: fields.setup_tipo_transformador || '',
      setup_potencia_transformador: fields.setup_potencia_transformador || '',
      setup_concluido: fields.setup_concluido || '',
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function set(key: keyof SetupProjetoData, value: string) {
    setLocal(prev => ({ ...prev, [key]: value }));
  }

  const isMediaTensao = local.setup_padrao_entrada === 'media_tensao';
  const maisDeUm = local.setup_mais_de_um_inversor === 'sim';
  const isString = local.setup_tipo_inversor === 'string';

  function handleConfirm() {
    onSave({ ...local, setup_concluido: 'true' });
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Settings className="h-5 w-5 text-blue-600" />
            Setup do Projeto
          </DialogTitle>
          <DialogDescription>
            Configure a topologia do sistema antes de preencher as informações do projeto.
          </DialogDescription>
          <div className="mt-2 rounded-lg border border-blue-100 dark:border-blue-900/40 bg-blue-50/70 dark:bg-blue-950/30 px-4 py-3">
            <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed flex gap-1.5">
              <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              Os valores padrão já estão preenchidos para o cenário mais comum (baixa tensão, inversor string único, sem stringbox). Na maioria dos casos, basta confirmar e prosseguir.
            </p>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Padrão de Entrada */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-100 dark:border-gray-800 pb-1.5">Padrão de Entrada</h3>
            <SelectQuestion
              label="Nível de tensão da rede"
              value={local.setup_padrao_entrada}
              onChange={v => set('setup_padrao_entrada', v)}
              options={[
                { value: 'baixa_tensao', label: 'Baixa Tensão' },
                { value: 'media_tensao', label: 'Média Tensão' },
              ]}
            />
            {isMediaTensao && (
              <>
                <SelectQuestion
                  label="Tipo do transformador"
                  value={local.setup_tipo_transformador}
                  onChange={v => set('setup_tipo_transformador', v)}
                  options={[
                    { value: 'a_seco', label: 'A seco' },
                    { value: 'a_oleo', label: 'A óleo' },
                  ]}
                />
                <SelectQuestion
                  label="Potência do transformador (kVA)"
                  value={local.setup_potencia_transformador}
                  onChange={v => set('setup_potencia_transformador', v)}
                  options={[
                    { value: '75', label: '75 kVA' },
                    { value: '112.5', label: '112,5 kVA' },
                    { value: '150', label: '150 kVA' },
                    { value: '225', label: '225 kVA' },
                    { value: '300', label: '300 kVA' },
                  ]}
                />
              </>
            )}
          </div>

          {/* Proteção CC */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-100 dark:border-gray-800 pb-1.5">Proteção CC</h3>
            <SelectQuestion
              label="Haverá quadro de proteção CC (Stringbox)?"
              value={local.setup_quadro_cc}
              onChange={v => set('setup_quadro_cc', v)}
              options={[
                { value: 'nao', label: 'Não' },
                { value: 'dps_chave_seccionadora', label: 'Sim — DPS e Chave Seccionadora' },
                { value: 'dps_disjuntor_cc', label: 'Sim — DPS e Disjuntor CC' },
                { value: 'dps', label: 'Sim — apenas DPS' },
              ]}
            />
          </div>

          {/* Inversores */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-100 dark:border-gray-800 pb-1.5">Inversores</h3>
            <SelectQuestion
              label="Haverá mais de um inversor?"
              value={local.setup_mais_de_um_inversor}
              onChange={v => set('setup_mais_de_um_inversor', v)}
              options={[
                { value: 'nao', label: 'Não — inversor único' },
                { value: 'sim', label: 'Sim — múltiplos inversores' },
              ]}
            />
            {maisDeUm && (
              <SelectQuestion
                label="Tipo do inversor"
                value={local.setup_tipo_inversor}
                onChange={v => set('setup_tipo_inversor', v)}
                options={[
                  { value: 'string', label: 'Inversor String' },
                  { value: 'microinversor', label: 'Microinversor' },
                ]}
              />
            )}
            {maisDeUm && isString && (
              <SelectQuestion
                label="Quantidade de inversores"
                value={local.setup_total_inversores}
                onChange={v => set('setup_total_inversores', v)}
                options={[
                  { value: '2', label: '2 inversores' },
                  { value: '3', label: '3 inversores' },
                  { value: '4', label: '4 inversores' },
                  { value: '5', label: '5 inversores' },
                  { value: '6', label: '6 inversores' },
                ]}
              />
            )}
            {maisDeUm && isString && (
              <SelectQuestion
                label="Configuração das saídas CA"
                description="Como as saídas dos inversores estão conectadas ao quadro CA."
                value={local.setup_configuracao_saidas}
                onChange={v => set('setup_configuracao_saidas', v)}
                options={[
                  { value: 'independentes', label: 'Saídas independentes' },
                  { value: 'agrupadas', label: 'Agrupadas em único quadro CA' },
                ]}
              />
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleConfirm} className="bg-blue-600 hover:bg-blue-700 text-white">
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Confirmar Setup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
