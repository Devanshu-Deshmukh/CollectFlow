const TOKEN_KEY = 'collectflow.token'
export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}
export class ApiError extends Error {
  constructor(status, message, fieldErrors) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}
async function request(path, options = {}) {
  const headers = {}
  if (!options.formData) {
    headers['Content-Type'] = 'application/json'
  }
  const token = tokenStore.get()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  const response = await fetch(path, {
    method: options.method ?? 'GET',
    headers,
    body:
      options.formData ?? (options.body === undefined ? undefined : JSON.stringify(options.body)),
  })
  if (response.status === 204) {
    return undefined
  }
  const text = await response.text()
  let payload = null
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = text
    }
  }
  if (!response.ok) {
    const errorBody = payload
    if (response.status === 401 && !path.includes('/api/auth/login')) {
      tokenStore.clear()
      window.dispatchEvent(new Event('collectflow:unauthorized'))
    }
    throw new ApiError(
      response.status,
      errorBody?.message ?? `Request failed (${response.status})`,
      errorBody?.fieldErrors,
    )
  }
  return payload
}
export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
  upload: (path, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return request(path, { method: 'POST', formData })
  },
  download: async (path, fallbackName) => {
    const token = tokenStore.get()
    const response = await fetch(path, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!response.ok) {
      throw new ApiError(response.status, 'Could not download the file')
    }
    const blob = await response.blob()
    const disposition = response.headers.get('Content-Disposition') ?? ''
    const match = /filename="?([^";]+)"?/.exec(disposition)
    const filename = match?.[1] ?? fallbackName
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  },
}
export function errorMessage(error) {
  if (error instanceof ApiError) {
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'Something went wrong'
}
