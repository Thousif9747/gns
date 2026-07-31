function asAmount(value) {
  const amount = Number(value)
  return Number.isFinite(amount) && amount >= 0 ? amount : null
}

export function getProductPrice(product = {}) {
  const variantPrices = (Array.isArray(product.variants) ? product.variants : [])
    .filter(variant => variant?.is_active !== false && variant?.is_available !== false)
    .map(variant => asAmount(variant?.discounted_price ?? variant?.price))
    .filter(price => price !== null)

  const directPrice = [
    product.offer_info?.discounted_price,
    product.normalized_price,
    product.base_price,
    product.product_price,
    product.price,
  ].map(asAmount).find(price => price !== null)

  return directPrice ?? (variantPrices.length ? Math.min(...variantPrices) : 0)
}

export function getRecommendedDiscount(mrp) {
  const amount = Number(mrp)
  if (!Number.isFinite(amount) || amount <= 0) return 0
  if (amount <= 500) return 5
  if (amount <= 1000) return 10
  return 15
}

export function getSuggestedSellingPrice(mrp) {
  const amount = Number(mrp)
  const discount = getRecommendedDiscount(amount)
  if (!discount) return ''
  return (amount * (1 - discount / 100)).toFixed(2)
}

export function getProductMrp(product = {}, selectedVariant = null) {
  const price = selectedVariant
    ? asAmount(selectedVariant.discounted_price ?? selectedVariant.price) ?? 0
    : getProductPrice(product)

  const selectedMrp = asAmount(selectedVariant?.mrp)
  if (selectedMrp !== null && selectedMrp > price) return selectedMrp

  const directMrp = asAmount(product.mrp ?? product.original_price)
  if (directMrp !== null && directMrp > price) return directMrp

  const matchingVariant = (Array.isArray(product.variants) ? product.variants : [])
    .filter(variant => variant?.is_active !== false)
    .map(variant => ({ price: asAmount(variant.price), mrp: asAmount(variant.mrp) }))
    .filter(variant => variant.price !== null && variant.mrp !== null && variant.mrp > variant.price)
    .sort((a, b) => a.price - b.price)[0]

  return matchingVariant?.mrp || price
}

export function getDiscountPercent(price, mrp) {
  const sellingPrice = Number(price)
  const retailPrice = Number(mrp)
  if (!Number.isFinite(sellingPrice) || !Number.isFinite(retailPrice) || retailPrice <= sellingPrice) return 0
  return Math.round(((retailPrice - sellingPrice) / retailPrice) * 100)
}
