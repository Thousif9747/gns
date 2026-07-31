import { useState, useEffect } from 'react'
import { get, patch } from '../../api/client'
import { useToast } from '../../context/ToastContext'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'

export default function PaymentSettings() {
  const [loading, setLoading] = useState(true)

  // QR Code state
  const [qrFile, setQrFile] = useState(null)
  const [qrPreview, setQrPreview] = useState(null)
  const [qrSaving, setQrSaving] = useState(false)
  const [qrMsg, setQrMsg] = useState('')

  // UPI ID state
  const [upiId, setUpiId] = useState('')
  const [upiSaving, setUpiSaving] = useState(false)
  const [upiMsg, setUpiMsg] = useState('')

  // Bank Transfer state
  const [bankName, setBankName] = useState('')
  const [accountHolder, setAccountHolder] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [ifscCode, setIfscCode] = useState('')
  const [bankSaving, setBankSaving] = useState(false)
  const [bankMsg, setBankMsg] = useState('')
  const { showToast } = useToast()

  useEffect(() => {
    get('/payments/config/')
      .then(res => {
        if (res.ok) {
          setQrPreview(res.data.qr_code_image)
          setUpiId(res.data.upi_id || '')

          const details = res.data.payment_details || ''
          if (details) {
            const lines = details.split('\n')
            lines.forEach(line => {
              const [key, ...rest] = line.split(':')
              const val = rest.join(':').trim()
              const k = key.trim().toLowerCase()
              if (k === 'bank') setBankName(val)
              else if (k === 'account holder') setAccountHolder(val)
              else if (k === 'account') setAccountNumber(val)
              else if (k === 'ifsc') setIfscCode(val)
            })
          }
        }
      })
      .catch(() => showToast({ title: 'Error', message: 'Failed to load payment settings', type: 'error' }))
      .finally(() => setLoading(false))
  }, [])

  function handleQrChange(e) {
    const f = e.target.files[0]
    if (f) {
      setQrFile(f)
      setQrPreview(URL.createObjectURL(f))
    }
  }

  async function saveQrCode(e) {
    e.preventDefault()
    if (!qrFile) return
    setQrSaving(true)
    setQrMsg('')
    const fd = new FormData()
    fd.append('qr_code_image', qrFile)
    const res = await patch('/payments/config/', fd)
    if (res.ok) {
      setQrPreview(res.data.qr_code_image)
      setQrFile(null)
      showToast({ title: 'Saved', message: 'QR Code saved successfully', type: 'success' })
    } else {
      const m = Object.values(res.data || {}).flat().join(', ')
      showToast({ title: 'Error', message: m || 'Failed to save QR Code', type: 'error' })
    }
    setQrSaving(false)
  }

  async function saveUpiId(e) {
    e.preventDefault()
    setUpiSaving(true)
    setUpiMsg('')
    const fd = new FormData()
    fd.append('upi_id', upiId)
    const res = await patch('/payments/config/', fd)
    if (res.ok) {
      showToast({ title: 'Saved', message: 'UPI ID saved successfully', type: 'success' })
    } else {
      const m = Object.values(res.data || {}).flat().join(', ')
      showToast({ title: 'Error', message: m || 'Failed to save UPI ID', type: 'error' })
    }
    setUpiSaving(false)
  }

  async function saveBankDetails(e) {
    e.preventDefault()
    setBankSaving(true)
    setBankMsg('')
    const details = [
      `Bank: ${bankName}`,
      `Account Holder: ${accountHolder}`,
      `Account: ${accountNumber}`,
      `IFSC: ${ifscCode}`,
    ].join('\n')
    const fd = new FormData()
    fd.append('payment_details', details)
    const res = await patch('/payments/config/', fd)
    if (res.ok) {
      showToast({ title: 'Saved', message: 'Bank details saved successfully', type: 'success' })
    } else {
      const m = Object.values(res.data || {}).flat().join(', ')
      showToast({ title: 'Error', message: m || 'Failed to save bank details', type: 'error' })
    }
    setBankSaving(false)
  }

  if (loading) return <Spinner />

  const hasBankInfo = bankName || accountHolder || accountNumber || ifscCode
  const methodCount = [qrPreview, upiId, hasBankInfo].filter(Boolean).length

  return (
    <div className="ops-route ops-admin-page w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 space-y-4" data-page="payment-settings">
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-eco-100 via-beige-50 to-cream text-eco-900 p-6 lg:p-8 shadow-modal border border-beige-200">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(90,160,95,0.12),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(217,164,65,0.14),transparent_30%)]" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.3em] text-primary-600 mb-2">Payments</p>
            <h1 className="font-display text-4xl md:text-5xl">Payment Settings</h1>
            <p className="mt-3 text-gray-700 max-w-xl">Manage each payment method separately.</p>
          </div>
          <span className="text-xs font-medium text-primary-700 bg-primary-50/80 backdrop-blur px-3 py-1.5 rounded-full border border-primary-200 shadow-sm">
            {methodCount} method{methodCount !== 1 ? 's' : ''}
          </span>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2 2xl:gap-5">
        <Card className="p-4 lg:p-5 bg-white/90">
          <div className="flex items-start gap-4">
            <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-sm font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold text-gray-900">Pay via QR Code</h2>
              <p className="text-xs text-gray-400 mt-0.5">Upload the QR image for UPI payments.</p>

              <form onSubmit={saveQrCode} className="mt-3 space-y-2.5">
                {qrMsg && (
                  <div className={`text-xs p-2.5 rounded-lg ${qrMsg.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                    {qrMsg}
                  </div>
                )}

                {qrPreview && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <img src={qrPreview} alt="QR" className="w-14 h-14 rounded-lg object-cover border border-gray-200" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700 truncate">{qrFile?.name || 'Current QR Code'}</p>
                      <p className="text-xs text-gray-400">Customers can scan this QR code using any UPI app.</p>
                    </div>
                  </div>
                )}

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleQrChange}
                  className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />

                <Button type="submit" disabled={!qrFile || qrSaving} size="sm" className="mt-1">
                  {qrSaving ? 'Saving...' : 'Save QR Code'}
                </Button>
              </form>
            </div>
          </div>
        </Card>

        <Card className="p-4 lg:p-5 bg-white/90">
          <div className="flex items-start gap-4">
            <span className="w-8 h-8 rounded-full bg-green-100 text-green-700 text-sm font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold text-gray-900">Pay via UPI ID</h2>
              <p className="text-xs text-gray-400 mt-0.5">Set the merchant UPI address for direct transfer.</p>

              <form onSubmit={saveUpiId} className="mt-3 space-y-2.5">
                {upiMsg && (
                  <div className={`text-xs p-2.5 rounded-lg ${upiMsg.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                    {upiMsg}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">UPI ID</label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={e => setUpiId(e.target.value)}
                    placeholder="e.g. merchant@paytm"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <p className="text-xs text-gray-400">Customers can send payments directly to this UPI ID.</p>

                <Button type="submit" disabled={upiSaving} size="sm" className="mt-1">
                  {upiSaving ? 'Saving...' : 'Save UPI ID'}
                </Button>
              </form>
            </div>
          </div>
        </Card>

        <Card className="p-4 lg:p-5 bg-white/90 xl:col-span-2">
          <div className="flex items-start gap-4">
            <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 text-sm font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold text-gray-900">Pay via Bank Transfer</h2>
              <p className="text-xs text-gray-400 mt-0.5">Enter NEFT / IMPS / RTGS details.</p>

              <form onSubmit={saveBankDetails} className="mt-3 space-y-2.5">
                {bankMsg && (
                  <div className={`text-xs p-2.5 rounded-lg ${bankMsg.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                    {bankMsg}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Bank Name</label>
                    <input type="text" value={bankName} onChange={e => setBankName(e.target.value)} placeholder="e.g. State Bank of India" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Account Holder Name</label>
                    <input type="text" value={accountHolder} onChange={e => setAccountHolder(e.target.value)} placeholder="e.g. John Doe" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Account Number</label>
                    <input type="text" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="Enter account number" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">IFSC Code</label>
                    <input type="text" value={ifscCode} onChange={e => setIfscCode(e.target.value)} placeholder="e.g. SBIN0001234" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                  </div>
                </div>

                {hasBankInfo && (
                  <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                    {[bankName, accountHolder].filter(Boolean).join(' - ')}
                  </div>
                )}

                <Button type="submit" disabled={bankSaving} size="sm">
                  {bankSaving ? 'Saving...' : 'Save Bank Details'}
                </Button>
              </form>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
