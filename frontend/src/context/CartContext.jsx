import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { get, post, del, patch, extractList } from '../api/client'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchCart = useCallback(async () => {
    if (!user) { setItems([]); return }
    setLoading(true)
    const res = await get('/commerce/cart-items/')
    if (res.ok) {
      const serverItems = extractList(res.data)
      // Preserve local product_price (variant price) if server doesn't return it
      setItems(prev => serverItems.map(s => {
        const local = prev.find(i => i.product === s.product && (i.variant || null) === (s.variant || null))
        return {
          ...s,
          product_price: s.product_price || local?.product_price || s.base_price || 0,
          product_name: s.product_name || local?.product_name || '',
          product_slug: s.product_slug || local?.product_slug || '',
        }
      }))
    }
    setLoading(false)
  }, [user])

  useEffect(() => { fetchCart() }, [fetchCart])

  async function addItem(product, quantity = 1, variant = null) {
    const variantId = variant?.id || null
    const unitPrice = variant ? parseFloat(variant.price) : (parseFloat(product?.base_price) || parseFloat(product?.product_price || 0))
    const variantName = variant?.name || ''

    if (!user) {
      setItems(prev => {
        const key = variantId ? `${product.id}-${variantId}` : product.id
        const e = prev.find(i => {
          const iKey = i.variant ? `${i.product}-${i.variant}` : i.product
          return iKey === key
        })
        if (e) {
          return prev.map(i => {
            const iKey = i.variant ? `${i.product}-${i.variant}` : i.product
            return iKey === key ? { ...i, quantity: i.quantity + quantity, line_total: (i.product_price || unitPrice) * (i.quantity + quantity) } : i
          })
        }
        return [...prev, {
          id: Date.now().toString(),
          product: product.id,
          variant: variantId,
          variant_name: variantName,
          product_name: product.name || product.product_name,
          product_slug: product.slug || product.product_slug,
          product_price: unitPrice,
          product_image: product.image_url || product.product_image || '',
          quantity,
          line_total: unitPrice * quantity,
        }]
      })
      return
    }
    const payload = { product: product.id, quantity }
    if (variantId) payload.variant = variantId
    const res = await post('/commerce/cart-items/', payload)
    if (res.ok) {
      // Update local state directly to preserve variant pricing (server may not return product_price)
      setItems(prev => {
        const key = variantId ? `${product.id}-${variantId}` : product.id
        const existing = prev.find(i => {
          const iKey = i.variant ? `${i.product}-${i.variant}` : i.product
          return iKey === key
        })
        if (existing) {
          return prev.map(i => {
            const iKey = i.variant ? `${i.product}-${i.variant}` : i.product
            return iKey === key
              ? { ...i, quantity: i.quantity + quantity, line_total: (i.product_price || unitPrice) * (i.quantity + quantity) }
              : i
          })
        }
        const serverItem = res.data || {}
        return [...prev, {
          id: serverItem.id || Date.now().toString(),
          product: product.id,
          variant: variantId,
          variant_name: variantName,
          product_name: product.name || product.product_name,
          product_slug: product.slug || product.product_slug,
          product_price: unitPrice,
          product_image: product.image_url || product.product_image || '',
          quantity,
          line_total: unitPrice * quantity,
        }]
      })
      return
    }
    if (res.status === 400 && res.data?.non_field_errors) { fetchCart(); return }
  }

  async function removeItem(cartItemId) {
    if (!user) {
      setItems(prev => prev.filter(i => i.product !== cartItemId && i.id !== cartItemId))
      return
    }
    await del(`/commerce/cart-items/${cartItemId}/`)
    fetchCart()
  }

  async function updateQuantity(productId, quantity, variantId) {
    if (!user) {
      if (quantity < 1) return removeItem(productId)
      setItems(prev => prev.map(i => {
        const matchKey = variantId ? `${i.product}-${i.variant}` : i.product
        const targetKey = variantId ? `${productId}-${variantId}` : productId
        return matchKey === targetKey
          ? { ...i, quantity, line_total: (i.product_price || i?.base_price) * quantity }
          : i
      }))
      return
    }
    if (quantity < 1) return removeItem(productId)
    // If the identifier matches a cart-item ID, PATCH the cart-item to the absolute quantity.
    const byId = items.find(i => i.id === productId)
    if (byId) {
      await patch(`/commerce/cart-items/${productId}/`, { quantity })
      fetchCart()
      return
    }
    // Backend treats POST /commerce/cart-items/ as a delta update by product ID.
    const current = items.find(i => i.product === productId || i.id === productId)
    const delta = current ? quantity - (current.quantity || 0) : quantity
    if (delta === 0) return
    const payload = { product: productId, quantity: delta }
    if (variantId) payload.variant = variantId
    await post('/commerce/cart-items/', payload)
    fetchCart()
  }

  function clearCart() { setItems([]) }

  /* ── Direct Buy (Buy Now) support ── */
  const [directCheckoutItem, setDirectCheckoutItem] = useState(null)
  function clearDirectCheckout() { setDirectCheckoutItem(null) }

  const totalItems = items.reduce((s, i) => s + (i.quantity || 0), 0)
  const totalAmount = items.reduce(
    (s, i) => s + parseFloat(i.line_total || ((i.product_price || i?.base_price || 0) * (i.quantity || 0))),
    0
  )

  return (
    <CartContext.Provider value={{
      items, loading, addItem, removeItem, updateQuantity, clearCart,
      totalItems, totalAmount, fetchCart,
      directCheckoutItem, setDirectCheckoutItem, clearDirectCheckout,
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const c = useContext(CartContext)
  if (!c) throw new Error('useCart must be used within CartProvider')
  return c
}
