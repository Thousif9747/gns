import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { get, extractList } from '../../api/client'
import NotificationBell from '../notifications/NotificationBell'
import WeatherChip from './WeatherChip'

export default function Navbar() {
  const { user, logout } = useAuth()
  const { totalItems } = useCart()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [accountOpen, setAccountOpen] = useState(false)
  const [announcements, setAnnouncements] = useState([])
  const timer = useRef()
  const searchRef = useRef()
  const logo = '/icons/logo-192x192.png'

  useEffect(() => {
    const close = e => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSuggestions([])
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  useEffect(() => {
    get('/catalog/announcements/').then(res => {
      if (res.ok) setAnnouncements(extractList(res.data))
    }).catch(() => {})
  }, [])

  function changeSearch(e) {
    const value = e.target.value
    setQuery(value)
    clearTimeout(timer.current)
    if (value.trim().length < 2) return setSuggestions([])
    timer.current = setTimeout(async () => {
      const res = await get('/catalog/products/', { search: value.trim() })
      if (res.ok) setSuggestions(extractList(res.data).slice(0, 6))
    }, 250)
  }

  function submit(e) {
    e.preventDefault()
    if (!query.trim()) return
    navigate(`/products?search=${encodeURIComponent(query.trim())}`)
    setSuggestions([])
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[#dfe7e1] bg-white shadow-[0_2px_12px_rgba(20,60,40,.04)]">
      <div className="bg-[#176b45] text-white">
        <div className="mx-auto flex h-8 max-w-[1440px] items-center gap-4 overflow-hidden px-3 text-[11px] font-semibold tracking-wide sm:px-6">
          <span className="hidden shrink-0 font-black uppercase tracking-[.15em] text-[#ddf54a] sm:inline">Live store</span>
          <div className="relative min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
            <div className="gns-marquee flex w-max items-center gap-10 whitespace-nowrap motion-reduce:animate-none">
              {(announcements.length ? [...announcements, ...announcements] : [0, 1].map(index => ({ id: `default-${index}`, text: 'Eco essentials for every table · Bulk orders welcome · Reliable delivery across India' }))).map((item, index) => {
                const content = <span className="inline-flex items-center gap-3"><i className="h-1.5 w-1.5 rounded-full bg-[#ddf54a]" />{item.text}</span>
                return item.link_url ? <a key={`${item.id}-${index}`} href={item.link_url} className="hover:text-[#ddf54a]">{content}</a> : <span key={`${item.id}-${index}`}>{content}</span>
              })}
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto grid max-w-[1440px] grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-2 px-3 py-2.5 sm:px-6 lg:gap-6">
        <Link to="/" className="flex min-w-fit items-center" aria-label="GrowNest home">
          <img src={logo} alt="GrowNest" className="h-14 w-14 rounded-full bg-white object-contain sm:h-16 sm:w-16" />
        </Link>

        <div ref={searchRef} className="relative col-span-3 row-start-2 w-full sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:max-w-3xl">
          <form onSubmit={submit} className="relative">
            <svg className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#176b45]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
            <input value={query} onChange={changeSearch} aria-label="Search products" placeholder="Search plates, cups, glasses" className="h-11 w-full rounded-xl border border-[#dce6de] bg-[#f5f7f5] pl-11 pr-4 text-sm font-medium text-[#16231c] outline-none transition focus:border-[#176b45] focus:bg-white focus:ring-2 focus:ring-[#176b45]/15" />
          </form>
          {suggestions.length > 0 && (
            <div className="absolute inset-x-0 top-full mt-2 overflow-hidden rounded-xl border border-[#dfe8e1] bg-white shadow-xl">
              {suggestions.map(product => (
                <button key={product.id} onClick={() => { navigate(`/products/${product.slug}`); setSuggestions([]) }} className="flex w-full items-center gap-3 border-b border-[#eef2ef] px-3 py-2 text-left last:border-0 hover:bg-[#f4f8f5]">
                  <div className="h-10 w-10 overflow-hidden rounded-lg bg-[#eef4ef]">
                    {product.image_url ? <img src={product.image_url} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center font-bold text-[#176b45]">{product.name?.[0]}</span>}
                  </div>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{product.name}</span>
                  {product.base_price && <span className="text-sm font-extrabold text-[#176b45]">{'\u20B9'}{Number(product.base_price).toLocaleString('en-IN')}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="col-start-3 row-start-1 flex items-center gap-1 sm:gap-2">
          <WeatherChip />
          <div className="hidden lg:flex">
            <NavLink to="/products" className="header-link">Shop</NavLink>
            <NavLink to="/offers" className="header-link">Offers</NavLink>
          </div>
          {user ? <NotificationBell /> : null}
          <div className="relative hidden sm:block">
            {user ? (
              <>
                <button onClick={() => setAccountOpen(v => !v)} className="flex h-10 items-center gap-2 rounded-lg px-2 text-sm font-bold hover:bg-[#f3f7f4]"><span className="grid h-7 w-7 place-items-center rounded-full bg-[#dff0d5] text-[#176b45]">{user.full_name?.[0] || 'U'}</span><span className="hidden lg:inline">Account</span></button>
                {accountOpen && <div className="absolute right-0 mt-2 w-44 rounded-xl border bg-white p-1.5 shadow-xl"><Link to="/profile" className="block rounded-lg px-3 py-2 text-sm hover:bg-[#f3f7f4]">My profile</Link><Link to="/orders" className="block rounded-lg px-3 py-2 text-sm hover:bg-[#f3f7f4]">My orders</Link><button onClick={logout} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">Sign out</button></div>}
              </>
            ) : <Link to="/login" className="header-link">Login</Link>}
          </div>
          <Link to="/cart" className="relative flex h-10 items-center gap-2 rounded-lg bg-[#176b45] px-3 text-sm font-extrabold text-white hover:bg-[#115638]" aria-label={`Cart with ${totalItems} items`}>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 3h2l2 12h11l2-8H6"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></svg>
            <span className="hidden md:inline">Cart</span>
            {totalItems > 0 && <span className="grid min-w-5 place-items-center rounded bg-[#d9ef54] px-1 text-[11px] text-[#16231c]">{totalItems > 99 ? '99+' : totalItems}</span>}
          </Link>
        </div>
      </div>
    </header>
  )
}
