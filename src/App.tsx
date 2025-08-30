import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LoginPage from './pages/LoginPage'
import StudentDashboard from './pages/StudentDashboard'
import TeacherDashboard from './pages/TeacherDashboard'
import './App.css'

function App() {
  // Protected Route Component - moved inside App function to be within AuthProvider
  function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) {
    const { user, loading } = useAuth()
    
    if (loading) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      )
    }
    
    if (!user) {
      return <Navigate to="/login" replace />
    }
    
    if (!allowedRoles.includes(user.role)) {
      return <Navigate to="/" replace />
    }
    
    return <>{children}</>
  }

  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-background relative">
          <div className="relative z-20">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route 
              path="/student" 
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/teacher" 
              element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <TeacherDashboard />
                </ProtectedRoute>
              } 
            />
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
          </div>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
