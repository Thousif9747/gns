import { useEffect, useMemo, useState } from 'react'
import { get, patch, extractList } from '../../api/client'
import { useToast } from '../../context/ToastContext'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
import { PageHeader } from '../../components/ui/OperationsUI'
import EmptyState from '../../components/ui/EmptyState'
import Badge from '../../components/ui/Badge'
import { formatPrice } from '../../utils/formatters'

const LOW_STOCK_THRESHOLD = 50
const CRITICAL_STOCK_THRESHOLD = 10

function productImage(product) {
  return product.image_url || product.image || `https://placehold.co/120x120/f5e6d3/1a3d1f?text=${product.name?.charAt(0) || 'G'}`
}

function getStockStatus(stock) {
  if (stock <= 0) {
    return {
      label: 'Out of Stock',
      className: 'bg-red-100 text-red-700 border-red-200',
      dot: 'bg-red-500',
    }
  }
  if (stock < CRITICAL_STOCK_THRESHOLD) {
    return {
      label: 'Critical',
      className: 'bg-orange-100 text-orange-700 border-orange-200',
      dot: 'bg-orange-500',
    }
  }
  if (stock < LOW_STOCK_THRESHOLD) {
    return {
      label: 'Low',
      className: 'bg-amber-100 text-amber-700 border-amber-200',
      dot: 'bg-amber-500',
    }
  }
  return {
    label: 'Healthy',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  }
}

