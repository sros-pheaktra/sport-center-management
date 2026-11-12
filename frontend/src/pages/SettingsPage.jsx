import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell,
  Check,
  ChevronRight,
  LayoutPanelLeft,
  ShieldCheck,
  User
} from 'lucide-react'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import RoleBadge from '../components/RoleBadge'

const SIDEBAR_KEY = 'sport-center.sidebar-collapsed'

const readCollapsed = () => {
  try {
    return window.localStorage.getItem(SIDEBAR_KEY) === '1'
  } catch {
    return false
  }
}

function SettingRow({ icon: Icon, title, description, children }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 py-4 last:border-0">
      <div className="flex min-w-0 gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800">{title}</p>
          <p className="mt-0.5 text-sm text-slate-500">{description}</p>
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

export default function SettingsPage() {
  const { user } = useAuth()
  const [collapsedByDefault, setCollapsedByDefault] = useState(readCollapsed)
  const [unread, setUnread] = useState(null)

  useEffect(() => {
    let active = true

    api('/notifications?limit=1')
      .then((data) => {
        if (active) setUnread(Number(data.unread_count) || 0)
      })
      .catch(() => {})

    return () => { active = false }
  }, [])

  const toggleSidebarDefault = () => {
    setCollapsedByDefault((current) => {
      const next = !current
      try {
        window.localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0')
      } catch {
        // Storage can be unavailable; the current session still works.
      }
      return next
    })
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h2>
        <p className="mt-1 text-sm text-slate-500">
          Manage your workspace preferences and account shortcuts.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Workspace
          </h3>

          <div className="mt-2">
            <SettingRow
              icon={LayoutPanelLeft}
              title="Collapse sidebar by default"
              description="Start with the compact icon rail. You can still expand it from the header."
            >
              <button
                type="button"
                role="switch"
                aria-checked={collapsedByDefault}
                onClick={toggleSidebarDefault}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  collapsedByDefault ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    collapsedByDefault ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </SettingRow>

            <SettingRow
              icon={Bell}
              title="Notifications"
              description="Review booking, payment, maintenance and membership updates."
            >
              <Link
                to="/notifications"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {unread !== null && unread > 0 ? `${unread} unread` : 'Open inbox'}
                <ChevronRight className="h-4 w-4" />
              </Link>
            </SettingRow>

            <SettingRow
              icon={ShieldCheck}
              title="Password & security"
              description="Change your password from your profile page."
            >
              <Link
                to="/profile"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Profile
                <ChevronRight className="h-4 w-4" />
              </Link>
            </SettingRow>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Account
          </h3>

          <div className="mt-4 flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-700">
              {String(user?.full_name || 'U')
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0].toUpperCase())
                .join('')}
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900">{user?.full_name}</p>
              <p className="truncate text-sm text-slate-500">{user?.email}</p>
            </div>
          </div>

          <div className="mt-4 space-y-3 rounded-lg bg-slate-50 p-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Role</span>
              <RoleBadge role={user?.role} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Phone</span>
              <span className="text-slate-800">{user?.phone || 'Not set'}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Account status</span>
              <span className="inline-flex items-center gap-1 text-emerald-700">
                <Check className="h-4 w-4" /> Active
              </span>
            </div>
          </div>

          <Link
            to="/profile"
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <User className="h-4 w-4" />
            Edit profile
          </Link>
        </section>
      </div>
    </div>
  )
}
