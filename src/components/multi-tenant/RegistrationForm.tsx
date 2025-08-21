'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from '@/components/ui/use-toast'
import { registerOrganization, type RegistrationData } from '@/lib/actions/registration-actions'
import { devLog } from '@/lib/utils/productionLogger'
import { Check, X, Eye, EyeOff, Loader2 } from 'lucide-react'

interface FormErrors {
  companyName?: string
  slug?: string
  adminName?: string
  adminEmail?: string
  adminPassword?: string
  plan?: string
  acceptedTerms?: string
  acceptedPrivacy?: string
}

interface SlugValidation {
  isChecking: boolean
  isAvailable: boolean | null
  message: string
  suggestions: string[]
}

// Requisitos de senha
const passwordRequirements = [
  { regex: /.{8,}/, message: 'Pelo menos 8 caracteres' },
  { regex: /[A-Z]/, message: 'Pelo menos 1 letra maiúscula' },
  { regex: /[a-z]/, message: 'Pelo menos 1 letra minúscula' },
  { regex: /[0-9]/, message: 'Pelo menos 1 número' },
  { regex: /[^A-Za-z0-9]/, message: 'Pelo menos 1 caractere especial' }
]

export function RegistrationForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  
  // Estados do formulário
  const [formData, setFormData] = useState<RegistrationData>({
    companyName: '',
    slug: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    plan: 'basico',
    acceptedTerms: false,
    acceptedPrivacy: false
  })
  
  const [errors, setErrors] = useState<FormErrors>({})
  const [slugValidation, setSlugValidation] = useState<SlugValidation>({
    isChecking: false,
    isAvailable: null,
    message: '',
    suggestions: []
  })
  
  const [passwordRequirementsMet, setPasswordRequirementsMet] = useState<boolean[]>(
    new Array(passwordRequirements.length).fill(false)
  )

  // Gerar slug automaticamente baseado no nome da empresa
  const generateSlugFromCompanyName = (companyName: string) => {
    return companyName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
      .replace(/\s+/g, '-') // Substitui espaços por hífens
      .replace(/-+/g, '-') // Remove hífens duplicados
      .replace(/^-|-$/g, '') // Remove hífens no início e fim
      .slice(0, 30) // Limita a 30 caracteres
  }

  // Validar slug em tempo real
  const validateSlug = async (slug: string) => {
    if (!slug || slug.length < 3) {
      setSlugValidation({
        isChecking: false,
        isAvailable: null,
        message: '',
        suggestions: []
      })
      return
    }

    setSlugValidation(prev => ({ ...prev, isChecking: true }))

    try {
      const response = await fetch(`/api/check-slug?slug=${encodeURIComponent(slug)}`)
      const data = await response.json()
      
      setSlugValidation({
        isChecking: false,
        isAvailable: data.available,
        message: data.message || (data.available ? 'Nome disponível!' : 'Nome não disponível'),
        suggestions: data.suggestions || []
      })
    } catch (error) {
      devLog.error('[RegistrationForm] Erro ao validar slug:', error)
      setSlugValidation({
        isChecking: false,
        isAvailable: null,
        message: 'Erro ao verificar disponibilidade',
        suggestions: []
      })
    }
  }

  // Debounce para validação de slug
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.slug) {
        validateSlug(formData.slug)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [formData.slug])

  // Validar requisitos de senha
  useEffect(() => {
    const newRequirementsMet = passwordRequirements.map(req => 
      req.regex.test(formData.adminPassword)
    )
    setPasswordRequirementsMet(newRequirementsMet)
  }, [formData.adminPassword])

  // Atualizar campo do formulário
  const updateField = (field: keyof RegistrationData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Limpar erro do campo
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
    
    // Auto-gerar slug quando nome da empresa muda
    if (field === 'companyName' && typeof value === 'string') {
      const autoSlug = generateSlugFromCompanyName(value)
      setFormData(prev => ({ ...prev, slug: autoSlug }))
    }
  }

  // Validar formulário
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    // Validar nome da empresa
    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Nome da empresa é obrigatório'
    } else if (formData.companyName.length < 2) {
      newErrors.companyName = 'Nome deve ter pelo menos 2 caracteres'
    }

    // Validar slug
    if (!formData.slug.trim()) {
      newErrors.slug = 'Nome da empresa (slug) é obrigatório'
    } else if (formData.slug.length < 3) {
      newErrors.slug = 'Slug deve ter pelo menos 3 caracteres'
    } else if (slugValidation.isAvailable === false) {
      newErrors.slug = 'Este nome não está disponível'
    }

    // Validar nome do admin
    if (!formData.adminName.trim()) {
      newErrors.adminName = 'Nome do administrador é obrigatório'
    } else if (formData.adminName.length < 2) {
      newErrors.adminName = 'Nome deve ter pelo menos 2 caracteres'
    }

    // Validar email
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
    if (!formData.adminEmail.trim()) {
      newErrors.adminEmail = 'Email é obrigatório'
    } else if (!emailRegex.test(formData.adminEmail)) {
      newErrors.adminEmail = 'Email inválido'
    }

    // Validar senha
    if (!formData.adminPassword) {
      newErrors.adminPassword = 'Senha é obrigatória'
    } else if (!passwordRequirementsMet.every(met => met)) {
      newErrors.adminPassword = 'Senha não atende aos requisitos'
    }

    // Validar termos
    if (!formData.acceptedTerms) {
      newErrors.acceptedTerms = 'Você deve aceitar os termos de uso'
    }

    if (!formData.acceptedPrivacy) {
      newErrors.acceptedPrivacy = 'Você deve aceitar a política de privacidade'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Próximo passo
  const nextStep = () => {
    if (currentStep === 1) {
      // Validar dados da empresa
      const companyErrors: FormErrors = {}
      
      if (!formData.companyName.trim()) {
        companyErrors.companyName = 'Nome da empresa é obrigatório'
      }
      
      if (!formData.slug.trim()) {
        companyErrors.slug = 'Nome da empresa (slug) é obrigatório'
      } else if (slugValidation.isAvailable === false) {
        companyErrors.slug = 'Este nome não está disponível'
      }

      if (Object.keys(companyErrors).length > 0) {
        setErrors(companyErrors)
        return
      }
    }

    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
    }
  }

  // Passo anterior
  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  // Submeter formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast({
        title: "Erro no formulário",
        description: "Por favor, corrija os erros antes de continuar.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      devLog.log('[RegistrationForm] Iniciando registro:', {
        companyName: formData.companyName,
        slug: formData.slug,
        plan: formData.plan
      })

      const result = await registerOrganization(formData)

      if (result.success) {
        toast({
          title: "Conta criada com sucesso!",
          description: "Redirecionando para sua área administrativa...",
        })

        // Aguardar um pouco para mostrar o toast
        setTimeout(() => {
          if (result.redirectUrl) {
            window.location.href = result.redirectUrl
          }
        }, 2000)
      } else {
        toast({
          title: "Erro ao criar conta",
          description: result.message || "Tente novamente em alguns instantes.",
          variant: "destructive",
        })
      }
    } catch (error) {
      devLog.error('[RegistrationForm] Erro inesperado:', error)
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header com progresso */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-white">
              Criar Conta
            </h1>
            <div className="text-blue-100 text-sm">
              Passo {currentStep} de 3
            </div>
          </div>
          
          {/* Barra de progresso */}
          <div className="w-full bg-blue-500 rounded-full h-2">
            <div 
              className="bg-white h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 3) * 100}%` }}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8">
          {/* Passo 1: Dados da Empresa */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Dados da Empresa
                </h2>
                <p className="text-gray-600">
                  Vamos começar com as informações básicas da sua empresa
                </p>
              </div>

              <div>
                <Label htmlFor="companyName">Nome da Empresa *</Label>
                <Input
                  id="companyName"
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => updateField('companyName', e.target.value)}
                  className={errors.companyName ? 'border-red-500' : ''}
                  placeholder="Ex: Solar Tech Energia"
                  maxLength={100}
                />
                {errors.companyName && (
                  <p className="text-red-500 text-sm mt-1">{errors.companyName}</p>
                )}
              </div>

              <div>
                <Label htmlFor="slug">Nome da Empresa (URL) *</Label>
                <div className="relative">
                  <Input
                    id="slug"
                    type="text"
                    value={formData.slug}
                    onChange={(e) => updateField('slug', e.target.value.toLowerCase())}
                    className={errors.slug ? 'border-red-500' : slugValidation.isAvailable === true ? 'border-green-500' : ''}
                    placeholder="solar-tech-energia"
                    maxLength={30}
                  />
                  
                  {/* Indicador de validação */}
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {slugValidation.isChecking && (
                      <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                    )}
                    {!slugValidation.isChecking && slugValidation.isAvailable === true && (
                      <Check className="w-4 h-4 text-green-500" />
                    )}
                    {!slugValidation.isChecking && slugValidation.isAvailable === false && (
                      <X className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                </div>
                
                <div className="text-sm text-gray-600 mt-1">
                  Sua empresa será acessível em: <strong>{formData.slug || 'sua-empresa'}.gerenciamentofotovoltaico.com.br</strong>
                </div>
                
                {slugValidation.message && (
                  <p className={`text-sm mt-1 ${slugValidation.isAvailable ? 'text-green-600' : 'text-red-500'}`}>
                    {slugValidation.message}
                  </p>
                )}
                
                {slugValidation.suggestions.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600 mb-1">Sugestões:</p>
                    <div className="flex flex-wrap gap-2">
                      {slugValidation.suggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => updateField('slug', suggestion)}
                          className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {errors.slug && (
                  <p className="text-red-500 text-sm mt-1">{errors.slug}</p>
                )}
              </div>

              {/* Escolha do plano */}
              <div>
                <Label>Escolha seu Plano *</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  {/* Plano Básico */}
                  <div 
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      formData.plan === 'basico' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => updateField('plan', 'basico')}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`w-4 h-4 rounded-full border-2 mt-1 ${
                        formData.plan === 'basico' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                      }`}>
                        {formData.plan === 'basico' && (
                          <div className="w-2 h-2 bg-white rounded-full m-0.5" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">Básico</h3>
                        <p className="text-2xl font-bold text-blue-600 my-1">R$ 299<span className="text-sm font-normal text-gray-600">/mês</span></p>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• 30 projetos</li>
                          <li>• 3GB de armazenamento</li>
                          <li>• 10 usuários</li>
                          <li>• 100 clientes</li>
                          <li>• Suporte por email</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Plano Profissional */}
                  <div 
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all relative ${
                      formData.plan === 'profissional' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => updateField('plan', 'profissional')}
                  >
                    <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
                      POPULAR
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className={`w-4 h-4 rounded-full border-2 mt-1 ${
                        formData.plan === 'profissional' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                      }`}>
                        {formData.plan === 'profissional' && (
                          <div className="w-2 h-2 bg-white rounded-full m-0.5" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">Profissional</h3>
                        <p className="text-2xl font-bold text-blue-600 my-1">R$ 399<span className="text-sm font-normal text-gray-600">/mês</span></p>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• 100 projetos</li>
                          <li>• 10GB de armazenamento</li>
                          <li>• 50 usuários</li>
                          <li>• 1.000 clientes</li>
                          <li>• Suporte prioritário</li>
                          <li>• Relatórios avançados</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button 
                  type="button" 
                  onClick={nextStep}
                  disabled={!formData.companyName || !formData.slug || slugValidation.isAvailable !== true}
                >
                  Continuar
                </Button>
              </div>
            </div>
          )}

          {/* Passo 2: Dados do Administrador */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Dados do Administrador
                </h2>
                <p className="text-gray-600">
                  Agora vamos criar sua conta de administrador
                </p>
              </div>

              <div>
                <Label htmlFor="adminName">Nome Completo *</Label>
                <Input
                  id="adminName"
                  type="text"
                  value={formData.adminName}
                  onChange={(e) => updateField('adminName', e.target.value)}
                  className={errors.adminName ? 'border-red-500' : ''}
                  placeholder="João Silva"
                  maxLength={100}
                />
                {errors.adminName && (
                  <p className="text-red-500 text-sm mt-1">{errors.adminName}</p>
                )}
              </div>

              <div>
                <Label htmlFor="adminEmail">Email *</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  value={formData.adminEmail}
                  onChange={(e) => updateField('adminEmail', e.target.value)}
                  className={errors.adminEmail ? 'border-red-500' : ''}
                  placeholder="joao@empresa.com"
                />
                {errors.adminEmail && (
                  <p className="text-red-500 text-sm mt-1">{errors.adminEmail}</p>
                )}
              </div>

              <div>
                <Label htmlFor="adminPassword">Senha *</Label>
                <div className="relative">
                  <Input
                    id="adminPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.adminPassword}
                    onChange={(e) => updateField('adminPassword', e.target.value)}
                    className={errors.adminPassword ? 'border-red-500' : ''}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                
                {/* Requisitos de senha */}
                <div className="mt-2 space-y-1">
                  {passwordRequirements.map((req, index) => (
                    <div key={index} className="flex items-center space-x-2 text-sm">
                      {passwordRequirementsMet[index] ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <X className="w-4 h-4 text-red-500" />
                      )}
                      <span className={passwordRequirementsMet[index] ? 'text-green-600' : 'text-red-600'}>
                        {req.message}
                      </span>
                    </div>
                  ))}
                </div>
                
                {errors.adminPassword && (
                  <p className="text-red-500 text-sm mt-1">{errors.adminPassword}</p>
                )}
              </div>

              <div className="flex justify-between">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={prevStep}
                >
                  Voltar
                </Button>
                <Button 
                  type="button" 
                  onClick={nextStep}
                  disabled={!formData.adminName || !formData.adminEmail || !passwordRequirementsMet.every(met => met)}
                >
                  Continuar
                </Button>
              </div>
            </div>
          )}

          {/* Passo 3: Confirmação e Termos */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Confirmação
                </h2>
                <p className="text-gray-600">
                  Revise os dados e aceite os termos para finalizar
                </p>
              </div>

              {/* Resumo dos dados */}
              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <h3 className="font-semibold text-gray-900">Resumo da Conta</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Empresa:</span>
                    <p className="font-medium">{formData.companyName}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">URL:</span>
                    <p className="font-medium">{formData.slug}.gerenciamentofotovoltaico.com.br</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Administrador:</span>
                    <p className="font-medium">{formData.adminName}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Email:</span>
                    <p className="font-medium">{formData.adminEmail}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Plano:</span>
                    <p className="font-medium capitalize">{formData.plan}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Trial:</span>
                    <p className="font-medium text-green-600">7 dias grátis</p>
                  </div>
                </div>
              </div>

              {/* Termos e condições */}
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="acceptedTerms"
                    checked={formData.acceptedTerms}
                    onCheckedChange={(checked) => updateField('acceptedTerms', !!checked)}
                  />
                  <label htmlFor="acceptedTerms" className="text-sm text-gray-700 leading-5">
                    Eu li e aceito os{' '}
                    <a href="#" className="text-blue-600 hover:underline">
                      Termos de Uso
                    </a>{' '}
                    do Sistema de Gerenciamento Fotovoltaico
                  </label>
                </div>
                {errors.acceptedTerms && (
                  <p className="text-red-500 text-sm ml-6">{errors.acceptedTerms}</p>
                )}

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="acceptedPrivacy"
                    checked={formData.acceptedPrivacy}
                    onCheckedChange={(checked) => updateField('acceptedPrivacy', !!checked)}
                  />
                  <label htmlFor="acceptedPrivacy" className="text-sm text-gray-700 leading-5">
                    Eu li e aceito a{' '}
                    <a href="#" className="text-blue-600 hover:underline">
                      Política de Privacidade
                    </a>{' '}
                    do Sistema de Gerenciamento Fotovoltaico
                  </label>
                </div>
                {errors.acceptedPrivacy && (
                  <p className="text-red-500 text-sm ml-6">{errors.acceptedPrivacy}</p>
                )}
              </div>

              {/* Informações do trial */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                    <Check className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-900 mb-1">Trial Gratuito de 7 Dias</h4>
                    <p className="text-sm text-blue-700">
                      Você terá acesso completo ao plano {formData.plan === 'basico' ? 'Básico' : 'Profissional'} por 7 dias, 
                      sem necessidade de cartão de crédito. Após o período, você pode fazer upgrade para continuar usando.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={prevStep}
                >
                  Voltar
                </Button>
                <Button 
                  type="submit"
                  disabled={!formData.acceptedTerms || !formData.acceptedPrivacy || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Criando conta...
                    </>
                  ) : (
                    'Criar Conta'
                  )}
                </Button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
