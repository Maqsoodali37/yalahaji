'use client'

import { cn } from '@/lib/utils'
import { SafeImage } from './safe-image'

interface ProductImageProps {
  src?: string
  alt?: string
  className?: string
  sizes?: string
  /**
   * @deprecated Emoji fallbacks are no longer used — the Yala Haji brand mark
   * is shown automatically. Accepted for backwards compatibility only.
   */
  fallback?: string
}

/**
 * Product imagery wrapper. Falls back to the Yala Haji brand mark
 * whenever the source is missing or fails to load.
 */
export function ProductImage({
  src,
  alt = 'Product image',
  className,
}: ProductImageProps) {
  return (
    <SafeImage
      src={src}
      alt={alt}
      loading="lazy"
      className={cn('w-full h-full object-cover bg-paper', className)}
      fallbackClassName="p-6"
    />
  )
}
