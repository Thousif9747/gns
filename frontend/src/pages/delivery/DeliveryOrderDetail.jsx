import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { get, patch, post } from '../../api/client'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import { formatPrice, formatDateTime, getStatusColor } from '../../utils/formatters'

export default function DeliveryOrderDetail() {
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [payment, setPayment] = useState(null)
  const [paymentLoading, setPaymentLoading] = useState(true)
  const [collecting, setCollecting] = useState(false)

  useEffect(() => {
    loadOrder()
  }, [id])

  useEffect(() => {
    if (order?.id) {
      get('/payments/')
        .then(res => {
          if (res.ok) {
            const allPayments = res.data.results || res.data
            const p = allPayments.find(pay => String(pay.order) === String(order.id))
            if (p) setPayment(p)
          }
          setPaymentLoading(false)
        })
        .catch(() => setPaymentLoading(false))
    }
  }, [order?.id])

  async function loadOrder() {
    const res = await get(`/orders/${id}/`)
    if (res.ok) setOrder(res.data)
    setLoading(false)
  }

  async function updateOrderStatus(status) {
    setUpdating(true)
    const res = await patch(`/orders/${id}/update_status/`, { status })
    if (res.ok) setOrder(res.data)
    setUpdating(false)
  }

  async function collectPayment() {
    if (!payment || payment.chosen_method !== 'cod' || payment.current_status !== 'COD') return
    setCollecting(true)
    try {
      const res = await post(`/payments/${payment.id}/mark_collected/`, { remarks: 'Payment collected on delivery' })
      if (res.ok) {
        setPayment(prev => ({ ...prev, current_status: 'COLLECTED' }))
        loadOrder()
      }
    } catch {
      // network error — just reset collecting state
    }
    setCollecting(false)
  }

  function openMaps() {
    const a = order
    const q = `${a.shipping_address_line1}, ${a.shipping_address_line2}, ${a.shipping_city}, ${a.shipping_state}, ${a.shipping_postal_code}`
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`, '_blank')
  }

  if (loading) return <Spinner />
  if (!order) return (
    <Card className="p-8 text-center">
      <p className="text-gray-500">Order not found.</p>
      <Link to="/delivery" className="text-primary-600 hover:underline text-sm mt-2 inline-block">Back to Dashboard</Link>
    </Card>
  )

  const isCODAwaitingCash = payment?.chosen_method === 'cod' && payment?.current_status === 'COD'

  return (
    <div className="ops-route ops-delivery-page max-w-3xl mx-auto space-y-6" data-page="delivery-order">
      <div>
        <Link to="/delivery" className="text-xs text-gray-500 hover:text-gray-700">&larr; Back to Dashboard</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">{order.order_number}</h1>
      </div>

      {/* Status + Total */}
      <div className="grid gap-6 sm:grid-cols-2">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-primary-600 font-semibold mb-3">Status</p>
          <Badge className={`text-sm px-3 py-1 ${getStatusColor(order.current_status)}`}>
            {order.current_status}
          </Badge>
          {payment && (
            <div className="mt-2 flex flex-wrap gap-2">
              {payment.chosen_method === 'cod' && (
                <Badge className="text-xs bg-amber-100 text-amber-800">COD</Badge>
              )}
              {(payment.current_status === 'COD' || payment.current_status === 'COLLECTED') && (
                <Badge className={`text-xs ${getStatusColor(payment.current_status)}`}>
                  {payment.current_status === 'COD' ? 'Awaiting Cash' : 'Cash Collected'}
                </Badge>
              )}
            </div>
          )}
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-primary-600 font-semibold mb-3">Total</p>
          <p className="text-2xl font-bold text-gray-900">{formatPrice(order.total_amount)}</p>
        </Card>
      </div>

      {/* Action Card */}
      {order.current_status === 'PROCESSING' && (
        <Card className="p-6 text-center bg-emerald-50 border-emerald-200">
          <p className="text-emerald-800 font-semibold mb-4">Ready to start delivery</p>
          <Button
            size="lg"
            onClick={() => updateOrderStatus('SHIPPED')}
            disabled={updating}
            className="px-10"
          >
            {updating ? 'Starting...' : 'Start Delivery'}
          </Button>
        </Card>
      )}

      {order.current_status === 'SHIPPED' && (
        <Card className="p-6 text-center bg-amber-50 border-amber-200">
          <p className="text-amber-800 font-semibold mb-4">Out for delivery</p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={openMaps}>
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Navigate
            </Button>
            {isCODAwaitingCash ? (
              <Button
                onClick={collectPayment}
                disabled={collecting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {collecting ? 'Collecting...' : 'Collect Cash'}
              </Button>
            ) : (
              <Button
                onClick={() => updateOrderStatus('DELIVERED')}
                disabled={updating}
              >
                {updating ? 'Marking...' : 'Mark as Delivered'}
              </Button>
            )}
          </div>
          {isCODAwaitingCash && (
            <p className="text-xs text-amber-600 mt-3">Collect cash before marking as delivered</p>
          )}
        </Card>
      )}

      {order.current_status === 'DELIVERED' && (
        <Card className="p-5 text-center bg-green-50 border-green-200">
          <p className="text-green-700 font-semibold text-lg">&#10003; Delivered Successfully</p>
        </Card>
      )}

      {/* Shipping Address */}
      <Card className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-primary-600 font-semibold mb-3">Shipping Address</p>
            <p className="font-semibold text-gray-900">{order.shipping_full_name}</p>
            {order.shipping_phone && <p className="text-sm text-gray-600 mt-0.5">{order.shipping_phone}</p>}
            <p className="text-sm text-gray-600 mt-1">{order.shipping_address_line1}</p>
            {order.shipping_address_line2 && <p className="text-sm text-gray-600">{order.shipping_address_line2}</p>}
            <p className="text-sm text-gray-600">{order.shipping_city}, {order.shipping_state} - {order.shipping_postal_code}</p>
          </div>
          {order.current_status !== 'DELIVERED' && (
            <Button size="sm" variant="outline" onClick={openMaps}>
              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              Navigate
            </Button>
          )}
        </div>
      </Card>

      {/* Customer Info */}
      <Card className="p-5">
        <p className="text-xs uppercase tracking-[0.25em] text-primary-600 font-semibold mb-3">Customer</p>
        <p className="font-semibold text-gray-900">{order.user_name}</p>
        <p className="text-sm text-gray-600">{order.user_email}</p>
        {order.user_phone && <p className="text-sm text-gray-600">{order.user_phone}</p>}
      </Card>

      {/* Items */}
      <Card className="p-5">
        <p className="text-xs uppercase tracking-[0.25em] text-primary-600 font-semibold mb-3">Items ({order.items?.length || 0})</p>
        <div className="divide-y divide-beige-100">
          {(order.items || []).map(item => (
            <div key={item.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium text-gray-900">{item.product_name}</p>
                <p className="text-xs text-gray-400">Qty: {item.quantity} &times; {formatPrice(item.unit_price)}</p>
              </div>
              <p className="text-sm font-semibold text-gray-900">{formatPrice(item.line_total)}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Timeline */}
      <Card className="p-5">
        <p className="text-xs uppercase tracking-[0.25em] text-primary-600 font-semibold mb-3">Timeline</p>
        <div className="space-y-3">
          {(order.status_history || []).map(h => (
            <div key={h.id} className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-primary-500 mt-1.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {h.from_status || '—'} → {h.to_status}
                </p>
                <p className="text-xs text-gray-400">{formatDateTime(h.created_at)}</p>
                {h.remarks && <p className="text-xs text-gray-500 mt-0.5">{h.remarks}</p>}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Delivery Assignment History */}
      {order.delivery_assignments?.length > 0 && (
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-primary-600 font-semibold mb-3">Assignment History</p>
          <div className="space-y-2">
            {order.delivery_assignments.map(a => (
              <div key={a.id} className="flex items-start gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                <div>
                  <p className="text-gray-900">
                    Assigned to <span className="font-medium">{a.assigned_to_name}</span>
                    {a.assigned_by_name && <span className="text-gray-400"> by {a.assigned_by_name}</span>}
                  </p>
                  <p className="text-xs text-gray-400">{formatDateTime(a.created_at)}</p>
                  {a.started_at && <p className="text-xs text-gray-500">Started: {formatDateTime(a.started_at)}</p>}
                  {a.completed_at && <p className="text-xs text-gray-500">Completed: {formatDateTime(a.completed_at)}</p>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
