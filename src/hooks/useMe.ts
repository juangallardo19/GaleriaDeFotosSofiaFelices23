'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

export interface Me {
  id: string
  role: 'guest' | 'admin' | 'visitor'
  name: string | null
}

let cached: Promise<Me> | null = null

export function loadMe(force = false): Promise<Me> {
  if (!cached || force) {
    cached = api<Me>('/api/me').catch((err) => {
      cached = null
      throw err
    })
  }
  return cached
}

export function useMe() {
  const [me, setMe] = useState<Me | null>(null)
  useEffect(() => {
    let alive = true
    loadMe()
      .then((m) => alive && setMe(m))
      .catch(() => alive && setMe({ id: 'visitante', role: 'visitor', name: null }))
    return () => {
      alive = false
    }
  }, [])
  return me
}
