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
import { registrationLogger } from '@/lib/utils/registrationLogger'
import { Check, X, Eye, EyeOff, Loader2 } from 'lucide-react'

interface FormErrors {
  companyName?: string
  slug?: string
  adminName?: string
  adminEmail?: string
  adminPassword?: string
  adminPhone?: string
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
  const [isNextStepLoading, setIsNextStepLoading] = useState(false)
  
  // Estados do formulário
  const [formData, setFormData] = useState<RegistrationData>({
    companyName: '',
    slug: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    adminPhone: '',
    plan: 'basico'
  })
  
  const [errors, setErrors] = useState<FormErrors>({})
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)
  
  // Estado de validação do slug
  const [slugValidation, setSlugValidation] = useState<SlugValidation>({
    isChecking: false,
    isAvailable: null,
    message: '',
    suggestions: []
  })

  // 🔒 VALIDAÇÃO DE EMAIL: Estados para verificar se email já existe
  const [emailCheckLoading, setEmailCheckLoading] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null)

  // 🛠️ CAMPOS INDEPENDENTES: Nome da empresa e URL são totalmente independentes

  // Função para gerar slug automaticamente
  const generateSlug = (companyName: string): string => {
    return companyName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
      .replace(/\s+/g, '-') // Substitui espaços por hífen
      .replace(/-+/g, '-') // Remove hífens duplicados
      .replace(/^-|-$/g, '') // Remove hífens do início e fim
      .substring(0, 30) // Limita a 30 caracteres
  }

  // Validação de slug em tempo real
  const validateSlug = async (slug: string) => {
    if (!slug || slug.length < 3) {
      setSlugValidation({
        isChecking: false,
        isAvailable: null,
        message: 'Slug deve ter pelo menos 3 caracteres',
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
        message: data.available ? 'Slug disponível!' : data.message || 'Slug não disponível',
        suggestions: data.suggestions || []
      })
    } catch (error) {
      devLog.error('Erro ao validar slug:', error)
      setSlugValidation({
        isChecking: false,
        isAvailable: false,
        message: 'Erro ao verificar disponibilidade',
        suggestions: []
      })
    }
  }

  // Debounce para validação do slug
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.slug) {
        validateSlug(formData.slug)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [formData.slug])

  // 🔒 VALIDAÇÃO DE EMAIL: Verificar se email já existe no sistema
  const checkEmailAvailability = async (email: string) => {
    // Resetar estados
    setEmailError(null)
    setEmailAvailable(null)

    // Validação básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email || !emailRegex.test(email)) {
      return
    }

    setEmailCheckLoading(true)

    try {
      const response = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        devLog.error('[RegistrationForm] Erro ao verificar email:', data.error)
        return
      }

      if (data.exists) {
        setEmailAvailable(false)
        setEmailError('Este e-mail já está cadastrado no sistema. Faça login ou recupere sua senha.')
      } else {
        setEmailAvailable(true)
      }

    } catch (error) {
      devLog.error('[RegistrationForm] Erro ao verificar email:', error)
    } finally {
      setEmailCheckLoading(false)
    }
  }

  // Disparar verificação de email quando usuário terminar de digitar (debounce)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.adminEmail) {
        checkEmailAvailability(formData.adminEmail)
      }
    }, 800) // Aguarda 800ms após usuário parar de digitar

    return () => clearTimeout(timeoutId)
  }, [formData.adminEmail])

  // 🛠️ CORRIGIDO: DESABILITAR AUTO-PREENCHIMENTO COMPLETAMENTE
  // Campos Nome da Empresa e URL são agora totalmente independentes
  // useEffect removido para garantir independência total dos campos

  // Validação da senha
  const getPasswordStrength = (password: string) => {
    const requirements = passwordRequirements.map(req => ({
      ...req,
      met: req.regex.test(password)
    }))
    
    const score = requirements.filter(req => req.met).length
    return { requirements, score }
  }

  const passwordStrength = getPasswordStrength(formData.adminPassword)

  // Validação do formulário
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    // Validação por etapa
    if (currentStep >= 1) {
      if (!formData.companyName.trim()) {
        newErrors.companyName = 'Nome da empresa é obrigatório'
      }
      
      if (!formData.slug.trim()) {
        newErrors.slug = 'Slug é obrigatório'
      } else if (!slugValidation.isAvailable) {
        newErrors.slug = 'Slug não está disponível'
      }
    }

    if (currentStep >= 2) {
      if (!formData.adminName.trim()) {
        newErrors.adminName = 'Nome do administrador é obrigatório'
      }

      if (!formData.adminEmail.trim()) {
        newErrors.adminEmail = 'Email é obrigatório'
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.adminEmail)) {
        newErrors.adminEmail = 'Email inválido'
      }

      if (!formData.adminPhone.trim()) {
        newErrors.adminPhone = 'Telefone (WhatsApp) é obrigatório'
      } else if (!/^\(\d{2}\)\s\d{4,5}-\d{4}$/.test(formData.adminPhone) && !/^\d{10,11}$/.test(formData.adminPhone.replace(/\D/g, ''))) {
        newErrors.adminPhone = 'Formato de telefone inválido. Use (11) 99999-9999 ou apenas números'
      }

      if (!formData.adminPassword) {
        newErrors.adminPassword = 'Senha é obrigatória'
      } else if (passwordStrength.score < 5) {
        newErrors.adminPassword = 'Senha não atende aos requisitos'
      }
    }

    if (currentStep >= 3) {
      if (!acceptedTerms) {
        newErrors.acceptedTerms = 'Você deve aceitar os termos de uso'
      }
      
      if (!acceptedPrivacy) {
        newErrors.acceptedPrivacy = 'Você deve aceitar a política de privacidade'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Função para enviar dados para o webhook de marketing
  const sendMarketingWebhook = async () => {
    try {
      const webhookData = {
        nome_completo: formData.adminName,
        email: formData.adminEmail,
        telefone: formData.adminPhone
      }

      devLog.log('🎯 Enviando dados para webhook de marketing:', webhookData)

      const response = await fetch('https://webhook.colmeiasolar.digital/webhook/formulario', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookData)
      })

      if (response.ok) {
        devLog.log('✅ Webhook de marketing enviado com sucesso')
      } else {
        devLog.warn('⚠️ Webhook de marketing falhou, mas continuando o fluxo normal')
      }
    } catch (error) {
      devLog.error('❌ Erro ao enviar webhook de marketing:', error)
      // Não interromper o fluxo normal por causa de erro no webhook
    }
  }

  // Próximo passo
  const nextStep = async () => {
    // ✅ VERIFICAÇÃO EXTRA: Se estamos no passo 2, verificar email antes de avançar
    if (currentStep === 2) {
      setIsNextStepLoading(true)
      await checkEmailAvailability(formData.adminEmail)
      setIsNextStepLoading(false)

      // Se o email não estiver disponível, bloquear avanço
      if (emailAvailable === false || emailError) {
        toast({
          title: "Email já cadastrado",
          description: emailError || "Este email já está em uso no sistema.",
          variant: "destructive",
        })
        return
      }
    }

    if (validateForm()) {
      setIsNextStepLoading(true)

      // Se estamos no passo 2 e temos os dados do administrador, enviar para webhook
      if (currentStep === 2 && formData.adminName && formData.adminEmail && formData.adminPhone) {
        await sendMarketingWebhook()
      }

      setCurrentStep(prev => Math.min(prev + 1, 3))
      setIsNextStepLoading(false)
    }
  }

  // Passo anterior
  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  // Submissão do formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // ✅ VERIFICAÇÃO GLOBAL FINAL: Verificar email antes de submeter
    devLog.log("[RegistrationForm] handleSubmit: Verificando disponibilidade do email...")
    await checkEmailAvailability(formData.adminEmail)

    // Se o email não estiver disponível, bloquear submissão
    if (emailAvailable === false || emailError) {
      devLog.warn("[RegistrationForm] handleSubmit: Email não disponível, bloqueando submissão")
      toast({
        title: "Email já cadastrado",
        description: emailError || "Este email já está em uso no sistema.",
        variant: "destructive",
      })
      return
    }

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    
    // Log visível no console do navegador
    devLog.log('🚀 INICIANDO REGISTRO DE ORGANIZAÇÃO', {
      companyName: formData.companyName,
      slug: formData.slug,
      plan: formData.plan,
      timestamp: new Date().toISOString()
    })
    
    registrationLogger.log('FORM_SUBMIT', 'Usuário iniciou submissão do formulário', {
      companyName: formData.companyName,
      slug: formData.slug,
      plan: formData.plan
    })

    try {
      const result = await registerOrganization(formData)

      if (result.success) {
        devLog.log('✅ REGISTRO CONCLUÍDO COM SUCESSO!', result)
        registrationLogger.log('FORM_SUCCESS', 'Registro concluído com sucesso', result)
        
        toast({
          title: "Sucesso!",
          description: result.message,
        })

        // Redirecionar para o tenant criado
        if (result.redirectUrl) {
          window.location.href = result.redirectUrl
        }
      } else {
        devLog.error('❌ ERRO NO REGISTRO:', result)
        registrationLogger.error('FORM_ERROR', 'Erro retornado pela função de registro', result)
        
        toast({
          title: "Erro",
          description: result.message || 'Erro ao criar organização',
          variant: "destructive",
        })
      }
    } catch (error) {
      devLog.error('❌ ERRO INESPERADO NO REGISTRO:', error)
      registrationLogger.error('FORM_EXCEPTION', 'Erro inesperado na submissão do formulário', error)
      devLog.error('Erro no registro:', error)
      
      toast({
        title: "Erro",
        description: 'Erro inesperado. Tente novamente.',
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Renderização do formulário por etapas
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="companyName" className="text-sm font-medium text-gray-700">Nome da Empresa *</Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                placeholder="Ex: Solar Tech Energia"
                className={`mt-1 h-12 ${errors.companyName ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'}`}
              />
              {errors.companyName && (
                <p className="text-sm text-red-500 mt-1">{errors.companyName}</p>
              )}
            </div>

            <div>
              <Label htmlFor="slug" className="text-sm font-medium text-gray-700">Nome da Empresa (URL) *</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, slug: e.target.value }))
                  // 🛠️ CAMPOS INDEPENDENTES: URL não depende mais do nome da empresa
                }}
                placeholder="solar-tech-energia"
                className={`mt-1 h-12 ${errors.slug ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'}`}
              />
              <p className="text-sm text-gray-500 mt-1">
                Sua empresa será acessível em: <strong>{formData.slug || 'teste'}.gerenciamentofotovoltaico.com.br</strong>
              </p>
              
              {/* Status do slug */}
              {slugValidation.isChecking && (
                <div className="flex items-center mt-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verificando disponibilidade...
                </div>
              )}
              
              {slugValidation.isAvailable === true && (
                <div className="flex items-center mt-2 text-sm text-green-600">
                  <Check className="w-4 h-4 mr-2" />
                  Nome disponível!
                </div>
              )}
              
              {slugValidation.isAvailable === false && (
                <div className="mt-2">
                  <div className="flex items-center text-sm text-red-500">
                    <X className="w-4 h-4 mr-2" />
                    {slugValidation.message}
                  </div>
                  {slugValidation.suggestions.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-600">Sugestões:</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {slugValidation.suggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, slug: suggestion }))}
                            className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {errors.slug && (
                <p className="text-sm text-red-500 mt-1">{errors.slug}</p>
              )}
            </div>

            {/* Seleção de planos no primeiro passo */}
            <div>
              <Label className="text-sm font-medium text-gray-700">Escolha seu Plano *</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div 
                  className={`border-2 rounded-lg p-6 cursor-pointer transition-all duration-200 ${
                    formData.plan === 'basico' 
                      ? 'border-blue-500 bg-blue-50 shadow-md' 
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }`}
                  onClick={() => setFormData(prev => ({ ...prev, plan: 'basico' }))}
                >
                  <div className="flex items-center mb-3">
                    <input
                      type="radio"
                      id="plan-basico"
                      name="plan"
                      value="basico"
                      checked={formData.plan === 'basico'}
                      onChange={() => setFormData(prev => ({ ...prev, plan: 'basico' }))}
                      className="mr-3 w-4 h-4 text-blue-600"
                    />
                    <label htmlFor="plan-basico" className="font-semibold text-lg cursor-pointer">Básico</label>
                  </div>
                  <div className="mb-4">
                    <span className="text-2xl font-bold text-blue-600">R$ 199</span>
                    <span className="text-gray-600">/mês</span>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li>• 60 projetos</li>
                    <li>• 10GB de armazenamento</li>
                    <li>• 10 usuários</li>
                    <li>• 100 clientes</li>
                    <li>• Suporte por email</li>
                  </ul>
                </div>

                <div 
                  className={`border-2 rounded-lg p-6 cursor-pointer transition-all duration-200 relative ${
                    formData.plan === 'profissional' 
                      ? 'border-blue-500 bg-blue-50 shadow-md' 
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }`}
                  onClick={() => setFormData(prev => ({ ...prev, plan: 'profissional' }))}
                >
                  {/* Badge Popular */}
                  <div className="absolute -top-3 right-4">
                    <span className="bg-orange-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                      POPULAR
                    </span>
                  </div>
                  
                  <div className="flex items-center mb-3">
                    <input
                      type="radio"
                      id="plan-profissional"
                      name="plan"
                      value="profissional"
                      checked={formData.plan === 'profissional'}
                      onChange={() => setFormData(prev => ({ ...prev, plan: 'profissional' }))}
                      className="mr-3 w-4 h-4 text-blue-600"
                    />
                    <label htmlFor="plan-profissional" className="font-semibold text-lg cursor-pointer">Profissional</label>
                  </div>
                  <div className="mb-4">
                    <span className="text-2xl font-bold text-blue-600">R$ 349</span>
                    <span className="text-gray-600">/mês</span>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li>• 500 projetos</li>
                    <li>• 100GB de armazenamento</li>
                    <li>• 50 usuários</li>
                    <li>• 1.000 clientes</li>
                    <li>• Suporte prioritário</li>
                    <li>• Relatórios avançados</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="adminName" className="text-sm font-medium text-gray-700">Nome Completo *</Label>
              <Input
                id="adminName"
                value={formData.adminName}
                onChange={(e) => setFormData(prev => ({ ...prev, adminName: e.target.value }))}
                placeholder="João Silva"
                className={`mt-1 h-12 ${errors.adminName ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'}`}
              />
              {errors.adminName && (
                <p className="text-sm text-red-500 mt-1">{errors.adminName}</p>
              )}
            </div>

            <div>
              <Label htmlFor="adminEmail" className="text-sm font-medium text-gray-700">Email *</Label>
              <div className="relative">
                <Input
                  id="adminEmail"
                  type="email"
                  value={formData.adminEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, adminEmail: e.target.value }))}
                  placeholder="joao@empresa.com"
                  className={`mt-1 h-12 ${errors.adminEmail || emailError ? 'border-red-500' : emailAvailable ? 'border-green-500' : 'border-gray-300 focus:border-blue-500'}`}
                />
                {emailCheckLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  </div>
                )}
                {emailAvailable === true && !emailCheckLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Check className="w-5 h-5 text-green-500" />
                  </div>
                )}
                {emailAvailable === false && !emailCheckLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="w-5 h-5 text-red-500" />
                  </div>
                )}
              </div>
              {errors.adminEmail && (
                <p className="text-sm text-red-500 mt-1">{errors.adminEmail}</p>
              )}
              {emailError && (
                <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                  <X className="h-4 w-4" />
                  {emailError}
                </p>
              )}
              {emailAvailable === true && !emailCheckLoading && (
                <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                  <Check className="h-4 w-4" />
                  Email disponível!
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="adminPhone" className="text-sm font-medium text-gray-700">Telefone (WhatsApp) *</Label>
              <Input
                id="adminPhone"
                type="tel"
                value={formData.adminPhone}
                onChange={(e) => setFormData(prev => ({ ...prev, adminPhone: e.target.value }))}
                placeholder="(11) 99999-9999"
                className={`mt-1 h-12 ${errors.adminPhone ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'}`}
              />
              {errors.adminPhone && (
                <p className="text-sm text-red-500 mt-1">{errors.adminPhone}</p>
              )}
            </div>

            <div>
              <Label htmlFor="adminPassword" className="text-sm font-medium text-gray-700">Senha *</Label>
              <div className="relative">
                <Input
                  id="adminPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.adminPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, adminPassword: e.target.value }))}
                  placeholder="Digite uma senha forte"
                  className={`mt-1 h-12 ${errors.adminPassword ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              
              {/* Requisitos da senha */}
              {formData.adminPassword && (
                <div className="mt-2 space-y-1">
                  {passwordStrength.requirements.map((req, index) => (
                    <div key={index} className={`flex items-center text-sm ${req.met ? 'text-green-600' : 'text-red-500'}`}>
                      <X className="w-3 h-3 mr-2" />
                      {req.message}
                    </div>
                  ))}
                </div>
              )}
              
              {errors.adminPassword && (
                <p className="text-sm text-red-500 mt-1">{errors.adminPassword}</p>
              )}
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            {/* Revisão dos dados */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">Confirme seus dados</h3>
              
              {/* Dados da empresa */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-700 mb-2">Informações da Empresa</h4>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Nome:</span> {formData.companyName}</p>
                  <p><span className="font-medium">Subdomínio:</span> {formData.slug}.gerenciamentofotovoltaico.com.br</p>
                  <p><span className="font-medium">Plano:</span> {formData.plan === 'basico' ? 'Básico (R$ 199/mês)' : 'Profissional (R$ 349/mês)'}</p>
                </div>
              </div>

              {/* Dados do administrador */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-700 mb-2">Administrador</h4>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Nome:</span> {formData.adminName}</p>
                  <p><span className="font-medium">Email:</span> {formData.adminEmail}</p>
                  <p><span className="font-medium">Telefone (WhatsApp):</span> {formData.adminPhone}</p>
                </div>
              </div>
            </div>

            {/* Termos e condições */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                />
                <label htmlFor="terms" className="text-sm text-gray-600 leading-5">
                  Aceito os <a href="/legal/termos-de-uso" target="_blank" className="text-blue-600 hover:underline">termos de uso</a> *
                </label>
              </div>
              {errors.acceptedTerms && (
                <p className="text-sm text-red-500">{errors.acceptedTerms}</p>
              )}

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="privacy"
                  checked={acceptedPrivacy}
                  onCheckedChange={(checked) => setAcceptedPrivacy(checked as boolean)}
                />
                <label htmlFor="privacy" className="text-sm text-gray-600 leading-5">
                  Aceito a <a href="/legal/politica-de-privacidade" target="_blank" className="text-blue-600 hover:underline">política de privacidade</a> *
                </label>
              </div>
              {errors.acceptedPrivacy && (
                <p className="text-sm text-red-500">{errors.acceptedPrivacy}</p>
              )}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-0">
      {/* Header azul com progresso */}
      <div className="bg-blue-600 text-white p-4 rounded-t-lg mb-0">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">Criar Conta</h2>
          <p className="text-blue-100 text-sm">Passo {currentStep} de 3</p>
        </div>
        
        {/* Barra de progresso */}
        <div className="w-full bg-blue-500 rounded-full h-2">
          <div 
            className="bg-white h-2 rounded-full transition-all duration-300" 
            style={{ width: `${(currentStep / 3) * 100}%` }}
          />
        </div>
      </div>

      {/* Conteúdo da etapa */}
      <div className="px-6 pb-6">
        {/* Título da seção */}
        <div className="mb-6 pt-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {currentStep === 1 && 'Dados da Empresa'}
            {currentStep === 2 && 'Dados do Administrador'}
            {currentStep === 3 && 'Confirmação'}
          </h3>
          <p className="text-gray-600 text-sm mt-1">
            {currentStep === 1 && 'Vamos começar com as informações básicas da sua empresa'}
            {currentStep === 2 && 'Agora vamos criar sua conta de administrador'}
            {currentStep === 3 && 'Revise os dados e confirme o cadastro'}
          </p>
        </div>

        {/* Conteúdo da etapa */}
        {renderStep()}

        {/* Botões de ação */}
        <div className="flex justify-between pt-6">
          {currentStep > 1 && (
            <Button 
              type="button" 
              onClick={prevStep}
              variant="outline"
              className="px-8 py-2 text-gray-700 border-gray-300 hover:bg-gray-50"
            >
              Voltar
            </Button>
          )}
          
          <div className={currentStep === 1 ? 'ml-auto' : ''}>
            {currentStep < 3 ? (
              <Button
                type="button"
                onClick={nextStep}
                disabled={(currentStep === 1 && (!formData.companyName || !formData.slug || !slugValidation.isAvailable)) || isNextStepLoading}
                className="bg-gray-800 hover:bg-gray-900 text-white px-8 py-2 rounded-md font-medium"
              >
                {isNextStepLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  'Continuar'
                )}
              </Button>
            ) : (
              <Button 
                type="submit" 
                disabled={isSubmitting || !acceptedTerms || !acceptedPrivacy}
                className="bg-gray-800 hover:bg-gray-900 text-white px-8 py-2 rounded-md font-medium min-w-32"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  'Criar Conta'
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </form>
  )
}