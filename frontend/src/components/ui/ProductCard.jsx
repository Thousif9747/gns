import { Link } from 'react-router-dom'
import { formatPrice } from '../../utils/formatters'
import { useCart } from '../../context/CartContext'
import { useAuth } from '../../context/AuthContext'
import { getDiscountPercent, getProductMrp } from '../../utils/catalogPresentation'

export default function ProductCard({ product, onAdd, onBuyNow, onWishlist, wished = false, adding = false, compact = false }) {
  const { items, addItem, updateQuantity } = useCart()
  const { user } = useAuth()
  if (!product) return null
  const variant = product.cheapest_variant || null
  const cartItem = items.find(item => item.product === product.id && (item.variant || null) === (variant?.id || null))
  const quantity = cartItem?.quantity || 0
  const price = variant?.price || product.offer_info?.discounted_price || product.base_price
  const mrp = getProductMrp(product, variant)
  const original = mrp > Number(price) ? mrp : null
  const discount = getDiscountPercent(price, mrp)
  const available = product.is_available !== false

  async function increment(e) {
    e.preventDefault()
    e.stopPropagation()
    if (onAdd) await onAdd(product, e)
    else await addItem(product, 1, variant)
  }

  async function decrement(e) {
    e.preventDefault()
    e.stopPropagation()
    const identifier = user ? cartItem.id : product.id
    await updateQuantity(identifier, quantity - 1, variant?.id || null)
  }

  return (
    <article className={`group relative flex h-full min-w-0 flex-col overflow-hidden rounded-[16px] border border-[#dde7e0] bg-white transition duration-200 hover:-translate-y-0.5 hover:border-[#bcd4c4] hover:shadow-[0_10px_28px_rgba(20,107,69,.10)] ${available ? '' : 'opacity-70'}`}>
      <Link to={`/products/${product.slug}`} className="relative block aspect-square overflow-hidden bg-[#f2f6f3] p-3">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" style={product.card_object_position ? { objectPosition: product.card_object_position } : {}} />
        ) : <span className="flex h-full items-center justify-center text-4xl font-extrabold text-[#b5cabd]">{product.name?.charAt(0)?.toUpperCase()}</span>}
        {product.offer_info?.badge_label && <span className="absolute left-2 top-2 rounded-md bg-[#d9ef54] px-2 py-1 text-[9px] font-extrabold uppercase text-[#193023]">{product.offer_info.badge_label}</span>}
        {!available && <span className="absolute inset-x-2 bottom-2 rounded-md bg-[#16231c]/85 px-2 py-1 text-center text-[10px] font-bold text-white">Out of stock</span>}
      </Link>
      {onWishlist && (
        <button onClick={e => onWishlist(product.id, e)} aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-lg border border-[#e1e9e3] bg-white shadow-sm">
          <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill={wished ? '#dc4c4c' : 'none'} stroke={wished ? '#dc4c4c' : '#52665a'} strokeWidth="2"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21.2l8.8-8.8a5.5 5.5 0 0 0 0-7.8Z"/></svg>
        </button>
      )}
      <div className={`flex flex-1 flex-col ${compact ? 'p-2.5' : 'p-3'}`}>
        <p className="mb-1 truncate text-[10px] font-extrabold uppercase tracking-wide text-[#668074]">{variant?.name || product.unit_label || product.category_name || 'Standard pack'}</p>
        <Link to={`/products/${product.slug}`}><h3 className="line-clamp-2 min-h-[2.5rem] text-[13px] font-bold leading-5 text-[#16231c]">{product.name}</h3></Link>
        {product.average_rating > 0 && <p className="mt-1 text-[11px] font-semibold text-[#53685d]"><span className="rounded bg-[#e6f3e9] px-1.5 py-0.5 text-[#176b45]">{'\u2605'} {Number(product.average_rating).toFixed(1)}</span> {product.review_count ? `(${product.review_count})` : ''}</p>}
        <div className="mt-2 flex flex-wrap items-baseline gap-x-1.5">
          <span className="text-[15px] font-extrabold text-[#16231c]">{price ? formatPrice(price) : 'Price on request'}</span>
          {original && <span className="text-[11px] text-[#78877f] line-through">{formatPrice(original)}</span>}
          {discount > 0 && <span className="text-[10px] font-bold text-[#b54532]">{discount}% off</span>}
        </div>
        <p className="mt-0.5 min-h-4 text-[10px] text-[#6c7c73]">{product.category_name || 'Paper essentials'}</p>
        <div className="mt-auto pt-2.5">
          {available ? (
            <div className="flex gap-1.5">
              {quantity > 0 ? (
                <div className="flex min-h-10 flex-1 items-center overflow-hidden rounded-lg bg-[#176b45] text-white" aria-label={`Quantity ${quantity}`}>
                  <button onClick={decrement} className="grid min-h-10 min-w-10 place-items-center text-xl font-bold hover:bg-white/10" aria-label={`Decrease ${product.name} quantity`}>-</button>
                  <span className="flex-1 text-center text-sm font-extrabold" aria-live="polite">{quantity}</span>
                  <button onClick={increment} disabled={adding} className="grid min-h-10 min-w-10 place-items-center text-xl font-bold hover:bg-white/10 disabled:opacity-50" aria-label={`Increase ${product.name} quantity`}>+</button>
                </div>
              ) : <button onClick={increment} disabled={adding} className="min-h-10 flex-1 rounded-lg border-2 border-[#176b45] bg-white px-2 text-xs font-extrabold uppercase text-[#176b45] transition hover:bg-[#176b45] hover:text-white disabled:opacity-60">{adding ? 'Adding...' : 'Add'}</button>}
              {onBuyNow && !compact && <button onClick={e => onBuyNow(product, e)} className="min-h-10 rounded-lg bg-[#eaf3e3] px-2.5 text-[10px] font-extrabold uppercase text-[#174e36] hover:bg-[#dcebd2]">Buy now</button>}
            </div>
          ) : <div className="min-h-10 rounded-lg bg-[#eef2ef] px-2 py-2.5 text-center text-xs font-bold text-[#78877f]">Unavailable</div>}
          {available && onBuyNow && compact && <button onClick={e => onBuyNow(product, e)} className="mt-1.5 min-h-8 w-full text-[10px] font-extrabold uppercase text-[#52665a] underline decoration-[#b7c7bc] underline-offset-4 hover:text-[#146b45]">Buy now</button>}
        </div>
      </div>
    </article>
  )
}
