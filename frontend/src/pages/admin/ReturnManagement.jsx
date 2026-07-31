import { useState, useEffect } from 'react'
import { get, post, extractList } from '../../api/client'
import { useToast } from '../../context/ToastContext'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Badge from '../../components/ui/Badge'
import { formatDate, formatPrice, getStatusColor } from '../../utils/formatters'

const refundStatuses = ['REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED']
const STATUS_LABELS = {
  REQUESTED: 'Requested',
  UNDER_REVIEW: 'Under Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  PROCESSING: 'Processing',
  COMPLETED: 'Completed',
}

export default function ReturnManagement() {
  const [refunds, setRefunds] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [manageRefund, setManageRefund] = useState(null)
  const [updating, setUpdating] = useState(null)
  const [adminRemarks, setAdminRemarks] = useState('')
  const { showToast } = useToast()

  // Fetch refund requests
  useEffect(() => {
    const params = new URLSearchParams()
    if (statusFilter) params.append('status', statusFilter)
    const query = params.toString() ? `?${params.toString()}` : ''
    get(`/refunds/${query}`)
      .then(res => {
        if (res.ok) setRefunds(extractList(res.data))
        else setRefunds([])
      })
      .catch(() => setRefunds([]))
      .finally(() => setLoading(false))
  }, [statusFilter])

  // Approve via review endpoint
  async function handleApprove(id) {
    setUpdating(id)
    try {
      const res = await post(`/refunds/${id}/review/`, {
        decision: 'APPROVED',
        remarks: adminRemarks.trim(),
      })
      if (res.ok) {
        setRefunds(prev => prev.map(r => r.id === id ? { ...r, ...res.data } : r))
        if (manageRefund?.id === id) setManageRefund(prev => ({ ...prev, ...res.data }))
        setAdminRemarks('')
        showToast({ title: 'Approved', message: 'Refund request approved', type: 'success' })
      } else {
        showToast({ title: 'Error', message: res.data?.detail || res.data?.error || 'Something went wrong', type: 'error' })
      }
    } catch (err) {
      showToast({ title: 'Error', message: 'Something went wrong', type: 'error' })
    }
    setUpdating(null)
  }

  // Reject via review endpoint
  async function handleReject(id) {
    if (!adminRemarks.trim()) return
    setUpdating(id)
    try {
      const res = await post(`/refunds/${id}/review/`, {
        decision: 'REJECTED',
        remarks: adminRemarks.trim(),
      })
      if (res.ok) {
        setRefunds(prev => prev.map(r => r.id === id ? { ...r, ...res.data } : r))
        if (manageRefund?.id === id) setManageRefund(prev => ({ ...prev, ...res.data }))
        setAdminRemarks('')
        showToast({ title: 'Rejected', message: 'Refund request rejected', type: 'success' })
      } else {
        showToast({ title: 'Error', message: res.data?.detail || res.data?.error || 'Something went wrong', type: 'error' })
      }
    } catch (err) {
      showToast({ title: 'Error', message: 'Something went wrong', type: 'error' })
    }
    setUpdating(null)
  }

  // Mark as completed (refund processed) — uses the backend `complete` action
  async function handleComplete(id) {
    setUpdating(id)
    try {
      const res = await post(`/refunds/${id}/complete/`, {
        remarks: adminRemarks.trim(),
      })
      if (res.ok) {
        setRefunds(prev => prev.map(r => r.id === id ? { ...r, ...res.data } : r))
        if (manageRefund?.id === id) setManageRefund(prev => ({ ...prev, ...res.data }))
        setAdminRemarks('')
        showToast({ title: 'Completed', message: 'Refund marked as completed', type: 'success' })
      } else {
        showToast({ title: 'Error', message: res.data?.detail || res.data?.error || 'Something went wrong', type: 'error' })
      }
    } catch (err) {
      showToast({ title: 'Error', message: 'Something went wrong', type: 'error' })
    }
    setUpdating(null)
  }

  if (loading) return <Spinner />

  // ========== FULL PAGE MANAGE VIEW ==========
  if (manageRefund) {
    const req = manageRefund
    return (
      <div>
        <button
          onClick={() => { setManageRefund(null); setAdminRemarks('') }}
          className="text-sm text-primary-600 hover:text-primary-700 mb-4 inline-flex items-center gap-1"
        >
          &larr; Back to Returns
        </button>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Refund #{req.order_number || req.id?.toString().slice(0, 8)}
          </h1>
          <Badge className={getStatusColor(req.current_status)}>
            {STATUS_LABELS[req.current_status] || req.current_status}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT — Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Info */}
            <Card className="p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Requested By</h3>
              <div className="text-sm text-gray-700 space-y-1">
                <p className="font-medium">{req.requested_by_name || req.requested_by_email || '—'}</p>
              </div>
            </Card>

            {/* Reason */}
            <Card className="p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Reason</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{req.reason || 'No details provided.'}</p>
            </Card>

            {/* Status History */}
            {(req.status_history || []).length > 0 && (
              <Card className="p-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Status History</h3>
                <div className="space-y-2">
                  {(req.status_history || []).map((h, i) => (
                    <div key={h.id || i} className="flex items-center gap-3 text-sm">
                      <div className={`w-2 h-2 rounded-full ${
                        h.to_status === 'COMPLETED' ? 'bg-green-500' :
                        h.to_status === 'APPROVED' ? 'bg-blue-500' :
                        h.to_status === 'REJECTED' ? 'bg-red-500' :
                        'bg-gray-400'
                      }`} />
                      <span className="font-medium text-gray-700 capitalize">{h.to_status?.toLowerCase().replace(/_/g, ' ')}</span>
                      {h.remarks && <span className="text-gray-400">— {h.remarks}</span>}
                      {h.created_at && <span className="text-xs text-gray-400 ml-auto">{formatDate(h.created_at)}</span>}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Request Info */}
            <Card className="p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-xs text-gray-500 block">Order ID</span>
                  <span className="font-medium text-gray-900">#{req.order || req.order_id || '—'}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Requested On</span>
                  <span className="font-medium text-gray-900">{req.created_at ? formatDate(req.created_at) : '—'}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Refund Amount</span>
                  <span className="font-medium text-gray-900">{formatPrice(req.refund_amount || 0)}</span>
                </div>
                {req.reviewed_at && (
                  <div>
                    <span className="text-xs text-gray-500 block">Reviewed On</span>
                    <span className="font-medium text-gray-900">{formatDate(req.reviewed_at)}</span>
                  </div>
                )}
                {req.admin_remarks && (
                  <div className="col-span-2">
                    <span className="text-xs text-gray-500 block">Admin Remarks</span>
                    <p className="text-sm text-gray-700 mt-0.5">{req.admin_remarks}</p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* RIGHT — Actions */}
          <div className="space-y-6">
            <Card className="p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Actions</h3>

              {req.current_status === 'REQUESTED' || req.current_status === 'UNDER_REVIEW' ? (
                <div className="space-y-3">
                  <textarea
                    rows={3}
                    value={adminRemarks}
                    onChange={e => setAdminRemarks(e.target.value)}
                    placeholder="Add remarks (required for rejection)..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  />
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => handleApprove(req.id)}
                      disabled={updating === req.id}
                    >
                      {updating === req.id ? 'Processing...' : 'Approve'}
                    </Button>
                    <Button
                      className="flex-1"
                      variant="outline"
                      onClick={() => handleReject(req.id)}
                      disabled={updating === req.id || !adminRemarks.trim()}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ) : req.current_status === 'APPROVED' ? (
                <div className="space-y-3">
                  <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
                    ✓ Return approved. Process the refund to mark it as completed.
                  </div>
                  <textarea
                    rows={2}
                    value={adminRemarks}
                    onChange={e => setAdminRemarks(e.target.value)}
                    placeholder="Add note (optional)..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  />
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    onClick={() => handleComplete(req.id)}
                    disabled={updating === req.id}
                  >
                    {updating === req.id ? 'Processing...' : 'Mark as Completed (Refunded)'}
                  </Button>
                </div>
              ) : req.current_status === 'REJECTED' ? (
                <div className="bg-red-50 rounded-lg p-3 text-sm text-red-700">
                  ✕ Return request was rejected.
                  {req.admin_remarks && <p className="mt-1 font-medium">Reason: {req.admin_remarks}</p>}
                </div>
              ) : req.current_status === 'COMPLETED' ? (
                <div className="bg-green-50 rounded-lg p-3 text-sm text-green-700">
                  ✓ Refund has been processed and completed.
                </div>
              ) : (
                <div className="bg-yellow-50 rounded-lg p-3 text-sm text-yellow-700">
                  Status: {STATUS_LABELS[req.current_status] || req.current_status}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // ========== LIST VIEW ==========
  return (
    <div className="ops-route ops-admin-page" data-page="returns">
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-eco-100 via-beige-50 to-cream text-eco-900 p-6 lg:p-8 shadow-modal border border-beige-200 mb-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(90,160,95,0.12),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(217,164,65,0.14),transparent_30%)]" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.3em] text-primary-600 mb-2">Refund Management</p>
            <h1 className="font-display text-4xl md:text-5xl">Returns / Refunds</h1>
            <p className="mt-3 text-gray-700 max-w-xl">Manage customer refund requests, approve returns, and process refunds.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {refundStatuses.map(s => (
              <span key={s} className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                s === 'REQUESTED' ? 'bg-yellow-100 text-yellow-700' :
                s === 'UNDER_REVIEW' ? 'bg-orange-100 text-orange-700' :
                s === 'APPROVED' ? 'bg-blue-100 text-blue-700' :
                s === 'REJECTED' ? 'bg-red-100 text-red-700' :
                s === 'PROCESSING' ? 'bg-purple-100 text-purple-700' :
                'bg-green-100 text-green-700'
              }`}>
                {STATUS_LABELS[s]}: {refunds.filter(r => r.current_status === s).length}
              </span>
            ))}
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
              {refundStatuses.map(s => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Refunds Table */}
      {refunds.length > 0 ? (
        <Card className="overflow-hidden bg-white/90 border-beige-200 shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-beige-50 text-left text-gray-500 uppercase tracking-[0.18em] text-[11px]">
                  <th className="px-4 py-4 font-medium">ID</th>
                  <th className="px-4 py-4 font-medium">Customer</th>
                  <th className="px-4 py-4 font-medium">Amount</th>
                  <th className="px-4 py-4 font-medium">Status</th>
                  <th className="px-4 py-4 font-medium">Date</th>
                  <th className="px-4 py-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {refunds.map(req => (
                  <tr key={req.id} className="border-b border-beige-100 hover:bg-beige-50/70 transition-colors">
                    <td className="px-4 py-3 font-medium">#{req.id?.toString().slice(0, 8)}</td>
                    <td className="px-4 py-3">{req.requested_by_name || req.requested_by_email || '—'}</td>
                    <td className="px-4 py-3 font-medium">{formatPrice(req.refund_amount || 0)}</td>
                    <td className="px-4 py-3">
                      <Badge className={getStatusColor(req.current_status)}>
                        {STATUS_LABELS[req.current_status] || req.current_status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{req.created_at ? formatDate(req.created_at) : '—'}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" onClick={() => setManageRefund(req)}>
                        {req.current_status === 'REQUESTED' || req.current_status === 'UNDER_REVIEW' ? 'Review' : 'View'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card className="p-8 sm:p-12 bg-white/90 border-beige-200 shadow-card">
          <EmptyState emoji="📦" title="No refund requests" description="Customer refund requests will appear here." />
        </Card>
      )}
    </div>
  )
}
