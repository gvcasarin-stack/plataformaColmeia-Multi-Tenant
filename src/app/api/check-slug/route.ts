import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceRoleClient } from '@/lib/supabase/server'
import { devLog } from '@/lib/utils/productionLogger'

// Lista de slugs reservados que não podem ser usados
const RESERVED_SLUGS = [
  'www',
  'api',
  'admin',
  'app',
  'mail',
  'ftp',
  'blog',
  'shop',
  'store',
  'support',
  'help',
  'docs',
  'status',
  'staging',
  'dev',
  'test',
  'demo',
  'registro',
  'register',
  'login',
  'auth',
  'dashboard',
  'painel',
  'cliente',
  'client',
  'user',
  'users',
  'account',
  'billing',
  'payment',
  'checkout',
  'webhook',
  'webhooks',
  'callback',
  'oauth',
  'sso',
  'cdn',
  'assets',
  'static',
  'media',
  'uploads',
  'files',
  'images',
  'videos',
  'downloads'
]

interface SlugCheckResponse {
  available: boolean
  slug: string
  suggestions?: string[]
  error?: string
  message?: string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')?.toLowerCase().trim()

    if (!slug) {
      return NextResponse.json({
        available: false,
        slug: '',
        error: 'Slug é obrigatório'
      } as SlugCheckResponse)
    }

    // Validar formato do slug
    const slugRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/
    const isValidFormat = slug.length >= 3 && slug.length <= 30 && slugRegex.test(slug)

    if (!isValidFormat) {
      return NextResponse.json({
        available: false,
        slug,
        error: 'Formato inválido',
        message: 'O slug deve ter entre 3-30 caracteres, usar apenas letras minúsculas, números e hífens, e não pode começar ou terminar com hífen.'
      } as SlugCheckResponse)
    }

    // Verificar se é slug reservado
    if (RESERVED_SLUGS.includes(slug)) {
      return NextResponse.json({
        available: false,
        slug,
        error: 'Slug reservado',
        message: 'Este nome está reservado pelo sistema. Tente outro.',
        suggestions: generateSuggestions(slug)
      } as SlugCheckResponse)
    }

    // Verificar se já existe no banco
    const supabase = createSupabaseServiceRoleClient()
    
    const { data: existingOrg, error: dbError } = await supabase
      .from('organizations')
      .select('slug')
      .eq('slug', slug)
      .single()

    if (dbError && dbError.code !== 'PGRST116') { // PGRST116 = não encontrado
      devLog.error('[check-slug] Erro ao verificar slug no banco:', dbError)
      return NextResponse.json({
        available: false,
        slug,
        error: 'Erro interno',
        message: 'Erro ao verificar disponibilidade. Tente novamente.'
      } as SlugCheckResponse)
    }

    if (existingOrg) {
      return NextResponse.json({
        available: false,
        slug,
        error: 'Slug já existe',
        message: 'Este nome já está em uso. Tente outro.',
        suggestions: generateSuggestions(slug)
      } as SlugCheckResponse)
    }

    // Slug disponível!
    return NextResponse.json({
      available: true,
      slug,
      message: 'Nome disponível!'
    } as SlugCheckResponse)

  } catch (error) {
    devLog.error('[check-slug] Erro inesperado:', error)
    return NextResponse.json({
      available: false,
      slug: '',
      error: 'Erro interno',
      message: 'Erro inesperado. Tente novamente.'
    } as SlugCheckResponse, { status: 500 })
  }
}

// Função para gerar sugestões de slugs alternativos
function generateSuggestions(baseSlug: string): string[] {
  const suggestions: string[] = []
  
  // Remover caracteres inválidos e normalizar
  const cleanSlug = baseSlug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')

  if (cleanSlug && cleanSlug !== baseSlug) {
    suggestions.push(cleanSlug)
  }

  // Adicionar sufixos numéricos
  for (let i = 1; i <= 3; i++) {
    suggestions.push(`${cleanSlug}-${i}`)
  }

  // Adicionar sufixos descritivos
  const suffixes = ['solar', 'energia', 'projetos', 'engenharia', 'tech']
  suffixes.forEach(suffix => {
    const suggestion = `${cleanSlug}-${suffix}`
    if (suggestion.length <= 30) {
      suggestions.push(suggestion)
    }
  })

  // Remover duplicatas e limitar a 5 sugestões
  return [...new Set(suggestions)]
    .filter(s => s.length >= 3 && s.length <= 30)
    .slice(0, 5)
}

// Rate limiting simples baseado em IP
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const windowMs = 60 * 1000 // 1 minuto
  const maxRequests = 30 // máximo 30 requests por minuto

  const record = rateLimitMap.get(ip)
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (record.count >= maxRequests) {
    return false
  }

  record.count++
  return true
}

// Middleware para rate limiting
export async function middleware(request: NextRequest) {
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
  
  if (!checkRateLimit(ip)) {
    return NextResponse.json({
      available: false,
      slug: '',
      error: 'Rate limit exceeded',
      message: 'Muitas tentativas. Aguarde um momento.'
    } as SlugCheckResponse, { status: 429 })
  }

  return NextResponse.next()
}
