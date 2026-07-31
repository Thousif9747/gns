import { useState, useRef, useEffect } from 'react'
import ImageCropFrame from './ImageCropFrame'
import Modal from './Modal'
import Button from './Button'

export default function ImageCropperModal({
  isOpen,
  onClose,
  onSave,
  imageUrl,
  aspectRatio = 2.7,
  cropContexts = null,
  initialPositions = null,
  title = 'Adjust Image Position',
}) {
  const [activeRatio, setActiveRatio] = useState(aspectRatio)
  const [livePositions, setLivePositions] = useState({})
  const cropDataRefs = useRef({})

  useEffect(() => {
    if (isOpen) {
      cropDataRefs.current = {}
      setActiveRatio(aspectRatio)
      setLivePositions(initialPositions || {})
    }
  }, [isOpen, aspectRatio]) // eslint-disable-line react-hooks/exhaustive-deps

  const apiBase = import.meta.env.VITE_API_BASE_URL || ''
  const finalImageUrl = imageUrl
    ? (imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || imageUrl.startsWith('blob:') || imageUrl.startsWith('data:')
        ? imageUrl
        : apiBase
          ? `${apiBase.replace(/\/$/, '')}/${imageUrl.replace(/^\//, '')}`
          : imageUrl)
    : ''

  const isMultiContext = cropContexts && cropContexts.length > 1
  const activeContext = cropContexts?.find(c => c.ratio === activeRatio)
  const activeLabel = activeContext?.label || 'default'

  function handleFrameChange(label, data) {
    cropDataRefs.current[label] = data
    setLivePositions(prev => ({ ...prev, [label]: data.objectPosition }))
  }

  function handleDone() {
    if (!isMultiContext) {
      const pos = cropDataRefs.current[activeLabel]?.objectPosition || initialPositions?.[activeLabel] || '50% 50%'
      onSave({ objectPosition: pos, positions: { [activeLabel]: pos } })
    } else {
      const allPositions = {}
      cropContexts.forEach(ctx => {
        allPositions[ctx.label] =
          cropDataRefs.current[ctx.label]?.objectPosition ||
          initialPositions?.[ctx.label] ||
          '50% 50%'
      })
      const bannerCtx = cropContexts.reduce((a, b) => a.ratio > b.ratio ? a : b)
      const primaryPos = allPositions[bannerCtx.label] || Object.values(allPositions)[0] || '50% 50%'
      onSave({ objectPosition: primaryPos, positions: allPositions })
    }
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-3">

        {isMultiContext && (
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 mb-1.5">Preview for display context</p>
            <div className="flex gap-1 rounded-xl border border-beige-200 bg-beige-50 p-1">
              {cropContexts.map(ctx => {
                const pos = livePositions[ctx.label]
                const isSet = !!pos && pos !== '50% 50%'
                return (
                  <button
                    key={ctx.label}
                    type="button"
                    onClick={() => setActiveRatio(ctx.ratio)}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-medium transition-all ${
                      activeRatio === ctx.ratio
                        ? 'bg-white text-eco-900 shadow-sm'
                        : 'text-gray-500 hover:text-eco-700'
                    }`}
                  >
                    <span className="flex items-center justify-center gap-1">
                      {ctx.label}
                      {isSet && <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />}
                    </span>
                    <span className="block text-[9px] font-normal opacity-60 mt-0.5">
                      {ctx.ratio === 1 ? '1 : 1' : `${ctx.ratio} : 1`}
                    </span>
                    {pos && (
                      <span className="block text-[9px] font-mono text-primary-500 mt-0.5">{pos}</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {finalImageUrl ? (
          isMultiContext ? (
            cropContexts.map(ctx => (
              <div key={ctx.label} style={{ display: activeRatio === ctx.ratio ? 'block' : 'none' }}>
                <ImageCropFrame
                  src={finalImageUrl}
                  aspect={ctx.ratio}
                  initialObjectPosition={initialPositions?.[ctx.label]}
                  onChange={data => handleFrameChange(ctx.label, data)}
                />
              </div>
            ))
          ) : (
            <ImageCropFrame
              key={finalImageUrl}
              src={finalImageUrl}
              aspect={activeRatio}
              initialObjectPosition={initialPositions?.[activeLabel]}
              onChange={data => handleFrameChange(activeLabel, data)}
            />
          )
        ) : (
          <div className="h-40 flex items-center justify-center text-sm text-gray-500 rounded-xl border border-beige-200">
            No image available
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-[10px] text-gray-400">
              Drag the frame to reposition · frame shows exactly what will be visible
            </p>
          </div>
          {livePositions[activeLabel] && (
            <span className="text-[10px] font-mono bg-eco-50 border border-eco-200 text-eco-700 rounded-md px-2 py-0.5">
              {livePositions[activeLabel]}
            </span>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleDone}>Save Position</Button>
        </div>
      </div>
    </Modal>
  )
}
