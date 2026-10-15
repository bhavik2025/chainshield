import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { useAuth } from './AuthContext'
import { api } from '../utils/api'

const AppContext = createContext(null)

// Stable ID generator for toasts (no backend needed)
let _toastSeq = 0
const toastId = () => `TOAST-${++_toastSeq}`

export function AppProvider({ children }) {
  const { currentUser } = useAuth()

  // ── Core data state ───────────────────────────────────────
  const [shipments,     setShipments]     = useState([])
  const [disruptions,   setDisruptions]   = useState([])
  const [notifications, setNotifications] = useState([])
  const [users,         setUsers]         = useState([])
  const [operators,     setOperators]     = useState([])
  const [baseCities,    setBaseCities]    = useState([])
  const [cargoTypes,    setCargoTypes]    = useState([])
  const [activityLog,   setActivityLog]   = useState([])
  const [dataLoading,   setDataLoading]   = useState(false)

  // ── UI state ──────────────────────────────────────────────
  const [selectedShipment, setSelectedShipment] = useState(null)
  const [alertModal,       setAlertModal]        = useState(null)
  const [toasts,           setToasts]            = useState([])
  const [modeFilter,       setModeFilter]        = useState('all')
  const [statusFilter,     setStatusFilter]      = useState('all')

  // ── Toast helpers ─────────────────────────────────────────
  const addToast = useCallback((toast) => {
    const id = toastId()
    setToasts(prev => [...prev, { ...toast, id }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 8000)
  }, [])

  const removeToast = useCallback(id =>
    setToasts(prev => prev.filter(t => t.id !== id)), [])

  // ── Full refresh from backend ─────────────────────────────
  const refresh = useCallback(async () => {
    if (!currentUser) return
    setDataLoading(true)
    try {
      // Everyone gets shipments, disruptions, own notifications
      const [ships, disrs, notifs] = await Promise.all([
        api.shipments.list().catch(() => []),
        api.disruptions.list().catch(() => []),
        api.notifications.mine().catch(() => []),
      ])
      setShipments(ships)
      setDisruptions(disrs)
      setNotifications(notifs)

      // Managers & admins: operators list + base cities + cargo types (all needed for New Transport)
      if (currentUser.role === 'manager' || currentUser.role === 'admin') {
        const [ops, cities, cargo] = await Promise.all([
          api.admin.operators().catch(() => []),
          api.admin.baseCities().catch(() => []),
          api.admin.cargoTypes().then(list => list.map(ct => ct.name || ct)).catch(() => []),
        ])
        setOperators(ops)
        setBaseCities(cities)
        setCargoTypes(cargo)
      }

      // Admin-only: full user list and activity log
      if (currentUser.role === 'admin') {
        const [allUsers, log] = await Promise.all([
          api.admin.users().catch(() => []),
          api.admin.activityLog().catch(() => []),
        ])
        setUsers(allUsers)
        setActivityLog(log)
      }
    } catch (err) {
      console.error('AppContext refresh error:', err)
    } finally {
      setDataLoading(false)
    }
  }, [currentUser])

  // Refresh whenever the logged-in user changes
  useEffect(() => {
    if (currentUser) {
      refresh()
    } else {
      // Logged out — clear everything
      setShipments([])
      setDisruptions([])
      setNotifications([])
      setUsers([])
      setOperators([])
      setBaseCities([])
      setCargoTypes([])
      setActivityLog([])
    }
  }, [currentUser, refresh])

  // ── Auto-refresh every 30 s (keep data live) ─────────────
  const timerRef = useRef(null)
  useEffect(() => {
    if (!currentUser) return
    timerRef.current = setInterval(refresh, 30_000)
    return () => clearInterval(timerRef.current)
  }, [currentUser, refresh])

  // ── Shipment actions ──────────────────────────────────────
  const createShipment = useCallback(async (data) => {
    try {
      const ship = await api.shipments.create(data)
      await refresh()
      addToast({ type: 'success', title: 'Transport Created', message: `${ship.name} has been initiated successfully.` })
      return ship
    } catch (err) {
      addToast({ type: 'danger', title: 'Create Failed', message: err.message })
      throw err
    }
  }, [refresh, addToast])

  const selectShipment = useCallback(ship => setSelectedShipment(ship), [])

  // ── Alert modal ───────────────────────────────────────────
  const openAlertModal  = useCallback(d  => setAlertModal(d),   [])
  const closeAlertModal = useCallback(() => setAlertModal(null), [])

  // ── Operator: update shipment status ─────────────────────────
  const updateShipmentStatus = useCallback(async (shipId, status, note = '') => {
    try {
      await api.shipments.updateStatus(shipId, status, note)
      await refresh()
      const labels = { on_time: 'On Time', at_risk: 'At Risk', delayed: 'Delayed', delivered: 'Delivered' }
      if (status === 'delivered') {
        addToast({ type: 'success', title: '🎉 Delivery Confirmed!', message: 'Shipment marked as Delivered. Manager has been notified.' })
      } else {
        addToast({ type: 'info', title: 'Status Updated', message: `Shipment status changed to ${labels[status] || status}.` })
      }
    } catch (err) {
      addToast({ type: 'danger', title: 'Update Failed', message: err.message })
      throw err
    }
  }, [refresh, addToast])

  // ── Resolve disruption ────────────────────────────────────
  const resolveSolution = useCallback(async (disruptionId, solutionId) => {
    try {
      await api.disruptions.resolve(disruptionId, solutionId)
      await refresh()
      closeAlertModal()
      addToast({ type: 'success', title: 'Solution Applied', message: 'Field operators have been notified via in-app notification.' })
    } catch (err) {
      addToast({ type: 'danger', title: 'Failed to Resolve', message: err.message })
    }
  }, [refresh, closeAlertModal, addToast])

  // ── Demo disruption ───────────────────────────────────────
  const triggerDemo = useCallback(async () => {
    try {
      const res = await api.disruptions.triggerDemo()
      await refresh()
      setAlertModal(res.disruption)
      addToast({ type: 'danger', title: 'New Disruption Detected!', message: 'Port Strike at Rotterdam — demo shipment affected.', disruptionId: res.disruption?.id })
    } catch (err) {
      // 409 = already active
      if (err.message.includes('already active') || err.message.includes('409')) {
        addToast({ type: 'info', title: 'Demo Already Active', message: 'A demo disruption is already running.' })
      } else if (err.message.includes('No on-time')) {
        addToast({ type: 'info', title: 'No available shipment', message: 'All shipments already have disruptions.' })
      } else {
        addToast({ type: 'danger', title: 'Demo Failed', message: err.message })
      }
    }
  }, [refresh, addToast])

  // ── Notifications ─────────────────────────────────────────
  const readNotification = useCallback(async (id) => {
    await api.notifications.markRead(id).catch(() => {})
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }, [])

  const getMyNotifications = useCallback((userId) =>
    notifications.filter(n => n.userId === userId || n.user_id === userId),
  [notifications])

  // ── Admin: User management ────────────────────────────────
  const toggleUserActive = useCallback(async (userId, active) => {
    const target = users.find(u => u.id === userId)
    try {
      await api.admin.updateUser(userId, { active })
      await refresh()
      addToast({
        type: active ? 'success' : 'info',
        title: `User ${active ? 'Activated' : 'Deactivated'}`,
        message: `${target?.name || userId}'s account has been ${active ? 'activated' : 'deactivated'}.`,
      })
    } catch (err) {
      addToast({ type: 'danger', title: 'Update Failed', message: err.message })
    }
  }, [users, refresh, addToast])

  const removeUser = useCallback(async (userId) => {
    const target = users.find(u => u.id === userId)
    await api.admin.deleteUser(userId)   // throws on error — caller handles it
    await refresh()
    addToast({ type: 'success', title: 'User Deleted', message: `${target?.name || userId}'s account has been permanently removed.` })
  }, [users, refresh, addToast])

  // ── Admin: Change user role (promote/demote admin) ───────
  const setUserRole = useCallback(async (userId, role) => {
    const target = users.find(u => u.id === userId)
    try {
      await api.admin.updateUser(userId, { role })
      await refresh()
      const label = role === 'admin' ? 'promoted to Admin' : `set to ${role}`
      addToast({ type: 'success', title: 'Role Updated', message: `${target?.name || userId} has been ${label}.` })
    } catch (err) {
      addToast({ type: 'danger', title: 'Role Update Failed', message: err.message })
    }
  }, [users, refresh, addToast])

  // ── Admin: Base city (hub) management ────────────────────
  const addHub = useCallback(async (city) => {
    try {
      await api.admin.addBaseCity(city)
      await refresh()
      addToast({ type: 'success', title: 'Hub Added', message: `${city.city} is now an active logistics hub.` })
    } catch (err) {
      if (err.message.includes('already')) {
        addToast({ type: 'info', title: 'Already Added', message: err.message })
      } else {
        addToast({ type: 'danger', title: 'Add Failed', message: err.message })
      }
    }
  }, [refresh, addToast])

  const removeHub = useCallback(async (cityName) => {
    try {
      await api.admin.removeBaseCity(cityName)
      await refresh()
      addToast({ type: 'info', title: 'Hub Removed', message: `${cityName} has been removed from active hubs.` })
    } catch (err) {
      addToast({ type: 'danger', title: 'Remove Failed', message: err.message })
    }
  }, [refresh, addToast])

  // ── Admin: Cargo type management ──────────────────────────
  const addCargo = useCallback(async (type) => {
    try {
      await api.admin.addCargoType(type)
      await refresh()
    } catch (err) {
      addToast({ type: 'info', title: 'Cargo Type Error', message: err.message })
    }
  }, [refresh, addToast])

  const removeCargo = useCallback(async (type) => {
    try {
      await api.admin.removeCargoType(type)
      await refresh()
    } catch (err) {
      addToast({ type: 'danger', title: 'Remove Failed', message: err.message })
    }
  }, [refresh, addToast])

  // ── Filtered shipments ────────────────────────────────────
  const filteredShipments = shipments.filter(s => {
    if (modeFilter   !== 'all' && s.mode   !== modeFilter)   return false
    if (statusFilter !== 'all' && s.status !== statusFilter) return false
    return true
  })

  return (
    <AppContext.Provider value={{
      // Core data
      shipments, filteredShipments, disruptions, notifications,
      operators, users,
      baseCities, cargoTypes, activityLog,
      dataLoading,
      // Map / shipment selection
      selectedShipment, selectShipment,
      // Alert modal
      alertModal, openAlertModal, closeAlertModal,
      // Toasts
      toasts, addToast, removeToast,
      // Actions
      createShipment, resolveSolution, triggerDemo, refresh, updateShipmentStatus,
      // Filters
      modeFilter, setModeFilter, statusFilter, setStatusFilter,
      // Notifications
      readNotification, getMyNotifications,
      // Admin — user management
      toggleUserActive, removeUser, setUserRole,
      // Admin — hub & cargo management
      addHub, removeHub, addCargo, removeCargo,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
