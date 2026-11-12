// Role helpers used across the app. The server re-checks every
// role on each request — these helpers only decide what to SHOW.

// admin + manager manage the center's facilities and categories
export const canManageContent = (user) =>
  Boolean(user) && (user.role === 'admin' || user.role === 'manager')

// admin + manager manage user & staff accounts
export const canManageUsers = (user) =>
  Boolean(user) && (user.role === 'admin' || user.role === 'manager')

// only admins can change roles, activate/deactivate or delete accounts
export const isAdmin = (user) => Boolean(user) && user.role === 'admin'

// admin / manager / staff get the staff-side dashboard
export const isStaffSide = (user) =>
  Boolean(user) && ['admin', 'manager', 'staff'].includes(user.role)

// staff-side roles manage the booking lifecycle (confirm, check in, …)
export const canManageBookings = (user) =>
  Boolean(user) && ['admin', 'manager', 'staff'].includes(user.role)

// admins and managers see the whole calendar / reports
export const canViewAllBookings = (user) =>
  Boolean(user) && ['admin', 'manager', 'staff'].includes(user.role)

// membership plans are managed by admins and managers
export const canManagePlans = (user) =>
  Boolean(user) && ['admin', 'manager'].includes(user.role)

// shift rosters are managed by admins and managers
export const canManageSchedules = (user) =>
  Boolean(user) && ['admin', 'manager'].includes(user.role)

// admins and managers can resolve/close maintenance work
export const canResolveMaintenance = (user) =>
  Boolean(user) && ['admin', 'manager'].includes(user.role)

// refunds are a manager/admin decision
export const canRefundPayments = (user) =>
  Boolean(user) && ['admin', 'manager'].includes(user.role)
