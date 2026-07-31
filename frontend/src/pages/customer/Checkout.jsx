import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { get, post, patch } from '../../api/client'
import { useCart } from '../../context/CartContext'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import { formatPrice } from '../../utils/formatters'

export default function Checkout() {
  const { items, totalAmount, clearCart, directCheckoutItem, setDirectCheckoutItem, clearDirectCheckout } = useCart()
  const { user, establishSession } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [savedAddresses, setSavedAddresses] = useState([])
  const [selectedAddressId, setSelectedAddressId] = useState('')
  const [useNewAddress, setUseNewAddress] = useState(false)
  const [showAddressOptions, setShowAddressOptions] = useState(null)
  const [showNewAddress, setShowNewAddress] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('online')
  const [paymentConfig, setPaymentConfig] = useState(null)
  const [fetchingConfig, setFetchingConfig] = useState(false)
  const [proofFile, setProofFile] = useState(null)
  const [chosenMethod, setChosenMethod] = useState('')
  const [customerNotes, setCustomerNotes] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [showQrPopup, setShowQrPopup] = useState(false)
  const [locationLoading, setLocationLoading] = useState(false)
  const [serviceability, setServiceability] = useState(null)
  const [address, setAddress] = useState({
    full_name: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    country: 'India',
  })

  useEffect(() => {
    if (user) {
      get('/auth/addresses/').then(res => {
        if (res.ok && res.data.length > 0) {
          setSavedAddresses(res.data)
          const primary = res.data.find(a => a.is_primary)
          if (primary) setSelectedAddressId(primary.id)
        }
      })
    }
  }, [user])

  // Fetch payment config when user selects "Pay Online"
  useEffect(() => {
    if (paymentMethod === 'online' && !paymentConfig) {
      setFetchingConfig(true)
      get('/payments/config/')
        .then(res => { if (res.ok) setPaymentConfig(res.data) })
        .catch(() => {})
        .finally(() => setFetchingConfig(false))
    }
  }, [paymentMethod, paymentConfig])

  async function handleAddressClick(addr) {
    setSelectedAddressId(addr.id)
    setUseNewAddress(false)
    setShowAddressOptions(addr.id)
    await checkServiceability({ postal_code: addr.postal_code })
  }

  async function checkServiceability(payload) {
    try {
      const res = await post('/serviceability/check/', payload)
      const result = res.ok ? res.data : {
        serviceable: false,
        message: res.data?.detail || 'Unable to verify delivery availability.',
      }
      setServiceability(result)
      return result
    } catch {
      const result = { serviceable: false, message: 'Unable to check this location right now. Enter your 6-digit PIN code manually.' }
      setServiceability(result)
      return result
    }
  }

  function useCurrentLocation() {
    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
      setServiceability({ serviceable: false, message: 'Location access requires HTTPS. Enter your PIN code manually.' })
      return
    }
    if (!navigator.geolocation) {
      setServiceability({ serviceable: false, message: 'Current location is not supported by this browser.' })
      return
    }
    setLocationLoading(true)
    navigator.geolocation.getCurrentPosition(
      async position => {
        try {
          const accuracy = Number(position.coords.accuracy || 0)
          if (accuracy > 250) {
            setServiceability({
              serviceable: false,
              code: 'APPROXIMATE_LOCATION',
              message: `Your device location is only accurate to about ${Math.round(accuracy)} metres. Please enter and confirm your exact 6-digit delivery PIN code.`,
            })
            return
          }
          const result = await checkServiceability({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          })
          if (result.address) {
            setAddress(current => ({
              ...current,
              street: result.address.display_name || result.address.street || current.street,
              city: result.address.city || result.address.district || current.city,
              state: result.address.state || current.state,
              zip: result.address.postal_code || result.postal_code || current.zip,
              country: result.address.country || 'India',
            }))
            setSelectedAddressId('')
            setUseNewAddress(true)
            setShowNewAddress(true)
          }
        } finally {
          setLocationLoading(false)
        }
      },
      error => {
        setServiceability({
          serviceable: false,
          message: error.code === error.PERMISSION_DENIED
            ? 'Location permission was denied. Allow location access or enter your PIN code manually.'
            : 'We could not detect your location. Enter your PIN code manually.',
        })
        setLocationLoading(false)
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    )
  }

  async function selectForOrder(addressId) {
    setSelectedAddressId(addressId)
    setShowAddressOptions(null)
  }

  async function makeAddressPrimary(addr) {
    try {
      const res = await patch(`/auth/addresses/${addr.id}/`, { is_primary: true })
      if (res.ok) {
        const addrRes = await get('/auth/addresses/')
        if (addrRes.ok) {
          setSavedAddresses(addrRes.data)
        }
      }
    } catch (err) {}
    setShowAddressOptions(null)
  }

  /* ── Determine items to display: directCheckoutItem takes priority ── */
  const checkoutItems = directCheckoutItem
    ? [directCheckoutItem]
    : items

  if (checkoutItems.length === 0 && !submitting) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20">
        <EmptyState emoji="🛒" title="Nothing to checkout" description={directCheckoutItem ? 'Product not available.' : 'Add some items before checking out.'}>
          <Button onClick={() => navigate('/products')}>Browse Products</Button>
        </EmptyState>
      </div>
    )
  }

  const itemPrice = (i) => parseFloat(i?.product_price || i?.base_price || i?.price || 0)

  function updateDirectQty(newQty) {
    if (!directCheckoutItem || newQty < 1) return
    const price = itemPrice(directCheckoutItem)
    setDirectCheckoutItem({
      ...directCheckoutItem,
      quantity: newQty,
      line_total: price * newQty,
    })
  }

  const checkoutTotal = checkoutItems.reduce(
    (s, i) => s + parseFloat(i.line_total || (itemPrice(i) * (i.quantity || 0))),
    0
  )
  const discount = checkoutItems.reduce((s, i) => s + ((itemPrice(i) * i.quantity) - (i.line_total || (itemPrice(i) * i.quantity))), 0)
  const netTotal = checkoutTotal
  const cgst = Math.round(netTotal * 0.09 * 100) / 100
  const sgst = Math.round(netTotal * 0.09 * 100) / 100
  const grandTotal = netTotal + cgst + sgst

  function getSelectedAddress() {
    if (showNewAddress || (savedAddresses.length === 0 && address.street)) return null
    return savedAddresses.find(a => a.id === selectedAddressId)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const selected = getSelectedAddress()
    if (!selected && (!address.street || !address.city || !address.state || !address.zip)) {
      setError('Please select or enter a shipping address')
      return
    }
    const deliveryCheck = await checkServiceability({ postal_code: selected?.postal_code || address.zip })
    if (!deliveryCheck.serviceable) {
      setError(deliveryCheck.message || 'Delivery is not available at this address.')
      return
    }
    if (!user && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim())) {
      setError('Please enter a valid email address for your order updates')
      return
    }

    // If online payment, require proof file + method selection
    if (paymentMethod === 'online') {
      if (!proofFile) {
        setError('Please upload a payment proof screenshot or PDF')
        return
      }
      if (!chosenMethod) {
        setError('Please select the payment method you used')
        return
      }
    }

    setSubmitting(true)

    const formData = new FormData()

    // Add items (include variant info for stock validation)
    checkoutItems.forEach(i => {
      const itemPayload = { product: i.product, quantity: i.quantity }
      if (i.variant) itemPayload.variant = i.variant
      if (i.variant_name) itemPayload.variant_name = i.variant_name
      if (i.product_price) itemPayload.product_price = i.product_price
      formData.append('items', JSON.stringify(itemPayload))
    })

    // Add payment info
    formData.append('payment_method', paymentMethod)
    if (!user) formData.append('guest_email', guestEmail.trim())

    // Add address
    if (selected) {
      formData.append('address_id', selected.id)
    } else {
      formData.append('shipping_full_name', address.full_name)
      formData.append('shipping_phone', address.phone)
      formData.append('shipping_address', address.street)
      formData.append('shipping_city', address.city)
      formData.append('shipping_state', address.state)
      formData.append('shipping_postal_code', address.zip)
      formData.append('shipping_country', address.country)
    }

    // Add payment proof (if online)
    if (paymentMethod === 'online' && proofFile) {
      formData.append('payment_proof', proofFile)
      formData.append('chosen_method', chosenMethod)
      formData.append('customer_notes', customerNotes)
    }

    const res = await post('/orders/', formData)
    if (res.ok) {
      if (res.data?.guest_session) establishSession(res.data.guest_session)
      // If online payment with proof, upload it to the dedicated endpoint
      // (the order creation API creates the payment but doesn't process the proof file)
      if (paymentMethod === 'online' && proofFile && res.data?.payment?.id) {
        const proofFormData = new FormData()
        proofFormData.append('file', proofFile)
        proofFormData.append('chosen_method', chosenMethod)
        proofFormData.append('customer_notes', customerNotes)
        const proofRes = await post(`/payments/${res.data.payment.id}/upload_proof/`, proofFormData)
        if (proofRes.ok) {
          showToast({ title: 'Order Placed', message: 'Payment proof uploaded successfully', type: 'success' })
        } else {
          showToast({ title: 'Order Placed', message: 'Proof upload pending — upload it from the order page', type: 'info' })
        }
      }
      clearCart()
      clearDirectCheckout()
      navigate(`/orders/${res.data.id}`)
    } else {
      const errMsg = res.data?.detail || 'Failed to place order. Please try again.'
      setError(errMsg)
      showToast({ title: 'Order Failed', message: errMsg, type: 'error' })
      setSubmitting(false)
    }
  }

  return (
    <>
    <div className="ops-route customer-workflow-page max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-page="checkout">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {directCheckoutItem ? 'Buy Now' : 'Checkout'}
          </h1>
          {directCheckoutItem && (
            <p className="text-sm text-gray-500 mt-1">Purchasing 1 item directly</p>
          )}
        </div>
        {directCheckoutItem && (
          <button
            onClick={() => { clearDirectCheckout(); navigate('/cart') }}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Cart
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Shipping Address</h2>
            {error && (
              <div className="text-sm p-3 rounded-lg mb-4 bg-red-50 text-red-600">{error}</div>
            )}

            <form onSubmit={handleSubmit}>
              {!user && (
                <div className="mb-5 rounded-2xl border border-primary-100 bg-primary-50/60 p-4">
                  <h3 className="text-sm font-bold text-gray-900">Checkout as guest</h3>
                  <p className="mt-1 text-xs text-gray-600">
                    No password or registration required. We use your email only for this order and its updates.
                  </p>
                  <div className="mt-3">
                    <Input
                      label="Email address"
                      type="email"
                      value={guestEmail}
                      onChange={e => setGuestEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>
              )}
              {/* Saved Addresses */}
              {savedAddresses.length > 0 && (
                <div className="space-y-3 mb-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Saved Addresses</h3>
                  {savedAddresses.map(addr => {
                    const isSelected = selectedAddressId === addr.id
                    const showingOptions = showAddressOptions === addr.id
                    return (
                      <div key={addr.id}>
                        <div
                          className={`relative border-2 rounded-xl p-4 cursor-pointer transition-all ${
                            isSelected
                              ? 'border-primary-500 bg-primary-50/30'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                          onClick={() => handleAddressClick(addr)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              {/* Radio indicator */}
                              <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                                isSelected ? 'border-primary-500' : 'border-gray-300'
                              }`}>
                                {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-primary-500" />}
                              </div>
                              <div>
                                <p className="text-sm text-gray-700">{addr.address}</p>
                                <p className="text-sm text-gray-500">{addr.city}, {addr.state}, {addr.postal_code}</p>
                                <p className="text-sm text-gray-500">{addr.country}</p>
                              </div>
                            </div>
                            {addr.is_primary && (
                              <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 ml-2">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                Primary
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Options for non-primary selected address */}
                        {showingOptions && !addr.is_primary && (
                          <div className="mt-2 ml-7 flex gap-2 animate-fadeIn">
                            <Button
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); selectForOrder(addr.id) }}
                            >
                              Use for this order
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => { e.stopPropagation(); makeAddressPrimary(addr) }}
                            >
                              Make Primary
                            </Button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Toggle new address form */}
              {savedAddresses.length > 0 && (
                <button
                  type="button"
                  onClick={() => { setShowNewAddress(!showNewAddress); setUseNewAddress(!showNewAddress) }}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium mb-4 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add new address
                </button>
              )}

              {/* New address form */}
              {(showNewAddress || savedAddresses.length === 0) && (
                <div className="space-y-4 mb-4">
                  {savedAddresses.length === 0 && (
                    <p className="text-sm text-gray-500 mb-2">No saved addresses. Please enter your shipping details below.</p>
                  )}
                  <button
                    type="button"
                    onClick={useCurrentLocation}
                    disabled={locationLoading}
                    className="flex w-full items-center gap-3 rounded-xl border-2 border-emerald-200 bg-emerald-50 px-4 py-3 text-left font-semibold text-emerald-900 transition hover:border-emerald-500 hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-60"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-700 text-xl text-white">
                      {locationLoading ? '…' : '⌖'}
                    </span>
                    <span>
                      <span className="block text-sm">{locationLoading ? 'Detecting your location…' : 'Use my current location'}</span>
                      <span className="block text-xs font-normal text-emerald-700">Automatically fill and check delivery availability</span>
                    </span>
                  </button>
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Full Name" name="full_name" value={address.full_name} onChange={e => setAddress({ ...address, full_name: e.target.value })} />
                    <Input label="Phone" name="phone" value={address.phone} onChange={e => setAddress({ ...address, phone: e.target.value })} />
                  </div>
                  <Input label="Street Address" name="street" value={address.street} onChange={e => setAddress({ ...address, street: e.target.value })} />
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="City" name="city" value={address.city} onChange={e => setAddress({ ...address, city: e.target.value })} />
                    <Input label="State" name="state" value={address.state} onChange={e => setAddress({ ...address, state: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="PIN Code"
                      name="zip"
                      value={address.zip}
                      maxLength={6}
                      onChange={e => {
                        setAddress({ ...address, zip: e.target.value.replace(/\D/g, '').slice(0, 6) })
                        setServiceability(null)
                      }}
                      onBlur={() => address.zip.length === 6 && checkServiceability({ postal_code: address.zip })}
                    />
                    <Input label="Country" name="country" value={address.country} disabled />
                  </div>
                  {serviceability && (
                    <div className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
                      serviceability.serviceable
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        : serviceability.code === 'APPROXIMATE_LOCATION'
                          ? 'border-amber-200 bg-amber-50 text-amber-800'
                        : 'border-red-200 bg-red-50 text-red-700'
                    }`}>
                      {serviceability.serviceable ? '✓ ' : serviceability.code === 'APPROXIMATE_LOCATION' ? '⚠ ' : '✕ '}
                      {serviceability.message}
                    </div>
                  )}
                </div>
              )}

              {/* Payment Method */}
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Payment Method</h3>
                <div className="space-y-2">
                  <label className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition-all ${
                    paymentMethod === 'online' ? 'border-primary-500 bg-primary-50/30' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input type="radio" name="payment_method" value="online" checked={paymentMethod === 'online'} onChange={e => setPaymentMethod(e.target.value)} className="sr-only" />
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      paymentMethod === 'online' ? 'border-primary-500' : 'border-gray-300'
                    }`}>
                      {paymentMethod === 'online' && <div className="w-2.5 h-2.5 rounded-full bg-primary-500" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Pay Online</p>
                      <p className="text-xs text-gray-500">QR / UPI / Bank Transfer</p>
                    </div>
                  </label>
                  <label className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition-all ${
                    paymentMethod === 'cod' ? 'border-primary-500 bg-primary-50/30' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input type="radio" name="payment_method" value="cod" checked={paymentMethod === 'cod'} onChange={e => setPaymentMethod(e.target.value)} className="sr-only" />
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      paymentMethod === 'cod' ? 'border-primary-500' : 'border-gray-300'
                    }`}>
                      {paymentMethod === 'cod' && <div className="w-2.5 h-2.5 rounded-full bg-primary-500" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Cash on Delivery</p>
                      <p className="text-xs text-gray-500">Pay with cash upon delivery</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* ── Payment Proof Upload (only for Pay Online) ── */}
              {paymentMethod === 'online' && (
                <div className="mb-4 p-4 rounded-xl border border-gray-200 bg-gray-50">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Upload Payment Proof</h3>
                  <p className="text-xs text-gray-500 mb-4">Make your payment via any method below, then upload the screenshot or receipt.</p>

                  {fetchingConfig ? (
                    <p className="text-xs text-gray-400">Loading payment details...</p>
                  ) : paymentConfig ? (
                    <div className="space-y-4">
                      {/* Payment Methods Display */}
                      <div className="space-y-2">
                        {paymentConfig.qr_code_image && (
                          <div className="flex items-start gap-3 bg-white rounded-lg p-3 border border-gray-100">
                            <span className="text-xs font-bold text-blue-600 bg-blue-50 rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">1</span>
                            <div>
                              <p className="text-sm font-medium text-gray-800">QR Code</p>
                              <button
                                type="button"
                                onClick={() => setShowQrPopup(true)}
                                className="block cursor-pointer"
                              >
                                <img
                                  src={paymentConfig.qr_code_image}
                                  alt="QR"
                                  className="max-w-[100px] mt-1 rounded border hover:ring-2 hover:ring-primary-400 transition-all"
                                />
                              </button>
                              <p className="text-[10px] text-gray-400 mt-1">Tap to enlarge</p>
                            </div>
                          </div>
                        )}
                        {paymentConfig.upi_id && (
                          <div className="flex items-start gap-3 bg-white rounded-lg p-3 border border-gray-100">
                            <span className="text-xs font-bold text-green-600 bg-green-50 rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">2</span>
                            <div>
                              <p className="text-sm font-medium text-gray-800">UPI ID</p>
                              <p className="text-xs font-mono text-gray-600 mt-0.5">{paymentConfig.upi_id}</p>
                            </div>
                          </div>
                        )}
                        {paymentConfig.payment_details && (
                          <div className="flex items-start gap-3 bg-white rounded-lg p-3 border border-gray-100">
                            <span className="text-xs font-bold text-purple-600 bg-purple-50 rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">3</span>
                            <div>
                              <p className="text-sm font-medium text-gray-800">Bank Transfer</p>
                              <pre className="text-xs text-gray-600 mt-0.5 whitespace-pre-wrap">{paymentConfig.payment_details}</pre>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Method Selector */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Payment method used <span className="text-red-500">*</span></label>
                        <select
                          value={chosenMethod}
                          onChange={e => setChosenMethod(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs"
                          required
                        >
                          <option value="">-- Select method --</option>
                          {paymentConfig.qr_code_image && <option value="qr_code">QR Code</option>}
                          {paymentConfig.upi_id && <option value="upi_id">UPI ID</option>}
                          {paymentConfig.payment_details && <option value="bank_transfer">Bank Transfer</option>}
                        </select>
                      </div>

                      {/* File Upload */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Screenshot / PDF <span className="text-red-500">*</span></label>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={e => setProofFile(e.target.files[0])}
                          className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                        />
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Notes (optional)</label>
                        <textarea
                          rows={2}
                          value={customerNotes}
                          onChange={e => setCustomerNotes(e.target.value)}
                          placeholder="Any additional info..."
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-amber-600">Could not load payment details. Please try again.</p>
                  )}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Placing Order...' : `Place Order - ${formatPrice(grandTotal)}`}
              </Button>
            </form>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="p-6 sticky top-24">
            <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
            <div className="space-y-3 text-sm">
              {checkoutItems.filter(Boolean).map(item => {
                const origLineTotal = itemPrice(item) * item.quantity
                const discLineTotal = item.line_total || origLineTotal
                const isDirect = directCheckoutItem && item.product === directCheckoutItem.product
                return (
                  <div key={item.id || item.product} className="border-b border-beige-100 pb-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <span className="text-gray-700 font-medium truncate block">{item.product_name}</span>
                        {item.variant_name && <span className="text-xs text-gray-500">{item.variant_name}</span>}
                      </div>
                      <span className="font-medium whitespace-nowrap">{formatPrice(discLineTotal)}</span>
                    </div>
                    {/* Quantity selector for Buy Now direct item */}
                    {isDirect ? (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-400">Qty:</span>
                        <div className="flex items-center border border-gray-300 rounded-lg">
                          <button
                            type="button"
                            onClick={() => updateDirectQty(item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            className="px-2.5 py-1 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-sm"
                          >
                            −
                          </button>
                          <span className="px-3 py-1 text-sm font-medium text-gray-900 min-w-[2rem] text-center">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateDirectQty(item.quantity + 1)}
                            className="px-2.5 py-1 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors text-sm"
                          >
                            +
                          </button>
                        </div>
                        <span className="text-xs text-gray-400 ml-auto">{formatPrice(itemPrice(item))} each</span>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs text-gray-400">{item.product_name} &times; {item.quantity}</span>
                        {item?.offer_info ? (
                          <div className="text-xs text-right space-y-0.5">
                            <span className="text-gray-400 line-through mr-2">{formatPrice(origLineTotal)}</span>
                            <span className="text-green-600 font-medium">Offer Applied</span>
                            <p className="text-green-600">Save {formatPrice(origLineTotal - discLineTotal)}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">{formatPrice(itemPrice(item))} each</span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
              <hr className="border-gray-200" />
              <div className="flex justify-between">
                <span className="text-gray-600">Original Total</span>
                <span className="font-medium">{formatPrice(checkoutItems.reduce((s, i) => s + (itemPrice(i) * i.quantity), 0))}</span>
              </div>
              {checkoutItems.some(i => i?.offer_info) && (
                <div className="flex justify-between text-green-600">
                  <span className="font-medium">Discount</span>
                  <span>-{formatPrice(checkoutItems.reduce((s, i) => s + ((itemPrice(i) * i.quantity) - (i.line_total || (itemPrice(i) * i.quantity))), 0))}</span>
                </div>
              )}
              <hr className="border-gray-200" />
              <div className="flex justify-between text-sm text-gray-500">
                <span>CGST (9%)</span>
                <span>{formatPrice(cgst)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>SGST (9%)</span>
                <span>{formatPrice(sgst)}</span>
              </div>
              <div className="flex justify-between text-sm text-green-600">
                <span>Shipping</span>
                <span>FREE</span>
              </div>
              <hr className="border-gray-200" />
              <div className="flex justify-between text-base">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-primary-600">{formatPrice(grandTotal)}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>

    {/* ── QR Code Enlarged Popup ── */}
    <Modal isOpen={showQrPopup} onClose={() => setShowQrPopup(false)} title="Scan QR Code">
      <div className="flex flex-col items-center gap-4 py-4">
        {paymentConfig?.qr_code_image && (
          <img
            src={paymentConfig.qr_code_image}
            alt="QR Code"
            className="max-w-full h-auto rounded-lg shadow-md"
            style={{ maxHeight: '70vh' }}
          />
        )}
        <p className="text-sm text-gray-500 text-center">
          Scan this QR code with your phone's payment app to pay.
        </p>
      </div>
    </Modal>
    </>
  )
}
