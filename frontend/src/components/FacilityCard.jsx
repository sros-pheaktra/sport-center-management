import { Link } from 'react-router-dom'
import StatusBadge from './StatusBadge'
import FacilityImage from './FacilityImage'

export default function FacilityCard({ facility }) {
  return (
    <Link
      to={`/facilities/${facility.id}`}
      className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <FacilityImage
        image={facility.image}
        title={facility.title}
        className="aspect-video w-full"
      />

      <div className="flex flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-slate-900 group-hover:text-emerald-700">
            {facility.title}
          </h3>
          <StatusBadge status={facility.status} />
        </div>

        <p className="line-clamp-2 text-sm text-slate-600">
          {facility.description}
        </p>

        <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
          <span className="rounded-full bg-sky-50 px-2 py-0.5 font-medium text-sky-700">
            {facility.category_name}
          </span>
          <span>by {facility.owner_name}</span>
        </div>
      </div>
    </Link>
  )
}
