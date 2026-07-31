import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { get, extractList } from '../../api/client'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/OperationsUI'

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric',
  }).format(new Date(dateStr))
}

export default function OffersManagement() {
  const navigate = useNavigate()
  const [offers, setOffers] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchOffers = useCallback(async () => {
    const res = await get('/catalog/offers/')
    if (res.ok) setOffers(extractList(res.data))
  }, [])

  useEffect(() => {
    fetchOffers().finally(() => setLoading(false))
  }, [fetchOffers])

  if (loading) return <Spinner />

  const activeCount = offers.filter(o => o.is_active).length

  return (
    <div className="ops-route ops-admin-page space-y-6" data-page="offers">
      <PageHeader eyebrow="Promotion" title="Offers" description="Plan and manage active storefront promotions." />
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-eco-100 via-beige-50 to-cream text-eco-900 p-6 lg:p-8 shadow-modal border border-beige-200">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(90,160,95,0.12),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(217,164,65,0.14),transparent_30%)]" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.3em] text-primary-600 mb-2">Promotions</p>
            <h1 className="font-display text-4xl md:text-5xl">Offers</h1>
            <p className="mt-3 text-gray-700 max-w-xl">Create and manage promotional offers, discounts, and coupon codes.</p>
          </div>
          <Button onClick={() => navigate('/admin/offers/new')} className="bg-primary-500 text-white hover:bg-primary-600 shadow-lg px-6">
            Add Offer
          </Button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5 bg-white/90 border-beige-200">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Total offers</p>
          <p className="mt-2 text-3xl font-bold text-eco-900">{offers.length}</p>
        </Card>
        <Card className="p-5 bg-white/90 border-beige-200">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Active</p>
          <p className="mt-2 text-3xl font-bold text-emerald-700">{activeCount}</p>
        </Card>
        <Card className="p-5 bg-white/90 border-beige-200">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Inactive</p>
          <p className="mt-2 text-3xl font-bold text-gray-500">{offers.length - activeCount}</p>
        </Card>
      </div>

      {offers.length > 0 ? (
        <Card className="overflow-hidden bg-white/90 border-beige-200 shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-beige-50 text-left text-gray-500 uppercase tracking-[0.18em] text-[11px]">
                  <th className="px-4 py-4 font-medium">Name</th>
                  <th className="px-4 py-4 font-medium">Discount</th>
                  <th className="px-4 py-4 font-medium">Code</th>
                  <th className="px-4 py-4 font-medium">Badge</th>
                  <th className="px-4 py-4 font-medium">Valid</th>
                  <th className="px-4 py-4 font-medium">Status</th>
                  <th className="px-4 py-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {offers.map(offer => (
                  <tr key={offer.id} className="border-b border-beige-100 hover:bg-beige-50/70 transition-colors">
                    <td className="px-4 py-3 font-medium text-eco-900">{offer.name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                        offer.discount_type === 'PERCENT'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {offer.discount_type === 'PERCENT'
                          ? `${offer.discount_value}%`
                          : `₹${offer.discount_value}`}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {offer.code ? (
                        <span className="font-mono text-xs bg-beige-100 px-2 py-1 rounded">{offer.code}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {offer.badge_label ? (
                        <span className="px-2 py-1 rounded-full text-[11px] font-semibold bg-primary-100 text-primary-700">
                          {offer.badge_label}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {formatDate(offer.start_date)} – {formatDate(offer.end_date)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                        offer.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {offer.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="outline" onClick={() => navigate(`/admin/offers/${offer.id}/edit`)}>
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <EmptyState emoji="🏷️" title="No offers" description="Create your first promotional offer to get started.">
          <Button onClick={() => navigate('/admin/offers/new')}>Add Offer</Button>
        </EmptyState>
      )}
    </div>
  )
}
