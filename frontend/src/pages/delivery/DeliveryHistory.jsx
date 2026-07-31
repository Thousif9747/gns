import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { get, extractList } from '../../api/client'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import { formatPrice, formatDate, getStatusColor } from '../../utils/formatters'

export default function DeliveryHistory() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [codSummary, setCodSummary] = useState({ total: 0, cod: 0, collected: 0 })

  useEffect(() => {
    Promise.all([
      get('/orders/?status=DELIVERED'),
      get('/payments/'),
    ]).then(([ordersRes, paymentsRes]) => {
      if (ordersRes.ok) {
        const o = extractList(ordersRes.data)
        setOrders(o)
      }
      if (paymentsRes.ok) {
        const allPayments = paymentsRes.data.results || paymentsRes.data
        const total = allPayments.length
        const cod = allPayments.filter(p => p.chosen_method === 'cod').length
        const collected = allPayments.filter(p => p.chosen_method === 'cod' && p.current_status === 'COLLECTED').length
        setCodSummary({ total, cod, collected })
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />

  return (
    <div className="ops-route ops-delivery-page" data-page="delivery-history">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Delivery History</h1>

      {/* COD Summary Cards */}
      <div className="grid gap-4 grid-cols-3 mb-6">
        <SummaryCard label="Total Orders" value={orders.length} color="text-primary-600" />
        <SummaryCard label="COD Orders" value={codSummary.cod} color="text-amber-600" />
        <SummaryCard label="Cash Collected" value={codSummary.collected} color="text-emerald-600" />
      </div>

      {orders.length === 0 ? (
        <Card className="p-8 text-center">
          <EmptyState emoji="📋" title="No deliveries yet" subtitle="Completed deliveries will appear here." />
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.filter(Boolean).map(order => {
            const isCOD = order.payment?.chosen_method === 'cod'
            const isCollected = order.payment?.current_status === 'COLLECTED'
            return (
              <Link key={order.id} to={`/delivery/orders/${order.id}`}>
                <Card hover className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-gray-900">{order.order_number}</span>
                      {isCOD && (
                        <Badge className={`text-xs ml-2 ${isCollected ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-800'}`}>
                          {isCollected ? 'Cash Collected' : 'COD'}
                        </Badge>
                      )}
                      <span className="text-xs text-gray-400 ml-3">{formatDate(order.created_at)}</span>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {order.shipping_full_name} &middot; {order.shipping_city}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge className={getStatusColor(order.current_status)}>Delivered</Badge>
                      <p className="text-xs text-gray-500 mt-1">{formatPrice(order.total_amount)}</p>
                    </div>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value, color }) {
  return (
    <div className="rounded-2xl border border-eco-900/8 bg-white/70 backdrop-blur-md p-5 shadow-[0_4px_20px_rgba(26,61,31,0.05)]">
      <p className="text-xs uppercase tracking-[0.2em] text-gray-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${color}`}>{value}</p>
    </div>
  )
}
