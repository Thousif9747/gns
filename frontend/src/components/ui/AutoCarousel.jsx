import { useEffect, useState, useRef, useCallback } from 'react'

export default function AutoCarousel({
  slides = [],
  renderSlide,
  interval = 4500,
  autoPlay = true,
  className = '',
  viewportClassName = '',
  slideClassName = '',
  showControls = true,
  showDots = true,
}) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const dragStartX = useRef(null)
  const dragStartY = useRef(null)
  const isDragging = useRef(false)
  const hasSwiped = useRef(false)

  useEffect(() => {
    if (activeIndex >= slides.length) {
      setActiveIndex(0)
    }
  }, [activeIndex, slides.length])

  useEffect(() => {
    if (!autoPlay || paused || slides.length <= 1 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const timer = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % slides.length)
    }, interval)
    return () => clearInterval(timer)
  }, [autoPlay, paused, slides.length, interval])

  const goTo = useCallback(index => {
    const nextIndex = (index + slides.length) % slides.length
    setActiveIndex(nextIndex)
  }, [slides.length])

  const handleDragStart = useCallback((clientX, clientY) => {
    dragStartX.current = clientX
    dragStartY.current = clientY
    isDragging.current = true
    hasSwiped.current = false
  }, [])

  const handleDragMove = useCallback((clientX, clientY) => {
    if (!isDragging.current || hasSwiped.current) return
    const diffX = clientX - dragStartX.current
    const diffY = clientY - dragStartY.current
    // Only trigger swipe if horizontal drag exceeds threshold and is more horizontal than vertical
    if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) {
      hasSwiped.current = true
      isDragging.current = false
      if (diffX < 0) {
        goTo(activeIndex + 1)
      } else {
        goTo(activeIndex - 1)
      }
    }
  }, [activeIndex, goTo])

  const handleDragEnd = useCallback(() => {
    isDragging.current = false
  }, [])

  const touchHandlers = {
    onTouchStart: e => handleDragStart(e.touches[0].clientX, e.touches[0].clientY),
    onTouchMove: e => handleDragMove(e.touches[0].clientX, e.touches[0].clientY),
    onTouchEnd: handleDragEnd,
  }

  const mouseHandlers = {
    onMouseDown: e => handleDragStart(e.clientX, e.clientY),
    onMouseMove: e => { if (isDragging.current) handleDragMove(e.clientX, e.clientY) },
    onMouseUp: handleDragEnd,
    onMouseLeave: handleDragEnd,
  }

  if (!slides.length) {
    return null
  }

  return (
    <div className={`relative select-none ${className}`} {...touchHandlers} {...mouseHandlers}
      role="region" aria-roledescription="carousel" aria-label="Featured promotions"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => { handleDragEnd(); setPaused(false) }}
      onFocusCapture={() => setPaused(true)} onBlurCapture={() => setPaused(false)}
      onKeyDown={e => { if (e.key === 'ArrowLeft') goTo(activeIndex - 1); if (e.key === 'ArrowRight') goTo(activeIndex + 1) }}>
      <div className={`overflow-hidden ${viewportClassName}`}>
        <div
          className="flex h-full transition-transform duration-500 ease-out motion-reduce:transition-none"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {slides.map((slide, index) => (
            <div key={slide.id || slide.slug || slide.image_url || slide || index} className={`shrink-0 w-full ${slideClassName}`}
              role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${slides.length}`}
              aria-hidden={index !== activeIndex} inert={index !== activeIndex ? '' : undefined}>
              {renderSlide(slide, index, index === activeIndex)}
            </div>
          ))}
        </div>
      </div>

      {showControls && slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => goTo(activeIndex - 1)}
            className="absolute left-2 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-[#146b45] shadow-md ring-1 ring-black/5 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ddf54a] sm:flex"
            aria-label="Previous slide"
          >
            <span className="text-2xl leading-none">&lsaquo;</span>
          </button>
          <button
            type="button"
            onClick={() => goTo(activeIndex + 1)}
            className="absolute right-2 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-[#146b45] shadow-md ring-1 ring-black/5 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ddf54a] sm:flex"
            aria-label="Next slide"
          >
            <span className="text-2xl leading-none">&rsaquo;</span>
          </button>
        </>
      )}

      {showDots && slides.length > 1 && (
        <div className="absolute bottom-3 left-0 right-0 z-10 flex items-center justify-center gap-2">
          {slides.map((slide, index) => (
            <button
              key={slide.id || slide.slug || slide.image_url || `dot-${index}`}
              type="button"
              onClick={() => goTo(index)}
              className={`h-2.5 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ddf54a] ${
                index === activeIndex ? 'w-7 bg-[#146b45]' : 'w-2.5 bg-white/75 hover:bg-white'
              }`}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === activeIndex ? 'true' : undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}
