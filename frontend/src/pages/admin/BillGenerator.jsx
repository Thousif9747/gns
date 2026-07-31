import { useMemo, useState } from 'react'
import { formatDate, formatPrice } from '../../utils/formatters'

const today = () => new Date().toISOString().slice(0, 10)
const billNumber = () => `GROWNEST-${today().replaceAll('-', '')}-${String(Date.now()).slice(-4)}`
const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`
const blankItem = () => ({ id: uid(), description: '', quantity: 1, price: '', gst: 0 })
const number = value => Math.max(0, Number.isFinite(Number(value)) ? Number(value) : 0)

function amountInWords(value) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  const two = n => n < 20 ? ones[n] : `${tens[Math.floor(n / 10)]}${n % 10 ? ` ${ones[n % 10]}` : ''}`
  const three = n => `${n >= 100 ? `${ones[Math.floor(n / 100)]} Hundred ` : ''}${two(n % 100)}`.trim()
  let n = Math.floor(number(value))
  if (!n) return 'Zero Rupees Only'
  const parts = []
  ;[[10000000, 'Crore'], [100000, 'Lakh'], [1000, 'Thousand']].forEach(([size, label]) => {
    if (n >= size) { parts.push(`${three(Math.floor(n / size))} ${label}`); n %= size }
  })
  if (n) parts.push(three(n))
  return `${parts.join(' ')} Rupees Only`
}

const field = 'w-full rounded-lg border border-[#cbd8d0] bg-white px-3 py-2.5 text-sm text-[#173b2b] outline-none transition focus:border-[#147a4d] focus:ring-2 focus:ring-[#147a4d]/15'
const label = 'mb-1.5 block text-[10px] font-extrabold uppercase tracking-[.14em] text-[#53675c]'

function Section({ number, title, children }) {
  return <section className="border-b border-[#dfe7e1] p-5 sm:p-6">
    <div className="mb-4 flex items-center gap-3">
      <span className="grid h-7 w-7 place-items-center rounded-md bg-[#123e2d] text-[10px] font-black text-[#ddf54a]">{number}</span>
      <h2 className="text-sm font-extrabold text-[#123e2d]">{title}</h2>
    </div>
    {children}
  </section>
}

export default function BillGenerator() {
  const initialBill = () => ({ number: billNumber(), date: today(), customer: '', phone: '', address: '', gstin: '', discount: '', notes: '', status: 'Paid', payment: 'Cash' })
  const [bill, setBill] = useState(initialBill)
  const [items, setItems] = useState([blankItem()])
  const setBillField = (key, value) => setBill(current => ({ ...current, [key]: value }))
  const setItem = (id, key, value) => setItems(current => current.map(item => item.id === id ? { ...item, [key]: value } : item))

  const totals = useMemo(() => {
    const rows = items.map(item => {
      const quantity = number(item.quantity), price = number(item.price), gst = Math.min(100, number(item.gst))
      const base = quantity * price
      return { ...item, quantity, price, gst, base, tax: base * gst / 100 }
    })
    const subtotal = rows.reduce((sum, row) => sum + row.base, 0)
    const discount = Math.min(number(bill.discount), subtotal)
    const taxable = Math.max(0, subtotal - discount)
    const rawTax = rows.reduce((sum, row) => sum + row.tax, 0)
    const tax = subtotal ? rawTax * taxable / subtotal : 0
    return { rows, subtotal, discount, taxable, cgst: tax / 2, sgst: tax / 2, total: taxable + tax }
  }, [items, bill.discount])

  const reset = () => { setBill(initialBill()); setItems([blankItem()]) }

  return <div className="bill-page">
    <style>{`
      .bill-receipt{background:#fffef8;box-shadow:0 20px 60px rgba(18,62,45,.14)}
      .bill-mobile-items{display:none}
      @media(max-width:520px){.bill-table{display:none}.bill-mobile-items{display:block}}
      @media print{
        @page{size:A4;margin:11mm}
        body *{visibility:hidden!important}
        .bill-print,.bill-print *{visibility:visible!important}
        .bill-print{position:absolute!important;inset:0!important;width:100%!important;max-width:none!important;margin:0!important;padding:0!important;border:0!important;box-shadow:none!important;background:white!important}
        .bill-table{display:table!important}.bill-mobile-items{display:none!important}
        .bill-print tr,.bill-totals,.bill-words,.bill-notes,.bill-footer{break-inside:avoid;page-break-inside:avoid}
      }
    `}</style>

    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="mb-1 text-[10px] font-black uppercase tracking-[.2em] text-[#147a4d]">Offline sales desk</p><h1 className="text-2xl font-black text-[#102d22] sm:text-3xl">Bill Generator</h1><p className="mt-1 text-sm text-[#637269]">Create GST bills for walk-in and direct sales.</p></div>
      <button onClick={() => window.print()} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#123e2d] px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#0c3022]">
        <span aria-hidden="true">▣</span> Print / Save PDF
      </button>
    </header>

    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(430px,.95fr)]">
      <div className="overflow-hidden rounded-xl border border-[#dce5de] bg-white shadow-sm">
        <Section number="01" title="Bill details"><div className="grid gap-4 sm:grid-cols-2">
          <label><span className={label}>Bill number</span><input className={field} value={bill.number} onChange={e => setBillField('number', e.target.value)} /></label>
          <label><span className={label}>Date</span><input type="date" className={field} value={bill.date} onChange={e => setBillField('date', e.target.value)} /></label>
          <label><span className={label}>Payment mode</span><select className={field} value={bill.payment} onChange={e => setBillField('payment', e.target.value)}><option>Cash</option><option>UPI</option><option>Card</option><option>Bank Transfer</option></select></label>
          <label><span className={label}>Payment status</span><select className={field} value={bill.status} onChange={e => setBillField('status', e.target.value)}><option>Paid</option><option>Payment Due</option><option>Partially Paid</option></select></label>
        </div></Section>

        <Section number="02" title="Customer details"><div className="grid gap-4 sm:grid-cols-2">
          <label><span className={label}>Customer name</span><input className={field} value={bill.customer} onChange={e => setBillField('customer', e.target.value)} placeholder="Customer name" /></label>
          <label><span className={label}>Phone</span><input type="tel" className={field} value={bill.phone} onChange={e => setBillField('phone', e.target.value)} placeholder="+91 98765 43210" /></label>
          <label className="sm:col-span-2"><span className={label}>Billing address</span><textarea rows="2" className={field} value={bill.address} onChange={e => setBillField('address', e.target.value)} /></label>
          <label className="sm:col-span-2"><span className={label}>Customer GSTIN (optional)</span><input className={`${field} uppercase`} value={bill.gstin} onChange={e => setBillField('gstin', e.target.value)} placeholder="29AAAAA0000A1Z5" /></label>
        </div></Section>

        <Section number="03" title="Items"><div className="space-y-3">
          {items.map((item, index) => <div key={item.id} className="rounded-lg border border-[#dfe7e1] bg-[#f7faf7] p-3">
            <div className="mb-3 flex items-center justify-between"><b className="text-xs text-[#123e2d]">Item {String(index + 1).padStart(2, '0')}</b><button disabled={items.length === 1} onClick={() => setItems(current => current.filter(row => row.id !== item.id))} className="rounded p-1 text-xs font-bold text-red-600 disabled:opacity-25">Remove</button></div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-[minmax(150px,2fr)_70px_110px_80px]">
              <label className="col-span-2 sm:col-span-1"><span className={label}>Description</span><input className={field} value={item.description} onChange={e => setItem(item.id, 'description', e.target.value)} placeholder="Product or service" /></label>
              <label><span className={label}>Qty</span><input type="number" min="0" step=".01" className={field} value={item.quantity} onChange={e => setItem(item.id, 'quantity', e.target.value)} /></label>
              <label><span className={label}>Unit price</span><input type="number" min="0" step=".01" className={field} value={item.price} onChange={e => setItem(item.id, 'price', e.target.value)} /></label>
              <label><span className={label}>GST</span><select className={field} value={item.gst} onChange={e => setItem(item.id, 'gst', e.target.value)}>{[0, 5, 12, 18, 28].map(rate => <option key={rate} value={rate}>{rate}%</option>)}</select></label>
            </div>
          </div>)}
          <button onClick={() => setItems(current => [...current, blankItem()])} className="w-full rounded-lg border border-dashed border-[#147a4d]/50 py-3 text-xs font-bold text-[#147a4d] hover:bg-[#edf8f1]">＋ Add another item</button>
        </div></Section>

        <Section number="04" title="Adjustments & notes"><div className="grid gap-4 sm:grid-cols-2">
          <label><span className={label}>Overall discount (₹)</span><input type="number" min="0" step=".01" className={field} value={bill.discount} onChange={e => setBillField('discount', e.target.value)} /></label>
          <label className="sm:col-span-2"><span className={label}>Notes (optional)</span><textarea rows="3" className={field} value={bill.notes} onChange={e => setBillField('notes', e.target.value)} /></label>
        </div></Section>
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#f1f5f2] px-5 py-4"><button onClick={reset} className="text-xs font-bold text-red-700">↻ New bill / Reset</button><span className="text-xs text-[#67766d]">Totals update automatically</span></div>
      </div>

      <div className="min-w-0 xl:sticky xl:top-6">
        <div className="mb-3 flex items-center justify-between px-1 text-[10px] font-bold uppercase tracking-[.14em] text-[#5c6e63]"><span>Live bill preview</span><span className="text-[#147a4d]">● Ready to print</span></div>
        <article className="bill-receipt bill-print mx-auto min-h-[690px] w-full max-w-[620px] border border-[#d5ddd7] p-5 text-[#173b2b] sm:p-8">
          <header className="flex items-start justify-between gap-4 border-b-2 border-[#123e2d] pb-5">
            <div className="flex items-center gap-3"><img src="/icons/logo-192x192.png" alt="GrowNest logo" className="h-14 w-14 object-contain" /><div><h2 className="text-xl font-black leading-none sm:text-2xl">GrowNest</h2><p className="mt-1 text-[8px] font-black uppercase tracking-[.2em] text-[#627268]">Manufacturing • Quality • Trust</p></div></div>
            <div className="text-right"><p className="text-lg font-black text-[#b27b19]">TAX INVOICE</p><span className="text-[9px] font-bold uppercase tracking-wider">{bill.status}</span></div>
          </header>
          <div className="grid grid-cols-2 gap-4 border-b border-[#d5ddd7] py-5 text-xs">
            <div><p className="mb-2 text-[9px] font-bold uppercase tracking-wider text-[#718078]">Billed to</p><strong className="block text-sm">{bill.customer || 'Walk-in Customer'}</strong>{bill.phone && <p className="mt-1">{bill.phone}</p>}{bill.address && <p className="mt-1 whitespace-pre-line text-[#5d6b63]">{bill.address}</p>}{bill.gstin && <p className="mt-2 text-[10px]"><b>GSTIN:</b> {bill.gstin}</p>}</div>
            <dl className="grid content-start grid-cols-[auto_1fr] gap-x-2 gap-y-2 text-right"><dt className="text-[9px] font-bold uppercase text-[#718078]">Bill no.</dt><dd className="break-all font-bold">{bill.number || '—'}</dd><dt className="text-[9px] font-bold uppercase text-[#718078]">Date</dt><dd>{bill.date ? formatDate(bill.date) : '—'}</dd><dt className="text-[9px] font-bold uppercase text-[#718078]">Payment</dt><dd>{bill.payment}</dd></dl>
          </div>
          <div className="my-5">
            <table className="bill-table w-full text-[11px]"><thead><tr className="border-y border-[#aab7ae] bg-[#edf3ee] text-left text-[9px] uppercase"><th className="p-2">Item</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Rate</th><th className="p-2 text-right">GST</th><th className="p-2 text-right">Amount</th></tr></thead><tbody>{totals.rows.map((row, i) => <tr key={row.id} className="border-b border-[#dde3de]"><td className="p-2 font-semibold">{row.description || `Item ${i + 1}`}</td><td className="p-2 text-right">{row.quantity}</td><td className="p-2 text-right">{formatPrice(row.price)}</td><td className="p-2 text-right">{row.gst}%</td><td className="p-2 text-right font-bold">{formatPrice(row.base)}</td></tr>)}</tbody></table>
            <div className="bill-mobile-items divide-y border-y">{totals.rows.map((row, i) => <div key={row.id} className="py-3 text-[10px]"><div className="flex justify-between gap-3"><b>{row.description || `Item ${i + 1}`}</b><b>{formatPrice(row.base)}</b></div><p className="mt-1 text-[#68776e]">{row.quantity} × {formatPrice(row.price)} · GST {row.gst}%</p></div>)}</div>
          </div>
          <div className="bill-totals ml-auto max-w-[290px] text-xs">{[['Subtotal', totals.subtotal], ['Discount', -totals.discount], ['Taxable amount', totals.taxable], ['CGST', totals.cgst], ['SGST', totals.sgst]].map(([name, value]) => <div key={name} className="flex justify-between border-b py-2"><span>{name}</span><b>{value < 0 ? `−${formatPrice(-value)}` : formatPrice(value)}</b></div>)}<div className="mt-2 flex justify-between border-y-2 border-[#123e2d] bg-[#edf5cf] p-3"><b>GRAND TOTAL</b><strong className="text-base">{formatPrice(totals.total)}</strong></div></div>
          <p className="bill-words mt-4 border-l-2 border-[#c39129] pl-3 text-[10px]"><b className="block uppercase tracking-wider text-[#718078]">Amount in words</b>{amountInWords(totals.total)}</p>
          {bill.notes && <div className="bill-notes mt-5 rounded bg-[#f0f4f1] p-3 text-[10px]"><b>NOTES:</b> {bill.notes}</div>}
          <footer className="bill-footer mt-10 flex items-end justify-between gap-4 border-t border-dashed pt-5 text-[9px] text-[#66736c]"><div><strong className="block text-xs text-[#173b2b]">Thank you for your business.</strong><span>Goods are subject to GrowNest sales policy.</span></div><div className="w-28 border-t border-[#68756d] pt-1 text-center uppercase">Authorised signatory</div></footer>
        </article>
      </div>
    </div>
  </div>
}
