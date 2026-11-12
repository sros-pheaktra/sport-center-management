import { Link, useLocation } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  Radio,
  X
} from 'lucide-react'
import {
  getVisibleNavGroups,
  isNavItemActive
} from '../../utils/navigation'

// Dark, collapsible navigation rail. On desktop it can shrink to an
// icon-only rail; on mobile it is a slide-out drawer controlled by the
// header and an overlay in AppLayout.
export default function Sidebar({
  user,
  collapsed,
  mobileOpen,
  onClose,
  onToggleCollapse
}) {
  const { pathname } = useLocation()
  const groups = getVisibleNavGroups(user)

  const itemClass = (active, iconOnly) =>
    `group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
      active
        ? 'bg-blue-600 text-white shadow-sm shadow-blue-950/40'
        : 'text-slate-400 hover:bg-white/5 hover:text-white'
    } ${iconOnly ? 'lg:justify-center lg:px-2' : ''}`

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col bg-[#0b1220] text-slate-300 transition-transform duration-200 lg:translate-x-0 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      } ${collapsed ? 'lg:w-[76px]' : 'lg:w-[272px]'}`}
      aria-label="Main navigation"
    >
      {/* Brand */}
      <div
        className={`flex h-[72px] shrink-0 items-center border-b border-white/10 ${
          collapsed ? 'lg:justify-center lg:px-2' : 'justify-between px-4'
        }`}
      >
        <Link to="/" className="flex min-w-0 items-center gap-3" onClick={onClose}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600">
            <img src="/favicon.svg" alt="" className="h-5 w-5" />
          </span>
          <span className={`min-w-0 ${collapsed ? 'lg:hidden' : ''}`}>
            <span className="block truncate text-sm font-bold tracking-tight text-white">
              Sport Center
            </span>
            <span className="block truncate text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">
              Management
            </span>
          </span>
        </Link>

        {/* Mobile close */}
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-2 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Close navigation"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Desktop collapse */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className={`hidden rounded-md p-1.5 text-slate-500 hover:bg-white/10 hover:text-white lg:block ${
            collapsed ? 'absolute left-[58px] top-5 z-10 bg-[#0b1220] ring-1 ring-white/10' : ''
          }`}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {groups.map((group) => (
          <div key={group.label} className="mb-5 last:mb-0">
            <p
              className={`mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 ${
                collapsed ? 'lg:hidden' : ''
              }`}
            >
              {group.label}
            </p>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon
                const active = isNavItemActive(item, pathname)
                const label = item.to === '/bookings' && user?.role === 'customer'
                  ? 'My bookings'
                  : item.label

                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      onClick={onClose}
                      aria-current={active ? 'page' : undefined}
                      title={collapsed ? label : undefined}
                      className={itemClass(active, collapsed)}
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.9} />
                      <span className={`truncate ${collapsed ? 'lg:hidden' : ''}`}>
                        {label}
                      </span>
                      {collapsed && (
                        <span className="pointer-events-none absolute left-full z-50 ml-3 hidden whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg ring-1 ring-white/10 group-hover:opacity-100 lg:block">
                          {label}
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="shrink-0 border-t border-white/10 p-3">
        <div
          className={`flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2.5 ${
            collapsed ? 'lg:justify-center lg:px-2' : ''
          }`}
        >
          <Radio className="h-4 w-4 shrink-0 text-emerald-400" />
          <span className={`min-w-0 ${collapsed ? 'lg:hidden' : ''}`}>
            <span className="block text-xs font-semibold text-slate-200">System online</span>
            <span className="block text-[11px] text-slate-500">Sport Center v1.0</span>
          </span>
        </div>
      </div>
    </aside>
  )
}
