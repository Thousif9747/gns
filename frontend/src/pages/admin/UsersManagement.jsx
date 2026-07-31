import { useState, useEffect } from 'react'
import { get, post, patch, del, extractList } from '../../api/client'
import { useToast } from '../../context/ToastContext'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Badge from '../../components/ui/Badge'
import { PageHeader } from '../../components/ui/OperationsUI'
import Modal from '../../components/ui/Modal'
import { formatDate } from '../../utils/formatters'

const ROLE_TABS = [
  { key: '', label: 'All' },
  { key: 'ADM', label: 'Admin' },
  { key: 'CUS', label: 'Customer' },
  { key: 'DLV', label: 'Delivery Partner' },
]

const ROLE_STYLE = {
  ADM: 'bg-purple-100 text-purple-800 border border-purple-200',
  CUS: 'bg-gray-100 text-gray-800 border border-gray-200',
  DLV: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
}

const ROLE_LABEL = { ADM: 'Admin', CUS: 'Customer', DLV: 'Delivery Partner' }

export default function UsersManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [roleFilter, setRoleFilter] = useState('')
  const [selected, setSelected] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ email: '', password: '', confirmPassword: '', full_name: '', phone: '' })
  const [addError, setAddError] = useState('')
  const [addSaving, setAddSaving] = useState(false)
  const [gstForm, setGstForm] = useState('')
  const [savingGst, setSavingGst] = useState(false)
  const { showToast } = useToast()

  useEffect(() => {
    fetchUsers()
  }, [roleFilter])

  useEffect(() => {
    if (showAddModal || !selected) return
  }, [showAddModal, selected])

  useEffect(() => {
    if (selected) setGstForm(selected.profile?.gst_number || '')
  }, [selected])

  async function saveGst() {
    if (!selected) return
    setSavingGst(true)
    const res = await patch(`/auth/users/${selected.id}/update_profile/`, { gst_number: gstForm })
    if (res.ok) {
      setUsers(prev => prev.map(u => u.id === selected.id ? { ...u, profile: { ...u.profile, gst_number: gstForm } } : u))
      setSelected(prev => ({ ...prev, profile: { ...prev.profile, gst_number: gstForm } }))
      showToast({ title: 'Updated', message: 'GST number updated successfully', type: 'success' })
    } else {
      showToast({ title: 'Error', message: res.data?.detail || 'Failed to update GST', type: 'error' })
    }
    setSavingGst(false)
  }

  async function fetchUsers() {
    setLoading(true)
    const url = roleFilter ? `/auth/users/?role=${roleFilter}` : '/auth/users/'
    const res = await get(url)
    if (res.ok) setUsers(extractList(res.data))
    else showToast({ title: 'Error', message: res.data?.detail || res.data?.error || 'Failed to load users', type: 'error' })
    setLoading(false)
  }

  function filterByRole(role) {
    setRoleFilter(role)
  }

  function getUserName(user) {
    return user.full_name || user.profile?.full_name || user.email || '-'
  }

  function getUserPhone(user) {
    return user.phone || '-'
  }

  function getJoinedDate(user) {
    return user.date_joined || user.created_at
  }

  async function handleAddSubmit(e) {
    e.preventDefault()
    setAddError('')
    if (!addForm.email.trim()) return setAddError('Email is required')
    if (!addForm.password || addForm.password.length < 8) return setAddError('Password must be at least 8 characters')
    if (addForm.password !== addForm.confirmPassword) return setAddError('Passwords do not match')
    if (!addForm.full_name.trim()) return setAddError('Full name is required')

    setAddSaving(true)
    const res = await post('/auth/users/', {
      email: addForm.email.trim(),
      password: addForm.password,
      full_name: addForm.full_name.trim(),
      phone: addForm.phone.trim(),
      role: 'DLV',
    })
    if (res.ok) {
      setAddForm({ email: '', password: '', confirmPassword: '', full_name: '', phone: '' })
      setShowAddModal(false)
      fetchUsers()
      showToast({ title: 'Created', message: 'Delivery partner created successfully', type: 'success' })
    } else {
      const msg = Object.values(res.data || {}).flat().join(', ')
      setAddError(msg || 'Failed to create user')
    }
    setAddSaving(false)
  }

  const counts = {
    total: users.length,
    ADM: users.filter(u => u.role === 'ADM').length,
    CUS: users.filter(u => u.role === 'CUS').length,
    DLV: users.filter(u => u.role === 'DLV').length,
  }

  if (loading) return <Spinner />

  return (
    <div className="ops-route ops-admin-page" data-page="users">
      <PageHeader eyebrow="Accounts" title="Users" description="Manage customer, administrator and delivery access." />
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-eco-100 via-beige-50 to-cream text-eco-900 p-6 lg:p-8 shadow-modal border border-beige-200 mb-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(90,160,95,0.12),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(217,164,65,0.14),transparent_30%)]" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.3em] text-primary-600 mb-2">User Management</p>
            <h1 className="font-display text-4xl md:text-5xl">Users</h1>
            <p className="mt-3 text-gray-700 max-w-xl">View and manage users, roles, and delivery partners.</p>
          </div>
          <Button onClick={() => setShowAddModal(true)}>
            + Add Delivery Partner
          </Button>
        </div>
      </section>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4 mb-6">
        <StatCard label="Total Users" value={counts.total} color="text-eco-900" />
        <StatCard label="Admins" value={counts.ADM} color="text-purple-600" />
        <StatCard label="Customers" value={counts.CUS} color="text-primary-600" />
        <StatCard label="Delivery Partners" value={counts.DLV} color="text-emerald-600" />
      </div>

      <Card className="overflow-hidden bg-white/90 border-beige-200 shadow-card">
        <div className="flex items-center gap-2 px-4 pt-4 pb-2 border-b border-beige-100">
          {ROLE_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => filterByRole(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                roleFilter === tab.key
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-500 hover:bg-beige-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {users.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-beige-50 text-left text-gray-500 uppercase tracking-[0.18em] text-[11px]">
                  <th className="px-4 py-4 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className="border-b border-beige-100 hover:bg-beige-50/70 transition-colors">
                    <td className="px-4 py-3 font-medium">{getUserName(user)}</td>
                    <td className="px-4 py-3 text-gray-600">{user.email}</td>
                    <td className="px-4 py-3 text-gray-600">{getUserPhone(user)}</td>
                    <td className="px-4 py-3">
                      <Badge className={ROLE_STYLE[user.role] || ROLE_STYLE.CUS}>
                        {ROLE_LABEL[user.role] || 'Unknown'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                        user.is_active ? 'text-emerald-600' : 'text-red-500'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          user.is_active ? 'bg-emerald-500' : 'bg-red-400'
                        }`} />
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(getJoinedDate(user))}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="outline" onClick={() => setSelected(user)}>Manage</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6">
            <EmptyState emoji="👥" title="No users found" />
          </div>
        )}
      </Card>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={`User: ${selected ? getUserName(selected) : ''}`}>
        {selected && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-beige-200 bg-beige-50 p-4 space-y-3">
              <p className="text-xs uppercase tracking-[0.25em] text-primary-600 font-semibold">Account Details</p>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Email</span>
                <span className="font-medium">{selected.email}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Phone</span>
                <span className="font-medium">{getUserPhone(selected)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Full name</span>
                <span className="font-medium">{getUserName(selected)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Role</span>
                <Badge className={ROLE_STYLE[selected.role] || ROLE_STYLE.CUS}>
                  {ROLE_LABEL[selected.role] || 'Unknown'}
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Status</span>
                <span className={`font-medium ${selected.is_active ? 'text-emerald-600' : 'text-red-500'}`}>
                  {selected.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-gray-500 shrink-0">GST Number</span>
                <div className="flex items-center gap-2 flex-1 max-w-[200px]">
                  <input
                    type="text"
                    value={gstForm}
                    onChange={e => setGstForm(e.target.value)}
                    placeholder="Enter GSTIN"
                    className="w-full rounded-lg border border-beige-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <button
                    onClick={saveGst}
                    disabled={savingGst}
                    className="shrink-0 px-2.5 py-1.5 rounded-lg bg-primary-600 text-white text-xs font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50"
                  >
                    {savingGst ? '...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Button variant="outline" onClick={() => setSelected(null)} className="w-full">Close</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); setAddError('') }} title="Add Delivery Partner">
        <form onSubmit={handleAddSubmit} className="space-y-4">
          {addError && (
            <div className="text-sm p-3 rounded-lg bg-red-50 text-red-600">{addError}</div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Email *</label>
            <input
              type="email" required
              value={addForm.email}
              onChange={e => setAddForm({ ...addForm, email: e.target.value })}
              className="w-full rounded-xl border border-beige-300 px-4 py-3 text-sm bg-white/90 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Full Name *</label>
            <input
              type="text" required
              value={addForm.full_name}
              onChange={e => setAddForm({ ...addForm, full_name: e.target.value })}
              className="w-full rounded-xl border border-beige-300 px-4 py-3 text-sm bg-white/90 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Phone</label>
            <input
              type="text"
              value={addForm.phone}
              onChange={e => setAddForm({ ...addForm, phone: e.target.value })}
              className="w-full rounded-xl border border-beige-300 px-4 py-3 text-sm bg-white/90 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Password *</label>
            <input
              type="password" required minLength={8}
              value={addForm.password}
              onChange={e => setAddForm({ ...addForm, password: e.target.value })}
              className="w-full rounded-xl border border-beige-300 px-4 py-3 text-sm bg-white/90 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Confirm Password *</label>
            <input
              type="password" required minLength={8}
              value={addForm.confirmPassword}
              onChange={e => setAddForm({ ...addForm, confirmPassword: e.target.value })}
              className="w-full rounded-xl border border-beige-300 px-4 py-3 text-sm bg-white/90 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <Button type="submit" disabled={addSaving} className="w-full">
            {addSaving ? 'Creating...' : 'Create Delivery Partner'}
          </Button>
        </form>
      </Modal>
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
