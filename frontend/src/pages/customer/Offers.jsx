import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { get, extractList } from '../../api/client'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric',
  }).format(new Date(dateStr))
}

export default function Offers() {
  const [offers, setOffers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    get('/catalog/offers/')
      .then(res => {
        if (res.ok) setOffers(extractList(res.data))
        else setOffers([])
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>

  return (
    <div className="ops-route customer-workflow-page max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-page="offers">
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-eco-900 via-eco-800 to-emerald-950 text-white mb-10 p-8 lg:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(217,164,65,0.16),transparent_30%)]" />
        <div className="relative">
          <p className="text-xs uppercase tracking-[0.3em] text-gold-300 mb-3">Deals & Promotions</p>
          <h1 className="font-display text-4xl md:text-5xl">Current Offers</h1>
          <p className="mt-3 text-white/75 max-w-xl">Take advantage of our latest promotions and discounts. Offers are updated regularly.</p>
        </div>
      </section>

      {offers.length === 0 ? (
        <EmptyState
          emoji="🎉"
          title="No active offers"
          description="There are no active offers right now. Check back later!"
        >
          <Link to="/products"><button className="px-5 py-2.5 bg-primary-500 text-white rounded-full text-sm font-medium hover:bg-primary-600 transition-colors">Browse Products</button></Link>
        </EmptyState>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-3">
          {offers.map((offer, i) => (
            <motion.div
              key={offer.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card hover className="overflow-hidden h-full flex flex-col">
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      {offer.badge_label && (
                        <Badge variant="gold" className="mb-2">{offer.badge_label}</Badge>
                      )}
                      <h3 className="text-lg font-bold text-eco-900 line-clamp-1">{offer.name}</h3>
                    </div>
                    <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold ${
                      offer.discount_type === 'PERCENT'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {offer.discount_type === 'PERCENT'
                        ? `${offer.discount_value}% OFF`
                        : `₹${offer.discount_value} OFF`}
                    </span>
                  </div>

                  <p className="text-sm text-gray-500">
                    {offer.discount_type === 'PERCENT'
                      ? `Get ${offer.discount_value}% discount on selected products`
                      : `Flat ₹${offer.discount_value} off on selected items`}
                  </p>

                  {offer.min_purchase_amount && (
                    <p className="text-xs text-gray-400 mt-2">
                      Min. purchase: ₹{offer.min_purchase_amount}
                    </p>
                  )}

                  <div className="mt-auto pt-4 space-y-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                      <span>Valid: {formatDate(offer.start_date)} – {formatDate(offer.end_date)}</span>
                    </div>

                    {offer.code && (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-beige-100 rounded-lg text-xs font-mono text-eco-700">
                        <span>Code:</span>
                        <span className="font-bold tracking-wider">{offer.code}</span>
                      </div>
                    )}

                    {offer.products?.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-400 mb-1.5">
                          Applicable on {offer.product_count} product{offer.product_count !== 1 ? 's' : ''}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {offer.products.slice(0, 4).map(p => (
                            <Link
                              key={p.id}
                              to={`/products/${p.slug}`}
                              className="px-2.5 py-1 bg-beige-50 rounded-full text-xs text-eco-700 hover:bg-primary-50 hover:text-primary-700 transition-colors"
                            >
                              {p.name}
                            </Link>
                          ))}
                          {offer.product_count > 4 && (
                            <span className="px-2 py-1 text-xs text-gray-400">+{offer.product_count - 4} more</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-5 pb-5">
                  <Link
                    to="/products"
                    className="block w-full text-center py-2.5 rounded-full bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors"
                  >
                    Shop Products
                  </Link>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
