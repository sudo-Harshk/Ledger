import { Button } from './ui/button'
import { useAuth } from '../hooks/useAuth'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Typewriter } from 'react-simple-typewriter'

interface NavigationProps {
  onRefresh?: () => void
  refreshing?: boolean
}

export default function Navigation({ onRefresh, refreshing }: NavigationProps) {
  const { user, logout } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  // Add state to control cursor visibility
  const [showCursor, setShowCursor] = useState(true);
  useEffect(() => {
    // Hide cursor after animation (words array has only one word, so after typing is done)
    const timeout = setTimeout(() => setShowCursor(false), ((user?.displayName?.length || 4) * 80) + 1000);
    return () => clearTimeout(timeout);
  }, [user?.displayName]);

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
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back,{' '}
              {/* Desktop only: typewriter effect */}
              <span className="hidden sm:inline text-[#F87171]">
                <Typewriter
                  words={[user?.displayName || 'User']}
                  loop={1}
                  cursor={showCursor}
                  cursorStyle="|"
                  typeSpeed={160} // slower typing
                  deleteSpeed={80}
                  delaySpeed={2000} // longer pause after typing
                />
              </span>
              {/* Mobile only: plain text */}
              <span className="inline sm:hidden text-gray-900">{user?.displayName || 'User'}</span>
            </h1>
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
                className="transition-all duration-200"
              >
                Logout
              </Button>
              {onRefresh && (
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Refresh dashboard"
                  onClick={onRefresh}
                  disabled={refreshing}
                  className="transition-all duration-200 hover:bg-transparent focus:bg-transparent hover:text-gray-700 focus:text-gray-700"
                >
                  {refreshing ? (
                    <svg className="animate-spin h-6 w-6 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true" focusable="false">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75 2.28 0 4.374.784 6.042 2.086M21.75 12c0 5.385-4.365 9.75-9.75 9.75-2.28 0-4.374-.784-6.042-2.086m0 0V19.5m0-2.836v2.836h2.836" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-6 w-6 text-gray-700" aria-hidden="true" focusable="false">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75 2.28 0 4.374.784 6.042 2.086M21.75 12c0 5.385-4.365 9.75-9.75 9.75-2.28 0-4.374-.784-6.042-2.086m0 0V19.5m0-2.836v2.836h2.836" />
                    </svg>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
        {isMenuOpen && (
          <div className="md:hidden mt-3 border-t border-gray-200 pt-3">
            <p className="text-sm text-gray-600 mb-2">
              Welcome back,{' '}
              <span className="text-gray-900">{user?.displayName || 'User'}</span>
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
