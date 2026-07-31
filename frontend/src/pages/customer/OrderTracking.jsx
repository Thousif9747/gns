import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { get, post, downloadFile } from '../../api/client'
import { useCart } from '../../context/CartContext'
import { useToast } from '../../context/ToastContext'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Button from '../../components/ui/Button'
import ReturnRequestModal from '../../components/ui/ReturnRequestModal'
import Modal from '../../components/ui/Modal'
import { formatDateTime, formatPrice, getStatusColor } from '../../utils/formatters'

const statusSteps = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED']
const statusIndex = s => statusSteps.indexOf(s)

function filterProgressiveHistory(history) {
  const flow = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED']
  let bestIdx = -1
  return (history || []).filter(entry => {
    const idx = flow.indexOf(entry.to_status)
    if (idx > bestIdx) {
      bestIdx = idx
      return true
    }
    return false
  })
}

export default function OrderTracking() {
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [payment, setPayment] = useState(null)
  const [paymentLoading, setPaymentLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [file, setFile] = useState(null)
  const [notes, setNotes] = useState('')
  const [uploadError, setUploadError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState('')
  const [reordering, setReordering] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const { fetchCart, totalItems } = useCart()
  const { showToast } = useToast()
  const navigate = useNavigate()

  async function executeReorder() {
    setShowConfirmModal(false)
    setReordering(true)
    const res = await post(`/orders/${id}/reorder/`)
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
    setReordering(false)
  }

  function handleReorder() {
    if (totalItems > 0) {
      setShowConfirmModal(true)
    } else {
      executeReorder()
    }
  }
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [orderRefunds, setOrderRefunds] = useState([])
  const [refundsLoading, setRefundsLoading] = useState(true)

  useEffect(() => {
    get(`/orders/${id}/`)
      .then(res => {
        if (res.ok) setOrder(res.data)
        else if (res.status === 404) setNotFound(true)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (order?.id) {
      get('/payments/')
        .then(res => {
          if (res.ok) {
            const allPayments = res.data.results || res.data
            const p = allPayments.find(pay => pay.order === order.id)
            if (p) setPayment(p)
          }
        })
        .catch(() => {})
        .finally(() => setPaymentLoading(false))
    } else {
      setPaymentLoading(false)
    }
  }, [order?.id])

  // Fetch refunds for this order
  useEffect(() => {
    if (order?.id) {
      get('/refunds/')
        .then(res => {
          if (res.ok) {
            const list = Array.isArray(res.data) ? res.data : (res.data.results || [])
            setOrderRefunds(list.filter(r => r.order === order.id))
          }
        })
        .catch(() => {})
        .finally(() => setRefundsLoading(false))
    } else {
      setRefundsLoading(false)
    }
  }, [order?.id])

  async function handleUpload(e) {
    e.preventDefault()
    if (!file) return setUploadError('Please select a file')
    setUploading(true)
    setUploadError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('customer_notes', notes)
      formData.append('chosen_method', selectedMethod)
      const res = await post(`/payments/${payment.id}/upload_proof/`, formData)
      if (res.ok) {
        setUploadSuccess(true)
        setPayment(prev => ({ ...prev, current_status: 'PROOF_UPLOADED' }))
      } else {
        const m = Object.values(res.data || {}).flat().join(', ')
        setUploadError(m || 'Upload failed')
      }
    } catch (err) {
      setUploadError('Upload failed. Please try again.')
    }
    setUploading(false)
  }

  function parseBankDetails(details) {
    if (!details) return null
    const map = {}
    details.split('\n').forEach(line => {
      const [key, ...rest] = line.split(':')
      map[key.trim().toLowerCase()] = rest.join(':').trim()
    })
    return map.bank || map['account holder'] || map.account || map.ifsc ? map : null
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>
  if (notFound) return <div className="w-full mx-auto px-4 sm:px-6 lg:px-10 py-20"><Card className="p-8 sm:p-12 bg-white/90 border-beige-200 shadow-card"><EmptyState emoji="404" title="Order not found"><Link to="/orders"><Button variant="outline">Back to Orders</Button></Link></EmptyState></Card></div>

  const currentStep = statusIndex(order.current_status)

  return (
    <div className="ops-route customer-workflow-page w-full mx-auto px-4 sm:px-6 lg:px-10 py-8" data-page="order-tracking">
      <Link to="/orders" className="text-sm text-primary-600 hover:text-primary-700 mb-4 inline-block">&larr; Back to Orders</Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order #{order.order_number || order.id}</h1>
          <p className="text-sm text-gray-500 mt-1">Placed on {formatDateTime(order.created_at)}</p>
        </div>
        <Badge className={`text-sm px-3 py-1 ${getStatusColor(order.current_status)}`}>{order.current_status}</Badge>
        {order.current_status === 'DELIVERED' && (
          <Button size="sm" onClick={handleReorder} disabled={reordering}>
            {reordering ? 'Reordering...' : 'Reorder'}
          </Button>
        )}
      </div>

      {/* Order Progress */}
      <Card className="p-6 mb-8">
        <h2 className="text-lg font-semibold mb-6">Order Status</h2>
        <div className="relative">
          <div className="hidden sm:block absolute top-1/2 left-0 right-0 h-0.5 bg-gray-200 -translate-y-1/2" />
          <div
            className="hidden sm:block absolute top-1/2 left-0 h-0.5 bg-primary-500 -translate-y-1/2 transition-all duration-500"
            style={{ width: `${Math.max(0, currentStep) * (100 / (statusSteps.length - 1))}%` }}
          />
          <div className="flex justify-between relative">
            {statusSteps.map((s, i) => {
              const done = i <= currentStep
              const isCurrent = i === currentStep
              return (
                <div key={s} className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold z-10 transition-colors ${
                    done ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'
                  } ${isCurrent ? 'ring-4 ring-primary-200' : ''}`}>
                    {done ? '✓' : i + 1}
                  </div>
                  <span className={`text-xs mt-2 font-medium ${done ? 'text-primary-600' : 'text-gray-400'}`}>
                    {s.charAt(0) + s.slice(1).toLowerCase()}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Status Timeline with Dates */}
        {filterProgressiveHistory(order.status_history).length > 0 && (
          <div className="mt-8 border-t border-beige-200 pt-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Timeline</h3>
            <div className="space-y-0">
              {filterProgressiveHistory(order.status_history).map((entry, idx) => {
                const history = filterProgressiveHistory(order.status_history)
                const isLast = idx === history.length - 1
                const label = entry.to_status
                  ? entry.to_status.charAt(0) + entry.to_status.slice(1).toLowerCase().replace(/_/g, ' ')
                  : 'Status Update'
                return (
                  <div key={entry.id || idx} className="relative flex gap-4 pb-5">
                    {/* Vertical line */}
                    {!isLast && (
                      <div className="absolute left-[11px] top-5 bottom-0 w-0.5 bg-beige-200" />
                    )}
                    {/* Dot */}
                    <div className={`relative z-10 shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                      entry.to_status === 'DELIVERED' ? 'bg-green-500' :
                      entry.to_status === 'SHIPPED' ? 'bg-blue-500' :
                      entry.to_status === 'PROCESSING' ? 'bg-orange-400' :
                      entry.to_status === 'CANCELLED' ? 'bg-red-500' :
                      entry.to_status === 'PAYMENT_REJECTED' ? 'bg-red-400' :
                      entry.to_status === 'PAYMENT_APPROVED' ? 'bg-emerald-500' :
                      'bg-primary-500'
                    }`}>
                      {entry.to_status === 'DELIVERED' || entry.to_status === 'CANCELLED' ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : entry.to_status === 'SHIPPED' ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
                        </svg>
                      ) : (
                        <div className="w-2 h-2 bg-white rounded-full" />
                      )}
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-sm font-semibold text-gray-800">{label}</p>
                      {entry.remarks && (
                        <p className="text-xs text-gray-500 mt-0.5">{entry.remarks}</p>
                      )}
                      <p className="text-[11px] text-gray-400 mt-1">
                        {formatDateTime(entry.created_at)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </Card>

      {/* Receipt Card */}
      <Card className="p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Order Receipt</h2>
          <span className="text-xs text-gray-400">Receipt #{order.order_number || order.id}</span>
        </div>

        {/* Shipping Address + Payment Method */}
        <div className="grid sm:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Shipping Address</h3>
            <div className="text-sm text-gray-700 space-y-0.5">
              {order.shipping_full_name && <p className="font-medium">{order.shipping_full_name}</p>}
              {order.shipping_phone && <p className="text-gray-400">{order.shipping_phone}</p>}
              {order.shipping_address_line1 && <p>{order.shipping_address_line1}</p>}
              {order.shipping_address_line2 && <p>{order.shipping_address_line2}</p>}
              {(order.shipping_city || order.shipping_state || order.shipping_postal_code) && (
                <p>{[order.shipping_city, order.shipping_state, order.shipping_postal_code].filter(Boolean).join(', ')}</p>
              )}
              {order.shipping_country && <p>{order.shipping_country}</p>}
            </div>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Payment Method</h3>
            <div className="text-sm text-gray-700 space-y-1">
              {payment?.chosen_method === 'qr_code' && payment?.qr_code_image && (
                <div className="border-l-4 border-blue-500 pl-3 py-1">
                  <p className="text-xs font-medium text-gray-800">QR Code</p>
                  <img src={payment.qr_code_image} alt="QR" className="max-w-[80px] rounded mt-1 border border-gray-200" />
                </div>
              )}
              {payment?.chosen_method === 'upi_id' && payment?.upi_id && (
                <div className="border-l-4 border-green-500 pl-3 py-1">
                  <p className="text-xs font-medium text-gray-800">UPI ID</p>
                  <p className="text-sm font-mono text-gray-600">{payment.upi_id}</p>
                </div>
              )}
              {payment?.chosen_method === 'bank_transfer' && payment?.payment_details && (() => {
                try {
                  const bd = {}
                  payment.payment_details.split('\n').forEach(line => {
                    const [k, ...rest] = line.split(':')
                    bd[k.trim().toLowerCase()] = rest.join(':').trim()
                  })
                  return bd.bank || bd['account holder'] ? (
                    <div className="border-l-4 border-purple-500 pl-3 py-1">
                      <p className="text-xs font-medium text-gray-800">Bank Transfer</p>
                      <div className="text-xs text-gray-500 space-y-0.5">
                        {bd.bank && <p>Bank: {bd.bank}</p>}
                        {bd['account holder'] && <p>A/c Holder: {bd['account holder']}</p>}
                      </div>
                    </div>
                  ) : null
                } catch(e) { return null }
              })()}
              {payment?.chosen_method === 'cod' && (
                <div className="border-l-4 border-amber-500 pl-3 py-1">
                  <p className="text-xs font-medium text-gray-800">Cash on Delivery</p>
                  <p className="text-xs text-gray-500 mt-1">Pay with cash upon delivery</p>
                </div>
              )}
              {!payment?.chosen_method && (
                <p className="text-gray-400 italic">Not selected yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Delivery Person Info */}
        {order.delivery_person_name && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Delivery Partner</h3>
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-700 font-bold text-sm shrink-0">
                {order.delivery_person_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-800">{order.delivery_person_name}</p>
                {order.delivery_person_phone && (
                  <p className="text-xs text-gray-500">{order.delivery_person_phone}</p>
                )}
              </div>
            </div>
          </div>
        )}

        <hr className="border-gray-200 mb-4" />

        {/* Items */}
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Items</h3>
        <div className="space-y-3 mb-4">
          {(order.items || []).filter(Boolean).map((item, idx) => (
            <div key={item.id || idx} className="py-2 border-b border-gray-50 last:border-0">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-900 truncate font-medium">
                  {item.product_name || `Product #${item.product}`} &times; {item.quantity}
                </span>
                <span className="font-semibold text-gray-900 ml-4">{formatPrice(item.line_total || 0)}</span>
              </div>
              {item.applied_offer_name ? (
                <div className="text-xs text-right mt-0.5 space-y-0.5">
                  <span className="text-gray-400 line-through">{formatPrice(parseFloat(item.unit_price || 0) * item.quantity + parseFloat(item.discount_amount || 0))}</span>
                  <span className="text-green-600 ml-2">Save {formatPrice(item.discount_amount || 0)}</span>
                  <p className="text-green-600">Offer: {item.applied_offer_name}</p>
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-right mt-0.5">{formatPrice(item.unit_price)} each</p>
              )}
            </div>
          ))}
        </div>

        <hr className="border-gray-200 mb-4" />

        {/* Totals */}
        <div className="max-w-xs ml-auto space-y-1.5 text-sm">
          <div className="flex justify-between text-gray-500">
            <span>Subtotal</span>
            <span>{formatPrice(order.subtotal || 0)}</span>
          </div>
          {parseFloat(order.discount_amount || 0) > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span>
              <span>-{formatPrice(order.discount_amount)}</span>
            </div>
          )}
          <div className="flex justify-between text-gray-500">
            <span>CGST (9%)</span>
            <span>{formatPrice(order.cgst_amount || 0)}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>SGST (9%)</span>
            <span>{formatPrice(order.sgst_amount || 0)}</span>
          </div>
          <div className="flex justify-between text-green-600">
            <span>Shipping</span>
            <span>FREE</span>
          </div>
          <div className="flex justify-between font-bold text-gray-900 text-base border-t border-gray-200 pt-2">
            <span>Total</span>
            <span className="text-primary-600">{formatPrice(order.total_amount || 0)}</span>
          </div>
        </div>
      </Card>

      {/* Return Section — only for delivered orders with no prior refund */}
      {order.current_status === 'DELIVERED' && !refundsLoading && orderRefunds.length === 0 && (
        <Card className="p-6 mb-8 border-l-4 border-l-primary-500">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Need to Return Something?</h2>
              <p className="text-sm text-gray-500 mt-1">You can request a return within 30 days of delivery.</p>
            </div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button onClick={() => setShowReturnModal(true)}>
                <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Request Return
              </Button>
            </motion.div>
          </div>
        </Card>
      )}

      {/* Already requested — explain why button is hidden */}
      {order.current_status === 'DELIVERED' && !refundsLoading && orderRefunds.length > 0 && (
        <Card className="p-4 mb-8 border-l-4 border-l-gray-300 bg-gray-50/50">
          <p className="text-sm text-gray-500">
            A return request has already been submitted for this order. Check the status above.
          </p>
        </Card>
      )}

      {/* Refund Tracking — show after a return has been requested */}
      {!refundsLoading && orderRefunds.length > 0 && (
        <Card className="p-6 mb-8 border-l-4 border-l-amber-500">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Return / Refund Status</h2>
          <div className="space-y-5">
            {orderRefunds.map(refund => (
              <div key={refund.id}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-500">
                    Refund #{refund.order_number || refund.id?.toString().slice(0, 8)}
                  </span>
                  <Badge className={getStatusColor(refund.current_status)}>
                    {refund.current_status?.replace(/_/g, ' ')}
                  </Badge>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 mb-4 text-sm">
                  <div>
                    <span className="text-xs text-gray-400 block">Amount</span>
                    <span className="font-medium">{formatPrice(refund.refund_amount || 0)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 block">Requested On</span>
                    <span className="font-medium">{refund.created_at ? formatDateTime(refund.created_at) : '—'}</span>
                  </div>
                </div>

                <div className="mb-4">
                  <span className="text-xs text-gray-400 block mb-1">Reason</span>
                  <p className="text-sm text-gray-700 bg-beige-50 rounded-lg p-3">{refund.reason || '—'}</p>
                </div>

                {/* Admin remarks if rejected */}
                {refund.current_status === 'REJECTED' && refund.admin_remarks && (
                  <div className="p-3 bg-red-50 rounded-lg text-sm text-red-700">
                    <span className="font-semibold">Admin remarks:</span> {refund.admin_remarks}
                  </div>
                )}

                {/* Status timeline */}
                {refund.status_history && refund.status_history.length > 0 && (
                  <div>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-3">Timeline</span>
                    <div className="space-y-0">
                      {refund.status_history.map((h, idx) => {
                        const isLast = idx === refund.status_history.length - 1
                        const label = h.to_status?.replace(/_/g, ' ')
                        return (
                          <div key={h.id || idx} className="relative flex gap-4 pb-4">
                            {!isLast && (
                              <div className="absolute left-[11px] top-5 bottom-0 w-0.5 bg-beige-200" />
                            )}
                            <div className={`relative z-10 shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                              h.to_status === 'COMPLETED' ? 'bg-green-500' :
                              h.to_status === 'APPROVED' ? 'bg-blue-500' :
                              h.to_status === 'REJECTED' ? 'bg-red-500' :
                              'bg-amber-400'
                            }`}>
                              <div className="w-2 h-2 bg-white rounded-full" />
                            </div>
                            <div className="flex-1 min-w-0 pt-0.5">
                              <p className="text-sm font-semibold text-gray-800">{label}</p>
                              {h.remarks && <p className="text-xs text-gray-500 mt-0.5">{h.remarks}</p>}
                              <p className="text-[11px] text-gray-400 mt-1">{formatDateTime(h.created_at)}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Return Request Modal */}
      <ReturnRequestModal
        isOpen={showReturnModal}
        onClose={() => setShowReturnModal(false)}
        order={order}
      />

      {/* Reorder confirm modal */}
      <Modal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} title="Replace Cart?">
        <p className="text-sm text-gray-600 mb-4">
          Your cart currently has <strong>{totalItems} item(s)</strong>. Reordering will replace them with the items from this order. Proceed?
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" size="sm" onClick={() => setShowConfirmModal(false)}>Cancel</Button>
          <Button size="sm" onClick={executeReorder}>Proceed</Button>
        </div>
      </Modal>

      {/* Payment Section */}
      {payment && !paymentLoading && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Payment</h2>

          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-gray-500">Status:</span>
            <Badge className={getStatusColor(payment.current_status)}>
              {payment.current_status === 'COD' ? 'COD Pending' : payment.current_status}
            </Badge>
          </div>

          {/* COD Payment UI */}
          {payment.chosen_method === 'cod' && (
            <>
              {payment.current_status === 'COD' && (
                <div className="p-4 bg-amber-50 rounded-lg text-sm text-amber-700 flex items-start gap-3">
                  <span className="text-lg">💵</span>
                  <div>
                    <p className="font-medium">Pay with cash upon delivery</p>
                    <p className="mt-1">Amount due: <strong>{formatPrice(order.total_amount || 0)}</strong></p>
                    <p className="mt-1 text-amber-600">Your order will be processed and delivered. Pay the delivery person in cash.</p>
                  </div>
                </div>
              )}
              {payment.current_status === 'COLLECTED' && (
                <div className="p-4 bg-green-50 rounded-lg text-sm text-green-700 flex items-start gap-3">
                  <span className="text-lg">✅</span>
                  <div>
                    <p className="font-medium">Payment collected on delivery</p>
                    <p className="mt-1">Amount: {formatPrice(order.total_amount || 0)}</p>
                  </div>
                </div>
              )}
              {payment.current_status === 'COLLECTED' && (
                <Button
                  onClick={() => downloadFile(`/payments/${payment.id}/download_receipt/`, `receipt_${order.order_number}.pdf`)}
                  className="mt-3"
                  size="sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download Receipt
                </Button>
              )}
            </>
          )}

          {/* Show online payment methods + upload for pending/rejected payments */}
          {payment.chosen_method !== 'cod' && (payment.current_status === 'INITIATED' || payment.current_status === 'REJECTED') && !uploadSuccess && (
            <>
              <p className="text-sm text-gray-500 mb-4">Choose any method below to pay, then upload the proof.</p>

              <div className="space-y-4 mb-6">
                {payment?.qr_code_image && (
                  <div className="border-l-4 border-blue-500 bg-white rounded-xl shadow-sm p-5 flex items-start gap-5">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 text-sm font-bold flex items-center justify-center shrink-0 mt-1">1</div>
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-gray-900 mb-2">Pay via QR Code</h3>
                      <img src={payment.qr_code_image} alt="QR" className="max-w-[130px] rounded-lg shadow-sm border border-gray-100" />
                      <p className="text-xs text-gray-400 mt-2">Open any UPI app and scan this QR code to pay.</p>
                    </div>
                  </div>
                )}
                {payment?.upi_id && (
                  <div className="border-l-4 border-green-500 bg-white rounded-xl shadow-sm p-5 flex items-start gap-5">
                    <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 text-sm font-bold flex items-center justify-center shrink-0 mt-1">2</div>
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-gray-900 mb-2">Pay via UPI ID</h3>
                      <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm font-mono font-semibold text-gray-800 border border-gray-200 inline-block">
                        {payment.upi_id}
                      </div>
                      <p className="text-xs text-gray-400 mt-2">Send payment directly to this UPI ID from any UPI app.</p>
                    </div>
                  </div>
                )}
                {parseBankDetails(payment?.payment_details) && (() => {
                  const bd = parseBankDetails(payment.payment_details)
                  return (
                    <div className="border-l-4 border-purple-500 bg-white rounded-xl shadow-sm p-5 flex items-start gap-5">
                      <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 text-sm font-bold flex items-center justify-center shrink-0 mt-1">3</div>
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-gray-900 mb-2">Pay via Bank Transfer</h3>
                        <div className="text-xs space-y-1 text-gray-600 bg-gray-50 rounded-lg p-3 border border-gray-100">
                          {bd.bank && <p><span className="text-gray-400">Bank:</span> {bd.bank}</p>}
                          {bd['account holder'] && <p><span className="text-gray-400">A/c Holder:</span> {bd['account holder']}</p>}
                          {bd.account && <p><span className="text-gray-400">A/c No:</span> {bd.account}</p>}
                          {bd.ifsc && <p><span className="text-gray-400">IFSC:</span> {bd.ifsc}</p>}
                        </div>
                        <p className="text-xs text-gray-400 mt-2">NEFT / IMPS / RTGS transfer.</p>
                      </div>
                    </div>
                  )
                })()}
              </div>

              {payment.admin_remarks && payment.current_status === 'REJECTED' && (
                <div className="mb-4 p-3 bg-red-50 rounded-lg text-sm text-red-700">
                  Admin remarks: {payment.admin_remarks}
                </div>
              )}
              <hr className="my-4 border-gray-200" />
              <h3 className="text-sm font-medium text-gray-900 mb-3">Upload Payment Proof</h3>
              <p className="text-xs text-gray-400 mb-3">Upload screenshot or transaction receipt after paying.</p>
              <form onSubmit={handleUpload} className="space-y-4">
                {uploadError && <div className="text-sm p-3 rounded-lg bg-red-50 text-red-600">{uploadError}</div>}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Payment Method <span className="text-red-500">*</span></label>
                  <select
                    value={selectedMethod}
                    onChange={e => setSelectedMethod(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                    required
                  >
                    <option value="">-- Choose a payment method --</option>
                    {payment?.qr_code_image && <option value="qr_code">QR Code</option>}
                    {payment?.upi_id && <option value="upi_id">UPI ID</option>}
                    {payment?.payment_details && <option value="bank_transfer">Bank Transfer</option>}
                  </select>
                </div>
                <input type="file" accept="image/*,.pdf" onChange={e => setFile(e.target.files[0])} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100" />
                <p className="text-[10px] text-gray-400">Max 10MB per file</p>
                <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                <Button type="submit" disabled={uploading}>{uploading ? 'Uploading...' : 'Submit Proof'}</Button>
              </form>
            </>
          )}

          {payment.chosen_method !== 'cod' && uploadSuccess && (
            <div className="p-4 bg-green-50 rounded-lg text-sm text-green-700">
              ✅ Payment proof uploaded! Admin will verify it shortly.
            </div>
          )}

          {payment.chosen_method !== 'cod' && payment.current_status === 'PROOF_UPLOADED' && !uploadSuccess && (
            <div className="p-4 bg-yellow-50 rounded-lg text-sm text-yellow-700">
              ⏳ Payment proof submitted. Waiting for admin verification.
            </div>
          )}

          {payment.chosen_method !== 'cod' && payment.current_status === 'APPROVED' && (
            <div>
              <div className="p-4 bg-green-50 rounded-lg text-sm text-green-700">
                ✅ Payment approved by admin.
              </div>
              <Button
                onClick={() => downloadFile(`/payments/${payment.id}/download_receipt/`, `receipt_${order.order_number}.pdf`)}
                className="mt-3"
                size="sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Receipt
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
