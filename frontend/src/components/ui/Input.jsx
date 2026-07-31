export default function Input({ label, name, error, ...props }) {
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-eco-800">
          {label}
        </label>
      )}
      <input
        id={name}
        name={name}
        className={`w-full px-4 py-3 rounded-xl border bg-white/90 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
          error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-beige-300'
        }`}
        {...props}
      />
      {error && <p className="text-xs text-red-600 mt-0.5">{error}</p>}
    </div>
  )
}
