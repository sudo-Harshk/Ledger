import { createContext } from 'react'

export interface User {
  uid: string
  username: string | null
  role: 'student' | 'teacher' | 'admin'
  displayName?: string
  providerData: any[]
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
