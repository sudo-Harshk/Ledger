import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './hooks/useAuth'
import { lazy, Suspense } from 'react'
import './App.css'
import { ToastProvider, LoadingSpinner, ErrorBoundary } from './components';

const LoginPage = lazy(() => import('./pages/LoginPage'))
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'))
const TeacherDashboard = lazy(() => import('./pages/TeacherDashboard'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const LandingPage = lazy(() => import('./pages/LandingPage'))
const StudentSettings = lazy(() => import('./pages/StudentSettings'))

function App() {

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
    <ErrorBoundary>
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
              path="/student/settings" 
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <Suspense fallback={<LoadingSpinner message="Loading Settings..." />}> 
                    <StudentSettings />
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
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Suspense fallback={<LoadingSpinner message="Loading Admin Dashboard..." />}>
                    <AdminDashboard />
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
    </ErrorBoundary>
  )
}

export default App
