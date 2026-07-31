import { motion, useReducedMotion } from 'framer-motion'
import { useState } from 'react'

export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <header className="ops-page-header">
      <div>
        {eyebrow && <p className="ops-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="ops-description">{description}</p>}
      </div>
      {actions && <div className="ops-header-actions">{actions}</div>}
    </header>
  )
}

export function MetricCard({ label, value, context, tone = 'green', icon, delay = 0 }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: .35 }}
      className={`ops-metric ops-metric--${tone}`}
    >
      <div className="ops-metric-top">
        <span>{label}</span>
        <span className="ops-metric-icon" aria-hidden="true">{icon || '↗'}</span>
      </div>
      <strong>{value}</strong>
      {context && <p>{context}</p>}
    </motion.article>
  )
}

export function ChartCard({ title, subtitle, action, children, className = '' }) {
  return (
    <section className={`ops-card ${className}`}>
      <div className="ops-card-heading">
        <div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function SectionCard({ title, description, action, children, className = '' }) {
  return <section className={`ops-section-card ${className}`}>
    {(title||action)&&<header><div><h2>{title}</h2>{description&&<p>{description}</p>}</div>{action}</header>}
    {children}
  </section>
}

export function FilterBar({ label = 'Filters', children, action }) {
  return <section className="ops-semantic-filter" aria-label={label}><div>{children}</div>{action}</section>
}

export function StatusBadge({ children, tone = 'neutral' }) {
  return <span className={`ops-status ops-status--${tone}`}>{children}</span>
}

export function AreaChart({ data = [] }) {
  const [active, setActive] = useState(null)
  if (!data.length) return <ChartEmpty text="No revenue data for this period" />
  const width = 720, height = 250, left = 54, right = 16, top = 20, bottom = 38
  const values = data.map(d => Number(d.revenue) || 0)
  const max = Math.max(...values, 1)
  const x = i => left + i * ((width - left - right) / Math.max(data.length - 1, 1))
  const y = v => top + (height - top - bottom) * (1 - v / max)
  const line = data.map((d, i) => `${i ? 'L' : 'M'} ${x(i)} ${y(values[i])}`).join(' ')
  const area = `${line} L ${x(data.length - 1)} ${height - bottom} L ${x(0)} ${height - bottom} Z`
  const ticks = [0, .25, .5, .75, 1]
  return (
    <div className="ops-chart-wrap">
      <svg className="ops-area-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Revenue trend across ${data.length} periods`}>
        <defs>
          <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#146B45" stopOpacity=".28" />
            <stop offset="1" stopColor="#146B45" stopOpacity=".02" />
          </linearGradient>
        </defs>
        {ticks.map(t => <g key={t}><line x1={left} x2={width-right} y1={y(max*t)} y2={y(max*t)} className="ops-gridline" /><text x={left-9} y={y(max*t)+4} textAnchor="end" className="ops-axis">₹{Math.round(max*t/1000)}k</text></g>)}
        <motion.path d={area} fill="url(#revenue-fill)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .7 }} />
        <motion.path d={line} className="ops-chart-line" pathLength="1" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: .9, ease: 'easeOut' }} />
        {data.map((d, i) => <g key={`${d.month}-${i}`} role="button" tabIndex="0" aria-label={`${d.month}: ₹${values[i].toLocaleString('en-IN')}, ${d.count||0} orders`} onFocus={()=>setActive(i)} onBlur={()=>setActive(null)} onClick={()=>setActive(active===i?null:i)} className="ops-chart-point-group"><circle cx={x(i)} cy={y(values[i])} r={active===i?6:4} className="ops-chart-point" />{active===i&&<g className="ops-tooltip"><rect x={Math.min(Math.max(x(i)-65,4),width-134)} y={Math.max(y(values[i])-48,4)} width="130" height="34" rx="7"/><text x={Math.min(Math.max(x(i),69),width-69)} y={Math.max(y(values[i])-34,18)} textAnchor="middle">{d.month} · ₹{values[i].toLocaleString('en-IN')}</text><text x={Math.min(Math.max(x(i),69),width-69)} y={Math.max(y(values[i])-21,31)} textAnchor="middle">{d.count||0} orders</text></g>}<text x={x(i)} y={height-14} textAnchor="middle" className={`ops-axis ${data.length>6&&i%2?'ops-axis-hide-mobile':''}`}>{d.month}</text></g>)}
      </svg>
      <ul className="sr-only">{data.map((d,i)=><li key={i}>{d.month}: ₹{Number(d.revenue||0).toLocaleString('en-IN')}, {d.count||0} orders</li>)}</ul>
    </div>
  )
}

const DONUT_COLORS = ['#146B45','#FFB547','#3384d5','#8b5cf6','#e05c45','#58a879','#64748b','#ca8a04']
export function DonutChart({ data = [] }) {
  const reduceMotion = useReducedMotion()
  if (!data.length) return <ChartEmpty text="No order status data" />
  const total = data.reduce((sum, d) => sum + Number(d.count || 0), 0)
  let offset = 0
  return (
    <div className="ops-donut-layout">
      <div className="ops-donut">
        <svg viewBox="0 0 120 120" role="img" aria-label={`${total} orders by status`}>
          <circle cx="60" cy="60" r="45" fill="none" stroke="#edf1ed" strokeWidth="14" />
          {data.map((item, i) => {
            const length = total ? (item.count / total) * 282.743 : 0
            const current = offset; offset += length
            return <motion.circle key={item.status} cx="60" cy="60" r="45" fill="none" stroke={DONUT_COLORS[i % DONUT_COLORS.length]} strokeWidth="14" strokeLinecap="butt" strokeDasharray={`${length} ${282.743-length}`} strokeDashoffset={-current} transform="rotate(-90 60 60)" initial={reduceMotion?false:{strokeDasharray:`0 ${282.743}`}} animate={{strokeDasharray:`${length} ${282.743-length}`}} transition={{duration:.55,delay:i*.08}}><title>{item.status}: {item.count}</title></motion.circle>
          })}
        </svg>
        <div><strong>{total}</strong><span>orders</span></div>
      </div>
      <ul className="ops-legend">{data.map((item,i)=><li key={item.status}><i style={{background:DONUT_COLORS[i%DONUT_COLORS.length]}} /><span>{String(item.status).replaceAll('_',' ')}</span><strong>{item.count}</strong></li>)}</ul>
    </div>
  )
}

function ChartEmpty({ text }) {
  return <div className="ops-chart-empty"><span>⌁</span><p>{text}</p></div>
}
