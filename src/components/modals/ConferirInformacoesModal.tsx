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
  Package, Settings, Building, Upload, ImageIcon, FolderArchive, Calendar,
  ClipboardList
} from 'lucide-react';
import { EquipamentoListEditor } from './EquipamentoListEditor';
import { getAllModulos, getAllInversores } from '@/lib/utils/equipmentParser';
import type { ModuloItem, InversorItem } from '@/lib/utils/equipmentParser';

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

type FieldType = 'text' | 'number' | 'select' | 'select_or_custom' | 'date' | 'image' | 'acervo_select' | 'default_with_custom' | 'temp_fator_select' | 'strings_config';

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
  defaultValue?: string | ((fields: Record<string, any>) => string);
}

const PVC_TEMP_OPTIONS = [
  { value: '1,06', label: '1,06 (25ºC)' },
  { value: '0,94', label: '0,94 (35ºC)' },
  { value: '0,87', label: '0,87 (40ºC)' },
  { value: '0,79', label: '0,79 (45ºC)' },
  { value: '0,71', label: '0,71 (50ºC)' },
];

const EPR_TEMP_OPTIONS = [
  { value: '1,04', label: '1,04 (25ºC)' },
  { value: '0,96', label: '0,96 (35ºC)' },
  { value: '0,91', label: '0,91 (40ºC)' },
  { value: '0,87', label: '0,87 (45ºC)' },
  { value: '0,82', label: '0,82 (50ºC)' },
];

