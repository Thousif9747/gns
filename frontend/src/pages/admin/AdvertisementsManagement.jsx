import { useState, useEffect } from 'react'
import { get, post, patch, del, extractList } from '../../api/client'
import { useToast } from '../../context/ToastContext'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Spinner from '../../components/ui/Spinner'
import Modal from '../../components/ui/Modal'
import ImageCropFrame from '../../components/ui/ImageCropFrame'

export default function AdvertisementsManagement() {
  const [products, setProducts] = useState([])
  const [adBanners, setAdBanners] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [announcementForm, setAnnouncementForm] = useState({ text: '', link_url: '', display_order: 0, is_active: true })
  const [loading, setLoading] = useState(true)
  const [adSaving, setAdSaving] = useState(false)
  const [adPreview, setAdPreview] = useState(null)
  const [adForm, setAdForm] = useState({
    title: '',
    link_url: '',
    display_order: 0,
    is_active: true,
    image: null,
    preview: '',
    imageSource: 'upload',
    selectedProductRef: null,
    objectPosition: { x: 50, y: 50 },
  })
  const [productSearch, setProductSearch] = useState('')
  const { showToast } = useToast()

  // Helper to select a product image and populate the ad form (shared by suggestions and image grid)
  async function selectProductImage(product, imgIndex = 0) {
    const img = (product.images || [])[imgIndex]
    if (!img) return
    let fileObj = null
    try {
      const resp = await fetch(img.image_url)
      if (!resp.ok) throw new Error(`Image request failed (${resp.status})`)
      const blob = await resp.blob()
      if (!blob.type.startsWith('image/')) throw new Error('The selected file is not an image')
      const ext = blob.type.split('/')[1] || 'jpg'
      fileObj = new File([blob], `product-image-${product.id}-${imgIndex}.${ext}`, { type: blob.type })
    } catch (error) {
      showToast({ title: 'Image unavailable', message: `${error.message}. Please upload the banner image instead.`, type: 'error' })
      return
    }
    setAdForm(prev => ({
      ...prev,
      selectedProductRef: { productName: product.name, imageUrl: img.image_url },
      preview: img.image_url,
      image: fileObj,
    }))
  }

  useEffect(() => {
    Promise.all([get('/catalog/products/', { all: 1, page_size: 200 }), get('/catalog/ad-banners/', { all: 1 }), get('/catalog/announcements/', { all: 1 })])
      .then(([productsRes, adRes, announcementRes]) => {
        if (productsRes.ok) setProducts(extractList(productsRes.data))
        if (adRes.ok) setAdBanners(extractList(adRes.data))
        if (announcementRes.ok) setAnnouncements(extractList(announcementRes.data))
      })
      .catch(() => showToast({ title: 'Error', message: 'Failed to load data', type: 'error' }))
      .finally(() => setLoading(false))
  }, [])

  async function handleAdSave(e) {
    e.preventDefault()
    if (!adForm.image) return
    setAdSaving(true)
    const fd = new FormData()
    fd.append('title', adForm.title)
    fd.append('link_url', adForm.link_url)
    fd.append('display_order', String(adForm.display_order || 0))
    fd.append('is_active', adForm.is_active ? 'true' : 'false')
    fd.append('image', adForm.image)
    fd.append('object_position', `${adForm.objectPosition.x}% ${adForm.objectPosition.y}%`)
    const res = await post('/catalog/ad-banners/', fd)
    if (res.ok) {
      setAdForm({
        title: '',
        link_url: '',
        display_order: 0,
        is_active: true,
        image: null,
        preview: '',
        imageSource: 'upload',
        selectedProductRef: null,
        objectPosition: { x: 50, y: 50 },
      })
      const refreshed = await get('/catalog/ad-banners/', { all: 1 })
      if (refreshed.ok) setAdBanners(extractList(refreshed.data))
      showToast({ title: 'Created', message: 'Advertisement created successfully', type: 'success' })
    } else {
      showToast({ title: 'Error', message: res.data?.detail || res.data?.error || 'Something went wrong', type: 'error' })
    }
    setAdSaving(false)
  }

  async function handleAnnouncementSave(e) {
    e.preventDefault()
    if (!announcementForm.text.trim()) return
    const res = await post('/catalog/announcements/', {
      ...announcementForm,
      text: announcementForm.text.trim(),
      display_order: Number(announcementForm.display_order) || 0,
    })
    if (res.ok) {
      setAnnouncements(prev => [...prev, res.data].sort((a, b) => a.display_order - b.display_order))
      setAnnouncementForm({ text: '', link_url: '', display_order: 0, is_active: true })
      showToast({ title: 'Announcement live', message: 'The scrolling header message was added.', type: 'success' })
    } else showToast({ title: 'Could not save', message: res.data?.detail || res.data?.error || 'Check the announcement fields.', type: 'error' })
  }

  async function toggleAnnouncement(item) {
    const res = await patch(`/catalog/announcements/${item.id}/`, { is_active: !item.is_active })
    if (res.ok) setAnnouncements(prev => prev.map(entry => entry.id === item.id ? res.data : entry))
  }

  async function deleteAnnouncement(id) {
    const res = await del(`/catalog/announcements/${id}/`)
    if (res.ok) setAnnouncements(prev => prev.filter(item => item.id !== id))
  }

  async function handleDeleteAd(id) {
    const res = await del(`/catalog/ad-banners/${id}/`)
    if (res.ok) {
      setAdBanners(prev => prev.filter(item => item.id !== id))
      showToast({ title: 'Deleted', message: 'Advertisement deleted successfully', type: 'success' })
    } else {
      showToast({ title: 'Error', message: res.data?.detail || res.data?.error || 'Something went wrong', type: 'error' })
    }
  }

  function handleAdCropChange({ objectPosition }) {
    const [x, y] = objectPosition.split('% ').map(v => parseInt(v, 10))
    setAdForm(prev => ({ ...prev, objectPosition: { x: isNaN(x) ? 50 : x, y: isNaN(y) ? 50 : y } })
    )
  }

  if (loading) return <Spinner />

  return (
    <div className="ops-route ops-admin-page space-y-6" data-page="advertisements">
      {/* Header */}
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-eco-100 via-beige-50 to-cream text-eco-900 p-6 lg:p-8 shadow-modal border border-beige-200">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(90,160,95,0.12),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(217,164,65,0.14),transparent_30%)]" />
        <div className="relative">
          <p className="text-xs uppercase tracking-[0.3em] text-primary-600 mb-2">Marketing</p>
          <h1 className="font-display text-4xl md:text-5xl">Advertisements</h1>
          <p className="mt-3 text-gray-700 max-w-xl">Manage standalone banner ads that appear in the homepage carousel.</p>
        </div>
      </section>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5 bg-white/90 border-beige-200">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Total ads</p>
          <p className="mt-2 text-3xl font-bold text-eco-900">{adBanners.length}</p>
        </Card>
        <Card className="p-5 bg-white/90 border-beige-200">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Active</p>
          <p className="mt-2 text-3xl font-bold text-eco-900">{adBanners.filter(a => a.is_active).length}</p>
        </Card>
        <Card className="p-5 bg-white/90 border-beige-200">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Products with images</p>
          <p className="mt-2 text-3xl font-bold text-eco-900">{products.filter(p => (p.images || []).length > 0).length}</p>
        </Card>
      </div>

      <section className="rounded-[2rem] border border-beige-200 bg-white/90 p-5 shadow-card lg:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary-600">Header ticker</p>
        <div className="mt-2 grid gap-6 xl:grid-cols-[1fr_.9fr]">
          <div>
            <h2 className="font-display text-3xl text-eco-900">Scrolling announcements</h2>
            <p className="mt-2 text-sm text-gray-600">Publish delivery updates, bulk-order messages and short offers in the customer header.</p>
            <form onSubmit={handleAnnouncementSave} className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><Input label="Announcement text" value={announcementForm.text} maxLength={280} onChange={e => setAnnouncementForm(v => ({ ...v, text: e.target.value }))} placeholder="Free delivery on orders above ₹999" /></div>
              <Input label="Optional link" value={announcementForm.link_url} onChange={e => setAnnouncementForm(v => ({ ...v, link_url: e.target.value }))} placeholder="/offers or https://…" />
              <Input label="Display order" type="number" min="0" value={announcementForm.display_order} onChange={e => setAnnouncementForm(v => ({ ...v, display_order: e.target.value }))} />
              <label className="flex items-center gap-3 text-sm font-medium text-eco-900"><input type="checkbox" checked={announcementForm.is_active} onChange={e => setAnnouncementForm(v => ({ ...v, is_active: e.target.checked }))} className="accent-primary-500" /> Active immediately</label>
              <Button type="submit">Add announcement</Button>
            </form>
          </div>
          <div className="space-y-2 rounded-2xl bg-beige-50 p-3">
            {announcements.length ? announcements.map(item => <div key={item.id} className="flex items-center gap-3 rounded-xl border border-beige-200 bg-white p-3">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.is_active ? 'bg-emerald-500' : 'bg-gray-300'}`} />
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-eco-900">{item.text}</p><p className="text-[11px] text-gray-500">Order {item.display_order}{item.link_url ? ' · Linked' : ''}</p></div>
              <button type="button" onClick={() => toggleAnnouncement(item)} className="text-xs font-bold text-primary-700">{item.is_active ? 'Pause' : 'Activate'}</button>
              <button type="button" onClick={() => deleteAnnouncement(item.id)} className="text-xs font-bold text-red-600">Delete</button>
            </div>) : <p className="p-5 text-center text-sm text-gray-500">No announcements yet.</p>}
          </div>
        </div>
      </section>

      {/* Ad Form */}
      <section className="rounded-[2rem] border border-beige-200 bg-white/90 p-5 lg:p-6 shadow-card space-y-5">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-primary-600 mb-2">Homepage ads</p>
          <h2 className="font-display text-3xl text-eco-900">Standalone advertisement banners</h2>
          <p className="mt-2 text-sm text-gray-600 max-w-2xl">
            Upload external ad creatives here. These banners do not need to belong to a product and will show in the homepage carousel dynamically.
          </p>
        </div>

        {/* Image Source Toggle */}
        <div className="flex items-center gap-3 rounded-2xl border border-beige-200 bg-beige-50 p-1.5 w-fit">
          {['upload', 'product'].map(source => (
            <button
              key={source}
              type="button"
              onClick={() => {
                setAdForm(prev => ({
                  ...prev,
                  imageSource: source,
                  image: source === 'upload' ? prev.image : null,
                  preview: source === 'upload' ? prev.preview : '',
                  selectedProductRef: source === 'product' ? prev.selectedProductRef : null,
                }))
              }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                adForm.imageSource === source
                  ? 'bg-white text-eco-900 shadow-sm'
                  : 'text-gray-500 hover:text-eco-700'
              }`}
            >
              {source === 'upload' ? 'Upload new image' : 'Use product image'}
            </button>
          ))}
        </div>

        <form onSubmit={handleAdSave} className="grid gap-4 lg:grid-cols-[1fr_0.7fr_auto] items-end">
          <Input
            label="Ad Title"
            name="ad_title"
            value={adForm.title}
            onChange={e => setAdForm(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Summer sale, new launch, etc."
          />
          <Input
            label="Click-through link"
            name="ad_link_url"
            value={adForm.link_url}
            onChange={e => setAdForm(prev => ({ ...prev, link_url: e.target.value }))}
            placeholder="/products or https://…"
          />
          <Input
            label="Display Order"
            name="ad_display_order"
            type="number"
            value={adForm.display_order}
            onChange={e => setAdForm(prev => ({ ...prev, display_order: e.target.value }))}
          />
          <Button type="submit" disabled={adSaving || !adForm.image} className="h-[48px]">
            {adSaving ? 'Saving...' : 'Add Ad'}
          </Button>

          <div className="lg:col-span-3 grid gap-4 lg:grid-cols-[1fr_1.1fr]">
            {adForm.imageSource === 'upload' ? (
              <>
                <div>
                  <Input
                    label="Banner Image"
                    name="ad_image"
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const file = e.target.files?.[0] || null
                      const url = file ? URL.createObjectURL(file) : ''
                      setAdForm(prev => ({
                        ...prev,
                        image: file,
                        preview: url,
                        selectedProductRef: null,
                        objectPosition: { x: 50, y: 50 },
                      }))
                    }}
                  />
                  <p className="mt-1.5 text-[11px] text-gray-400">
                    Recommended: 1200 x 900 px. Max 10 MB.
                  </p>
                </div>

                {adForm.preview && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-eco-800">Crop frame — homepage carousel (2.7 : 1)</p>
                    <ImageCropFrame
                      key={adForm.preview}
                      src={adForm.preview}
                      aspect={2.7}
                      onChange={handleAdCropChange}
                    />
                    <p className="text-[10px] text-gray-400">Drag frame to reposition. Drag the <span className="text-primary-600 font-medium">green corner</span> to resize. Frame matches the homepage carousel.</p>
                  </div>
                )}
              </>
            ) : (
              <div className="lg:col-span-2">
                <p className="text-xs font-medium text-eco-800 mb-2">Select a product image</p>
                {/* Product search */}
                <input
                  type="text"
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  placeholder="Search products by name..."
                  className="w-full mb-2 px-3 py-2 rounded-lg border border-beige-200 bg-white text-xs placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                {/* Autocomplete suggestions (click to select product and first image) */}
                {productSearch && products.length > 0 && (
                  <div className="mb-2 max-h-48 overflow-y-auto rounded-lg border border-beige-200 bg-white p-1 text-xs">
                    {products
                      .filter(p => p.name?.toLowerCase().includes(productSearch.toLowerCase()))
                      .slice(0, 8)
                      .map(p => (
                        <button
                          key={`suggest-${p.id}`}
                          type="button"
                          onClick={() => selectProductImage(p, 0)}
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
                              onClick={() => selectProductImage(product, idx)}
                              className={`relative overflow-hidden rounded-lg border-2 transition-all ${
                                adForm.selectedProductRef?.imageUrl === img.image_url
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

                {adForm.preview && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-medium text-eco-800">Crop frame — homepage carousel (2.7 : 1)</p>
                    <ImageCropFrame
                      key={adForm.preview}
                      src={adForm.preview}
                      aspect={2.7}
                      onChange={handleAdCropChange}
                    />
                    <p className="text-[10px] text-gray-400">Drag frame to reposition. Drag the <span className="text-primary-600 font-medium">green corner</span> to resize.</p>
                  </div>
                )}
              </div>
            )}

            <label className="flex items-center gap-3 rounded-2xl border border-beige-200 bg-beige-50 px-4 py-3">
              <input
                type="checkbox"
                checked={adForm.is_active}
                onChange={e => setAdForm(prev => ({ ...prev, is_active: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 accent-primary-500"
              />
              <div>
                <p className="text-sm font-medium text-eco-900">Active</p>
                <p className="text-xs text-gray-500">Show this banner on the homepage</p>
              </div>
            </label>
          </div>

          {/* Live carousel preview */}
          {(adForm.preview || adForm.selectedProductRef) && (
                    <div className="lg:col-span-3 rounded-2xl border border-beige-200 bg-white p-4 space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-primary-600 font-semibold">Live carousel preview</p>
              <div className="overflow-hidden rounded-[1.2rem] bg-[#eef8ee]" style={{ aspectRatio: '2.7 / 1' }}>
                <img
                  src={adForm.preview || adForm.selectedProductRef?.imageUrl}
                  alt="Ad preview"
                  className="h-full w-full object-cover"
                  style={{ objectPosition: `${adForm.objectPosition.x}% ${adForm.objectPosition.y}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-400 italic">Shown without text overlays — matches the new clean homepage ad style.</p>
            </div>
          )}
        </form>

        {/* Ad Banners List */}
        <div className="pt-4 border-t border-beige-200">
          <h3 className="font-display text-xl text-eco-900 mb-4">Existing Advertisements</h3>
          {adBanners.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {adBanners.map(ad => (
                <div key={ad.id} className="rounded-2xl border border-beige-200 bg-white p-4 space-y-4 shadow-sm">
                  <div className="relative h-32 overflow-hidden rounded-xl bg-beige-50">
                    <img
                      src={ad.image_url}
                      alt={ad.title || 'Banner'}
                      className="h-full w-full object-cover"
                      style={ad.object_position ? { objectPosition: ad.object_position } : {}}
                    />
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-eco-900">{ad.title || 'Untitled banner'}</p>
                      <p className="mt-1 text-xs text-gray-500">Display order {ad.display_order ?? 0}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0 ${ad.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {ad.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => setAdPreview(ad)}>
                        View
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDeleteAd(ad.id)}>
                        Delete
                      </Button>
                      <Button size="sm" variant="outline" className="!text-red-600 hover:!bg-red-50" onClick={async () => {
                        const res = await post(`/catalog/ad-banners/${ad.id}/remove-image/`, {})
                        if (res.ok) {
                          setAdBanners(prev => prev.map(item =>
                            item.id === ad.id ? { ...item, image_url: null, image: null } : item
                          ))
                          showToast({ title: 'Removed', message: 'Image removed successfully', type: 'success' })
                        } else {
                          showToast({ title: 'Error', message: res.data?.detail || res.data?.error || 'Something went wrong', type: 'error' })
                        }
                      }}>
                        Remove Image
                      </Button>
                    </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No standalone advertisement banners yet.</p>
          )}
        </div>
      </section>

      {/* Preview Modal */}
      <Modal
        isOpen={!!adPreview}
        onClose={() => setAdPreview(null)}
        title={adPreview?.title || 'Advertisement preview'}
      >
        {adPreview && (
          <div className="space-y-5">
            <p className="text-xs uppercase tracking-[0.2em] text-primary-600 font-semibold">Homepage carousel preview</p>
            <div className="overflow-hidden rounded-[1.4rem] bg-[#eef8ee]">
              <img
                src={adPreview.image_url}
                alt={adPreview.title || 'Advertisement'}
                className="h-full w-full object-cover"
                style={{ maxHeight: 300, objectPosition: adPreview.object_position || '50% 50%' }}
              />
            </div>
            <p className="text-xs text-gray-500 italic">Shown without text overlays — matches the new clean homepage ad style.</p>
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-beige-200">
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${adPreview.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                {adPreview.is_active ? 'Active' : 'Inactive'}
              </span>
              <p className="text-xs text-gray-500">Display order {adPreview.display_order ?? 0}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
