import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from '@/components/ui';
import { useAuth } from '../hooks/useAuth'
import { debouncedToast } from '../lib/debouncedToast';
import { FiEye, FiEyeOff } from 'react-icons/fi'
import Footer from '../components/Footer'

// Removed ScrambleText component

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  
  const { login, user, loginWithGoogle } = useAuth();

  const navigate = useNavigate()
  const location = useLocation()
  const justLoggedIn = useRef(false)
  const isMounted = useRef(true)

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

  // Cleanup effect
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      justLoggedIn.current = true
      // Navigation and toast will be handled in useEffect
    } catch (error: unknown) {
      // Only update state if component is still mounted
      if (isMounted.current) {
        if (error instanceof Error) {
          setError(error.message);
          debouncedToast(error.message, 'error');
        } else {
          setError('Failed to login. Please try again.');
          debouncedToast('Failed to login. Please try again.', 'error');
        }
      }
    } finally {
      if (isMounted.current) {
        setLoading(false)
      }
    }
  }

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      await loginWithGoogle();
      justLoggedIn.current = true;
      // Navigation and toast will be handled in useEffect
    } catch (error: unknown) {
      if (isMounted.current) {
        if (error instanceof Error) {
          setError(error.message);
          debouncedToast(error.message, 'error');
        } else {
          setError('Failed to login with Google. Please try again.');
          debouncedToast('Failed to login with Google. Please try again.', 'error');
        }
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-palette-light-cream">
      {/* Redesigned Header to match landing page */}
      <header className="flex items-center justify-between px-8 py-6 bg-palette-light-cream">
        <div className="flex items-center gap-2">
          <div className="font-bold text-2xl tracking-widest cursor-pointer" style={{ fontFamily: "'Blackflag', sans-serif", color: "#540b0e" }} onClick={() => navigate('/')}>Ledger</div>
        </div>
        <nav className="flex gap-8 text-palette-dark-red font-medium text-lg">
          {/* Removed Home button */}
        </nav>
      </header>
      <main className="flex-1 flex items-center justify-center p-4 relative">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          <div className="w-96 h-96 rounded-full bg-gradient-to-br from-palette-golden/30 via-palette-deep-red/20 to-palette-light-cream/0 blur-3xl opacity-60"></div>
        </div>
        <Card className="w-full max-w-md bg-card-elevated shadow-xl relative z-10 border-0">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold tracking-widest" style={{ fontFamily: "'Blackflag', sans-serif", color: "#540b0e", textShadow: '0 1px 4px rgba(84,11,14,0.1)' }}>Ledger</CardTitle>
            <CardDescription>
              Sign in to your account
            </CardDescription>
          </CardHeader>
          <CardContent>
             {/* Info Banner: Only teacher-created users can access */}
             <div className="mb-4">
               <div className="rounded-xl border border-palette-golden bg-card-base text-palette-deep-red flex items-center gap-3 px-5 py-4 shadow-sm">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-palette-deep-red flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" /></svg>
                 <div className="flex flex-col">
                   <span className="font-semibold text-base">In-house Platform</span>
                   <span className="text-sm mt-0.5 text-palette-dark-red">Only users created by teachers can access Ledger. New users cannot self-register.</span>
                 </div>
               </div>
             </div>
            <form onSubmit={handleSubmit} className="space-y-4">
               {error && (
                 <div className="p-3 text-sm text-palette-dark-red bg-card-deep border border-palette-golden rounded-md flex items-center gap-2 animate-fade-in">
                   <svg className="h-5 w-5 text-palette-deep-red flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                     <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01" />
                   </svg>
                   <span>{error}</span>
                 </div>
               )}
              <div className="space-y-2">
                <Label htmlFor="username">Username or Email</Label>
                 <Input
                   id="username"
                   type="text"
                   placeholder="Enter your username or email"
                   value={username}
                   onChange={(e) => setUsername(e.target.value)}
                   required
                   className="transition-all duration-200 focus:scale-105 bg-input-base focus:bg-input-elevated border border-palette-golden/30 focus:border-palette-golden"
                 />
                <p className="text-xs text-gray-400 mt-1">
                  Students: Use your username &bull; Teachers: Use your email
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
                     className="transition-all duration-200 focus:scale-105 pr-12 bg-input-base focus:bg-input-elevated border border-palette-golden/30 focus:border-palette-golden"
                   />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <button
                      type="button"
                      tabIndex={0}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword((v) => !v)}
                       className="p-1 rounded-full bg-input-elevated hover:bg-input-elevated shadow focus:outline-none border border-palette-golden/30 transition-colors focus:ring-2 focus:ring-palette-golden relative group"
                    >
                      {showPassword ? (
                         <FiEyeOff className="h-5 w-5 text-palette-dark-teal hover:text-palette-dark-red transition-all duration-200" />
                      ) : (
                         <FiEye className="h-5 w-5 text-palette-dark-teal hover:text-palette-dark-red transition-all duration-200" />
                      )}
                      <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-2 py-1 rounded bg-[#222] text-white text-xs shadow-lg z-50 whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus:opacity-100 pointer-events-none transition-opacity duration-150">
                        {showPassword ? 'Hide' : 'Show'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
              <Button 
                type="submit"
                className="w-full flex items-center justify-center gap-2"
                disabled={loading}
              >
                {loading && (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                  </svg>
                )}
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
               {/* Divider */}
                 <div className="flex items-center my-4">
                 <div className="flex-grow border-t border-palette-golden/30" />
                 <span className="mx-4 text-xs text-palette-dark-teal">Or sign in with</span>
                 <div className="flex-grow border-t border-palette-golden/30" />
               </div>
              {/* Google Sign-In Button */}
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGoogleSignIn}
              >
                <img
                  src="https://img.icons8.com/color/48/google-logo.png"
                  alt="google-logo"
                  width={20}
                  height={20}
                  className="mr-2 inline-block align-middle"
                  style={{ display: 'inline-block', verticalAlign: 'middle' }}
                />
                Sign in with Google
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
      {/* reCAPTCHA container for phone auth (invisible, required for Firebase) */}
      <div id="recaptcha-container" style={{ display: 'none' }} />
      <Footer />
    </div>
  )
}
