import { useEffect, useRef } from 'react'

const quietPeriod = 350
const maxWait = 1500

export function useAutosaveDeadline() {
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const frame = useRef<number>(undefined)
  const dirtyAt = useRef<number>(undefined)

  function cancel() {
    clearTimeout(timer.current)
    if (frame.current !== undefined) cancelAnimationFrame(frame.current)
  }

  useEffect(() => cancel, [])

  function schedule(flush: () => void) {
    cancel()
    const now = performance.now()
    dirtyAt.current ??= now
    const delay = Math.min(quietPeriod, Math.max(0, maxWait - (now - dirtyAt.current)))
    timer.current = setTimeout(flush, delay)

    // Synlige faner kan få forsinkede tidsur etter inaktivitet.
    const due = now + delay
    function checkDeadline(timestamp: number) {
      if (timestamp >= due) flush()
      else frame.current = requestAnimationFrame(checkDeadline)
    }
    frame.current = requestAnimationFrame(checkDeadline)
  }

  return { cancel, schedule, reset: () => { dirtyAt.current = undefined } }
}
