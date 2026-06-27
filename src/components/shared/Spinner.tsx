type Size = 'sm' | 'md' | 'lg';

interface SpinnerProps {
  size?: Size;
  className?: string;
}

export default function Spinner({ size = 'md' as Size, className = '' }: SpinnerProps) {
  const sizes: Record<Size, string> = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-10 h-10',
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={`${sizes[size]} border-2 border-surface-lighter border-t-primary-light rounded-full animate-spin`} />
    </div>
  )
}
