import { motion } from 'framer-motion'

const variants = {
  primary: 'relative overflow-hidden bg-eco-500 text-white hover:bg-eco-600 shadow-sm',
  secondary: 'bg-gold-500 text-eco-900 hover:bg-gold-400 shadow-sm',
  outline: 'border-2 border-eco-500 text-eco-700 hover:bg-eco-50 hover:border-eco-600',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
  ghost: 'text-eco-700 hover:bg-eco-50 hover:text-eco-800',
  white: 'bg-white text-eco-800 hover:bg-eco-50 shadow-sm border border-eco-100',
}

const sizes = {
  xs: 'px-3 py-1.5 text-xs gap-1',
  sm: 'px-4 py-2 text-sm gap-1.5',
  md: 'px-6 py-2.5 text-sm gap-2',
  lg: 'px-8 py-3.5 text-base gap-2',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  loading = false,
  leftIcon = null,
  rightIcon = null,
  ...props
}) {
  return (
    <motion.button
      whileTap={disabled || loading ? {} : { scale: 0.97 }}
      whileHover={disabled || loading ? {} : { scale: 1.02 }}
      className={`
        inline-flex items-center justify-center font-semibold rounded-xl
        transition-all duration-250
        focus:outline-none focus:ring-2 focus:ring-eco-400 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <svg className="animate-spin w-4 h-4 opacity-80" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <span>Loading…</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
        </>
      )}
    </motion.button>
  )
}
