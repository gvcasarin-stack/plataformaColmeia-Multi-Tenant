"use client"

import { useEffect, useState } from 'react'
import { extractHeadings } from '@/lib/blog/utils'

interface TableOfContentsProps {
  content: string
}

export default function TableOfContents({ content }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('')
  const headings = extractHeadings(content)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      },
      { rootMargin: '-100px 0px -66%' }
    )

    // Observar todos os headings
    const elements = headings.map(h => document.getElementById(h.id)).filter(Boolean)
    elements.forEach((el) => {
      if (el) observer.observe(el)
    })

    return () => {
      elements.forEach((el) => {
        if (el) observer.unobserve(el)
      })
    }
  }, [headings])

  if (headings.length === 0) return null

  return (
    <nav className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">Neste artigo</h3>

      <ul className="space-y-2 border-l-2 border-slate-200">
        {headings.map((heading) => (
          <li key={heading.id}>
            <a
              href={`#${heading.id}`}
              className={`block py-1.5 text-sm transition-all duration-300 ${
                heading.level === 3 ? 'pl-6' : 'pl-4'
              } ${
                activeId === heading.id
                  ? 'text-blue-600 font-semibold border-l-2 border-blue-600 -ml-[2px]'
                  : 'text-slate-600 hover:text-blue-600 hover:border-l-2 hover:border-blue-300 hover:-ml-[2px]'
              }`}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