const AGRUPAMENTO_OPTIONS = [
  { value: '1', label: '1 (sem agrupamento)' },
  { value: '0,8', label: '0,8 (2 circuitos agrupados)' },
  { value: '0,7', label: '0,7 (3 circuitos)' },
  { value: '0,65', label: '0,65 (4 circuitos)' },
  { value: '0,6', label: '0,6 (5 circuitos)' },
  { value: '0,57', label: '0,57 (6 circuitos)' },
  { value: '0,54', label: '0,54 (7 circuitos)' },
  { value: '0,52', label: '0,52 (8 circuitos)' },
  { value: '0,5', label: '0,5 (de 9 a 11 circuitos)' },
  { value: '0,45', label: '0,45 (de 12 a 15 circuitos)' },
  { value: '0,41', label: '0,41 (de 16 a 19 circuitos)' },
  { value: '0,38', label: '0,38 (>= 20 circuitos)' },
];

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
  { key: 'tipo_solicitacao', label: 'Tipo de Solicitação', icon: <Info className="h-3.5 w-3.5" />, type: 'select', required: true, options: [
    { value: 'LIGAÇÃO NOVA DE UNIDADE CONSUMIDORA COM GERAÇÃO DISTRIBUÍDA', label: 'LIGAÇÃO NOVA DE UNIDADE CONSUMIDORA COM GERAÇÃO DISTRIBUÍDA' },
    { value: 'CONEXÃO DE GD EM UNIDADE CONSUMIDORA EXISTENTE SEM AUMENTO DE POTÊNCIA DISPONIBILIZADA', label: 'CONEXÃO DE GD EM UNIDADE CONSUMIDORA EXISTENTE SEM AUMENTO DE POTÊNCIA DISPONIBILIZADA' },
    { value: 'CONEXÃO DE GD EM UNIDADE CONSUMIDORA EXISTENTE COM AUMENTO DE POTÊNCIA DISPONIBILIZADA', label: 'CONEXÃO DE GD EM UNIDADE CONSUMIDORA EXISTENTE COM AUMENTO DE POTÊNCIA DISPONIBILIZADA' },
    { value: 'AUMENTO DA POTÊNCIA DE GERAÇÃO EM UC COM GD EXISTENTE SEM AUMENTO DE POTÊNCIA DISPONIBILIZADA', label: 'AUMENTO DA POTÊNCIA DE GERAÇÃO EM UC COM GD EXISTENTE SEM AUMENTO DE POTÊNCIA DISPONIBILIZADA' },
    { value: 'AUMENTO DA POTÊNCIA DE GERAÇÃO EM UC COM GD EXISTENTE COM AUMENTO DE POTÊNCIA DISPONIBILIZADA', label: 'AUMENTO DA POTÊNCIA DE GERAÇÃO EM UC COM GD EXISTENTE COM AUMENTO DE POTÊNCIA DISPONIBILIZADA' },
  ], group: 'Dados do Projeto' },
  { key: 'tarifa_branca', label: 'Tarifa Branca?', type: 'select', required: false, options: [{ value: 'NÃO', label: 'Não' }, { value: 'SIM', label: 'Sim' }], group: 'Dados do Projeto' },
  { key: 'possui_cargas_especiais', label: 'Possui Cargas Especiais?', type: 'select', required: false, options: [{ value: 'NÃO', label: 'Não' }, { value: 'SIM', label: 'Sim' }], group: 'Dados do Projeto' },
  { key: 'carga_declarada_kw', label: 'Carga Declarada da UC (kW)', icon: <Zap className="h-3.5 w-3.5" />, type: 'default_with_custom', required: true, suffix: 'kW', defaultValue: '8,00', group: 'Dados do Projeto' },
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
  { key: 'modulos_total_strings', label: 'Total de Strings', type: 'strings_config', required: true, group: 'Módulos Fotovoltaicos' },
  { key: 'modulos_potencia_wp', label: 'Potência dos Módulos (Wp)', type: 'text', required: true, suffix: 'Wp', group: 'Módulos Fotovoltaicos' },
  { key: 'modulos_voc', label: 'Tensão de circuito aberto – Voc [V]', type: 'text', required: true, suffix: 'V', group: 'Módulos Fotovoltaicos' },
  { key: 'modulos_isc', label: 'Corrente de curto-circuito – Isc [A]', type: 'text', required: true, suffix: 'A', group: 'Módulos Fotovoltaicos' },
  { key: 'modulos_vpmp', label: 'Tensão de máxima potência – Vpmp [V]', type: 'text', required: true, suffix: 'V', group: 'Módulos Fotovoltaicos' },
  { key: 'modulos_ipmp', label: 'Corrente de máxima potência – Ipmp [A]', type: 'text', required: true, suffix: 'A', group: 'Módulos Fotovoltaicos' },
  { key: 'modulos_eficiencia', label: 'Eficiência [%]', type: 'default_with_custom', required: true, suffix: '%', defaultValue: '22,07', group: 'Módulos Fotovoltaicos' },
  { key: 'modulos_comprimento_m', label: 'Comprimento [m]', type: 'default_with_custom', required: true, suffix: 'm', defaultValue: '2,0', group: 'Módulos Fotovoltaicos' },
  { key: 'modulos_largura_m', label: 'Largura [m]', type: 'default_with_custom', required: true, suffix: 'm', defaultValue: '0,992', group: 'Módulos Fotovoltaicos' },
  { key: 'modulos_area_unitaria_m2', label: 'Área unitária do módulo (m²)', type: 'default_with_custom', required: true, suffix: 'm²', defaultValue: '2,50', group: 'Módulos Fotovoltaicos' },
  { key: 'modulos_peso_kg', label: 'Peso [kg]', type: 'default_with_custom', required: true, suffix: 'kg', defaultValue: '22,2', group: 'Módulos Fotovoltaicos' },
  { key: 'modulos_area_m2', label: 'Área do Arranjo (m²)', type: 'default_with_custom', required: true, suffix: 'm²', defaultValue: (fields) => { const qty = parseFloat(String(fields.modulos_quantidade || '0')); return qty > 0 ? (qty * 2.5).toFixed(2).replace('.', ',') : ''; }, group: 'Módulos Fotovoltaicos' },

  // Inversores Fotovoltaicos
  { key: 'inversores_quantidade', label: 'Quantidade de Inversores', icon: <Zap className="h-3.5 w-3.5" />, type: 'number', required: true, group: 'Inversores Fotovoltaicos' },
  { key: 'inversores_fabricante', label: 'Fabricante dos Inversores', type: 'text', required: true, group: 'Inversores Fotovoltaicos' },
  { key: 'inversores_modelo', label: 'Modelo dos Inversores', type: 'text', required: true, group: 'Inversores Fotovoltaicos' },
  { key: 'inversores_potencia', label: 'Potência nominal – Pn (kW)', type: 'text', required: true, suffix: 'kW', group: 'Inversores Fotovoltaicos' },
  { key: 'inversores_potencia_max_saida', label: 'Máxima potência na saída CA – Pca-máx (kW)', type: 'default_with_custom', required: true, suffix: 'kW', defaultValue: (fields) => fields.inversores_potencia || '', group: 'Inversores Fotovoltaicos' },
  { key: 'inversores_tensao', label: 'Tensão nominal CA (V)', type: 'select', required: true, suffix: 'V', options: [{ value: '127', label: '127 V' }, { value: '220', label: '220 V' }, { value: '380', label: '380 V' }, { value: '800', label: '800 V' }], group: 'Inversores Fotovoltaicos' },
  { key: 'inversores_tensao_max_ca', label: 'Máxima tensão CA – Vca-máx (V) (Limite do Inversor)', type: 'default_with_custom', required: true, suffix: 'V', defaultValue: '300', group: 'Inversores Fotovoltaicos' },
  { key: 'inversores_tensao_min_ca', label: 'Mínima tensão CA – Vca-min (V) (Limite do Inversor)', type: 'default_with_custom', required: true, suffix: 'V', defaultValue: '160', group: 'Inversores Fotovoltaicos' },
  { key: 'inversores_faixa_tensao', label: 'Faixa de Tensão de Operação CC (V)', type: 'default_with_custom', required: true, defaultValue: '176 - 242', group: 'Inversores Fotovoltaicos' },
  { key: 'inversores_vcc_max', label: 'Máxima tensão CC – Vcc-máx [V]', type: 'text', required: true, suffix: 'V', group: 'Inversores Fotovoltaicos' },
  { key: 'inversores_icc_max', label: 'Máxima corrente CC – Icc-máx [A]', type: 'text', required: true, suffix: 'A', group: 'Inversores Fotovoltaicos' },
  { key: 'inversores_vpmp_max', label: 'Máxima tensão MPPT – Vpmp-máx [V]', type: 'text', required: true, suffix: 'V', group: 'Inversores Fotovoltaicos' },
  { key: 'inversores_vpmp_min', label: 'Mínima tensão MPPT – Vpmp-min [V]', type: 'text', required: true, suffix: 'V', group: 'Inversores Fotovoltaicos' },
  { key: 'inversores_vcc_partida', label: 'Tensão CC de partida – Vcc-part [V]', type: 'text', required: true, suffix: 'V', group: 'Inversores Fotovoltaicos' },
  { key: 'inversores_corrente_nominal', label: 'Corrente Nominal CA (A)', type: 'number', required: true, suffix: 'A', group: 'Inversores Fotovoltaicos' },
  { key: 'inversores_quantidade_mppt', label: 'Quantidade de MPPTs', type: 'text', required: true, placeholder: 'Ex: 1', group: 'Inversores Fotovoltaicos' },
  { key: 'inversores_entradas_por_mppt', label: 'Quantidade de entradas por MPPT', type: 'text', required: true, placeholder: 'Ex: 2', group: 'Inversores Fotovoltaicos' },
  { key: 'inversores_tipo_conexao_saida', label: 'Tipo de conexão (fases + neutro + terra)', type: 'select', required: true, options: [{ value: 'F+F+T', label: 'F+F+T' }, { value: 'F+N+T', label: 'F+N+T' }, { value: '3F+N+T', label: '3F+N+T' }], group: 'Inversores Fotovoltaicos' },
  { key: 'tipo_conexao_rede_ca', label: 'Tipo de Conexão de Rede CA', type: 'select', required: true, options: [{ value: 'Monofásico', label: 'Monofásico' }, { value: 'Trifásico', label: 'Trifásico' }], group: 'Inversores Fotovoltaicos' },
  { key: 'disjuntor_ca_corrente_a', label: 'Disjuntor CA de Proteção — Corrente (A)', type: 'default_with_custom', required: true, suffix: 'A', options: [{ value: '10', label: '10 A' }, { value: '16', label: '16 A' }, { value: '20', label: '20 A' }, { value: '25', label: '25 A' }, { value: '30', label: '30 A' }, { value: '32', label: '32 A' }, { value: '40', label: '40 A' }, { value: '50', label: '50 A' }, { value: '60', label: '60 A' }, { value: '63', label: '63 A' }, { value: '70', label: '70 A' }, { value: '80', label: '80 A' }, { value: '100', label: '100 A' }, { value: '125', label: '125 A' }, { value: '150', label: '150 A' }, { value: '175', label: '175 A' }, { value: '200', label: '200 A' }, { value: '250', label: '250 A' }], defaultValue: (fields) => { const i = parseFloat(String(fields.inversores_corrente_nominal || '0')); if (i <= 0) return ''; const calc = i * 1.25; const values = [10, 16, 20, 25, 30, 32, 40, 50, 60, 63, 70, 80, 100, 125, 150, 175, 200, 250]; const nearest = [...values].reverse().find(v => v <= calc); return nearest !== undefined ? String(nearest) : String(values[0]); }, group: 'Inversores Fotovoltaicos' },
  { key: 'disjuntor_ca_polos', label: 'Disjuntor CA de Proteção — Nº de Polos', type: 'select', required: true, options: [{ value: '1', label: '1' }, { value: '2', label: '2' }, { value: '3', label: '3' }], group: 'Inversores Fotovoltaicos' },
  { key: 'inversores_fator_potencia', label: 'Fator de Potência', type: 'default_with_custom', required: true, defaultValue: '1 (Ajustável)', group: 'Inversores Fotovoltaicos' },
  { key: 'inversores_rendimento', label: 'Eficiência máxima (%)', type: 'default_with_custom', required: true, suffix: '%', defaultValue: '97,60', group: 'Inversores Fotovoltaicos' },
  { key: 'inversores_dht_corrente', label: 'THD de corrente (%)', type: 'default_with_custom', required: true, defaultValue: '< 3', group: 'Inversores Fotovoltaicos' },

  // Informações Técnicas (dentro do Padrão de Entrada)
  { key: 'tipo_conexao', label: 'Tipo de Conexão', icon: <Plug className="h-3.5 w-3.5" />, type: 'select', required: true, options: [{ value: 'Monofásico', label: 'Monofásico' }, { value: 'Bifásico', label: 'Bifásico' }, { value: 'Trifásico', label: 'Trifásico' }], group: 'Padrão de Entrada' },
  { key: 'tipo_ramal', label: 'Tipo de Ramal', icon: <Plug className="h-3.5 w-3.5" />, type: 'select', required: true, options: [{ value: 'Aéreo', label: 'Aéreo' }, { value: 'Subterrâneo', label: 'Subterrâneo' }], group: 'Padrão de Entrada' },
  { key: 'tensao_atendimento', label: 'Tensão de Atendimento (V)', icon: <Zap className="h-3.5 w-3.5" />, type: 'select', required: true, options: [{ value: '127/220', label: '127/220' }, { value: '220/380', label: '220/380' }], group: 'Padrão de Entrada' },

  // Dados da Unidade Consumidora
  { key: 'conta_contrato', label: 'Nº Conta Contrato', icon: <Building className="h-3.5 w-3.5" />, type: 'text', required: true, group: 'Dados da Unidade Consumidora' },
  { key: 'classe_uc', label: 'Classe da UC', type: 'select', required: true, options: [{ value: 'Residencial', label: 'Residencial' }, { value: 'Comercial', label: 'Comercial' }, { value: 'Industrial', label: 'Industrial' }, { value: 'Rural', label: 'Rural' }, { value: 'Poder Público', label: 'Poder Público' }], group: 'Dados da Unidade Consumidora' },
  { key: 'numero_poste_transformador', label: 'Nº Poste / Transformador', type: 'text', required: false, group: 'Dados da Unidade Consumidora' },

  // Padrão de Entrada
  { key: 'caixa_medicao_id', label: 'Modelo da Caixa de Medição', icon: <FolderArchive className="h-3.5 w-3.5" />, type: 'acervo_select', required: true, acervoCategoria: 'caixa_medicao', group: 'Padrão de Entrada' },
  { key: 'disjuntor_polos', label: 'Disjuntor — Nº de Polos', icon: <Plug className="h-3.5 w-3.5" />, type: 'select', required: true, options: [{ value: '1', label: '1' }, { value: '2', label: '2' }, { value: '3', label: '3' }], group: 'Padrão de Entrada' },
  { key: 'disjuntor_corrente_a', label: 'Disjuntor — Corrente (A)', icon: <Plug className="h-3.5 w-3.5" />, type: 'select', required: true, options: [{ value: '10', label: '10 A' }, { value: '16', label: '16 A' }, { value: '20', label: '20 A' }, { value: '25', label: '25 A' }, { value: '30', label: '30 A' }, { value: '32', label: '32 A' }, { value: '40', label: '40 A' }, { value: '50', label: '50 A' }, { value: '60', label: '60 A' }, { value: '63', label: '63 A' }, { value: '70', label: '70 A' }, { value: '80', label: '80 A' }, { value: '100', label: '100 A' }, { value: '125', label: '125 A' }, { value: '150', label: '150 A' }, { value: '175', label: '175 A' }, { value: '200', label: '200 A' }, { value: '250', label: '250 A' }], group: 'Padrão de Entrada' },
  { key: 'potencia_disponibilizada_kw', label: 'Potência Disponibilizada — PD (kW)', icon: <Zap className="h-3.5 w-3.5" />, type: 'number', required: true, suffix: 'kW', group: 'Padrão de Entrada' },
  { key: 'disjuntor_tensao_v', label: 'Disjuntor — Tensão (V)', type: 'select_or_custom', required: true, suffix: 'V', options: [{ value: '415', label: '415 V' }, { value: 'outro', label: 'Outro' }], group: 'Padrão de Entrada' },
  { key: 'secao_fase_rl_mm2', label: 'Ramal de Ligação — Seção Condutores Fase (mm²)', type: 'select', required: true, suffix: 'mm²', options: [{ value: '1,5', label: '1,5 mm²' }, { value: '2,5', label: '2,5 mm²' }, { value: '4', label: '4 mm²' }, { value: '6', label: '6 mm²' }, { value: '10', label: '10 mm²' }, { value: '16', label: '16 mm²' }, { value: '25', label: '25 mm²' }, { value: '35', label: '35 mm²' }, { value: '50', label: '50 mm²' }, { value: '70', label: '70 mm²' }, { value: '95', label: '95 mm²' }, { value: '120', label: '120 mm²' }, { value: '150', label: '150 mm²' }, { value: '185', label: '185 mm²' }, { value: '240', label: '240 mm²' }, { value: '300', label: '300 mm²' }, { value: '400', label: '400 mm²' }, { value: '500', label: '500 mm²' }], group: 'Padrão de Entrada' },
  { key: 'secao_neutro_rl_mm2', label: 'Ramal de Ligação — Seção Condutor Neutro (mm²)', type: 'select', required: true, suffix: 'mm²', options: [{ value: '1,5', label: '1,5 mm²' }, { value: '2,5', label: '2,5 mm²' }, { value: '4', label: '4 mm²' }, { value: '6', label: '6 mm²' }, { value: '10', label: '10 mm²' }, { value: '16', label: '16 mm²' }, { value: '25', label: '25 mm²' }, { value: '35', label: '35 mm²' }, { value: '50', label: '50 mm²' }, { value: '70', label: '70 mm²' }, { value: '95', label: '95 mm²' }, { value: '120', label: '120 mm²' }, { value: '150', label: '150 mm²' }, { value: '185', label: '185 mm²' }, { value: '240', label: '240 mm²' }, { value: '300', label: '300 mm²' }, { value: '400', label: '400 mm²' }, { value: '500', label: '500 mm²' }], group: 'Padrão de Entrada' },
  { key: 'secao_fase_mm2', label: 'Ramal de Entrada — Seção Condutores Fase (mm²)', type: 'select', required: true, suffix: 'mm²', options: [{ value: '1,5', label: '1,5 mm²' }, { value: '2,5', label: '2,5 mm²' }, { value: '4', label: '4 mm²' }, { value: '6', label: '6 mm²' }, { value: '10', label: '10 mm²' }, { value: '16', label: '16 mm²' }, { value: '25', label: '25 mm²' }, { value: '35', label: '35 mm²' }, { value: '50', label: '50 mm²' }, { value: '70', label: '70 mm²' }, { value: '95', label: '95 mm²' }, { value: '120', label: '120 mm²' }, { value: '150', label: '150 mm²' }, { value: '185', label: '185 mm²' }, { value: '240', label: '240 mm²' }, { value: '300', label: '300 mm²' }, { value: '400', label: '400 mm²' }, { value: '500', label: '500 mm²' }], group: 'Padrão de Entrada' },
  { key: 'secao_neutro_mm2', label: 'Ramal de Entrada — Seção Condutor Neutro (mm²)', type: 'select', required: true, suffix: 'mm²', options: [{ value: '1,5', label: '1,5 mm²' }, { value: '2,5', label: '2,5 mm²' }, { value: '4', label: '4 mm²' }, { value: '6', label: '6 mm²' }, { value: '10', label: '10 mm²' }, { value: '16', label: '16 mm²' }, { value: '25', label: '25 mm²' }, { value: '35', label: '35 mm²' }, { value: '50', label: '50 mm²' }, { value: '70', label: '70 mm²' }, { value: '95', label: '95 mm²' }, { value: '120', label: '120 mm²' }, { value: '150', label: '150 mm²' }, { value: '185', label: '185 mm²' }, { value: '240', label: '240 mm²' }, { value: '300', label: '300 mm²' }, { value: '400', label: '400 mm²' }, { value: '500', label: '500 mm²' }], group: 'Padrão de Entrada' },
  { key: 'secao_aterramento_mm2', label: 'Ramal de Entrada — Seção Condutor Aterramento (mm²)', type: 'select', required: true, suffix: 'mm²', options: [{ value: '2,5', label: '2,5 mm²' }, { value: '4', label: '4 mm²' }, { value: '6', label: '6 mm²' }, { value: '10', label: '10 mm²' }, { value: '16', label: '16 mm²' }, { value: '25', label: '25 mm²' }, { value: '35', label: '35 mm²' }, { value: '50', label: '50 mm²' }, { value: '70', label: '70 mm²' }, { value: '95', label: '95 mm²' }], group: 'Padrão de Entrada' },

  // Coordenadas UTM
  { key: 'coord_utm_fuso', label: 'Fuso UTM', icon: <MapPin className="h-3.5 w-3.5" />, type: 'text', required: true, placeholder: 'Ex: 23K', group: 'Coordenadas UTM (Padrão de Entrada)' },
  { key: 'coord_utm_x', label: 'X (Long)', type: 'text', required: true, placeholder: 'Ex: 345678.00', group: 'Coordenadas UTM (Padrão de Entrada)' },
  { key: 'coord_utm_y', label: 'Y (Lat)', type: 'text', required: true, placeholder: 'Ex: 7654321.00', group: 'Coordenadas UTM (Padrão de Entrada)' },

  // Planta de Situação (Imagem)
  { key: 'planta_situacao_url', label: 'Imagem da Planta de Situação', icon: <ImageIcon className="h-3.5 w-3.5" />, type: 'image', required: false, group: 'Planta de Situação' },

  // Dimensionamento dos Cabos
  { key: 'cabo_isolacao_material', label: 'Material de Isolação', icon: <Zap className="h-3.5 w-3.5" />, type: 'select', required: true, options: [{ value: 'PVC - 70ºC', label: 'PVC - 70ºC' }, { value: 'EPR/XLPE - 70ºC', label: 'EPR/XLPE - 70ºC' }], group: 'Dimensionamento dos Cabos' },
  { key: 'cabo_cc_secao_mm2', label: 'CC — Seção Transversal (mm²)', icon: <Zap className="h-3.5 w-3.5" />, type: 'text', required: true, placeholder: 'Ex: 4', suffix: 'mm²', group: 'Dimensionamento dos Cabos' },
  { key: 'cabo_cc_capacidade_corrente_a', label: 'CC — Capacidade de Corrente Básica (A)', type: 'text', required: true, placeholder: 'Ex: 36', suffix: 'A', group: 'Dimensionamento dos Cabos' },
  { key: 'cabo_cc_fator_temperatura', label: 'CC — Fator de Correção por Temperatura', type: 'temp_fator_select', required: true, group: 'Dimensionamento dos Cabos' },
  { key: 'cabo_cc_fator_agrupamento', label: 'CC — Fator de Agrupamento', type: 'select', required: true, options: AGRUPAMENTO_OPTIONS, group: 'Dimensionamento dos Cabos' },
  { key: 'cabo_ca_secao_mm2', label: 'CA — Seção Transversal (mm²)', type: 'text', required: true, placeholder: 'Ex: 6', suffix: 'mm²', group: 'Dimensionamento dos Cabos' },
  { key: 'cabo_ca_capacidade_corrente_a', label: 'CA — Capacidade de Corrente Básica (A)', type: 'text', required: true, placeholder: 'Ex: 41', suffix: 'A', group: 'Dimensionamento dos Cabos' },
  { key: 'cabo_ca_fator_temperatura', label: 'CA — Fator de Correção por Temperatura', type: 'temp_fator_select', required: true, group: 'Dimensionamento dos Cabos' },
  { key: 'cabo_ca_fator_agrupamento', label: 'CA — Fator de Agrupamento', type: 'select', required: true, options: AGRUPAMENTO_OPTIONS, group: 'Dimensionamento dos Cabos' },
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

