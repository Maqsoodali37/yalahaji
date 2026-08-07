'use client'

import * as React from 'react'
import { ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { api, uploadFile, ApiError } from '@/lib/api'

/** Mirrors the categories folder allowlisted in `apps/api/src/media/media.service.ts`. */
const ACCEPTED_MIME = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 10 * 1024 * 1024
const ACCEPT_ATTR = ACCEPTED_MIME.join(',')

interface SingleImageUploaderProps {
  label: string
  hint?: string
  value: string | null | undefined
  onChange: (url: string | undefined) => void
  disabled?: boolean
  /** Aspect ratio class for the preview box — square for the tree thumbnail, wide for the banner. */
  aspect?: 'square' | 'wide'
}

/**
 * A single-slot version of `MediaManager` (products/media-manager.tsx).
 *
 * Categories only ever have one tree thumbnail and one banner — there is no
 * gallery, no primary flag and no reordering to manage, so reusing the
 * multi-image component here would mean carrying its list semantics for a
 * list that can only ever have zero or one items. Upload mechanics (immediate
 * upload on selection, same accepted types and size cap) are identical.
 */
export function SingleImageUploader({
  label,
  hint,
  value,
  onChange,
  disabled,
  aspect = 'square',
}: SingleImageUploaderProps) {
  const { toast } = useToast()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = React.useState(false)

  const busy = disabled || uploading

  async function handleFile(file: File | undefined) {
    if (!file) return

    if (!ACCEPTED_MIME.includes(file.type)) {
      toast(`${file.name} — ${file.type || 'unrecognised type'}. Use JPEG, PNG or WebP.`, 'error')
      return
    }
    if (file.size > MAX_BYTES) {
      toast(`${file.name} — over 10 MB`, 'error')
      return
    }

    const previous = value

    setUploading(true)
    try {
      const { url } = await uploadFile(file, 'categories')
      onChange(url)
      // Mirrors MediaManager's rule for product photos: an unused upload is
      // an object nobody references, and storage that only ever grows is a
      // cost nobody notices until it's large. Best-effort — a failure here
      // leaves an orphan, which is the lesser problem next to blocking the
      // save over a cleanup step.
      if (previous) await api.delete('/media', { body: { url: previous } }).catch(() => undefined)
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Upload failed. Try again.', 'error')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleRemove() {
    const previous = value
    onChange(undefined)
    if (previous) await api.delete('/media', { body: { url: previous } }).catch(() => undefined)
  }

  return (
    <div>
      <p className="label">{label}</p>
      <div className="flex items-start gap-3">
        <div
          className={
            'relative overflow-hidden rounded-md border border-line bg-paper shrink-0 ' +
            (aspect === 'wide' ? 'w-40 aspect-[3/1]' : 'w-20 aspect-square')
          }
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full grid place-items-center text-ink-3">
              <ImagePlus className="h-4 w-4" aria-hidden />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT_ATTR}
            className="sr-only"
            onChange={(e) => void handleFile(e.target.files?.[0])}
            disabled={busy}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
            {value ? 'Replace' : 'Upload'}
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void handleRemove()}
              disabled={busy}
            >
              <Trash2 className="h-3.5 w-3.5 text-alert" />
              Remove
            </Button>
          )}
          {hint && <p className="hint">{hint}</p>}
        </div>
      </div>
    </div>
  )
}
