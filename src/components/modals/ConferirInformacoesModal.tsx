'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2, AlertCircle, MinusCircle, Save, X,
  User, CreditCard, MapPin, Factory, Zap, Plug, Info,
  Package, Settings, Building, Upload, ImageIcon, FolderArchive, Calendar
} from 'lucide-react';

const DISTRIBUIDORAS = [
  "Enel", "Copel", "Cemig", "CPFL", "Neoenergia Cosern",
  "Light", "EDP", "Celesc", "Energisa", "Equatorial",
  "RGE", "Amazonas Energia", "Outro"
];

const ESTADOS_BR = [
  { value: 'AC', label: 'Acre (AC)' },
  { value: 'AL', label: 'Alagoas (AL)' },
  { value: 'AP', label: 'Amapá (AP)' },
  { value: 'AM', label: 'Amazonas (AM)' },
  { value: 'BA', label: 'Bahia (BA)' },
  { value: 'CE', label: 'Ceará (CE)' },
  { value: 'DF', label: 'Distrito Federal (DF)' },
  { value: 'ES', label: 'Espírito Santo (ES)' },
  { value: 'GO', label: 'Goiás (GO)' },
  { value: 'MA', label: 'Maranhão (MA)' },
  { value: 'MT', label: 'Mato Grosso (MT)' },
  { value: 'MS', label: 'Mato Grosso do Sul (MS)' },
  { value: 'MG', label: 'Minas Gerais (MG)' },
  { value: 'PA', label: 'Pará (PA)' },
  { value: 'PB', label: 'Paraíba (PB)' },
  { value: 'PR', label: 'Paraná (PR)' },
  { value: 'PE', label: 'Pernambuco (PE)' },
  { value: 'PI', label: 'Piauí (PI)' },
  { value: 'RJ', label: 'Rio de Janeiro (RJ)' },
  { value: 'RN', label: 'Rio Grande do Norte (RN)' },
  { value: 'RS', label: 'Rio Grande do Sul (RS)' },
  { value: 'RO', label: 'Rondônia (RO)' },
  { value: 'RR', label: 'Roraima (RR)' },
  { value: 'SC', label: 'Santa Catarina (SC)' },
  { value: 'SP', label: 'São Paulo (SP)' },
  { value: 'SE', label: 'Sergipe (SE)' },
  { value: 'TO', label: 'Tocantins (TO)' },
];

type FieldType = 'text' | 'number' | 'select' | 'select_or_custom' | 'date' | 'image' | 'acervo_select';

interface FieldDef {
  key: string;
  label: string;
  icon?: React.ReactNode;
  type: FieldType;
  required: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  suffix?: string;
  group: string;
  acervoCategoria?: string;
}