function RestockModal({ product, isOpen, onClose, onSaved }) {
  const { showToast } = useToast()
  const [delta, setDelta] = useState('10')
  const [active, setActive] = useState(true)
  const [available, setAvailable] = useState(true)
  const [featured, setFeatured] = useState(false)
  const [saving, setSaving] = useState(false)
  const [variants, setVariants] = useState([])
  const [variantDeltas, setVariantDeltas] = useState({})

  useEffect(() => {
    if (product) {
      setDelta('10')
      setActive(product.is_active ?? true)
      setAvailable(product.is_available ?? true)
      setFeatured(product.is_featured ?? false)
      setVariantDeltas({})
      // Fetch variants for this product
      get(`/catalog/products/${product.slug}/variants/`).then(res => {
        const list = res.ok ? (res.data.results || res.data || []) : []
        setVariants(list)
      })
    }
  }, [product])

  async function handleSave(e) {
    e.preventDefault()
    if (!product) return

    setSaving(true)

    // 1. Update product-level stock
    const adjustment = parseInt(delta || '0', 10) || 0
    const nextStock = Math.max(0, (product.stock || 0) + adjustment)
    const res = await patch(`/catalog/products/${product.slug}/`, {
      stock: nextStock,
      is_active: active,
      is_available: available,
      is_featured: featured,
    })

    if (!res.ok) {
      showToast({ title: 'Error', message: res.data?.detail || res.data?.error || 'Something went wrong', type: 'error' })
      setSaving(false)
      return
    }

    // 2. Update each variant's stock independently
    for (const v of variants) {
      const vDelta = parseInt(variantDeltas[v.id] || '0', 10) || 0
      if (vDelta !== 0) {
        const vNextStock = Math.max(0, (parseInt(v.stock) || 0) + vDelta)
        await patch(`/catalog/product-variants/${v.id}/`, { stock: vNextStock })
      }
    }

    onSaved?.(res.data)
    onClose()
    showToast({ title: 'Updated', message: 'Stock updated successfully', type: 'success' })
    setSaving(false)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Update Stock: ${product?.name || ''}`}>
      {product && (
        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex items-center gap-3 rounded-2xl border border-beige-200 bg-beige-50 p-3">
            <img src={productImage(product)} alt={product.name} className="w-14 h-14 rounded-xl object-cover" />
            <div>
              <p className="text-sm font-medium text-eco-900">{product.name}</p>
              <p className="text-xs text-gray-500">Current stock: <span className="font-semibold text-gray-900">{product.stock || 0}</span></p>
            </div>
          </div>

          <Input
            label="Stock adjustment (product-level)"
            type="number"
            step="1"
            value={delta}
            onChange={e => setDelta(e.target.value)}
            required
          />
          <p className="text-xs text-gray-500 -mt-2">
            Use positive numbers to add stock and negative numbers to reduce stock.
          </p>

          {/* ── Variant-level stock adjustments ── */}
          {variants.length > 0 && (
            <section className="rounded-2xl border border-beige-200 bg-white p-4 space-y-3">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-primary-600 font-semibold">Variants</p>
                <h4 className="mt-1 text-sm font-semibold text-eco-900">Variant stock adjustments</h4>
              </div>
              <p className="text-xs text-gray-500 -mt-1">Leave blank to keep current stock.</p>
              {variants.map(v => {
                const vCur = parseInt(v.stock) || 0
                const vDeltaVal = parseInt(variantDeltas[v.id] || '0', 10) || 0
                const vNext = Math.max(0, vCur + vDeltaVal)
                return (
                  <div key={v.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-beige-50 border border-beige-100">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-eco-900 truncate">{v.name}</p>
                      <p className="text-xs text-gray-400">SKU: {v.sku} &middot; Current: <span className="font-semibold text-gray-700">{vCur}</span></p>
                    </div>
                    <input
                      type="number"
                      step="1"
                      value={variantDeltas[v.id] ?? ''}
                      onChange={e => setVariantDeltas(prev => ({ ...prev, [v.id]: e.target.value }))}
                      placeholder="0"
                      className="w-20 px-3 py-2 rounded-lg border border-beige-300 bg-white text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <div className="w-16 text-right">
                      <p className="text-xs text-gray-400">→</p>
                      <p className="text-sm font-semibold text-eco-700">{vNext}</p>
                    </div>
                  </div>
                )
              })}
            </section>
          )}

          <section className="rounded-2xl border border-beige-200 bg-beige-50 p-4 space-y-3">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-primary-600 font-semibold">Visibility</p>
              <h4 className="mt-1 text-sm font-semibold text-eco-900">Publish controls</h4>
            </div>
            <label className="flex items-center gap-3 text-sm text-eco-800">
              <input
                type="checkbox"
                checked={active}
                onChange={e => setActive(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Active
            </label>
            <label className="flex items-center gap-3 text-sm text-eco-800">
              <input
                type="checkbox"
                checked={available}
                onChange={e => setAvailable(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Available
            </label>
            <label className="flex items-center gap-3 text-sm text-eco-800">
              <input
                type="checkbox"
                checked={featured}
                onChange={e => setFeatured(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Featured
            </label>
          </section>

          <div className="rounded-2xl border border-beige-200 bg-white p-3 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Product stock: <span className="font-semibold text-eco-900">{nextStockDisplay(product.stock, delta)}</span>
            </p>
            {variants.length > 0 && (
              <p className="text-xs text-gray-400">
                {variants.filter(v => variantDeltas[v.id] && variantDeltas[v.id] !== '0').length} variant(s) changing
              </p>
            )}
          </div>

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Stock'}</Button>
          </div>
        </form>
      )}
    </Modal>
  )
}

function nextStockDisplay(current, delta) {
  return Math.max(0, (current || 0) + (parseInt(delta || '0', 10) || 0))
}

export default function InventoryManagement() {
  const { showToast: showToastMain } = useToast()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [restockProduct, setRestockProduct] = useState(null)
  const [filter, setFilter] = useState('all')
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkSaving, setBulkSaving] = useState(false)
  const [bulkForm, setBulkForm] = useState({
    stockDelta: '',
    active: 'keep',
    available: 'keep',
    featured: 'keep',
  })

  useEffect(() => {
    loadProducts()
  }, [])

  async function loadProducts() {
    setLoading(true)
    const res = await get('/catalog/products/', { all: 1, ordering: '-stock' })
    if (res.ok) setProducts(res.data.results || res.data)
    setLoading(false)
  }

  const summary = useMemo(() => {
    const totalProducts = products.length
    const low = products.filter(p => (p.stock || 0) > 0 && (p.stock || 0) < LOW_STOCK_THRESHOLD).length
    const out = products.filter(p => (p.stock || 0) <= 0).length
    const value = products.reduce((sum, p) => sum + (parseFloat(p?.base_price || 0) * (p.stock || 0)), 0)
    const stockTotal = products.reduce((sum, p) => sum + (p.stock || 0), 0)
    return { totalProducts, low, out, value, stockTotal }
  }, [products])

  const lowStockProducts = useMemo(
    () => products.filter(p => (p.stock || 0) > 0 && (p.stock || 0) < LOW_STOCK_THRESHOLD),
    [products]
  )

  const filteredProducts = useMemo(() => {
    if (filter === 'low') return products.filter(p => (p.stock || 0) > 0 && (p.stock || 0) < LOW_STOCK_THRESHOLD)
    if (filter === 'out') return products.filter(p => (p.stock || 0) <= 0)
    if (filter === 'healthy') return products.filter(p => (p.stock || 0) >= LOW_STOCK_THRESHOLD)
    return products
  }, [filter, products])

  const visibleIds = useMemo(() => filteredProducts.map(p => p.id), [filteredProducts])
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.includes(id))
  const selectedProducts = useMemo(
    () => products.filter(product => selectedIds.includes(product.id)),
    [products, selectedIds]
  )

  function handleSaved(updatedProduct) {
    setProducts(prev => prev.map(product => product.id === updatedProduct.id ? updatedProduct : product))
  }

  function toggleSelected(productId) {
    setSelectedIds(prev => (
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    ))
  }

  function toggleVisibleSelection() {
    setSelectedIds(prev => (
      allVisibleSelected
        ? prev.filter(id => !visibleIds.includes(id))
        : Array.from(new Set([...prev, ...visibleIds]))
    ))
  }

  function clearSelection() {
    setSelectedIds([])
  }

  function handleCardFilter(nextFilter) {
    setFilter(nextFilter)
    clearSelection()
  }

  async function applyBulkChanges(e) {
    e.preventDefault()
    if (selectedProducts.length === 0) return

    setBulkSaving(true)
    const delta = parseInt(bulkForm.stockDelta || '0', 10) || 0
    const hasStockChange = bulkForm.stockDelta !== '' && delta !== 0
    const hasVisibilityChange = bulkForm.active !== 'keep' || bulkForm.available !== 'keep' || bulkForm.featured !== 'keep'

    if (!hasStockChange && !hasVisibilityChange) {
      setBulkSaving(false)
      return
    }

    const updates = selectedProducts.map(product => {
      const payload = {}

      if (hasStockChange) {
        payload.stock = Math.max(0, (product.stock || 0) + delta)
      }
      if (bulkForm.active !== 'keep') {
        payload.is_active = bulkForm.active === 'active'
      }
      if (bulkForm.available !== 'keep') {
        payload.is_available = bulkForm.available === 'available'
      }
      if (bulkForm.featured !== 'keep') {
        payload.is_featured = bulkForm.featured === 'featured'
      }

      return patch(`/catalog/products/${product.slug}/`, payload)
    })

    const results = await Promise.all(updates)
    if (results.every(res => res?.ok)) {
      await loadProducts()
      clearSelection()
      setBulkForm({
        stockDelta: '',
        active: 'keep',
        available: 'keep',
        featured: 'keep',
      })
      showToastMain({ title: 'Updated', message: 'Bulk changes applied successfully', type: 'success' })
    } else {
      showToastMain({ title: 'Error', message: 'Some updates failed. Please try again.', type: 'error' })
    }
    setBulkSaving(false)
  }

  if (loading) return <Spinner />

  return (
    <div className="ops-route ops-admin-page space-y-6" data-page="inventory">
      <PageHeader eyebrow="Operations" title="Inventory" description="Monitor stock and make precise availability updates." />
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-eco-100 via-beige-50 to-cream text-eco-900 p-6 lg:p-8 shadow-modal border border-beige-200">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(90,160,95,0.12),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(217,164,65,0.14),transparent_30%)]" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.3em] text-primary-600 mb-2">Inventory Management</p>
            <h1 className="font-display text-4xl md:text-5xl">Stock</h1>
            <p className="mt-3 text-gray-700 max-w-xl">Manage stock and publish controls across multiple products from one dedicated section.</p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        <button type="button" onClick={() => handleCardFilter('all')} className="text-left">
          <Card className={`p-5 bg-white/90 border-beige-200 transition-all ${filter === 'all' ? 'ring-2 ring-primary-300 shadow-card-hover' : 'hover:shadow-card-hover'}`}>
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Total products</p>
            <p className="mt-2 text-3xl font-bold text-eco-900">{summary.totalProducts}</p>
            <p className="mt-2 text-xs text-gray-500">{summary.stockTotal} total units</p>
          </Card>
        </button>
        <button type="button" onClick={() => handleCardFilter('low')} className="text-left">
          <Card className={`p-5 bg-white/90 border-beige-200 transition-all ${filter === 'low' ? 'ring-2 ring-primary-300 shadow-card-hover' : 'hover:shadow-card-hover'}`}>
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Low stock</p>
            <p className="mt-2 text-3xl font-bold text-eco-900">{summary.low}</p>
            <p className="mt-2 text-xs text-gray-500">Click to view low-stock products</p>
          </Card>
        </button>
        <button type="button" onClick={() => handleCardFilter('out')} className="text-left">
          <Card className={`p-5 bg-white/90 border-beige-200 transition-all ${filter === 'out' ? 'ring-2 ring-primary-300 shadow-card-hover' : 'hover:shadow-card-hover'}`}>
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Out of stock</p>
            <p className="mt-2 text-3xl font-bold text-eco-900">{summary.out}</p>
            <p className="mt-2 text-xs text-gray-500">Click to view zero-stock products</p>
          </Card>
        </button>
        <button type="button" onClick={() => handleCardFilter('all')} className="text-left">
          <Card className={`p-5 bg-white/90 border-beige-200 transition-all ${filter === 'all' ? 'ring-2 ring-primary-300 shadow-card-hover' : 'hover:shadow-card-hover'}`}>
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Inventory value</p>
            <p className="mt-2 text-3xl font-bold text-eco-900">{formatPrice(summary.value)}</p>
            <p className="mt-2 text-xs text-gray-500">Based on current stock levels</p>
          </Card>
        </button>
      </div>

      {lowStockProducts.length > 0 && (
        <Card className="border-l-4 border-l-red-400 bg-red-50/40 p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Low stock alert</h2>
              <p className="text-sm text-gray-600">{lowStockProducts.length} product(s) are below the healthy threshold.</p>
            </div>
            <Badge variant="neutral" className="border border-red-200 bg-red-100 text-red-700">
              Attention
            </Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {lowStockProducts.slice(0, 6).map(product => (
              <div key={product.id} className="flex items-center justify-between rounded-2xl border border-red-100 bg-white p-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img src={productImage(product)} alt={product.name} className="h-10 w-10 rounded-xl object-cover shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-eco-900 truncate">{product.name}</p>
                    <p className="text-xs text-red-600 font-semibold">Stock: {product.stock || 0}</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => setRestockProduct(product)}>Update</Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {selectedProducts.length > 0 && (
        <Card className="p-5 bg-white/90 border-beige-200 shadow-card">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-primary-600 font-semibold">Bulk actions</p>
              <h2 className="text-lg font-semibold text-eco-900">{selectedProducts.length} product(s) selected</h2>
              <p className="text-sm text-gray-600">Apply stock and publish changes to multiple products at once.</p>
            </div>
            <Button variant="outline" onClick={clearSelection}>Clear selection</Button>
          </div>

          <form onSubmit={applyBulkChanges} className="mt-4 grid gap-4 lg:grid-cols-5">
            <div className="lg:col-span-1">
              <Input
                label="Stock adjustment"
                type="number"
                step="1"
                value={bulkForm.stockDelta}
                onChange={e => setBulkForm({ ...bulkForm, stockDelta: e.target.value })}
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-eco-800 mb-1">Active</label>
              <select
                value={bulkForm.active}
                onChange={e => setBulkForm({ ...bulkForm, active: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-beige-300 bg-white/90 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="keep">Keep as is</option>
                <option value="active">Set active</option>
                <option value="inactive">Set inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-eco-800 mb-1">Available</label>
              <select
                value={bulkForm.available}
                onChange={e => setBulkForm({ ...bulkForm, available: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-beige-300 bg-white/90 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="keep">Keep as is</option>
                <option value="available">Set available</option>
                <option value="unavailable">Set unavailable</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-eco-800 mb-1">Featured</label>
              <select
                value={bulkForm.featured}
                onChange={e => setBulkForm({ ...bulkForm, featured: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-beige-300 bg-white/90 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="keep">Keep as is</option>
                <option value="featured">Set featured</option>
                <option value="not_featured">Unset featured</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full" disabled={bulkSaving}>
                {bulkSaving ? 'Applying...' : 'Apply to Selected'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="overflow-hidden bg-white/90 border-beige-200 shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-beige-50 text-left text-gray-500 uppercase tracking-[0.18em] text-[11px]">
                <th className="px-4 py-4 font-medium">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleVisibleSelection}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </th>
                <th className="px-4 py-4 font-medium">Product</th>
                <th className="px-4 py-4 font-medium">Category</th>
                <th className="px-4 py-4 font-medium">Price</th>
                <th className="px-4 py-4 font-medium">Stock</th>
                <th className="px-4 py-4 font-medium">Visibility</th>
                <th className="px-4 py-4 font-medium">Status</th>
                <th className="px-4 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length > 0 ? filteredProducts.filter(Boolean).map(product => {
                const status = getStockStatus(product.stock || 0)
                const selected = selectedIds.includes(product.id)
                return (
                  <tr key={product.id} className={`border-b border-beige-100 hover:bg-beige-50/70 transition-colors ${selected ? 'bg-primary-50/40' : ''}`}>
                    <td className="px-4 py-3 align-top">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleSelected(product.id)}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img src={productImage(product)} alt={product.name} className="h-11 w-11 rounded-xl object-cover border border-beige-200" />
                        <div>
                          <p className="font-medium text-eco-900">{product.name}</p>
                          <p className="text-xs text-gray-500">{product.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{product.category_name || product.category}</td>
                    <td className="px-4 py-3 font-semibold text-eco-700">{formatPrice(product?.base_price)}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{product.stock || 0}</td>
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
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${status.className}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="outline" onClick={() => setRestockProduct(product)}>Update</Button>
                    </td>
                  </tr>
                )
              }) : (
                <tr>
                  <td colSpan={8} className="px-4 py-12">
                    <EmptyState
                      emoji="BOX"
                      title="No products found"
                      description="Try another stock filter."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <RestockModal
        product={restockProduct}
        isOpen={!!restockProduct}
        onClose={() => setRestockProduct(null)}
        onSaved={handleSaved}
      />
    </div>
  )
}
