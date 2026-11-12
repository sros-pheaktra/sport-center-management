// Small status badges shared by the Phase 4 pages.

const badge = (classes) =>
  `inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${classes}`

const EQUIPMENT_STYLES = {
  available: 'bg-emerald-100 text-emerald-800',
  rented: 'bg-sky-100 text-sky-800',
  maintenance: 'bg-amber-100 text-amber-800',
  retired: 'bg-slate-200 text-slate-600'
}

const EQUIPMENT_LABELS = {
  available: 'Available',
  rented: 'Rented',
  maintenance: 'Maintenance',
  retired: 'Retired'
}

export function EquipmentStatusBadge({ status }) {
  return (
    <span className={badge(EQUIPMENT_STYLES[status] || EQUIPMENT_STYLES.retired)}>
      {EQUIPMENT_LABELS[status] || status}
    </span>
  )
}

const CONDITION_STYLES = {
  excellent: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  good: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
  fair: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  poor: 'bg-red-50 text-red-700 ring-1 ring-red-200'
}

export function EquipmentConditionBadge({ condition }) {
  return (
    <span className={badge(CONDITION_STYLES[condition] || CONDITION_STYLES.good)}>
      {condition ? condition.charAt(0).toUpperCase() + condition.slice(1) : 'Good'}
    </span>
  )
}

const RENTAL_STYLES = {
  rented: 'bg-sky-100 text-sky-800',
  overdue: 'bg-red-100 text-red-700',
  returned: 'bg-emerald-100 text-emerald-800',
  lost: 'bg-slate-200 text-slate-600'
}

const RENTAL_LABELS = {
  rented: 'Rented',
  overdue: 'Overdue',
  returned: 'Returned',
  lost: 'Lost'
}

export function RentalStatusBadge({ status }) {
  return (
    <span className={badge(RENTAL_STYLES[status] || RENTAL_STYLES.rented)}>
      {RENTAL_LABELS[status] || status}
    </span>
  )
}

const NOTIFICATION_STYLES = {
  reservation: 'bg-sky-100 text-sky-800',
  payment: 'bg-emerald-100 text-emerald-800',
  maintenance: 'bg-amber-100 text-amber-800',
  membership: 'bg-violet-100 text-violet-800',
  system: 'bg-slate-200 text-slate-600'
}

export function NotificationTypeBadge({ type }) {
  return (
    <span className={badge(NOTIFICATION_STYLES[type] || NOTIFICATION_STYLES.system)}>
      {type ? type.charAt(0).toUpperCase() + type.slice(1) : 'System'}
    </span>
  )
}

export function PromotionStateBadge({ promotion }) {
  const state = !promotion.is_active
    ? { label: 'Inactive', classes: 'bg-slate-200 text-slate-600' }
    : promotion.is_expired
      ? { label: 'Expired', classes: 'bg-amber-100 text-amber-800' }
      : promotion.is_upcoming
        ? { label: 'Upcoming', classes: 'bg-sky-100 text-sky-800' }
        : promotion.is_exhausted
          ? { label: 'Used up', classes: 'bg-red-100 text-red-700' }
          : { label: 'Active', classes: 'bg-emerald-100 text-emerald-800' }

  return <span className={badge(state.classes)}>{state.label}</span>
}
