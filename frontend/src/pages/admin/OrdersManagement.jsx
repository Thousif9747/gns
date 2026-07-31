import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { get, patch, extractList, post, downloadFile } from '../../api/client'
import { useToast } from '../../context/ToastContext'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/OperationsUI'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import { formatDate, formatPrice, getStatusColor } from '../../utils/formatters'

const statuses = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']
const ORDER_FLOW = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED']
const STATUS_LABELS = { PENDING: 'Pending', PROCESSING: 'Processing', SHIPPED: 'Shipped', DELIVERED: 'Delivered' }

export default function OrdersManagement() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewOrder, setViewOrder] = useState(null)
  const [manageOrder, setManageOrder] = useState(null)
  const [updating, setUpdating] = useState(null)
  const [payment, setPayment] = useState(null)
  const [paymentProof, setPaymentProof] = useState(null)
  const [previewProof, setPreviewProof] = useState(null)
  const [reviewRemarks, setReviewRemarks] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [deliveryPersons, setDeliveryPersons] = useState([])
  const [assigning, setAssigning] = useState(false)
  const [deliveryPartnerFilter, setDeliveryPartnerFilter] = useState('')
  const { showToast } = useToast()

  useEffect(() => {
    if (manageOrder) {
      get('/orders/delivery_persons/').then(res => {
        if (res.ok) setDeliveryPersons(extractList(res.data))
      })
    }
  }, [manageOrder])

  useEffect(() => {
    get('/orders/delivery_persons/').then(res => {
      if (res.ok) setDeliveryPersons(extractList(res.data))
    })
  }, [])

  async function assignDelivery(orderId, personId) {
    setAssigning(true)
    const res = await post(`/orders/${orderId}/assign_delivery/`, { delivery_person_id: personId })
    if (res.ok) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...res.data } : o))
      setManageOrder(prev => prev?.id === orderId ? res.data : prev)
      showToast({ title: 'Assigned', message: 'Delivery person assigned successfully', type: 'success' })
    } else {
      showToast({ title: 'Error', message: res.data?.detail || res.data?.error || 'Something went wrong', type: 'error' })
    }
    setAssigning(false)
  }

  // Fetch orders
  useEffect(() => {
    const params = new URLSearchParams()
    if (statusFilter) params.append('status', statusFilter)
    if (dateFrom) params.append('date_from', dateFrom)
    if (dateTo) params.append('date_to', dateTo)
    if (deliveryPartnerFilter) params.append('delivery_person', deliveryPartnerFilter)
    const query = params.toString() ? `?${params.toString()}` : ''
    get(`/orders/${query}`)
      .then(res => {
        if (res.ok) {
          const data = (extractList(res.data)).map(o => ({ ...o, status: o.current_status }))
          setOrders(data)
        }
      })
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }, [statusFilter, dateFrom, dateTo, deliveryPartnerFilter])

  // Fetch payment data for the selected manage order
  useEffect(() => {
    if (manageOrder?.id) {
      get('/payments/')
        .then(res => {
          if (res.ok) {
            const allPayments = res.data.results || res.data
            const p = allPayments.find(pay => pay.order === manageOrder.id)
            if (p) {
              setPayment(p)
              const proofs = p.proofs || []
              const currentProof = proofs.find(pr => pr.is_current)
              setPaymentProof(currentProof || null)
            } else {
              setPayment(null)
              setPaymentProof(null)
            }
          }
        })
        .catch(() => {
          setPayment(null)
          setPaymentProof(null)
        })
    } else {
      setPayment(null)
      setPaymentProof(null)
      setReviewRemarks('')
      setRejecting(false)
    }
  }, [manageOrder?.id])

  async function approvePayment(paymentId) {
    setReviewing(true)
    try {
      const res = await post(`/payments/${paymentId}/review/`, { decision: 'APPROVED', remarks: '' })
      if (res.ok) {
        setPayment(prev => ({ ...prev, current_status: 'APPROVED' }))
        get('/orders/').then(r => { if (r.ok) setOrders((r.data.results || r.data).map(o => ({ ...o, status: o.current_status }))) })
        showToast({ title: 'Approved', message: 'Payment approved successfully', type: 'success' })
      } else {
        showToast({ title: 'Error', message: res.data?.detail || res.data?.error || 'Something went wrong', type: 'error' })
      }
    } catch (err) {
      showToast({ title: 'Error', message: 'Something went wrong', type: 'error' })
    }
    setReviewing(false)
  }

  async function rejectPayment(paymentId) {
    if (!reviewRemarks.trim()) return
    setReviewing(true)
    try {
      const res = await post(`/payments/${paymentId}/review/`, { decision: 'REJECTED', remarks: reviewRemarks })
      if (res.ok) {
        setPayment(prev => ({ ...prev, current_status: 'REJECTED' }))
        get('/orders/').then(r => { if (r.ok) setOrders((r.data.results || r.data).map(o => ({ ...o, status: o.current_status }))) })
        showToast({ title: 'Rejected', message: 'Payment rejected', type: 'success' })
      } else {
        showToast({ title: 'Error', message: res.data?.detail || res.data?.error || 'Something went wrong', type: 'error' })
      }
    } catch (err) {
      showToast({ title: 'Error', message: 'Something went wrong', type: 'error' })
    }
    setReviewing(false)
  }

  async function updateStatus(id, status) {
    setUpdating(id)
    try {
      const res = await patch(`/orders/${id}/update_status/`, { status })
      if (res.ok) {
        setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))
        if (manageOrder?.id === id) setManageOrder({ ...manageOrder, status })
        showToast({ title: 'Updated', message: `Order status changed to ${status}`, type: 'success' })
      } else {
        showToast({ title: 'Error', message: res.data?.detail || res.data?.error || 'Something went wrong', type: 'error' })
      }
    } catch (err) {
      showToast({ title: 'Error', message: 'Something went wrong', type: 'error' })
    }
    setUpdating(null)
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

  if (loading) return <Spinner />

  // ========== FULL PAGE MANAGE VIEW ==========
  if (manageOrder) {
    return (
      <div>
        {/* Back button */}
        <button
          onClick={() => { setManageOrder(null); setRejecting(false); setReviewRemarks('') }}
          className="text-sm text-primary-600 hover:text-primary-700 mb-4 inline-flex items-center gap-1"
        >
          &larr; Back to Orders
        </button>

        {/* Heading with Download Receipt */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Manage Order #{manageOrder.order_number || manageOrder.id?.slice(0, 8)}</h1>
          {(payment?.current_status === 'APPROVED' || payment?.current_status === 'COLLECTED') && (
            <Button variant="outline" size="sm" onClick={() => downloadFile(`/payments/${payment.id}/download_receipt/`, `receipt_${manageOrder.order_number || manageOrder.id}.pdf`)}>
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download Receipt (PDF)
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT COLUMN — Order Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick info bar */}
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 text-lg">{manageOrder.user_email || manageOrder.user || '-'}</p>
                  <p className="text-sm text-gray-400">{formatPrice(manageOrder.total_amount || manageOrder.total || 0)} &bull; {manageOrder.items?.length || 0} items</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`text-sm px-3 py-1 ${getStatusColor(manageOrder.status)}`}>{manageOrder.status}</Badge>
                  {payment?.chosen_method === 'cod' && (
                    <Badge className="text-sm px-3 py-1 bg-amber-100 text-amber-800">COD</Badge>
                  )}
                </div>
              </div>
            </Card>

            {/* Customer Info */}
            <Card className="p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Customer</h3>
              <div className="text-sm text-gray-700 space-y-1">
                {manageOrder.user_name && <p className="font-medium">{manageOrder.user_name}</p>}
                <p className="text-gray-500">{manageOrder.user_email || manageOrder.user || '-'}</p>
                {manageOrder.user_phone && <p className="text-gray-500">{manageOrder.user_phone}</p>}
              </div>
            </Card>

            {/* GST Information */}
            {(manageOrder.customer_gst || manageOrder.admin_gst) && (
              <Card className="p-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">GST Information</h3>
                <div className="space-y-2 text-sm">
                  {manageOrder.customer_gst && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Customer GSTIN</span>
                      <span className="font-medium text-gray-800">{manageOrder.customer_gst}</span>
                    </div>
                  )}
                  {manageOrder.admin_gst && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Seller GSTIN</span>
                      <span className="font-medium text-gray-800">{manageOrder.admin_gst}</span>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Shipping Address */}
            {(manageOrder.shipping_address_line1 || manageOrder.shipping_full_name) && (
              <Card className="p-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Shipping Address</h3>
                <div className="text-sm text-gray-700 space-y-1">
                  {manageOrder.shipping_full_name && <p className="font-medium">{manageOrder.shipping_full_name}</p>}
                  {manageOrder.shipping_phone && <p className="text-gray-500">{manageOrder.shipping_phone}</p>}
                  {manageOrder.shipping_address_line1 && <p>{manageOrder.shipping_address_line1}</p>}
                  {manageOrder.shipping_address_line2 && <p>{manageOrder.shipping_address_line2}</p>}
                  {(manageOrder.shipping_city || manageOrder.shipping_state || manageOrder.shipping_postal_code) && (
                    <p>{[manageOrder.shipping_city, manageOrder.shipping_state, manageOrder.shipping_postal_code].filter(Boolean).join(', ')}</p>
                  )}
                  {manageOrder.shipping_country && <p>{manageOrder.shipping_country}</p>}
                </div>
              </Card>
            )}

            {/* Items */}
            {manageOrder.items?.length > 0 && (
              <Card className="p-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Items</h3>
                <div className="space-y-2">
                  {manageOrder.items.map((item, idx) => (
                    <div key={item.id || idx} className="flex items-center justify-between text-sm py-2 border-b border-gray-50 last:border-0">
                      <div className="flex-1 min-w-0">
                      <p className="text-gray-800 font-medium truncate">{item.product_name || `Product #${item.product}`}</p>
                      {item.variant_name && <p className="text-xs text-gray-500">{item.variant_name}</p>}
                      <p className="text-xs text-gray-400">Qty: {item.quantity} &times; {formatPrice(item.unit_price || item.price || item.line_total / item.quantity)}</p>
                      </div>
                      <p className="font-semibold text-gray-900 ml-4">{formatPrice(item.line_total || 0)}</p>
                    </div>
                  ))}
                </div>
                <hr className="border-gray-100 my-3" />
                <div className="space-y-1 text-sm max-w-xs ml-auto">
                  <div className="flex justify-between text-gray-500">
                    <span>Subtotal</span>
                    <span>{formatPrice(manageOrder.subtotal || 0)}</span>
                  </div>
                  {parseFloat(manageOrder.discount_amount || 0) > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>-{formatPrice(manageOrder.discount_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-500">
                    <span>CGST (9%)</span>
                    <span>{formatPrice(manageOrder.cgst_amount || 0)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>SGST (9%)</span>
                    <span>{formatPrice(manageOrder.sgst_amount || 0)}</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>Shipping</span>
                    <span>FREE</span>
                  </div>
                </div>
                <hr className="border-gray-100 my-3" />
                <div className="flex justify-between text-base font-bold text-gray-900">
                  <span>Total</span>
                  <span className="text-primary-600">{formatPrice(manageOrder.total_amount || manageOrder.total || 0)}</span>
                </div>
              </Card>
            )}
          </div>

          {/* RIGHT COLUMN — Actions */}
          <div className="space-y-6">
            {/* Order Progress — Vertical Stepper */}
            <Card className="p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Order Progress</h3>
              {(!payment || payment.current_status === 'APPROVED' || payment.current_status === 'COLLECTED' || payment.chosen_method === 'cod') ? (
                manageOrder.status === 'CANCELLED' ? (
                  <div className="p-3 bg-red-50 rounded-lg text-sm text-red-700">
                    This order has been cancelled.
                  </div>
                ) : (
                  <div className="space-y-0">
                    {ORDER_FLOW.map((s, i) => {
                      const currentIdx = ORDER_FLOW.indexOf(manageOrder.status)
                      const isCompleted = i < currentIdx
                      const isCurrent = i === currentIdx
                      const isFuture = i > currentIdx
                      return (
                        <div key={s}>
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 flex flex-col items-center">
                              {isCompleted ? (
                                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              ) : isCurrent ? (
                                <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center animate-pulse ring-4 ring-primary-200">
                                  <div className="w-2.5 h-2.5 rounded-full bg-white" />
                                </div>
                              ) : (
                                <button
                                  onClick={() => updateStatus(manageOrder.id, s)}
                                  disabled={updating === manageOrder.id}
                                  className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center bg-white hover:border-primary-400 transition-colors disabled:opacity-50"
                                >
                                  <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                                </button>
                              )}
                            </div>
                            <div className="flex-1 min-w-0 pt-1">
                              <p className={`text-sm font-medium ${isCompleted ? 'text-gray-500' : isCurrent ? 'text-gray-900' : 'text-gray-400'}`}>
                                {STATUS_LABELS[s]}
                              </p>
                              <div className={`text-xs mt-0.5 ${isCompleted ? 'text-green-600' : isCurrent ? 'text-primary-600 font-medium' : 'text-gray-400'}`}>
                                {isCompleted ? 'Done' : isCurrent ? 'Current' : (
                                  <button
                                    onClick={() => updateStatus(manageOrder.id, s)}
                                    disabled={updating === manageOrder.id}
                                    className="font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50"
                                  >
                                    {updating === manageOrder.id ? 'Updating...' : `Mark as ${STATUS_LABELS[s]}`}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                          {i < ORDER_FLOW.length - 1 && (
                            <div className="border-l-2 border-gray-200 h-6 ml-[19px]" />
                          )}
                        </div>
                      )
                    })}
                    {(manageOrder.status === 'PENDING' || manageOrder.status === 'PROCESSING') && (
                      <div className="pt-3 mt-2 border-t border-gray-100">
                        <button
                          onClick={() => updateStatus(manageOrder.id, 'CANCELLED')}
                          disabled={updating === manageOrder.id}
                          className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                        >
                          Cancel Order
                        </button>
                      </div>
                    )}
                  </div>
                )
              ) : (
                <div className="p-3 bg-yellow-50 rounded-lg text-sm text-yellow-700">
                  ⏳ Status updates available after payment is approved.
                </div>
              )}
            </Card>

            {/* Delivery Assignment */}
            <Card className="p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Delivery Assignment</h3>
              {manageOrder.delivery_person_name ? (
                <div className="space-y-2">
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-emerald-600 font-medium">{manageOrder.delivery_person_name}</span>
                    </div>
                    {manageOrder.delivery_person_phone && (
                      <p className="text-xs text-gray-500 mt-0.5">{manageOrder.delivery_person_phone}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      defaultValue=""
                      onChange={e => {
                        if (e.target.value) assignDelivery(manageOrder.id, e.target.value)
                      }}
                    >
                      <option value="" disabled>Reassign...</option>
                      {deliveryPersons.map(p => (
                        <option key={p.id} value={p.id}>{p.profile?.full_name || p.email}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-gray-400">Not yet assigned</p>
                  <div className="flex items-center gap-2">
                    <select
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      defaultValue=""
                      disabled={assigning}
                      onChange={e => {
                        if (e.target.value) assignDelivery(manageOrder.id, e.target.value)
                      }}
                    >
                      <option value="" disabled>Select delivery person...</option>
                      {deliveryPersons.map(p => (
                        <option key={p.id} value={p.id}>{p.profile?.full_name || p.email}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </Card>

            {/* Payment Section */}
            {payment && (
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Payment</h3>
                  <Badge className={getStatusColor(payment.current_status)}>{payment.current_status}</Badge>
                </div>

                {/* Payment method details */}
                <div className="space-y-2 mb-4">
                  {payment.chosen_method === 'cod' && (
                    <div className="border-l-4 border-amber-500 bg-amber-50/30 rounded-lg p-3">
                      <p className="text-xs font-semibold text-gray-800 mb-1">Cash on Delivery</p>
                      <p className="text-xs text-gray-600">Pay with cash upon delivery</p>
                    </div>
                  )}
                  {payment.chosen_method === 'qr_code' && payment.qr_code_image && (
                    <div className="border-l-4 border-blue-500 bg-blue-50/30 rounded-lg p-3">
                      <p className="text-xs font-semibold text-gray-800 mb-1">QR Code</p>
                      <img src={payment.qr_code_image} alt="QR" className="max-w-[80px] rounded border border-gray-200" />
                    </div>
                  )}
                  {payment.chosen_method === 'upi_id' && payment.upi_id && (
                    <div className="border-l-4 border-green-500 bg-green-50/30 rounded-lg p-3">
                      <p className="text-xs font-semibold text-gray-800 mb-1">UPI ID</p>
                      <p className="text-sm font-mono font-semibold text-gray-700">{payment.upi_id}</p>
                    </div>
                  )}
                  {payment.chosen_method === 'bank_transfer' && payment.payment_details && parseBankDetails(payment.payment_details) && (() => {
                    const bd = parseBankDetails(payment.payment_details)
                    return (
                      <div className="border-l-4 border-purple-500 bg-purple-50/30 rounded-lg p-3">
                        <p className="text-xs font-semibold text-gray-800 mb-1">Bank Transfer</p>
                        <div className="text-xs text-gray-600 space-y-0.5">
                          {bd.bank && <p><span className="text-gray-400">Bank:</span> {bd.bank}</p>}
                          {bd['account holder'] && <p><span className="text-gray-400">A/c Holder:</span> {bd['account holder']}</p>}
                          {bd.account && <p><span className="text-gray-400">A/c No:</span> {bd.account}</p>}
                          {bd.ifsc && <p><span className="text-gray-400">IFSC:</span> {bd.ifsc}</p>}
                        </div>
                      </div>
                    )
                  })()}
                </div>

                {/* Mark COD as Collected */}
                {payment.chosen_method === 'cod' && payment.current_status === 'COD' && (
                  <div className="mb-4">
                    <Button
                      className="w-full"
                      onClick={async () => {
                        setReviewing(true)
                        try {
                          const res = await post(`/payments/${payment.id}/mark_collected/`, { remarks: 'Payment collected on delivery' })
                          if (res.ok) {
                            setPayment(prev => ({ ...prev, current_status: 'COLLECTED' }))
                            get('/orders/').then(r => { if (r.ok) setOrders((r.data.results || r.data).map(o => ({ ...o, status: o.current_status }))) })
                            showToast({ title: 'Collected', message: 'COD payment marked as collected', type: 'success' })
                          } else {
                            showToast({ title: 'Error', message: res.data?.detail || res.data?.error || 'Something went wrong', type: 'error' })
                          }
                        } catch (err) {
                          showToast({ title: 'Error', message: 'Something went wrong', type: 'error' })
                        }
                        setReviewing(false)
                      }}
                      disabled={reviewing}
                    >
                      {reviewing ? 'Processing...' : 'Mark COD as Collected'}
                    </Button>
                  </div>
                )}

                {/* Payment proof — file card */}
                {(paymentProof?.file || paymentProof?.file_url) && (
                  <div className="border-l-4 border-amber-500 bg-amber-50/30 rounded-lg p-3 mb-4">
                    <p className="text-xs font-semibold text-gray-800 mb-2">Proof Uploaded</p>
                    <div className="flex items-center gap-3">
                      {paymentProof.file_type === 'image' ? (
                        <img
                          src={paymentProof.file_url || paymentProof.file}
                          alt="Payment proof"
                          className="w-14 h-14 rounded object-cover border border-gray-200 flex-shrink-0 cursor-pointer"
                          onClick={() => setPreviewProof(paymentProof)}
                        />
                      ) : (
                        <div
                          className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center flex-shrink-0 cursor-pointer"
                          onClick={() => {
                            const url = paymentProof.file_url || paymentProof.file
                            if (url) window.open(url, '_blank')
                          }}
                        >
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => {
                            if (paymentProof.file_type === 'image') {
                              setPreviewProof(paymentProof)
                            } else {
                              const url = paymentProof.file_url || paymentProof.file
                              if (url) window.open(url, '_blank')
                            }
                          }}
                          className="text-sm font-medium text-primary-600 hover:text-primary-700 truncate block text-left"
                        >
                          {paymentProof.original_filename || 'View Proof'}
                        </button>
                        <p className="text-xs text-gray-400">{paymentProof.file_type}</p>
                      </div>
                    </div>
                    {paymentProof.customer_notes && (
                      <p className="text-xs text-gray-500 mt-2 italic border-t border-amber-100 pt-2">"{paymentProof.customer_notes}"</p>
                    )}
                  </div>
                )}

                {/* Approve / Reject — side by side */}
                {payment.current_status === 'PROOF_UPLOADED' && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Button className="flex-1" onClick={() => approvePayment(payment.id)} disabled={reviewing}>
                        {reviewing ? 'Processing...' : 'Approve Payment'}
                      </Button>
                      <Button className="flex-1" variant="outline" onClick={() => setRejecting(!rejecting)} disabled={reviewing}>
                        Reject
                      </Button>
                    </div>
                    {rejecting && (
                      <div className="space-y-2">
                        <textarea
                          rows={3}
                          value={reviewRemarks}
                          onChange={e => setReviewRemarks(e.target.value)}
                          placeholder="Reason for rejection..."
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        <Button className="w-full" variant="danger" onClick={() => rejectPayment(payment.id)} disabled={reviewing || !reviewRemarks.trim()}>
                          Confirm Rejection
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Approved */}
                {payment.current_status === 'APPROVED' && (
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <p className="text-sm text-green-700 font-medium">✓ Payment Approved</p>
                  </div>
                )}

                {/* Rejected */}
                {payment.current_status === 'REJECTED' && payment.admin_remarks && (
                  <div className="p-3 bg-red-50 rounded-lg text-sm text-red-700">
                    Rejected: {payment.admin_remarks}
                  </div>
                )}
              </Card>
            )}
            {previewProof && createPortal(
              <div
                className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                onClick={() => setPreviewProof(null)}
              >
                <div className="absolute inset-0 bg-black/80" />
                <div
                  className="relative max-w-4xl w-full max-h-[90vh] flex items-center justify-center"
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    onClick={() => setPreviewProof(null)}
                    className="absolute -top-3 -right-3 z-10 p-1.5 bg-white rounded-full shadow-md text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <img
                    src={previewProof.file_url || previewProof.file}
                    alt="Payment proof"
                    className="max-w-full max-h-[85vh] rounded-lg shadow-2xl object-contain"
                  />
                </div>
              </div>,
              document.body
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="ops-route ops-admin-page" data-page="orders">
      <PageHeader eyebrow="Fulfilment" title="Orders" description="Review payments, assignments and fulfilment progress." />
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-eco-100 via-beige-50 to-cream text-eco-900 p-6 lg:p-8 shadow-modal border border-beige-200 mb-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(90,160,95,0.12),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(217,164,65,0.14),transparent_30%)]" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.3em] text-primary-600 mb-2">Order Management</p>
            <h1 className="font-display text-4xl md:text-5xl">Orders</h1>
            <p className="mt-3 text-gray-700 max-w-xl">View, filter, and manage all customer orders from one place.</p>
          </div>
        </div>
      </section>

      {/* Filters */}
      <Card className="p-4 mb-6 bg-white/90 border-beige-200">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="PROCESSING">Processing</option>
              <option value="SHIPPED">Shipped</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Date To</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Delivery Partner</label>
            <select
              value={deliveryPartnerFilter}
              onChange={e => setDeliveryPartnerFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">All Partners</option>
              {deliveryPersons.map(p => (
                <option key={p.id} value={p.id}>{p.profile?.full_name || p.email}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Orders Table */}
      {orders.length > 0 ? (
        <Card className="overflow-hidden bg-white/90 border-beige-200 shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-beige-50 text-left text-gray-500 uppercase tracking-[0.18em] text-[11px]">
                  <th className="px-4 py-4 font-medium">ID</th>
                  <th className="px-4 py-4 font-medium">Customer</th>
                  <th className="px-4 py-4 font-medium">Items</th>
                  <th className="px-4 py-4 font-medium">Total</th>
                  <th className="px-4 py-4 font-medium">Status</th>
                  <th className="px-4 py-4 font-medium">Partner</th>
                  <th className="px-4 py-4 font-medium">Date</th>
                  <th className="px-4 py-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id} className="border-b border-beige-100 hover:bg-beige-50/70 transition-colors">
                    <td className="px-4 py-3 font-medium">#{order.id.slice(0, 8)}</td>
                    <td className="px-4 py-3">{order.user_email || order.user || '-'}</td>
                    <td className="px-4 py-3">{order.items?.length || 0}</td>
                    <td className="px-4 py-3 font-medium">{formatPrice(order.total_amount || order.total)}</td>
                    <td className="px-4 py-3">
                      <Badge className={getStatusColor(order.current_status)}>{order.current_status}</Badge>
                      {order.payment?.chosen_method === 'cod' && (
                        <Badge className="ml-1 bg-amber-100 text-amber-800 text-[10px]">COD</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {order.delivery_person_name || <span className="text-gray-300 italic">Unassigned</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(order.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setViewOrder(order)}>
                          View
                        </Button>
                        <Button size="sm" onClick={() => setManageOrder(order)}>
                          Manage
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <EmptyState emoji="📋" title="No orders yet" />
      )}

      {/* View Modal (read-only) */}
      <Modal isOpen={!!viewOrder} onClose={() => setViewOrder(null)} title={`Order #${viewOrder?.order_number || viewOrder?.id?.slice(0, 8) || ''}`}>
        {viewOrder && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <Badge className={getStatusColor(viewOrder.status)}>{viewOrder.status}</Badge>
              <span className="text-xs text-gray-400">{formatDate(viewOrder.created_at)}</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Customer</p>
              <div className="text-gray-700 space-y-0.5">
                {viewOrder.user_name && <p className="font-medium">{viewOrder.user_name}</p>}
                <p className="text-gray-500">{viewOrder.user_email || viewOrder.user || '-'}</p>
                {viewOrder.user_phone && <p className="text-gray-500">{viewOrder.user_phone}</p>}
              </div>
            </div>
            {(viewOrder.shipping_address_line1 || viewOrder.shipping_full_name) && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Shipping Address</p>
                <div className="text-gray-700 space-y-0.5">
                  {viewOrder.shipping_full_name && <p className="font-medium">{viewOrder.shipping_full_name}</p>}
                  {viewOrder.shipping_phone && <p className="text-gray-500">{viewOrder.shipping_phone}</p>}
                  {viewOrder.shipping_address_line1 && <p>{viewOrder.shipping_address_line1}</p>}
                  {viewOrder.shipping_address_line2 && <p>{viewOrder.shipping_address_line2}</p>}
                  {(viewOrder.shipping_city || viewOrder.shipping_state || viewOrder.shipping_postal_code) && (
                    <p>{[viewOrder.shipping_city, viewOrder.shipping_state, viewOrder.shipping_postal_code].filter(Boolean).join(', ')}</p>
                  )}
                  {viewOrder.shipping_country && <p>{viewOrder.shipping_country}</p>}
                </div>
              </div>
            )}
            {viewOrder.items?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Items</p>
                <div className="space-y-1.5">
                  {viewOrder.items.map((item, idx) => (
                    <div key={item.id || idx} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                      <div className="flex-1 min-w-0">
                      <p className="text-gray-800 truncate">{item.product_name || `Product #${item.product}`}</p>
                      {item.variant_name && <p className="text-xs text-gray-500">{item.variant_name}</p>}
                      <p className="text-xs text-gray-400">Qty: {item.quantity} &times; {formatPrice(item.unit_price || item.price || item.line_total / item.quantity)}</p>
                      </div>
                      <p className="font-medium text-gray-900 ml-3">{formatPrice(item.line_total || 0)}</p>
                    </div>
                  ))}
                </div>
                <hr className="border-gray-100 my-2" />
                <div className="space-y-0.5 text-xs text-gray-500 max-w-xs ml-auto">
                  <div className="flex justify-between">
                    <span>CGST (9%)</span>
                    <span>{formatPrice(viewOrder.cgst_amount || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SGST (9%)</span>
                    <span>{formatPrice(viewOrder.sgst_amount || 0)}</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>Shipping</span>
                    <span>FREE</span>
                  </div>
                </div>
                <div className="flex justify-between text-sm font-bold text-gray-900 mt-1">
                  <span>Total</span>
                  <span className="text-primary-600">{formatPrice(viewOrder.total_amount || viewOrder.total || 0)}</span>
                </div>
              </div>
            )}
            <div className="pt-2">
              <Button variant="outline" onClick={() => setViewOrder(null)} className="w-full">Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
