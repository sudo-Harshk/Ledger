import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged
} from 'firebase/auth'
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { auth, db } from '../firebase'
import logger from '../lib/logger'

interface User {
  uid: string
  username: string | null
  role: 'student' | 'teacher'
  displayName?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          logger.info('Auth state changed - User authenticated')
          
          // Get user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
          logger.debug('Firestore user document exists:', userDoc.exists())
          
          if (userDoc.exists()) {
            const userData = userDoc.data()
            
            const userInfo = {
              uid: firebaseUser.uid,
              username: userData.username || firebaseUser.email,
              role: userData.role,
              displayName: userData.displayName
            }
            logger.debug('Setting user state')
            setUser(userInfo)
          } else {
            // User exists in Auth but not in Firestore - wait a bit for sync
            logger.warn('User authenticated but no Firestore document found - waiting for sync...')
            
            // Clear any existing timeout
            if (timeoutId) {
              clearTimeout(timeoutId)
            }
            
            // Wait for Firestore to sync, then check again
            timeoutId = setTimeout(async () => {
              try {
                const retryDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
                if (retryDoc.exists()) {
                  const userData = retryDoc.data()
                  const userInfo = {
                    uid: firebaseUser.uid,
                    username: userData.username || firebaseUser.email,
                    role: userData.role,
                    displayName: userData.displayName
                  }
                  setUser(userInfo)
                } else {
                  // Still no document after retry - this is an incomplete account
                  logger.error('User document still not found after retry - incomplete account')
                  await signOut(auth)
                  setUser(null)
                }
              } catch (error) {
                logger.error('Error during retry:', error)
                await signOut(auth)
                setUser(null)
              }
            }, 3000) // Increased delay to 3 seconds
          }
        } catch (error: unknown) {
          logger.error('Error fetching user data:', error)
          setUser(null)
        }
      } else {
        logger.info('Auth state changed - User signed out')
        setUser(null)
      }
      setLoading(false)
    })

    // Cleanup function
    return () => {
      unsubscribe()
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [])

  const login = async (username: string, password: string) => {
    try {
      logger.info('Attempting login')
      
      let loginEmail = username
      
      // If it doesn't contain @, treat it as a username and look up the email
      if (!username.includes('@')) {
        // This is a username login (student)
        const usersQuery = query(
          collection(db, 'users'), 
          where('username', '==', username)
        )
        const userDocs = await getDocs(usersQuery)
        
        if (userDocs.empty) {
          throw new Error('Username not found. Please check your username and try again.')
        }
        
        const userData = userDocs.docs[0].data()
        loginEmail = userData.email
        
        if (!loginEmail) {
          throw new Error('Invalid account configuration. Please contact your teacher.')
        }
        
        logger.debug('Username login detected; resolving email')
      } else {
        // This is an email login (teacher)
        logger.debug('Email login detected for teacher')
      }
      
      const result = await signInWithEmailAndPassword(auth, loginEmail, password)
      logger.info('Login successful')
      
      // Check if user document exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', result.user.uid))
      if (!userDoc.exists()) {
        // User exists in Auth but not in Firestore - this is an incomplete account
        logger.warn('User authenticated but no Firestore document found - incomplete account')
        // Sign out the user since they don't have a complete account
        await signOut(auth)
        throw new Error('Your account is incomplete. Please contact your administrator.')
      }
    } catch (error: unknown) {
      logger.error('Login error')
      if (error instanceof Error) {
        throw error
      } else {
        throw new Error('An unexpected error occurred during login')
      }
    }
  }

  const logout = async () => {
    try {
      await signOut(auth)
      setUser(null)
    } catch (error: unknown) {
      logger.error('Logout error')
      if (error instanceof Error) {
        throw error
      } else {
        throw new Error('An unexpected error occurred during logout')
      }
    }
  }

  const value = {
    user,
    loading,
    login,
    logout
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
