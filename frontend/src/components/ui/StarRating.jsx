import { useState } from 'react'

export default function StarRating({ rating = 0, size = 'sm', interactive = false, onChange }) {
  const [hovered, setHovered] = useState(0)
  const display = interactive ? (hovered || rating) : rating

  const sizes = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-8 h-8' }
  const cls = sizes[size] || sizes.sm

  function handleClick(val) {
    if (interactive && onChange) onChange(val)
  }

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => handleClick(star)}
          onMouseEnter={() => interactive && setHovered(star)}
          onMouseLeave={() => interactive && setHovered(0)}
          className={`${cls} ${interactive ? 'cursor-pointer' : 'cursor-default'} transition-colors ${
            star <= display ? 'text-amber-400' : 'text-gray-200'
          }`}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className={cls}>
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
      ))}
    </div>
  )
}
