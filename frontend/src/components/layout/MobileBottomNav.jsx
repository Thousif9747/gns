import { useState, useRef, useEffect } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { NAV_LINKS } from '../../utils/constants'

const BOTTOM_TABS = [
  {
    to: '/',
    label: 'Home',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
        <path d="M9 21V12h6v9" />
      </svg>
    ),
  },
  {
    to: '/products',
    label: 'Products',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 2} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    to: '/orders',
    label: 'Orders',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="8" y1="13" x2="16" y2="13" />
        <line x1="8" y1="17" x2="16" y2="17" />
      </svg>
    ),
  },
]

const MORE_LINKS = NAV_LINKS.filter(
  link => !['/', '/products', '/orders', '/cart'].includes(link.path)
)

const itemVariants = {
  hidden: { x: -16, opacity: 0 },
  visible: (i) => ({
    x: 0, opacity: 1,
    transition: { delay: i * 0.04, duration: 0.2 },
  }),
}

export default function MobileBottomNav() {
  const [moreOpen, setMoreOpen] = useState(false)
  const { user } = useAuth()
  const location = useLocation()
  const sheetRef = useRef(null)

  useEffect(() => {
    setMoreOpen(false)
  }, [location.pathname])

  useEffect(() => {
    function handleClick(e) {
      if (sheetRef.current && !sheetRef.current.contains(e.target)) {
        setMoreOpen(false)
      }
    }
    if (moreOpen) {
      document.addEventListener('mousedown', handleClick)
    }
    return () => document.removeEventListener('mousedown', handleClick)
  }, [moreOpen])

  function isActive(path) {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-eco-100/80 shadow-[0_-4px_30px_rgba(0,0,0,0.06)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center justify-around h-16">
          {BOTTOM_TABS.map(tab => {
            const active = isActive(tab.to)
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                className="flex flex-col items-center justify-center gap-0.5 w-16 h-full relative"
              >
                <span className={`transition-colors duration-200 ${active ? 'text-primary-600' : 'text-gray-400'}`}>
                  {tab.icon(active)}
                </span>
                <span className={`text-[10px] font-semibold tracking-wide transition-colors duration-200 ${active ? 'text-primary-600' : 'text-gray-400'}`}>
                  {tab.label}
                </span>
                {active && (
                  <motion.div
                    layoutId="bottom-nav-active"
                    className="absolute top-0 w-8 h-0.5 rounded-full bg-gradient-to-r from-primary-500 to-eco-600"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
              </NavLink>
            )
          })}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 w-16 h-full relative"
          >
            <span className={`transition-colors duration-200 ${moreOpen ? 'text-primary-600' : 'text-gray-400'}`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="5" r="1" />
                <circle cx="12" cy="12" r="1" />
                <circle cx="12" cy="19" r="1" />
              </svg>
            </span>
            <span className={`text-[10px] font-semibold tracking-wide transition-colors duration-200 ${moreOpen ? 'text-primary-600' : 'text-gray-400'}`}>
              More
            </span>
          </button>
        </div>
      </nav>

      {/* More bottom sheet */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              key="more-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/30 z-50 md:hidden"
            />

            <motion.div
              key="more-sheet"
              ref={sheetRef}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-modal md:hidden"
              style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-gray-300" />
              </div>

              {/* Title */}
              <div className="px-6 pb-2">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">More</h3>
              </div>

              {/* Links */}
              <div className="px-3 pb-4 space-y-0.5">
                {MORE_LINKS.map((link, i) => {
                  const active = isActive(link.path)
                  return (
                    <motion.div
                      key={link.path}
                      custom={i}
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      <Link
                        to={link.path}
                        onClick={() => setMoreOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-medium transition-all ${
                          active
                            ? 'bg-primary-100/80 text-primary-700'
                            : 'text-gray-700 hover:bg-eco-50 hover:text-primary-600'
                        }`}
                      >
                        {link.label}
                      </Link>
                    </motion.div>
                  )
                })}
              </div>

              {!user && (
                <div className="px-3 pb-6">
                  <Link
                    to="/login"
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 text-sm font-semibold text-white bg-gradient-to-r from-eco-500 to-eco-700 rounded-full hover:from-eco-600 hover:to-eco-800 transition-all shadow-sm active:scale-95"
                  >
                    Login to Your Account
                  </Link>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
