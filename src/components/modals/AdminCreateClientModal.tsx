"use client";

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  Eye,
  EyeOff,
  Key,
  Copy,
  CheckCircle2,
  Trash2,
  MessageCircle,
  UserPlus,
} from 'lucide-react';

interface AdminCreateClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (createdClientId?: string, createdClientName?: string, createdClientEmail?: string) => void;
}

interface FormData {
  name: string;
  email: string;
  password: string;
  phone: string;
  isCompany: boolean;
  companyName: string;
  cnpj: string;
  cpf: string;
}

interface CreatedInfo {
  userId: string;
  email: string;
  password: string;
  tenantName: string;
  phone: string;
  name: string;
}

function generateSecurePassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const nums = '23456789';
  const syms = '@#$!';
  const all = upper + lower + nums + syms;
  const mandatory = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    nums[Math.floor(Math.random() * nums.length)],
    syms[Math.floor(Math.random() * syms.length)],
  ];
  const rest = Array.from({ length: 8 }, () => all[Math.floor(Math.random() * all.length)]);
  return [...mandatory, ...rest].sort(() => Math.random() - 0.5).join('');
}

const formatPhone = (v: string) => {
  const n = v.replace(/\D/g, '');
  if (n.length <= 2) return `(${n}`;
  if (n.length <= 6) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
  if (n.length <= 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7, 11)}`;
};

const formatCNPJ = (v: string) => {
  const n = v.replace(/\D/g, '');
  if (n.length <= 2) return n;
  if (n.length <= 5) return `${n.slice(0, 2)}.${n.slice(2)}`;
  if (n.length <= 8) return `${n.slice(0, 2)}.${n.slice(2, 5)}.${n.slice(5)}`;
  if (n.length <= 12) return `${n.slice(0, 2)}.${n.slice(2, 5)}.${n.slice(5, 8)}/${n.slice(8)}`;
  return `${n.slice(0, 2)}.${n.slice(2, 5)}.${n.slice(5, 8)}/${n.slice(8, 12)}-${n.slice(12, 14)}`;
};

const formatCPF = (v: string) => {
  const n = v.replace(/\D/g, '');
  if (n.length <= 3) return n;
  if (n.length <= 6) return `${n.slice(0, 3)}.${n.slice(3)}`;
  if (n.length <= 9) return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6)}`;
  return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-${n.slice(9, 11)}`;
};

const EMPTY_FORM: FormData = {
  name: '',
  email: '',
  password: '',
  phone: '',
  isCompany: false,
  companyName: '',
  cnpj: '',
  cpf: '',
};

export function AdminCreateClientModal({
  open,
  onOpenChange,
  onSuccess,
}: AdminCreateClientModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [createdInfo, setCreatedInfo] = useState<CreatedInfo | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);

  const handleChange = (field: keyof FormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleReset = () => {
    setStep('form');
    setForm(EMPTY_FORM);
    setErrors({});
    setCreatedInfo(null);
    setCopied(false);
    setShowPassword(false);
    setLoading(false);
  };

  const handleClose = () => {
    if (step === 'success' && createdInfo) {
      onSuccess(createdInfo.userId, createdInfo.name, createdInfo.email);
    } else if (step === 'success') {
      onSuccess();
    }
    handleReset();
    onOpenChange(false);
  };

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormData, string>> = {};
    if (!form.name.trim()) errs.name = 'Nome obrigatório';
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'E-mail inválido';
    }
    if (!form.phone.trim() || form.phone.replace(/\D/g, '').length < 10) {
      errs.phone = 'Telefone inválido (mínimo 10 dígitos)';
    }
    if (!form.password || form.password.length < 8) {
      errs.password = 'Senha deve ter ao menos 8 caracteres';
    }
    if (form.isCompany) {
      if (!form.companyName.trim()) errs.companyName = 'Razão social obrigatória';
      if (!form.cnpj.trim()) errs.cnpj = 'CNPJ obrigatório';
    } else {
      if (!form.cpf.trim()) errs.cpf = 'CPF obrigatório';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const response = await fetch('/api/admin/create-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUserId: user?.id,
          name: form.name.trim(),
          email: form.email.toLowerCase().trim(),
          password: form.password,
          phone: form.phone,
          isCompany: form.isCompany,
          companyName: form.isCompany ? form.companyName.trim() : null,
          cnpj: form.isCompany ? form.cnpj : null,
          cpf: !form.isCompany ? form.cpf : null,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar cliente');
      }
      setCreatedInfo({
        userId: data.data.userId,
        email: form.email.toLowerCase().trim(),
        password: form.password,
        tenantName: data.data.tenantName,
        phone: form.phone,
        name: form.name.trim(),
      });
      setStep('success');
      toast({
        title: '✅ Cliente criado com sucesso!',
        description: `Credenciais enviadas para ${form.email}`,
      });
    } catch (err: any) {
      toast({
        title: '❌ Erro ao criar cliente',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!createdInfo) return;
    setLoading(true);
    try {
      const response = await fetch('/api/admin/delete-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: createdInfo.userId, adminUserId: user?.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao remover cliente');
      toast({ title: '🗑️ Cadastro desfeito', description: 'Cliente removido com sucesso.' });
      handleReset();
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: '❌ Erro ao remover cliente',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCredentials = async () => {
    if (!createdInfo) return;
    const text = `E-mail: ${createdInfo.email}\nSenha: ${createdInfo.password}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast({ title: 'Não foi possível copiar', variant: 'destructive' });
    }
  };

  const handleWhatsApp = () => {
    if (!createdInfo) return;
    const phoneDigits = createdInfo.phone.replace(/\D/g, '');
    const msg = encodeURIComponent(
      `Olá! 👋\n\nSeu acesso ao *Sistema de Gerenciamento Fotovoltaico* da empresa *${createdInfo.tenantName}* está pronto.\n\nSuas credenciais de acesso foram enviadas para o seu e-mail. Acesse a plataforma pelo link recebido e utilize as suas credenciais para entrar.\n\nEm caso de dúvidas, estamos à disposição! 😊`
    );
    const url = `https://api.whatsapp.com/send/?phone=${phoneDigits}&text=${msg}&type=phone_number&app_absent=0`;
    window.open(url, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {step === 'form' ? 'Novo Cliente' : 'Cliente Criado com Sucesso'}
          </DialogTitle>
          {step === 'form' && (
            <DialogDescription>
              Preencha os dados do cliente. As credenciais serão enviadas por e-mail automaticamente.
            </DialogDescription>
          )}
        </DialogHeader>

        {step === 'form' ? (
          <div className="space-y-4 py-2">
            {/* Tipo de cadastro */}
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <Checkbox
                  checked={form.isCompany}
                  onCheckedChange={(c) => {
                    handleChange('isCompany', c === true);
                    if (c) { handleChange('cpf', ''); }
                    else { handleChange('companyName', ''); handleChange('cnpj', ''); }
                  }}
                />
                <span className="text-sm font-medium">Empresa (PJ)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <Checkbox
                  checked={!form.isCompany}
                  onCheckedChange={(c) => {
                    handleChange('isCompany', !(c === true));
                    if (c) { handleChange('companyName', ''); handleChange('cnpj', ''); }
                    else { handleChange('cpf', ''); }
                  }}
                />
                <span className="text-sm font-medium">Pessoa Física (PF)</span>
              </label>
            </div>

            {/* Nome do responsável */}
            <div className="space-y-1">
              <Label htmlFor="ac-name">
                {form.isCompany ? 'Nome do Responsável' : 'Nome Completo'} *
              </Label>
              <Input
                id="ac-name"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="João da Silva"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
            </div>

            {/* Campos exclusivos PJ */}
            {form.isCompany && (
              <>
                <div className="space-y-1">
                  <Label htmlFor="ac-companyName">Razão Social *</Label>
                  <Input
                    id="ac-companyName"
                    value={form.companyName}
                    onChange={(e) => handleChange('companyName', e.target.value)}
                    placeholder="Empresa LTDA"
                    className={errors.companyName ? 'border-red-500' : ''}
                  />
                  {errors.companyName && <p className="text-xs text-red-500">{errors.companyName}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ac-cnpj">CNPJ *</Label>
                  <Input
                    id="ac-cnpj"
                    value={form.cnpj}
                    onChange={(e) => handleChange('cnpj', formatCNPJ(e.target.value))}
                    placeholder="00.000.000/0001-00"
                    maxLength={18}
                    className={errors.cnpj ? 'border-red-500' : ''}
                  />
                  {errors.cnpj && <p className="text-xs text-red-500">{errors.cnpj}</p>}
                </div>
              </>
            )}

            {/* Campo exclusivo PF */}
            {!form.isCompany && (
              <div className="space-y-1">
                <Label htmlFor="ac-cpf">CPF *</Label>
                <Input
                  id="ac-cpf"
                  value={form.cpf}
                  onChange={(e) => handleChange('cpf', formatCPF(e.target.value))}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className={errors.cpf ? 'border-red-500' : ''}
                />
                {errors.cpf && <p className="text-xs text-red-500">{errors.cpf}</p>}
              </div>
            )}

            {/* E-mail */}
            <div className="space-y-1">
              <Label htmlFor="ac-email">E-mail *</Label>
              <Input
                id="ac-email"
                type="email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="cliente@email.com"
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
            </div>

            {/* Telefone */}
            <div className="space-y-1">
              <Label htmlFor="ac-phone">Telefone *</Label>
              <Input
                id="ac-phone"
                value={form.phone}
                onChange={(e) => handleChange('phone', formatPhone(e.target.value))}
                placeholder="(00) 00000-0000"
                maxLength={15}
                autoComplete="off"
                className={errors.phone ? 'border-red-500' : ''}
              />
              {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
            </div>

            {/* Senha */}
            <div className="space-y-1">
              <Label htmlFor="ac-password">Senha de Acesso *</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="ac-password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    placeholder="Senha do cliente"
                    autoComplete="new-password"
                    className={`pr-10 ${errors.password ? 'border-red-500' : ''}`}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPassword((p) => !p)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 whitespace-nowrap"
                  onClick={() => {
                    const pwd = generateSecurePassword();
                    handleChange('password', pwd);
                    setShowPassword(true);
                  }}
                >
                  <Key className="h-3.5 w-3.5" />
                  Gerar Senha Segura
                </Button>
              </div>
              {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="ghost" onClick={handleClose} disabled={loading}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {loading ? 'Criando cliente...' : 'Criar Cliente'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-2 space-y-4">
            {/* Banner de sucesso */}
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <CheckCircle2 className="h-8 w-8 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-green-800 dark:text-green-300">
                  Cadastro realizado!
                </p>
                <p className="text-sm text-green-700 dark:text-green-400">
                  Credenciais enviadas para{' '}
                  <strong>{createdInfo?.email}</strong>
                </p>
              </div>
            </div>

            {/* Box com credenciais */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2 text-sm border">
              <div className="flex justify-between">
                <span className="text-gray-500">E-mail:</span>
                <strong>{createdInfo?.email}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Senha:</span>
                <strong className="font-mono tracking-wider">{createdInfo?.password}</strong>
              </div>
            </div>

            {/* Ações */}
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                className="gap-2 justify-start"
                onClick={handleCopyCredentials}
              >
                {copied ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? 'Copiado!' : 'Copiar Credenciais'}
              </Button>

              <Button
                className="gap-2 justify-start bg-[#25D366] hover:bg-[#1DA851] text-white"
                onClick={handleWhatsApp}
              >
                <MessageCircle className="h-4 w-4" />
                Notificar via WhatsApp
              </Button>

              <Button
                variant="outline"
                className="gap-2 justify-start text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20 dark:border-red-800"
                onClick={handleDelete}
                disabled={loading}
              >
                <Trash2 className="h-4 w-4" />
                {loading ? 'Removendo...' : 'Desfazer Cadastro'}
              </Button>
            </div>

            <div className="flex justify-end pt-2 border-t">
              <Button onClick={handleClose} className="bg-blue-600 hover:bg-blue-700 text-white">
                Fechar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
