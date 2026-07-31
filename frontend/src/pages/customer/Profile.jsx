import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { get, post, patch, del, extractList } from '../../api/client'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import { formatPrice } from '../../utils/formatters'

const emptyAddress = {
  address: '', city: '', state: '', postal_code: '', country: 'India', is_primary: false,
}

/* ── Section wrapper ── */
function Section({ title, action, children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-eco-100/70 bg-white overflow-hidden ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-eco-50 bg-gradient-to-r from-eco-50/40 to-white">
          {title && <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-eco-600">{title}</h3>}
          {action}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  )
}

/* ── Info row ── */
function InfoRow({ label, value }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400 font-medium">{label}</p>
      <p className="text-sm font-semibold text-eco-900">{value || <span className="text-gray-400 font-normal italic">Not provided</span>}</p>
    </div>
  )
}

export default function Profile() {
  const { user, fetchProfile, updatePhone, sendOtpToPhone } = useAuth()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    full_name: '', phone: '', gender: '', date_of_birth: '', gst_number: '',
    address_line1: '', address_line2: '', city: '', state: '', postal_code: '', country: '',
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  const [addresses, setAddresses] = useState([])
  const [addressModal, setAddressModal] = useState(false)
  const [editingAddress, setEditingAddress] = useState(null)
  const [addressForm, setAddressForm] = useState({ ...emptyAddress })
  const [savingAddress, setSavingAddress] = useState(false)

  const [wishlistItems, setWishlistItems] = useState([])
  const [wishlistLoading, setWishlistLoading] = useState(true)

  useEffect(() => { refreshAddresses() }, [])
  useEffect(() => {
    get('/commerce/wishlist-items/').then(res => {
      if (res.ok) setWishlistItems(extractList(res.data))
      setWishlistLoading(false)
    })
  }, [])

  async function removeWishlist(id) {
    await del(`/commerce/wishlist-items/${id}/`)
    setWishlistItems(prev => prev.filter(i => i.id !== id))
  }

  async function refreshAddresses() {
    const res = await get('/auth/addresses/')
    if (res.ok) setAddresses(res.data)
  }

  function startEdit() {
    setForm({
      full_name: user?.full_name || '', phone: user?.phone || '',
      gender: user?.gender || '',
      date_of_birth: user?.date_of_birth ? user.date_of_birth.slice(0, 10) : '',
      gst_number: user?.gst_number || '',
      address_line1: user?.address_line1 || '', address_line2: user?.address_line2 || '',
      city: user?.city || '', state: user?.state || '',
      postal_code: user?.postal_code || '', country: user?.country || '',
    })
    setEditing(true)
    setMessage({ type: '', text: '' })
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setMessage({ type: '', text: '' })
    const res = await patch('/auth/profile/', form)
    if (res.ok) {
      await fetchProfile()
      setMessage({ type: 'success', text: 'Profile updated successfully!' })
      setEditing(false)
    } else {
      const m = Object.values(res.data || {}).flat().join(', ')
      setMessage({ type: 'error', text: m || 'Failed to update profile' })
    }
    setSaving(false)
  }

  function openAddAddress() { setEditingAddress(null); setAddressForm({ ...emptyAddress }); setAddressModal(true) }
  function openEditAddress(addr) { setEditingAddress(addr); setAddressForm({ ...addr }); setAddressModal(true) }

  async function handleSaveAddress(e) {
    e.preventDefault()
    setSavingAddress(true)
    if (editingAddress) await patch('/auth/addresses/update/', { ...addressForm, id: editingAddress.id })
    else await post('/auth/addresses/add/', addressForm)
    setSavingAddress(false); setAddressModal(false)
    await refreshAddresses(); await fetchProfile()
  }

  async function handleDeleteAddress(addr) {
    await del(`/auth/addresses/delete/?id=${addr.id}`)
    await refreshAddresses(); await fetchProfile()
  }

  async function handleSetPrimary(addr) {
    await post('/auth/addresses/set-primary/', { id: addr.id })
    await refreshAddresses(); await fetchProfile()
  }

  if (!user) return null

  const initials = (user.full_name || user.email || 'U').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  const genderMap = { M: 'Male', F: 'Female', O: 'Other' }

  return (
    <div className="ops-route customer-workflow-page min-h-screen bg-gradient-to-br from-eco-50/50 via-[#f4faf4] to-white" data-page="profile">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-5">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>

          {/* ── Page header ── */}
          <div className="mb-6">
            <span className="chip mb-2">Account</span>
            <h1 className="font-display text-3xl text-eco-900 mt-1">My Profile</h1>
          </div>

          {/* ── Alert ── */}
          <AnimatePresence>
            {message.text && (
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className={`flex items-start gap-3 text-sm p-4 rounded-2xl mb-4 border ${
                  message.type === 'success'
                    ? 'bg-eco-50 text-eco-700 border-eco-200'
                    : 'bg-red-50 text-red-600 border-red-200'
                }`}
              >
                <span>{message.type === 'success' ? '✅' : '⚠️'}</span>
                {message.text}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── User hero card ── */}
          <div className="rounded-2xl overflow-hidden border border-eco-100/70 bg-white shadow-sm">
            {/* Gradient header strip */}
            <div className="h-20 bg-gradient-to-r from-eco-600 via-eco-500 to-eco-700 relative overflow-hidden">
              <div className="absolute inset-0 opacity-[0.08] bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_75%,rgba(255,255,255,0.2)_75%)] bg-[size:20px_20px]" />
              <div className="absolute right-4 top-4 w-20 h-20 rounded-full bg-white/10 blur-xl" />
            </div>

            <div className="px-6 pb-6">
              {/* Avatar — overlaps the gradient strip */}
              <div className="flex items-end justify-between -mt-10 mb-4">
                <div className="relative">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url} alt=""
                      className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-md"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-eco-400 to-eco-700 border-4 border-white shadow-md flex items-center justify-center">
                      <span className="text-2xl font-bold text-white">{initials}</span>
                    </div>
                  )}
                  {editing && (
                    <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-xl shadow border border-eco-100 flex items-center justify-center cursor-pointer hover:bg-eco-50 transition-colors">
                      <input type="file" accept="image/*" className="hidden" onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const fd = new FormData()
                          fd.append('avatar', file)
                          patch('/auth/profile/', fd).then(() => fetchProfile())
                        }
                      }} />
                      <svg className="w-3.5 h-3.5 text-eco-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </label>
                  )}
                </div>

                {/* Edit / Save buttons — always in their own flex slot, no overflow */}
                {!editing ? (
                  <button
                    onClick={startEdit}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-eco-200 text-sm font-semibold text-eco-700 hover:border-eco-400 hover:bg-eco-50 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Edit Profile
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      className="px-3 py-2 rounded-xl border border-eco-100 text-sm font-medium text-gray-500 hover:bg-eco-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-eco-500 to-eco-700 text-white text-sm font-semibold hover:from-eco-600 hover:to-eco-800 transition-all shadow-sm disabled:opacity-60"
                    >
                      {saving ? (
                        <>
                          <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                          Saving…
                        </>
                      ) : '✓ Save'}
                    </button>
                  </div>
                )}
              </div>

              {/* Name & email */}
              <div>
                <h2 className="text-xl font-bold text-eco-900">{user.full_name || 'User'}</h2>
                <p className="text-sm text-gray-500 mt-0.5">{user.email}</p>
                {user.role === 'ADM' && <Badge variant="primary" className="mt-2">Admin</Badge>}
              </div>
            </div>
          </div>

          {/* ── Personal info (view / edit) ── */}
          <Section
            title="Personal Information"
            className="mt-5"
          >
            {editing ? (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Full Name" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
                  <Input label="Phone" type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
                <Input label="Email" value={user.email} disabled />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-eco-800">Gender</label>
                    <select
                      value={form.gender}
                      onChange={e => setForm({ ...form, gender: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-beige-300 bg-white/90 text-sm focus:outline-none focus:ring-2 focus:ring-eco-400 focus:border-eco-400 transition-all"
                    >
                      <option value="">-- Select --</option>
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                      <option value="O">Other</option>
                    </select>
                  </div>
                  <Input label="Date of Birth" type="date" value={form.date_of_birth} onChange={e => setForm({ ...form, date_of_birth: e.target.value })} />
                </div>
                <Input label="GST Number" value={form.gst_number} onChange={e => setForm({ ...form, gst_number: e.target.value })} placeholder="Enter 15-digit GSTIN" />
              </form>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <InfoRow label="Email" value={user.email} />
                <InfoRow label="Phone" value={
                  <span>
                    {user.phone || 'Not provided'}
                    {user.phone_verified ? (
                      <span className="ml-2 text-[10px] bg-eco-100 text-eco-700 px-1.5 py-0.5 rounded-full font-medium">✓ Verified</span>
                    ) : user.phone ? (
                      <span className="ml-2 text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-medium">Unverified</span>
                    ) : null}
                  </span>
                } />
                <InfoRow label="Gender" value={genderMap[user?.gender]} />
                <InfoRow label="GST Number" value={user?.gst_number} />
                <InfoRow label="Date of Birth" value={user?.date_of_birth ? new Date(user.date_of_birth).toLocaleDateString('en-IN') : null} />
              </div>
            )}
          </Section>

          {/* ── Change phone ── */}
          <ChangePhoneSection
            currentPhone={user?.phone}
            phoneVerified={user?.phone_verified}
            updatePhone={updatePhone}
            sendOtpToPhone={sendOtpToPhone}
          />

          {/* ── Change password ── */}
          <ChangePasswordSection email={user.email} />

          {/* ── Addresses ── */}
          <Section
            title="Saved Addresses"
            action={
              <Button size="xs" onClick={openAddAddress} leftIcon={<span>+</span>}>Add Address</Button>
            }
          >
            {addresses.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-eco-50 flex items-center justify-center text-2xl mb-3">📍</div>
                <p className="text-sm text-gray-500 mb-2">No addresses saved yet</p>
                <button onClick={openAddAddress} className="text-sm font-semibold text-eco-600 hover:text-eco-700 hover:underline">
                  + Add your first address
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {addresses.map(addr => (
                  <div
                    key={addr.id}
                    className={`relative rounded-2xl border-2 p-4 transition-all ${
                      addr.is_primary
                        ? 'border-eco-400 bg-eco-50/60 shadow-sm'
                        : 'border-eco-100 bg-white hover:border-eco-200 hover:shadow-sm'
                    }`}
                  >
                    {addr.is_primary && (
                      <span className="absolute -top-2.5 right-3 bg-gradient-to-r from-eco-500 to-eco-700 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-sm">
                        ★ Primary
                      </span>
                    )}
                    <div className="flex items-start gap-3">
                      <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-base ${
                        addr.is_primary ? 'bg-eco-100 text-eco-600' : 'bg-eco-50 text-gray-400'
                      }`}>
                        📍
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-eco-900 truncate">{addr.address}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {[addr.city, addr.state, addr.postal_code].filter(Boolean).join(', ')}
                        </p>
                        <p className="text-xs text-gray-400">{addr.country || 'India'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-eco-100/60">
                      {!addr.is_primary && (
                        <button onClick={() => handleSetPrimary(addr)} className="text-[11px] font-semibold text-gold-600 hover:text-gold-700 transition-colors">
                          ★ Set Primary
                        </button>
                      )}
                      <button onClick={() => openEditAddress(addr)} className="text-[11px] font-semibold text-eco-600 hover:text-eco-700 transition-colors">
                        Edit
                      </button>
                      <button onClick={() => handleDeleteAddress(addr)} className="text-[11px] font-semibold text-red-500 hover:text-red-700 transition-colors ml-auto">
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* ── Wishlist ── */}
          <Section title="My Wishlist">
            {wishlistLoading ? (
              <div className="py-8 flex justify-center">
                <div className="w-8 h-8 rounded-full border-4 border-eco-200 border-t-eco-500 animate-spin" />
              </div>
            ) : wishlistItems.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-red-50 flex items-center justify-center text-2xl mb-3">🤍</div>
                <p className="text-sm text-gray-500 mb-2">No items in your wishlist</p>
                <Link to="/products" className="text-sm font-semibold text-eco-600 hover:text-eco-700 hover:underline">
                  Browse Products →
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {wishlistItems.filter(Boolean).map(item => (
                  <div key={item.id} className="group relative rounded-2xl border border-eco-100 bg-white overflow-hidden hover:shadow-md hover:border-eco-200 transition-all">
                    <Link to={`/products/${item.product_slug}`}>
                      <div className="aspect-square bg-eco-50 overflow-hidden">
                        <img
                          src={item.product_image || `https://placehold.co/300x300/f0f7f0/3A7D44?text=${(item.product_name || 'P')?.charAt(0)}`}
                          alt={item.product_name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    </Link>
                    <button
                      onClick={() => removeWishlist(item.id)}
                      className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-white/90 hover:bg-white shadow-sm transition-colors"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                    </button>
                    <div className="p-2.5">
                      <Link to={`/products/${item.product_slug}`}>
                        <p className="text-xs font-semibold text-eco-900 truncate">{item.product_name}</p>
                      </Link>
                      {item?.offer_info ? (
                        <div className="mt-1">
                          <p className="text-sm font-bold text-primary-600">{formatPrice(item?.offer_info.discounted_price)}</p>
                          <p className="text-[11px] text-gray-400 line-through">{formatPrice(item.product_price)}</p>
                        </div>
                      ) : (
                        <p className="mt-1 text-sm font-bold text-primary-600">{formatPrice(item.product_price)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </motion.div>
      </div>

      {/* ── Address Modal ── */}
      <Modal isOpen={addressModal} onClose={() => setAddressModal(false)} title={editingAddress ? 'Edit Address' : 'Add New Address'}>
        <form onSubmit={handleSaveAddress} className="space-y-4">
          <Input label="Street Address" value={addressForm.address} onChange={e => setAddressForm({ ...addressForm, address: e.target.value })} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="City" value={addressForm.city} onChange={e => setAddressForm({ ...addressForm, city: e.target.value })} required />
            <Input label="State" value={addressForm.state} onChange={e => setAddressForm({ ...addressForm, state: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Postal Code" value={addressForm.postal_code} onChange={e => setAddressForm({ ...addressForm, postal_code: e.target.value })} required />
            <Input label="Country" value={addressForm.country} onChange={e => setAddressForm({ ...addressForm, country: e.target.value })} />
          </div>
          <label className="flex items-center gap-2.5 text-sm text-gray-700 p-3 rounded-xl bg-eco-50 border border-eco-100 cursor-pointer hover:bg-eco-100 transition-colors">
            <input
              type="checkbox"
              checked={addressForm.is_primary}
              onChange={e => setAddressForm({ ...addressForm, is_primary: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-eco-600"
            />
            Set as primary address
          </label>
          <Button type="submit" className="w-full !py-3" loading={savingAddress}>
            {editingAddress ? 'Update Address' : 'Add Address'}
          </Button>
        </form>
      </Modal>
    </div>
  )
}

/* ── Change Phone Section ── */
function ChangePhoneSection({ currentPhone, phoneVerified, updatePhone, sendOtpToPhone }) {
  const [expanded, setExpanded] = useState(false)
  const [step, setStep] = useState('send')
  const [newPhone, setNewPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [message, setMessage] = useState({ type: '', text: '' })
  const [loading, setLoading] = useState(false)

  async function handleSendOtp() {
    setMessage({ type: '', text: '' })
    if (!newPhone || newPhone.length < 10) { setMessage({ type: 'error', text: 'Please enter a valid phone number' }); return }
    setLoading(true)
    try {
      await sendOtpToPhone(newPhone, 'change_phone')
      setMessage({ type: 'success', text: 'OTP sent to your new phone number!' })
      setStep('verify')
    } catch (err) { setMessage({ type: 'error', text: err.message }) }
    setLoading(false)
  }

  async function handleVerifyOtp(e) {
    e.preventDefault()
    setMessage({ type: '', text: '' })
    if (!otp || otp.length !== 6) { setMessage({ type: 'error', text: 'Please enter the 6-digit OTP' }); return }
    setLoading(true)
    try {
      await updatePhone(newPhone, otp)
      setMessage({ type: 'success', text: 'Phone number updated and verified!' })
      setOtp(''); setNewPhone(''); setStep('send')
      setTimeout(() => setExpanded(false), 2000)
    } catch (err) { setMessage({ type: 'error', text: err.message }) }
    setLoading(false)
  }

  return (
    <div className="rounded-2xl border border-eco-100/70 bg-white overflow-hidden mt-5">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-eco-50/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-eco-100 flex items-center justify-center text-eco-600 text-sm">📱</div>
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-eco-600">Change Phone Number</span>
        </div>
        <motion.svg
          animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}
          className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </motion.svg>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 pt-2 space-y-4 border-t border-eco-50">
              <p className="text-sm text-gray-500">
                Current: <strong>{currentPhone || 'Not set'}</strong>
                {phoneVerified && <span className="ml-1 text-eco-600">✓ Verified</span>}
              </p>

              {message.text && (
                <div className={`text-sm p-3 rounded-xl border ${
                  message.type === 'success'
                    ? 'bg-eco-50 text-eco-700 border-eco-200'
                    : 'bg-red-50 text-red-600 border-red-200'
                }`}>
                  {message.text}
                </div>
              )}

              {step === 'send' ? (
                <div className="space-y-3">
                  <Input label="New Phone Number" type="tel" value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    placeholder="+91 9876543210"
                  />
                  <Button size="sm" onClick={handleSendOtp} loading={loading}>
                    Send OTP via SMS
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-3">
                  <Input label="OTP Code" value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000" maxLength={6}
                  />
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" loading={loading}>Verify & Update</Button>
                    <Button type="button" size="sm" variant="ghost"
                      onClick={() => { setStep('send'); setOtp(''); setMessage({ type: '', text: '' }) }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Change Password Section ── */
function ChangePasswordSection({ email }) {
  const { sendOtp, setPassword } = useAuth()
  const [expanded, setExpanded] = useState(false)
  const [step, setStep] = useState('send')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState({ type: '', text: '' })
  const [loading, setLoading] = useState(false)

  async function handleSendOtp() {
    setMessage({ type: '', text: '' }); setLoading(true)
    try {
      await sendOtp(email, 'change_password')
      setMessage({ type: 'success', text: 'OTP sent to your email!' })
      setStep('change')
    } catch (err) { setMessage({ type: 'error', text: err.message }) }
    setLoading(false)
  }

  async function handleChangePassword(e) {
    e.preventDefault(); setMessage({ type: '', text: '' })
    if (!otp || otp.length !== 6) { setMessage({ type: 'error', text: 'Please enter the 6-digit OTP' }); return }
    if (!newPassword || newPassword.length < 8) { setMessage({ type: 'error', text: 'Password must be at least 8 characters' }); return }
    if (newPassword !== confirmPassword) { setMessage({ type: 'error', text: 'Passwords do not match' }); return }
    setLoading(true)
    try {
      await setPassword(email, otp, newPassword, confirmPassword)
      setMessage({ type: 'success', text: 'Password changed successfully!' })
      setOtp(''); setNewPassword(''); setConfirmPassword(''); setStep('send')
      setTimeout(() => setExpanded(false), 2000)
    } catch (err) { setMessage({ type: 'error', text: err.message }) }
    setLoading(false)
  }

  return (
    <div className="rounded-2xl border border-eco-100/70 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-eco-50/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-eco-100 flex items-center justify-center text-eco-600 text-sm">🔑</div>
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-eco-600">Change Password</span>
        </div>
        <motion.svg
          animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}
          className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </motion.svg>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 pt-2 space-y-4 border-t border-eco-50">
              {message.text && (
                <div className={`text-sm p-3 rounded-xl border ${
                  message.type === 'success'
                    ? 'bg-eco-50 text-eco-700 border-eco-200'
                    : 'bg-red-50 text-red-600 border-red-200'
                }`}>
                  {message.text}
                </div>
              )}
              {step === 'send' ? (
                <Button size="sm" onClick={handleSendOtp} loading={loading}>
                  Send OTP to Email
                </Button>
              ) : (
                <form onSubmit={handleChangePassword} className="space-y-3">
                  <Input label="OTP Code" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" maxLength={6} />
                  <Input label="New Password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 8 characters" />
                  <Input label="Confirm Password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter password" />
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" loading={loading}>Change Password</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => { setStep('send'); setOtp(''); setNewPassword(''); setConfirmPassword(''); setMessage({ type: '', text: '' }) }}>
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
