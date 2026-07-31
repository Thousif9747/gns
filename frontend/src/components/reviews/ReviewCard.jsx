import StarRating from '../ui/StarRating'
import { timeAgo } from '../../utils/formatters'

const COLORS = [
  'bg-primary-500', 'bg-blue-500', 'bg-amber-500',
  'bg-purple-500', 'bg-pink-500', 'bg-teal-500',
]

export default function ReviewCard({ review }) {
  const name = review.user_name || 'Anonymous'
  const initial = name.charAt(0).toUpperCase()
  const colorClass = COLORS[name.charCodeAt(0) % COLORS.length]

  return (
    <div className="flex gap-3 py-4 border-b border-beige-100 last:border-0">
      <div className={`shrink-0 w-9 h-9 rounded-full ${colorClass} flex items-center justify-center text-white text-sm font-semibold`}>
        {review.user_avatar ? (
          <img src={review.user_avatar} alt="" className="w-full h-full rounded-full object-cover" />
        ) : initial}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-gray-900">{name}</span>
          <StarRating rating={review.rating} size="sm" />
          <span className="text-xs text-gray-400">{timeAgo(review.created_at)}</span>
        </div>
        {review.is_verified_purchase && (
          <div className="flex items-center gap-1 mt-0.5">
            <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span className="text-[11px] font-medium text-green-600">Verified Purchase</span>
          </div>
        )}
        {review.title && (
          <p className="text-sm font-semibold text-gray-800 mt-1">{review.title}</p>
        )}
        {review.content && (
          <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">{review.content}</p>
        )}
      </div>
    </div>
  )
}
