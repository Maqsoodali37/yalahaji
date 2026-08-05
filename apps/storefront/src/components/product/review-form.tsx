'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { Star, Loader2, CheckCircle, PenLine } from 'lucide-react'
import { createReview, ApiError } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import {
  validate,
  hasErrors,
  required,
  minLength,
  maxLength,
  inRange,
  type FieldErrors,
} from '@/lib/validation'
import { FormField, inputClass } from '@/components/ui/form-field'
import { cn } from '@/lib/utils'

interface ReviewValues {
  rating: number
  title: string
  body: string
}

/** Mirrors the API's CreateReviewDto. */
const reviewRules = {
  rating: [inRange(1, 5, 'Choose a rating from 1 to 5 stars.')],
  title: [required('Give your review a title.'), minLength(3), maxLength(120)],
  body: [
    required('Tell other shoppers what you thought.'),
    minLength(10, 'Please write at least 10 characters.'),
    maxLength(4000),
  ],
}

/**
 * Review submission. `POST /reviews` has existed since the API was built but
 * nothing on the storefront called it, so the product page could display
 * reviews and never collect one.
 */
export function ReviewForm({
  productId,
  onSubmitted,
}: {
  productId: string
  onSubmitted?: () => void
}) {
  const locale = useLocale()
  const user = useAuthStore((s) => s.user)
  const isHydrating = useAuthStore((s) => s.isHydrating)

  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [errors, setErrors] = useState<FieldErrors<ReviewValues>>({})
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [done, setDone] = useState(false)

  const revalidate = (next: ReviewValues) => {
    if (submitted) setErrors(validate(next, reviewRules))
  }

  // Wait for the session check rather than flashing a sign-in prompt at
  // someone who is in fact signed in.
  if (isHydrating) {
    return <div className="h-11 w-44 bg-line/60 rounded-sm animate-pulse" />
  }

  if (!user) {
    return (
      <div className="bg-paper border border-line rounded-md p-5 text-center">
        <p className="text-sm text-stone mb-3">
          Sign in to share your experience with this product.
        </p>
        <Link href={`/${locale}/login`} className="btn-outline text-sm py-2 px-4">
          Sign in to write a review
        </Link>
      </div>
    )
  }

  if (done) {
    return (
      <div className="bg-green-tint border border-green/20 rounded-md p-5 flex items-start gap-3">
        <CheckCircle className="w-5 h-5 text-green flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-ink">JazakAllah khair for your review.</p>
          <p className="text-sm text-stone">
            It will appear on this page once our team has checked it.
          </p>
        </div>
      </div>
    )
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-outline text-sm py-2.5 px-5">
        <PenLine className="w-4 h-4" />
        Write a review
      </button>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    setFormError('')

    const values: ReviewValues = { rating, title, body }
    const found = validate(values, reviewRules)
    setErrors(found)
    if (hasErrors(found)) return

    setSaving(true)
    try {
      await createReview({
        productId,
        rating,
        title: title.trim(),
        body: body.trim(),
      })
      setDone(true)
      onSubmitted?.()
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? err.isAuthError
            ? 'Your session has expired. Please sign in again.'
            : err.message
          : 'Could not submit your review. Please try again.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="bg-white border border-line rounded-md p-5 space-y-4"
    >
      <h4 className="font-bold text-ink">Write a review</h4>

      <FormField label="Your rating" required error={errors.rating}>
        {(props) => (
          <div
            {...props}
            role="radiogroup"
            aria-label="Your rating"
            className="flex gap-1"
            onMouseLeave={() => setHovered(0)}
          >
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                role="radio"
                aria-checked={rating === star}
                aria-label={`${star} star${star > 1 ? 's' : ''}`}
                onMouseEnter={() => setHovered(star)}
                onClick={() => {
                  setRating(star)
                  revalidate({ rating: star, title, body })
                }}
                className="p-0.5"
              >
                <Star
                  className={cn(
                    'w-7 h-7 transition-colors',
                    star <= (hovered || rating)
                      ? 'fill-gold text-gold'
                      : 'text-stone/30',
                  )}
                />
              </button>
            ))}
          </div>
        )}
      </FormField>

      <FormField label="Title" required error={errors.title}>
        {(props) => (
          <input
            {...props}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              revalidate({ rating, title: e.target.value, body })
            }}
            className={inputClass(errors.title)}
            placeholder="Sums up your experience"
            maxLength={120}
          />
        )}
      </FormField>

      <FormField label="Your review" required error={errors.body}>
        {(props) => (
          <textarea
            {...props}
            value={body}
            onChange={(e) => {
              setBody(e.target.value)
              revalidate({ rating, title, body: e.target.value })
            }}
            className={inputClass(errors.body, 'min-h-[110px] resize-y')}
            placeholder="What did you like or dislike? How was the quality?"
            maxLength={4000}
          />
        )}
      </FormField>

      {formError && (
        <p
          role="alert"
          className="text-sm text-alert bg-alert/5 border border-alert/20 rounded-sm px-3 py-2"
        >
          {formError}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="btn-primary py-2.5 px-5 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {saving ? 'Submitting…' : 'Submit review'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-outline px-5 py-2.5">
          Cancel
        </button>
      </div>
    </form>
  )
}
