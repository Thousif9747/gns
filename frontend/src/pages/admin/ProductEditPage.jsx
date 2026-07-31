import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { get, post, patch, del, extractList } from '../../api/client'
import { useToast } from '../../context/ToastContext'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Spinner from '../../components/ui/Spinner'
import { PageHeader } from '../../components/ui/OperationsUI'
import ImageCropperModal from '../../components/ui/ImageCropperModal'
import { getRecommendedDiscount, getSuggestedSellingPrice } from '../../utils/catalogPresentation'
import { formatPrice } from '../../utils/formatters'

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export default function ProductEditPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState([])
  const [cropModal, setCropModal] = useState(null)
  const [deletedVariantIds, setDeletedVariantIds] = useState([])
  const [form, setForm] = useState(null)
  const [productId, setProductId] = useState(null)
  const { showToast } = useToast()

  useEffect(() => {
    async function load() {
      const [prodRes, catRes] = await Promise.all([get(`/catalog/products/${slug}/`), get('/catalog/categories/')])
      if (catRes.ok) setCategories(extractList(catRes.data))
      if (prodRes.ok) {
        const p = prodRes.data
        setProductId(p.id)
        setForm({
          name: p.name,
          slug: p.slug,
          description: p.description || '',
          base_price: p?.base_price,
          mrp: p?.mrp || '',
          category: typeof p.category === 'object' ? p.category?.id || '' : p.category || '',
          unit_label: p.unit_label || '',
          existingImages: (p.images || []).map(img => ({ id: img.id, image_url: img.image_url, is_homepage_banner: !!img.is_homepage_banner, sort_order: img.sort_order ?? 0, object_position: img.object_position || '50% 50%', card_object_position: img.card_object_position || '50% 50%' })),
          newImages: [],
          is_active: p.is_active ?? false,
          is_available: p.is_available ?? false,
          is_featured: p.is_featured ?? false,
          variants: [],
        })
        const varRes = await get(`/catalog/products/${slug}/variants/`)
        if (varRes.ok) {
          const existing = extractList(varRes.data)
          setForm(prev => prev ? { ...prev, variants: existing.map(v => ({ id: v.id, name: v.name, sku: v.sku, price: String(v.price), mrp: v.mrp ? String(v.mrp) : '', stock: String(v.stock) })) } : prev)
        }
      } else {
        showToast({ title: 'Error', message: prodRes.data?.detail || prodRes.data?.error || 'Failed to load product', type: 'error' })
      }
      setLoading(false)
    }
    load()
  }, [slug])

  function handleCropModalSave({ objectPosition, positions }) {
    if (!cropModal) return
    const { key } = cropModal
    const cardPos = positions?.['Product Card'] || objectPosition
    setForm(prev => {
      if (!prev) return prev
      if (key.startsWith('existing-')) {
        const id = key.replace('existing-', '')
        return { ...prev, existingImages: prev.existingImages.map(img => String(img.id) === id ? { ...img, is_homepage_banner: true, object_position: objectPosition, card_object_position: cardPos } : img) }
      }
      if (key.startsWith('new-')) {
        const idx = parseInt(key.replace('new-', ''), 10)
        return { ...prev, newImages: prev.newImages.map((img, i) => i === idx ? { ...img, is_homepage_banner: true, object_position: objectPosition, card_object_position: cardPos } : img) }
      }
      return prev
    })
    setCropModal(null)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form) return
    const invalidVariant = form.variants.find(v =>
      v.mrp !== '' && v.mrp != null && Number(v.mrp) <= Number(v.price || 0)
    )
    if (invalidVariant) {
      showToast({
        title: `Check variant: ${invalidVariant.name || 'Unnamed variant'}`,
        message: `Its MRP (₹${Number(invalidVariant.mrp).toFixed(2)}) must be greater than its selling price (₹${Number(invalidVariant.price || 0).toFixed(2)}).`,
        type: 'error',
      })
      return
    }
    setSaving(true)
    const payload = new FormData()
    payload.append('name', form.name)
    payload.append('slug', slugify(form.slug || form.name))
    payload.append('description', form.description)
    payload.append('base_price', String(parseFloat(form.base_price)))
    payload.append('mrp', form.mrp ? String(parseFloat(form.mrp)) : '')
    payload.append('category', form.category)
    payload.append('unit_label', form.unit_label)
    payload.append('is_active', form.is_active ? 'true' : 'false')
    payload.append('is_available', form.is_available ? 'true' : 'false')
    payload.append('is_featured', form.is_featured ? 'true' : 'false')
    payload.append('existing_image_state', JSON.stringify(form.existingImages))
    payload.append('new_image_banners', JSON.stringify(form.newImages.map(img => !!img.is_homepage_banner)))
    payload.append('new_image_positions', JSON.stringify(form.newImages.map(img => img.object_position || '50% 50%')))
    payload.append('new_card_positions', JSON.stringify(form.newImages.map(img => img.card_object_position || '50% 50%')))
    if (form.newImages.length > 0) form.newImages.forEach(item => payload.append('images', item.file))
    const res = await patch(`/catalog/products/${slug}/`, payload)
    if (res.ok) {
      // Process deleted variants
      for (const id of deletedVariantIds) {
        await del(`/catalog/product-variants/${id}/`)
      }
      // Process new variants
      for (const v of form.variants) {
        if (!v.id) {
          const varRes = await post('/catalog/product-variants/', { product: productId, name: v.name, sku: v.sku, price: parseFloat(v.price || 0), mrp: v.mrp ? parseFloat(v.mrp) : null, stock: parseInt(v.stock || 0, 10) })
          if (!varRes.ok) {
            const errData = varRes.data
            const msg = errData?.detail || errData?.error || (errData?.non_field_errors?.join('; ')) || Object.values(errData || {}).find(v => Array.isArray(v))?.join('; ') || `Failed to create variant "${v.name}"`
            showToast({ title: `Variant Error: ${v.name || 'Unnamed variant'}`, message: msg, type: 'error' })
            setSaving(false)
            return
          }
        }
      }
      // Process modified existing variants
      for (const v of form.variants) {
        if (v.id) {
          const varRes = await patch(`/catalog/product-variants/${v.id}/`, { name: v.name, sku: v.sku, price: parseFloat(v.price || 0), mrp: v.mrp ? parseFloat(v.mrp) : null, stock: parseInt(v.stock || 0, 10) })
          if (!varRes.ok) {
            const errData = varRes.data
            const msg = errData?.detail || errData?.error || (errData?.non_field_errors?.join('; ')) || Object.values(errData || {}).find(v => Array.isArray(v))?.join('; ') || 'Failed to update a variant'
            showToast({ title: `Variant Error: ${v.name || 'Unnamed variant'}`, message: msg, type: 'error' })
            setSaving(false)
            return
          }
        }
      }
      showToast({ title: 'Updated', message: 'Product updated successfully', type: 'success' })
      navigate('/admin/products')
    } else {
      showToast({ title: 'Error', message: res.data?.detail || res.data?.error || 'Something went wrong', type: 'error' })
    }
    setSaving(false)
  }

  if (loading || !form) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>

  return (
    <div className="ops-route ops-admin-page space-y-6" data-page="product-edit">
      <PageHeader eyebrow="Catalog" title="Edit product" description="Update product information, pricing and availability." />
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-eco-100 via-beige-50 to-cream text-eco-900 p-6 lg:p-8 shadow-modal border border-beige-200">
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-primary-600 mb-2">Catalog Management</p>
            <h1 className="font-display text-4xl md:text-5xl">Edit Product</h1>
          </div>
          <Button variant="outline" onClick={() => navigate('/admin/products')}>Back to products</Button>
        </div>
      </section>

      <form onSubmit={handleSave} className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <div className="space-y-4">
              <Input label="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              <Input label="Slug" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} required />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea rows={6} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-gray-300 resize-y min-h-[120px]" placeholder="Enter product description..." />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Selling Price" type="number" min="0" step="0.01" value={form.base_price} onChange={e => setForm({ ...form, base_price: e.target.value })} />
                <Input label="Genuine MRP" type="number" min="0" step="0.01" value={form.mrp} onChange={e => setForm({ ...form, mrp: e.target.value })} placeholder="Printed/manufacturer MRP" />
                <Input label="Unit Label" value={form.unit_label} onChange={e => setForm({ ...form, unit_label: e.target.value })} placeholder="e.g. per piece, per pack, per kg" />
              </div>
              {Number(form.mrp) > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                  <p className="text-xs font-semibold text-emerald-900">
                    Recommended tier: {getRecommendedDiscount(form.mrp)}% off. Suggested selling price {formatPrice(getSuggestedSellingPrice(form.mrp))}
                  </p>
                  <button type="button" onClick={() => setForm({ ...form, base_price: getSuggestedSellingPrice(form.mrp) })} className="rounded-full bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800">
                    Apply suggestion
                  </button>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-eco-800">Category</label>
                <select className="w-full px-4 py-3 rounded-xl border" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
          </Card>

          <Card>
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.25em] text-primary-600">Media</p>
              <Input type="file" multiple accept="image/*" onChange={e => {
                const files = Array.from(e.target.files || [])
                setForm(prev => ({ ...prev, newImages: [ ...prev.newImages, ...files.map(file => ({ file, preview: URL.createObjectURL(file), is_homepage_banner: false })) ] }))
              }} />
              <p className="text-[10px] text-gray-400">Max 10MB per image</p>

              {form.existingImages.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-eco-700">Current gallery</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-xl border border-beige-200 bg-beige-50 p-3">
                    {form.existingImages.map((image, index) => (
                      <div key={image.id} className="space-y-2">
                        <div className="relative overflow-hidden rounded-lg border border-white shadow-sm bg-white">
                          <img src={image.image_url} alt={`Product image ${index + 1}`} className="h-32 w-full object-cover" />
                          <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-eco-700 shadow">{index + 1}</span>
                          <button
                            type="button"
                            onClick={async () => {
                              const res = await del(`/catalog/product-images/${image.id}/`)
                              if (res.ok) {
                                setForm(prev => ({ ...prev, existingImages: prev.existingImages.filter(img => img.id !== image.id) }))
                                showToast({ title: 'Deleted', message: 'Image deleted successfully', type: 'success' })
                              } else {
                                showToast({ title: 'Error', message: res.data?.detail || res.data?.error || 'Something went wrong', type: 'error' })
                              }
                            }}
                            className="absolute right-2 top-2 flex items-center justify-center w-6 h-6 rounded-full bg-red-500/80 text-white shadow-sm hover:bg-red-600 transition-colors"
                            title="Delete this image"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                          {/* Homepage ad pill — click opens crop modal */}
                            {image.is_homepage_banner ? (
                            <div className="absolute inset-x-2 bottom-2 flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const cropKey = `existing-${image.id}`
                                  setCropModal({ key: cropKey, imageUrl: image.image_url, objectPosition: image.object_position, cardObjectPosition: image.card_object_position })
                                }}
                                className="flex-1 flex items-center gap-1.5 rounded-full bg-primary-500/90 px-3 py-1.5 text-[10px] font-semibold text-white shadow-sm hover:bg-primary-600 transition-colors"
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                Edit Crop
                              </button>
                              <button
                                type="button"
                                onClick={() => setForm(prev => ({ ...prev, existingImages: prev.existingImages.map(img => img.id === image.id ? { ...img, is_homepage_banner: false } : img) }))}
                                className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-red-400/80 text-white shadow-sm hover:bg-red-500 transition-colors"
                                title="Remove as homepage ad"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </div>
                            ) : (
                            <button
                              type="button"
                              onClick={() => {
                                const cropKey = `existing-${image.id}`
                                setCropModal({ key: cropKey, imageUrl: image.image_url, objectPosition: image.object_position, cardObjectPosition: image.card_object_position })
                              }}
                              className="absolute inset-x-2 bottom-2 flex items-center justify-center gap-1.5 rounded-full bg-white/92 px-3 py-1.5 text-[10px] font-semibold text-eco-800 shadow-sm hover:bg-white transition-colors"
                            >
                              <svg className="w-3 h-3 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                              Set as Homepage Ad
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {form.newImages.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-eco-700">New uploads</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-xl border border-beige-200 bg-beige-50 p-3">
                    {form.newImages.map((image, index) => (
                      <div key={`${image.preview}-${index}`} className="space-y-2">
                        <div className="relative overflow-hidden rounded-lg border border-white shadow-sm bg-white">
                          <img src={image.preview} alt={`New product image ${index + 1}`} className="h-32 w-full object-cover" />
                          <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-eco-700 shadow">{index + 1}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setForm(prev => ({ ...prev, newImages: prev.newImages.filter((_, i) => i !== index) }))
                            }}
                            className="absolute right-2 top-2 flex items-center justify-center w-6 h-6 rounded-full bg-red-500/80 text-white shadow-sm hover:bg-red-600 transition-colors"
                            title="Remove this image"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                          {/* Homepage ad pill — click opens crop modal */}
                              {image.is_homepage_banner ? (
                            <div className="absolute inset-x-2 bottom-2 flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const cropKey = `new-${index}`
                                  setCropModal({ key: cropKey, imageUrl: image.preview, objectPosition: image.object_position, cardObjectPosition: image.card_object_position })
                                }}
                                className="flex-1 flex items-center gap-1.5 rounded-full bg-primary-500/90 px-3 py-1.5 text-[10px] font-semibold text-white shadow-sm hover:bg-primary-600 transition-colors"
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                Edit Crop
                              </button>
                              <button
                                type="button"
                                onClick={() => setForm(prev => ({ ...prev, newImages: prev.newImages.map((img, i) => i === index ? { ...img, is_homepage_banner: false } : img) }))}
                                className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-red-400/80 text-white shadow-sm hover:bg-red-500 transition-colors"
                                title="Remove as homepage ad"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                const cropKey = `new-${index}`
                                setCropModal({ key: cropKey, imageUrl: image.preview, objectPosition: image.object_position, cardObjectPosition: image.card_object_position })
                              }}
                              className="absolute inset-x-2 bottom-2 flex items-center justify-center gap-1.5 rounded-full bg-white/92 px-3 py-1.5 text-[10px] font-semibold text-eco-800 shadow-sm hover:bg-white transition-colors"
                            >
                              <svg className="w-3 h-3 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                              Set as Homepage Ad
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.25em] text-primary-600">Variants</p>
              <p className="text-xs text-gray-500 -mt-2">Add size/quantity options (e.g., 250ml, 500ml, 1L)</p>

              {form.variants.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wider text-gray-500">
                        <th className="pb-2 pr-2 font-medium">Name</th>
                        <th className="pb-2 pr-2 font-medium">SKU</th>
                        <th className="pb-2 pr-2 font-medium">Price (₹)</th>
                        <th className="pb-2 pr-2 font-medium">MRP</th>
                        <th className="pb-2 pr-2 font-medium">Stock</th>
                        <th className="pb-2 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.variants.map((v, i) => (
                        <tr key={v.id || `new-${i}`} className="border-b border-gray-100">
                          <td className="py-1.5 pr-2">
                            <input
                              type="text"
                              value={v.name}
                              onChange={e => {
                                const variants = [...form.variants]
                                variants[i] = { ...variants[i], name: e.target.value }
                                setForm({ ...form, variants })
                              }}
                              className="w-full px-2 py-1 text-sm rounded border border-gray-300"
                              placeholder="e.g. 250ml"
                            />
                          </td>
                          <td className="py-1.5 pr-2">
                            <input
                              type="text"
                              value={v.sku}
                              onChange={e => {
                                const variants = [...form.variants]
                                variants[i] = { ...variants[i], sku: e.target.value }
                                setForm({ ...form, variants })
                              }}
                              className="w-full px-2 py-1 text-sm rounded border border-gray-300"
                              placeholder="SKU"
                            />
                          </td>
                          <td className="py-1.5 pr-2">
                            <input
                              type="number"
                              value={v.price}
                              onChange={e => {
                                const variants = [...form.variants]
                                variants[i] = { ...variants[i], price: e.target.value }
                                setForm({ ...form, variants })
                              }}
                              className="w-full px-2 py-1 text-sm rounded border border-gray-300"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                            />
                          </td>
                          <td className="py-1.5 pr-2">
                            <input
                              type="number"
                              value={v.mrp || ''}
                              onChange={e => {
                                const variants = [...form.variants]
                                variants[i] = { ...variants[i], mrp: e.target.value }
                                setForm({ ...form, variants })
                              }}
                              className="w-full px-2 py-1 text-sm rounded border border-gray-300"
                              min="0"
                              step="0.01"
                              placeholder="MRP"
                            />
                          </td>
                          <td className="py-1.5 pr-2">
                            <input
                              type="number"
                              value={v.stock}
                              onChange={e => {
                                const variants = [...form.variants]
                                variants[i] = { ...variants[i], stock: e.target.value }
                                setForm({ ...form, variants })
                              }}
                              className="w-full px-2 py-1 text-sm rounded border border-gray-300"
                              min="0"
                              placeholder="0"
                            />
                          </td>
                          <td className="py-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                if (v.id) {
                                  setDeletedVariantIds(prev => [...prev, v.id])
                                }
                                setForm({ ...form, variants: form.variants.filter((_, idx) => idx !== i) })
                              }}
                              className="text-red-500 hover:text-red-700 text-sm font-medium"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                onClick={() => setForm({ ...form, variants: [...form.variants, { name: '', sku: '', price: '', mrp: '', stock: '' }] })}
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Variant
              </Button>
            </div>
          </Card>
        </div>

        <div>
          <Card className="p-6">
            <div className="space-y-3">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-primary-600">Status</p>
                <h3 className="mt-1 text-base font-semibold text-eco-900">Visibility</h3>
              </div>
              <label className="flex items-center gap-3"><input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} /> Active</label>
              <label className="flex items-center gap-3"><input type="checkbox" checked={form.is_available} onChange={e => setForm({ ...form, is_available: e.target.checked })} /> Available</label>
              <label className="flex items-center gap-3"><input type="checkbox" checked={form.is_featured} onChange={e => setForm({ ...form, is_featured: e.target.checked })} /> Featured</label>

              <Button type="submit" className="w-full mt-4" disabled={saving}>{saving ? 'Saving...' : 'Update Product'}</Button>
            </div>
          </Card>
        </div>
      </form>

      {cropModal && (
        <ImageCropperModal
          isOpen={!!cropModal}
          onClose={() => setCropModal(null)}
          onSave={handleCropModalSave}
          imageUrl={cropModal.imageUrl}
          aspectRatio={1.4}
          cropContexts={[
            { label: 'Product Card', ratio: 1 },
            { label: 'Homepage Banner', ratio: 1.4 },
          ]}
          initialPositions={{
            'Homepage Banner': cropModal.objectPosition || '50% 50%',
            'Product Card': cropModal.cardObjectPosition || '50% 50%',
          }}
          title="Position Image"
        />
      )}
    </div>
  )
}
