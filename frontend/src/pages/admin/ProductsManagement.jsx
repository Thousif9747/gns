import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Cropper from 'react-easy-crop'
import { get, post, patch, del, extractList } from '../../api/client'
import { useToast } from '../../context/ToastContext'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { PageHeader } from '../../components/ui/OperationsUI'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import { formatPrice } from '../../utils/formatters'
import { getDiscountPercent } from '../../utils/catalogPresentation'
import 'react-easy-crop/react-easy-crop.css'

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export default function ProductsManagement() {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [imageCrops, setImageCrops] = useState({}) // key -> { crop: {x,y}, zoom }
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [productToDelete, setProductToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    base_price: '',
    category: '',
    unit_label: '',
    existingImages: [],
    newImages: [],
    is_active: false,
    is_available: false,
    is_featured: false,
  })
  const { showToast } = useToast()

  // ── Quick Variant Manager state ──
  const [variantModal, setVariantModal] = useState(null) // { product, variants: [] }
  const [variantRows, setVariantRows] = useState([])
  const [variantSaving, setVariantSaving] = useState(false)

  function openVariantModal(product) {
    // Fetch existing variants for the product
    get(`/catalog/products/${product.slug}/variants/`).then(res => {
      const existing = res.ok ? (res.data.results || res.data || []) : []
      setVariantRows(existing.map(v => ({ id: v.id, name: v.name, sku: v.sku, price: String(v.price), stock: String(v.stock), _new: false })))
      setVariantModal(product)
    })
  }

  function closeVariantModal() {
    setVariantModal(null)
    setVariantRows([])
  }

  function addVariantRow() {
    setVariantRows(prev => [...prev, { id: null, name: '', sku: '', price: '', stock: '', _new: true }])
  }

  function removeVariantRow(index) {
    setVariantRows(prev => prev.filter((_, i) => i !== index))
  }

  function updateVariantRow(index, field, value) {
    setVariantRows(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r))
  }

  // Extract readable error message from backend API error responses
  function getVariantError(data) {
    if (!data) return 'Failed to save variants'
    if (typeof data === 'string') return data
    if (data.detail) return data.detail
    if (data.error) return data.error
    if (data.non_field_errors?.length) return data.non_field_errors.join('; ')
    // Django field-level errors: { field_name: ["message"] }
    const fieldErrors = Object.values(data).filter(v => Array.isArray(v)).flat()
    if (fieldErrors.length) return fieldErrors.join('; ')
    return 'Failed to save variants'
  }

  async function saveVariants() {
    if (!variantModal) return
    setVariantSaving(true)
    try {
      for (const row of variantRows) {
        const payload = {
          product: variantModal.id,
          name: row.name,
          sku: row.sku || '',
          price: parseFloat(row.price || 0),
          stock: parseInt(row.stock || 0, 10),
        }
        let res
        if (row.id && !row._new) {
          // Update existing
          res = await patch(`/catalog/product-variants/${row.id}/`, payload)
        } else if (row.name && row.price) {
          // Create new
          res = await post('/catalog/product-variants/', payload)
        }
        if (res && !res.ok) {
          showToast({ title: 'Error', message: getVariantError(res.data), type: 'error' })
          setVariantSaving(false)
          return
        }
      }
      showToast({ title: 'Saved', message: 'Variants updated successfully', type: 'success' })
      closeVariantModal()
    } catch (err) {
      showToast({ title: 'Error', message: err?.message || 'Failed to save variants', type: 'error' })
    }
    setVariantSaving(false)
  }

  useEffect(() => {
    Promise.all([get('/catalog/products/', { all: 1 }), get('/catalog/categories/')])
      .then(([productsRes, categoriesRes]) => {
        if (productsRes.ok) setProducts(extractList(productsRes.data))
        if (categoriesRes.ok) setCategories(extractList(categoriesRes.data))
      })
      .catch(() => showToast({ title: 'Error', message: 'Failed to load products', type: 'error' }))
      .finally(() => setLoading(false))
  }, [])

  function openCreate() {
    // Navigate to dedicated product creation page
    navigate('/admin/products/new')
  }

  function openEdit(product) {
    navigate(`/admin/products/${product.slug}/edit`)
  }

  function handleDeleteClick(product) {
    setProductToDelete(product)
    setShowDeleteModal(true)
  }

  async function handleDeleteConfirm() {
    if (!productToDelete) return
    setDeleting(true)
    try {
      const res = await del(`/catalog/products/${productToDelete.slug}/`)
      if (res.ok) {
        setProducts(prev => prev.filter(p => p.id !== productToDelete.id))
        showToast({ title: 'Deleted', message: 'Product deleted successfully', type: 'success' })
      } else {
        showToast({ title: 'Error', message: res.data?.detail || res.data?.error || 'Something went wrong', type: 'error' })
      }
    } catch (err) {
      showToast({ title: 'Error', message: 'Something went wrong', type: 'error' })
    }
    setDeleting(false)
    setShowDeleteModal(false)
    setProductToDelete(null)
  }

  function toggleExistingImageBanner(imageId, checked) {
    setForm(prev => ({
      ...prev,
      existingImages: prev.existingImages.map(img =>
        img.id === imageId ? { ...img, is_homepage_banner: checked } : img
      ),
    }))
  }

  function toggleNewImageBanner(index, checked) {
    setForm(prev => ({
      ...prev,
      newImages: prev.newImages.map((img, i) =>
        i === index ? { ...img, is_homepage_banner: checked } : img
      ),
    }))
  }

  /* ── react-easy-crop handlers for banner images ── */
  const onBannerCropComplete = useCallback((key) => (croppedArea) => {
    const cx = Math.round(croppedArea.x + croppedArea.width / 2)
    const cy = Math.round(croppedArea.y + croppedArea.height / 2)
    const objPos = `${Math.max(0, Math.min(100, cx))}% ${Math.max(0, Math.min(100, cy))}%`
    // Store object_position on the image state
    setForm(prev => {
      // Determine if it's existing or new
      if (key.startsWith('existing-')) {
        const id = key.replace('existing-', '')
        return {
          ...prev,
          existingImages: prev.existingImages.map(img =>
            img.id === id ? { ...img, object_position: objPos } : img
          ),
        }
      }
      if (key.startsWith('new-')) {
        const idx = parseInt(key.replace('new-', ''), 10)
        return {
          ...prev,
          newImages: prev.newImages.map((img, i) =>
            i === idx ? { ...img, object_position: objPos } : img
          ),
        }
      }
      return prev
    })
  }, [])

  function handleCropChange(key, newCrop) {
    setImageCrops(prev => ({
      ...prev,
      [key]: { ...(prev[key] || { zoom: 1 }), crop: newCrop },
    }))
  }

  function handleZoomChange(key, newZoom) {
    setImageCrops(prev => ({
      ...prev,
      [key]: { ...(prev[key] || { crop: { x: 0, y: 0 } }), zoom: newZoom },
    }))
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const payload = new FormData()
    payload.append('name', form.name)
    payload.append('slug', slugify(form.slug || form.name))
    payload.append('description', form.description)
    payload.append('base_price', String(parseFloat(form.base_price)))
    payload.append('category', form.category)
    payload.append('unit_label', form.unit_label)
    payload.append('is_active', form.is_active ? 'true' : 'false')
    payload.append('is_available', form.is_available ? 'true' : 'false')
    payload.append('is_featured', form.is_featured ? 'true' : 'false')
    payload.append('existing_image_state', JSON.stringify(form.existingImages))
    payload.append('new_image_banners', JSON.stringify(form.newImages.map(img => !!img.is_homepage_banner)))
    payload.append('new_image_positions', JSON.stringify(form.newImages.map(img => img.object_position || '50% 50%')))
    if (form.newImages.length > 0) {
      form.newImages.forEach((item, index) => {
        payload.append('images', item.file)
      })
    }
    let res
    if (editing) {
      res = await patch(`/catalog/products/${editing.slug}/`, payload)
    } else {
      res = await post('/catalog/products/', payload)
    }
    if (res.ok) {
      get('/catalog/products/', { all: 1 }).then(r => {
        if (r.ok) setProducts(extractList(r.data))
      })
      setModalOpen(false)
      showToast({ title: editing ? 'Updated' : 'Created', message: `Product ${editing ? 'updated' : 'created'} successfully`, type: 'success' })
    } else {
      showToast({ title: 'Error', message: res.data?.detail || res.data?.error || 'Something went wrong', type: 'error' })
    }
    setSaving(false)
  }

  if (loading) return <Spinner />

  return (
    <div className="ops-route ops-admin-page space-y-6" data-page="products">
      <PageHeader eyebrow="Catalog" title="Products" description="Manage products, visibility, pricing and variants." />
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-eco-100 via-beige-50 to-cream text-eco-900 p-6 lg:p-8 shadow-modal border border-beige-200">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(90,160,95,0.12),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(217,164,65,0.14),transparent_30%)]" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.3em] text-primary-600 mb-2">Catalog Management</p>
            <h1 className="font-display text-4xl md:text-5xl">Products</h1>
            <p className="mt-3 text-gray-700 max-w-xl">Manage your catalog with a polished EcoTrack-inspired layout. Product images, pricing, and availability stay visible at a glance.</p>
          </div>
          <Button onClick={openCreate} className="bg-primary-500 text-white hover:bg-primary-600 shadow-lg px-6">
            Add Product
          </Button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5 bg-white/90 border-beige-200">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Total products</p>
          <p className="mt-2 text-3xl font-bold text-eco-900">{products.length}</p>
        </Card>
        <Card className="p-5 bg-white/90 border-beige-200">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Categories</p>
          <p className="mt-2 text-3xl font-bold text-eco-900">{categories.length}</p>
        </Card>
        <Card className="p-5 bg-white/90 border-beige-200">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Featured image</p>
          <p className="mt-2 text-3xl font-bold text-eco-900">Live</p>
        </Card>
      </div>

      {products.length > 0 ? (
        <Card className="overflow-hidden bg-white/90 border-beige-200 shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-beige-50 text-left text-gray-500 uppercase tracking-[0.18em] text-[11px]">
                  <th className="px-4 py-4 font-medium">Image</th>
                  <th className="px-4 py-4 font-medium">Name</th>
                  <th className="px-4 py-4 font-medium">Price / MRP</th>
                  <th className="px-4 py-4 font-medium">Unit</th>
                  <th className="px-4 py-4 font-medium">Stock</th>
                  <th className="px-4 py-4 font-medium">Status</th>
                  <th className="px-4 py-4 font-medium">Slug</th>
                  <th className="px-4 py-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.filter(Boolean).map(product => (
                  <tr key={product.id} className="border-b border-beige-100 hover:bg-beige-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden bg-beige-100 border border-beige-200 shadow-sm">
                        <img
                          src={product.image_url || `https://placehold.co/120x120/f5e6d3/1a3d1f?text=${product.name?.charAt(0) || 'G'}`}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-eco-900">{product.name}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-eco-700">{formatPrice(product?.base_price)}</p>
                      {Number(product.mrp) > Number(product.base_price) && (
                        <div className="mt-0.5 flex items-center gap-1.5 text-[11px]">
                          <span className="text-gray-400 line-through">{formatPrice(product.mrp)}</span>
                          <span className="font-bold text-emerald-700">
                            {getDiscountPercent(product.base_price, product.mrp)}% off
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{product.unit_label || '-'}</td>
                    <td className="px-4 py-3 text-gray-700 font-medium">{product.stock ?? 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${product.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {product.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${product.is_available ? 'bg-sky-100 text-sky-700' : 'bg-amber-100 text-amber-700'}`}>
                          {product.is_available ? 'Available' : 'Unavailable'}
                        </span>
                        {product.is_featured && (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary-100 text-primary-700">
                            Featured
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{product.slug}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => openVariantModal(product)}>
                          Variants
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openEdit(product)}>Edit</Button>
                        <Button size="sm" variant="outline" className="!text-red-600 hover:!bg-red-50" onClick={() => handleDeleteClick(product)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <EmptyState emoji="📦" title="No products" description="Add your first product to get started.">
          <Button onClick={openCreate}>Add Product</Button>
        </EmptyState>
      )}

      {/* Product create/edit moved to dedicated pages */}

      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Product">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Product</h3>
          <p className="text-sm text-gray-500 mb-4">
            Are you sure you want to delete <strong>{productToDelete?.name}</strong>? This action cannot be undone.
          </p>
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
            <Button onClick={handleDeleteConfirm} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Quick Variant Manager Modal ── */}
      <Modal isOpen={!!variantModal} onClose={closeVariantModal} title={`Variants — ${variantModal?.name || ''}`}>
        {variantModal && (
          <div className="space-y-4">
            <p className="text-xs text-gray-500">Add size/quantity options (e.g., 250ml, 500ml, 1L) with different pricing.</p>

            {variantRows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wider text-gray-500">
                      <th className="pb-2 pr-2 font-medium">Name</th>
                      <th className="pb-2 pr-2 font-medium">SKU</th>
                      <th className="pb-2 pr-2 font-medium">Price (₹)</th>
                      <th className="pb-2 pr-2 font-medium">Stock</th>
                      <th className="pb-2 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variantRows.map((v, i) => (
                      <tr key={v.id || `new-${i}`} className="border-b border-gray-100">
                        <td className="py-1.5 pr-2">
                          <input
                            type="text"
                            value={v.name}
                            onChange={e => updateVariantRow(i, 'name', e.target.value)}
                            className="w-full px-2 py-1 text-sm rounded border border-gray-300"
                            placeholder="e.g. 250ml"
                          />
                        </td>
                        <td className="py-1.5 pr-2">
                          <input
                            type="text"
                            value={v.sku}
                            onChange={e => updateVariantRow(i, 'sku', e.target.value)}
                            className="w-full px-2 py-1 text-sm rounded border border-gray-300"
                            placeholder="SKU"
                          />
                        </td>
                        <td className="py-1.5 pr-2">
                          <input
                            type="number"
                            value={v.price}
                            onChange={e => updateVariantRow(i, 'price', e.target.value)}
                            className="w-full px-2 py-1 text-sm rounded border border-gray-300"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                          />
                        </td>
                        <td className="py-1.5 pr-2">
                          <input
                            type="number"
                            value={v.stock}
                            onChange={e => updateVariantRow(i, 'stock', e.target.value)}
                            className="w-full px-2 py-1 text-sm rounded border border-gray-300"
                            min="0"
                            placeholder="0"
                          />
                        </td>
                        <td className="py-1.5">
                          <button
                            type="button"
                            onClick={() => removeVariantRow(i)}
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
            ) : (
              <p className="text-sm text-gray-400 italic py-4 text-center">No variants yet. Click "Add Variant" to create one.</p>
            )}

            <div className="flex items-center justify-between gap-3 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={addVariantRow}>
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Variant
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={closeVariantModal}>Cancel</Button>
                <Button size="sm" onClick={saveVariants} disabled={variantSaving}>
                  {variantSaving ? 'Saving...' : 'Save Variants'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
