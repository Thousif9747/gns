import { useState, useRef, useEffect } from 'react'

// Convert frame center (% of image dimensions) → CSS object-position value
// With object-fit:cover the image overflows in one axis; this maps frame center to the
// CSS % that produces that exact visible center.
function frameCenterToCssPos(cx, cy, nat, asp) {
  let px = cx, py = cy
  if (nat < asp) {
    // Portrait image in landscape/square container → height overflows
    const nat_asp = nat / asp  // visible height fraction (< 1)
    py = Math.max(0, Math.min(100, (cy / 100 - nat_asp / 2) / (1 - nat_asp) * 100))
  } else if (nat > asp) {
    // Landscape image in portrait/square container → width overflows
    const asp_nat = asp / nat  // visible width fraction (< 1)
    px = Math.max(0, Math.min(100, (cx / 100 - asp_nat / 2) / (1 - asp_nat) * 100))
  }
  return { px, py }
}

// Convert CSS object-position (px%, py%) → frame center (% of image dimensions)
function cssPosToFrameCenter(px, py, nat, asp) {
  let cx = px, cy = py
  if (nat < asp) {
    const nat_asp = nat / asp
    cy = (py / 100 * (1 - nat_asp) + nat_asp / 2) * 100
  } else if (nat > asp) {
    const asp_nat = asp / nat
    cx = (px / 100 * (1 - asp_nat) + asp_nat / 2) * 100
  }
  return { cx, cy }
}

// Compute the fixed frame size — exactly the CSS-visible region of the image
function visibleFrameSize(nat, asp) {
  if (nat < asp) return { width: 100, height: (nat / asp) * 100 }
  if (nat > asp) return { width: (asp / nat) * 100, height: 100 }
  return { width: 100, height: 100 }
}

export default function ImageCropFrame({ src, aspect = 1, onChange, initialObjectPosition }) {
  const containerRef = useRef(null)
  const onChangeRef = useRef(onChange)
  useEffect(() => { onChangeRef.current = onChange }, [onChange])

  const naturalSizeRef = useRef(null)
  const frameRef = useRef(null)
  const aspectRef = useRef(aspect)
  const dragRef = useRef(null)
  const initialPosRef = useRef(initialObjectPosition)

  const [naturalSize, setNaturalSize] = useState(null)
  const [frame, setFrame] = useState(null)

  useEffect(() => { aspectRef.current = aspect }, [aspect])

  function emitFrame(f, ns) {
    if (!f || !ns) return
    const nat = ns.w / ns.h
    const asp = aspectRef.current
    const cx = f.x + f.width / 2
    const cy = f.y + f.height / 2
    const { px, py } = frameCenterToCssPos(cx, cy, nat, asp)
    onChangeRef.current?.({
      frame: f,
      pixels: {
        x: Math.round((f.x / 100) * ns.w),
        y: Math.round((f.y / 100) * ns.h),
        width: Math.round((f.width / 100) * ns.w),
        height: Math.round((f.height / 100) * ns.h),
      },
      objectPosition: `${Math.round(px)}% ${Math.round(py)}%`,
    })
  }

  function buildFrame(asp, ns, initialPos) {
    const nat = ns.w / ns.h
    const size = visibleFrameSize(nat, asp)

    if (initialPos) {
      const m = initialPos.match(/([\d.]+)%\s+([\d.]+)%/)
      const px = m ? parseFloat(m[1]) : 50
      const py = m ? parseFloat(m[2]) : 50
      const { cx, cy } = cssPosToFrameCenter(px, py, nat, asp)
      return {
        width: size.width,
        height: size.height,
        x: Math.max(0, Math.min(100 - size.width, cx - size.width / 2)),
        y: Math.max(0, Math.min(100 - size.height, cy - size.height / 2)),
      }
    }

    return {
      width: size.width,
      height: size.height,
      x: (100 - size.width) / 2,
      y: (100 - size.height) / 2,
    }
  }

  useEffect(() => {
    if (!naturalSize) return
    const f = buildFrame(aspect, naturalSize, initialPosRef.current)
    initialPosRef.current = null
    setFrame(f)
    frameRef.current = f
    emitFrame(f, naturalSize)
  }, [aspect, naturalSize]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleImageLoad(e) {
    const ns = { w: e.target.naturalWidth, h: e.target.naturalHeight }
    setNaturalSize(ns)
    naturalSizeRef.current = ns
  }

  function startDrag(e) {
    e.preventDefault()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    dragRef.current = { startX: clientX, startY: clientY, startFrame: { ...frameRef.current } }
  }

  useEffect(() => {
    function onMove(e) {
      if (!dragRef.current || !frameRef.current || !naturalSizeRef.current || !containerRef.current) return
      const { startX, startY, startFrame } = dragRef.current
      const ns = naturalSizeRef.current
      const rect = containerRef.current.getBoundingClientRect()
      const clientX = e.touches ? e.touches[0].clientX : e.clientX
      const clientY = e.touches ? e.touches[0].clientY : e.clientY
      const dx = ((clientX - startX) / rect.width) * 100
      const dy = ((clientY - startY) / rect.height) * 100
      const f = {
        ...startFrame,
        x: Math.max(0, Math.min(100 - startFrame.width, startFrame.x + dx)),
        y: Math.max(0, Math.min(100 - startFrame.height, startFrame.y + dy)),
      }
      setFrame(f)
      frameRef.current = f
      emitFrame(f, ns)
    }
    function onEnd() { dragRef.current = null }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onEnd)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onEnd)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onEnd)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
    }
  }, [])

  if (!src) return null

  return (
    <div ref={containerRef} className="relative w-full select-none rounded-xl overflow-hidden bg-black/10">
      <img
        key={src}
        src={src}
        onLoad={handleImageLoad}
        draggable={false}
        crossOrigin="anonymous"
        className="block w-full h-auto pointer-events-none"
        alt=""
      />
      {frame && (
        <>
          <div className="absolute inset-x-0 top-0 bg-black/50 pointer-events-none" style={{ height: `${frame.y}%` }} />
          <div className="absolute inset-x-0 bottom-0 bg-black/50 pointer-events-none" style={{ top: `${frame.y + frame.height}%` }} />
          <div className="absolute bg-black/50 pointer-events-none"
            style={{ top: `${frame.y}%`, left: 0, width: `${frame.x}%`, height: `${frame.height}%` }} />
          <div className="absolute bg-black/50 pointer-events-none"
            style={{ top: `${frame.y}%`, left: `${frame.x + frame.width}%`, right: 0, height: `${frame.height}%` }} />
          <div
            className="absolute cursor-move touch-none"
            style={{ left: `${frame.x}%`, top: `${frame.y}%`, width: `${frame.width}%`, height: `${frame.height}%` }}
            onMouseDown={startDrag}
            onTouchStart={startDrag}
          >
            <div className="absolute inset-0 border-2 border-white/90 pointer-events-none" />
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/3 left-0 right-0 h-px bg-white/25" />
              <div className="absolute top-2/3 left-0 right-0 h-px bg-white/25" />
              <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/25" />
              <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/25" />
            </div>
            <div className="absolute -left-px -top-px w-4 h-4 border-t-2 border-l-2 border-white pointer-events-none" />
            <div className="absolute -right-px -top-px w-4 h-4 border-t-2 border-r-2 border-white pointer-events-none" />
            <div className="absolute -left-px -bottom-px w-4 h-4 border-b-2 border-l-2 border-white pointer-events-none" />
            <div className="absolute -right-px -bottom-px w-4 h-4 border-b-2 border-r-2 border-white pointer-events-none" />
          </div>
        </>
      )}
    </div>
  )
}
