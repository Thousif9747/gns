import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { post } from '../../api/client'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

export default function VerifyEmail() {
  const { user, sendOtp, verifyOtp, completeRegistration, sendOtpToPhone, verifyPhoneOtp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  // Accept email from route state (passed after registration) or from logged-in user
  const emailFromState = location.state?.email
  const isRegistrationFlow = !!emailFromState

  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [testOtp, setTestOtp] = useState(location.state?.testOtp || '')

  // Resolve the email to use
  const targetEmail = user?.email || emailFromState

  useEffect(() => {
    if (user?.email_verified) {
      navigate('/', { replace: true })
    }
  }, [user, navigate])

  // Auto-send OTP on mount for both logged-in users and fresh registrations
  useEffect(() => {
    if (targetEmail && !otpSent && !user?.email_verified) {
      handleSendOtp()
    }
  }, [targetEmail])

  async function handleSendOtp() {
    if (!targetEmail) return
    setError('')
    setLoading(true)
    try {
      const res = await post('/auth/send-otp/', { email: targetEmail, purpose: 'verify_email' })
      if (!res.ok) {
        const m = Object.values(res.data).flat().join(', ')
        throw new Error(m || 'Failed to send OTP')
      }
      setOtpSent(true)
      setTestOtp(res.data?.test_otp || '')
      setSuccess('Verification code sent to your email! Check console (dev mode).')
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  async function handleVerify(e) {
    e.preventDefault()
    setError('')
    if (!otp || otp.length !== 6) { setError('Please enter the 6-digit OTP'); return }
    setLoading(true)
    try {
      if (isRegistrationFlow) {
        // New registration flow: complete registration (creates user with email_verified=True)
        await completeRegistration(targetEmail, otp)
      } else {
        // Existing user verifying their email
        await verifyOtp(targetEmail, otp, 'verify_email')
        if (user) {
          const currentUser = user
          currentUser.email_verified = true
        }
      }
      setSuccess('Email verified successfully!')
      setTimeout(() => {
        if (isRegistrationFlow) {
          // Came from registration — user now exists, redirect to login
          navigate('/login', { state: { message: 'Registration complete! Please login.' } })
        } else {
          navigate('/', { replace: true })
        }
      }, 1500)
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  if (!targetEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_top_right,rgba(58,125,68,0.08),transparent_30%),linear-gradient(180deg,#faf8f2_0%,#f7f2e7_100%)] p-4">
        <Card className="!p-6 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-beige-100 flex items-center justify-center mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <p className="text-gray-600 mb-4">No email provided. Please register or login first.</p>
          <Button onClick={() => navigate('/login')}>Go to Login</Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="ops-route auth-page min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_top_right,rgba(58,125,68,0.08),transparent_30%),linear-gradient(180deg,#faf8f2_0%,#f7f2e7_100%)] p-4" data-page="verify-email">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary-100 flex items-center justify-center mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary-600">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <h1 className="font-display text-3xl font-bold text-eco-800">Verify Your Email</h1>
          <p className="text-gray-500 mt-2">We sent a code to <strong>{targetEmail}</strong></p>
        </div>

        <Card className="!p-6">
          {error && (
            <div className="text-sm p-3 rounded-lg mb-4 bg-red-50 text-red-600">{error}</div>
          )}
          {success && (
            <div className="text-sm p-3 rounded-lg mb-4 bg-green-50 text-green-700">{success}</div>
          )}
          {testOtp && (
            <div className="text-sm font-bold p-3 rounded-lg mb-4 border border-amber-300 bg-amber-50 text-center text-amber-900" role="status">
              Local test mode · OTP: <span className="ml-1 text-xl tracking-[.18em]">{testOtp}</span>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-4">
            <Input
              label="Verification Code"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify Email'}
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
        </Card>
      </motion.div>
    </div>
  )
}
