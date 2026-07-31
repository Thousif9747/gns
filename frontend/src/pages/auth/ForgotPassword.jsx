import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

export default function ForgotPassword() {
  const { sendOtp, sendOtpToPhone, verifyOtp, setPassword } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [channel, setChannel] = useState('email')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPasswordVal] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [testOtp, setTestOtp] = useState('')

  const identifier = channel === 'email' ? email : phone

  async function handleSendOtp(e) {
    e.preventDefault()
    setError('')
    if (channel === 'email' && !email) { setError('Please enter your email'); return }
    if (channel === 'phone' && !phone) { setError('Please enter your phone number'); return }
    setLoading(true)
    try {
      if (channel === 'phone') {
        const result = await sendOtpToPhone(phone, 'reset_password')
        setTestOtp(result.test_otp || '')
        setSuccess('OTP sent to your phone! Check your console (dev mode).')
      } else {
        const result = await sendOtp(email, 'reset_password')
        setTestOtp(result.test_otp || '')
        setSuccess('OTP sent to your email! Check your console (dev mode).')
      }
      setStep(2)
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  async function handleVerifyOtp(e) {
    e.preventDefault()
    setError('')
    if (!otp || otp.length !== 6) { setError('Please enter the 6-digit OTP'); return }
    setLoading(true)
    try {
      if (channel === 'phone') {
        await verifyOtp('', otp, 'reset_password', phone)
        // verifyOtp uses positional args: (email, otp, purpose, phone)
      } else {
        await verifyOtp(email, otp, 'reset_password')
      }
      setSuccess('OTP verified! Now set a new password.')
      setStep(3)
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  async function handleResetPassword(e) {
    e.preventDefault()
    setError('')
    if (!password) { setError('Please enter a new password'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirmPassword) { setError('Passwords do not match'); return }
    setLoading(true)
    try {
      if (channel === 'phone') {
        await setPassword('', otp, password, confirmPassword, phone)
      } else {
        await setPassword(email, otp, password, confirmPassword)
      }
      setSuccess('Password reset successful! Redirecting to login...')
      setTimeout(() => navigate('/login', { state: { message: 'Password reset successful! Please login.' } }), 1500)
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div className="ops-route auth-page min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_top_right,rgba(58,125,68,0.08),transparent_30%),linear-gradient(180deg,#faf8f2_0%,#f7f2e7_100%)] p-4" data-page="forgot-password">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl font-bold text-eco-800">GNS</h1>
          <p className="text-gray-500 mt-1">Reset your password</p>
        </div>

        <Card className="!p-6">
          <div className="flex items-center justify-center gap-2 mb-6">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  step >= s ? 'bg-primary-500 text-white' : 'bg-beige-200 text-gray-400'
                }`}>
                  {s}
                </div>
                {s < 3 && <div className={`w-8 h-0.5 ${step > s ? 'bg-primary-400' : 'bg-beige-200'}`} />}
              </div>
            ))}
          </div>

          {error && (
            <div className="text-sm p-3 rounded-lg mb-4 bg-red-50 text-red-600">{error}</div>
          )}
          {success && (
            <div className="text-sm p-3 rounded-lg mb-4 bg-green-50 text-green-700">{success}</div>
          )}
          {testOtp && step === 2 && (
            <div className="text-sm font-bold p-3 rounded-lg mb-4 border border-amber-300 bg-amber-50 text-center text-amber-900" role="status">
              Local test mode · OTP: <span className="ml-1 text-xl tracking-[.18em]">{testOtp}</span>
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <p className="text-sm text-gray-600 mb-2">Enter your email or phone to receive a verification code.</p>

              {/* Channel toggle */}
              <div className="flex rounded-xl border border-beige-200 bg-white/80 p-0.5">
                <button
                  type="button"
                  onClick={() => setChannel('email')}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                    channel === 'email'
                      ? 'bg-gradient-to-r from-eco-500 to-eco-700 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  📧 Email
                </button>
                <button
                  type="button"
                  onClick={() => setChannel('phone')}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                    channel === 'phone'
                      ? 'bg-gradient-to-r from-eco-500 to-eco-700 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  📱 SMS
                </button>
              </div>

              {channel === 'email' ? (
                <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
              ) : (
                <Input label="Phone Number" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 9876543210" />
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending...' : 'Send OTP'}
              </Button>
              <div className="text-center">
                <Link to="/login" className="text-sm text-primary-600 hover:text-primary-700 hover:underline">
                  Back to login
                </Link>
              </div>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <p className="text-sm text-gray-600 mb-2">
                Enter the 6-digit code sent{channel === 'email' ? ' to ' : ' via SMS to '}
                <strong>{identifier}</strong>
              </p>
              <Input label="OTP Code" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" maxLength={6} />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Verifying...' : 'Verify OTP'}
              </Button>
              <button
                type="button"
                onClick={handleSendOtp}
                className="w-full text-sm text-primary-600 hover:text-primary-700 hover:underline text-center"
                disabled={loading}
              >
                Didn't receive it? Send again
              </button>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <p className="text-sm text-gray-600 mb-2">Create a new password for your account.</p>
              <Input label="New Password" type="password" value={password} onChange={e => setPasswordVal(e.target.value)} placeholder="Min. 8 characters" />
              <Input label="Confirm Password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter new password" />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </form>
          )}
        </Card>
      </motion.div>
    </div>
  )
}
