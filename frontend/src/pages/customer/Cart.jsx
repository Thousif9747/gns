import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import { useCart } from '../../context/CartContext'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import Spinner from '../../components/ui/Spinner'
import { formatPrice } from '../../utils/formatters'

export default function Cart() {
  const { items, loading, updateQuantity, removeItem, totalAmount } = useCart()

  function QuantityControl({ item }) {
    const [value, setValue] = useState(item.quantity || 1)

    useEffect(() => {
      setValue(item.quantity || 1)
    }, [item.quantity])

    const commit = (v) => {
      const n = parseInt(v, 10)
      if (isNaN(n) || n < 1) {
        // if invalid or less than 1, remove the item
        updateQuantity(item.id, 0)
        return
      }
      if (n !== (item.quantity || 0)) updateQuantity(item.id, n)
    }

    return (
      <div className="flex items-center border border-gray-300 rounded-lg">
        <button
          onClick={() => {
            const next = Math.max(1, (Number(value) || 1) - 1)
            setValue(next)
            commit(next)
          }}
          className="px-2.5 py-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-50 text-sm transition-colors"
        >
          -
        </button>
        <input
          type="number"
          min="1"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
          className="w-12 text-center text-sm font-medium border-x border-gray-300 py-1.5 focus:outline-none focus:ring-0"
        />
        <button
          onClick={() => {
            const next = (Number(value) || 1) + 1
            setValue(next)
            commit(next)
          }}
          className="px-2.5 py-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-50 text-sm transition-colors"
        >
          +
        </button>
      </div>
    )
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>

  if (items.length === 0) {
    return (
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-10 py-20">
        <EmptyState emoji="🛒" title="Your cart is empty" description="Looks like you haven't added anything yet. Start shopping!">
          <Link to="/products"><Button>Browse Products</Button></Link>
        </EmptyState>
      </div>
    )
  }

  const grandTotal = totalAmount

  return (
    <div className="ops-route customer-workflow-page w-full mx-auto px-4 sm:px-6 lg:px-10 py-8" data-page="cart">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Shopping Cart's</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <AnimatePresence mode="popLayout">
            {items.filter(Boolean).map(item => (
              <motion.div
                key={item.id || item.product}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="flex gap-4 p-4">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                    <img
                      src={item.product_image || `https://placehold.co/200x200/f1f5f9/64748b?text=${(item.product_name || 'P')?.charAt(0)}`}
                      alt={item.product_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                    <div className="flex-1 min-w-0">
                      <Link to={`/products/${item.product_slug || ''}`}>
                        <h3 className="font-medium text-gray-900 text-sm truncate hover:text-primary-600">
                          {item.product_name}
                        </h3>
                      </Link>
                      {item.variant_name && (
                        <p className="text-xs text-gray-500 mt-0.5">{item.variant_name}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {item?.offer_info ? (
                          <>
                            <p className="text-sm font-semibold text-primary-600">
                              {formatPrice(item.line_total / item.quantity)}
                            </p>
                            <p className="text-xs text-gray-400 line-through">
                              {formatPrice(item.product_price || item?.base_price)}
                            </p>
                            {item?.offer_info.badge_label && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700">
                                {item?.offer_info.badge_label}
                              </span>
                            )}
                          </>
                        ) : (
                          <p className="text-sm font-semibold text-primary-600">
                            {formatPrice(item.product_price || item?.base_price)}
                          </p>
                        )}
                      </div>
                      {item?.offer_info && (
                        <p className="text-xs text-green-600 font-medium mt-0.5">
                          You save {formatPrice((item.product_price || item?.base_price) * item.quantity - item.line_total)}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-3">
                      <QuantityControl item={item} />
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-gray-900">
                          {formatPrice(item.line_total || ((item.product_price || item?.base_price) * item.quantity))}
                        </span>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="lg:col-span-1">
            <Card className="p-6 sticky top-24">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
            <div className="space-y-3 text-sm">
              {items.filter(Boolean).map(item => (
                <div key={item.id || item.product} className="flex justify-between text-xs text-gray-600 border-b border-beige-100 pb-1.5">
                  <span className="truncate">{item.product_name} &times; {item.quantity}</span>
                  <span className="font-medium ml-2">{formatPrice(item.line_total || ((item.product_price || item?.base_price) * item.quantity))}</span>
                </div>
              ))}
              <hr className="border-gray-200" />
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">{formatPrice(totalAmount)}</span>
              </div>
              <hr className="border-gray-200" />
              <div className="flex justify-between text-base">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-primary-600">{formatPrice(grandTotal)}</span>
              </div>
            </div>
            <Link to="/checkout" className="block mt-6">
              <Button className="w-full">Proceed to Checkout</Button>
            </Link>
            <Link to="/products" className="block mt-3 text-center text-sm text-primary-600 hover:text-primary-700">
              Continue Shopping
            </Link>
          </Card>
        </div>
      </div>

      <section className="mt-12 mb-6">
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-[0.28em] text-primary-600 mb-2">Keep exploring</p>
          <h2 className="font-display text-3xl text-eco-800">You might also like</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: 'Premium Paper Plates', desc: 'Sturdy & eco-friendly', slug: 'products' },
            { name: 'Disposable Glasses', desc: 'Leak-proof design', slug: 'products' },
            { name: 'Party Combo Pack', desc: 'Plates + Glasses bundle', slug: 'products' },
            { name: 'Eco Lunch Boxes', desc: 'Compostable containers', slug: 'products' },
          ].map((item, i) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <Link to={`/${item.slug}`}>
                <Card hover className="overflow-hidden !bg-white/90 border-white/70 group">
                  <div className="h-28 bg-gradient-to-br from-[#edf9ed] to-[#cfead0] flex items-center justify-center">
                    <span className="text-3xl opacity-40">
                      {['🍽', '🥤', '📦', '🌿'][i]}
                    </span>
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-semibold text-eco-900">{item.name}</h3>
                    <p className="text-xs text-eco-700 mt-0.5">{item.desc}</p>
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  )
}