const FIELD_DEFINITIONS: FieldDef[] = [
  // Dados do Cliente
  { key: 'nomeClienteFinal', label: 'Nome do Cliente Final', icon: <User className="h-3.5 w-3.5" />, type: 'text', required: true, group: 'Dados do Cliente' },
  { key: 'cpf_cnpj_cliente_final', label: 'CPF/CNPJ', icon: <CreditCard className="h-3.5 w-3.5" />, type: 'text', required: true, group: 'Dados do Cliente' },
  { key: 'endereco_local', label: 'Endereço', icon: <MapPin className="h-3.5 w-3.5" />, type: 'text', required: true, group: 'Dados do Cliente' },
  { key: 'client_city', label: 'Cidade', icon: <MapPin className="h-3.5 w-3.5" />, type: 'text', required: true, group: 'Dados do Cliente' },
  { key: 'client_state', label: 'Estado', icon: <MapPin className="h-3.5 w-3.5" />, type: 'select', required: true, options: ESTADOS_BR, group: 'Dados do Cliente' },
  { key: 'cliente_cep', label: 'CEP', icon: <MapPin className="h-3.5 w-3.5" />, type: 'text', required: true, placeholder: 'Ex: 65580-000', group: 'Dados do Cliente' },
  { key: 'cliente_email', label: 'E-mail do Cliente', icon: <User className="h-3.5 w-3.5" />, type: 'text', required: true, group: 'Dados do Cliente' },
  { key: 'cliente_celular', label: 'Celular do Cliente', type: 'text', required: true, placeholder: 'Ex: (48) 9 9900-0387', group: 'Dados do Cliente' },
  { key: 'cliente_telefone_fixo', label: 'Telefone Fixo do Cliente', type: 'text', required: false, group: 'Dados do Cliente' },

  // Responsável Legal
  { key: 'responsavel_legal_nome', label: 'Nome do Responsável Legal', icon: <User className="h-3.5 w-3.5" />, type: 'text', required: true, group: 'Responsável Legal' },
  { key: 'responsavel_legal_telefone', label: 'Telefone do Responsável Legal', type: 'text', required: true, placeholder: 'Ex: (48) 9 9900-0387', group: 'Responsável Legal' },
  { key: 'responsavel_legal_email', label: 'E-mail do Responsável Legal', type: 'text', required: false, group: 'Responsável Legal' },

  // Dados do Projeto
  { key: 'distribuidora', label: 'Distribuidora', icon: <Factory className="h-3.5 w-3.5" />, type: 'select', required: true, options: DISTRIBUIDORAS.map(d => ({ value: d, label: d })), group: 'Dados do Projeto' },
  { key: 'potencia', label: 'Potência (kWp)', icon: <Zap className="h-3.5 w-3.5" />, type: 'number', required: true, suffix: 'kWp', group: 'Dados do Projeto' },
  { key: 'tipo_fornecimento', label: 'Classificação da Usina', icon: <Settings className="h-3.5 w-3.5" />, type: 'select', required: true, options: [{ value: 'Microgeração Distribuída', label: 'Microgeração Distribuída' }, { value: 'Minigeração Distribuída', label: 'Minigeração Distribuída' }], group: 'Dados do Projeto' },
  { key: 'modalidade_compensacao', label: 'Modalidade de Compensação', icon: <Info className="h-3.5 w-3.5" />, type: 'select', required: true, options: [{ value: 'Autoconsumo Local', label: 'Autoconsumo Local' }, { value: 'Autoconsumo Remoto', label: 'Autoconsumo Remoto' }, { value: 'Geração Compartilhada', label: 'Geração Compartilhada' }], group: 'Dados do Projeto' },
  { key: 'havera_beneficiarias', label: 'Compensação de Créditos (Beneficiárias)', type: 'select', required: true, options: [{ value: 'sim', label: 'Sim' }, { value: 'nao', label: 'Não' }], group: 'Dados do Projeto' },
  { key: 'data_documento', label: 'Data do Documento', icon: <Calendar className="h-3.5 w-3.5" />, type: 'date', required: true, group: 'Dados do Projeto' },
  { key: 'tipo_solicitacao', label: 'Tipo de Solicitação', icon: <Info className="h-3.5 w-3.5" />, type: 'select', required: true, options: [{ value: 'CONEXÃO DE GD EM UNIDADE CONSUMIDORA EXISTENTE SEM AUMENTO DE POTÊNCIA DISPONIBILIZADA', label: 'Conexão em UC existente sem aumento de PD' }, { value: 'CONEXÃO DE GD EM UNIDADE CONSUMIDORA EXISTENTE COM AUMENTO DE POTÊNCIA DISPONIBILIZADA', label: 'Conexão em UC existente com aumento de PD' }, { value: 'LIGAÇÃO NOVA DE UC COM MICROGERAÇÃO', label: 'Ligação nova com microgeração' }], group: 'Dados do Projeto' },
  { key: 'tarifa_branca', label: 'Tarifa Branca?', type: 'select', required: false, options: [{ value: 'NÃO', label: 'Não' }, { value: 'SIM', label: 'Sim' }], group: 'Dados do Projeto' },
  { key: 'possui_cargas_especiais', label: 'Possui Cargas Especiais?', type: 'select', required: false, options: [{ value: 'NÃO', label: 'Não' }, { value: 'SIM', label: 'Sim' }], group: 'Dados do Projeto' },
  { key: 'carga_declarada_kw', label: 'Carga Declarada da UC (kW)', icon: <Zap className="h-3.5 w-3.5" />, type: 'number', required: true, suffix: 'kW', group: 'Dados do Projeto' },
  { key: 'potencia_disponibilizada_kw', label: 'Potência Disponibilizada — PD (kW)', icon: <Zap className="h-3.5 w-3.5" />, type: 'number', required: true, suffix: 'kW', group: 'Dados do Projeto' },
  { key: 'data_inicio_operacao', label: 'Data Início de Operação', icon: <Calendar className="h-3.5 w-3.5" />, type: 'date', required: true, group: 'Dados do Projeto' },

  // Responsável Técnico
  { key: 'responsavel_nome', label: 'Nome Completo', icon: <User className="h-3.5 w-3.5" />, type: 'text', required: true, group: 'Responsável Técnico' },
  { key: 'responsavel_profissao', label: 'Profissão', type: 'text', required: true, group: 'Responsável Técnico' },
  { key: 'responsavel_registro', label: 'Nº de Registro Profissional', type: 'text', required: true, group: 'Responsável Técnico' },
  { key: 'responsavel_email', label: 'E-mail do Responsável Técnico', type: 'text', required: true, group: 'Responsável Técnico' },
  { key: 'responsavel_uf', label: 'UF do Responsável Técnico', type: 'select', required: true, options: ESTADOS_BR, group: 'Responsável Técnico' },

  // Módulos Fotovoltaicos
  { key: 'modulos_quantidade', label: 'Quantidade de Módulos', icon: <Package className="h-3.5 w-3.5" />, type: 'number', required: true, group: 'Módulos Fotovoltaicos' },
  { key: 'modulos_fabricante', label: 'Fabricante dos Módulos', type: 'text', required: true, group: 'Módulos Fotovoltaicos' },
  { key: 'modulos_modelo', label: 'Modelo dos Módulos', type: 'text', required: true, group: 'Módulos Fotovoltaicos' },
  { key: 'modulos_potencia_wp', label: 'Potência dos Módulos (Wp)', type: 'text', required: true, suffix: 'Wp', group: 'Módulos Fotovoltaicos' },
  { key: 'modulos_area_m2', label: 'Área do Arranjo (m²)', type: 'number', required: true, suffix: 'm²', group: 'Módulos Fotovoltaicos' },

  // Inversores Fotovoltaicos
  { key: 'inversores_quantidade', label: 'Quantidade de Inversores', icon: <Zap className="h-3.5 w-3.5" />, type: 'number', required: true, group: 'Inversores Fotovoltaicos' },
  { key: 'inversores_fabricante', label: 'Fabricante dos Inversores', type: 'text', required: true, group: 'Inversores Fotovoltaicos' },
  { key: 'inversores_modelo', label: 'Modelo dos Inversores', type: 'text', required: true, group: 'Inversores Fotovoltaicos' },
  { key: 'inversores_potencia', label: 'Potência dos Inversores (kW)', type: 'text', required: true, suffix: 'kW', group: 'Inversores Fotovoltaicos' },
  { key: 'inversores_tensao', label: 'Tensão Nominal dos Inversores', type: 'select', required: true, suffix: 'V', options: [{ value: '127', label: '127 V' }, { value: '220', label: '220 V' }, { value: '380', label: '380 V' }, { value: '800', label: '800 V' }], group: 'Inversores Fotovoltaicos' },
  { key: 'inversores_faixa_tensao', label: 'Faixa de Tensão de Operação (V)', type: 'text', required: true, placeholder: 'Ex: 176 - 242', group: 'Inversores Fotovoltaicos' },
  { key: 'inversores_corrente_nominal', label: 'Corrente Nominal (A)', type: 'number', required: true, suffix: 'A', group: 'Inversores Fotovoltaicos' },
  { key: 'inversores_fator_potencia', label: 'Fator de Potência', type: 'text', required: true, placeholder: 'Ex: 1 (Ajustável)', group: 'Inversores Fotovoltaicos' },
  { key: 'inversores_rendimento', label: 'Rendimento (%)', type: 'number', required: true, suffix: '%', group: 'Inversores Fotovoltaicos' },
  { key: 'inversores_dht_corrente', label: 'DHT de Corrente (%)', type: 'text', required: true, placeholder: 'Ex: < 3', group: 'Inversores Fotovoltaicos' },

  // Informações Técnicas
  { key: 'tipo_conexao', label: 'Tipo de Conexão', icon: <Plug className="h-3.5 w-3.5" />, type: 'select', required: true, options: [{ value: 'Monofásico', label: 'Monofásico' }, { value: 'Bifásico', label: 'Bifásico' }, { value: 'Trifásico', label: 'Trifásico' }], group: 'Informações Técnicas' },
  { key: 'tipo_ramal', label: 'Tipo de Ramal', icon: <Plug className="h-3.5 w-3.5" />, type: 'select', required: true, options: [{ value: 'Aéreo', label: 'Aéreo' }, { value: 'Subterrâneo', label: 'Subterrâneo' }], group: 'Informações Técnicas' },
  { key: 'tensao_atendimento', label: 'Tensão de Atendimento (V)', icon: <Zap className="h-3.5 w-3.5" />, type: 'select', required: true, options: [{ value: '127/220', label: '127/220' }, { value: '220/380', label: '220/380' }], group: 'Informações Técnicas' },

  // Dados da Unidade Consumidora
  { key: 'conta_contrato', label: 'Nº Conta Contrato', icon: <Building className="h-3.5 w-3.5" />, type: 'text', required: true, group: 'Dados da Unidade Consumidora' },
  { key: 'classe_uc', label: 'Classe da UC', type: 'select', required: true, options: [{ value: 'Residencial', label: 'Residencial' }, { value: 'Comercial', label: 'Comercial' }, { value: 'Industrial', label: 'Industrial' }, { value: 'Rural', label: 'Rural' }, { value: 'Poder Público', label: 'Poder Público' }], group: 'Dados da Unidade Consumidora' },
  { key: 'numero_poste_transformador', label: 'Nº Poste / Transformador', type: 'text', required: false, group: 'Dados da Unidade Consumidora' },

  // Padrão de Entrada
  { key: 'caixa_medicao_id', label: 'Modelo da Caixa de Medição', icon: <FolderArchive className="h-3.5 w-3.5" />, type: 'acervo_select', required: true, acervoCategoria: 'caixa_medicao', group: 'Padrão de Entrada' },
  { key: 'disjuntor_polos', label: 'Disjuntor — Nº de Polos', icon: <Plug className="h-3.5 w-3.5" />, type: 'select', required: true, options: [{ value: '1', label: '1' }, { value: '2', label: '2' }, { value: '3', label: '3' }], group: 'Padrão de Entrada' },
  { key: 'disjuntor_corrente_a', label: 'Disjuntor — Corrente (A)', icon: <Plug className="h-3.5 w-3.5" />, type: 'select', required: true, options: [{ value: '20', label: '20 A' }, { value: '25', label: '25 A' }, { value: '30', label: '30 A' }, { value: '32', label: '32 A' }, { value: '40', label: '40 A' }, { value: '50', label: '50 A' }, { value: '60', label: '60 A' }, { value: '63', label: '63 A' }, { value: '70', label: '70 A' }, { value: '80', label: '80 A' }, { value: '100', label: '100 A' }, { value: '125', label: '125 A' }, { value: '150', label: '150 A' }, { value: '175', label: '175 A' }, { value: '200', label: '200 A' }, { value: '250', label: '250 A' }], group: 'Padrão de Entrada' },
  { key: 'disjuntor_tensao_v', label: 'Disjuntor — Tensão (V)', type: 'select_or_custom', required: true, suffix: 'V', options: [{ value: '415', label: '415 V' }, { value: 'outro', label: 'Outro' }], group: 'Padrão de Entrada' },
  { key: 'secao_fase_mm2', label: 'Seção Condutores Fase (mm²)', type: 'select', required: true, suffix: 'mm²', options: [{ value: '1,5', label: '1,5 mm²' }, { value: '2,5', label: '2,5 mm²' }, { value: '4', label: '4 mm²' }, { value: '6', label: '6 mm²' }, { value: '10', label: '10 mm²' }, { value: '16', label: '16 mm²' }, { value: '25', label: '25 mm²' }, { value: '35', label: '35 mm²' }, { value: '50', label: '50 mm²' }, { value: '70', label: '70 mm²' }, { value: '95', label: '95 mm²' }, { value: '120', label: '120 mm²' }, { value: '150', label: '150 mm²' }, { value: '185', label: '185 mm²' }, { value: '240', label: '240 mm²' }, { value: '300', label: '300 mm²' }, { value: '400', label: '400 mm²' }, { value: '500', label: '500 mm²' }], group: 'Padrão de Entrada' },
  { key: 'secao_neutro_mm2', label: 'Seção Condutor Neutro (mm²)', type: 'select', required: true, suffix: 'mm²', options: [{ value: '1,5', label: '1,5 mm²' }, { value: '2,5', label: '2,5 mm²' }, { value: '4', label: '4 mm²' }, { value: '6', label: '6 mm²' }, { value: '10', label: '10 mm²' }, { value: '16', label: '16 mm²' }, { value: '25', label: '25 mm²' }, { value: '35', label: '35 mm²' }, { value: '50', label: '50 mm²' }, { value: '70', label: '70 mm²' }, { value: '95', label: '95 mm²' }, { value: '120', label: '120 mm²' }, { value: '150', label: '150 mm²' }, { value: '185', label: '185 mm²' }, { value: '240', label: '240 mm²' }, { value: '300', label: '300 mm²' }, { value: '400', label: '400 mm²' }, { value: '500', label: '500 mm²' }], group: 'Padrão de Entrada' },
  { key: 'secao_aterramento_mm2', label: 'Seção Condutor Aterramento (mm²)', type: 'select', required: true, suffix: 'mm²', options: [{ value: '2,5', label: '2,5 mm²' }, { value: '4', label: '4 mm²' }, { value: '6', label: '6 mm²' }, { value: '10', label: '10 mm²' }, { value: '16', label: '16 mm²' }, { value: '25', label: '25 mm²' }, { value: '35', label: '35 mm²' }, { value: '50', label: '50 mm²' }, { value: '70', label: '70 mm²' }, { value: '95', label: '95 mm²' }], group: 'Padrão de Entrada' },

  // Coordenadas UTM
  { key: 'coord_utm_fuso', label: 'Fuso UTM', icon: <MapPin className="h-3.5 w-3.5" />, type: 'text', required: true, placeholder: 'Ex: 23K', group: 'Coordenadas UTM (Padrão de Entrada)' },
  { key: 'coord_utm_x', label: 'X (Long)', type: 'text', required: true, placeholder: 'Ex: 345678.00', group: 'Coordenadas UTM (Padrão de Entrada)' },
  { key: 'coord_utm_y', label: 'Y (Lat)', type: 'text', required: true, placeholder: 'Ex: 7654321.00', group: 'Coordenadas UTM (Padrão de Entrada)' },

  // Planta de Situação (Imagem)
  { key: 'planta_situacao_url', label: 'Imagem da Planta de Situação', icon: <ImageIcon className="h-3.5 w-3.5" />, type: 'image', required: false, group: 'Planta de Situação' },
];

