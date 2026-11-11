import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { AuthContext } from './AuthContext'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Ask the server who is logged in (session cookie) on first load
  useEffect(() => {
    let active = true

    api('/auth/me')
      .then((data) => { if (active) setUser(data.user) })
      .catch(() => { if (active) setUser(null) })
      .finally(() => { if (active) setLoading(false) })

    return () => { active = false }
  }, [])

  const login = useCallback(async (credentials) => {
    const data = await api('/auth/login', { method: 'POST', body: credentials })
    setUser(data.user)
    return data
  }, [])

  const register = useCallback(async (details) => {
    const data = await api('/auth/register', { method: 'POST', body: details })
    setUser(data.user)
    return data
  }, [])

  const logout = useCallback(async () => {
    await api('/auth/logout', { method: 'POST' })
    setUser(null)
  }, [])

  // Keeps the context in sync after the user edits their own
  // profile (name/phone) on the profile page
  const updateUser = useCallback((updated) => {
    setUser((current) => ({ ...current, ...updated }))
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}
