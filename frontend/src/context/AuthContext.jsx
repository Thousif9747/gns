import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { get, post } from '../api/client'
import { requestFcmToken } from '../utils/firebase'

const AuthContext = createContext(null)

async function registerFcmToken() {
  try {
    const token = await requestFcmToken()
    if (token) {
      await post('/auth/update-fcm-token/', { token, device_type: 'web' })
    }
  } catch {
    // FCM registration failure should never block login
  }
}

async function removeFcmToken() {
  try {
    await post('/auth/remove-fcm-token/', {})
  } catch {
    // Best effort
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async () => {
    const res = await get('/auth/profile/')
    if (res.ok) {
      setUser(res.data)
      // Register FCM token when profile loads (user already logged in)
      registerFcmToken()
    } else {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    const t = localStorage.getItem('access_token')
    if (t) fetchProfile()
    else setLoading(false)
  }, [fetchProfile])

  async function login(email, password, phone = null) {
    const payload = phone ? { phone, password } : { email, password }
    const res = await post('/auth/login/', payload)
    if (!res.ok) {
      if (res.status === 429) {
        throw new Error('Too many login attempts. Please try again later.')
      }
      throw new Error(
        res.data?.non_field_errors?.[0]
        || res.data?.detail
        || res.data?.email?.[0]
        || res.data?.phone?.[0]
        || 'Login failed'
      )
    }
    localStorage.setItem('access_token', res.data.access)
    localStorage.setItem('refresh_token', res.data.refresh)
    setUser(res.data.user)
    // Register for push notifications after login
    registerFcmToken()
    return res.data
  }

  function establishSession(session) {
    if (!session?.access || !session?.refresh || !session?.user) return
    localStorage.setItem('access_token', session.access)
    localStorage.setItem('refresh_token', session.refresh)
    setUser(session.user)
  }

  async function register(data) {
    const res = await post('/auth/register/', data)
    if (!res.ok) {
      if (res.status === 429) {
        throw new Error('Too many registration attempts. Please try again later.')
      }
      const m = Object.values(res.data).flat().join(', ')
      throw new Error(m || 'Registration failed')
    }
    return res.data
  }

  function logout() {
    const refresh = localStorage.getItem('refresh_token')
    // Start best-effort server cleanup while the access token is still available,
    // but never make the user wait for network calls before signing out locally.
    void Promise.allSettled([
      removeFcmToken(),
      refresh ? post('/auth/logout/', { refresh }) : Promise.resolve(),
    ])
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    sessionStorage.removeItem('redirect_after_login')
    setUser(null)
    window.location.replace('/login')
  }

  async function sendOtp(email, purpose) {
    const res = await post('/auth/send-otp/', { email, purpose })
    if (!res.ok) {
      if (res.status === 429) {
        throw new Error('Too many OTP requests. Please try again later.')
      }
      const m = Object.values(res.data).flat().join(', ')
      throw new Error(m || 'Failed to send OTP')
    }
    return res.data
  }

  async function verifyOtp(email, otp, purpose, phone=null) {
    const data = { email, otp, purpose }
    if (phone) data.phone = phone
    const res = await post('/auth/verify-otp/', data)
    if (!res.ok) {
      const m = Object.values(res.data).flat().join(', ')
      throw new Error(m || 'OTP verification failed')
    }
    if (purpose === 'verify_email' && res.data.email_verified) {
      setUser(prev => prev ? { ...prev, email_verified: true } : prev)
    }
    if (purpose === 'verify_phone' && res.data.phone_verified) {
      setUser(prev => prev ? { ...prev, phone_verified: true } : prev)
    }
    return res.data
  }

  async function setPassword(email, otp, newPassword, confirmPassword, phone=null) {
    const data = {
      email, otp, new_password: newPassword, confirm_password: confirmPassword,
    }
    if (phone) data.phone = phone
    const res = await post('/auth/set-password/', data)
    if (!res.ok) {
      const m = Object.values(res.data).flat().join(', ')
      throw new Error(m || 'Failed to set password')
    }
    return res.data
  }

  async function completeRegistration(email, otp) {
    const res = await post('/auth/complete-registration/', { email, otp })
    if (!res.ok) {
      const m = Object.values(res.data).flat().join(', ')
      throw new Error(m || 'Registration failed')
    }
    return res.data
  }

  async function registerWithPhone(data) {
    const res = await post('/auth/register/', { ...data, channel: 'phone' })
    if (!res.ok) {
      if (res.status === 429) {
        throw new Error('Too many registration attempts. Please try again later.')
      }
      const m = Object.values(res.data).flat().join(', ')
      throw new Error(m || 'Registration failed')
    }
    return res.data
  }

  async function completeRegistrationViaPhone(phone, otp) {
    const res = await post('/auth/complete-registration/', { phone, otp })
    if (!res.ok) {
      const m = Object.values(res.data).flat().join(', ')
      throw new Error(m || 'Registration failed')
    }
    return res.data
  }

  async function sendOtpToPhone(phone, purpose) {
    const res = await post('/auth/send-otp/', { phone, purpose, channel: 'phone' })
    if (!res.ok) {
      if (res.status === 429) {
        throw new Error('Too many OTP requests. Please try again later.')
      }
      const m = Object.values(res.data).flat().join(', ')
      throw new Error(m || 'Failed to send OTP')
    }
    return res.data
  }

  async function verifyPhoneOtp(phone, otp, purpose) {
    const res = await post('/auth/verify-otp/', { phone, otp, purpose })
    if (!res.ok) {
      const m = Object.values(res.data).flat().join(', ')
      throw new Error(m || 'OTP verification failed')
    }
    if (purpose === 'verify_phone' && res.data.phone_verified) {
      setUser(prev => prev ? { ...prev, phone_verified: true } : prev)
    }
    return res.data
  }

  async function updatePhone(phone, otp) {
    const res = await post('/auth/update-phone/', { phone, otp })
    if (!res.ok) {
      const m = Object.values(res.data).flat().join(', ')
      throw new Error(m || 'Failed to update phone')
    }
    setUser(prev => prev ? { ...prev, phone, phone_verified: true } : prev)
    return res.data
  }

  return (
    <AuthContext.Provider value={{
      user, loading, login, establishSession, register, logout, fetchProfile,
      sendOtp, verifyOtp, setPassword, completeRegistration,
      registerWithPhone, completeRegistrationViaPhone,
      sendOtpToPhone, verifyPhoneOtp, updatePhone,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const c = useContext(AuthContext)
  if (!c) throw new Error('useAuth must be used within AuthProvider')
  return c
}
