import { useState, useEffect, useRef } from 'react'
import { get, post, patch, del, extractList } from '../../api/client'
import { useToast } from '../../context/ToastContext'
import ImageCropFrame from '../../components/ui/ImageCropFrame'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Spinner from '../../components/ui/Spinner'
import { PageHeader } from '../../components/ui/OperationsUI'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function apiErrorMessage(data, fallback = 'Something went wrong') {
  if (!data) return fallback
  if (typeof data === 'string') return data || fallback
  if (data.detail || data.error) return data.detail || data.error
  const messages = Object.entries(data)
    .flatMap(([field, value]) => {
      const items = Array.isArray(value) ? value : [value]
      return items.filter(Boolean).map(message => `${field}: ${message}`)
    })
  return messages.join(' ') || fallback
}

export default function CategoriesManagement() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', slug: '', description: '', image: null, is_active: true })
  const [editingId, setEditingId] = useState(null)
  const [editingSlug, setEditingSlug] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState(null)
  const [preview, setPreview] = useState(null)
  const { showToast } = useToast()

  // Crop state
  const [rawImageUrl, setRawImageUrl] = useState(null)
  const cropDataRef = useRef(null)

  async function getCroppedImg(imageSrc, pixelCrop) {
    const createImage = (url) =>
      new Promise((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => resolve(img)
        img.onerror = (e) => reject(e)
        img.src = url
      })
    const image = await createImage(imageSrc)
    const canvas = document.createElement('canvas')
    canvas.width = pixelCrop.width
    canvas.height = pixelCrop.height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height)
    return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92))
  }

  async function handleApplyCrop() {
    if (!rawImageUrl || !cropDataRef.current?.pixels) return
    try {
      const blob = await getCroppedImg(rawImageUrl, cropDataRef.current.pixels)
      if (!blob) throw new Error('The browser could not create the cropped image.')
      const croppedFile = new File([blob], 'category-image.jpg', { type: 'image/jpeg' })
      setForm(prev => ({ ...prev, image: croppedFile }))
      setPreview(URL.createObjectURL(blob))
      URL.revokeObjectURL(rawImageUrl)
      setRawImageUrl(null)
      cropDataRef.current = null
    } catch (error) {
      showToast({ title: 'Crop failed', message: error.message || 'Could not crop this image', type: 'error' })
    }
  }

  useEffect(() => {
    get('/catalog/categories/?all=1')
      .then(res => {
        if (res.ok) setCategories(extractList(res.data))
      })
      .catch(() => showToast({ title: 'Error', message: 'Failed to load categories', type: 'error' }))
      .finally(() => setLoading(false))
  }, [])

  function handleNameChange(e) {
    const name = e.target.value
    if (!editingSlug) {
      setForm(prev => ({ ...prev, name, slug: slugify(name) }))
    } else {
      setForm(prev => ({ ...prev, name }))
    }
  }

  function handleEdit(category) {
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      image: null,
      is_active: category.is_active,
    })
    setEditingId(category.id)
    setEditingSlug(category.slug)
    setPreview(category.image_url || null)
  }

  function handleCancelEdit() {
    setForm({ name: '', slug: '', description: '', image: null, is_active: true })
    setEditingId(null)
    setEditingSlug(null)
    setPreview(null)
    setRawImageUrl(null)
  }

  function handleDeleteClick(category) {
    setCategoryToDelete(category)
    setShowDeleteModal(true)
  }

  async function handleDeleteConfirm() {
    if (!categoryToDelete) return
    setSaving(true)
    try {
      const res = await del(`/catalog/categories/${categoryToDelete.slug}/`)
      if (res.ok) {
        setCategories(prev => prev.filter(c => c.id !== categoryToDelete.id))
        showToast({ title: 'Deleted', message: 'Category deleted successfully', type: 'success' })
      } else {
        showToast({ title: 'Error', message: apiErrorMessage(res.data), type: 'error' })
      }
    } catch (err) {
      showToast({ title: 'Error', message: 'Something went wrong', type: 'error' })
    }
    setSaving(false)
    setShowDeleteModal(false)
    setCategoryToDelete(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)

    const formData = new FormData()
    formData.append('name', form.name)
    formData.append('slug', slugify(form.slug || form.name))
    formData.append('description', form.description)
    if (form.image) formData.append('image', form.image)
    formData.append('is_active', form.is_active)

    if (editingSlug) {
      const res = await patch(`/catalog/categories/${editingSlug}/`, formData)
      if (res.ok) {
        setCategories(prev => prev.map(c => c.id === editingId ? res.data : c))
        handleCancelEdit()
        showToast({ title: 'Updated', message: 'Category updated successfully', type: 'success' })
      } else {
        showToast({ title: 'Error', message: apiErrorMessage(res.data), type: 'error' })
      }
    } else {
      const res = await post('/catalog/categories/', formData)
      if (res.ok) {
        setCategories(prev => [...prev, res.data])
        handleCancelEdit()
        showToast({ title: 'Created', message: 'Category created successfully', type: 'success' })
      } else {
        showToast({ title: 'Error', message: apiErrorMessage(res.data), type: 'error' })
      }
    }

    setSaving(false)
  }

  if (loading) return <Spinner />

  return (
    <div className="ops-route ops-admin-page space-y-6" data-page="categories">
      <PageHeader eyebrow="Catalog" title="Categories" description="Organize product discovery and storefront navigation." />
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-eco-100 via-beige-50 to-cream text-eco-900 p-6 lg:p-8 shadow-modal border border-beige-200">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(90,160,95,0.12),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(217,164,65,0.14),transparent_30%)]" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.3em] text-primary-600 mb-2">Catalog</p>
            <h1 className="font-display text-4xl md:text-5xl">Categories</h1>
            <p className="mt-3 text-gray-700 max-w-xl">Organize your products with categories. Create, edit, or remove them here.</p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-eco-900/8 bg-white/70 backdrop-blur-md p-5 shadow-[0_4px_20px_rgba(26,61,31,0.05)]">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Total categories</p>
          <p className="mt-2 text-3xl font-bold text-eco-900">{categories.length}</p>
        </div>
        <div className="rounded-2xl border border-eco-900/8 bg-white/70 backdrop-blur-md p-5 shadow-[0_4px_20px_rgba(26,61,31,0.05)]">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500">With images</p>
          <p className="mt-2 text-3xl font-bold text-eco-900">{categories.filter(c => c.image_url).length}</p>
        </div>
        <div className="rounded-2xl border border-eco-900/8 bg-white/70 backdrop-blur-md p-5 shadow-[0_4px_20px_rgba(26,61,31,0.05)]">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Status</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">Active</p>
        </div>
      </div>

      <Card className="p-6 bg-white/90 border-beige-200">
        <div className="mb-4">
          <p className="text-xs uppercase tracking-[0.25em] text-primary-600 font-semibold">Create / Edit</p>
          <h3 className="mt-1 text-base font-semibold text-eco-900">Category details</h3>
        </div>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <Input
            label="Category Name"
            name="name"
            value={form.name}
            onChange={handleNameChange}
            required
          />
          <Input
            label="Category Slug"
            name="slug"
            value={form.slug}
            onChange={e => setForm(prev => ({ ...prev, slug: e.target.value }))}
            required
          />
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-eco-800 mb-1">Description</label>
            <textarea
              name="description"
              rows={4}
              value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-lg border border-beige-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-eco-800 mb-1">Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) {
                  setRawImageUrl(URL.createObjectURL(file))
                  setForm(prev => ({ ...prev, image: file }))
                  cropDataRef.current = null
                }
              }}
              className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
            />
            <p className="text-[10px] text-gray-400 mt-1">Max 10MB per image. Drag to crop after selecting.</p>

            {rawImageUrl && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-eco-800">Crop for category card</p>
                  <span className="text-[10px] text-gray-400">Frame matches homepage category grid</span>
                </div>
                <ImageCropFrame
                  key={rawImageUrl}
                  src={rawImageUrl}
                  aspect={1}
                  onChange={data => { cropDataRef.current = data }}
                />
                <p className="text-[10px] text-gray-400">Drag the square frame to choose exactly what appears on the category card.</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleApplyCrop}
                    className="px-4 py-1.5 rounded-lg bg-primary-500 text-white text-xs font-semibold hover:bg-primary-600 transition-colors"
                  >
                    Apply Crop
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRawImageUrl(null); cropDataRef.current = null }}
                    className="px-4 py-1.5 rounded-lg border border-beige-300 text-gray-600 text-xs font-medium hover:bg-beige-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {preview && !rawImageUrl && (
              <div className="mt-2 flex items-end gap-3">
                <img src={preview} alt="Preview" className="h-24 w-24 rounded-xl object-cover border border-beige-200" />
                {editingSlug && (
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await post(`/catalog/categories/${editingSlug}/remove-image/`, {})
                      if (res.ok) {
                        setPreview(null)
                        setForm(prev => ({ ...prev, image: null }))
                        const refreshed = await get('/catalog/categories/?all=1')
                        if (refreshed.ok) setCategories(extractList(refreshed.data))
                        showToast({ title: 'Removed', message: 'Image removed successfully', type: 'success' })
                      } else {
                        showToast({ title: 'Error', message: res.data?.detail || res.data?.error || 'Something went wrong', type: 'error' })
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50 transition-colors"
                  >
                    Remove Image
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-eco-800 mb-1">Status</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={form.is_active}
                onClick={() => setForm(prev => ({ ...prev, is_active: !prev.is_active }))}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 ${
                  form.is_active ? 'bg-emerald-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    form.is_active ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-sm font-medium ${form.is_active ? 'text-emerald-700' : 'text-gray-500'}`}>
                {form.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : editingSlug ? 'Update Category' : 'Create Category'}</Button>
          </div>
        </form>
      </Card>

      {categories.length > 0 ? (
        <Card className="overflow-hidden bg-white/90 border-beige-200 shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-beige-50 text-left text-gray-500 uppercase tracking-[0.18em] text-[11px]">
                  <th className="px-4 py-4 font-medium">Image</th>
                  <th className="px-4 py-4 font-medium">Name</th>
                  <th className="px-4 py-4 font-medium">Slug</th>
                  <th className="px-4 py-4 font-medium">Description</th>
                  <th className="px-4 py-4 font-medium">Status</th>
                  <th className="px-4 py-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map(category => (
                  <tr key={category.id} className="border-b border-beige-100 hover:bg-beige-50/70 transition-colors">
                    <td className="px-4 py-3">
                      {category.image_url ? (
                        <img src={category.image_url} alt={category.name} className="h-12 w-12 rounded-xl object-cover border border-beige-200" />
                      ) : (
                        <div className="h-12 w-12 rounded-xl bg-beige-100 flex items-center justify-center text-gray-400 text-sm font-medium">
                          {category.name.charAt(0)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-eco-900">{category.name}</td>
                    <td className="px-4 py-3 text-gray-500">{category.slug}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate" title={category.description || '-'}>{category.description || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        category.is_active
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        <span className={`inline-block h-1.5 w-1.5 rounded-full ${
                          category.is_active ? 'bg-emerald-500' : 'bg-gray-400'
                        }`} />
                        {category.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(category)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="outline" className="!text-red-600 hover:!bg-red-50" onClick={() => handleDeleteClick(category)}>
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
        <EmptyState emoji="🗂️" title="No categories" description="Create the first category to start organizing products." />
      )}

      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Category">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Category</h3>
          <p className="text-sm text-gray-500 mb-4">
            Are you sure you want to delete <strong>{categoryToDelete?.name}</strong>? This action cannot be undone.
          </p>
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
            <Button onClick={handleDeleteConfirm} disabled={saving}>
              {saving ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
