import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  getAdditionalUserInfo,
  deleteUser,
  linkWithPopup,
} from 'firebase/auth'

import { doc, getDoc, setDoc } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { auth, db, functions } from '../firebase'
import logger from '../lib/logger'
import { AuthContext, type User } from './AuthContextTypes'
import { debouncedToast } from '../lib/debouncedToast'


interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    let timeoutId: NodeJS.Timeout | null = null
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Prevent state updates on unmounted component
      if (!isMounted) return
      
      if (firebaseUser) {
        try {
          
          // Get user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
          logger.debug('Firestore user document exists:', userDoc.exists())
          
          if (userDoc.exists()) {
            const userData = userDoc.data()
            
            const userInfo = {
              uid: firebaseUser.uid,
              username: userData.username || firebaseUser.email,
              role: userData.role,
              displayName: userData.displayName,
              providerData: firebaseUser.providerData,
              isActive: userData.isActive !== false, // Default to true if undefined, only false if explicitly false
            }
            logger.debug('Setting user state')
            if (isMounted) {
              setUser(userInfo);
            }
          } else {
            // User exists in Auth but not in Firestore - wait a bit for sync
            logger.warn('User authenticated but no Firestore document found - waiting for sync...')
            
            // Clear any existing timeout
            if (timeoutId) {
              clearTimeout(timeoutId)
            }
            
            // Wait for Firestore to sync, then check again (reduced delay)
            timeoutId = setTimeout(async () => {
              // Check if component is still mounted before proceeding
              if (!isMounted) return
              
              try {
                const retryDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
                if (!isMounted) return // Double-check after async operation
                
                if (retryDoc.exists()) {
                  const userData = retryDoc.data()
                  const userInfo = {
                    uid: firebaseUser.uid,
                    username: userData.username || firebaseUser.email,
                    role: userData.role,
                    displayName: userData.displayName,
                    providerData: firebaseUser.providerData,
                    isActive: userData.isActive !== false, // Default to true if undefined, only false if explicitly false
                  }
                  setUser(userInfo);
                } else {
                  // Still no document after retry - this is an incomplete account
                  logger.error('User document still not found after retry - incomplete account')
                  await signOut(auth)
                  if (isMounted) {
                    setUser(null)
                  }
                }
              } catch (error) {
                logger.error('Error during retry:', error)
                await signOut(auth)
                if (isMounted) {
                  setUser(null)
                }
              }
            }, 1000) // Reduced delay to 1 second
          }
        } catch (error: unknown) {
          logger.error('Error fetching user data:', error)
          console.error('AuthContext error details:', error)
          if (isMounted) {
            setUser(null)
          }
        }
      } else {
        if (isMounted) {
          setUser(null)
        }
      }
      if (isMounted) {
        setLoading(false)
      }
    })

    // Cleanup function
    return () => {
      isMounted = false
      unsubscribe()
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [])

  const login = async (username: string, password: string) => {
    try {
      
      let loginEmail = username
      
      if (!username.includes('@')) {
        logger.debug('Username login detected; looking up email for username:', username)
        try {
          const lookupUsername = httpsCallable<{ username: string }, { email: string }>(
            functions,
            'lookupUsername'
          )
          const result = await lookupUsername({ username })
          loginEmail = result.data.email
          logger.debug('Username login detected; resolved email:', loginEmail)
        } catch (functionError: unknown) {
          logger.error('Error calling username lookup function:', functionError)
          if (functionError && typeof functionError === 'object' && 'code' in functionError) {
            const firebaseError = functionError as { code: string; message?: string }
            const errorCode = firebaseError.code
            
            if (errorCode === 'functions/not-found' || errorCode === 'not-found') {
              throw new Error('Username not found. Please check your username and try again.')
            } else if (errorCode === 'functions/failed-precondition' || errorCode === 'failed-precondition') {
              throw new Error('Invalid account configuration. Please contact your teacher.')
            } else if (errorCode === 'functions/invalid-argument' || errorCode === 'invalid-argument') {
              throw new Error('Invalid username format. Please check your username and try again.')
            } else if (errorCode === 'functions/internal' || errorCode === 'internal') {
              throw new Error('An error occurred while looking up username. Please try again.')
            } else if (errorCode === 'functions/unavailable' || errorCode === 'unavailable') {
              throw new Error('Service temporarily unavailable. Please try again later.')
            }
          }
          throw new Error('Unable to verify username. Please try again or contact your teacher.')
        }
      } else {
        logger.debug('Email login detected for teacher')
      }
      
      const result = await signInWithEmailAndPassword(auth, loginEmail, password)
      
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
      logger.error('Login error:', error)
      if (error instanceof Error) {
        throw error
      } else {
        throw new Error('An unexpected error occurred during login')
      }
    }
  }

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      const additionalInfo = getAdditionalUserInfo(result)
      if (additionalInfo?.isNewUser) {
        // Unauthorized: delete user and show error
        if (auth.currentUser) {
          try {
            await deleteUser(auth.currentUser)
          } catch (deleteError) {
            logger.error('Error deleting unauthorized user:', deleteError)
          }
        }
        debouncedToast('Account not registered. Please contact your teacher.', 'error')
        throw new Error('Account not registered. Please contact your teacher.')
      }
      // Check if user document exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', result.user.uid))
      if (!userDoc.exists()) {
        // Create user document if it doesn't exist (should not happen for existing users)
        try {
          await setDoc(doc(db, 'users', result.user.uid), {
            username: result.user.email,
            role: 'student', // Default role, adjust as needed
            displayName: result.user.displayName || '',
            email: result.user.email || '',
            createdAt: new Date(),
          })
          logger.info('Created Firestore user document for Google user')
        } catch (setDocError) {
          logger.error('Error creating user document:', setDocError)
          // If document creation fails, sign out the user
          await signOut(auth)
          throw new Error('Failed to create user account. Please try again.')
        }
      }
    } catch (error: unknown) {
      logger.error('Google login error:', error)
      if (error instanceof Error) {
        throw error
      } else {
        throw new Error('An unexpected error occurred during Google login')
      }
    }
  }

  const loginWithGitHub = async () => {
    try {
      const provider = new GithubAuthProvider()
      const result = await signInWithPopup(auth, provider)
      const additionalInfo = getAdditionalUserInfo(result)
      if (additionalInfo?.isNewUser) {
        // Unauthorized: delete user and show error
        if (auth.currentUser) {
          try {
            await deleteUser(auth.currentUser)
          } catch (deleteError) {
            logger.error('Error deleting unauthorized user:', deleteError)
          }
        }
        debouncedToast('Account not registered. Please contact your teacher.', 'error')
        throw new Error('Account not registered. Please contact your teacher.')
      }
      // Check if user document exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', result.user.uid))
      if (!userDoc.exists()) {
        // Create user document if it doesn't exist (should not happen for existing users)
        try {
          await setDoc(doc(db, 'users', result.user.uid), {
            username: result.user.email,
            role: 'student', // Default role, adjust as needed
            displayName: result.user.displayName || '',
            email: result.user.email || '',
            createdAt: new Date(),
          })
          logger.info('Created Firestore user document for GitHub user')
        } catch (setDocError) {
          logger.error('Error creating user document:', setDocError)
          // If document creation fails, sign out the user
          await signOut(auth)
          throw new Error('Failed to create user account. Please try again.')
        }
      }
    } catch (error: unknown) {
      logger.error('GitHub login error:', error)
      if (error instanceof Error) {
        throw error
      } else {
        throw new Error('An unexpected error occurred during GitHub login')
      }
    }
  }

  const linkGitHubAccount = async () => {
    if (!auth.currentUser) {
      debouncedToast('No user is currently signed in.', 'error')
      return
    }
    try {
      const provider = new GithubAuthProvider()
      await linkWithPopup(auth.currentUser, provider)
      debouncedToast('GitHub account linked successfully!', 'success')
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'auth/credential-already-in-use') {
        debouncedToast('This GitHub account is already linked to another user.', 'error')
      } else if (error instanceof Error) {
        debouncedToast(error.message, 'error')
      } else {
        debouncedToast('Failed to link GitHub account.', 'error')
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
    logout,
    loginWithGoogle,
    loginWithGitHub,
    linkGitHubAccount,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
