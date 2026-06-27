import type { ReactNode } from 'react'

type Variant = 'default' | 'primary' | 'accent' | 'success' | 'warning' | 'error';

interface BadgeProps {
  children: ReactNode;
  variant?: Variant;
  className?: string;
}

export default function Badge({ children, variant = 'default' as Variant, className = '' }: BadgeProps) {
  const variants: Record<Variant, string> = {
    default: 'bg-surface-lighter text-text-secondary border border-white/10',
    primary: 'bg-primary/20 text-primary-light border border-primary/30',
    accent: 'bg-accent/20 text-accent border border-accent/30',
    success: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    warning: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    error: 'bg-red-500/20 text-red-400 border border-red-500/30',
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}
