// Shows the facility image, or a clear placeholder when the
// facility has no image uploaded
export default function FacilityImage({ image, title, className = '' }) {
  if (image) {
    return (
      <img
        src={`/uploads/${image}`}
        alt={`Photo of ${title}`}
        className={`object-cover ${className}`}
        loading="lazy"
      />
    )
  }

  return (
    <div
      role="img"
      aria-label={`No photo uploaded for ${title}`}
      className={`flex flex-col items-center justify-center gap-2 bg-slate-100 text-slate-400 ${className}`}
    >
      <svg
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="h-10 w-10"
      >
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="9" cy="11" r="1.6" />
        <path d="m5 17 4.5-4.5a1.5 1.5 0 0 1 2.1 0L16 17M14 14l1.4-1.4a1.5 1.5 0 0 1 2.1 0L21 17" />
      </svg>
      <span className="text-xs font-medium">No photo</span>
    </div>
  )
}
