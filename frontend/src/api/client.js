const BASE = import.meta.env.VITE_API_BASE_URL || ''

const PUBLIC_AUTH_ENDPOINTS = new Set([
  '/api/auth/login/',
  '/api/auth/register/',
  '/api/auth/send-otp/',
  '/api/auth/verify-otp/',
  '/api/auth/set-password/',
  '/api/auth/complete-registration/',
])

function getToken() {
  return localStorage.getItem('access_token')
}

async function request(endpoint, options = {}) {
  const token = getToken()
  const isPublicAuthRequest = PUBLIC_AUTH_ENDPOINTS.has(endpoint)
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
  const headers = isFormData ? { ...options.headers } : { 'Content-Type': 'application/json', ...options.headers }
  if (token && !options._skipAuth && !isPublicAuthRequest) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${endpoint}`, { ...options, headers })

  if (res.status === 401 && !options._retry && !isPublicAuthRequest) {
    const refresh = localStorage.getItem('refresh_token')
    if (refresh) {
      const r = await fetch(`${BASE}/api/auth/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
      })
      if (r.ok) {
        const d = await r.json()
        localStorage.setItem('access_token', d.access)
        if (d.refresh) localStorage.setItem('refresh_token', d.refresh)
        return request(endpoint, { ...options, _retry: true })
      }
    }
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    const publicRequest = endpoint.startsWith('/api/catalog/') || endpoint.startsWith('/api/serviceability/')
    if (publicRequest) {
      return request(endpoint, { ...options, _retry: true, _skipAuth: true })
    }
    sessionStorage.setItem('redirect_after_login', window.location.pathname)
    window.location.href = '/login'
  }

  const text = await res.text()
  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text) }
  } catch {
    return { ok: res.ok, status: res.status, data: text }
  }
}

export function extractList(data) {
  if (Array.isArray(data)) return data
  return data?.results ?? []
}

export function get(endpoint, params) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  return request(`/api${endpoint}${qs}`)
}

export function post(endpoint, body) {
  return request(`/api${endpoint}`, {
    method: 'POST',
    body: body instanceof FormData ? body : JSON.stringify(body),
  })
}

export function patch(endpoint, body) {
  return request(`/api${endpoint}`, {
    method: 'PATCH',
    body: body instanceof FormData ? body : JSON.stringify(body),
  })
}

export function del(endpoint) {
  return request(`/api${endpoint}`, { method: 'DELETE' })
}

/**
 * Download a file from an API endpoint as a blob with JWT auth headers.
 * Uses a programmatic download to avoid the auth redirect that plain <a> tags cause.
 * Extracts filename from Content-Disposition header, falls back to defaultName.
 */
export async function downloadFile(endpoint, defaultName = 'download.pdf') {
  try {
    const token = localStorage.getItem('access_token')
    const res = await fetch(`${BASE}/api${endpoint}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })

    if (res.status === 401) {
      // Try token refresh
      const refresh = localStorage.getItem('refresh_token')
      if (refresh) {
        const r = await fetch(`${BASE}/api/auth/refresh/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh }),
        })
        if (r.ok) {
          const d = await r.json()
          localStorage.setItem('access_token', d.access)
          if (d.refresh) localStorage.setItem('refresh_token', d.refresh)
          // Retry with new token
          return downloadFile(endpoint, defaultName)
        }
      }
      sessionStorage.setItem('redirect_after_login', window.location.pathname)
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      window.location.href = '/login'
      return
    }

    if (!res.ok) {
      const text = await res.text()
      console.error('Download failed:', text)
      return
    }

    const blob = await res.blob()
    const disposition = res.headers.get('Content-Disposition')
    let filename = defaultName
    if (disposition) {
      const match = disposition.match(/filename="?(.+?)"?$/)
      if (match) filename = match[1]
    }

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (err) {
    console.error('Download error:', err)
  }
}
