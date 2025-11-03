import { Button } from '@/components/ui';
import { useAuth } from '../hooks/useAuth'
import { useState } from 'react'
import { FiRefreshCw } from 'react-icons/fi'
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
    <nav className="bg-palette-light-cream py-6 px-8 mx-4 mt-4 rounded-xl shadow-lg border border-palette-golden/20 backdrop-blur-sm">
      <div className="flex items-center justify-between w-full">
        {/* Logo on the far left */}
        <div className="flex-shrink-0">
          <span 
            className="font-bold text-lg sm:text-xl md:text-2xl tracking-widest text-palette-dark-red cursor-pointer" 
            style={{ fontFamily: "'Blackflag', sans-serif" }}
            onClick={() => window.location.href = `/${user.role}`}
          >
            Ledger
          </span>
        </div>

          <div className="flex items-center gap-8">
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
                      <FiRefreshCw className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                      Recalculating...
                    </>
                  ) : (
                    <FiRefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
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
                      <FiRefreshCw className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                      Refreshing...
                    </>
                  ) : (
                    <FiRefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
                  )}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
    </nav>
  )
}
