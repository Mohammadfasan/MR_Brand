import { useEffect, useState } from 'react'

/**
 * Reports the current layout tier: 'mobile' | 'tablet' | 'desktop'.
 * Breakpoints match the Tailwind md / lg stops so the CSS layout and the
 * 3D scene configuration stay in agreement.
 */
const resolveTier = () => {
  if (typeof window === 'undefined') return 'desktop'
  const w = window.innerWidth
  if (w < 768) return 'mobile'
  if (w < 1024) return 'tablet'
  return 'desktop'
}

export default function useViewportTier() {
  const [tier, setTier] = useState(resolveTier)

  useEffect(() => {
    const handleResize = () => setTier(resolveTier())
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return tier
}
