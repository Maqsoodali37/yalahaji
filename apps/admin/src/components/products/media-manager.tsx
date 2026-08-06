'use client'

import * as React from 'react'
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, Star, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/field'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToast } from '@/components/ui/toast'
import { api, uploadFile, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { MediaInput } from '@/types'

/**
 * Formats this component will offer in the file picker.
 *
 * Deliberately narrower than what the API might accept. The server derives its
 * list from what its libvips build can actually decode, and AVIF/HEIC input is
 * missing from several of the prebuilt sharp binaries — so listing them here
 * would invite a file that passes the browser check and is then refused after
 * the upload has already been paid for.
 *
 * These three are supported by every sharp build. Anything else is better
 * converted by the person before uploading than half-accepted by us.
 */
const ACCEPTED_MIME = ['image/jpeg', 'image/png', 'image/webp']

/** Mirrors MAX_UPLOAD_BYTES in `apps/api/src/media/media.service.ts`. */
const MAX_BYTES = 10 * 1024 * 1024

const ACCEPT_ATTR = ACCEPTED_MIME.join(',')

interface MediaManagerProps {
  images: MediaInput[]
  onChange: (images: MediaInput[]) => void
  disabled?: boolean
}

/**
 * Guarantee a primary without mutating anything the caller still holds.
 *
 * Assigning `list[0].isPrimary = true` in place would edit an object that is
 * also in the form's current state, so React sees no change and the tick never
 * appears until something else re-renders the panel.
 *
 * The API applies the same rule again in `normaliseMedia()`. This copy is here
 * so the admin sees the outcome before saving, not after.
 */
function withPrimary(list: MediaInput[]): MediaInput[] {
  if (list.length === 0 || list.some((img) => img.isPrimary)) return list
  return list.map((img, i) => (i === 0 ? { ...img, isPrimary: true } : img))
}

/**
 * Product photo management.
 *
 * Uploads happen immediately — the file goes to MinIO on selection and only
 * the returned URL is held in form state, so the product payload stays JSON
 * and a half-filled form never has megabytes of image data in memory.
 *
 * The consequence, which the remove dialog states plainly, is that removing a
 * photo deletes the stored object there and then. Cancelling the form
 * afterwards does not bring it back.
 */
export function MediaManager({ images, onChange, disabled }: MediaManagerProps) {
  const { toast } = useToast()
  const inputRef = React.useRef<HTMLInputElement>(null)

  const [uploading, setUploading] = React.useState(false)
  const [pendingRemoval, setPendingRemoval] = React.useState<number | null>(null)
  const [removing, setRemoving] = React.useState(false)

  const busy = disabled || uploading

  function update(index: number, patch: Partial<MediaInput>) {
    onChange(images.map((img, i) => (i === index ? { ...img, ...patch } : img)))
  }

  /** Exactly one primary — ticking a new one unticks the old. */
  function setPrimary(index: number) {
    onChange(images.map((img, i) => ({ ...img, isPrimary: i === index })))
  }

  function move(index: number, delta: number) {
    const target = index + delta
    if (target < 0 || target >= images.length) return
    const next = [...images]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return

    const selected = Array.from(files)
    const rejected: string[] = []
    const accepted = selected.filter((file) => {
      if (!ACCEPTED_MIME.includes(file.type)) {
        // `file.type` is derived from the extension and is empty for anything
        // the OS does not recognise, so say what we saw rather than asserting
        // what the file is — the server sniffs the actual bytes.
        rejected.push(
          `${file.name} — ${file.type || 'unrecognised type'}. Use JPEG, PNG or WebP.`,
        )
        return false
      }
      if (file.size > MAX_BYTES) {
        rejected.push(`${file.name} — over 10 MB`)
        return false
      }
      return true
    })

    rejected.forEach((message) => toast(message, 'error'))
    if (accepted.length === 0) return

    setUploading(true)

    // Sequential rather than Promise.all: each upload is re-encoded by sharp
    // on the API, and firing ten at once is how the single API container ends
    // up starved of memory mid-save.
    const uploaded: MediaInput[] = []
    try {
      for (const file of accepted) {
        try {
          const { url } = await uploadFile(file, 'products')
          uploaded.push({ url, alt: '', isPrimary: false })
        } catch (err) {
          const message =
            err instanceof ApiError ? err.message : 'Upload failed. Try again.'
          toast(`${file.name} — ${message}`, 'error')
        }
      }
    } finally {
      setUploading(false)
      // Let the same file be picked again after a failure; the input keeps its
      // value otherwise and the change event never fires a second time.
      if (inputRef.current) inputRef.current.value = ''
    }

    if (uploaded.length === 0) return

    // First photo added to an empty product becomes the primary, so a product
    // always has one without staff needing to know the concept exists.
    onChange(withPrimary([...images, ...uploaded]))
    toast(`${uploaded.length} image${uploaded.length === 1 ? '' : 's'} uploaded.`)
  }

  async function confirmRemove() {
    if (pendingRemoval === null) return
    const index = pendingRemoval
    const target = images[index]

    setRemoving(true)
    try {
      await api.delete('/media', { body: { url: target.url } })
    } catch (err) {
      // The object may already be gone, or storage may be unreachable. Neither
      // is a reason to keep a photo attached that staff asked to remove — the
      // orphan is the lesser problem, so warn and detach anyway.
      const message = err instanceof ApiError ? err.message : 'Storage did not respond'
      toast(`Image removed from the product, but the file may remain: ${message}`, 'error')
    } finally {
      setRemoving(false)
      setPendingRemoval(null)
    }

    // Deleting the primary would otherwise leave the product with none, and
    // the cart renders a placeholder for exactly that case.
    onChange(withPrimary(images.filter((_, i) => i !== index)))
  }

  return (
    <div className="space-y-4">
      {images.length === 0 && (
        <p className="text-sm text-ink-3">
          No photos yet. The storefront shows the Yala Haji brand mark until one is
          added.
        </p>
      )}

      {images.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((image, index) => (
            <li
              key={`${image.url}-${index}`}
              className={cn(
                'rounded-md border bg-paper/50 p-3',
                image.isPrimary ? 'border-green' : 'border-line',
              )}
            >
              <div className="relative aspect-square overflow-hidden rounded bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt={image.alt || 'Product photo preview'}
                  className="h-full w-full object-cover"
                />
                {image.isPrimary && (
                  <span className="absolute top-1.5 start-1.5 rounded bg-green px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    Primary
                  </span>
                )}
              </div>

              <div className="mt-2.5 flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => move(index, -1)}
                  disabled={busy || index === 0}
                  aria-label={`Move photo ${index + 1} earlier`}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => move(index, 1)}
                  disabled={busy || index === images.length - 1}
                  aria-label={`Move photo ${index + 1} later`}
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setPrimary(index)}
                  disabled={busy || image.isPrimary}
                  aria-label={`Make photo ${index + 1} the primary image`}
                  title="Use as the main image"
                >
                  <Star
                    className={cn(
                      'h-3.5 w-3.5',
                      image.isPrimary && 'fill-gold text-gold',
                    )}
                  />
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="ms-auto"
                  onClick={() => setPendingRemoval(index)}
                  disabled={busy}
                  aria-label={`Remove photo ${index + 1}`}
                >
                  <Trash2 className="h-3.5 w-3.5 text-alert" />
                </Button>
              </div>

              <Input
                className="mt-2"
                value={image.alt ?? ''}
                onChange={(e) => update(index, { alt: e.target.value })}
                placeholder="Describe the photo"
                maxLength={191}
                disabled={busy}
                aria-label={`Alt text for photo ${index + 1}`}
              />
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTR}
          multiple
          className="sr-only"
          onChange={(e) => void handleFiles(e.target.files)}
          disabled={busy}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="h-4 w-4" />
          )}
          {uploading ? 'Uploading…' : 'Add photos'}
        </Button>
        <p className="text-xs text-ink-3">
          JPEG, PNG or WebP, up to 10 MB each — resized and converted to WebP on
          upload. iPhone photos are usually HEIC: export as JPEG first, as renaming
          the file does not change what is inside it.
        </p>
      </div>

      <ConfirmDialog
        open={pendingRemoval !== null}
        title="Remove this photo?"
        description="The file is deleted from storage straight away. Cancelling the form afterwards will not restore it."
        confirmLabel="Delete photo"
        destructive
        loading={removing}
        onConfirm={() => void confirmRemove()}
        onCancel={() => setPendingRemoval(null)}
      />
    </div>
  )
}
