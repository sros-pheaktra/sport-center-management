// Coloured badge showing an account's role (admin / manager /
// staff / customer). Purely presentational — permissions are
// enforced on the server.
const ROLE_STYLES = {
  admin: 'bg-purple-100 text-purple-800',
  manager: 'bg-amber-100 text-amber-800',
  staff: 'bg-sky-100 text-sky-800',
  customer: 'bg-emerald-100 text-emerald-800'
}

export default function RoleBadge({ role }) {
  const label = role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Unknown'

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        ROLE_STYLES[role] || 'bg-slate-100 text-slate-700'
      }`}
    >
      {label}
    </span>
  )
}
