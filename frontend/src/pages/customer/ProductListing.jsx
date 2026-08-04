import { useEffect, useMemo, useState, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { get, post, del, extractList } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import { formatPrice } from '../../utils/formatters'
import StarRating from '../../components/ui/StarRating'
import ProductCard from '../../components/ui/ProductCard'

const sortOptions = [
  { label: 'Newest first', value: 'created_at' },
  { label: 'Price: Low  High', value: 'base_price' },
  { label: 'Price: High  Low', value: '-base_price' },
  { label: 'Name: A  Z', value: 'name' },
]

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: (i) => ({ opacity: 1, y: 0, transition: { duration: 0.4, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] } }),
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
}

export default function ProductListing() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [wishlist, setWishlist] = useState(new Set())
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [localSearch, setLocalSearch] = useState(searchParams.get('search') || '')
  const sidebarRef = useRef(null)

  useEffect(() => {
    if (user) {
      get('/commerce/wishlist-items/').then(res => {
        if (res.ok) setWishlist(new Set(extractList(res.data).map(i => i.product)))
      })
    }
  }, [user])

  async function toggleWishlist(productId, e) {
    e.preventDefault()
    if (!user) return
    const liked = wishlist.has(productId)
    if (liked) {
      const items = await get('/commerce/wishlist-items/')
      if (items.ok) {
        const found = extractList(items.data).find(i => i.product === productId)
        if (found) await del(`/commerce/wishlist-items/${found.id}/`)
      }
      setWishlist(prev => { const n = new Set(prev); n.delete(productId); return n })
    } else {
      await post('/commerce/wishlist-items/', { product: productId })
      setWishlist(prev => new Set(prev).add(productId))
    }
  }

  const category = searchParams.get('category') || ''
  const ordering = searchParams.get('ordering') || 'created_at'
  const search = searchParams.get('search') || ''
  const activeCategory = categories.find(cat => cat.slug === category)

  useEffect(() => {
    get('/catalog/categories/').then(res => { if (res.ok) setCategories(extractList(res.data)) })
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = { ordering, page_size: 200 }
    if (category) params.category = category
    if (search) params.search = search
    get('/catalog/products/', params)
      .then(res => { if (res.ok) setProducts(extractList(res.data)); else setProducts([]) })
      .finally(() => setLoading(false))
  }, [category, ordering, search])

  function updateParam(key, value) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value); else next.delete(key)
    setSearchParams(next)
  }

  function handleSearchSubmit(e) {
    e.preventDefault()
    updateParam('search', localSearch.trim())
  }

  function openProduct(product, e) {
    e.preventDefault()
    e.stopPropagation()
    navigate(`/products/${product.slug}`)
  }

  const filteredCount = useMemo(() => products.length, [products])

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden bg-[#f6f7f5]">

      {/*  Mobile sidebar overlay  */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-eco-900/30 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/*  Sidebar  */}
      <aside
        ref={sidebarRef}
        className={`fixed inset-y-0 left-0 z-50 w-72 shrink-0 overflow-y-auto border-r border-[#dfe7e1] bg-white transition-transform duration-300 lg:hidden ${
          sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Sidebar header */}
        <div className="border-b border-[#dfe7e1] bg-white px-4 py-4">
          <div className="flex items-center justify-between lg:hidden mb-3">
            <p className="text-xs uppercase tracking-[0.3em] text-eco-500 font-semibold">Filters</p>
            <button onClick={() => setSidebarOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:text-gray-700 hover:bg-eco-50 transition-all">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <span className="chip text-[10px] mb-2 block w-fit">Collections</span>
          <h2 className="text-xl font-black text-[#17211b]">Products</h2>
          {search && (
            <p className="mt-1.5 text-sm text-eco-600 font-medium">
              Results for &ldquo;{search}&rdquo;
            </p>
          )}
        </div>

        {/* Search */}
        <div className="px-4 pt-4 pb-2">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              value={localSearch}
              onChange={e => setLocalSearch(e.target.value)}
              placeholder="Search products"
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-2xl border border-eco-100 bg-eco-50/50 focus:outline-none focus:border-eco-400 focus:bg-white focus:ring-2 focus:ring-eco-100 transition-all"
            />
            <button type="submit" className="absolute left-3 top-1/2 -translate-y-1/2 text-eco-400 hover:text-eco-600">
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </button>
          </form>
        </div>

        {/* Category list */}
        <div className="p-3 space-y-1">
          <button
            type="button"
            onClick={() => { updateParam('category', ''); setSidebarOpen(false) }}
            className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border text-left transition-all text-sm font-medium ${
              !category
                ? 'bg-[#146b45] text-white border-[#146b45] shadow-sm'
                : 'bg-white text-gray-700 border-eco-100 hover:bg-eco-50 hover:border-eco-200'
            }`}
          >
            <span>All Products</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${!category ? 'bg-white/20 text-white' : 'bg-eco-100 text-eco-600'}`}>
              {filteredCount}
            </span>
          </button>

          {categories.map((cat, i) => (
            <motion.button
              key={cat.slug}
              type="button"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => { updateParam('category', cat.slug); setSidebarOpen(false) }}
              className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border text-left transition-all text-sm font-medium ${
                category === cat.slug
                  ? 'bg-[#146b45] text-white border-[#146b45] shadow-sm'
                  : 'bg-white text-gray-700 border-eco-100 hover:bg-eco-50 hover:border-eco-200'
              }`}
            >
              <span>{cat.name}</span>
              {category === cat.slug && (
                <svg className="w-4 h-4 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
              )}
            </motion.button>
          ))}
        </div>

        {/* Active filter card */}
        <div className="px-4 pb-6 pt-2">
          <div className="rounded-xl border border-[#dfe7e1] bg-[#f6f7f5] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-eco-500 font-semibold mb-1">Active filter</p>
            <p className="font-semibold text-eco-900 text-sm">
              {activeCategory ? activeCategory.name : 'All products'}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              {search ? `Searching "${search}"` : `${filteredCount} product${filteredCount !== 1 ? 's' : ''} found`}
            </p>
            {(category || search) && (
              <button
                onClick={() => { setLocalSearch(''); setSearchParams(new URLSearchParams()) }}
                className="mt-2 text-xs text-eco-600 hover:text-eco-700 font-medium hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>
      </aside>

      {/*  Main content  */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8">

          {/* Top bar */}
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            {/* Mobile filter toggle */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-eco-200 bg-white text-sm font-semibold text-gray-700 shadow-sm hover:bg-eco-50 hover:border-eco-300 transition-all"
            >
              <svg className="w-4 h-4 text-eco-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-293.707l-6.414 6.414a1 1 0 00-293.707V17l-4 4v-6.586a1 1 0 00-293-707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
              Filters
              {category && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-eco-100 text-eco-700 text-[10px] font-bold">1</span>}
            </button>

            {/* Mobile search */}
            <form onSubmit={handleSearchSubmit} className="flex-1 relative lg:hidden">
              <input
                value={localSearch}
                onChange={e => setLocalSearch(e.target.value)}
                placeholder="Search"
                className="w-full pl-9 pr-4 py-2.5 text-sm rounded-2xl border border-eco-200 bg-white focus:outline-none focus:border-eco-400 focus:ring-2 focus:ring-eco-100 transition-all"
              />
              <button type="submit" className="absolute left-3 top-1/2 -translate-y-1/2 text-eco-400">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              </button>
            </form>

            <div className="ml-auto flex items-center gap-3">
              {filteredCount > 0 && (
                <span className="hidden sm:block text-xs text-gray-400 font-medium">
                  {filteredCount} result{filteredCount !== 1 ? 's' : ''}
                </span>
              )}
              <select
                value={ordering}
                onChange={e => updateParam('ordering', e.target.value)}
                className="px-4 py-2.5 rounded-2xl border border-eco-200 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-eco-400 focus:border-eco-400 transition-all cursor-pointer"
              >
                {sortOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div className="mb-4 flex items-end justify-between gap-3">
            <div><h1 className="text-2xl font-black text-[#17211b]">{activeCategory ? activeCategory.name : 'All products'}</h1>
              <p className="text-xs text-[#68786f]">{filteredCount} item{filteredCount !== 1 ? 's' : ''}{search ? ` matching "${search}"` : ''}</p></div>
          </div>
          <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
            <button onClick={() => updateParam('category', '')} className={`min-h-9 shrink-0 rounded-xl border px-3 text-xs font-extrabold ${!category ? 'border-[#146b45] bg-[#146b45] text-white' : 'border-[#d8e3db] bg-white text-[#425348]'}`}>All</button>
            {categories.map(cat => <button key={cat.slug} onClick={() => updateParam('category', cat.slug)} className={`min-h-9 shrink-0 rounded-xl border px-3 text-xs font-extrabold ${category === cat.slug ? 'border-[#146b45] bg-[#146b45] text-white' : 'border-[#d8e3db] bg-white text-[#425348]'}`}>{cat.name}</button>)}
          </div>

          {/* Products grid */}
          {loading ? (
            <div className="py-20 flex flex-col items-center gap-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                className="w-10 h-10 rounded-full border-4 border-eco-200 border-t-eco-500"
              />
              <p className="text-sm text-eco-500 animate-pulse">Loading products</p>
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              <AnimatePresence mode="popLayout">
                {products.filter(Boolean).map((product, i) => (
                  <motion.div
                    key={product.id}
                    layout
                    custom={i}
                    variants={cardVariants}
                    initial="hidden"
                    animate="show"
                    exit="exit"
                  >
                    <ProductCard
                      product={product}
                      onAdd={openProduct}
                      onBuyNow={openProduct}
                      onWishlist={user ? toggleWishlist : null}
                      wished={wishlist.has(product.id)}
                      detailOnly
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <EmptyState
              emoji=""
              title="No products found"
              description="Try a different category or search term."
            >
              <Button variant="outline" onClick={() => { setLocalSearch(''); setSearchParams(new URLSearchParams()) }}>
                Clear Filters
              </Button>
            </EmptyState>
          )}
        </div>
      </main>
    </div>
  )
}