interface ConferirInformacoesModalProps {
  open: boolean;
  onClose: () => void;
  fields: Record<string, any>;
  onSave: (updatedFields: Record<string, any>) => Promise<void>;
}

interface AcervoItem {
  id: string;
  nome: string;
  imagem_url: string | null;
  descricao: string | null;
  comprimento_mm: number | null;
  altura_mm: number | null;
  largura_mm: number | null;
}

const SKIP_DEFAULT_VALUES: Record<string, string> = {
  numero_poste_transformador: 'Não Identificado',
  planta_situacao_url: 'nao_incluir',
};

function initSkippedFields(fields: Record<string, any>): Set<string> {
  const skipped = new Set<string>();
  for (const [key, defaultVal] of Object.entries(SKIP_DEFAULT_VALUES)) {
    if (fields[key] === defaultVal) {
      skipped.add(key);
    }
  }
  return skipped;
}

export function ConferirInformacoesModal({ open, onClose, fields, onSave }: ConferirInformacoesModalProps) {
  const [localFields, setLocalFields] = useState<Record<string, any>>({ ...fields });
  const [skippedFields, setSkippedFields] = useState<Set<string>>(() => initSkippedFields(fields));
  const [isSaving, setIsSaving] = useState(false);
  const [plantaPreview, setPlantaPreview] = useState<string | null>(fields.planta_situacao_url || null);
  const [plantaFile, setPlantaFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [acervoItems, setAcervoItems] = useState<Record<string, AcervoItem[]>>({});
  const [acervoLoading, setAcervoLoading] = useState<Record<string, boolean>>({});
  const [useOutroResponsavel, setUseOutroResponsavel] = useState(false);
  const [responsavelPrefs, setResponsavelPrefs] = useState<Record<string, string> | null>(null);
  const [responsavelLoading, setResponsavelLoading] = useState(false);
  const [useCustomDate, setUseCustomDate] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLocalFields({ ...fields });
    setSkippedFields(initSkippedFields(fields));
    setPlantaPreview(fields.planta_situacao_url && fields.planta_situacao_url !== 'nao_incluir' ? fields.planta_situacao_url : null);
    setPlantaFile(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!localFields.data_documento) {
      const hoje = new Date();
      const formatted = hoje.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
      setLocalFields(prev => ({ ...prev, data_documento: formatted }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (localFields.responsavel_nome) return;
    setResponsavelLoading(true);
    fetch('/api/admin/config')
      .then(res => res.json())
      .then(json => {
        const rt = json?.data?.responsavel_tecnico;
        if (rt && rt.nomeCompleto) {
          const mapped: Record<string, string> = {
            responsavel_nome: rt.nomeCompleto || '',
            responsavel_profissao: rt.profissao || '',
            responsavel_registro: rt.numeroRegistro || '',
          };
          setResponsavelPrefs(mapped);
          if (!useOutroResponsavel) {
            setLocalFields(prev => ({
              ...prev,
              ...Object.fromEntries(Object.entries(mapped).filter(([k]) => !prev[k])),
            }));
          }
        }
      })
      .catch(() => {})
      .finally(() => setResponsavelLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const fetchAcervoItems = useCallback(async (categoria: string) => {
    const distribuidora = localFields.distribuidora;
    if (!distribuidora) return;
    const cacheKey = `${distribuidora}_${categoria}`;
    if (acervoItems[cacheKey]) return;

    setAcervoLoading(prev => ({ ...prev, [cacheKey]: true }));
    try {
      const params = new URLSearchParams({ distribuidora, categoria });
      const resp = await fetch(`/api/acervo-tecnico?${params.toString()}`);
      const result = await resp.json();
      setAcervoItems(prev => ({ ...prev, [cacheKey]: result.data || [] }));
    } catch {
      setAcervoItems(prev => ({ ...prev, [cacheKey]: [] }));
    } finally {
      setAcervoLoading(prev => ({ ...prev, [cacheKey]: false }));
    }
  }, [localFields.distribuidora, acervoItems]);

  useEffect(() => {
    if (!open || !localFields.distribuidora) return;
    const acervoFields = FIELD_DEFINITIONS.filter(f => f.type === 'acervo_select');
    for (const field of acervoFields) {
      if (field.acervoCategoria) fetchAcervoItems(field.acervoCategoria);
    }
  }, [open, localFields.distribuidora, fetchAcervoItems]);

  const handleFieldChange = (key: string, value: any) => {
    setLocalFields(prev => ({ ...prev, [key]: value }));
  };

  const toggleSkip = (key: string) => {
    setSkippedFields(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        if (SKIP_DEFAULT_VALUES[key]) handleFieldChange(key, '');
        if (key === 'planta_situacao_url') {
          setPlantaPreview(null);
          setPlantaFile(null);
        }
      } else {
        next.add(key);
        if (SKIP_DEFAULT_VALUES[key]) handleFieldChange(key, SKIP_DEFAULT_VALUES[key]);
        if (key === 'planta_situacao_url') {
          setPlantaPreview(null);
          setPlantaFile(null);
        }
      }
      return next;
    });
  };

  const getFieldValue = (key: string): string => {
    const val = localFields[key];
    if (key === 'havera_beneficiarias') {
      if (val === true) return 'sim';
      if (val === false) return 'nao';
      return '';
    }
    if (val === 0 || val === null || val === undefined) return '';
    return String(val);
  };

  const isFieldFilled = (key: string): boolean => {
    if (skippedFields.has(key)) return true;
    const val = localFields[key];
    if (key === 'havera_beneficiarias') return val === true || val === false;
    if (key === 'planta_situacao_url') return !!(val || plantaFile);
    if (typeof val === 'number') return val > 0;
    return !!val && String(val).trim() !== '';
  };

  const { filledCount, requiredCount, totalFilledRequired } = useMemo(() => {
    const requiredFields = FIELD_DEFINITIONS.filter(f => f.required);
    const requiredFilled = requiredFields.filter(f => isFieldFilled(f.key)).length;
    return {
      filledCount: FIELD_DEFINITIONS.filter(f => isFieldFilled(f.key)).length,
      requiredCount: requiredFields.length,
      totalFilledRequired: requiredFilled,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localFields, skippedFields, plantaFile]);

  const progressPercent = Math.round((totalFilledRequired / requiredCount) * 100);

  const groups = useMemo(() => {
    const map = new Map<string, FieldDef[]>();
    for (const field of FIELD_DEFINITIONS) {
      if (!map.has(field.group)) map.set(field.group, []);
      map.get(field.group)!.push(field);
    }
    return map;
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const dataToSave = { ...localFields };

      if (plantaFile) {
        dataToSave._plantaFile = plantaFile;
      }

      await onSave(dataToSave);
      onClose();
    } catch {
      // error handled by parent
    } finally {
      setIsSaving(false);
    }
  };

  const handlePlantaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    setPlantaFile(file);
    const url = URL.createObjectURL(file);
    setPlantaPreview(url);
    handleFieldChange('planta_situacao_url', 'pending_upload');
  };

  const renderFieldInput = (field: FieldDef) => {
    const value = getFieldValue(field.key);
    const isSkipped = skippedFields.has(field.key);

    if (field.type === 'image') {
      return (
        <div className={isSkipped ? 'opacity-40 pointer-events-none' : ''}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePlantaUpload}
          />
          {plantaPreview ? (
            <div className="space-y-2">
              <img
                src={plantaPreview}
                alt="Planta de Situação"
                className="max-h-32 rounded-md border border-gray-200 dark:border-gray-700 object-contain"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs"
              >
                <Upload className="h-3 w-3 mr-1" /> Alterar imagem
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs"
            >
              <Upload className="h-3 w-3 mr-1" /> Selecionar imagem
            </Button>
          )}
        </div>
      );
    }

    if (field.type === 'acervo_select' && field.acervoCategoria) {
      const cacheKey = `${localFields.distribuidora}_${field.acervoCategoria}`;
      const items = acervoItems[cacheKey] || [];
      const isLoading = acervoLoading[cacheKey];
      const selectedItem = items.find(i => i.id === value);

      if (!localFields.distribuidora) {
        return <p className="text-xs text-amber-600 italic">Selecione a distribuidora primeiro.</p>;
      }

      if (isLoading) {
        return <p className="text-xs text-gray-400 italic">Carregando acervo...</p>;
      }

      if (items.length === 0) {
        return (
          <div className="rounded-md border border-dashed border-amber-300 dark:border-amber-700 p-3 bg-amber-50 dark:bg-amber-900/20">
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Nenhum item cadastrado no acervo para <strong>{localFields.distribuidora}</strong>.
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
              Cadastre modelos em <strong>Acervo Técnico</strong> na sidebar.
            </p>
          </div>
        );
      }

      return (
        <div className={isSkipped ? 'opacity-40 pointer-events-none' : 'space-y-2'}>
          <Select
            value={value}
            onValueChange={(val) => {
              handleFieldChange(field.key, val);
              const item = items.find(i => i.id === val);
              if (item) {
                handleFieldChange('caixa_medicao_imagem_url', item.imagem_url || '');
                handleFieldChange('caixa_medicao_nome', item.nome || '');
                handleFieldChange('caixa_medicao_comprimento_mm', item.comprimento_mm?.toString() || '');
                handleFieldChange('caixa_medicao_altura_mm', item.altura_mm?.toString() || '');
                handleFieldChange('caixa_medicao_largura_mm', item.largura_mm?.toString() || '');
              }
            }}
            disabled={isSkipped}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Selecione o modelo" />
            </SelectTrigger>
            <SelectContent position="popper" side="bottom" className="max-h-60">
              {items.map(item => (
                <SelectItem key={item.id} value={item.id}>{item.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedItem?.imagem_url && (
            <img
              src={selectedItem.imagem_url}
              alt={selectedItem.nome}
              className="max-h-24 rounded-md border border-gray-200 dark:border-gray-700 object-contain"
            />
          )}
        </div>
      );
    }

    if (field.type === 'select') {
      return (
        <Select
          value={value}
          onValueChange={(val) => {
            if (field.key === 'havera_beneficiarias') {
              handleFieldChange(field.key, val === 'sim' ? true : val === 'nao' ? false : undefined);
            } else if (field.key === 'disjuntor_polos') {
              handleFieldChange(field.key, Number(val));
            } else {
              handleFieldChange(field.key, val);
            }
          }}
          disabled={isSkipped}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent position="popper" side="bottom" className="max-h-60">
            {field.options?.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (field.type === 'select_or_custom') {
      const predefinedValues = (field.options || []).filter(o => o.value !== 'outro').map(o => o.value);
      const isCustom = value !== undefined && value !== null && !predefinedValues.includes(String(value));
      const selectVal = isCustom ? 'outro' : (value || '');
      return (
        <div className="space-y-2">
          <Select
            value={selectVal}
            onValueChange={(val) => {
              if (val === 'outro') {
                handleFieldChange(field.key, ' ');
              } else {
                handleFieldChange(field.key, val);
              }
            }}
            disabled={isSkipped}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent position="popper" side="bottom" className="max-h-60">
              {field.options?.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isCustom && (
            <Input
              type="text"
              value={String(value).trim()}
              onChange={(e) => handleFieldChange(field.key, e.target.value || ' ')}
              placeholder="Digite o valor em Volts"
              className="h-8 text-sm"
              autoFocus
            />
          )}
        </div>
      );
    }

    if (field.type === 'date') {
      return (
        <div className="space-y-2">
          <Input
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            placeholder="Ex: 23 de março de 2026"
            className="h-8 text-sm"
            disabled={isSkipped || (field.key === 'data_documento' && !useCustomDate)}
          />
          {field.key === 'data_documento' && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="use-custom-date"
                checked={useCustomDate}
                onCheckedChange={(checked) => {
                  const isChecked = !!checked;
                  setUseCustomDate(isChecked);
                  if (!isChecked) {
                    const hoje = new Date();
                    const formatted = hoje.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
                    handleFieldChange('data_documento', formatted);
                  }
                }}
              />
              <Label htmlFor="use-custom-date" className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                Utilizar uma data diferente
              </Label>
            </div>
          )}
        </div>
      );
    }

    return (
      <Input
        type={field.type === 'number' ? 'number' : 'text'}
        step={field.type === 'number' ? '0.01' : undefined}
        value={value}
        onChange={(e) => {
          const v = field.type === 'number' ? (e.target.value ? Number(e.target.value) : 0) : e.target.value;
          handleFieldChange(field.key, v);
        }}
        placeholder={field.placeholder || ''}
        className="h-8 text-sm"
        disabled={isSkipped}
      />
    );
  };

  const getStatusIcon = (field: FieldDef) => {
    if (skippedFields.has(field.key)) {
      return <MinusCircle className="h-4 w-4 text-gray-400 flex-shrink-0" />;
    }
    if (isFieldFilled(field.key)) {
      return <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />;
    }
    if (field.required) {
      return <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />;
    }
    return <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0" />;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Conferir Informações do Projeto
          </DialogTitle>
          <DialogDescription>
            Preencha as informações necessárias para a geração dos documentos.
          </DialogDescription>
          <div className="mt-3">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-600 dark:text-gray-400">
                Campos obrigatórios: <strong className="text-green-600">{totalFilledRequired}</strong>/{requiredCount}
              </span>
              <span className="font-medium text-green-600">{progressPercent}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-500" /> Preenchido</span>
              <span className="flex items-center gap-1"><AlertCircle className="h-3 w-3 text-red-500" /> Obrigatório</span>
              <span className="flex items-center gap-1"><AlertCircle className="h-3 w-3 text-amber-400" /> Opcional</span>
              <span className="flex items-center gap-1"><MinusCircle className="h-3 w-3 text-gray-400" /> Ignorado</span>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1 space-y-6 mt-2">
          {Array.from(groups.entries()).map(([groupName, groupFields]) => (
            <div key={groupName}>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2 sticky top-0 bg-background py-1 z-10">
                <Badge variant="outline" className="text-xs">{groupName}</Badge>
                <span className="text-xs text-gray-400">
                  {groupFields.filter(f => isFieldFilled(f.key)).length}/{groupFields.length}
                </span>
              </h3>
              {groupName === 'Responsável Técnico' && (
                <div className="mb-3 space-y-2">
                  {responsavelLoading ? (
                    <p className="text-xs text-gray-400 italic">Carregando dados das preferências...</p>
                  ) : !responsavelPrefs ? (
                    <div className="rounded-md border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-3">
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        <AlertCircle className="h-3.5 w-3.5 inline mr-1" />
                        Nenhum responsável técnico cadastrado nas <strong>Preferências &gt; Documentos</strong>. Preencha os campos abaixo manualmente.
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="use-outro-responsavel"
                        checked={useOutroResponsavel}
                        onCheckedChange={(checked) => {
                          const isChecked = !!checked;
                          setUseOutroResponsavel(isChecked);
                          if (isChecked) {
                            setLocalFields(prev => ({
                              ...prev,
                              responsavel_nome: '',
                              responsavel_profissao: '',
                              responsavel_registro: '',
                            }));
                          } else if (responsavelPrefs) {
                            setLocalFields(prev => ({ ...prev, ...responsavelPrefs }));
                          }
                        }}
                      />
                      <Label htmlFor="use-outro-responsavel" className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                        Utilizar dados de outro responsável técnico
                      </Label>
                    </div>
                  )}
                </div>
              )}
              <div className="space-y-3">
                {groupFields.map(field => (
                  <div key={field.key} className="flex items-start gap-3 group">
                    <div className="mt-2">
                      {getStatusIcon(field)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        {field.icon}
                        <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-0.5">*</span>}
                        </Label>
                      </div>
                      {renderFieldInput(field)}
                    </div>
                    {!field.required && (
                      <div className="flex items-center gap-1.5 mt-7 flex-shrink-0">
                        <Checkbox
                          id={`skip-${field.key}`}
                          checked={skippedFields.has(field.key)}
                          onCheckedChange={() => toggleSkip(field.key)}
                        />
                        <Label htmlFor={`skip-${field.key}`} className="text-xs text-gray-400 whitespace-nowrap cursor-pointer">
                          Não incluir
                        </Label>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="mt-4 border-t pt-4">
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            <X className="h-4 w-4 mr-1" /> Fechar
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-green-600 hover:bg-green-700 text-white">
            <Save className="h-4 w-4 mr-1" />
            {isSaving ? 'Salvando...' : 'Salvar Progresso'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function useConferirProgress(fields: Record<string, any>): { filled: number; total: number } {
  return useMemo(() => {
    const requiredFields = FIELD_DEFINITIONS.filter(f => f.required);
    let filled = 0;
    for (const f of requiredFields) {
      const val = fields[f.key];
      if (f.key === 'havera_beneficiarias') {
        if (val === true || val === false) filled++;
      } else if (typeof val === 'number') {
        if (val > 0) filled++;
      } else if (val && String(val).trim() !== '') {
        filled++;
      }
    }
    return { filled, total: requiredFields.length };
  }, [fields]);
}
