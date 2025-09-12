import { createContext } from 'react'

export interface User {
  uid: string
  username: string | null
  role: 'student' | 'teacher'
  displayName?: string
  providerData: any[]
}

export interface AuthContextType {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  loginWithGoogle: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)
