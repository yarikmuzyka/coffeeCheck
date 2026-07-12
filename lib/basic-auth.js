export function hasValidBasicAuth(authorization, username, password) {
  if (!authorization?.startsWith('Basic ') || !username || !password) return false

  try {
    const decoded = atob(authorization.slice(6))
    const separator = decoded.indexOf(':')
    if (separator === -1) return false

    return decoded.slice(0, separator) === username && decoded.slice(separator + 1) === password
  } catch {
    return false
  }
}
