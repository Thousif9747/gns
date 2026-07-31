import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { get, post, extractList } from '../../api/client'
import { useCart } from '../../context/CartContext'
import { useToast } from '../../context/ToastContext'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { formatDate, formatPrice, getStatusColor } from '../../utils/formatters'

export default function MyOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [reorderingId, setReorderingId] = useState(null)
  const [confirmOrderId, setConfirmOrderId] = useState(null)
  const { fetchCart, totalItems } = useCart()
  const { showToast } = useToast()
  const navigate = useNavigate()

  async function executeReorder(orderId) {
    setConfirmOrderId(null)
    setReorderingId(orderId)
    const res = await post(`/orders/${orderId}/reorder/`)
    if (res.ok) {
      await fetchCart()
      const added = res.data.added?.length || 0
      const skipped = res.data.skipped || []
      let msg = `${added} item(s) added to cart.`
      if (skipped.length > 0) {
        msg += ` ${skipped.length} item(s) skipped.`
      }
      showToast({ title: 'Reorder successful', message: msg, type: 'success' })
      navigate('/cart')
    } else {
      showToast({ title: 'Reorder failed', message: res.data?.detail || 'Something went wrong', type: 'error' })
    }
    setReorderingId(null)
  }

  function handleReorder(orderId) {
    if (totalItems > 0) {
      setConfirmOrderId(orderId)
    } else {
      executeReorder(orderId)
    }
  }

  useEffect(() => {
    const params = new URLSearchParams()
    if (statusFilter) params.append('status', statusFilter)
    const query = params.toString() ? `?${params.toString()}` : ''
    get(`/orders/${query}`)
      .then(res => {
        if (res.ok) setOrders(extractList(res.data))
      })
      .finally(() => setLoading(false))
  }, [statusFilter])

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>

  return (
    <div className="ops-route customer-workflow-page w-full mx-auto px-4 sm:px-6 lg:px-10 py-8" data-page="my-orders">
      <Card className="p-6 sm:p-8 mb-8 bg-white/90 border-beige-200 shadow-card">
        <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
        <p className="mt-2 text-sm text-gray-500">Track your order history and jump back into any purchase details.</p>
      </Card>

      <Card className="p-4 mb-6 bg-white/90 border-beige-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Status:</label>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All Orders</option>
            <option value="PENDING">Pending</option>
            <option value="PROCESSING">Processing</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </Card>

      {orders.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
          {orders.map((order, i) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link to={`/orders/${order.id}`}>
                <Card hover className="p-4 sm:p-6 h-full">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-900">#{order.id}</span>
                        <Badge className={getStatusColor(order.current_status)}>{order.current_status}</Badge>
                      </div>
                      <p className="text-xs text-gray-500">
                        Placed on {formatDate(order.created_at)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {order.items?.length || 0} item(s)
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-lg font-bold text-primary-600">
                        {formatPrice(order.total_amount || order.total)}
                      </p>
                      {order.current_status === 'DELIVERED' && (
                        <Button
                          size="sm"
                          onClick={e => { e.preventDefault(); handleReorder(order.id) }}
                          disabled={reorderingId === order.id}
                          className="mt-1"
                        >
                          {reorderingId === order.id ? 'Reordering...' : 'Reorder'}
                        </Button>
                      )}
                      <div className="mt-1">
                        <span className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                          View Details &rarr;
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card className="p-8 sm:p-12 bg-white/90 border-beige-200 shadow-card">
          <EmptyState emoji="📋" title="No orders yet" description="Place your first order to see it here.">
            <Link to="/products"><Button>Start Shopping</Button></Link>
          </EmptyState>
        </Card>
      )}

      {/* Reorder confirm modal */}
      <Modal isOpen={!!confirmOrderId} onClose={() => setConfirmOrderId(null)} title="Replace Cart?">
        <p className="text-sm text-gray-600 mb-4">
          Your cart currently has <strong>{totalItems} item(s)</strong>. Reordering will replace them with the items from this order. Proceed?
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" size="sm" onClick={() => setConfirmOrderId(null)}>Cancel</Button>
          <Button size="sm" onClick={() => executeReorder(confirmOrderId)}>Proceed</Button>
        </div>
      </Modal>
    </div>
  )
}
