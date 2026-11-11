import { createContext, useContext } from 'react'

// Holds the toast notification helpers. The provider component
// (and the toast list UI) lives in ToastProvider.jsx.
export const ToastContext = createContext(null)

export function useToast() {
  return useContext(ToastContext)
}
