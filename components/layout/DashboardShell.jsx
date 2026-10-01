'use client'

import { useSyncExternalStore } from 'react'
import Sidebar from '@/components/layout/Sidebar'

const COLLAPSED_KEY = 'aicliently:sidebar-collapsed'
const EXPANDED_WIDTH = 240
const COLLAPSED_WIDTH = 64

// Choix mémorisé dans le navigateur, avec une valeur en mémoire si le
// stockage est indisponible (navigation privée) pour que le bouton marche.
let memoryCollapsed = false
const listeners = new Set()

function readCollapsed() {
  try {
    const stored = localStorage.getItem(COLLAPSED_KEY)
    return stored === null ? memoryCollapsed : stored === '1'
  } catch {
    return memoryCollapsed
  }
}

function writeCollapsed(value) {
  memoryCollapsed = value
  try {
    localStorage.setItem(COLLAPSED_KEY, value ? '1' : '0')
  } catch {
    // On garde la valeur en mémoire.
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// Barre latérale repliable : le contenu prend toute la largeur libérée. Le
// rendu serveur est toujours "déplié" ; React applique le choix mémorisé
// sans erreur d'hydratation.
export default function DashboardShell({ children }) {
  const collapsed = useSyncExternalStore(subscribe, readCollapsed, () => false)
  const width = collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0a' }}>
      <Sidebar collapsed={collapsed} width={width} onToggle={() => writeCollapsed(!collapsed)} />
      <main style={{
        marginLeft: `${width}px`,
        flex: 1,
        width: `calc(100% - ${width}px)`,
        overflowX: 'hidden',
        transition: 'margin-left 0.2s ease, width 0.2s ease',
      }}>
        {children}
      </main>
    </div>
  )
}
