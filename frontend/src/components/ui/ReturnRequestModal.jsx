import { useState } from 'react'
import { motion } from 'framer-motion'
import Modal from './Modal'
import Button from './Button'
import { post } from '../../api/client'
import { formatPrice } from '../../utils/formatters'

const returnReasons = [
  { value: 'defective', label: 'Defective / Damaged' },
  { value: 'not_as_described', label: 'Not as described' },
  { value: 'changed_mind', label: 'Changed mind' },
  { value: 'wrong_item', label: 'Wrong item received' },
  { value: 'other', label: 'Other' },
]

export default function ReturnRequestModal({ isOpen, onClose, order }) {
  const [selectedItems, setSelectedItems] = useState({})
  const [reasons, setReasons] = useState({})
  const [details, setDetails] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  if (!order || !order.items) return null

  const toggleItem = (itemId) => {
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId],
    }))
  }

  const setReason = (itemId, value) => {
    setReasons(prev => ({ ...prev, [itemId]: value }))
  }

  const setDetail = (itemId, value) => {
    setDetails(prev => ({ ...prev, [itemId]: value }))
  }

  const hasSelection = Object.values(selectedItems).some(v => v)

  const handleSubmit = async () => {
    const itemsToReturn = order.items.filter(item => selectedItems[item.id || item.product])
    if (itemsToReturn.length === 0) return

    // Build a human-readable reason string from all selected items
    const reasonParts = itemsToReturn.map(item => {
      const itemKey = item.id || item.product
      const r = reasons[itemKey] || 'other'
      const d = details[itemKey]
      return `${item.product_name || `Product #${item.product}`} (qty: ${item.quantity}) - ${r}${d ? ': ' + d : ''}`
    })
    const reasonText = reasonParts.join('; ')

    // Calculate total refund amount
    const totalRefund = itemsToReturn.reduce((sum, item) => sum + parseFloat(item.line_total || 0), 0)

    setSubmitting(true)
    setError('')

    try {
      const res = await post('/refunds/', {
        order: order.id,
        reason: reasonText,
        refund_amount: totalRefund,
      })
      if (res.ok) {
        setSubmitted(true)
      } else {
        const msg = Object.values(res.data || {}).flat().join(', ') || 'Failed to submit return request'
        setError(msg)
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={submitted ? 'Return Requested' : 'Request Return'}>
      {submitted ? (
        <div className="text-center py-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
            className="w-16 h-16 rounded-full bg-green-100 mx-auto mb-4 flex items-center justify-center"
          >
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </motion.div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Return Request Submitted!</h3>
          <p className="text-sm text-gray-500 mb-6">We'll review your request and get back to you within 2-3 business days.</p>
          <Button onClick={onClose}>Done</Button>
        </div>
      ) : (
        <div className="space-y-5">
          <p className="text-sm text-gray-600">
            Select the items you want to return from order <strong>#{order.order_number || order.id}</strong>:
          </p>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-sm text-red-700">{error}</div>
          )}

          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            {(order.items || []).map((item) => {
              const itemKey = item.id || item.product
              const isSelected = selectedItems[itemKey]
              return (
                <div
                  key={itemKey}
                  className={`rounded-xl border p-4 transition-all ${
                    isSelected ? 'border-primary-300 bg-primary-50/50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={!!isSelected}
                      onChange={() => toggleItem(itemKey)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{item.product_name || `Product #${item.product}`}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Qty: {item.quantity} &times; {formatPrice(item.unit_price)}</p>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{formatPrice(item.line_total || 0)}</span>
                  </div>

                  {isSelected && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="mt-3 pl-7 space-y-3"
                    >
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Reason for return</label>
                        <select
                          value={reasons[itemKey] || ''}
                          onChange={(e) => setReason(itemKey, e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                          <option value="">Select a reason...</option>
                          {returnReasons.map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Additional details (optional)</label>
                        <textarea
                          value={details[itemKey] || ''}
                          onChange={(e) => setDetail(itemKey, e.target.value)}
                          rows={2}
                          placeholder="Describe the issue..."
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                        />
                      </div>
                    </motion.div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 text-sm text-yellow-700">
            <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span>Refunds are processed within 5-7 business days after we receive and inspect the returned item(s).</span>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!hasSelection || submitting}>
              {submitting ? 'Submitting...' : 'Submit Return Request'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
