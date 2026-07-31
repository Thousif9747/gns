import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { get } from '../../api/client'
import Spinner from '../../components/ui/Spinner'
import { AreaChart, ChartCard, DonutChart, MetricCard, PageHeader } from '../../components/ui/OperationsUI'
import { formatDate, formatPrice } from '../../utils/formatters'

const statusTone = { DELIVERED:'success', CANCELLED:'danger', PENDING:'warning', PROCESSING:'info', SHIPPED:'info', PAYMENT_REJECTED:'danger' }

export default function Dashboard() {
  const [analytics,setAnalytics] = useState(null)
  const [loading,setLoading] = useState(true)
  const [analyticsError,setAnalyticsError] = useState('')
  const [paymentsError,setPaymentsError] = useState('')
  const [cod,setCod] = useState({total:0,pending:0,collected:0,amount:0})
  const [filters,setFilters] = useState({ preset:'all', from:'', to:'', status:'' })
  const setFilter = (key,value) => setFilters(f=>({...f,[key]:value}))
  const applyPreset = value => {
    const now=new Date(), today=now.toISOString().slice(0,10); let from='',to=''
    if(value==='today') from=to=today
    if(value==='week'){from=new Date(now-7*86400000).toISOString().slice(0,10);to=today}
    if(value==='month'){from=new Date(now.getFullYear(),now.getMonth(),1).toISOString().slice(0,10);to=today}
    if(value==='lastMonth'){from=new Date(now.getFullYear(),now.getMonth()-1,1).toISOString().slice(0,10);to=new Date(now.getFullYear(),now.getMonth(),0).toISOString().slice(0,10)}
    setFilters(f=>({...f,preset:value,from,to}))
  }
  const load = useCallback(async()=>{
    setLoading(true)
    setAnalyticsError('')
    setPaymentsError('')
    const params={}; if(filters.from)params.from=filters.from;if(filters.to)params.to=filters.to;if(filters.status)params.status=filters.status
    const [a,p]=await Promise.all([get('/orders/analytics/',params),get('/payments/')])
    if(a.ok)setAnalytics(a.data)
    else { setAnalytics(null); setAnalyticsError(a.error||'Analytics are temporarily unavailable.') }
    if(p.ok){const rows=p.data.results||p.data||[], list=rows.filter(x=>x.chosen_method==='cod');setCod({total:list.length,pending:list.filter(x=>x.current_status==='COD').length,collected:list.filter(x=>x.current_status==='COLLECTED').length,amount:list.filter(x=>x.current_status==='COLLECTED').reduce((n,x)=>n+Number(x.amount_paid||x.amount||0),0)})}
    else setPaymentsError(p.error||'COD payment data is unavailable.')
    setLoading(false)
  },[filters.from,filters.to,filters.status])
  useEffect(()=>{load()},[load])
  if(loading&&!analytics)return <div className="grid min-h-[65vh] place-items-center"><Spinner /></div>
  if(analyticsError&&!analytics)return <div className="ops-page"><PageHeader eyebrow="Command center" title="Business overview" description="Revenue, orders and operations in one focused view." /><section className="ops-error" role="alert"><div><strong>We could not load analytics</strong><p>{analyticsError} Unavailable values are not presented as zero.</p></div><button onClick={load}>Try again</button></section></div>
  const s=analytics?.summary||{}, p=analytics?.products||{}, u=analytics?.users||{}
  const statuses=analytics?.status_breakdown||[], revenue=analytics?.monthly_revenue||[], products=analytics?.top_products||[], orders=analytics?.recent_orders||[]
  return <div className="ops-page">
    <PageHeader eyebrow="Command center" title="Business overview" description="Revenue, orders and operations in one focused view." actions={!analyticsError?<div className="ops-live"><i /> Live data</div>:null} />
    {analyticsError&&<section className="ops-error" role="alert"><div><strong>Refresh failed</strong><p>{analyticsError} Showing the last successful analytics response.</p></div><button onClick={load}>Try again</button></section>}
    <section className="ops-filter" aria-label="Analytics filters">
      <label><span>Period</span><select value={filters.preset} onChange={e=>applyPreset(e.target.value)}><option value="all">All time</option><option value="today">Today</option><option value="week">Last 7 days</option><option value="month">This month</option><option value="lastMonth">Last month</option></select></label>
      <label><span>From</span><input type="date" value={filters.from} onChange={e=>{setFilter('from',e.target.value);setFilter('preset','custom')}} /></label>
      <label><span>To</span><input type="date" value={filters.to} onChange={e=>{setFilter('to',e.target.value);setFilter('preset','custom')}} /></label>
      <label><span>Status</span><select value={filters.status} onChange={e=>setFilter('status',e.target.value)}><option value="">All statuses</option>{['PENDING','PAYMENT_UPLOADED','PAYMENT_APPROVED','PAYMENT_REJECTED','PROCESSING','SHIPPED','DELIVERED','CANCELLED'].map(x=><option key={x}>{x}</option>)}</select></label>
      {loading&&<span className="ops-updating">Updating…</span>}
    </section>
    <section className="ops-kpis" aria-label="Primary business metrics">
      <MetricCard label="Total revenue" value={formatPrice(Number(s.total_revenue||0))} context="For selected period" tone="lime" icon="₹" />
      <MetricCard label="Total orders" value={Number(s.total_orders||0).toLocaleString('en-IN')} context="Across all channels" icon="↗" delay={.05} />
      <MetricCard label="Average order" value={formatPrice(Number(s.avg_order_value||0))} context="Revenue per order" tone="gold" icon="≈" delay={.1} />
      <MetricCard label="Active products" value={`${p.active||0} / ${p.total||0}`} context={`${p.out_of_stock||0} out of stock`} tone={p.out_of_stock?'red':'blue'} icon="▦" delay={.15} />
    </section>
    <section className="ops-secondary">
      <MetricCard label="Customers" value={u.total||0} context={`${u.new||0} new in period`} icon="◉" />
      <MetricCard label="COD orders" value={paymentsError?'—':cod.total} context={paymentsError?'Payment data unavailable':`${cod.pending} awaiting collection`} tone="gold" icon="₹" />
      <MetricCard label="COD collected" value={paymentsError?'—':cod.collected} context={paymentsError?'Try refreshing later':formatPrice(cod.amount)} tone="blue" icon="✓" />
    </section>
    <div className="ops-chart-grid">
      <ChartCard title="Revenue performance" subtitle="Monthly revenue with order volume"><AreaChart data={revenue} /></ChartCard>
      <ChartCard title="Order distribution" subtitle="Current filtered order mix"><DonutChart data={statuses} /></ChartCard>
    </div>
    <div className="ops-bottom-grid">
      <ChartCard title="Top products" subtitle="Ranked by units sold" action={<Link to="/admin/products">View catalog →</Link>}>
        {products.length?<div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Rank</th><th>Product</th><th>Units</th><th>Revenue</th></tr></thead><tbody>{products.map((x,i)=><tr key={x.product_id}><td><b className="ops-rank">{String(i+1).padStart(2,'0')}</b></td><td><Link to={`/admin/products/${x.product_slug}/edit`}>{x.product_name}</Link></td><td>{x.total_qty}</td><td><strong>{formatPrice(Number(x.total_revenue||0))}</strong></td></tr>)}</tbody></table></div>:<p className="ops-empty">No product sales for this period.</p>}
      </ChartCard>
      <ChartCard title="Recent orders" subtitle="Latest activity" action={<Link to="/admin/orders">View all →</Link>}>
        {orders.length?<div className="ops-order-feed">{orders.map(o=><Link to="/admin/orders" key={o.id} className="ops-order-row"><div><strong>#{o.order_number}</strong><span>{o.user_email||'Guest customer'}</span></div><div><span className={`ops-status ops-status--${statusTone[o.current_status]||'neutral'}`}>{String(o.current_status).replaceAll('_',' ')}</span><strong>{formatPrice(Number(o.total_amount||0))}</strong><small>{o.created_at?formatDate(o.created_at):''}</small></div></Link>)}</div>:<p className="ops-empty">No recent orders.</p>}
      </ChartCard>
    </div>
  </div>
}
