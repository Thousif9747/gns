import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { get } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import { formatPrice, formatDate, getStatusColor } from '../../utils/formatters'

export default function DeliveryDashboard() {
  const { user } = useAuth()
  const [orders, setOrders] = useState([])
  const [stats, setStats] = useState({ assigned_today: 0, active: 0, completed_today: 0 })
  const [cashCollected, setCashCollected] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    get('/orders/my_deliveries/').then(res => {
      if (res.ok) {
        const d = res.data
        if (d.results) {
          setOrders(d.results)
          setStats(d.stats || { assigned_today: 0, active: 0, completed_today: 0 })
        } else {
          setOrders(d.orders || [])
          setStats(d.stats || { assigned_today: 0, active: 0, completed_today: 0 })
        }
      }
      setLoading(false)
    }).catch(() => setLoading(false))

    get('/payments/').then(res => {
      if (res.ok) {
        const allPayments = res.data.results || res.data
        const codCollected = allPayments
          .filter(p => p.chosen_method === 'cod' && p.current_status === 'COLLECTED')
          .reduce((sum, p) => sum + parseFloat(p.amount_paid || p.amount || 0), 0)
        setCashCollected(codCollected)
      }
    }).catch(() => setLoading(false))
  }, [])

  const active = orders.filter(o => !['DELIVERED', 'CANCELLED'].includes(o.current_status))
  const completed = orders.filter(o => o.current_status === 'DELIVERED')

  if (loading) return <Spinner />

  return (
    <div className="ops-route ops-delivery-page" data-page="delivery-dashboard">
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-100 via-beige-50 to-cream text-eco-900 p-6 lg:p-8 shadow-modal border border-beige-200 mb-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(5,150,105,0.12),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(217,164,65,0.14),transparent_30%)]" />
        <div className="relative">
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-600 mb-2">Delivery Dashboard</p>
          <h1 className="font-display text-4xl md:text-5xl">Welcome, {user?.full_name || 'Delivery Partner'}</h1>
          <p className="mt-3 text-gray-700">{formatDate(new Date().toISOString())}</p>
        </div>
      </section>

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 mb-6">
        <StatCard label="Assigned Today" value={stats.assigned_today} color="text-primary-600" />
        <StatCard label="Active Now" value={stats.active} color="text-emerald-600" />
        <StatCard label="Completed Today" value={stats.completed_today} color="text-blue-600" />
        <StatCard label="Cash Collected" value={formatPrice(cashCollected)} color="text-amber-600" />
      </div>

      {/* Active Orders — Large Cards */}
      {active.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Active Orders ({active.length})</h2>
          {active.filter(Boolean).map(order => {
            const isCOD = order.payment?.chosen_method === 'cod'
            const isCashPending = isCOD && order.payment?.current_status === 'COD'
            return (
              <Card key={order.id} className={`p-5 sm:p-6 border-l-4 ${isCOD ? 'border-l-amber-500' : 'border-l-emerald-500'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-base font-bold text-gray-900">{order.order_number}</span>
                      <Badge className={`text-xs ${getStatusColor(order.current_status)}`}>{order.current_status}</Badge>
                      {isCOD && (
                        <Badge className="text-xs bg-amber-100 text-amber-800">
                          {isCashPending ? 'COD - Collect Cash' : 'COD'}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                      <span>{formatDate(order.created_at)}</span>
                      <span>&middot;</span>
                      <span>{order.items?.length || 0} item(s)</span>
                      <span>&middot;</span>
                      <span>{formatPrice(order.total_amount)}</span>
                    </div>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Customer</p>
                    <p className="font-semibold text-gray-900">{order.user_name || 'N/A'}</p>
                    {order.user_phone && <p className="text-sm text-gray-500">{order.user_phone}</p>}
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Delivery Address</p>
                    <p className="text-sm text-gray-700">{order.shipping_address_line1}</p>
                    <p className="text-sm text-gray-500">{order.shipping_city}, {order.shipping_state} - {order.shipping_postal_code}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link to={`/delivery/orders/${order.id}`}>
                    <Button size="sm">
                      {isCashPending ? 'Collect Cash & Deliver' : 'View Details'}
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(
                      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                        `${order.shipping_address_line1}, ${order.shipping_city}, ${order.shipping_state}, ${order.shipping_postal_code}`
                      )}`, '_blank'
                    )}
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Navigate
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className="p-8 text-center mb-8">
          <EmptyState emoji="📦" title="No active deliveries" subtitle="Once assigned, orders will appear here." />
        </Card>
      )}

      {/* Completed Today */}
      {completed.length > 0 && (
        <>
          <h2 className="text-lg font-bold text-gray-900 mt-8 mb-4">Completed Today</h2>
          <div className="space-y-2">
            {completed.filter(Boolean).map(order => {
              const isCOD = order.payment?.chosen_method === 'cod'
              return (
                <Link key={order.id} to={`/delivery/orders/${order.id}`}>
                  <Card hover className="p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-gray-900">{order.order_number}</span>
                        <span className="text-xs text-gray-400">{order.shipping_full_name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {isCOD && <Badge className="text-xs bg-amber-100 text-amber-800">COD</Badge>}
                        <span className="text-xs text-gray-400">{formatPrice(order.total_amount)}</span>
                        <Badge className="bg-green-100 text-green-700 text-xs">Delivered</Badge>
                      </div>
                    </div>
                  </Card>
                </Link>
              )
            })}
          </div>
        </>
      )}

      {/* Older Completed */}
      {completed.length === 0 && orders.filter(o => o.current_status === 'DELIVERED').length > 0 && (
        <Link to="/delivery/history" className="text-sm text-primary-600 hover:underline mt-4 inline-block">
          View delivery history &rarr;
        </Link>
      )}
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div className="rounded-2xl border border-eco-900/8 bg-white/70 backdrop-blur-md p-5 shadow-[0_4px_20px_rgba(26,61,31,0.05)]">
      <p className="text-xs uppercase tracking-[0.2em] text-gray-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${color}`}>{value}</p>
    </div>
  )
}
