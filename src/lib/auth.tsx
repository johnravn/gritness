import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { account } from './appwrite'
import type { Models } from 'appwrite'
import { ID } from 'appwrite'

interface AuthContextType {
  user: Models.User<Models.Preferences> | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, name: string) => Promise<void>
  logout: () => Promise<void>
  isAuthenticated: boolean
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
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is already logged in
    checkUser()
  }, [])

  async function checkUser() {
    try {
      const currentUser = await account.get()
      setUser(currentUser)
    } catch (error) {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  async function login(email: string, password: string) {
    await account.createEmailPasswordSession(email, password)
    const currentUser = await account.get()
    setUser(currentUser)
  }

  async function signup(email: string, password: string, name: string) {
    await account.create(ID.unique(), email, password, name)
    await account.createEmailPasswordSession(email, password)
    const currentUser = await account.get()
    setUser(currentUser)
  }

  async function logout() {
    await account.deleteSession('current')
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

