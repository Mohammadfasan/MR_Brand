import { useSyncExternalStore } from 'react'

/**
 * Tiny shared cart (no library). Any component can add items; the Navbar
 * bag badge re-renders automatically. Swap this for a real cart/API later.
 */
let items = []
const listeners = new Set()
const emit = () => listeners.forEach((l) => l())

export const cart = {
  add(item) {
    items = [...items, { ...item, addedAt: Date.now() }]
    emit()
  },
  getItems: () => items,
  getCount: () => items.length,
  subscribe(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}

export function useCartCount() {
  return useSyncExternalStore(cart.subscribe, cart.getCount, cart.getCount)
}