import { PostMetadata } from '@/lib/blog/mdx'
import { getCategoryColor } from '@/lib/blog/utils'

interface CategoryBadgeProps {
  category: PostMetadata['category']
  size?: 'sm' | 'md' | 'lg'
}

export default function CategoryBadge({ category, size = 'md' }: CategoryBadgeProps) {
  const colors = getCategoryColor(category)

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  }

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border ${colors.badge} ${sizeClasses[size]} transition-all duration-300`}
    >
      {category}
    </span>
  )
}
