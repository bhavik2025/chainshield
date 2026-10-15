import { createContext, useContext, useState, useEffect } from 'react'
import { api, normalizeUser, setToken, clearToken, getToken } from '../utils/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading,     setLoading]     = useState(true)

  // ---- On mount: restore session from stored JWT --------------------
  useEffect(() => {
    const token = getToken()
    if (!token) { setLoading(false); return }
    api.auth.me()
      .then(profile => setCurrentUser(normalizeUser(profile)))
      .catch(() => clearToken())
      .finally(() => setLoading(false))
  }, [])

  // ---- Login --------------------------------------------------------
  const login = async (email, password) => {
    try {
      const data = await api.auth.login(email, password)
      if (!data.access_token) return { error: 'Login failed. No token returned.' }
      setToken(data.access_token)
      const profile = await api.auth.me()
      setCurrentUser(normalizeUser(profile))
      return {}
    } catch (err) {
      return { error: err.message || 'Invalid email or password.' }
    }
  }

  // ---- Register -----------------------------------------------------
  // Accepts either (name, email, password) or a single object with those fields
  const register = async (nameOrObj, emailArg, passwordArg) => {
    const isObj    = typeof nameOrObj === 'object' && nameOrObj !== null
    const name     = isObj ? nameOrObj.name     : nameOrObj
    const email    = isObj ? nameOrObj.email    : emailArg
    const password = isObj ? nameOrObj.password : passwordArg
    const role     = isObj ? (nameOrObj.role || 'operator') : 'operator'
    const extras   = isObj ? nameOrObj : {}
    try {
      await api.auth.register({ name, email, password, role, ...extras })
      return {}
    } catch (err) {
      return { error: err.message || 'Registration failed.' }
    }
  }

  // ---- Logout -------------------------------------------------------
  const logout = () => {
    clearToken()
    setCurrentUser(null)
  }

  return (
    <AuthContext.Provider value={{ currentUser, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
