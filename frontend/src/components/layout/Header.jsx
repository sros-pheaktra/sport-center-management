import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  ScanLine,
  Search,
  Settings,
  User
} from 'lucide-react'
import { api } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import NotificationBell from '../NotificationBell'
import RoleBadge from '../RoleBadge'
import { getPageMeta, getSearchableNavItems } from '../../utils/navigation'

const initialsOf = (name) =>
  String(name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || 'U'

export default function Header({
  user,
  collapsed,
  onOpenMobile,
  onToggleCollapse
}) {
  const { logout } = useAuth()
  const { success, error } = useToast()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [facilities, setFacilities] = useState([])
  const [menuOpen, setMenuOpen] = useState(false)

  const searchRef = useRef(null)
  const menuRef = useRef(null)

  const meta = getPageMeta(pathname)
  const navMatches = query.trim()
    ? getSearchableNavItems(user).filter((item) =>
        item.label.toLowerCase().includes(query.trim().toLowerCase())
      )
    : []

  useEffect(() => {
    const term = query.trim()

    if (!searchOpen || term.length < 2) return

    let active = true
    const timer = setTimeout(() => {
      api(`/facilities?search=${encodeURIComponent(term)}`)
        .then((data) => {
          if (active) setFacilities((data.facilities || []).slice(0, 5))
        })
        .catch(() => {
          if (active) setFacilities([])
        })
    }, 250)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [query, searchOpen])

  useEffect(() => {
    const onClick = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchOpen(false)
      }
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  useEffect(() => {
    if (!menuOpen) return

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  const handleLogout = async () => {
    setMenuOpen(false)
    try {
      await logout()
      success('You have been logged out.')
      navigate('/')
    } catch {
      error('Logout failed. Please try again.')
    }
  }

  const goToSearchResult = (to) => {
    setSearchOpen(false)
    setQuery('')
    navigate(to)
  }

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    const first = navMatches[0] || facilities[0]

    if (first) {
      goToSearchResult(navMatches[0] ? first.to : `/facilities/${first.id}`)
    }
  }

  const primaryAction = user
    ? user.role === 'customer'
      ? { label: 'New booking', to: '/', icon: Plus }
      : { label: 'Check in', to: '/check-in', icon: ScanLine }
    : null

  const PrimaryIcon = primaryAction?.icon
  const showResults = searchOpen && query.trim().length > 0
  const hasResults = navMatches.length > 0 || facilities.length > 0

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex h-[72px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        {/* Sidebar toggles */}
        <button
          type="button"
          onClick={onOpenMobile}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:inline-flex"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-5 w-5" />
          ) : (
            <PanelLeftClose className="h-5 w-5" />
          )}
        </button>

        {/* Title + breadcrumb */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
            <span className="truncate">{meta.section}</span>
            <ChevronRight className="h-3 w-3 shrink-0" />
            <span className="truncate text-slate-600">{meta.title}</span>
          </div>
          <h1 className="truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
            {meta.title}
          </h1>
        </div>

        {/* Global search */}
        <div ref={searchRef} className="relative hidden md:block">
          <form onSubmit={handleSearchSubmit}>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setSearchOpen(true)
              }}
              onFocus={() => setSearchOpen(true)}
              placeholder="Search pages or facilities…"
              aria-label="Global search"
              className="w-56 rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 lg:w-72"
            />
          </form>

          {showResults && (
            <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
              {!hasResults ? (
                <p className="px-4 py-5 text-center text-sm text-slate-500">
                  No pages or facilities match “{query.trim()}”.
                </p>
              ) : (
                <div className="max-h-80 overflow-y-auto py-1">
                  {navMatches.length > 0 && (
                    <p className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Pages
                    </p>
                  )}
                  {navMatches.map((item) => {
                    const Icon = item.icon
                    return (
                      <button
                        key={`${item.to}-${item.label}`}
                        type="button"
                        onClick={() => goToSearchResult(item.to)}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <Icon className="h-4 w-4 text-slate-400" />
                        <span className="flex-1">{item.label}</span>
                        <span className="text-[11px] text-slate-400">{item.group}</span>
                      </button>
                    )
                  })}

                  {facilities.length > 0 && (
                    <p className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Facilities
                    </p>
                  )}
                  {facilities.map((facility) => (
                    <button
                      key={facility.id}
                      type="button"
                      onClick={() => goToSearchResult(`/facilities/${facility.id}`)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{facility.title}</span>
                        <span className="block truncate text-xs text-slate-400">
                          {facility.category_name}
                        </span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Primary action */}
        {primaryAction && (
          <Link
            to={primaryAction.to}
            className="hidden items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 sm:inline-flex"
          >
            <PrimaryIcon className="h-4 w-4" />
            <span className="hidden lg:inline">{primaryAction.label}</span>
          </Link>
        )}

        {user && <NotificationBell user={user} />}

        {/* User menu */}
        {user ? (
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex items-center gap-2 rounded-lg p-1.5 text-left hover:bg-slate-100"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                {initialsOf(user.full_name)}
              </span>
              <span className="hidden min-w-0 md:block">
                <span className="block max-w-[140px] truncate text-sm font-semibold text-slate-800">
                  {user.full_name}
                </span>
                <span className="block text-[11px] capitalize text-slate-500">
                  {user.role}
                </span>
              </span>
              <ChevronDown className="hidden h-4 w-4 text-slate-400 md:block" />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
              >
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {user.full_name}
                  </p>
                  <p className="truncate text-xs text-slate-500">{user.email}</p>
                  <span className="mt-2 inline-block">
                    <RoleBadge role={user.role} />
                  </span>
                </div>

                <div className="py-1">
                  <Link
                    to="/profile"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <User className="h-4 w-4 text-slate-400" />
                    Profile
                  </Link>
                  <Link
                    to="/settings"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <Settings className="h-4 w-4 text-slate-400" />
                    Settings
                  </Link>
                </div>

                <div className="border-t border-slate-100 py-1">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Link
            to="/login"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  )
}
