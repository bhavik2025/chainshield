import { useState, useEffect } from 'react'

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  )
  useEffect(() => {
    const mql = window.matchMedia(query)
    const handler = e => setMatches(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [query])
  return matches
}

// Convenience hooks
export const useMobile  = () => useMediaQuery('(max-width: 639px)')
export const useTablet  = () => useMediaQuery('(max-width: 1023px)')
export const useDesktop = () => useMediaQuery('(min-width: 1024px)')
