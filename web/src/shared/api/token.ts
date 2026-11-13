const STORAGE_KEY = 'ai-buddy.token'

let memoryToken: string | null = null

function readStorage(): string | null {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function writeStorage(token: string | null) {
  try {
    if (token) {
      window.sessionStorage.setItem(STORAGE_KEY, token)
    } else {
      window.sessionStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // sessionStorage может быть недоступен (приватный режим, SSR).
  }
}

export function getAuthToken(): string | null {
  if (memoryToken) {
    return memoryToken
  }

  memoryToken = readStorage()
  return memoryToken
}

export function setAuthToken(token: string | null) {
  memoryToken = token
  writeStorage(token)
}

export function clearAuthToken() {
  setAuthToken(null)
}
