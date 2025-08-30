import { createContext } from 'react'

export interface User {
  uid: string
  username: string | null
  role: 'student' | 'teacher'
  displayName?: string
}

export interface AuthContextType {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)
