'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

/** Brand fallback shown whenever an image is missing, empty or 404s. */
export const PLACEHOLDER_SRC = '/assets/placeholder.png'

interface SafeImageProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null
  alt?: string
  /** Extra classes applied only while showing the fallback (e.g. extra padding). */
  fallbackClassName?: string
}

/**
 * Drop-in replacement for <img>.
 * If `src` is missing/empty, or the request 404s, the Yala Haji brand mark is
 * rendered instead — so the UI never shows a broken-image icon.
 */
export function SafeImage({
  src,
  alt = '',
  className,
  fallbackClassName,
  ...rest
}: SafeImageProps) {
  const isMissing = !src || src.trim() === ''
  const [errored, setErrored] = useState(isMissing)

  // Reset error state if the src prop changes to a new value
  useEffect(() => {
    setErrored(!src || src.trim() === '')
  }, [src])

  const showFallback = errored || isMissing

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...rest}
      src={showFallback ? PLACEHOLDER_SRC : (src as string)}
      alt={alt}
      onError={() => setErrored(true)}
      className={cn(
        className,
        showFallback && 'object-contain opacity-70',
        showFallback && fallbackClassName
      )}
    />
  )
}
