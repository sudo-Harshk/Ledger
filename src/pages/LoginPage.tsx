import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { useAuth } from '../hooks/useAuth'
import { debouncedToast } from '../lib/debouncedToast';
import { FiEye, FiEyeOff } from 'react-icons/fi'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const justLoggedIn = useRef(false)

  useEffect(() => {
    if (user) {
      // Only show toast if just logged in
      if (justLoggedIn.current) {
        if (user.displayName) {
          debouncedToast(`Welcome back, ${user.displayName}!`, 'success');
        } else {
          debouncedToast('Login successful!', 'success');
        }
        justLoggedIn.current = false;
      }
      // Always redirect if user is present and on login page
      if (location.pathname === '/login') {
        navigate(`/${user.role}`);
      }
    }
  }, [user, navigate, location.pathname])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      justLoggedIn.current = true
      // Navigation and toast will be handled in useEffect
    } catch (error: unknown) {
      if (error instanceof Error) {
        setError(error.message);
        debouncedToast(error.message, 'error');
      } else {
        setError('Failed to login. Please try again.');
        debouncedToast('Failed to login. Please try again.', 'error');
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Ledger</CardTitle>
          <CardDescription>
            Sign in to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="username">Username or Email</Label>
              <Input
                id="username"
                type="text"
                placeholder="Students: Enter username • Teachers: Enter email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="transition-all duration-200 focus:scale-105"
              />
              <p className="text-xs text-muted-foreground">
                Students: Use your username • Teachers: Use your email
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="transition-all duration-200 focus:scale-105 pr-10"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-white/80 hover:bg-white shadow focus:outline-none border border-gray-200 transition-colors"
                >
                  {showPassword ? (
                    <FiEyeOff className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                  ) : (
                    <FiEye className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                  )}
                </button>
              </div>
            </div>
            <Button 
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
