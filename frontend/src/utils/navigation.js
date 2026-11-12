import {
  BadgePercent,
  Building2,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  CreditCard,
  Crown,
  Dumbbell,
  LayoutDashboard,
  ScanLine,
  Tags,
  UserCheck,
  Users,
  Wrench
} from 'lucide-react'

// Single source of truth for the sidebar, the page header and the
// global search. The server still checks every role on each request —
// this list only decides what is shown in the interface.
const STAFF_ROLES = ['admin', 'manager', 'staff']
const MANAGER_ROLES = ['admin', 'manager']
const ALL_ROLES = ['admin', 'manager', 'staff', 'customer']

const matchesSection = (pathname, section) =>
  pathname === section || pathname.startsWith(`${section}/`)

export const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      {
        to: '/dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        roles: STAFF_ROLES
      }
    ]
  },
  {
    label: 'Management',
    items: [
      {
        to: '/',
        label: 'Facilities',
        icon: Building2,
        public: true,
        match: (pathname) =>
          pathname === '/' || pathname.startsWith('/facilities')
      },
      {
        to: '/equipment',
        label: 'Equipment',
        icon: Dumbbell,
        public: true,
        match: (pathname) => matchesSection(pathname, '/equipment')
      },
      {
        to: '/bookings',
        label: 'Bookings',
        icon: CalendarCheck,
        roles: ALL_ROLES,
        match: (pathname) => matchesSection(pathname, '/bookings')
      },
      {
        to: '/calendar',
        label: 'Calendar',
        icon: CalendarDays,
        roles: STAFF_ROLES
      },
      {
        to: '/schedules',
        label: 'Schedules',
        icon: ClipboardList,
        roles: STAFF_ROLES
      },
      {
        to: '/attendance',
        label: 'Attendance',
        icon: UserCheck,
        roles: STAFF_ROLES
      },
      {
        to: '/maintenance',
        label: 'Maintenance',
        icon: Wrench,
        roles: STAFF_ROLES
      },
      {
        to: '/check-in',
        label: 'Check-in',
        icon: ScanLine,
        roles: STAFF_ROLES
      }
    ]
  },
  {
    label: 'Finance & Services',
    items: [
      {
        to: '/payments',
        label: 'Payments',
        icon: CreditCard,
        roles: STAFF_ROLES
      },
      {
        to: '/promotions',
        label: 'Promotions',
        icon: BadgePercent,
        roles: MANAGER_ROLES
      },
      {
        to: '/memberships',
        label: 'Memberships',
        icon: Crown,
        roles: ['admin', 'manager', 'customer']
      }
    ]
  },
  {
    label: 'Administration',
    items: [
      {
        to: '/users',
        label: 'Users',
        icon: Users,
        roles: MANAGER_ROLES
      },
      {
        to: '/categories',
        label: 'Categories',
        icon: Tags,
        roles: MANAGER_ROLES
      }
    ]
  }
]

export const canSeeNavItem = (item, user) => {
  if (item.public) return true
  if (!user) return false
  return Boolean(item.roles?.includes(user.role))
}

export const getVisibleNavGroups = (user) =>
  NAV_GROUPS
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canSeeNavItem(item, user))
    }))
    .filter((group) => group.items.length > 0)

const navItemLabel = (item, user) => {
  if (item.to === '/bookings' && user?.role === 'customer') return 'My bookings'
  return item.label
}

export const isNavItemActive = (item, pathname) => {
  if (item.match) return item.match(pathname)
  return item.to === '/' ? pathname === '/' : matchesSection(pathname, item.to)
}

// Flat list used by the header search.
export const getSearchableNavItems = (user) =>
  getVisibleNavGroups(user).flatMap((group) =>
    group.items.map((item) => ({
      label: navItemLabel(item, user),
      group: group.label,
      to: item.to,
      icon: item.icon
    }))
  )

const PAGE_META = [
  { pattern: /^\/$/, title: 'Facilities', section: 'Management' },
  { pattern: /^\/dashboard$/, title: 'Dashboard', section: 'Overview' },
  { pattern: /^\/facilities\/new$/, title: 'Add facility', section: 'Management' },
  { pattern: /^\/facilities\/[^/]+\/edit$/, title: 'Edit facility', section: 'Management' },
  { pattern: /^\/facilities\/[^/]+\/book$/, title: 'Book facility', section: 'Management' },
  { pattern: /^\/facilities\/[^/]+$/, title: 'Facility details', section: 'Management' },
  { pattern: /^\/equipment$/, title: 'Equipment', section: 'Management' },
  { pattern: /^\/bookings$/, title: 'Bookings', section: 'Management' },
  { pattern: /^\/bookings\/[^/]+$/, title: 'Booking details', section: 'Management' },
  { pattern: /^\/calendar$/, title: 'Booking calendar', section: 'Management' },
  { pattern: /^\/schedules$/, title: 'Staff schedules', section: 'Management' },
  { pattern: /^\/attendance$/, title: 'Attendance', section: 'Management' },
  { pattern: /^\/maintenance$/, title: 'Maintenance', section: 'Management' },
  { pattern: /^\/check-in$/, title: 'Check-in', section: 'Management' },
  { pattern: /^\/payments$/, title: 'Payments', section: 'Finance & Services' },
  { pattern: /^\/promotions$/, title: 'Promotions', section: 'Finance & Services' },
  { pattern: /^\/memberships$/, title: 'Memberships', section: 'Finance & Services' },
  { pattern: /^\/invoices\/[^/]+$/, title: 'Invoice', section: 'Finance & Services' },
  { pattern: /^\/users$/, title: 'Users', section: 'Administration' },
  { pattern: /^\/categories$/, title: 'Categories', section: 'Administration' },
  { pattern: /^\/notifications$/, title: 'Notifications', section: 'Overview' },
  { pattern: /^\/profile$/, title: 'Profile', section: 'Account' },
  { pattern: /^\/settings$/, title: 'Settings', section: 'Account' },
  { pattern: /^\/login$/, title: 'Log in', section: 'Account' },
  { pattern: /^\/register$/, title: 'Register', section: 'Account' }
]

export const getPageMeta = (pathname) => {
  const match = PAGE_META.find((entry) => entry.pattern.test(pathname))

  if (!match) {
    return { title: 'Page not found', section: 'Sport Center' }
  }

  return { title: match.title, section: match.section }
}
