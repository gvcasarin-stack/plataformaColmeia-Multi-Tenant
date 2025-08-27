export function CircuitPattern({ className, color = "text-blue-200" }: { className?: string; color?: string }) {
  return (
    <div className={`absolute pointer-events-none ${className}`} aria-hidden="true">
      <svg width="404" height="404" fill="none" viewBox="0 0 404 404">
        <path
          d="M10,10 L50,10 L50,50 L90,50 L90,90 L130,90 L130,130 L170,130 L170,170 L210,170 L210,210 L250,210 L250,250 L290,250 L290,290 L330,290 L330,330 L370,330 L370,370"
          stroke="currentColor"
          strokeWidth="2"
          className={color}
          fill="none"
        />
        <path
          d="M370,10 L330,10 L330,50 L290,50 L290,90 L250,90 L250,130 L210,130 L210,170 L170,170 L170,210 L130,210 L130,250 L90,250 L90,290 L50,290 L50,330 L10,330 L10,370"
          stroke="currentColor"
          strokeWidth="2"
          className={color}
          fill="none"
        />
        <circle cx="10" cy="10" r="5" className={color} fill="currentColor" opacity="0.5" />
        <circle cx="90" cy="90" r="5" className={color} fill="currentColor" opacity="0.5" />
        <circle cx="170" cy="170" r="5" className={color} fill="currentColor" opacity="0.5" />
        <circle cx="250" cy="250" r="5" className={color} fill="currentColor" opacity="0.5" />
        <circle cx="330" cy="330" r="5" className={color} fill="currentColor" opacity="0.5" />
      </svg>
    </div>
  )
}
