import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, tokenStore } from '../lib/api'
const AuthContext = createContext(null)
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const loadSession = useCallback(async () => {
    if (!tokenStore.get()) {
      setSession(null)
      setLoading(false)
      return
    }
    try {
      const current = await api.get('/api/auth/me')
      setSession(current)
    } catch {
      tokenStore.clear()
      setSession(null)
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => {
    void loadSession()
  }, [loadSession])
  useEffect(() => {
    const handleUnauthorized = () => setSession(null)
    window.addEventListener('collectflow:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('collectflow:unauthorized', handleUnauthorized)
  }, [])
  const login = useCallback(async (email, password) => {
    const response = await api.post('/api/auth/login', { email, password })
    tokenStore.set(response.token)
    setSession({ user: response.user, business: response.business, role: response.role })
  }, [])
  const register = useCallback(async (payload) => {
    const response = await api.post('/api/auth/register', payload)
    tokenStore.set(response.token)
    setSession({ user: response.user, business: response.business, role: response.role })
  }, [])
  const logout = useCallback(() => {
    tokenStore.clear()
    setSession(null)
  }, [])
  const updateBusiness = useCallback((business) => {
    setSession((current) => (current ? { ...current, business } : current))
  }, [])
  const value = useMemo(
    () => ({
      session,
      loading,
      login,
      register,
      logout,
      updateBusiness,
      reloadSession: loadSession,
    }),
    [session, loading, login, register, logout, updateBusiness, loadSession],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
