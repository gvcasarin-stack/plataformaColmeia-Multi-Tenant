import { Badge } from "@/components/ui/badge";
import { Shield, X, Check, AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface BlockStatusBadgeProps {
  isBlocked: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'subtle';
}

export function BlockStatusBadge({ 
  isBlocked, 
  className, 
  size = 'md',
  variant = 'default'
}: BlockStatusBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2'
  };

  if (isBlocked) {
    return (
      <Badge 
        variant={variant === 'subtle' ? 'secondary' : 'destructive'}
        className={cn(
          "flex items-center gap-1 font-medium",
          sizeClasses[size],
          variant === 'subtle' && "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
          className
        )}
      >
        <AlertCircle className="w-3 h-3" />
        Bloqueado
      </Badge>
    );
  }

  return (
    <Badge 
      variant={variant === 'subtle' ? 'secondary' : 'default'}
      className={cn(
        "flex items-center gap-1 font-medium",
        sizeClasses[size],
        variant === 'subtle' ? 
          "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800" :
          "bg-green-500 text-white border-green-500 hover:bg-green-600",
        className
      )}
    >
      <CheckCircle className="w-3 h-3" />
      Ativo
    </Badge>
  );
}

interface BlockStatusIndicatorProps {
  isBlocked: boolean;
  className?: string;
  showText?: boolean;
}

export function BlockStatusIndicator({ 
  isBlocked, 
  className, 
  showText = true 
}: BlockStatusIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn(
        "w-2 h-2 rounded-full",
        isBlocked ? "bg-red-500" : "bg-green-500"
      )} />
      {showText && (
        <span className={cn(
          "text-sm font-medium",
          isBlocked ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
        )}>
          {isBlocked ? 'Bloqueado' : 'Ativo'}
        </span>
      )}
    </div>
  );
}

interface BlockStatusIconProps {
  isBlocked: boolean;
  className?: string;
}

export function BlockStatusIcon({ isBlocked, className }: BlockStatusIconProps) {
  if (isBlocked) {
    return (
      <AlertCircle className={cn(
        "w-4 h-4 text-red-500 dark:text-red-400",
        className
      )} />
    );
  }

  return (
    <CheckCircle className={cn(
      "w-4 h-4 text-green-500 dark:text-green-400",
      className
    )} />
  );
} 