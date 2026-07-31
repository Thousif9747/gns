import { motion } from 'framer-motion'

export default function Card({
  children,
  className = '',
  hover = false,
  glow = false,
  variant = 'default',
  ...props
}) {
  const base = `
    relative rounded-2xl border shadow-card bg-white
    ${variant === 'eco' ? 'border-eco-100 bg-gradient-to-br from-white to-eco-50/40' : 'border-beige-200/80'}
    ${variant === 'dark' ? 'bg-eco-900 border-eco-700 text-white' : ''}
    ${glow ? 'hover:shadow-[0_0_30px_rgba(58,125,68,0.15)]' : ''}
  `

  if (hover) {
    return (
      <motion.div
        whileHover={{ y: -3, boxShadow: glow
          ? '0 20px 40px rgba(58,125,68,0.14), 0 0 0 1px rgba(58,125,68,0.06)'
          : '0 16px 32px rgba(0,0,0,0.09), 0 4px 8px rgba(0,0,0,0.04)'
        }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className={`${base} ${className}`}
        {...props}
      >
        {children}
      </motion.div>
    )
  }

  return (
    <div className={`${base} ${className}`} {...props}>
      {children}
    </div>
  )
}
