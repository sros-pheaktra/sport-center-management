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
