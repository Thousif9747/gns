import { useState } from 'react'
import { post } from '../../api/client'
import Button from '../ui/Button'
import StarRating from '../ui/StarRating'

export default function ReviewFormInline({ productId, onSuccess }) {
  const [rating, setRating] = useState(0)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!rating) return setError('Please select a rating')
    if (!content.trim()) return setError('Please write a review')
    setSubmitting(true)
    setError('')
    try {
      const res = await post('/catalog/reviews/', {
        product: productId,
        rating,
        title: title.trim(),
        content: content.trim(),
      })
      if (res.ok) {
        setRating(0)
        setTitle('')
        setContent('')
        setShowForm(false)
        onSuccess?.()
      } else {
        const msg = Object.values(res.data || {}).flat().join(', ')
        setError(msg || 'Failed to submit review')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    }
    setSubmitting(false)
  }

  if (!showForm) {
    return (
      <Button size="sm" onClick={() => setShowForm(true)}>
        Write a Review
      </Button>
    )
  }

  return (
    <div className="border border-beige-200 rounded-2xl p-4 sm:p-6 bg-white/80">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Write a Review</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="text-sm p-3 rounded-lg bg-red-50 text-red-600">{error}</div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Rating *</label>
          <StarRating rating={rating} size="lg" interactive onChange={setRating} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title (optional)</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Summarize your review"
            maxLength={255}
            className="w-full rounded-xl border border-beige-300 px-4 py-3 text-sm bg-white/90 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Review *</label>
          <textarea
            rows={3}
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Tell others about your experience with this product..."
            className="w-full rounded-xl border border-beige-300 px-4 py-3 text-sm bg-white/90 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
          />
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Review'}
          </Button>
          <Button type="button" variant="outline" onClick={() => { setShowForm(false); setError('') }}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
