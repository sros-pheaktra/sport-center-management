// Small status badges shared by the Phase 3 pages.

const badge = (classes) =>
  `inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${classes}`

const INVOICE_STYLES = {
  issued: 'bg-amber-100 text-amber-800',
  paid: 'bg-emerald-100 text-emerald-800',
  void: 'bg-slate-200 text-slate-600'
}

const INVOICE_LABELS = {
  issued: 'Issued',
  paid: 'Paid',
  void: 'Void'
}

export function InvoiceStatusBadge({ status }) {
  return (
    <span className={badge(INVOICE_STYLES[status] || INVOICE_STYLES.issued)}>
      {INVOICE_LABELS[status] || status}
    </span>
  )
}

const MAINTENANCE_STYLES = {
  open: 'bg-red-100 text-red-700',
  in_progress: 'bg-amber-100 text-amber-800',
  resolved: 'bg-emerald-100 text-emerald-800',
  closed: 'bg-slate-200 text-slate-600'
}

const MAINTENANCE_LABELS = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed'
}

export function MaintenanceStatusBadge({ status }) {
  return (
    <span className={badge(MAINTENANCE_STYLES[status] || MAINTENANCE_STYLES.open)}>
      {MAINTENANCE_LABELS[status] || status}
    </span>
  )
}

const PRIORITY_STYLES = {
  high: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  medium: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  low: 'bg-slate-50 text-slate-600 ring-1 ring-slate-200'
}

export function PriorityBadge({ priority }) {
  return (
    <span className={badge(PRIORITY_STYLES[priority] || PRIORITY_STYLES.medium)}>
      {priority ? priority.charAt(0).toUpperCase() + priority.slice(1) : 'Medium'}
    </span>
  )
}

const ATTENDANCE_STYLES = {
  present: 'bg-emerald-100 text-emerald-800',
  late: 'bg-amber-100 text-amber-800',
  absent: 'bg-red-100 text-red-700'
}

const ATTENDANCE_LABELS = {
  present: 'Present',
  late: 'Late',
  absent: 'Absent'
}

export function AttendanceStatusBadge({ status }) {
  return (
    <span className={badge(ATTENDANCE_STYLES[status] || ATTENDANCE_STYLES.present)}>
      {ATTENDANCE_LABELS[status] || status}
    </span>
  )
}

const MEMBERSHIP_STYLES = {
  active: 'bg-emerald-100 text-emerald-800',
  expired: 'bg-slate-200 text-slate-600',
  cancelled: 'bg-red-100 text-red-700'
}

export function MembershipStatusBadge({ status }) {
  return (
    <span className={badge(MEMBERSHIP_STYLES[status] || MEMBERSHIP_STYLES.expired)}>
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown'}
    </span>
  )
}
