'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Thin gold progress bar pinned to the top of the viewport.
 *
 * Next.js `loading.tsx` boundaries only render once the new route segment
 * starts streaming — that leaves a dead moment right after a click. This bar
 * fires immediately on link click so navigation always feels responsive, then
 * completes when the pathname actually changes.
 */
export function RouteProgress() {
  const pathname = usePathname()
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearTimers = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }

  // Start the bar as soon as an internal link is clicked
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      // Ignore modified clicks / non-primary buttons
      if (e.defaultPrevented || e.button !== 0) return
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return

      const anchor = (e.target as HTMLElement)?.closest?.('a')
      if (!anchor) return

      const href = anchor.getAttribute('href')
      const target = anchor.getAttribute('target')
      if (!href || href.startsWith('#')) return
      if (target && target !== '_self') return
      if (anchor.hasAttribute('download')) return

      // External links navigate away — no in-app bar needed
      try {
        const url = new URL(href, window.location.href)
        if (url.origin !== window.location.origin) return
        if (url.pathname === window.location.pathname) return
      } catch {
        return
      }

      clearTimers()
      setVisible(true)
      setProgress(12)
      // Creep forward so the bar never looks stalled
      timers.current.push(setTimeout(() => setProgress(38), 120))
      timers.current.push(setTimeout(() => setProgress(62), 350))
      timers.current.push(setTimeout(() => setProgress(80), 800))
      timers.current.push(setTimeout(() => setProgress(90), 1600))
    }

    document.addEventListener('click', onClick, { capture: true })
    return () => {
      document.removeEventListener('click', onClick, { capture: true })
      clearTimers()
    }
  }, [])

  // Complete the bar when the route has actually changed
  useEffect(() => {
    clearTimers()
    setProgress(100)
    const hide = setTimeout(() => {
      setVisible(false)
      setProgress(0)
    }, 260)
    timers.current.push(hide)
    return () => clearTimeout(hide)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 inset-x-0 z-[9999] h-[3px] pointer-events-none"
      style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 200ms ease',
      }}
    >
      <div
        className="h-full bg-gradient-to-r from-gold via-gold-bright to-gold shadow-[0_0_10px_rgba(217,164,65,.7)]"
        style={{
          width: `${progress}%`,
          transition: 'width 300ms cubic-bezier(.4,0,.2,1)',
        }}
      />
    </div>
  )
}
