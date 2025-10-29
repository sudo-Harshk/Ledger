import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './hooks/useAuth'
import { lazy, Suspense, useEffect } from 'react'
import './App.css'
import ToastProvider from './components/ToastProvider';
import LoadingSpinner from './components/LoadingSpinner';

// Lazy load large dashboard components
const LoginPage = lazy(() => import('./pages/LoginPage'))
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'))
const TeacherDashboard = lazy(() => import('./pages/TeacherDashboard'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const LandingPage = lazy(() => import('./pages/LandingPage'))

function App() {
  // Global error handler for unhandled promise rejections
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      console.error('Promise rejection details:', {
        reason: event.reason,
        type: typeof event.reason,
        stack: event.reason?.stack
      });
      
      // Prevent the default behavior (which would log to console)
      event.preventDefault();
    };

    const handleError = (event: ErrorEvent) => {
      console.error('Global error:', event.error);
      console.error('Error details:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      });
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

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
  )
}

export default App
