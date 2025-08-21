"use client"

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, X } from "lucide-react";
import { devLog } from "@/lib/utils/productionLogger";
import { getErrorMessage } from "@/lib/utils/errorUtils";
// import { updateClientProfileDetails } from "@/lib/actions/clientActions";

interface FormData {
  // Personal Info
  name: string;
  email: string;
  password: string;
  phone: string;
  
  // Company Info
  isCompany: boolean;
  isIndividual: boolean;
  companyName?: string;
  nomeCompleto?: string;
  cnpj?: string;
  cpf?: string;
}

interface PasswordRequirement {
  regex: RegExp;
  message: string;
}

const passwordRequirements: PasswordRequirement[] = [
  { regex: /.{8,}/, message: "Pelo menos 8 caracteres" },
  { regex: /[A-Z]/, message: "Uma letra maiúscula" },
  { regex: /[a-z]/, message: "Uma letra minúscula" },
  { regex: /[0-9]/, message: "Um número" },
  { regex: /[^A-Za-z0-9]/, message: "Um caractere especial" },
];

// Add CNPJ validation function
const validateCNPJ = (cnpj: string): boolean => {
  // Remove non-digits
  const numbers = cnpj.replace(/\D/g, "");
  
  // Check if it has 14 digits
  if (numbers.length !== 14) {
    return false;
  }

  // Check for obvious invalid patterns
  if (/^(\d)\1+$/.test(numbers)) {
    return false;
  }

  // Calculate first verification digit
  let sum = 0;
  let weight = 5;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(numbers.charAt(i)) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  let digit = 11 - (sum % 11);
  const firstDigit = digit > 9 ? 0 : digit;

  // Calculate second verification digit
  sum = 0;
  weight = 6;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(numbers.charAt(i)) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  digit = 11 - (sum % 11);
  const secondDigit = digit > 9 ? 0 : digit;

  // Check if calculated digits match the provided ones
  return (
    parseInt(numbers.charAt(12)) === firstDigit &&
    parseInt(numbers.charAt(13)) === secondDigit
  );
};

// Add CPF validation function
const validateCPF = (cpf: string): boolean => {
  // Remove non-digits
  const numbers = cpf.replace(/\D/g, "");
  
  // Check if it has 11 digits
  if (numbers.length !== 11) {
    return false;
  }

  // Check for obvious invalid patterns
  if (/^(\d)\1+$/.test(numbers)) {
    return false;
  }

  // Calculate first verification digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(numbers.charAt(i)) * (10 - i);
  }
  let remainder = sum % 11;
  const firstDigit = remainder < 2 ? 0 : 11 - remainder;

  // Calculate second verification digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(numbers.charAt(i)) * (11 - i);
  }
  remainder = sum % 11;
  const secondDigit = remainder < 2 ? 0 : 11 - remainder;

  // Check if calculated digits match the provided ones
  return (
    parseInt(numbers.charAt(9)) === firstDigit &&
    parseInt(numbers.charAt(10)) === secondDigit
  );
};

