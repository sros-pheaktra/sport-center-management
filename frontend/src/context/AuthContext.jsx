import { createContext, useContext } from 'react'

// Holds the logged-in user (or null) plus the auth actions.
// The provider component lives in AuthProvider.jsx.
export const AuthContext = createContext(null)

export function useAuth() {
  return useContext(AuthContext)
}
