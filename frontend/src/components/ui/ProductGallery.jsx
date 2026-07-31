import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

const ZoomIcon = () => <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path strokeLinecap="round" d="m20 20-4-4m-5-8v6m-3-3h6"/></svg>
const CloseIcon = () => <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M6 6l12 12M18 6 6 18"/></svg>
const ArrowIcon = ({ next = false }) => <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d={next ? 'm9 6 6 6-6 6' : 'm15 18-6-6 6-6'}/></svg>

export default function ProductGallery({ images, name, available, onWishlist, wishlisted, showWishlist }) {
  const [active, setActive] = useState(0)
  const [lightbox, setLightbox] = useState(false)
  const closeRef = useRef(null)
  const triggerRef = useRef(null)
  const dialogRef = useRef(null)
  const reduceMotion = useReducedMotion()
  const safeActive = Math.min(active, Math.max(0, images.length - 1))
  const current = images[safeActive]

  useEffect(() => {
    setActive(0)
    setLightbox(false)
  }, [name])

  useEffect(() => {
    if (active >= images.length) setActive(Math.max(0, images.length - 1))
  }, [active, images.length])

  useEffect(() => {
    if (!lightbox) return undefined
    const handler = event => {
      if (event.key === 'Escape') setLightbox(false)
      if (event.key === 'ArrowLeft') setActive(index => (index - 1 + images.length) % images.length)
      if (event.key === 'ArrowRight') setActive(index => (index + 1) % images.length)
      if (event.key === 'Tab') {
        const controls = dialogRef.current?.querySelectorAll('button:not([disabled])')
        if (!controls?.length) return
        const first = controls[0]
        const last = controls[controls.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    requestAnimationFrame(() => closeRef.current?.focus())
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
      if (triggerRef.current?.isConnected) triggerRef.current.focus()
    }
  }, [lightbox, images.length])

  if (!images.length) return <div className="grid aspect-square place-items-center rounded-[24px] border border-[#dce7df] bg-[#edf4ef] text-7xl font-black text-[#b9cec0]">{name?.charAt(0)?.toUpperCase()}</div>

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-[76px_minmax(0,1fr)]">
        <div className="order-2 flex gap-2 overflow-x-auto pb-1 sm:order-1 sm:flex-col sm:overflow-visible">
          {images.map((image, index) => (
            <motion.button whileHover={reduceMotion ? undefined : { y: -2 }} whileTap={reduceMotion ? undefined : { scale: .96 }} key={`${image.image_url || image}-${index}`} type="button" onClick={() => setActive(index)} aria-label={`View product image ${index + 1}`} aria-current={safeActive === index ? 'true' : undefined} className={`relative h-[66px] w-[66px] shrink-0 overflow-hidden rounded-[14px] bg-white p-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#146b45] focus-visible:ring-offset-2 ${safeActive === index ? 'border-2 border-[#146b45] shadow-[0_7px_18px_rgba(20,107,69,.14)]' : 'border border-[#dce7df] hover:border-[#9ebaa8]'}`}>
              <img src={image.image_url || image} alt="" className="h-full w-full object-contain" />
              {safeActive === index && <motion.span layoutId="active-thumbnail" className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-[#d9ef54]" />}
            </motion.button>
          ))}
        </div>
        <div className="order-1 relative overflow-hidden rounded-[24px] border border-[#dce7df] bg-[radial-gradient(circle_at_50%_42%,#ffffff_0%,#f5f8f4_65%,#edf4ef_100%)] shadow-[0_24px_65px_rgba(26,61,31,.11)] sm:order-2">
          <button ref={triggerRef} type="button" className="group block aspect-square w-full cursor-zoom-in p-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#146b45] sm:p-10" onClick={() => setLightbox(true)} aria-label={`Zoom ${name} image`}>
            <AnimatePresence mode="wait">
              <motion.img key={safeActive} src={current.image_url || current} alt={`${name}, view ${safeActive + 1}`} initial={reduceMotion ? false : { opacity: 0, scale: .97 }} animate={{ opacity: 1, scale: 1 }} exit={reduceMotion ? undefined : { opacity: 0, scale: 1.015 }} transition={{ duration: .28, ease: 'easeOut' }} className={`h-full w-full object-contain drop-shadow-[0_18px_18px_rgba(38,71,46,.12)] transition-transform duration-500 ${available ? 'group-hover:scale-[1.025]' : 'grayscale'}`} style={current.card_object_position ? { objectPosition: current.card_object_position } : undefined} />
            </AnimatePresence>
            <span className="absolute bottom-4 right-4 flex min-h-10 items-center gap-2 rounded-xl border border-white bg-white/90 px-3 text-xs font-extrabold text-[#244b35] shadow-sm backdrop-blur"><ZoomIcon />Tap to zoom</span>
          </button>
          <span className="absolute left-4 top-4 rounded-lg bg-[#173d2a] px-2.5 py-1 text-[11px] font-extrabold tracking-wide text-white">{safeActive + 1} / {images.length}</span>
          {showWishlist && <motion.button type="button" whileTap={reduceMotion ? undefined : { scale: .78 }} onClick={onWishlist} aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'} className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-xl border border-[#dce7df] bg-white text-[#607269] shadow-sm transition hover:border-[#ef9d93] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#146b45]"><svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill={wishlisted ? '#df574c' : 'none'} stroke={wishlisted ? '#df574c' : 'currentColor'} strokeWidth="2"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21.2l8.8-8.8a5.5 5.5 0 0 0 0-7.8Z"/></svg></motion.button>}
          {!available && <div className="absolute inset-x-4 bottom-4 rounded-xl bg-[#17231d]/90 p-3 text-center text-sm font-bold text-white">Currently unavailable</div>}
        </div>
      </div>
      <AnimatePresence>
        {lightbox && (
          <motion.div ref={dialogRef} role="dialog" aria-modal="true" aria-label={`${name} image viewer`} initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] grid place-items-center bg-[#07110c]/95 p-4 backdrop-blur-md" onMouseDown={event => event.target === event.currentTarget && setLightbox(false)}>
            <button ref={closeRef} onClick={() => setLightbox(false)} className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-xl bg-white/10 text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" aria-label="Close image viewer"><CloseIcon /></button>
            <span className="absolute left-4 top-5 text-sm font-bold text-white/80">{safeActive + 1} / {images.length}</span>
            {images.length > 1 && <button onClick={() => setActive(index => (index - 1 + images.length) % images.length)} className="absolute left-3 grid h-12 w-12 place-items-center rounded-xl bg-white/10 text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" aria-label="Previous image"><ArrowIcon /></button>}
            <motion.img key={safeActive} initial={reduceMotion ? false : { opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} src={current.image_url || current} alt={`${name}, enlarged view ${safeActive + 1}`} className="max-h-[88vh] max-w-[86vw] select-none object-contain" />
            {images.length > 1 && <button onClick={() => setActive(index => (index + 1) % images.length)} className="absolute right-3 grid h-12 w-12 place-items-center rounded-xl bg-white/10 text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" aria-label="Next image"><ArrowIcon next /></button>}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
