export default function EmptyState({ emoji = '📦', title, description, children }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="text-5xl mb-4">{emoji}</span>
      {title && <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>}
      {description && <p className="text-sm text-gray-500 max-w-sm mb-4">{description}</p>}
      {children}
    </div>
  )
}
