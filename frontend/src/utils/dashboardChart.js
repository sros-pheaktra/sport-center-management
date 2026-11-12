// Pure helpers that turn sparse API series into continuous chart
// timelines. Kept outside the component file so Fast Refresh stays
// happy and the dashboard can reuse the same totals.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const pad = (value) => String(value).padStart(2, '0')

const dayKey = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

const startOfWeek = (date) => {
  const monday = new Date(date)
  const offset = (monday.getDay() + 6) % 7
  monday.setDate(monday.getDate() - offset)
  return monday
}

// The API only returns buckets that actually have rows. This fills the
// gaps so the chart shows a continuous timeline instead of jumping
// from one payment day to the next.
export function buildSeries(series, range, now) {
  const reference = now ? new Date(now) : new Date()
  const values = new Map(
    (series || []).map((point) => [point.period, Number(point.total) || 0])
  )
  const buckets = []

  if (range === 'weekly') {
    const monday = startOfWeek(reference)

    for (let index = 7; index >= 0; index -= 1) {
      const date = new Date(monday)
      date.setDate(monday.getDate() - index * 7)
      buckets.push({ key: dayKey(date), label: `${date.getDate()} ${MONTHS[date.getMonth()]}` })
    }
  } else if (range === 'monthly') {
    for (let index = 11; index >= 0; index -= 1) {
      const date = new Date(reference.getFullYear(), reference.getMonth() - index, 1)
      buckets.push({
        key: `${date.getFullYear()}-${pad(date.getMonth() + 1)}`,
        label: MONTHS[date.getMonth()]
      })
    }
  } else {
    for (let index = 13; index >= 0; index -= 1) {
      const date = new Date(reference)
      date.setDate(reference.getDate() - index)
      buckets.push({ key: dayKey(date), label: `${date.getDate()} ${MONTHS[date.getMonth()]}` })
    }
  }

  return buckets.map((bucket) => ({
    ...bucket,
    value: values.get(bucket.key) || 0
  }))
}

export const revenueInView = (series, range, now) =>
  buildSeries(series, range, now).reduce((sum, point) => sum + point.value, 0)