// Campos marcados como "não incluir" quando estão vazios (skipped por padrão)
const DEFAULT_SKIPPED_WHEN_EMPTY = new Set(['cliente_telefone_fixo']);

const SKIP_DEFAULT_VALUES: Record<string, string> = {
  numero_poste_transformador: 'Não Identificado',
  planta_situacao_url: 'nao_incluir',
  cliente_telefone_fixo: 'nao_incluir',
};

function initSkippedFields(fields: Record<string, any>): Set<string> {
  const skipped = new Set<string>();
  for (const [key, defaultVal] of Object.entries(SKIP_DEFAULT_VALUES)) {
    if (fields[key] === defaultVal) skipped.add(key);
  }
  // Campos que devem ser skipped por padrão quando vazios
  for (const key of DEFAULT_SKIPPED_WHEN_EMPTY) {
    const val = fields[key];
    if (!val || val === '' || val === 'nao_incluir') skipped.add(key);
  }
  return skipped;
}

function formatCEP(val: string): string {
  const d = val.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}-${d.slice(5)}`;
}

function formatPhone(val: string): string {
  const d = val.replace(/\D/g, '').slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3, 7)}-${d.slice(7)}`;
}

const PHONE_FIELDS = new Set(['cliente_celular', 'responsavel_legal_telefone']);
const CEP_FIELDS = new Set(['cliente_cep']);

