// ─────────────────────────────────────────────────────────────────
//  ChainShield — localStorage persistence layer
//  Acts as the "database" for the frontend-only prototype.
//  In production this would be replaced by REST API calls.
// ─────────────────────────────────────────────────────────────────

// Bump this number any time the seed data schema changes.
// A version mismatch wipes old localStorage and re-seeds cleanly.
const SCHEMA_VERSION = 3

export const KEYS = {
  USERS:         'cs_users',
  CURRENT_USER:  'cs_current_user',
  SHIPMENTS:     'cs_shipments',
  DISRUPTIONS:   'cs_disruptions',
  NOTIFICATIONS: 'cs_notifications',
  BASE_CITIES:   'cs_base_cities',
  CARGO_TYPES:   'cs_cargo_types',
  ACTIVITY_LOG:  'cs_activity_log',
  INITIALIZED:   'cs_initialized',
  SCHEMA_VER:    'cs_schema_ver',
}

// ── Generic helpers ────────────────────────────────────────────
export const getItem    = key => { try { return JSON.parse(localStorage.getItem(key)) } catch { return null } }
export const setItem    = (key, val) => localStorage.setItem(key, JSON.stringify(val))
export const removeItem = key => localStorage.removeItem(key)

// ── ID generator ───────────────────────────────────────────────
export const genId = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`

// ── Users ──────────────────────────────────────────────────────
export const getUsers        = ()   => getItem(KEYS.USERS) || []
export const saveUsers       = list => setItem(KEYS.USERS, list)
export const findUserByEmail = email => getUsers().find(u => u.email.toLowerCase() === email.toLowerCase())

export const registerUser = (data) => {
  const users = getUsers()
  if (findUserByEmail(data.email)) return { error: 'An account with this email already exists.' }
  const newUser = {
    ...data,
    id: genId('USR'),
    createdAt: new Date().toISOString(),
    shipmentId: null,
    active: true,
  }
  saveUsers([...users, newUser])
  return { user: newUser }
}

export const loginUser = (email, password) => {
  const user = findUserByEmail(email)
  if (!user)                   return { error: 'No account found with this email.' }
  if (user.password !== password) return { error: 'Incorrect password.' }
  if (user.active === false)   return { error: 'This account has been deactivated. Contact your admin.' }
  setItem(KEYS.CURRENT_USER, user)
  return { user }
}

export const getCurrentUser = () => getItem(KEYS.CURRENT_USER)
export const logoutUser     = () => removeItem(KEYS.CURRENT_USER)

export const updateUser = (id, updates) => {
  const users = getUsers().map(u => u.id === id ? { ...u, ...updates } : u)
  saveUsers(users)
  const current = getCurrentUser()
  if (current?.id === id) setItem(KEYS.CURRENT_USER, { ...current, ...updates })
}

export const setUserActive = (id, active) => updateUser(id, { active })
export const deleteUser    = id => saveUsers(getUsers().filter(u => u.id !== id))

// ── Shipments ──────────────────────────────────────────────────
export const getShipments  = ()   => getItem(KEYS.SHIPMENTS) || []
export const saveShipments = list => setItem(KEYS.SHIPMENTS, list)

export const addShipment = shipment => {
  saveShipments([...getShipments(), shipment])
}

export const updateShipment = (id, updates) => {
  saveShipments(getShipments().map(s => s.id === id ? { ...s, ...updates } : s))
}

// ── Disruptions ────────────────────────────────────────────────
export const getDisruptions  = ()   => getItem(KEYS.DISRUPTIONS) || []
export const saveDisruptions = list => setItem(KEYS.DISRUPTIONS, list)

export const addDisruption = d => {
  saveDisruptions([...getDisruptions(), d])
}

export const removeDisruption = id => {
  saveDisruptions(getDisruptions().filter(d => d.id !== id))
}

// ── Notifications ──────────────────────────────────────────────
export const getNotifications  = ()   => getItem(KEYS.NOTIFICATIONS) || []
export const saveNotifications = list => setItem(KEYS.NOTIFICATIONS, list)

export const addNotification = notif => {
  saveNotifications([notif, ...getNotifications()])
}

export const markNotifRead = id => {
  saveNotifications(getNotifications().map(n => n.id === id ? { ...n, read: true } : n))
}

export const getUserNotifications = userId =>
  getNotifications().filter(n => n.userId === userId)

// ── Base Cities (Admin-managed logistics hubs) ─────────────────
export const getBaseCities  = ()   => getItem(KEYS.BASE_CITIES) || []
export const saveBaseCities = list => setItem(KEYS.BASE_CITIES, list)

export const addBaseCity = (city) => {
  const existing = getBaseCities()
  if (existing.find(c => c.city === city.city)) return { error: 'City already added.' }
  saveBaseCities([...existing, { ...city, addedAt: new Date().toISOString() }])
  return { ok: true }
}

export const removeBaseCity = cityName => {
  saveBaseCities(getBaseCities().filter(c => c.city !== cityName))
}

// ── Cargo Types (Admin-managed) ────────────────────────────────
export const getCargoTypes  = ()   => getItem(KEYS.CARGO_TYPES) || []
export const saveCargoTypes = list => setItem(KEYS.CARGO_TYPES, list)

export const addCargoType    = type => { if (!getCargoTypes().includes(type)) saveCargoTypes([...getCargoTypes(), type]) }
export const removeCargoType = type => saveCargoTypes(getCargoTypes().filter(t => t !== type))

// ── Activity Log (Audit Trail) ─────────────────────────────────
export const getActivityLog  = ()   => getItem(KEYS.ACTIVITY_LOG) || []
export const saveActivityLog = list => setItem(KEYS.ACTIVITY_LOG, list)

export const logActivity = ({ userId, userName, role, action, entity, entityId, details }) => {
  const entry = {
    id: genId('LOG'),
    userId, userName, role,
    action,       // e.g. 'CREATE_SHIPMENT', 'RESOLVE_DISRUPTION', 'LOGIN', 'REGISTER'
    entity,       // e.g. 'Shipment', 'User', 'Disruption'
    entityId,     // the ID of the affected record
    details,      // human-readable description
    timestamp: new Date().toISOString(),
  }
  // Keep latest 500 entries
  const log = [entry, ...getActivityLog()].slice(0, 500)
  saveActivityLog(log)
}

// ── Seed initial data ─────────────────────────────────────────
// Runs on first load OR when SCHEMA_VERSION changes.
// A version bump wipes all app data and re-seeds cleanly.
export const seedInitialData = () => {
  const storedVer = getItem(KEYS.SCHEMA_VER)
  if (getItem(KEYS.INITIALIZED) && storedVer === SCHEMA_VERSION) return

  // Wipe all app data (but preserve nothing — fresh start)
  Object.values(KEYS).forEach(k => removeItem(k))

  // ── Seed demo users ──
  const demoUsers = [
    {
      id: 'USR-ADMIN-001', name: 'System Administrator', email: 'admin@chainshield.com',
      password: 'demo1234', role: 'admin', operatorType: null,
      phone: '+1-800-555-0001', company: 'ChainShield Inc.',
      createdAt: new Date().toISOString(), shipmentId: null, active: true,
    },
    {
      id: 'USR-DEMO-001', name: 'Logistics Manager', email: 'manager@chainshield.com',
      password: 'demo1234', role: 'manager', operatorType: null,
      phone: '+1-800-555-0100', company: 'ChainShield Demo Co.',
      createdAt: new Date().toISOString(), shipmentId: null, active: true,
    },
    {
      id: 'USR-DEMO-002', name: 'Capt. Raj Kumar', email: 'captain@chainshield.com',
      password: 'demo1234', role: 'operator', operatorType: 'Captain',
      phone: '+91-98765-43210', company: 'Pacific Cargo Lines',
      createdAt: new Date().toISOString(), shipmentId: 'SHP-SEED-001', active: true,
    },
    {
      id: 'USR-DEMO-003', name: 'Pilot James Wilson', email: 'pilot@chainshield.com',
      password: 'demo1234', role: 'operator', operatorType: 'Pilot',
      phone: '+1-312-555-0182', company: 'SkyFreight Global',
      createdAt: new Date().toISOString(), shipmentId: 'SHP-SEED-002', active: true,
    },
    {
      id: 'USR-DEMO-004', name: 'Driver Carlos Ruiz', email: 'driver@chainshield.com',
      password: 'demo1234', role: 'operator', operatorType: 'Driver',
      phone: '+52-55-5555-1234', company: 'TransAm Logistics',
      createdAt: new Date().toISOString(), shipmentId: 'SHP-SEED-003', active: true,
    },
    {
      id: 'USR-DEMO-005', name: 'Loco Pilot Arjun P.', email: 'loco@chainshield.com',
      password: 'demo1234', role: 'operator', operatorType: 'Loco Pilot',
      phone: '+91-87654-32109', company: 'Rail Cargo International',
      createdAt: new Date().toISOString(), shipmentId: 'SHP-SEED-004', active: true,
    },
  ]
  saveUsers(demoUsers)

  // ── Seed demo shipments ──
  const demoShipments = [
    {
      id: 'SHP-SEED-001', name: 'Electronics Batch A', cargo: 'Consumer Electronics',
      mode: 'sea', status: 'disrupted',
      origin:      { city: 'Shanghai',    country: 'China', lat: 31.2304, lng: 121.4737 },
      destination: { city: 'Los Angeles', country: 'USA',   lat: 34.0522, lng: -118.2437 },
      waypoints:   [{ lat: 31.2304, lng: 121.4737 }, { lat: 51.5, lng: 179.0 }, { lat: 34.0522, lng: -118.2437 }],
      currentPos:  { lat: 51.5, lng: 179.0 },
      progress: 52, eta: '2026-05-02', carrier: 'Pacific Cargo Lines',
      operatorId: 'USR-DEMO-002', weight: '240 tons', value: 4500000,
      disruptionId: 'DIS-SEED-001', createdBy: 'USR-DEMO-001', createdAt: new Date().toISOString(),
      departureDate: '2026-04-20', description: 'Consumer electronics for retail distribution.',
    },
    {
      id: 'SHP-SEED-002', name: 'Luxury Goods Air', cargo: 'Luxury Goods',
      mode: 'air', status: 'on_time',
      origin:      { city: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522 },
      destination: { city: 'Dubai', country: 'UAE',    lat: 25.2048, lng: 55.2708 },
      waypoints:   [{ lat: 48.8566, lng: 2.3522 }, { lat: 41.0082, lng: 28.9784 }, { lat: 25.2048, lng: 55.2708 }],
      currentPos:  { lat: 41.0082, lng: 28.9784 },
      progress: 58, eta: '2026-04-27', carrier: 'SkyFreight Global',
      operatorId: 'USR-DEMO-003', weight: '3 tons', value: 6200000,
      disruptionId: null, createdBy: 'USR-DEMO-001', createdAt: new Date().toISOString(),
      departureDate: '2026-04-27', description: 'High-value fashion and accessories.',
    },
    {
      id: 'SHP-SEED-003', name: 'Auto Parts Express', cargo: 'Automotive Components',
      mode: 'road', status: 'on_time',
      origin:      { city: 'Detroit',     country: 'USA',    lat: 42.3314, lng: -83.0458 },
      destination: { city: 'Mexico City', country: 'Mexico', lat: 19.4326, lng: -99.1332 },
      waypoints:   [{ lat: 42.3314, lng: -83.0458 }, { lat: 30.2672, lng: -97.7431 }, { lat: 19.4326, lng: -99.1332 }],
      currentPos:  { lat: 30.2672, lng: -97.7431 },
      progress: 71, eta: '2026-04-28', carrier: 'TransAm Logistics',
      operatorId: 'USR-DEMO-004', weight: '55 tons', value: 870000,
      disruptionId: null, createdBy: 'USR-DEMO-001', createdAt: new Date().toISOString(),
      departureDate: '2026-04-26', description: 'Critical auto parts for assembly plant.',
    },
    {
      id: 'SHP-SEED-004', name: 'Textile Rail Freight', cargo: 'Textiles',
      mode: 'rail', status: 'at_risk',
      origin:      { city: 'Delhi',    country: 'India',  lat: 28.6139, lng: 77.2090 },
      destination: { city: 'Istanbul', country: 'Turkey', lat: 41.0082, lng: 28.9784 },
      waypoints:   [{ lat: 28.6139, lng: 77.2090 }, { lat: 35.7, lng: 51.4 }, { lat: 41.0082, lng: 28.9784 }],
      currentPos:  { lat: 35.7, lng: 51.4 },
      progress: 44, eta: '2026-05-03', carrier: 'Rail Cargo International',
      operatorId: 'USR-DEMO-005', weight: '380 tons', value: 1800000,
      disruptionId: 'DIS-SEED-002', createdBy: 'USR-DEMO-001', createdAt: new Date().toISOString(),
      departureDate: '2026-04-24', description: 'Bulk textile shipment for European market.',
    },
  ]
  saveShipments(demoShipments)

  // ── Seed demo disruptions ──
  const demoDisruptions = [
    {
      id: 'DIS-SEED-001', type: 'weather',
      title: 'Severe Storm — North Pacific',
      description: 'A typhoon-class storm system detected along SHP-SEED-001 route near 51°N, 179°E. Sustained wind speeds of 95 knots and wave heights exceeding 10 metres. Storm expected to persist 48–72 hours.',
      severity: 'critical', affectedShipments: ['SHP-SEED-001'],
      location: { lat: 51.5, lng: 179.0 },
      detectedAt: new Date(Date.now() - 3600000).toISOString(),
      estimatedDelayHours: 72,
      solutions: [
        { id: 'SOL-S1-A', title: 'Southern Pacific Route via Hawaii', description: 'Divert south through Hawaiian waters, completely bypassing the storm corridor.', pros: ['Avoids storm entirely', 'Maintains cargo integrity', 'Insurer-preferred'], cons: ['Adds 840 km', '+18 hours transit'], extraTimeHours: 18, extraCostUSD: 14200, riskScore: 12, recommended: true },
        { id: 'SOL-S1-B', title: 'Hold Position — 48h Wait', description: 'Heave to east of storm, wait for system to pass before resuming.', pros: ['No extra fuel cost', 'Route preserved'], cons: ['48-hour delay', 'SLA breach risk'], extraTimeHours: 48, extraCostUSD: 5800, riskScore: 34, recommended: false },
      ],
    },
    {
      id: 'DIS-SEED-002', type: 'congestion',
      title: 'Rail Congestion — Tehran Junction',
      description: 'Heavy freight backlog at Tehran rail junction affecting SHP-SEED-004. Average wait time is 28 hours due to infrastructure maintenance works.',
      severity: 'high', affectedShipments: ['SHP-SEED-004'],
      location: { lat: 35.7, lng: 51.4 },
      detectedAt: new Date(Date.now() - 7200000).toISOString(),
      estimatedDelayHours: 28,
      solutions: [
        { id: 'SOL-S2-A', title: 'Road Freight for Final Leg', description: 'Transfer cargo to road transport from Tehran, bypassing the rail bottleneck.', pros: ['Avoids queue entirely', 'Predictable ETA'], cons: ['+$12k transfer cost', 'Handling required'], extraTimeHours: 6, extraCostUSD: 12000, riskScore: 18, recommended: true },
        { id: 'SOL-S2-B', title: 'Wait in Queue', description: 'Hold train in queue and wait for maintenance window to clear.', pros: ['No extra cost'], cons: ['28h+ delay', 'Uncertain timing'], extraTimeHours: 28, extraCostUSD: 1500, riskScore: 45, recommended: false },
      ],
    },
  ]
  saveDisruptions(demoDisruptions)
  saveNotifications([])

  // ── Seed base cities (active logistics hubs) ──
  const seedBaseCities = [
    { city: 'Shanghai',     country: 'China',       lat: 31.2304,  lng: 121.4737, addedAt: new Date().toISOString() },
    { city: 'Singapore',    country: 'Singapore',   lat: 1.3521,   lng: 103.8198, addedAt: new Date().toISOString() },
    { city: 'Rotterdam',    country: 'Netherlands', lat: 51.9244,  lng: 4.4777,   addedAt: new Date().toISOString() },
    { city: 'Los Angeles',  country: 'USA',         lat: 34.0522,  lng: -118.2437,addedAt: new Date().toISOString() },
    { city: 'Dubai',        country: 'UAE',         lat: 25.2048,  lng: 55.2708,  addedAt: new Date().toISOString() },
    { city: 'Mumbai',       country: 'India',       lat: 19.0760,  lng: 72.8777,  addedAt: new Date().toISOString() },
    { city: 'Frankfurt',    country: 'Germany',     lat: 50.1109,  lng: 8.6821,   addedAt: new Date().toISOString() },
    { city: 'Tokyo',        country: 'Japan',       lat: 35.6762,  lng: 139.6503, addedAt: new Date().toISOString() },
    { city: 'New York',     country: 'USA',         lat: 40.7128,  lng: -74.0060, addedAt: new Date().toISOString() },
    { city: 'Hamburg',      country: 'Germany',     lat: 53.5511,  lng: 9.9937,   addedAt: new Date().toISOString() },
    { city: 'Hong Kong',    country: 'China',       lat: 22.3193,  lng: 114.1694, addedAt: new Date().toISOString() },
    { city: 'London',       country: 'UK',          lat: 51.5074,  lng: -0.1278,  addedAt: new Date().toISOString() },
    { city: 'Paris',        country: 'France',      lat: 48.8566,  lng: 2.3522,   addedAt: new Date().toISOString() },
    { city: 'Delhi',        country: 'India',       lat: 28.6139,  lng: 77.2090,  addedAt: new Date().toISOString() },
    { city: 'Detroit',      country: 'USA',         lat: 42.3314,  lng: -83.0458, addedAt: new Date().toISOString() },
    { city: 'Istanbul',     country: 'Turkey',      lat: 41.0082,  lng: 28.9784,  addedAt: new Date().toISOString() },
  ]
  saveBaseCities(seedBaseCities)

  // ── Seed cargo types ──
  saveCargoTypes([
    'Consumer Electronics','Pharmaceuticals','Automotive Components','Textiles',
    'Agriculture / Food','Luxury Goods','Medical Devices','Machinery / Industrial',
    'Chemicals','Oil & Gas','Construction Materials','Apparel / Fashion',
    'Furniture','Plastics','Paper / Pulp','Raw Materials','Refrigerated Goods',
    'Hazardous Materials','E-Commerce Parcels','Other',
  ])

  // ── Seed activity log ──
  saveActivityLog([
    { id: 'LOG-SEED-001', userId: 'USR-DEMO-001', userName: 'Logistics Manager', role: 'manager', action: 'CREATE_SHIPMENT', entity: 'Shipment', entityId: 'SHP-SEED-001', details: 'Created shipment "Electronics Batch A" (Sea · Shanghai → Los Angeles)', timestamp: new Date(Date.now() - 86400000 * 2).toISOString() },
    { id: 'LOG-SEED-002', userId: 'USR-DEMO-001', userName: 'Logistics Manager', role: 'manager', action: 'CREATE_SHIPMENT', entity: 'Shipment', entityId: 'SHP-SEED-002', details: 'Created shipment "Luxury Goods Air" (Air · Paris → Dubai)', timestamp: new Date(Date.now() - 86400000 * 2 + 3600000).toISOString() },
    { id: 'LOG-SEED-003', userId: 'USR-DEMO-001', userName: 'Logistics Manager', role: 'manager', action: 'CREATE_SHIPMENT', entity: 'Shipment', entityId: 'SHP-SEED-003', details: 'Created shipment "Auto Parts Express" (Road · Detroit → Mexico City)', timestamp: new Date(Date.now() - 86400000).toISOString() },
    { id: 'LOG-SEED-004', userId: 'USR-DEMO-001', userName: 'Logistics Manager', role: 'manager', action: 'CREATE_SHIPMENT', entity: 'Shipment', entityId: 'SHP-SEED-004', details: 'Created shipment "Textile Rail Freight" (Rail · Delhi → Istanbul)', timestamp: new Date(Date.now() - 86400000 + 3600000).toISOString() },
    { id: 'LOG-SEED-005', userId: 'SYS', userName: 'System', role: 'system', action: 'DISRUPTION_DETECTED', entity: 'Disruption', entityId: 'DIS-SEED-001', details: 'Disruption detected: Severe Storm — North Pacific (Critical severity)', timestamp: new Date(Date.now() - 3600000).toISOString() },
    { id: 'LOG-SEED-006', userId: 'SYS', userName: 'System', role: 'system', action: 'DISRUPTION_DETECTED', entity: 'Disruption', entityId: 'DIS-SEED-002', details: 'Disruption detected: Rail Congestion — Tehran Junction (High severity)', timestamp: new Date(Date.now() - 7200000).toISOString() },
  ])

  setItem(KEYS.INITIALIZED, true)
  setItem(KEYS.SCHEMA_VER, SCHEMA_VERSION)
}
