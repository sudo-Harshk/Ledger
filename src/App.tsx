import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './hooks/useAuth'
import { lazy, Suspense } from 'react'
import './App.css'
import ToastProvider from './components/ToastProvider';
import LoadingSpinner from './components/LoadingSpinner';

// Lazy load large dashboard components
const LoginPage = lazy(() => import('./pages/LoginPage'))
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'))
const TeacherDashboard = lazy(() => import('./pages/TeacherDashboard'))
const LandingPage = lazy(() => import('./pages/LandingPage'))

function App() {
  // Protected Route Component - moved inside App function to be within AuthProvider
  function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) {
    const { user, loading } = useAuth()
    
    if (loading) {
      return <LoadingSpinner />
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
            <Route path="/login" element={
              <Suspense fallback={<LoadingSpinner message="Loading Login..." />}>
                <LoginPage />
              </Suspense>
            } />
            <Route 
              path="/student" 
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <Suspense fallback={<LoadingSpinner message="Loading Student Dashboard..." />}>
                    <StudentDashboard />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/teacher" 
              element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <Suspense fallback={<LoadingSpinner message="Loading Teacher Dashboard..." />}>
                    <TeacherDashboard />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            <Route path="/" element={
              <Suspense fallback={<LoadingSpinner />}>
                <LandingPage />
              </Suspense>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </div>
          <ToastProvider />
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