// Detecta quais campos default_with_custom têm valor salvo diferente do seu default padrão,
// para manter o checkbox "Usar outro valor" marcado ao reabrir o modal.
function initCustomOverrides(fields: Record<string, any>): Set<string> {
  const overrides = new Set<string>();
  for (const field of FIELD_DEFINITIONS) {
    if (field.type !== 'default_with_custom') continue;
    const savedVal = fields[field.key];
    if (savedVal === undefined || savedVal === null || savedVal === '') continue;
    const defaultVal = typeof field.defaultValue === 'function'
      ? field.defaultValue(fields)
      : field.defaultValue;
    if (String(savedVal) !== String(defaultVal)) {
      overrides.add(field.key);
    }
  }
  return overrides;
}

// Campos dos grupos de equipamentos que são gerenciados pelo EquipamentoListEditor
const MODULOS_MANAGED_FIELDS = new Set([
  'modulos_fabricante', 'modulos_modelo', 'modulos_potencia_wp',
  'modulos_voc', 'modulos_isc', 'modulos_vpmp', 'modulos_ipmp',
  'modulos_eficiencia', 'modulos_comprimento_m', 'modulos_largura_m',
  'modulos_area_unitaria_m2', 'modulos_peso_kg',
  'modulos_quantidade', 'modulos_total_strings', 'modulos_area_m2',
]);
const INVERSORES_MANAGED_FIELDS = new Set([
  'inversores_fabricante', 'inversores_modelo', 'inversores_potencia',
  'inversores_potencia_max_saida', 'inversores_vcc_max', 'inversores_icc_max',
  'inversores_vpmp_max', 'inversores_vpmp_min', 'inversores_vcc_partida',
  'inversores_corrente_nominal', 'inversores_quantidade_mppt', 'inversores_entradas_por_mppt',
  'inversores_fator_potencia', 'inversores_rendimento', 'inversores_dht_corrente',
  'inversores_quantidade', 'inversores_tensao', 'inversores_tensao_max_ca',
  'inversores_tensao_min_ca', 'inversores_faixa_tensao', 'inversores_tipo_conexao_saida',
  'disjuntor_ca_corrente_a', 'disjuntor_ca_polos',
]);

