import { useEffect, useState } from 'react'
import { NavLink, Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const sidebarLinks = [
  { to: '/delivery', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { to: '/delivery/history', label: 'History', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
]

export default function DeliveryLayout() {
  const { user, logout } = useAuth()
  const [mobileSidebar, setMobileSidebar] = useState(false)
  useEffect(() => {
    const close = event => event.key === 'Escape' && setMobileSidebar(false)
    document.addEventListener('keydown', close)
    return () => document.removeEventListener('keydown', close)
  }, [])
  if (!user || user.role !== 'DLV') return <Navigate to="/" replace />

  return (
    <div className="h-screen overflow-hidden bg-[#f5f7f5] flex">
      {mobileSidebar && <button className="fixed inset-0 z-40 bg-[#071b13]/55 lg:hidden" aria-label="Close navigation" onClick={() => setMobileSidebar(false)} />}
      <aside id="delivery-navigation" aria-label="Delivery navigation" className={`admin-sidebar fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 overflow-y-auto ${mobileSidebar ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:inset-auto`}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-beige-200/80">
          <span className="text-lg font-bold text-white">Grow Nest Delivery</span>
          <button className="lg:hidden p-1 text-gray-500 hover:text-eco-800" onClick={() => setMobileSidebar(false)}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="p-4 space-y-1">
          {sidebarLinks.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/delivery'}
              onClick={() => setMobileSidebar(false)}
              className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive ? 'bg-[#ddf54a] text-[#123e2d]' : 'text-white/70 hover:text-white hover:bg-white/10'
                }`
              }
            >
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={link.icon} />
              </svg>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-beige-200/80">
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-2xl text-sm font-medium text-gray-600 hover:text-eco-800 hover:bg-beige-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="sticky top-0 z-30 bg-white/95 h-16 flex items-center px-4 lg:px-6 border-b border-[#dce5de]">
          <button aria-expanded={mobileSidebar} aria-controls="delivery-navigation" aria-label="Open delivery navigation" className="lg:hidden p-2 mr-3 text-gray-600 hover:text-eco-800" onClick={() => setMobileSidebar(true)}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-3 ml-auto">
            <span className="text-sm text-eco-800">{user.full_name || user.email}</span>
            <span className="bg-emerald-100 text-emerald-700 text-xs font-medium px-2 py-0.5 rounded-full border border-emerald-200">Delivery</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
