import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { get, extractList } from '../../api/client'
import Card from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'
import { formatPrice, getStatusColor } from '../../utils/formatters'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}

const itemAnim = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

export default function DeliveryPartnerTracking() {
  const [partners, setPartners] = useState([])
  const [stats, setStats] = useState({ total: 0, active: 0, codRate: 0, totalCOD: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      get('/orders/delivery_persons/'),
      get('/payments/'),
      get('/orders/'),
    ]).then(([personsRes, paymentsRes, ordersRes]) => {
      const persons = personsRes.ok ? extractList(personsRes.data) : []
      const payments = paymentsRes.ok ? (paymentsRes.data.results || paymentsRes.data) : []
      const orders = ordersRes.ok ? extractList(ordersRes.data) : []

      const codPayments = payments.filter(p => p.chosen_method === 'cod')
      const collectedCOD = codPayments.filter(p => p.current_status === 'COLLECTED')
      const totalCODRevenue = collectedCOD.reduce((sum, p) => sum + parseFloat(p.amount_paid || p.amount || 0), 0)

      const partnerData = persons.map(person => {
        const personOrders = orders.filter(o =>
          o.delivery_person_id === person.id || o.delivery_person === person.id
        )
        const delivered = personOrders.filter(o => o.current_status === 'DELIVERED')
        const active = personOrders.filter(o => !['DELIVERED', 'CANCELLED'].includes(o.current_status))

        const personPaymentIds = personOrders.map(o => String(o.id))
        const personPayments = payments.filter(p => personPaymentIds.includes(String(p.order)))
        const personCOD = personPayments.filter(p => p.chosen_method === 'cod')
        const personCODCollected = personCOD.filter(p => p.current_status === 'COLLECTED')
        const personCODPending = personCOD.filter(p => p.current_status === 'COD')

        return {
          id: person.id,
          name: person.profile?.full_name || person.email || 'Unknown',
          email: person.email,
          phone: person.phone || '—',
          totalOrders: personOrders.length,
          activeOrders: active.length,
          deliveredOrders: delivered.length,
          codOrders: personCOD.length,
          codCollected: personCODCollected.length,
          codPending: personCODPending.length,
          codAmount: personCODCollected.reduce((sum, p) => sum + parseFloat(p.amount_paid || p.amount || 0), 0),
        }
      })

      setPartners(partnerData)
      setStats({
        total: persons.length,
        active: partnerData.filter(p => p.activeOrders > 0).length,
        codRate: codPayments.length > 0 ? Math.round((collectedCOD.length / codPayments.length) * 100) : 0,
        totalCOD: totalCODRevenue,
      })
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />

  return (
    <div className="ops-route ops-admin-page space-y-6" data-page="delivery-partners">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-eco-100 via-beige-50 to-cream text-eco-900 p-6 lg:p-8 shadow-modal border border-beige-200">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(90,160,95,0.12),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(217,164,65,0.14),transparent_30%)]" />
          <div className="relative">
            <p className="text-xs uppercase tracking-[0.3em] text-primary-600 mb-2">Delivery Management</p>
            <h1 className="font-display text-4xl md:text-5xl">Delivery Partners</h1>
            <p className="mt-3 text-gray-700 max-w-xl">Track performance, COD collection, and delivery activity per partner.</p>
          </div>
        </section>
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="Total Partners" value={stats.total} color="text-primary-600" bg="bg-primary-100/60" />
        <KpiCard label="Active Now" value={stats.active} color="text-emerald-600" bg="bg-emerald-100/60" />
        <KpiCard label="COD Collection Rate" value={`${stats.codRate}%`} color="text-amber-600" bg="bg-amber-100/60" />
        <KpiCard label="COD Revenue" value={formatPrice(stats.totalCOD)} color="text-gold-600" bg="bg-gold-100/60" />
      </motion.div>

      {/* Partner Table */}
      {partners.length > 0 ? (
        <Card className="overflow-hidden bg-white/90 border-beige-200 shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-beige-50 text-left text-gray-500 uppercase tracking-[0.18em] text-[11px]">
                  <th className="px-4 py-4 font-medium">Partner</th>
                  <th className="px-4 py-4 font-medium">Contact</th>
                  <th className="px-4 py-4 font-medium">Total Orders</th>
                  <th className="px-4 py-4 font-medium">Active</th>
                  <th className="px-4 py-4 font-medium">Delivered</th>
                  <th className="px-4 py-4 font-medium">COD Orders</th>
                  <th className="px-4 py-4 font-medium">COD Collected</th>
                  <th className="px-4 py-4 font-medium">COD Pending</th>
                  <th className="px-4 py-4 font-medium">COD Amount</th>
                </tr>
              </thead>
              <tbody>
                {partners.map(partner => (
                  <tr key={partner.id} className="border-b border-beige-100 hover:bg-beige-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">{partner.name}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      <p>{partner.email}</p>
                      <p className="text-gray-400">{partner.phone}</p>
                    </td>
                    <td className="px-4 py-3 font-medium">{partner.totalOrders}</td>
                    <td className="px-4 py-3">
                      {partner.activeOrders > 0 ? (
                        <Badge className="bg-blue-100 text-blue-700 text-xs">{partner.activeOrders}</Badge>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{partner.deliveredOrders}</td>
                    <td className="px-4 py-3">
                      {partner.codOrders > 0 ? (
                        <Badge className="bg-amber-100 text-amber-800 text-xs">{partner.codOrders}</Badge>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {partner.codCollected > 0 ? (
                        <Badge className="bg-green-100 text-green-700 text-xs">{partner.codCollected}</Badge>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {partner.codPending > 0 ? (
                        <Badge className="bg-orange-100 text-orange-700 text-xs">{partner.codPending}</Badge>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{formatPrice(partner.codAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card className="p-8 text-center">
          <EmptyState emoji="👥" title="No delivery partners" subtitle="Partners will appear here once assigned." />
        </Card>
      )}
    </div>
  )
}

function KpiCard({ label, value, color, bg }) {
  return (
    <motion.div variants={itemAnim}>
      <div className="rounded-2xl border border-eco-900/8 bg-white/70 backdrop-blur-md p-4 lg:p-5 shadow-[0_4px_20px_rgba(26,61,31,0.05)] hover:shadow-[0_8px_30px_rgba(26,61,31,0.08)] transition-shadow">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase tracking-[0.18em] text-eco-500 font-medium">{label}</span>
          <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center ${color}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        </div>
        <p className={`text-xl lg:text-2xl font-bold ${color}`}>{value}</p>
      </div>
    </motion.div>
  )
}
