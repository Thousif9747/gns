import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import { ToastProvider } from './context/ToastContext'
import MainLayout from './components/layout/MainLayout'
import AdminLayout from './components/layout/AdminLayout'
import DeliveryLayout from './components/layout/DeliveryLayout'
import Spinner from './components/ui/Spinner'
import Login from './pages/Login'
import TermsOfService from './pages/TermsOfService'
import PrivacyPolicy from './pages/PrivacyPolicy'
import Home from './pages/customer/Home'
import About from './pages/customer/About'
import Contact from './pages/customer/Contact'
import ProductListing from './pages/customer/ProductListing'
import ProductDetails from './pages/customer/ProductDetails'
import Cart from './pages/customer/Cart'
import Checkout from './pages/customer/Checkout'
import Offers from './pages/customer/Offers'
import MyOrders from './pages/customer/MyOrders'
import OrderTracking from './pages/customer/OrderTracking'
import Profile from './pages/customer/Profile'
import ForgotPassword from './pages/auth/ForgotPassword'
import VerifyEmail from './pages/auth/VerifyEmail'
import Dashboard from './pages/admin/Dashboard'
import CategoriesManagement from './pages/admin/CategoriesManagement'
import OrdersManagement from './pages/admin/OrdersManagement'
import ProductsManagement from './pages/admin/ProductsManagement'
import InventoryManagement from './pages/admin/InventoryManagement'
import UsersManagement from './pages/admin/UsersManagement'
import OffersManagement from './pages/admin/OffersManagement'
import OfferFormPage from './pages/admin/OfferFormPage'
import PaymentSettings from './pages/admin/PaymentSettings'
import DeliveryDashboard from './pages/delivery/DeliveryDashboard'
import DeliveryOrderDetail from './pages/delivery/DeliveryOrderDetail'
import DeliveryHistory from './pages/delivery/DeliveryHistory'
import DeliveryPartnerTracking from './pages/admin/DeliveryPartnerTracking'
import ProductCreatePage from './pages/admin/ProductCreatePage'
import ProductEditPage from './pages/admin/ProductEditPage'
import ReturnManagement from './pages/admin/ReturnManagement'
import AdvertisementsManagement from './pages/admin/AdvertisementsManagement'
import BillGenerator from './pages/admin/BillGenerator'

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>
  if (!user) {
    sessionStorage.setItem('redirect_after_login', location.pathname)
    return <Navigate to="/login" replace />
  }
  if (adminOnly && user.role !== 'ADM') return <Navigate to="/" replace />
  return children
}

// Prevents admins / delivery partners from landing on customer pages via back-nav
function CustomerRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>
  if (user?.role === 'ADM') return <Navigate to="/admin" replace />
  if (user?.role === 'DLV') return <Navigate to="/delivery" replace />
  return children
}

function RoleRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'ADM') return <Navigate to="/admin" replace />
  if (user.role === 'DLV') return <Navigate to="/delivery" replace />
  return <Navigate to="/" replace />
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

function AppRoutes() {
  return (
    <>
      <ScrollToTop />
      <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<CustomerRoute><MainLayout /></CustomerRoute>}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/products" element={<ProductListing />} />
        <Route path="/products/:slug" element={<ProductDetails />} />
        <Route path="/offers" element={<Offers />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/orders" element={<ProtectedRoute><MyOrders /></ProtectedRoute>} />
        <Route path="/orders/:id" element={<ProtectedRoute><OrderTracking /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      </Route>
      <Route path="/admin" element={<ProtectedRoute adminOnly><AdminLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="categories" element={<CategoriesManagement />} />
        <Route path="orders" element={<OrdersManagement />} />
        <Route path="products" element={<ProductsManagement />} />
        <Route path="products/new" element={<ProductCreatePage />} />
        <Route path="products/:slug/edit" element={<ProductEditPage />} />
        <Route path="inventory" element={<InventoryManagement />} />
        <Route path="users" element={<UsersManagement />} />
        <Route path="offers" element={<OffersManagement />} />
        <Route path="offers/new" element={<OfferFormPage />} />
        <Route path="offers/:id/edit" element={<OfferFormPage />} />
        <Route path="payment-settings" element={<PaymentSettings />} />
        <Route path="delivery-partners" element={<DeliveryPartnerTracking />} />
        <Route path="returns" element={<ReturnManagement />} />
        <Route path="advertisements" element={<AdvertisementsManagement />} />
        <Route path="bill-generator" element={<BillGenerator />} />
      </Route>
      <Route path="/delivery" element={<ProtectedRoute><DeliveryLayout /></ProtectedRoute>}>
        <Route index element={<DeliveryDashboard />} />
        <Route path="orders/:id" element={<DeliveryOrderDetail />} />
        <Route path="history" element={<DeliveryHistory />} />
      </Route>
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="*" element={<RoleRedirect />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </CartProvider>
    </AuthProvider>
  )
}