export function ConferirInformacoesModal({ open, onClose, fields, onSave }: ConferirInformacoesModalProps) {
  const [localFields, setLocalFields] = useState<Record<string, any>>({ ...fields });
  const [skippedFields, setSkippedFields] = useState<Set<string>>(() => initSkippedFields(fields));
  const [customOverrides, setCustomOverrides] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [plantaPreview, setPlantaPreview] = useState<string | null>(fields.planta_situacao_url || null);
  const [plantaFile, setPlantaFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [acervoItems, setAcervoItems] = useState<Record<string, AcervoItem[]>>({});
  const [acervoLoading, setAcervoLoading] = useState<Record<string, boolean>>({});
  const [useOutroResponsavel, setUseOutroResponsavel] = useState(false);
  const [responsavelPrefs, setResponsavelPrefs] = useState<Record<string, string> | null>(null);
  const [responsavelLoading, setResponsavelLoading] = useState(false);
  const [useOutroResponsavelLegal, setUseOutroResponsavelLegal] = useState(false);
  const [useCustomDate, setUseCustomDate] = useState(false);

  // Listas de múltiplos modelos (novo formato)
  const [modulosList, setModulosList] = useState<ModuloItem[]>([]);
  const [inversoresList, setInversoresList] = useState<InversorItem[]>([]);

  useEffect(() => {
    if (!open) return;
    // Aplica formatação nos campos de telefone e CEP ao carregar valores salvos
    const formatted = { ...fields };
    for (const key of PHONE_FIELDS) {
      if (formatted[key]) formatted[key] = formatPhone(String(formatted[key]));
    }
    for (const key of CEP_FIELDS) {
      if (formatted[key]) formatted[key] = formatCEP(String(formatted[key]));
    }
    setLocalFields(formatted);
    setSkippedFields(initSkippedFields(formatted));
    setCustomOverrides(initCustomOverrides(fields));
    setUseOutroResponsavelLegal(false);
    setPlantaPreview(fields.planta_situacao_url && fields.planta_situacao_url !== 'nao_incluir' ? fields.planta_situacao_url : null);
    setPlantaFile(null);
    // Inicializa listas de equipamentos (fallback para campos antigos se lista estiver vazia)
    const mods = getAllModulos(fields);
    setModulosList(mods.length > 0 ? mods : [{ fabricante: '', modelo: '', potencia_wp: '', quantidade: '1' }]);
    const invs = getAllInversores(fields);
    setInversoresList(invs.length > 0 ? invs : [{ fabricante: '', modelo: '', potencia: '', quantidade: '1' }]);
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

  // Auto-fill default_with_custom fields when modal opens or modulos_quantidade changes.
  // Regra:
  //   - Campo com defaultValue fixo (string): só preenche se estiver vazio
  //   - Campo com defaultValue computado (função): recomputa sempre que não estiver em customOverrides
  useEffect(() => {
    if (!open) return;
    setLocalFields(prev => {
      const updates: Record<string, any> = {};
      for (const field of FIELD_DEFINITIONS) {
        if (field.type !== 'default_with_custom') continue;
        if (customOverrides.has(field.key)) continue;
        const isComputed = typeof field.defaultValue === 'function';
        const currentVal = prev[field.key];
        const isEmpty = currentVal === undefined || currentVal === null || currentVal === '';
        // Para defaults estáticos, só aplica se o campo estiver vazio
        if (!isComputed && !isEmpty) continue;
        const defaultVal = isComputed
          ? (field.defaultValue as (f: Record<string, any>) => string)(prev)
          : field.defaultValue as string;
        if (defaultVal !== undefined && defaultVal !== '') {
          updates[field.key] = defaultVal;
        }
      }
      return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, localFields.modulos_quantidade, localFields.inversores_potencia, localFields.inversores_corrente_nominal]);

  useEffect(() => {
    if (!open) return;
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
            ...(rt.email ? { responsavel_email: rt.email } : {}),
            ...(rt.uf ? { responsavel_uf: rt.uf } : {}),
            ...(rt.telefone ? { _telefone: rt.telefone } : {}),
          };
          setResponsavelPrefs(mapped);
          if (!useOutroResponsavel) {
            setLocalFields(prev => ({
              ...prev,
              ...Object.fromEntries(Object.entries(mapped).filter(([k]) => !k.startsWith('_') && !prev[k])),
              // Preenche Responsável Legal com dados do técnico (nome só se vazio, email/telefone sempre se vazios)
              ...(!useOutroResponsavelLegal
                ? {
                    ...(!prev.responsavel_legal_nome ? { responsavel_legal_nome: rt.nomeCompleto } : {}),
                    ...(!prev.responsavel_legal_email && rt.email ? { responsavel_legal_email: rt.email } : {}),
                    ...(!prev.responsavel_legal_telefone && rt.telefone ? { responsavel_legal_telefone: formatPhone(rt.telefone) } : {}),
                  }
                : {}),
            }));
          }
        }
      })
      .catch(() => {})
      .finally(() => setResponsavelLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Quando o RT já está preenchido (dados salvos), copia para o Responsável Legal se os campos estiverem vazios
  useEffect(() => {
    if (!open) return;
    if (useOutroResponsavelLegal) return;
    setLocalFields(prev => {
      if (!prev.responsavel_nome) return prev;
      const updates: Record<string, string> = {};
      if (!prev.responsavel_legal_nome) updates.responsavel_legal_nome = prev.responsavel_nome;
      if (!prev.responsavel_legal_email && prev.responsavel_email) updates.responsavel_legal_email = prev.responsavel_email;
      return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Auto-preenche Disjuntor — Nº de Polos baseado no Tipo de Conexão
  useEffect(() => {
    const tipoConexao = localFields.tipo_conexao;
    if (!tipoConexao) return;
    const polos = tipoConexao === 'Trifásico' ? 3 : tipoConexao === 'Bifásico' ? 2 : 1;
    setLocalFields(prev => ({ ...prev, disjuntor_polos: polos }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localFields.tipo_conexao]);

  // Auto-calcula Potência Disponibilizada (PD) quando tipo_conexao, tensao_atendimento e disjuntor_corrente_a são preenchidos
  useEffect(() => {
    const tipoConexao = localFields.tipo_conexao;
    const tensaoAtendimento = localFields.tensao_atendimento;
    const corrente = localFields.disjuntor_corrente_a;
    if (!tipoConexao || !tensaoAtendimento || !corrente) return;

    // Extrai a tensão de linha (maior valor em "127/220", "220/380", etc.)
    const voltages = String(tensaoAtendimento).split('/').map((v: string) => parseFloat(v.trim())).filter((v: number) => !isNaN(v));
    if (voltages.length === 0) return;
    const tensaoLinha = Math.max(...voltages);

    const correnteNum = parseFloat(String(corrente));
    if (isNaN(tensaoLinha) || isNaN(correnteNum)) return;

    const NF = tipoConexao === 'Trifásico' ? Math.sqrt(3) : 1;
    const pdKw = Math.floor((NF * tensaoLinha * correnteNum * 0.92) / 1000);

    setLocalFields(prev => ({ ...prev, potencia_disponibilizada_kw: String(pdKw) }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localFields.tipo_conexao, localFields.tensao_atendimento, localFields.disjuntor_corrente_a]);

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

  // Sincroniza o primeiro item da lista de módulos de volta para os campos antigos (backward compat)
  function syncModulosOldFields(list: ModuloItem[]): Record<string, any> {
    const first = list[0];
    if (!first) return {};
    const qty = list.reduce((acc, m) => acc + (parseInt(String(m.quantidade || '1')) || 1), 0);
    return {
      modulos_fabricante: first.fabricante || '',
      modulos_modelo: first.modelo || '',
      modulos_potencia_wp: first.potencia_wp || '',
      modulos_quantidade: qty > 0 ? String(qty) : String(parseInt(String(first.quantidade || '1')) || 1),
      modulos_voc: first.voc || '',
      modulos_isc: first.isc || '',
      modulos_vpmp: first.vpmp || '',
      modulos_ipmp: first.ipmp || '',
      modulos_eficiencia: first.eficiencia || '',
      modulos_comprimento_m: first.comprimento_m || '',
      modulos_largura_m: first.largura_m || '',
      modulos_area_unitaria_m2: first.area_unitaria_m2 || '',
      modulos_peso_kg: first.peso_kg || '',
      modulos_total_strings: first.total_strings || '',
      modulos_strings_modulos: first.strings_modulos || '[]',
      modulos_microinversor: first.is_microinversor || 'false',
      modulos_area_m2: first.area_m2 || '',
    };
  }

  // Sincroniza o primeiro item da lista de inversores de volta para os campos antigos (backward compat)
  function syncInversoresOldFields(list: InversorItem[]): Record<string, any> {
    const first = list[0];
    if (!first) return {};
    const qty = list.reduce((acc, i) => acc + (parseInt(String(i.quantidade || '1')) || 1), 0);
    return {
      inversores_fabricante: first.fabricante || '',
      inversores_modelo: first.modelo || '',
      inversores_potencia: first.potencia || '',
      inversores_quantidade: qty > 0 ? String(qty) : String(parseInt(String(first.quantidade || '1')) || 1),
      inversores_potencia_max_saida: first.potencia_max_saida || '',
      inversores_vcc_max: first.vcc_max || '',
      inversores_icc_max: first.icc_max || '',
      inversores_vpmp_max: first.vpmp_max || '',
      inversores_vpmp_min: first.vpmp_min || '',
      inversores_vcc_partida: first.vcc_partida || '',
      inversores_corrente_nominal: first.corrente_nominal || '',
      inversores_quantidade_mppt: first.quantidade_mppt || '',
      inversores_entradas_por_mppt: first.entradas_por_mppt || '',
      inversores_fator_potencia: first.fator_potencia || '',
      inversores_rendimento: first.rendimento || '',
      inversores_dht_corrente: first.dht_corrente || '',
      inversores_tensao: first.tensao || '',
      inversores_tensao_max_ca: first.tensao_max_ca || '',
      inversores_tensao_min_ca: first.tensao_min_ca || '',
      inversores_faixa_tensao: first.faixa_tensao || '',
      inversores_tipo_conexao_saida: first.tipo_conexao_saida || '',
      disjuntor_ca_corrente_a: first.disjuntor_ca_corrente_a || '',
      disjuntor_ca_polos: first.disjuntor_ca_polos || '',
    };
  }

  // Mantém localFields em sincronia com as listas para o contador de progresso
  useEffect(() => {
    if (!open) return;
    const synced = syncModulosOldFields(modulosList);
    if (Object.keys(synced).length > 0) {
      setLocalFields(prev => ({ ...prev, ...synced }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modulosList]);

  useEffect(() => {
    if (!open) return;
    const synced = syncInversoresOldFields(inversoresList);
    if (Object.keys(synced).length > 0) {
      setLocalFields(prev => ({ ...prev, ...synced }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inversoresList]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const dataToSave = {
        ...localFields,
        // Sincroniza campos antigos do primeiro item (backward compat com templates)
        ...syncModulosOldFields(modulosList),
        ...syncInversoresOldFields(inversoresList),
        // Salva as listas completas no novo formato
        modulos_lista: JSON.stringify(modulosList),
        inversores_lista: JSON.stringify(inversoresList),
      };

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
          <SelectTrigger className="h-auto min-h-8 text-sm py-1.5 [&>span]:whitespace-normal [&>span]:text-left [&>span]:leading-snug">
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

    if (field.type === 'temp_fator_select') {
      const material = localFields.cabo_isolacao_material;
      const isPVC = material === 'PVC - 70ºC';
      const isEPR = typeof material === 'string' && material.startsWith('EPR');
      const opts = isPVC ? PVC_TEMP_OPTIONS : isEPR ? EPR_TEMP_OPTIONS : null;

      if (!material) {
        return <p className="text-xs text-amber-600 italic">Selecione o Material de Isolação primeiro.</p>;
      }

      return (
        <Select
          value={value}
          onValueChange={(val) => handleFieldChange(field.key, val)}
          disabled={isSkipped}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Selecione a temperatura" />
          </SelectTrigger>
          <SelectContent position="popper" side="bottom" className="max-h-60">
            {(opts || []).map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (field.type === 'default_with_custom') {
      const isOverriding = customOverrides.has(field.key);
      return (
        <div className="flex items-center gap-2">
          {field.options ? (
            <Select
              value={value}
              onValueChange={(v) => handleFieldChange(field.key, v)}
              disabled={isSkipped}
            >
              <SelectTrigger className="h-8 text-sm flex-1">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {field.options.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              type="text"
              value={value}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              className="h-8 text-sm flex-1"
              disabled={!isOverriding || isSkipped}
            />
          )}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Checkbox
              id={`override-${field.key}`}
              checked={isOverriding}
              onCheckedChange={(checked) => {
                const nowOverriding = !!checked;
                setCustomOverrides(prev => {
                  const next = new Set(prev);
                  if (nowOverriding) {
                    next.add(field.key);
                  } else {
                    next.delete(field.key);
                    // restore default
                    const defaultVal = typeof field.defaultValue === 'function'
                      ? field.defaultValue(localFields)
                      : field.defaultValue;
                    if (defaultVal !== undefined) handleFieldChange(field.key, defaultVal);
                  }
                  return next;
                });
              }}
            />
            <Label htmlFor={`override-${field.key}`} className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap cursor-pointer">
              Usar outro valor
            </Label>
          </div>
        </div>
      );
    }

    if (field.type === 'date') {
      return (
        <div className="flex items-center gap-2">
          <Input
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            placeholder="Ex: 23 de março de 2026"
            className="h-8 text-sm flex-1"
            disabled={isSkipped || (field.key === 'data_documento' && !useCustomDate)}
          />
          {field.key === 'data_documento' && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
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
              <Label htmlFor="use-custom-date" className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap cursor-pointer">
                Usar data diferente
              </Label>
            </div>
          )}
        </div>
      );
    }

    if (field.type === 'strings_config') {
      const isMicro = localFields.modulos_microinversor === 'true';
      const totalStrings = parseInt(String(localFields.modulos_total_strings || '0')) || 0;
      let stringsModulos: string[] = [];
      try {
        const parsed = JSON.parse(localFields.modulos_strings_modulos || '[]');
        stringsModulos = Array.isArray(parsed) ? parsed : [];
      } catch { stringsModulos = []; }

      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="1"
              value={isMicro ? '' : (localFields.modulos_total_strings || '')}
              disabled={isMicro || isSkipped}
              onChange={(e) => {
                handleFieldChange('modulos_total_strings', e.target.value);
                const n = parseInt(e.target.value) || 0;
                const arr = Array.from({ length: n }, (_, i) => stringsModulos[i] || '');
                handleFieldChange('modulos_strings_modulos', JSON.stringify(arr));
              }}
              placeholder="Nº de strings"
              className="h-8 text-sm flex-1"
            />
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Checkbox
                id="modulos-microinversor"
                checked={isMicro}
                onCheckedChange={(checked) => {
                  const nowMicro = !!checked;
                  handleFieldChange('modulos_microinversor', nowMicro ? 'true' : 'false');
                  if (nowMicro) {
                    handleFieldChange('modulos_total_strings', '');
                    handleFieldChange('modulos_strings_modulos', '[]');
                  }
                }}
                disabled={isSkipped}
              />
              <Label htmlFor="modulos-microinversor" className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap cursor-pointer">
                Microinversor
              </Label>
            </div>
          </div>
          {!isMicro && totalStrings > 0 && (
            <div className="space-y-1.5 pl-2 border-l-2 border-blue-200 dark:border-blue-800 mt-1">
              {Array.from({ length: totalStrings }, (_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Label className="text-xs text-gray-500 whitespace-nowrap w-40">Nº Módulos — String {i + 1}</Label>
                  <Input
                    type="number"
                    min="1"
                    value={stringsModulos[i] || ''}
                    onChange={(e) => {
                      const arr = [...stringsModulos];
                      while (arr.length < totalStrings) arr.push('');
                      arr[i] = e.target.value;
                      handleFieldChange('modulos_strings_modulos', JSON.stringify(arr));
                    }}
                    placeholder="Qtd."
                    className="h-7 text-sm"
                    disabled={isSkipped}
                  />
                </div>
              ))}
            </div>
          )}
          {isMicro && (
            <p className="text-xs text-blue-500 italic">Microinversor — strings não se aplicam.</p>
          )}
        </div>
      );
    }

    const isUppercaseField = field.type === 'text' && !field.key.includes('email') && !PHONE_FIELDS.has(field.key) && !CEP_FIELDS.has(field.key);
    return (
      <Input
        type={field.type === 'number' ? 'number' : 'text'}
        step={field.type === 'number' ? '0.01' : undefined}
        value={value}
        onChange={(e) => {
          let v: any = e.target.value;
          if (field.type === 'number') {
            v = v ? Number(v) : 0;
          } else if (PHONE_FIELDS.has(field.key)) {
            v = formatPhone(v);
          } else if (CEP_FIELDS.has(field.key)) {
            v = formatCEP(v);
          }
          handleFieldChange(field.key, v);
        }}
        placeholder={field.placeholder || ''}
        className={`h-8 text-sm${isUppercaseField ? ' uppercase' : ''}`}
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
            <ClipboardList className="h-5 w-5 text-blue-600" />
            Conferir Informações do Projeto
          </DialogTitle>
          <DialogDescription>
            Preencha as informações necessárias para a geração dos documentos.
          </DialogDescription>

          <div className="mt-2 rounded-lg border border-blue-100 dark:border-blue-900/40 bg-blue-50/70 dark:bg-blue-950/30 px-4 py-3">
            <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
              <strong>Todos os campos obrigatórios devem ser preenchidos</strong> — caso algum esteja vazio, a documentação não será gerada corretamente.
              Após preencher, clique em <strong>Salvar Progresso</strong> e depois selecione o documento que deseja gerar.
              O botão para gerar cada documento estará ao final da pré-visualização (Memorial Descritivo, Diagrama Unifilar, Diagrama de Blocos...).
            </p>
          </div>

          <div className="mt-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40 px-4 py-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Campos obrigatórios</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">{totalFilledRequired}/{requiredCount}</span>
                <span className={`text-sm font-bold tabular-nums ${progressPercent === 100 ? 'text-green-600' : 'text-blue-600'}`}>{progressPercent}%</span>
              </div>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all duration-500 ease-out ${progressPercent === 100 ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gradient-to-r from-blue-400 to-blue-600'}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
              <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-500" /> Preenchido</span>
              <span className="flex items-center gap-1"><AlertCircle className="h-3 w-3 text-red-400" /> Obrigatório</span>
              <span className="flex items-center gap-1"><AlertCircle className="h-3 w-3 text-amber-400" /> Opcional</span>
              <span className="flex items-center gap-1"><MinusCircle className="h-3 w-3 text-gray-400" /> Ignorado</span>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1 space-y-6 mt-2">
          {Array.from(groups.entries()).map(([groupName, groupFields]) => {
            const isMod = groupName === 'Módulos Fotovoltaicos';
            const isInv = groupName === 'Inversores Fotovoltaicos';
            // Campos do grupo que ainda são mostrados (os gerenciados pelo editor são ocultados)
            const visibleFields = isMod
              ? groupFields.filter(f => !MODULOS_MANAGED_FIELDS.has(f.key))
              : isInv
              ? groupFields.filter(f => !INVERSORES_MANAGED_FIELDS.has(f.key))
              : groupFields;

            return (
            <div key={groupName}>
              <h3 className="flex items-center justify-between mb-3 sticky top-0 bg-background py-2 z-10 border-b border-gray-100 dark:border-gray-800">
                <span className="flex items-center gap-2">
                  <span className="w-1 h-4 rounded-full bg-blue-500 dark:bg-blue-400 inline-block flex-shrink-0" />
                  <span className="text-sm font-bold text-gray-800 dark:text-gray-100 tracking-tight">{groupName}</span>
                </span>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                  {groupFields.filter(f => isFieldFilled(f.key)).length}/{groupFields.length}
                </span>
              </h3>
              {groupName === 'Responsável Legal' && (
                <div className="mb-3 space-y-2">
                  <div className="rounded-md border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 p-3">
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      <Info className="h-3.5 w-3.5 inline mr-1" />
                      Nome, e-mail e telefone do responsável legal são preenchidos automaticamente com os dados do Responsável Técnico.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="use-outro-responsavel-legal"
                      checked={useOutroResponsavelLegal}
                      onCheckedChange={(checked) => {
                        const isChecked = !!checked;
                        setUseOutroResponsavelLegal(isChecked);
                        if (!isChecked) {
                          setLocalFields(prev => ({
                            ...prev,
                            responsavel_legal_nome: prev.responsavel_nome || '',
                            ...(prev.responsavel_email ? { responsavel_legal_email: prev.responsavel_email } : {}),
                            ...(responsavelPrefs?._telefone ? { responsavel_legal_telefone: formatPhone(responsavelPrefs._telefone) } : {}),
                          }));
                        } else {
                          setLocalFields(prev => ({
                            ...prev,
                            responsavel_legal_nome: '',
                            responsavel_legal_email: '',
                            responsavel_legal_telefone: '',
                          }));
                        }
                      }}
                    />
                    <Label htmlFor="use-outro-responsavel-legal" className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                      Utilizar outro responsável legal (diferente do técnico)
                    </Label>
                  </div>
                </div>
              )}
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
              {/* Editor de lista de módulos */}
              {isMod && (
                <div className="mb-3">
                  <EquipamentoListEditor
                    tipo="modulo"
                    items={modulosList}
                    onChange={setModulosList}
                  />
                </div>
              )}
              {/* Editor de lista de inversores */}
              {isInv && (
                <div className="mb-3">
                  <EquipamentoListEditor
                    tipo="inversor"
                    items={inversoresList}
                    onChange={setInversoresList}
                  />
                </div>
              )}

              <div className="space-y-3">
                {visibleFields.map(field => (
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
            );
          })}
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
