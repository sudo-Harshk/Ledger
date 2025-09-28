import { Button } from './ui/button'
import { useAuth } from '../hooks/useAuth'
import { useEffect } from 'react'
import toast from 'react-hot-toast'

interface NavigationProps {
  onRefresh?: () => void
  refreshing?: boolean
}

export default function Navigation({ onRefresh, refreshing }: NavigationProps) {
  const { user, logout } = useAuth()
  useEffect(() => {
    // Hide cursor after animation (words array has only one word, so after typing is done)
    const timeout = setTimeout(() => {}, ((user?.displayName?.length || 4) * 80) + 1000);
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
    <nav className="bg-white border-b border-gray-200 py-4 pl-4 pr-6 w-full">
      <div className="flex items-center justify-between w-full">
        {/* Logo on the far left */}
        <div className="flex-shrink-0">
          <span className="font-bold text-lg sm:text-xl md:text-2xl tracking-widest" style={{ fontFamily: "'Blackflag', sans-serif", color: "#28282B" }}>Ledger</span>
        </div>
          {/* Main navbar content: welcome, role, actions */}
          <div className="flex items-center gap-8">
            {/* Removed welcome message for cleaner navbar */}
            <div className="flex items-center gap-4">
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
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75 2.28 0 4.374-.784 6.042 2.086M21.75 12c0 5.385-4.365 9.75-9.75 9.75-2.28 0-4.374-.784-6.042-2.086m0 0V19.5m0-2.836v2.836h2.836" />
                    </svg>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
        {/* Removed: isMenuOpen && ( */}
          {/* <div className="md:hidden mt-3 border-t border-gray-200 pt-3"> */}
            {/* <div className="flex items-center justify-between"> */}
              {/* <span className="text-sm text-gray-600"> */}
                {/* Role: <span className="font-medium capitalize">{user.role}</span> */}
              {/* </span> */}
              {/* <Button  */}
                {/* onClick={handleLogout} */}
                {/* variant="outline" */}
                {/* size="sm" */}
                {/* className="w-auto" */}
              {/* > */}
                {/* Logout */}
              {/* </Button> */}
            {/* </div> */}
          {/* </div> */}
        {/* ) */}
    </nav>
  )
}
