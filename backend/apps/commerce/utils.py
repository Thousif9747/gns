from apps.catalog.models import Offer


def get_best_offer(product):
    product_id_str = str(product.id)
    best, best_discount = None, 0

    for offer in Offer.objects.filter(is_active=True).iterator():
        if product_id_str not in (offer.product_ids or []):
            continue
        if offer.discount_type == 'PERCENT':
            discount = float(offer.discount_value) / 100 * float(product.base_price)
        else:
            discount = float(offer.discount_value)

        if offer.min_purchase_amount and float(product.base_price) < float(offer.min_purchase_amount):
            continue

        if discount > best_discount:
            best_discount = discount
            best = offer

    return best, round(best_discount, 2)
