# Convenções de Nomenclatura e Boas Práticas

Este documento estabelece as convenções de nomenclatura e boas práticas a serem seguidas no desenvolvimento da Plataforma Colmeia. A padronização é essencial para garantir a manutenibilidade do código e facilitar o trabalho em equipe.

## Convenções de Nomenclatura

### Arquivos e Componentes

| Tipo | Formato | Exemplos | Observações |
|------|---------|----------|-------------|
| Componentes React | **PascalCase** | `ProjectCard.tsx`, `LoginForm.tsx` | Deve refletir a função do componente |
| Hooks | **camelCase** com prefixo `use` | `useAuth.ts`, `useProjects.ts` | Sempre começar com "use" conforme convenção React |
| Utilitários | **camelCase** | `formatDate.ts`, `validators.ts` | Funções auxiliares e utilitárias |
| Tipos/Interfaces | **PascalCase** | `Project.ts`, `UserRole.ts` | Interface com "I" prefixo é desencorajado |
| Contextos | **PascalCase** com sufixo `Context` | `AuthContext.tsx`, `ThemeContext.tsx` | Incluir também um Provider com sufixo `Provider` |
| Arquivos de Barril | `index.ts` | `components/ui/index.ts` | Exportar todos os componentes da pasta |

### Convenções CSS/Tailwind

- Usar classes Tailwind sempre que possível
- Para estilos personalizados, usar CSS Modules com o nome `[ComponentName].module.css`
- Manter organização consistente de classes Tailwind (layout → tamanho → aparência → estados)

### Funções e Variáveis

| Tipo | Formato | Exemplos | Observações |
|------|---------|----------|-------------|
| Funções Assíncronas (API) | **camelCase** com prefixo específico | `getProject()`, `updateUser()`, `createNotification()` | Usar prefixos `get`, `create`, `update`, `delete`, `fetch` |
| Manipuladores de Eventos | **camelCase** com prefixo `handle` | `handleSubmit()`, `handleClick()` | Consistente em todos os componentes |
| Funções de Formatação | **camelCase** com prefixo `format` | `formatDate()`, `formatCurrency()` | Para transformação de dados para exibição |
| Funções de Validação | **camelCase** com prefixo `validate` ou `is` | `validateEmail()`, `isValidPassword()` | Para validação de dados |
| Variáveis de Estado | **camelCase** | `isLoading`, `currentUser`, `projectList` | Nomes descritivos que refletem seu propósito |
| Constantes | **UPPER_SNAKE_CASE** | `MAX_FILE_SIZE`, `DEFAULT_TIMEOUT` | Para valores fixos importantes |
| Props | **camelCase** | `initialData`, `onSubmit`, `isDisabled` | Consistente com convenções React |

### Interfaces e Types

| Tipo | Formato | Exemplos | Observações |
|------|---------|----------|-------------|
| Interfaces | **PascalCase** | `Project`, `User`, `NotificationProps` | Evitar prefixo "I" |
| Types | **PascalCase** | `ProjectStatus`, `ButtonVariant` | Usar para união de tipos ou aliases |
| Enums | **PascalCase** | `UserRole`, `ProjectPriority` | Valores em UPPER_CASE ou PascalCase (consistente) |
| Props Types | **PascalCase** com sufixo `Props` | `ButtonProps`, `FormProps` | Definir fora do componente |
| Generics | **UpperCase** simples | `T`, `K`, `V` | T para tipo genérico, K para chaves, V para valores |

### Serviços e APIs

| Tipo | Formato | Exemplos | Observações |
|------|---------|----------|-------------|
| Serviços | **camelCase** com sufixo `Service` | `projectService`, `authService` | Para módulos que contêm lógica de negócio |
| Chamadas de API | **camelCase** com prefixo baseado na ação | `fetchProjects()`, `createUser()` | Verbos que indicam a ação |
| Funções Firebase | **camelCase** | `getUserDoc()`, `updateProjectData()` | Operações específicas do Firebase |

## Estrutura de Pastas

### Componentes

Um componente pode ter a seguinte estrutura:

\`\`\`
Button/
├── Button.tsx       # Implementação principal
├── index.ts         # Arquivo de barril
├── Button.test.tsx  # Testes (opcional)
└── variants.ts      # Variantes do componente (opcional)
\`\`\`

Para componentes complexos:

\`\`\`
DataTable/
├── index.ts                 # Exporta tudo
├── DataTable.tsx            # Componente principal
├── DataTableHeader.tsx      # Sub-componente
├── DataTableRow.tsx         # Sub-componente
├── DataTableFooter.tsx      # Sub-componente
└── useDataTable.ts          # Hook específico do componente
\`\`\`

### Serviços

Os serviços devem seguir uma estrutura modular:

\`\`\`
projectService/
├── index.ts         # Arquivo de barril que exporta todas as funções públicas
├── core.ts          # Funções essenciais do serviço
├── queries.ts       # Funções de consulta (get)
├── mutations.ts     # Funções de modificação (create, update, delete)
└── helpers.ts       # Funções auxiliares internas
\`\`\`

## Boas Práticas

### Importações

- Manter importações organizadas em blocos separados por linha em branco:
  1. Importações de bibliotecas terceiras (React, Next.js)
  2. Importações de componentes internos
  3. Importações de hooks, utils, contexts
  4. Importações de tipos
  5. Importações de estilos

Exemplo:
\`\`\`tsx
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

import { useAuth } from '@/lib/hooks/useAuth'
import { formatDate } from '@/lib/utils/dateHelpers'

import { Project } from '@/types/project'
\`\`\`

### Organização de Componentes

- Declarar tipos/interfaces no início do arquivo (antes do componente)
- Usar comentários para separar seções lógicas em componentes complexos
- Extrair lógica complexa para hooks customizados
- Preferir componentes funcionais e hooks ao invés de classes

### Exportações

- Usar exportações nomeadas em vez de exportações padrão (default) para facilitar refatoração
- Centralizar exportações em arquivos `index.ts` para simplificar importações

Exemplo de arquivo `index.ts`:
\`\`\`tsx
export * from './Button'
export * from './Card'
export * from './Badge'
\`\`\`

### Funções e Hooks

- Funções puras devem ser declaradas fora do componente
- Hooks personalizados devem extrair lógica complexa ou compartilhada
- Utilize prefixos adequados para cada tipo de função:
  - `handle*` para manipuladores de eventos
  - `format*` para formatação
  - `validate*` para validação
  - `compute*` para cálculos
  - `fetch*` ou `get*` para recuperação de dados

### Código Assíncrono

- Use async/await em vez de callbacks quando possível
- Implemente tratamento de erros adequado com try/catch
- Para operações de longa duração, adicione estados de carregamento
- Use prefixos consistentes para funções assíncronas (fetch, get, update, create, delete)

## Convenções específicas para a Plataforma Colmeia

- **Internacionalização**: Todos os textos visíveis devem usar o idioma português do Brasil
- **Nomes de arquivos para páginas do Next.js**: Usar `page.tsx` conforme padrão do App Router
- **Nomes de arquivos para layouts**: Usar `layout.tsx` conforme padrão do App Router
- **Nomes de arquivos para rotas API**: Usar `route.ts` conforme padrão do App Router
- **Funções de serviço**: As funções que lidam com o Firebase devem ser padronizadas:
  - `get*` para recuperar dados
  - `create*` para criar novos registros
  - `update*` para atualizar registros existentes
  - `delete*` para remover registros
  - `*Exists` para verificar existência (retorna boolean)

## Exemplos de Boas Práticas de Código

### Componente React

\`\`\`tsx
"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { useToast } from '@/lib/hooks/useToast'

// Define tipos fora do componente
interface ProjectFormProps {
  initialData?: Project;
  onSubmit: (data: ProjectFormData) => Promise<void>;
}

// Componente com nome descritivo
export function ProjectForm({ initialData, onSubmit }: ProjectFormProps) {
  // Estado organizado no início
  const [name, setName] = useState(initialData?.name || '')
  const [loading, setLoading] = useState(false)
  
  const router = useRouter()
  const { toast } = useToast()
  
  // Funções de manipulação de eventos
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      await onSubmit({ name })
      toast({
        title: 'Sucesso!',
        description: 'Projeto criado com sucesso',
      })
      router.push('/projetos')
    } catch (error) {
      toast({
        title: 'Erro!',
        description: 'Ocorreu um erro ao criar o projeto',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }
  
  // JSX limpo e bem formatado
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium">
          Nome do Projeto
        </label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
          required
        />
      </div>
      
      <Button type="submit" disabled={loading}>
        {loading ? 'Salvando...' : 'Salvar Projeto'}
      </Button>
    </form>
  )
}
\`\`\`

### Serviço Firebase

\`\`\`tsx
// projectService/queries.ts
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Project } from '@/types/project'

/**
 * Recupera todos os projetos do usuário atual
 */
export async function getProjects(userId: string): Promise<Project[]> {
  try {
    const projectsRef = collection(db, 'projects')
    const q = query(projectsRef, where('userId', '==', userId))
    const snapshot = await getDocs(q)
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Project[]
  } catch (error) {
    console.error('Erro ao buscar projetos:', error)
    throw new Error('Falha ao buscar projetos')
  }
}

/**
 * Recupera um projeto específico pelo ID
 */
export async function getProjectById(projectId: string): Promise<Project | null> {
  try {
    const projectRef = doc(db, 'projects', projectId)
    const projectDoc = await getDoc(projectRef)
    
    if (!projectDoc.exists()) {
      return null
    }
    
    return {
      id: projectDoc.id,
      ...projectDoc.data()
    } as Project
  } catch (error) {
    console.error(`Erro ao buscar projeto ${projectId}:`, error)
    throw new Error('Falha ao buscar detalhes do projeto')
  }
}
\`\`\`

### Hook Personalizado

\`\`\`tsx
// hooks/useProjectData.ts
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { getProjects } from '@/lib/services/projectService'
import { Project } from '@/types/project'

export function useProjectData() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { user } = useAuth()
  
  useEffect(() => {
    if (!user) {
      setProjects([])
      setIsLoading(false)
      return
    }
    
    async function fetchProjects() {
      try {
        setIsLoading(true)
        const data = await getProjects(user.uid)
        setProjects(data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Erro desconhecido'))
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchProjects()
  }, [user])
  
  const refreshProjects = async () => {
    if (!user) return
    
    try {
      setIsLoading(true)
      const data = await getProjects(user.uid)
      setProjects(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Erro desconhecido'))
    } finally {
      setIsLoading(false)
    }
  }
  
  return {
    projects,
    isLoading,
    error,
    refreshProjects
  }
}
\`\`\`

Este documento será revisado e atualizado conforme o projeto evolui.

## Lista de Verificação para Revisão de Código

Antes de submeter código para revisão, verifique:

- [ ] Nomenclatura segue o padrão definido para cada tipo de elemento
- [ ] Importações estão organizadas em grupos lógicos
- [ ] Componentes têm responsabilidade única e tamanho gerenciável
- [ ] Tipos e interfaces estão claramente definidos
- [ ] Hooks React seguem as regras (não condicionais, apenas no nível superior)
- [ ] Estado é gerenciado eficientemente (evita estados derivados)
- [ ] Tratamento adequado de erros em código assíncrono
- [ ] Código está comentado onde necessário (lógica complexa)
- [ ] Não há hardcoding de valores que deveriam ser constantes
