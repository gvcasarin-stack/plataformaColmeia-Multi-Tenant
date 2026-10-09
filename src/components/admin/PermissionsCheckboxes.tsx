'use client';

import React from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserPermissions, COLABORADOR_PERMISSIONS } from '@/types/user';

interface PermissionsCheckboxesProps {
  role: string;
  permissions: UserPermissions;
  onChange: (permissions: UserPermissions) => void;
}

type PermissionKey = keyof UserPermissions;

// Permissões que a tela expõe. can_delete_projects existe no tipo, mas não tem controle aqui.
export const PERMISSION_KEYS: PermissionKey[] = [
  'can_view_dashboard',
  'can_view_dashboard_financials',
  'can_create_projects',
  'can_edit_projects',
  'can_view_all_projects',
  'can_view_clients',
  'can_edit_clients',
  'can_view_financials',
  'can_manage_team',
  'can_edit_preferences',
  'can_view_dimensionamento',
  'can_view_assinaturas',
];

// As duas opções de painel são excludentes (uma delas fica sempre ligada), então o máximo real é 11
export const TOTAL_PERMISSIONS = 11;

export function countActivePermissions(permissions?: Partial<UserPermissions> | null): number {
  if (!permissions) return 0;
  return PERMISSION_KEYS.filter((key) => permissions[key] === true).length;
}

interface PermissionRow {
  key: PermissionKey;
  label: string;
  desc?: string;
  descOn?: string;
  descOff?: string;
  requires?: PermissionKey;
  requiresLabel?: string;
}

// Áreas na ordem em que aparecem: título da área e, abaixo, as opções dela
const PERMISSION_AREAS: { title: string; rows: PermissionRow[] }[] = [
  {
    title: 'Painel',
    rows: [
      {
        key: 'can_view_dashboard_financials',
        label: 'Dados financeiros no painel',
        descOn: 'Vê o painel completo, com os dados financeiros.',
        descOff: 'Vê o painel sem os dados financeiros.',
      },
    ],
  },
  {
    title: 'Projetos',
    rows: [
      { key: 'can_create_projects', label: 'Criar projetos' },
      { key: 'can_edit_projects', label: 'Editar projetos' },
      {
        key: 'can_view_all_projects',
        label: 'Visualizar todos os projetos',
        desc: 'Desligado, vê apenas os projetos em que é responsável.',
      },
      { key: 'can_view_dimensionamento', label: 'Dimensionamento' },
    ],
  },
  {
    title: 'Cadastro de clientes',
    rows: [
      { key: 'can_view_clients', label: 'Visualizar clientes' },
      { key: 'can_edit_clients', label: 'Editar clientes', requires: 'can_view_clients', requiresLabel: 'Visualizar clientes' },
    ],
  },
  {
    title: 'Financeiro',
    rows: [
      { key: 'can_view_financials', label: 'Financeiro' },
      { key: 'can_view_assinaturas', label: 'Assinaturas' },
    ],
  },
  {
    title: 'Administração',
    rows: [
      { key: 'can_manage_team', label: 'Gerenciar equipe' },
      { key: 'can_edit_preferences', label: 'Editar preferências' },
    ],
  },
];

function PermissionSwitch({
  id,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative mt-px h-5 w-9 flex-shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-600'
      )}
    >
      <span
        className={cn(
          'absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
          checked && 'translate-x-4'
        )}
      />
    </button>
  );
}

export function PermissionsCheckboxes({ role, permissions, onChange }: PermissionsCheckboxesProps) {
  const isAdmin = role === 'admin' || role === 'superadmin';

  // Administradores não têm permissões para configurar: acesso total
  if (isAdmin) {
    return (
      <div className="flex items-start gap-3.5 rounded-[10px] border border-teal-200 bg-teal-50 p-[18px] dark:border-teal-900 dark:bg-teal-950/40">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-200">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div>
          <h4 className="text-[15px] font-semibold leading-[22px] text-teal-900 dark:text-teal-100">Acesso total</h4>
          <p className="mt-0.5 max-w-[60ch] text-[13px] leading-[19px] text-teal-700 dark:text-teal-300">
            Administradores acessam todas as funcionalidades e todos os clientes, então não há permissões para configurar.
            Para limitar o acesso, mude a função para Colaborador na aba Dados.
          </p>
        </div>
      </div>
    );
  }

  const current = (permissions || {}) as UserPermissions;

  const handlePermissionChange = (key: PermissionKey, value: boolean) => {
    const updatedPermissions = {
      ...current,
      [key]: value,
    };

    // As duas chaves de painel são excludentes: uma delas fica sempre ligada
    if (key === 'can_view_dashboard_financials') {
      updatedPermissions.can_view_dashboard = !value;
    }

    // Sem visualizar clientes, não dá para editar clientes
    if (key === 'can_view_clients' && !value) {
      updatedPermissions.can_edit_clients = false;
    }

    onChange(updatedPermissions);
  };

  const isDefault = PERMISSION_KEYS.every((key) => !!current[key] === !!COLABORADOR_PERMISSIONS[key]);
  const nothingOn = PERMISSION_KEYS.every((key) => key.startsWith('can_view_dashboard') || !current[key]);

  return (
    <div className="space-y-5">
      <div className="-mb-1.5 flex min-h-[18px] items-center justify-between gap-3 text-[12.5px] leading-[18px] text-muted-foreground">
        <span>{isDefault ? 'Padrão de colaborador' : 'Personalizado'}</span>
        {!isDefault && (
          <button
            type="button"
            onClick={() => onChange({ ...COLABORADOR_PERMISSIONS })}
            className="rounded-sm font-medium text-teal-700 underline underline-offset-2 hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 dark:text-teal-400"
          >
            Restaurar padrão
          </button>
        )}
      </div>

      {nothingOn && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-[13px] leading-[19px] text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <p>
            <strong className="font-semibold">Nenhuma permissão ligada.</strong> Assim este colaborador vê apenas o painel e
            os projetos em que é responsável. Confira se é isso mesmo.
          </p>
        </div>
      )}

      <div className="space-y-6">
        {PERMISSION_AREAS.map((area) => (
          <section key={area.title}>
            <h4 className="mb-1 text-[11.5px] font-semibold uppercase leading-4 tracking-wider text-muted-foreground">
              {area.title}
            </h4>
            <div className="divide-y divide-border border-t">
              {area.rows.map((row) => {
                const checked = !!current[row.key];
                const locked = !!row.requires && !current[row.requires];
                const note = locked
                  ? `Requer “${row.requiresLabel}”.`
                  : (checked ? row.descOn : row.descOff) || row.desc || '';
                const id = `perm-${row.key}`;

                return (
                  <div key={row.key} className="flex items-start gap-3.5 py-2.5">
                    <div className="min-w-0 flex-1">
                      <label
                        htmlFor={id}
                        className={cn(
                          'block text-sm font-medium leading-5',
                          locked ? 'cursor-default text-muted-foreground' : 'cursor-pointer text-foreground'
                        )}
                      >
                        {row.label}
                      </label>
                      {note && <p className="mt-px text-[12.5px] leading-[17px] text-muted-foreground">{note}</p>}
                    </div>
                    <PermissionSwitch
                      id={id}
                      checked={checked}
                      disabled={locked}
                      onChange={(value) => handlePermissionChange(row.key, value)}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
