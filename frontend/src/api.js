// Small fetch wrapper. Cookies are sent along (credentials: 'include')
// so the session-based login works — in development the Vite dev
// server proxies /api to the backend on port 5000.
export async function api(path, { method = 'GET', body } = {}) {
  const options = {
    method,
    credentials: 'include'
  }

  if (body instanceof FormData) {
    options.body = body
  } else if (body !== undefined) {
    options.headers = { 'Content-Type': 'application/json' }
    options.body = JSON.stringify(body)
  }

  const response = await fetch(`/api${path}`, options)

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const error = new Error(
      data.message || 'Something went wrong. Please try again.'
    )
    error.status = response.status
    throw error
  }

  return data
}
