'use client';

import React from 'react';
import { UserPermissions, ADMIN_PERMISSIONS, COLABORADOR_PERMISSIONS } from '@/types/user';

interface PermissionsCheckboxesProps {
  role: string;
  permissions: UserPermissions;
  onChange: (permissions: UserPermissions) => void;
}

export function PermissionsCheckboxes({ role, permissions, onChange }: PermissionsCheckboxesProps) {
  const isAdmin = role === 'admin' || role === 'superadmin';

  // Se for admin, todas as permissões devem estar marcadas e desabilitadas
  const effectivePermissions = isAdmin ? ADMIN_PERMISSIONS : permissions;
  const disabled = isAdmin;

  const handlePermissionChange = (key: keyof UserPermissions, value: boolean) => {
    if (disabled) return;

    // ✅ Lógica mutuamente exclusiva para permissões de painel
    let updatedPermissions = {
      ...permissions,
      [key]: value,
    };

    // Se marcar "Painel sem dados financeiros", desmarcar "Painel completo"
    if (key === 'can_view_dashboard' && value === true) {
      updatedPermissions.can_view_dashboard_financials = false;
    }

    // Se marcar "Painel completo", desmarcar "Painel sem dados financeiros"
    if (key === 'can_view_dashboard_financials' && value === true) {
      updatedPermissions.can_view_dashboard = false;
    }

    onChange(updatedPermissions);
  };

  return (
    <div className="space-y-4">
      <div className="border-t pt-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">
          📋 Permissões de Acesso
        </h3>

        {isAdmin && (
          <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
            ℹ️ Administradores têm acesso total a todas as funcionalidades
          </div>
        )}

        <div className="space-y-3">
          {/* Painel */}
          <div className="border rounded-lg p-3 bg-gray-50">
            <h4 className="font-medium text-sm text-gray-700 mb-2">📊 Painel</h4>
            <div className="space-y-2 ml-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={effectivePermissions.can_view_dashboard}
                  onChange={(e) => handlePermissionChange('can_view_dashboard', e.target.checked)}
                  disabled={disabled}
                  className="rounded border-gray-300 text-orange-500 focus:ring-orange-500 disabled:opacity-50"
                />
                <span className="text-sm text-gray-700">
                  Painel sem dados financeiros
                  {!effectivePermissions.can_view_dashboard && (
                    <span className="text-xs text-red-600 ml-1">(Bloqueado)</span>
                  )}
                </span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={effectivePermissions.can_view_dashboard_financials}
                  onChange={(e) => handlePermissionChange('can_view_dashboard_financials', e.target.checked)}
                  disabled={disabled}
                  className="rounded border-gray-300 text-orange-500 focus:ring-orange-500 disabled:opacity-50"
                />
                <span className="text-sm text-gray-700">
                  Painel completo (com dados financeiros)
                  {!effectivePermissions.can_view_dashboard_financials && (
                    <span className="text-xs text-red-600 ml-1">(Bloqueado)</span>
                  )}
                </span>
              </label>
            </div>
          </div>

          {/* Projetos */}
          <div className="border rounded-lg p-3 bg-gray-50">
            <h4 className="font-medium text-sm text-gray-700 mb-2">📁 Projetos</h4>
            <div className="space-y-2 ml-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={effectivePermissions.can_create_projects}
                  onChange={(e) => handlePermissionChange('can_create_projects', e.target.checked)}
                  disabled={disabled}
                  className="rounded border-gray-300 text-orange-500 focus:ring-orange-500 disabled:opacity-50"
                />
                <span className="text-sm text-gray-700">
                  Criar projetos
                  {!effectivePermissions.can_create_projects && (
                    <span className="text-xs text-red-600 ml-1">(Bloqueado)</span>
                  )}
                </span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={effectivePermissions.can_edit_projects}
                  onChange={(e) => handlePermissionChange('can_edit_projects', e.target.checked)}
                  disabled={disabled}
                  className="rounded border-gray-300 text-orange-500 focus:ring-orange-500 disabled:opacity-50"
                />
                <span className="text-sm text-gray-700">
                  Editar projetos
                  {!effectivePermissions.can_edit_projects && (
                    <span className="text-xs text-red-600 ml-1">(Bloqueado)</span>
                  )}
                </span>
              </label>
            </div>
          </div>

          {/* Clientes */}
          <div className="border rounded-lg p-3 bg-gray-50">
            <h4 className="font-medium text-sm text-gray-700 mb-2">👥 Clientes</h4>
            <div className="space-y-2 ml-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={effectivePermissions.can_view_clients}
                  onChange={(e) => handlePermissionChange('can_view_clients', e.target.checked)}
                  disabled={disabled}
                  className="rounded border-gray-300 text-orange-500 focus:ring-orange-500 disabled:opacity-50"
                />
                <span className="text-sm text-gray-700">
                  Visualizar clientes
                  {!effectivePermissions.can_view_clients && (
                    <span className="text-xs text-red-600 ml-1">(Bloqueado)</span>
                  )}
                </span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={effectivePermissions.can_edit_clients}
                  onChange={(e) => handlePermissionChange('can_edit_clients', e.target.checked)}
                  disabled={disabled}
                  className="rounded border-gray-300 text-orange-500 focus:ring-orange-500 disabled:opacity-50"
                />
                <span className="text-sm text-gray-700">
                  Editar clientes
                  {!effectivePermissions.can_edit_clients && (
                    <span className="text-xs text-red-600 ml-1">(Bloqueado)</span>
                  )}
                </span>
              </label>
            </div>
          </div>

          {/* Financeiro */}
          <div className="border rounded-lg p-3 bg-gray-50">
            <h4 className="font-medium text-sm text-gray-700 mb-2">💰 Financeiro</h4>
            <div className="space-y-2 ml-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={effectivePermissions.can_view_financials}
                  onChange={(e) => handlePermissionChange('can_view_financials', e.target.checked)}
                  disabled={disabled}
                  className="rounded border-gray-300 text-orange-500 focus:ring-orange-500 disabled:opacity-50"
                />
                <span className="text-sm text-gray-700">
                  Acessar aba Financeiro
                  {!effectivePermissions.can_view_financials && (
                    <span className="text-xs text-red-600 ml-1">(Bloqueado)</span>
                  )}
                </span>
              </label>
            </div>
          </div>

          {/* Equipe */}
          <div className="border rounded-lg p-3 bg-gray-50">
            <h4 className="font-medium text-sm text-gray-700 mb-2">👨‍💼 Equipe</h4>
            <div className="space-y-2 ml-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={effectivePermissions.can_manage_team}
                  onChange={(e) => handlePermissionChange('can_manage_team', e.target.checked)}
                  disabled={disabled}
                  className="rounded border-gray-300 text-orange-500 focus:ring-orange-500 disabled:opacity-50"
                />
                <span className="text-sm text-gray-700">
                  Gerenciar equipe
                  {!effectivePermissions.can_manage_team && (
                    <span className="text-xs text-red-600 ml-1">(Bloqueado)</span>
                  )}
                </span>
              </label>
            </div>
          </div>

          {/* Preferências */}
          <div className="border rounded-lg p-3 bg-gray-50">
            <h4 className="font-medium text-sm text-gray-700 mb-2">⚙️ Preferências</h4>
            <div className="space-y-2 ml-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={effectivePermissions.can_edit_preferences}
                  onChange={(e) => handlePermissionChange('can_edit_preferences', e.target.checked)}
                  disabled={disabled}
                  className="rounded border-gray-300 text-orange-500 focus:ring-orange-500 disabled:opacity-50"
                />
                <span className="text-sm text-gray-700">
                  Editar preferências da organização
                  {!effectivePermissions.can_edit_preferences && (
                    <span className="text-xs text-red-600 ml-1">(Bloqueado)</span>
                  )}
                </span>
              </label>
            </div>
          </div>

          {/* Dimensionamento */}
          <div className="border rounded-lg p-3 bg-gray-50">
            <h4 className="font-medium text-sm text-gray-700 mb-2">🧮 Dimensionamento</h4>
            <div className="space-y-2 ml-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={effectivePermissions.can_view_dimensionamento}
                  onChange={(e) => handlePermissionChange('can_view_dimensionamento', e.target.checked)}
                  disabled={disabled}
                  className="rounded border-gray-300 text-orange-500 focus:ring-orange-500 disabled:opacity-50"
                />
                <span className="text-sm text-gray-700">
                  Acessar aba Dimensionamento
                  {!effectivePermissions.can_view_dimensionamento && (
                    <span className="text-xs text-red-600 ml-1">(Bloqueado)</span>
                  )}
                </span>
              </label>
            </div>
          </div>

          {/* Assinaturas */}
          <div className="border rounded-lg p-3 bg-gray-50">
            <h4 className="font-medium text-sm text-gray-700 mb-2">💳 Assinaturas</h4>
            <div className="space-y-2 ml-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={effectivePermissions.can_view_assinaturas}
                  onChange={(e) => handlePermissionChange('can_view_assinaturas', e.target.checked)}
                  disabled={disabled}
                  className="rounded border-gray-300 text-orange-500 focus:ring-orange-500 disabled:opacity-50"
                />
                <span className="text-sm text-gray-700">
                  Acessar aba Assinaturas
                  {!effectivePermissions.can_view_assinaturas && (
                    <span className="text-xs text-red-600 ml-1">(Bloqueado)</span>
                  )}
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Resumo para colaboradores */}
        {!isAdmin && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs">
            <p className="font-medium text-yellow-800 mb-1">💡 Dica:</p>
            <p className="text-yellow-700">
              Configure as permissões de acordo com as responsabilidades do colaborador.
              Permissões podem ser ajustadas a qualquer momento.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
