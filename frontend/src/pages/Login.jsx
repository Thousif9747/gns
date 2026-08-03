import { useState } from 'react'
import { useNavigate, useLocation, Link, Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
}

function EyeIcon({ open }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function PasswordInput({ id, name, value, onChange, placeholder, error, label }) {
  const [show, setShow] = useState(false)
  return (
    <div className="auth-field space-y-1.5">
      {label && <label htmlFor={id} className="auth-label">{label}</label>}
      <div className="relative">
        <input
          id={id}
          name={name}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`auth-input w-full px-4 py-3 pr-11 border text-sm transition-all duration-200 focus:outline-none ${
            error ? 'border-red-400 focus:ring-red-300 focus:border-red-400' : 'border-beige-300 hover:border-eco-200'
          }`}
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          aria-pressed={show}
          className="auth-password-toggle absolute right-1.5 top-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center text-gray-400 hover:text-eco-600 transition-colors"
        >
          <EyeIcon open={show} />
        </button>
      </div>
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  )
}

export default function Login() {
  const { login, register, completeRegistration, registerWithPhone, completeRegistrationViaPhone, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [tab, setTab] = useState('login')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(location.state?.message || '')
  const [loading, setLoading] = useState(false)

  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [loginIdentifier, setLoginIdentifier] = useState('')
  const [regForm, setRegForm] = useState({ email: '', full_name: '', phone: '', password: '', confirm_password: '' })
  const [errors, setErrors] = useState({})
  const [regStep, setRegStep] = useState('form')
  const [channel, setChannel] = useState('email')
  const [otp, setOtp] = useState('')
  const [testOtp, setTestOtp] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  function getHomeRoute(role) {
    if (role === 'ADM') return '/admin'
    if (role === 'DLV') return '/delivery'
    return '/'
  }

  if (user) {
    const redirectTo = sessionStorage.getItem('redirect_after_login')
    if (redirectTo) { sessionStorage.removeItem('redirect_after_login'); return <Navigate to={redirectTo} replace /> }
    return <Navigate to={getHomeRoute(user.role)} replace />
  }

  function handleLogin(e) {
    e.preventDefault()
    setError('')
    if (!loginIdentifier) { setError('Email or phone number is required'); return }
    if (!loginForm.password) { setError('Password is required'); return }
    const isEmail = loginIdentifier.includes('@')
    setLoading(true)
    login(isEmail ? loginIdentifier : null, loginForm.password, isEmail ? null : loginIdentifier)
      .then(d => {
        const redirectTo = sessionStorage.getItem('redirect_after_login')
        if (redirectTo) { sessionStorage.removeItem('redirect_after_login'); navigate(redirectTo, { replace: true }) }
        else navigate(getHomeRoute(d.user?.role), { replace: true })
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  async function handleSendOtp(e) {
    e.preventDefault()
    setError(''); setErrors({})
    const errs = {}
    if (!regForm.email) errs.email = 'Email is required'
    if (channel === 'phone' && !regForm.phone) errs.phone = 'Phone number is required for SMS verification'
    if (!regForm.full_name) errs.full_name = 'Full name is required'
    if (!regForm.password) errs.password = 'Password is required'
    if (regForm.password !== regForm.confirm_password) errs.confirm_password = 'Passwords do not match'
    if (!agreedToTerms) errs.agreedToTerms = 'You must agree to the Terms of Service and Privacy Policy'
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    const payload = { email: regForm.email, full_name: regForm.full_name, phone: regForm.phone, password: regForm.password, confirm_password: regForm.confirm_password, accepted_terms: true }
    try {
      if (channel === 'phone') {
        const result = await registerWithPhone({ ...payload })
        setTestOtp(result.test_otp || '')
      } else {
        const result = await register({ ...payload })
        setTestOtp(result.test_otp || '')
      }
      setRegStep('otp')
    } catch (err) { setError(err.message) }
    setLoading(false)
  }

  async function handleCompleteRegistration(e) {
    e.preventDefault()
    setError('')
    if (!otp || otp.length !== 6) { setError('Please enter the 6-digit OTP'); return }
    setLoading(true)
    try {
      if (channel === 'phone') {
        await completeRegistrationViaPhone(regForm.phone, otp)
      } else {
        await completeRegistration(regForm.email, otp)
      }
      setTab('login'); setError(''); setSuccess('Registration complete! Please log in.')
      setRegStep('form'); setOtp(''); setTestOtp(''); setChannel('email'); setAgreedToTerms(false)
      setRegForm({ email: '', full_name: '', phone: '', password: '', confirm_password: '' })
    } catch (err) { setError(err.message) }
    setLoading(false)
  }

  return (
    <div className="ops-route auth-page auth-studio min-h-screen" data-page="login">

      <aside className="auth-story">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="auth-story-content"
        >
          <Link to="/" className="auth-wordmark" aria-label="GrowNest Paper Products home">
            <img src="/icons/logo-192x192.png" alt="GrowNest Paper Products" className="h-20 w-20 rounded-full bg-white object-contain shadow-lg" />
          </Link>
          <p className="auth-kicker">GrowNest Supply Network</p>
          <h2 className="auth-story-title">
            Reliable paper supply,<br /><span>built for business.</span>
          </h2>
          <p className="auth-story-lede">
            Consistent quality, dependable stock and efficient dispatch for retail, wholesale and event requirements.
          </p>

          <div className="auth-values">
            {[
              ['01', 'Bulk-ready supply'],
              ['02', 'Dependable dispatch'],
              ['03', 'Responsible paper choices'],
            ].map(([number, label]) => (
              <span key={number} className="auth-value">
                <small>{number}</small>{label}
              </span>
            ))}
          </div>
          <p className="auth-story-foot">MANUFACTURING · DISTRIBUTION · INDIA</p>
        </motion.div>
      </aside>

      <main className="auth-form-side">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="auth-form-plane"
        >
          <div className="auth-mobile-brand">
            <Link to="/" className="auth-wordmark auth-wordmark-mobile" aria-label="GrowNest Paper Products home">
              <img src="/icons/logo-192x192.png" alt="GrowNest Paper Products" className="h-16 w-16 rounded-full bg-white object-contain shadow-md" />
            </Link>
          </div>

          <div className="auth-heading">
            <p className="auth-form-kicker">{tab === 'login' ? 'Member access' : regStep === 'otp' ? 'Final step' : 'Join GrowNest'}</p>
            <h1>
              {tab === 'login' ? 'Welcome back' : 'Create an account'}
            </h1>
            <p>
              {tab === 'login' ? 'Your next order is only a moment away.' : 'One account for simple, reliable ordering.'}
            </p>
          </div>

          <div className="auth-tabs" role="tablist" aria-label="Account access">
            {['login', 'register'].map(t => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => { setTab(t); setError(''); setErrors({}); setRegStep('form'); setOtp(''); setAgreedToTerms(false) }}
                className={tab === t ? 'active' : ''}
              >
                {t === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          {/* Alerts */}
          <AnimatePresence mode="wait">
            {success && (
              <motion.div key="success" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                role="status" aria-live="polite"
                className="auth-alert auth-alert-success"
              >
                <span aria-hidden="true" className="font-black">OK</span>
                {success}
              </motion.div>
            )}
            {error && (
              <motion.div key="error" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                role="alert" aria-live="assertive"
                className="auth-alert auth-alert-error"
              >
                <span aria-hidden="true" className="font-black">!</span>
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Forms */}
          <AnimatePresence mode="wait">
            {tab === 'login' ? (
              <motion.form
                key="login"
                variants={stagger} initial="hidden" animate="show"
                onSubmit={handleLogin}
                className="space-y-4"
              >
                <motion.div variants={fadeUp}>
                  <Input label="Email or Phone number" name="login-identifier" type="text" value={loginIdentifier}
                    onChange={e => setLoginIdentifier(e.target.value)} placeholder="you@example.com / +91 98765 43210"
                  />
                </motion.div>

                <motion.div variants={fadeUp}>
                  <PasswordInput
                    id="login-password" name="password" label="Password"
                    value={loginForm.password}
                    onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                    placeholder="Enter your password"
                  />
                </motion.div>

                <motion.div variants={fadeUp} className="flex justify-end">
                  <Link to="/forgot-password" className="text-sm text-eco-600 hover:text-eco-700 font-medium hover:underline">
                    Forgot password?
                  </Link>
                </motion.div>

                <motion.div variants={fadeUp}>
                  <Button type="submit" className="w-full !py-3 !text-base" loading={loading}>
                    {loading ? 'Signing in' : 'Sign In'}
                  </Button>
                </motion.div>

                <motion.div variants={fadeUp} className="text-center text-sm text-gray-500">
                  Don&apos;t have an account?{' '}
                  <button type="button" onClick={() => { setTab('register'); setError('') }} className="text-eco-600 font-semibold hover:text-eco-700">
                    Register here
                  </button>
                </motion.div>
              </motion.form>

            ) : regStep === 'form' ? (
              <motion.form
                key="register"
                variants={stagger} initial="hidden" animate="show"
                onSubmit={handleSendOtp}
                className="space-y-4"
              >
                <motion.div variants={fadeUp}>
                  <Input label="Full Name" name="full_name" value={regForm.full_name}
                    onChange={e => setRegForm({ ...regForm, full_name: e.target.value })}
                    error={errors.full_name} placeholder="John Doe"
                  />
                </motion.div>
                <motion.div variants={fadeUp}>
                  <Input label="Email address" name="email" type="email" value={regForm.email}
                    onChange={e => setRegForm({ ...regForm, email: e.target.value })}
                    error={errors.email} placeholder="you@example.com"
                  />
                </motion.div>
                <motion.div variants={fadeUp}>
                  <Input label={channel === 'phone' ? 'Phone number' : 'Phone (optional)'} name="phone" type="tel" value={regForm.phone}
                    onChange={e => setRegForm({ ...regForm, phone: e.target.value })} error={errors.phone} placeholder="+91 98765 43210"
                  />
                </motion.div>

                {/* Channel toggle */}
                <motion.div variants={fadeUp}>
                  <label className="block text-sm font-medium text-eco-800 mb-2">Verify via</label>
                  <div className="auth-channel-toggle">
                    <button
                      type="button"
                      onClick={() => setChannel('email')}
                      aria-pressed={channel === 'email'}
                      className={channel === 'email' ? 'active' : ''}
                    >
                      Email
                    </button>
                    <button
                      type="button"
                      onClick={() => setChannel('phone')}
                      aria-pressed={channel === 'phone'}
                      className={channel === 'phone' ? 'active' : ''}
                    >
                      SMS
                    </button>
                  </div>
                </motion.div>

                <motion.div variants={fadeUp}>
                  <PasswordInput id="reg-pass" name="password" label="Password"
                    value={regForm.password}
                    onChange={e => setRegForm({ ...regForm, password: e.target.value })}
                    error={errors.password} placeholder="Minimum 8 characters"
                  />
                </motion.div>
                <motion.div variants={fadeUp}>
                  <PasswordInput id="reg-confirm" name="confirm_password" label="Confirm Password"
                    value={regForm.confirm_password}
                    onChange={e => setRegForm({ ...regForm, confirm_password: e.target.value })}
                    error={errors.confirm_password} placeholder="Repeat your password"
                  />
                </motion.div>

                <motion.div variants={fadeUp}>
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={e => { setAgreedToTerms(e.target.checked); setErrors(prev => ({ ...prev, agreedToTerms: '' })) }}
                      className="mt-0.5 h-4 w-4 rounded border-beige-300 text-eco-600 focus:ring-eco-400 focus:ring-offset-0 cursor-pointer"
                    />
                    <span className="text-sm text-gray-500 group-hover:text-gray-700 transition-colors select-none">
                      I agree to the{' '}
                      <Link to="/terms" target="_blank" rel="noopener noreferrer" className="text-eco-600 font-medium hover:text-eco-700 hover:underline cursor-pointer">
                        Terms of Service
                      </Link>
                      {' '}and{' '}
                      <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="text-eco-600 font-medium hover:text-eco-700 hover:underline cursor-pointer">
                        Privacy Policy
                      </Link>
                    </span>
                  </label>
                  {errors.agreedToTerms && <p className="text-xs text-red-500 mt-1 ml-7">{errors.agreedToTerms}</p>}
                </motion.div>

                <motion.div variants={fadeUp}>
                  <Button type="submit" className="w-full !py-3 !text-base" loading={loading}>
                    {loading ? 'Sending OTP' : `Send OTP via ${channel === 'email' ? 'Email' : 'SMS'}`}
                  </Button>
                </motion.div>
              </motion.form>

            ) : (
              <motion.div
                key="otp"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-5"
              >
                <div className="auth-otp-heading text-center py-4">
                  <div className="auth-otp-badge">
                    {channel === 'email' ? 'EMAIL' : 'SMS'}
                  </div>
                  <h3 className="font-semibold text-eco-900 text-lg">
                    {channel === 'email' ? 'Check your email' : 'Check your phone'}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    We sent a 6-digit code to{' '}
                    <strong className="text-eco-700">
                      {channel === 'email' ? regForm.email : regForm.phone}
                    </strong>
                  </p>
                </div>

                <form onSubmit={handleCompleteRegistration} className="space-y-4">
                  {testOtp && (
                    <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-center text-sm font-bold text-amber-900" role="status">
                      Local test mode · OTP: <span className="ml-1 text-xl tracking-[.18em]">{testOtp}</span>
                    </div>
                  )}
                  <div>
                    <label htmlFor="registration-otp" className="auth-label mb-1.5">OTP Code</label>
                    <input
                      id="registration-otp"
                      type="text"
                      inputMode="numeric"
                      value={otp}
                      onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      maxLength={6}
                      className="auth-input auth-otp-input w-full px-4 py-3 border bg-white text-center text-2xl font-bold tracking-[0.5em] text-eco-900 focus:outline-none transition-all"
                    />
                  </div>
                  <Button type="submit" className="w-full !py-3 !text-base" loading={loading}>
                    {loading ? 'Verifying' : 'Complete Registration'}
                  </Button>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="w-full text-sm text-eco-600 hover:text-eco-700 font-medium hover:underline text-center"
                    disabled={loading}
                  >
                    Didn&apos;t receive it? Resend OTP
                  </button>
                  <button
                    type="button"
                    onClick={() => { setChannel(channel === 'email' ? 'phone' : 'email'); setRegStep('form'); setOtp(''); setError('') }}
                    className="w-full text-xs text-gray-400 hover:text-gray-600 text-center"
                    disabled={loading}
                  >
                    Switch to {channel === 'email' ? 'SMS' : 'Email'} verification
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="auth-legal">
            By continuing, you agree to Grow Nest&apos;s{' '}
            <Link to="/terms" className="text-eco-600 hover:text-eco-700 hover:underline font-medium">Terms of Service</Link>
            {' '}and{' '}
            <Link to="/privacy" className="text-eco-600 hover:text-eco-700 hover:underline font-medium">Privacy Policy</Link>.
          </p>
        </motion.div>
      </main>
    </div>
  )
}
