import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'accent' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
}

export default function Button({
  children, variant = 'primary' as Variant, size = 'md' as Size, icon, className = '', ...props
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-light/50 disabled:opacity-50 disabled:cursor-not-allowed'

  const variants: Record<Variant, string> = {
    primary: 'bg-primary hover:bg-primary-light text-white shadow-lg shadow-primary/25 hover:shadow-primary/40',
    secondary: 'bg-surface-lighter hover:bg-surface-light text-text-primary border border-white/10 hover:border-white/20',
    ghost: 'bg-transparent hover:bg-surface-lighter text-text-secondary hover:text-text-primary',
    accent: 'bg-accent hover:bg-amber-400 text-black font-semibold shadow-lg shadow-accent/25',
    danger: 'bg-red-600 hover:bg-red-500 text-white',
  }

  const sizes: Record<Size, string> = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }

  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {icon && <span className="w-4 h-4">{icon}</span>}
      {children}
    </button>
  )
}
