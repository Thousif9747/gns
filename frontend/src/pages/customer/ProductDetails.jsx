import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { get, post, del, extractList } from '../../api/client'
import { useCart } from '../../context/CartContext'
import { useAuth } from '../../context/AuthContext'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import StarRating from '../../components/ui/StarRating'
import ReviewCard from '../../components/reviews/ReviewCard'
import ReviewFormInline from '../../components/reviews/ReviewFormInline'
import { formatPrice } from '../../utils/formatters'
import ProductCard from '../../components/ui/ProductCard'
import ProductGallery from '../../components/ui/ProductGallery'
import { getDiscountPercent, getProductMrp } from '../../utils/catalogPresentation'

export default function ProductDetails() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { addItem, setDirectCheckoutItem } = useCart()
  const { user } = useAuth()
  const [product, setProduct] = useState(null)
  const [related, setRelated] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [adding, setAdding] = useState(false)
  const [wishlisted, setWishlisted] = useState(false)
  const [wishlistId, setWishlistId] = useState(null)
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [reviews, setReviews] = useState([])
  const [reviewLoading, setReviewLoading] = useState(true)
  const reduceMotion = useReducedMotion()
  const [added, setAdded] = useState(false)

  useEffect(() => {
    if (user && product) {
      get('/commerce/wishlist-items/').then(res => {
        if (res.ok) {
          const items = extractList(res.data)
          const found = items.find(i => i.product === product.id)
          if (found) {
            setWishlisted(true)
            setWishlistId(found.id)
          }
        }
      })
    }
  }, [user, product])

  async function toggleWishlist() {
    if (!user || !product) return
    if (wishlisted && wishlistId) {
      await del(`/commerce/wishlist-items/${wishlistId}/`)
      setWishlisted(false)
      setWishlistId(null)
    } else {
      const res = await post('/commerce/wishlist-items/', { product: product.id })
      if (res.ok) {
        setWishlisted(true)
        setWishlistId(res.data.id)
      }
    }
  }

  function fetchReviews(productId) {
    setReviewLoading(true)
    get(`/catalog/reviews/?product=${productId}`)
      .then(res => {
        if (res.ok) setReviews(extractList(res.data))
        else setReviews([])
      })
      .catch(() => setReviews([]))
      .finally(() => setReviewLoading(false))
  }

  useEffect(() => {
    setLoading(true)
    setNotFound(false)
    setSelectedVariant(null)
    setQuantity(1)
    get(`/catalog/products/${slug}/`)
      .then(res => {
        if (res.ok) {
          setProduct(res.data)
          fetchReviews(res.data.id)
          // Auto-select the first available variant (standard ecommerce UX)
          if (res.data.variants?.length > 0) {
            const firstAvail = res.data.variants.find(v => parseInt(v.stock) > 0) || res.data.variants[0]
            setSelectedVariant(firstAvail)
          }
          if (res.data.category) {
            get('/catalog/products/', { category: typeof res.data.category === 'object' ? res.data.category.slug : res.data.category, page_size: 5 })
              .then(r => {
                if (r.ok) setRelated(extractList(r.data).filter(p => p.slug !== slug).slice(0, 4))
              })
          }
        } else if (res.status === 404) setNotFound(true)
      })
      .finally(() => setLoading(false))
  }, [slug])

  const effectivePrice = selectedVariant
    ? parseFloat(selectedVariant.price)
    : (product?.offer_info ? product?.offer_info.discounted_price : parseFloat(product?.base_price))
  const effectiveMrp = getProductMrp(product || {}, selectedVariant)
  const effectiveDiscount = getDiscountPercent(effectivePrice, effectiveMrp)
  const hasVariants = Boolean(product?.variants?.length)
  const availableStock = hasVariants
    ? Math.max(0, Number.parseInt(selectedVariant?.stock ?? 0, 10) || 0)
    : (product?.stock == null ? Number.POSITIVE_INFINITY : Math.max(0, Number.parseInt(product.stock, 10) || 0))
  const canPurchase = Boolean(product?.is_available) && (!hasVariants || Boolean(selectedVariant)) && availableStock > 0

  useEffect(() => {
    if (Number.isFinite(availableStock)) {
      setQuantity(current => Math.max(1, Math.min(current, Math.max(1, availableStock))))
    }
  }, [availableStock, selectedVariant?.id])

  async function handleAdd() {
    if (!canPurchase) return
    setAdding(true)
    await addItem(product, quantity, selectedVariant)
    setAdding(false)
    setAdded(true)
    window.setTimeout(() => setAdded(false), 1400)
  }

  async function handleBuyNow() {
    if (!canPurchase) return
    setDirectCheckoutItem({
      product: product.id,
      variant: selectedVariant?.id || null,
      variant_name: selectedVariant?.name || '',
      product_name: product.name,
      product_slug: product.slug,
      product_price: effectivePrice,
      product_image: product.image_url || (product.images?.[0]?.image_url) || '',
      quantity,
      offer_info: product?.offer_info || null,
      line_total: effectivePrice * quantity,
    })
    navigate('/checkout')
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>
  if (notFound) return <div className="max-w-7xl mx-auto px-4 py-20"><EmptyState emoji="404" title="Product not found" description="This product doesn't exist or has been removed."><Link to="/products"><Button variant="outline">Browse Products</Button></Link></EmptyState></div>

  const categoryName = typeof product.category === 'object' ? product.category?.name : ''
  const catSlug = product.category_slug || (typeof product.category === 'object' ? product.category?.slug : product.category)
  const productImages = product.images?.length
    ? product.images
    : product.image_urls?.length
      ? product.image_urls.map(url => ({ image_url: url, card_object_position: product.card_object_position }))
      : product.image_url
        ? [{ image_url: product.image_url, card_object_position: product.card_object_position }]
        : []

  return (
    <main className="mx-auto max-w-[1440px] bg-[#f7f8f4] px-3 py-5 pb-44 text-[#16231c] sm:px-6 sm:py-8 sm:pb-44 lg:px-8 lg:pb-8">
      <motion.nav initial={reduceMotion ? false : { opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-5 flex items-center overflow-hidden whitespace-nowrap text-xs font-semibold text-[#687a70]" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-[#146b45]">Home</Link>
        <span className="mx-2">/</span>
        <Link to="/products" className="hover:text-[#146b45]">Products</Link>
        {catSlug && (
          <>
            <span className="mx-2">/</span>
            <Link to={`/products?category=${catSlug}`} className="hover:text-[#146b45]">{categoryName || catSlug}</Link>
          </>
        )}
        <span className="mx-2">/</span>
        <span className="truncate text-[#234332]">{product.name}</span>
      </motion.nav>

      <div className="mb-12 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(380px,.92fr)] lg:items-start lg:gap-10">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: .45 }}
          className="relative"
        >
          <ProductGallery images={productImages} name={product.name} available={product.is_available} onWishlist={toggleWishlist} wishlisted={wishlisted} showWishlist={Boolean(user)} />
        </motion.div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: .45, delay: .1 }}
          className="flex flex-col rounded-[24px] border border-[#dbe6de] bg-white p-5 shadow-[0_20px_54px_rgba(31,69,43,.08)] sm:p-7 lg:sticky lg:top-24"
        >
          {categoryName && (
            <Badge className="mb-3 self-start bg-[#eaf5ec] text-[#146b45]">
              {categoryName}
            </Badge>
          )}
          <h1 className="text-[1.65rem] font-extrabold leading-tight tracking-[-.025em] text-[#14271c] lg:text-[2.15rem]">{product.name}</h1>
          {product.average_rating > 0 && <div className="mt-3 flex items-center gap-2 text-sm"><span className="flex items-center gap-1 rounded-lg bg-[#e6f3e9] px-2 py-1 font-extrabold text-[#146b45]"><svg aria-hidden="true" className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24"><path d="m12 2.5 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3-5.8 3 1.1-6.5-4.7-4.6 6.5-.9L12 2.5Z"/></svg>{Number(product.average_rating).toFixed(1)}</span><span className="text-[#6d7b73]">{product.review_count || 0} verified review{product.review_count === 1 ? '' : 's'}</span></div>}
          <motion.div key={`${selectedVariant?.id || 'base'}-${quantity}`} initial={reduceMotion ? false : { opacity: .75, y: 3 }} animate={{ opacity: 1, y: 0 }} className="mt-5 border-y border-[#e3eae5] py-5">
            <div className="flex items-center gap-3">
              <p className="text-3xl font-black text-[#17211b]">{formatPrice(effectivePrice)}</p>
              {(product?.offer_info?.badge_label || effectiveDiscount > 0) && (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                  {product?.offer_info?.badge_label || `${effectiveDiscount}% OFF`}
                </span>
              )}
            </div>
            {effectiveMrp > effectivePrice && (
              <>
                <p className="text-sm text-gray-400 line-through mt-1">MRP {formatPrice(effectiveMrp)}</p>
                <p className="text-xs text-green-600 font-medium mt-1">
                  You save {formatPrice(effectiveMrp - effectivePrice)}
                </p>
              </>
            )}
            {product.unit_label && (
              <p className="text-xs text-gray-400 mt-1">{product.unit_label}</p>
            )}
          </motion.div>

          {/*  Variant Selector (Flipkart-style)  */}
          {product.variants && product.variants.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-3 text-xs font-extrabold uppercase tracking-[.14em] text-[#5e7267]">Choose pack size</h3>
              <div className="flex flex-wrap gap-2">
                {product.variants.map(v => {
                  const isSelected = selectedVariant?.id === v.id
                  const isOutOfStock = parseInt(v.stock) < 1
                  return (
                    <button
                      key={v.id}
                      onClick={() => !isOutOfStock && setSelectedVariant(v)}
                      disabled={isOutOfStock}
                      className={`relative min-h-12 overflow-hidden rounded-xl border-2 px-4 py-2.5 text-left text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#146b45] focus-visible:ring-offset-2 ${
                        isSelected
                          ? 'border-[#146b45] bg-[#eaf5ec] text-[#146b45]'
                          : isOutOfStock
                            ? 'border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed line-through'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400 hover:shadow-sm'
                      }`}
                    >
                      {isSelected && <motion.span layoutId="variant-selection" className="absolute inset-x-0 bottom-0 h-1 bg-[#146b45]" />}
                      <span>{v.name}</span>
                      <span className={`text-xs ${isSelected ? 'text-[#146b45]' : 'text-gray-400'}`}>
                        {'\u20B9'}{parseFloat(v.price).toFixed(0)}
                      </span>
                      {Number(v.mrp) > Number(v.price) && (
                        <span className="ml-1 text-[10px] text-gray-400 line-through">
                          {'\u20B9'}{parseFloat(v.mrp).toFixed(0)}
                        </span>
                      )}
                      {isOutOfStock && (
                        <span className="text-[10px] text-gray-400 ml-1">(Out of Stock)</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="mt-5 rounded-2xl border border-[#dce6df] bg-[#f8fbf8] p-4">
            <p className="mb-2 text-xs font-extrabold uppercase tracking-[.16em] text-[#146b45]">Product details</p>
            <h2 className="mb-3 text-lg font-extrabold text-[#16231c]">Made for practical everyday use</h2>
            <div className="whitespace-pre-line text-sm leading-7 text-[#52645a]">{product.description || <span className="italic text-[#819087]">No description available.</span>}</div>
          </div>

          <div className="mt-5 space-y-3 rounded-2xl border border-[#d5e2d8] bg-white p-3 shadow-[0_12px_34px_rgba(20,60,40,.10)] lg:mt-7 lg:rounded-none lg:border-x-0 lg:border-b-0 lg:border-t lg:border-[#e3eae5] lg:p-0 lg:pt-5 lg:shadow-none">
            {canPurchase ? (
              <>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Qty</span>
                  <div className="flex items-center border-2 border-gray-200 rounded-lg overflow-hidden">
                    <button aria-label="Decrease quantity"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-3.5 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-bold transition-colors border-r border-gray-200"
                    >
                      <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M5 12h14"/></svg>
                    </button>
                    <span className="px-5 py-2 text-sm font-bold text-gray-900 min-w-[3.5rem] text-center">{quantity}</span>
                    <button aria-label="Increase quantity"
                      onClick={() => setQuantity(current => Number.isFinite(availableStock) ? Math.min(availableStock, current + 1) : current + 1)}
                      disabled={Number.isFinite(availableStock) && quantity >= availableStock}
                      className="px-3.5 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-bold transition-colors border-l border-gray-200"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <motion.button whileTap={reduceMotion ? undefined : { scale: .975 }}
                    onClick={handleAdd}
                    disabled={adding || !canPurchase}
                    className="flex-[1.35] flex items-center justify-center gap-2 rounded-xl py-3.5 px-4 bg-[#146b45] hover:bg-[#115638] disabled:opacity-70 text-white font-extrabold text-sm transition-all duration-200 active:scale-[0.98]"
                  >
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l1.4 9.2a2 2 0 0 0 2 1.7h8.7a2 2 0 0 0 2-1.6L20.5 6H6M9 19.5h.01M17 19.5h.01" />
                    </svg>
                    {adding ? 'Adding...' : added ? <><span>Added to cart</span><svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4 4L19 6"/></svg></> : 'Add to Cart'}
                  </motion.button>
                  <motion.button whileTap={reduceMotion ? undefined : { scale: .975 }}
                    onClick={handleBuyNow}
                    disabled={!canPurchase}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-[#b9cbbc] bg-white py-3.5 px-4 text-[#146b45] font-extrabold text-sm transition hover:bg-[#f0f6f1] active:scale-[0.98]"
                  >
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Buy Now
                  </motion.button>
                </div>
              </>
            ) : (
              <div className="w-full p-4 bg-gray-100 rounded-xl text-center">
                <p className="text-sm font-semibold text-gray-600">{hasVariants ? 'Selected options are out of stock' : 'Currently unavailable'}</p>
                <p className="mt-1 text-xs text-gray-400">{hasVariants ? 'Choose an available pack size to continue.' : 'This product is not available for purchase right now.'}</p>
              </div>
            )}
          </div>
          <div className="mt-5 grid grid-cols-3 divide-x divide-[#dfe7e1] rounded-xl bg-[#f1f6f1] px-2 py-3 text-center text-[10px] font-bold leading-tight text-[#41604d] sm:text-xs">
            <span>Secure<br />checkout</span><span>Quality<br />checked</span><span>Bulk order<br />support</span>
          </div>
        </motion.div>
      </div>

      {/* Reviews Section */}
      <section className="mb-12 rounded-[24px] border border-[#dce6df] bg-white p-5 sm:p-7">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">Customer Reviews</h2>
          {product.average_rating && (
            <div className="flex items-center gap-2 mt-1">
              <StarRating rating={Math.round(product.average_rating)} size="sm" />
              <span className="text-sm text-gray-500">
                {product.average_rating} &bull; {product.review_count || 0} review{(product.review_count || 0) !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.3fr_.7fr] lg:items-start">
        <div>{reviewLoading ? (
          <Card className="p-6"><Spinner /></Card>
        ) : reviews.length > 0 ? (
          <Card className="p-4 sm:p-6">
            {reviews.map(r => (
              <ReviewCard key={r.id} review={r} />
            ))}
          </Card>
        ) : (
          <Card className="p-6 text-center">
            <p className="text-gray-400 text-sm">No reviews yet.</p>
            {!user && (
              <p className="text-xs text-gray-400 mt-1"><Link to="/login" className="text-primary-600 hover:underline">Sign in</Link> to leave a review.</p>
            )}
          </Card>
        )}</div>

        {user && (
          <div className="rounded-2xl bg-[#f3f7f3] p-4">
            <ReviewFormInline
              productId={product.id}
              onSuccess={() => fetchReviews(product.id)}
            />
          </div>
        )}
        </div>
      </section>

      {related.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-6">Related Products</h2>
          <div className="flex snap-x gap-3 overflow-x-auto pb-3 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3 xl:grid-cols-4">
            {related.filter(Boolean).map(p => (
              <div key={p.id} className="w-[72vw] max-w-[260px] shrink-0 snap-start sm:w-auto sm:max-w-none"><ProductCard product={p} onAdd={(item, e) => { e.preventDefault(); addItem(item, 1, item.cheapest_variant || null) }} compact /></div>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
