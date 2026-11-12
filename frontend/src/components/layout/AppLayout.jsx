import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Sidebar from './Sidebar'
import Header from './Header'

const SIDEBAR_KEY = 'sport-center.sidebar-collapsed'
const AUTH_PATHS = ['/login', '/register']

const readCollapsed = () => {
  try {
    return window.localStorage.getItem(SIDEBAR_KEY) === '1'
  } catch {
    return false
  }
}

export default function AppLayout({ children }) {
  const { user } = useAuth()
  const { pathname } = useLocation()

  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [mobileOpen, setMobileOpen] = useState(false)

  const isAuthPage = AUTH_PATHS.includes(pathname)

  // Stop the page behind the mobile drawer from scrolling.
  useEffect(() => {
    if (!mobileOpen) return

    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previous
    }
  }, [mobileOpen])

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      const next = !current
      try {
        window.localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0')
      } catch {
        // Private browsing / storage disabled — the toggle still works
        // for the current session.
      }
      return next
    })
  }

  if (isAuthPage) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-100">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6">
            <Link to="/" className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
                <img src="/favicon.svg" alt="" className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-bold text-slate-900">Sport Center</span>
                <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Management
                </span>
              </span>
            </Link>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
          Sport Center Management — full-stack coursework project
        </footer>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
        />
      )}

      <Sidebar
        user={user}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onToggleCollapse={toggleCollapsed}
      />

      <div
        className={`flex min-h-screen flex-col transition-[padding] duration-200 ${
          collapsed ? 'lg:pl-[76px]' : 'lg:pl-[272px]'
        }`}
      >
        <Header
          user={user}
          collapsed={collapsed}
          onOpenMobile={() => setMobileOpen(true)}
          onToggleCollapse={toggleCollapsed}
        />

        <main className="flex-1">{children}</main>

        <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
          Sport Center Management · Operations dashboard
        </footer>
      </div>
    </div>
  )
}
