import { useEffect, useRef } from 'react'
import { useMissionStore } from './store'

/**
 * Симуляция на requestAnimationFrame; корректная отмена всех кадров при размонтировании.
 */
export function useMissionLoop() {
  const overlayOpen = useMissionStore((s) => s.overlayOpen)
  const rafRef = useRef<number>(0)
  const lastT = useRef<number | null>(null)

  useEffect(() => {
    if (!overlayOpen) {
      lastT.current = null
      return
    }

    const tick = (t: number) => {
      if (lastT.current === null) lastT.current = t
      let dt = (t - lastT.current) / 1000
      lastT.current = t
      dt = Math.min(0.05, Math.max(0, dt))

      const st = useMissionStore.getState()
      if (st.sim.launched && !st.sim.connectionLost) {
        st.physicsTick(dt)
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(rafRef.current)
      lastT.current = null
    }
  }, [overlayOpen])
}
