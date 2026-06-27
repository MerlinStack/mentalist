import { useNavigate } from '@tanstack/react-router'
import Button from '../components/shared/Button'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-20 bg-[#0F0F0F]">
      <div className="text-center max-w-md">
        <h1 className="text-8xl font-display font-bold text-[#8B5CF6]/30 mb-4">404</h1>
        <h2 className="text-2xl font-display font-bold text-white mb-2">Page Not Found</h2>
        <p className="text-text-muted mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Button onClick={() => navigate({ to: '/' })}>
          Return Home
        </Button>
      </div>
    </div>
  )
}
