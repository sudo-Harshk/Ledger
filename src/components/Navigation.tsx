import { Button } from '@/components/ui';
import { useAuth } from '../hooks/useAuth'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useStudentFeeRecalculation } from '../hooks/useStudentFeeRecalculation'

interface NavigationProps {
  onRefresh?: () => void
  refreshing?: boolean
  showRecalculate?: boolean
}

export default function Navigation({ onRefresh, refreshing, showRecalculate = false }: NavigationProps) {
  const { user, logout } = useAuth()
  const [selectedMonth] = useState(new Date())
  const { isRecalculating, recalculateAllStudents } = useStudentFeeRecalculation()
  
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

  const handleRecalculate = async () => {
    await recalculateAllStudents(selectedMonth, false) // Disable toast notifications
    // Refresh all dashboard cards after recalculating
    if (onRefresh) {
      onRefresh()
    }
  }

  // Don't render if user is not available
  if (!user) {
    return null
  }

  return (
    <nav className="bg-palette-light-cream border-b border-palette-dark-teal py-4 pl-4 pr-6 w-full shadow-sm">
      <div className="flex items-center justify-between w-full">
        {/* Logo on the far left */}
        <div className="flex-shrink-0">
          <span className="font-bold text-lg sm:text-xl md:text-2xl tracking-widest" style={{ fontFamily: "'Blackflag', sans-serif", color: "#540b0e" }}>Ledger</span>
        </div>
          {/* Main navbar content: welcome, role, actions */}
          <div className="flex items-center gap-8">
            {/* Removed welcome message for cleaner navbar */}
            <div className="flex items-center gap-4">
              <Button 
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="transition-all duration-200"
              >
                Logout
              </Button>
              {showRecalculate ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRecalculate}
                  disabled={isRecalculating}
                  className="transition-all duration-200"
                  title="Recalculate all student fees"
                >
                  {isRecalculating ? (
                    <>
                      <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true" focusable="false">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                      </svg>
                      Recalculating...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4 mr-2" aria-hidden="true" focusable="false">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                      </svg>
                    </>
                  )}
                </Button>
              ) : onRefresh ? (
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Refresh all dashboard data"
                  onClick={onRefresh}
                  disabled={refreshing}
                  className="transition-all duration-200 hover:bg-palette-golden/10 focus:bg-palette-golden/10 hover:text-palette-deep-red focus:text-palette-deep-red border-palette-golden/30"
                  title="Refresh all dashboard data from database"
                >
                  {refreshing ? (
                    <>
                      <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true" focusable="false">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                      </svg>
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4 mr-2" aria-hidden="true" focusable="false">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                      </svg>
                      Refresh Data
                    </>
                  )}
                </Button>
              ) : null}
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
