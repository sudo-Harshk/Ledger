
import { Button } from './ui/button'
import { useAuth } from '../hooks/useAuth'
import { useState } from 'react'
import toast from 'react-hot-toast'

interface NavigationProps {
  title: string
}

export default function Navigation({ title }: NavigationProps) {
  const { user, logout } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await logout()
      toast.success('Logged out successfully')
    } catch (error) {
      console.error('Logout failed:', error)
      toast.error('Logout failed. Please try again.')
    }
  }

  // Don't render if user is not available
  if (!user) {
    return null
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            <p className="text-sm text-gray-600 hidden sm:block">
              Welcome back, {user.displayName || 'User'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              aria-label="Toggle menu"
              className="md:hidden p-2 rounded border border-gray-200 text-gray-700"
              onClick={() => setIsMenuOpen((v) => !v)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 5h14a1 1 0 100-2H3a1 1 0 000 2zm14 4H3a1 1 0 000 2h14a1 1 0 100-2zm0 6H3a1 1 0 000 2h14a1 1 0 100-2z" clipRule="evenodd" />
              </svg>
            </button>
            <div className="hidden md:flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Role: <span className="font-medium capitalize">{user.role}</span>
              </span>
              <Button 
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="transition-all duration-200 hover:scale-105"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
        {isMenuOpen && (
          <div className="md:hidden mt-3 border-t border-gray-200 pt-3">
            <p className="text-sm text-gray-600 mb-2">
              Welcome back, {user.displayName || 'User'}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                Role: <span className="font-medium capitalize">{user.role}</span>
              </span>
              <Button 
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="w-auto"
              >
                Logout
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
