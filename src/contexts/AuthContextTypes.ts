import { createContext } from 'react'
import type { ProviderData } from '../types'

export interface User {
  uid: string
  username: string | null
  role: 'student' | 'teacher' | 'admin'
  displayName?: string
  providerData: ProviderData[]
  isActive?: boolean // For students: true = active, false = discontinued (defaults to true)
}

export interface AuthContextType {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  loginWithGoogle: () => Promise<void>
  loginWithGitHub: () => Promise<void>
  linkGitHubAccount: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)
