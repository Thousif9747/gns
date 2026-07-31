export default function Badge({ children, className = '', variant = 'eco', dot = false }) {
  const variants = {
    eco: 'bg-eco-100/80 text-eco-700 border border-eco-200/60',
    gold: 'bg-gradient-to-r from-gold-100 to-gold-200 text-gold-800 border border-gold-200',
    neutral: 'bg-beige-100 text-gray-600 border border-beige-200',
    success: 'bg-green-100 text-green-700 border border-green-200',
    danger: 'bg-red-100 text-red-700 border border-red-200',
    dark: 'bg-eco-900 text-white border-0',
    primary: 'bg-gradient-to-r from-eco-500 to-eco-700 text-white border-0 shadow-sm',
  }

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${variants[variant] || variants.eco} ${className}`}>
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${
          variant === 'danger' ? 'bg-red-500' :
          variant === 'success' ? 'bg-green-500' :
          variant === 'gold' ? 'bg-gold-500' :
          'bg-eco-500'
        }`} />
      )}
      {children}
    </span>
  )
}
