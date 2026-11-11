import { Link } from 'react-router-dom'

// Shown for unknown pages (a missing facility gets a friendlier,
// specific message inside the detail page instead)
export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-5xl font-bold text-slate-300">404</h1>
      <h2 className="mt-3 text-xl font-semibold text-slate-800">Page not found</h2>
      <p className="mt-2 text-slate-600">The page you are looking for does not exist.</p>
      <Link
        to="/"
        className="mt-6 inline-block rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
      >
        ← Back to all facilities
      </Link>
    </div>
  )
}
