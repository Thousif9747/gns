import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { get, post, patch, extractList } from '../../api/client'
import { useToast } from '../../context/ToastContext'
import ImageCropFrame from '../../components/ui/ImageCropFrame'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Spinner from '../../components/ui/Spinner'

function toLocalDatetimeString(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function OfferFormPage() {
  const { id } = useParams()
  const isEditing = Boolean(id)
  const navigate = useNavigate()

  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [products, setProducts] = useState([])
  const [form, setForm] = useState({
    name: '',
    discount_type: 'PERCENT',
    discount_value: '',
    code: '',
    badge_label: '',
    start_date: '',
    end_date: '',
    min_purchase_amount: '',
    is_active: true,
  })
  const [selectedProducts, setSelectedProducts] = useState([])

  // Image / banner fields
  const [offerImage, setOfferImage] = useState(null)
  const [preview, setPreview] = useState('')
  const [imageSource, setImageSource] = useState('upload')
  const [selectedProductRef, setSelectedProductRef] = useState(null)
  const [objectPosition, setObjectPosition] = useState({ x: 50, y: 50 })
  const [showOnHomepage, setShowOnHomepage] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  // Crop context — lets admin preview the focal point at each display context
  const [cropAspect, setCropAspect] = useState(2.7)
  const { showToast } = useToast()
  const OFFER_CROP_CONTEXTS = [
    { label: 'Offer Card', ratio: 1.8 },
    { label: 'Homepage Banner', ratio: 2.7 },
  ]

  useEffect(() => {
    get('/catalog/products/', { page_size: 200 }).then(r => {
      if (r.ok) setProducts(extractList(r.data))
    }).catch(() => showToast({ title: 'Error', message: 'Failed to load products', type: 'error' }))
  }, [])

  useEffect(() => {
    if (!isEditing) return
    async function loadOffer() {
      const res = await get(`/catalog/offers/${id}/`)
      if (res.ok) {
        const o = res.data
        setForm({
          name: o.name,
          discount_type: o.discount_type,
          discount_value: o.discount_value,
          code: o.code || '',
          badge_label: o.badge_label || '',
          start_date: toLocalDatetimeString(o.start_date),
          end_date: toLocalDatetimeString(o.end_date),
          min_purchase_amount: o.min_purchase_amount || '',
          is_active: o.is_active,
        })
        setSelectedProducts(o.products?.map(p => p.id) || [])
        // Restore existing banner image state if present
        if (o.image_url) {
          setPreview(o.image_url)
          setImageSource('upload')
          setSelectedProductRef(null)
          if (o.object_position) {
            const parts = o.object_position.split('% ')
            setObjectPosition({
              x: parseInt(parts[0]) || 50,
              y: parseInt(parts[1]) || 50,
            })
          }
          setShowOnHomepage(!!o.is_homepage_banner)
        }
      }
      setLoading(false)
    }
    loadOffer()
  }, [id, isEditing])

  function toggleProduct(pid) {
    setSelectedProducts(prev =>
      prev.includes(pid) ? prev.filter(x => x !== pid) : [...prev, pid]
    )
  }

  function handleOfferCropChange({ objectPosition: pos }) {
    const [x, y] = pos.split('% ').map(v => parseInt(v, 10))
    setObjectPosition({ x: isNaN(x) ? 50 : x, y: isNaN(y) ? 50 : y })
  }

  async function handleSelectProductImage(product, imgIndex = 0) {
    const img = (product.images || [])[imgIndex]
    if (!img) return
    let fileObj = null
    try {
      const resp = await fetch(img.image_url)
      const blob = await resp.blob()
      const ext = blob.type.split('/')[1] || 'jpg'
      fileObj = new File([blob], `product-image-${product.id}-${imgIndex}.${ext}`, { type: blob.type })
    } catch {
      fileObj = new File([img.image_url], 'product-image.jpg', { type: 'image/jpeg' })
    }
    setOfferImage(fileObj)
    setPreview(img.image_url)
    setSelectedProductRef({ productName: product.name, imageUrl: img.image_url })
    setObjectPosition({ x: 50, y: 50 })
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)

    const basePayload = {
      name: form.name,
      discount_type: form.discount_type,
      discount_value: parseFloat(form.discount_value),
      code: form.code || '',
      badge_label: form.badge_label || '',
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      min_purchase_amount: form.min_purchase_amount ? parseFloat(form.min_purchase_amount) : null,
      is_active: form.is_active,
      product_ids: selectedProducts,
      object_position: `${objectPosition.x}% ${objectPosition.y}%`,
      is_homepage_banner: showOnHomepage,
    }

    if (offerImage) {
      const fd = new FormData()
      Object.entries(basePayload).forEach(([key, val]) => {
        if (val === null) { fd.append(key, ''); return }
        if (Array.isArray(val)) { fd.append(key, JSON.stringify(val)); return }
        if (typeof val === 'boolean') { fd.append(key, val ? 'true' : 'false'); return }
        fd.append(key, String(val))
      })
      fd.append('image', offerImage)

      const res = isEditing
        ? await patch(`/catalog/offers/${id}/`, fd)
        : await post('/catalog/offers/', fd)
      if (res.ok) {
        showToast({ title: isEditing ? 'Updated' : 'Created', message: `Offer ${isEditing ? 'updated' : 'created'} successfully`, type: 'success' })
        navigate('/admin/offers')
      } else {
        showToast({ title: 'Error', message: res.data?.detail || res.data?.error || 'Something went wrong', type: 'error' })
      }
    } else {
      const res = isEditing
        ? await patch(`/catalog/offers/${id}/`, basePayload)
        : await post('/catalog/offers/', basePayload)
      if (res.ok) {
        showToast({ title: isEditing ? 'Updated' : 'Created', message: `Offer ${isEditing ? 'updated' : 'created'} successfully`, type: 'success' })
        navigate('/admin/offers')
      } else {
        showToast({ title: 'Error', message: res.data?.detail || res.data?.error || 'Something went wrong', type: 'error' })
      }
    }
    setSaving(false)
  }

  if (loading) return <Spinner />

  return (
    <div className="ops-route ops-admin-page space-y-6" data-page="offer-form">
      {/* Header */}
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-eco-100 via-beige-50 to-cream text-eco-900 p-6 lg:p-8 shadow-modal border border-beige-200">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(90,160,95,0.12),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(217,164,65,0.14),transparent_30%)]" />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-primary-600 mb-2">Promotions</p>
            <h1 className="font-display text-4xl md:text-5xl">{isEditing ? 'Edit Offer' : 'Add Offer'}</h1>
          </div>
          <Button variant="outline" onClick={() => navigate('/admin/offers')}>Back to offers</Button>
        </div>
      </section>

      {/* Form */}
      <form onSubmit={handleSave} className="grid gap-4 lg:grid-cols-3">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-4">
          {/* ── Offer Details ── */}
          <Card>
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-primary-600 font-semibold">Offer Details</p>
                <h3 className="mt-1 text-base font-semibold text-eco-900">Basic information</h3>
              </div>
              <Input label="Name" name="name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-eco-800">Discount Type</label>
                  <select
                    name="discount_type"
                    value={form.discount_type}
                    onChange={e => setForm({ ...form, discount_type: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-beige-300 bg-white/90 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="PERCENT">Percentage (%)</option>
                    <option value="FLAT">Flat (₹)</option>
                  </select>
                </div>
                <Input label="Discount Value" name="discount_value" type="number" step="0.01" value={form.discount_value} onChange={e => setForm({ ...form, discount_value: e.target.value })} required />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Promo Code (optional)" name="code" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="e.g. SAVE20" />
                <Input label="Badge Label (optional)" name="badge_label" value={form.badge_label} onChange={e => setForm({ ...form, badge_label: e.target.value })} placeholder="e.g. SALE" />
              </div>
            </div>
          </Card>

          {/* ── Schedule ── */}
          <Card>
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-primary-600 font-semibold">Schedule</p>
                <h3 className="mt-1 text-base font-semibold text-eco-900">Validity period</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Start Date" name="start_date" type="datetime-local" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} required />
                <Input label="End Date" name="end_date" type="datetime-local" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} required />
              </div>
              <Input label="Min Purchase Amount (optional)" name="min_purchase_amount" type="number" step="0.01" value={form.min_purchase_amount} onChange={e => setForm({ ...form, min_purchase_amount: e.target.value })} placeholder="e.g. 500" />
            </div>
          </Card>

          {/* ── Advertisement Banner (with FIXED crop) ── */}
          <Card>
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-primary-600 font-semibold">Advertisement Banner</p>
                <h3 className="mt-1 text-base font-semibold text-eco-900">Banner image for homepage</h3>
              </div>

              {/* Image Source Toggle */}
              <div className="flex items-center gap-3 rounded-2xl border border-beige-200 bg-beige-50 p-1.5 w-fit">
                {['upload', 'product'].map(source => (
                  <button
                    key={source}
                    type="button"
                    onClick={() => {
                      setImageSource(source)
                      if (source === 'upload') setSelectedProductRef(null)
                      else { setOfferImage(null); setPreview(''); setObjectPosition({ x: 50, y: 50 }) }
                    }}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      imageSource === source
                        ? 'bg-white text-eco-900 shadow-sm'
                        : 'text-gray-500 hover:text-eco-700'
                    }`}
                  >
                    {source === 'upload' ? 'Upload new image' : 'Use product image'}
                  </button>
                ))}
              </div>

              {imageSource === 'upload' ? (
                <div className="space-y-3">
                  <Input
                    label="Banner Image"
                    name="offer_image"
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const file = e.target.files?.[0] || null
                      const url = file ? URL.createObjectURL(file) : ''
                      setOfferImage(file)
                      setPreview(url)
                      setSelectedProductRef(null)
                      setObjectPosition({ x: 50, y: 50 })
                    }}
                  />
                  <p className="mt-1.5 text-[11px] text-gray-400">Recommended: 1200 x 900 px. Max 10 MB.</p>

                  {preview && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-eco-800">Frame adjustment</p>
                      {/* Display context selector */}
                      <div>
                        <p className="text-[10px] text-gray-400 mb-1">Preview crop frame for:</p>
                        <div className="flex gap-1 rounded-xl border border-beige-200 bg-beige-50 p-1 w-fit">
                          {OFFER_CROP_CONTEXTS.map(ctx => (
                            <button
                              key={ctx.label}
                              type="button"
                              onClick={() => setCropAspect(ctx.ratio)}
                              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                                cropAspect === ctx.ratio
                                  ? 'bg-white text-eco-900 shadow-sm'
                                  : 'text-gray-500 hover:text-eco-700'
                              }`}
                            >
                              {ctx.label}
                              <span className="block text-[9px] font-normal opacity-60">{ctx.ratio} : 1</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <ImageCropFrame
                        key={`${preview}-${cropAspect}`}
                        src={preview}
                        aspect={cropAspect}
                        onChange={handleOfferCropChange}
                      />
                      <p className="text-[10px] text-gray-400">Drag frame to reposition. Drag the <span className="text-primary-600 font-medium">green corner</span> to resize. Switch context tabs to preview different display sizes.</p>

                      {/* Live carousel preview — uses original image with CSS object-position */}
                      <div className="rounded-2xl border border-beige-200 bg-white p-4 space-y-2 mt-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-primary-600 font-semibold">Live carousel preview</p>
                        <div className="overflow-hidden rounded-[1.2rem] bg-[#eef8ee]" style={{ aspectRatio: '2.7 / 1' }}>
                          <img
                            src={preview}
                            alt="Banner preview"
                            className="h-full w-full object-cover"
                            style={{ objectPosition: `${objectPosition.x}% ${objectPosition.y}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-gray-400 italic">The original image positioned via CSS — matches how the homepage renders it.</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-xs font-medium text-eco-800 mb-2">Select a product image</p>
                  <input
                    type="text"
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    placeholder="Search products by name..."
                    className="w-full mb-2 px-3 py-2 rounded-lg border border-beige-200 bg-white text-xs placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                  {productSearch && products.length > 0 && (
                    <div className="mb-2 max-h-48 overflow-y-auto rounded-lg border border-beige-200 bg-white p-1 text-xs">
                      {products
                        .filter(p => p.name?.toLowerCase().includes(productSearch.toLowerCase()))
                        .slice(0, 8)
                        .map(p => (
                          <button
                            key={`suggest-${p.id}`}
                            type="button"
                            onClick={() => handleSelectProductImage(p, 0)}
                            className="w-full text-left px-2 py-1 hover:bg-beige-50 rounded"
                          >
                            <div className="flex items-center gap-2">
                              <img src={(p.images || [])[0]?.image_url} alt={p.name} className="h-8 w-8 rounded object-cover" />
                              <div className="truncate">{p.name}</div>
                            </div>
                          </button>
                        ))}
                    </div>
                  )}
                  {products.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-48 overflow-y-auto rounded-xl border border-beige-200 bg-beige-50 p-2">
                      {products
                        .filter(p => productSearch
                          ? p.name?.toLowerCase().includes(productSearch.toLowerCase())
                          : true
                        )
                        .flatMap(product =>
                        (product.images || []).length > 0
                          ? product.images.map((img, idx) => (
                              <button
                                key={`${product.id}-${img.id || idx}`}
                                type="button"
                                onClick={() => handleSelectProductImage(product, idx)}
                                className={`relative overflow-hidden rounded-lg border-2 transition-all ${
                                  selectedProductRef?.imageUrl === img.image_url
                                    ? 'border-primary-500 ring-2 ring-primary-200'
                                    : 'border-white hover:border-beige-300'
                                }`}
                              >
                                <div className="aspect-[4/3]">
                                  <img
                                    src={img.image_url}
                                    alt={`${product.name} ${idx + 1}`}
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                                <div className="truncate px-1 py-0.5 text-[10px] text-gray-600 bg-white/90">
                                  {product.name}
                                </div>
                              </button>
                            ))
                          : []
                      )}
                    </div>
                  ) : productSearch ? (
                    <p className="text-sm text-gray-400 py-4 text-center">No products match &ldquo;{productSearch}&rdquo;.</p>
                  ) : (
                    <p className="text-sm text-gray-400">No products with images yet.</p>
                  )}

                  {/* Product image selected — show live preview */}
                  {preview && selectedProductRef && (
                    <div className="rounded-2xl border border-beige-200 bg-white p-4 space-y-2 mt-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-primary-600 font-semibold">Live carousel preview</p>
                      <div className="overflow-hidden rounded-[1.2rem] bg-[#eef8ee]" style={{ aspectRatio: '2.7 / 1' }}>
                        <img
                          src={preview}
                          alt="Banner preview"
                          className="h-full w-full object-cover"
                          style={{ objectPosition: `${objectPosition.x}% ${objectPosition.y}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Show on home screen checkbox */}
              <label className="flex items-center gap-3 rounded-2xl border border-beige-200 bg-beige-50 px-4 py-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOnHomepage}
                  onChange={e => setShowOnHomepage(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 accent-primary-500"
                />
                <div>
                  <p className="text-sm font-medium text-eco-900">Show on home screen banner</p>
                  <p className="text-xs text-gray-500">Display this offer banner in the homepage carousel</p>
                </div>
              </label>
            </div>
          </Card>

          {/* ── Products ── */}
          <Card>
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-primary-600 font-semibold">Products</p>
                <h3 className="mt-1 text-base font-semibold text-eco-900">Link products to this offer</h3>
              </div>
              {products.length > 0 ? (
                <div className="max-h-40 overflow-y-auto space-y-1.5 border border-beige-200 rounded-xl p-3">
                  {products.map(p => (
                    <label key={p.id} className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-beige-50 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(p.id)}
                        onChange={() => toggleProduct(p.id)}
                        className="accent-primary-500"
                      />
                      <span className="text-eco-900">{p.name}</span>
                      <span className="text-gray-400 text-xs ml-auto">{p?.base_price ? `₹${p?.base_price}` : ''}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No products available. Create products first.</p>
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar column */}
        <div>
          <Card className="p-6">
            <div className="space-y-3">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-primary-600">Status</p>
                <h3 className="mt-1 text-base font-semibold text-eco-900">Offer status</h3>
              </div>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => setForm({ ...form, is_active: e.target.checked })}
                  className="accent-primary-500"
                />
                <span className="text-sm font-medium text-eco-800">Active</span>
              </label>

              <Button type="submit" className="w-full mt-4" disabled={saving}>
                {saving ? 'Saving...' : isEditing ? 'Update Offer' : 'Create Offer'}
              </Button>
            </div>
          </Card>
        </div>
      </form>
    </div>
  )
}
