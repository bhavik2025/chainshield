/**
 * firebase.js -- stub (JWT-only mode)
 * Firebase integration is disabled. App uses JWT auth exclusively.
 * All exports are no-ops so existing imports compile without errors.
 */

export const FIREBASE_ENABLED = false
export const auth = null
export const db   = null

export const firebaseSignIn        = async () => { throw new Error('Firebase not configured') }
export const firebaseRegister      = async () => { throw new Error('Firebase not configured') }
export const firebaseSignOut       = async () => {}
export const onAuthChange          = (cb)  => { setTimeout(() => cb(null), 0); return () => {} }
export const getIdToken            = async () => null
export const updateFirebaseProfile = async () => {}
export const subscribeDisruptions  = ()    => () => {}
export const subscribeShipments    = ()    => () => {}
export const writeDisruption       = async () => {}