export function RegisterForm() {
  const router = useRouter();
  const { signUpWithPassword } = useAuth();
  const [loading, setLoading] = useState(false);

  // Log Supabase URL and Anon Key on component mount and when they change
  useEffect(() => {
    devLog.log("[RegisterForm] Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
    devLog.log("[RegisterForm] Supabase Anon Key:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  }, []);

  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    password: "",
    phone: "",
    isCompany: false,
    isIndividual: false,
    companyName: "",
    nomeCompleto: "",
    cnpj: "",
    cpf: "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [passwordRequirementsMet, setPasswordRequirementsMet] = useState<boolean[]>(
    new Array(passwordRequirements.length).fill(false)
  );

  // Estado para controlar a visibilidade da senha
  const [showPassword, setShowPassword] = useState(false);

  // Format phone number as user types
  const formatPhone = (value: string) => {
    // Remove all non-digits
    const numbers = value.replace(/\D/g, "");
    
    // Format according to length
    if (numbers.length <= 2) {
      return `(${numbers}`;
    }
    if (numbers.length <= 6) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    }
    if (numbers.length <= 10) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    }
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  // Format CNPJ as user types
  const formatCNPJ = (value: string) => {
    // Remove all non-digits
    const numbers = value.replace(/\D/g, "");
    
    // Format according to length
    if (numbers.length <= 2) {
      return numbers;
    }
    if (numbers.length <= 5) {
      return `${numbers.slice(0, 2)}.${numbers.slice(2)}`;
    }
    if (numbers.length <= 8) {
      return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`;
    }
    if (numbers.length <= 12) {
      return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`;
    }
    return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`;
  };

  // Format CPF as user types
  const formatCPF = (value: string) => {
    // Remove all non-digits
    const numbers = value.replace(/\D/g, "");
    
    // Format according to length
    if (numbers.length <= 3) {
      return numbers;
    }
    if (numbers.length <= 6) {
      return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    }
    if (numbers.length <= 9) {
      return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
    }
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;

    // Apply formatting based on field
    if (name === 'phone') {
      formattedValue = formatPhone(value);
    } else if (name === 'cnpj') {
      formattedValue = formatCNPJ(value);
    } else if (name === 'cpf') {
      formattedValue = formatCPF(value);
    }

    setFormData(prev => ({
      ...prev,
      [name]: formattedValue
    }));

    // Check password requirements
    if (name === 'password') {
      const newRequirementsMet = passwordRequirements.map(req => 
        req.regex.test(value)
      );
      setPasswordRequirementsMet(newRequirementsMet);
    }
  };

  const handleCompanyCheckboxChange = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      isCompany: checked,
      isIndividual: checked ? false : prev.isIndividual,
      nomeCompleto: checked ? "" : prev.nomeCompleto,
      cpf: checked ? "" : prev.cpf
    }));
    if (checked) setErrors(prev => ({...prev, nomeCompleto: undefined, cpf: undefined}));
  };

  const handleIndividualCheckboxChange = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      isIndividual: checked,
      isCompany: checked ? false : prev.isCompany,
      companyName: checked ? "" : prev.companyName,
      cnpj: checked ? "" : prev.cnpj
    }));
    if (checked) setErrors(prev => ({...prev, companyName: undefined, cnpj: undefined}));
  };

  const isPasswordValid = passwordRequirementsMet.every(Boolean);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    
    // Validate required fields
    if (!formData.name.trim()) {
      newErrors.name = "Nome é obrigatório";
    }
    
    if (!formData.email.trim()) {
      newErrors.email = "Email é obrigatório";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Email inválido";
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = "Telefone é obrigatório";
    } else if (formData.phone.replace(/\D/g, "").length < 10) {
      newErrors.phone = "Telefone inválido";
    }
    
    if (!formData.password) {
      newErrors.password = "Senha é obrigatória";
    } else if (!isPasswordValid) {
      newErrors.password = "Senha não atende aos requisitos";
    }
    
    if (!formData.isCompany && !formData.isIndividual) {
      newErrors.isCompany = "Selecione uma opção";
    }
    
    // Validate company fields if company is selected
    if (formData.isCompany) {
      if (!formData.companyName?.trim()) {
        newErrors.companyName = "Nome da Empresa é obrigatório";
      }
      
      if (!formData.cnpj?.trim()) {
        newErrors.cnpj = "CNPJ é obrigatório";
      } else if (!validateCNPJ(formData.cnpj)) {
        newErrors.cnpj = "CNPJ inválido";
      }
    }
    
    // Validate individual fields if individual is selected
    if (formData.isIndividual) {
      if (!formData.cpf?.trim()) {
        newErrors.cpf = "CPF é obrigatório";
      } else if (!validateCPF(formData.cpf)) {
        newErrors.cpf = "CPF inválido";
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    devLog.log("[RegisterForm] handleSubmit: INÍCIO DA SUBMISSÃO");

    setLoading(true);
    setErrors({});

    if (!validateForm()) {
      setLoading(false);
      devLog.log("[RegisterForm] handleSubmit: Validação do formulário falhou.");
      return;
    }

    const fullNameForSupabase = formData.name;
    
    if (!fullNameForSupabase || !fullNameForSupabase.trim()) {
        devLog.error("[RegisterForm] handleSubmit: O campo 'Nome completo (Responsável ou Pessoa Física)' (formData.name) não foi preenchido, mas é obrigatório.");
        setErrors(prev => ({...prev, name: "Nome completo (Responsável ou Pessoa Física) é obrigatório."}));
        setLoading(false);
        return;
    }

    if (formData.isCompany && (!formData.companyName || !formData.companyName.trim())) {
      devLog.error("[RegisterForm] handleSubmit: Para Empresa, o campo 'Nome da Empresa' é obrigatório.");
      setErrors(prev => ({...prev, companyName: "Nome da Empresa é obrigatório."}));
      setLoading(false);
      return;
    }

    try {
      devLog.log("[RegisterForm] handleSubmit: ANTES de chamar signUpWithPassword. Dados do formulário:", formData);

      // Preparar dados para options.data, limpando e tratando valores
      const metadata = {
        full_name: formData.name.trim(), // fullNameForSupabase já foi validado, mas trim aqui por segurança
        phone: formData.phone.replace(/\D/g, "") || null,
        isCompany: formData.isCompany,
        companyName: formData.isCompany ? (formData.companyName?.trim() || null) : null,
        cnpj: formData.isCompany ? (formData.cnpj?.replace(/\D/g, "") || null) : null,
        cpf: formData.isIndividual ? (formData.cpf?.replace(/\D/g, "") || null) : null,
        role: 'cliente' // Definindo a role diretamente aqui, conforme esperado pelo trigger
      };

      devLog.log("[RegisterForm] handleSubmit: Dados para options.data (user_metadata):", metadata);

      // Chamada para signUpWithPassword com options.data completo
      const { error: signUpError, user: authUser, session } = await signUpWithPassword({
        email: formData.email,
        password: formData.password,
        options: {
          data: metadata, // Passando todos os dados relevantes para o trigger
        },
      });
      
      devLog.log("[RegisterForm] handleSubmit: DEPOIS de chamar signUpWithPassword. Erro:", signUpError, "User:", authUser);

      if (signUpError) {
        throw signUpError; 
      }
      
      // Se o cadastro no Supabase Auth foi bem-sucedido e temos um usuário
      if (authUser) {
        devLog.log("[RegisterForm] handleSubmit: Usuário Auth criado/obtido (aguardando confirmação de e-mail). ID:", authUser.id);
        devLog.log("[RegisterForm] handleSubmit: O trigger SQL 'handle_new_user' deve ter populado os detalhes do perfil na tabela 'users'.");

        // Mensagem de sucesso indicando a necessidade de confirmação de e-mail
        toast({
          title: "Conta criada com sucesso!",
          description: `Um e-mail de confirmação foi enviado para ${formData.email}. Por favor, verifique sua caixa de entrada (e spam) para ativar sua conta.`,
          variant: "default", 
          duration: 8000, // Mais tempo para ler
        });
        
        // Redirecionar para uma página de "aguardando confirmação" ou para o login
        // Passando o email como query param para a página de destino poder exibi-lo
        router.push(`/cadastro/aguardando-confirmacao?email=${encodeURIComponent(formData.email)}`);
        
      } else {
        // Este caso (signUp bem-sucedido mas sem authUser) não deveria ocorrer com Supabase signUp.
        // Mas se ocorrer, é um erro inesperado.
        devLog.error("[RegisterForm] handleSubmit: SignUp bem-sucedido, mas nenhum usuário retornado.");
        setLoading(false);
        toast({
          title: "Erro no cadastro",
          description: "Não foi possível obter os dados do usuário após o registro. Tente novamente.",
          variant: "destructive",
        });
      }

    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      devLog.error("[RegisterForm] Erro no cadastro Supabase:", error); 
        toast({
          title: "Erro no cadastro",
        description: errorMessage, 
          variant: "destructive"
        });
    } finally {
      setLoading(false);
      devLog.log("[RegisterForm] handleSubmit: FIM DA SUBMISSÃO");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 w-full max-w-lg">
      {/* Personal Information */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Informações Pessoais</h2>
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome completo (Responsável ou Pessoa Física)</Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="Nome completo do responsável ou pessoa física"
              value={formData.name}
              onChange={handleChange}
              required
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="seu@email.com"
              value={formData.email}
              onChange={handleChange}
              required
              className={errors.email ? "border-red-500" : ""}
            />
            {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="(00) 00000-0000"
              value={formData.phone}
              onChange={handleChange}
              required
              maxLength={15}
              className={errors.phone ? "border-red-500" : ""}
            />
            {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="••••••••"
                className={errors.password ? "border-red-500" : ""}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {passwordRequirements.map((req, index) => (
                <div 
                  key={req.message} 
                  className="flex items-center gap-2 text-sm"
                >
                  {passwordRequirementsMet[index] ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <X className="w-4 h-4 text-red-600" />
                  )}
                  <span className={passwordRequirementsMet[index] ? "text-green-600" : "text-red-600"}>
                    {req.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Possue Empresa ou Cadastro em Pessoa Física?</h2>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="isCompany" 
              checked={formData.isCompany}
              onCheckedChange={handleCompanyCheckboxChange}
            />
            <label
              htmlFor="isCompany"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Sou uma empresa integradora
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="isIndividual" 
              checked={formData.isIndividual}
              onCheckedChange={handleIndividualCheckboxChange}
            />
            <label
              htmlFor="isIndividual"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Cadastro em Pessoa Física
            </label>
          </div>
          {errors.isCompany && <p className="text-sm text-red-500">{errors.isCompany}</p>}
        </div>
      </div>

      {formData.isCompany && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Informações da Empresa</h2>
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Nome da Empresa</Label>
              <Input
                id="companyName"
                name="companyName"
                type="text"
                placeholder="Nome da sua empresa integradora"
                value={formData.companyName}
                onChange={handleChange}
                required={formData.isCompany}
                className={errors.companyName ? "border-red-500" : ""}
              />
              {errors.companyName && <p className="text-sm text-red-500">{errors.companyName}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                name="cnpj"
                type="text"
                placeholder="00.000.000/0000-00"
                value={formData.cnpj}
                onChange={handleChange}
                required={formData.isCompany}
                maxLength={18}
                className={errors.cnpj ? "border-red-500" : ""}
              />
              {errors.cnpj && <p className="text-sm text-red-500">{errors.cnpj}</p>}
            </div>
          </div>
        </div>
      )}

      {formData.isIndividual && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Informações Pessoais</h2>
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                name="cpf"
                type="text"
                placeholder="000.000.000-00"
                value={formData.cpf}
                onChange={handleChange}
                required={formData.isIndividual}
                maxLength={14}
                className={errors.cpf ? "border-red-500" : ""}
              />
              {errors.cpf && <p className="text-sm text-red-500">{errors.cpf}</p>}
            </div>
          </div>
        </div>
      )}

      <Button 
        type="submit" 
        className="w-full bg-orange-600 hover:bg-orange-700" 
        disabled={loading || !isPasswordValid}
      >
        {loading ? "Criando conta..." : "Criar conta"}
      </Button>
      
      <div className="text-center text-sm text-gray-600">
        Já tem uma conta?{" "}
        <Link 
          href="/cliente/login" 
          className="font-medium text-orange-600 hover:text-orange-500"
        >
          Faça login
        </Link>
      </div>
    </form>
  );
}
