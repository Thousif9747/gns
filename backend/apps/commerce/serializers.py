from rest_framework import serializers
from .models import CartItem, WishlistItem
from .utils import get_best_offer
from apps.catalog.utils import get_product_primary_image


class CartItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_slug = serializers.SlugField(source='product.slug', read_only=True)
    product_price = serializers.SerializerMethodField()
    product_image = serializers.SerializerMethodField()
    line_total = serializers.SerializerMethodField()
    offer_info = serializers.SerializerMethodField()
    variant_name = serializers.SerializerMethodField()
    variant_sku = serializers.SerializerMethodField()
    variant_price = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = ['id', 'product', 'product_name', 'product_slug', 'product_price',
                  'product_image', 'quantity', 'line_total', 'offer_info', 'created_at', 'updated_at',
                  'variant', 'variant_name', 'variant_sku', 'variant_price']
        read_only_fields = ['user', 'created_at']

    def get_product_price(self, obj):
        return float(obj.variant.price) if obj.variant else float(obj.product.base_price)

    def get_variant_name(self, obj):
        return obj.variant.name if obj.variant else ''

    def get_variant_sku(self, obj):
        return obj.variant.sku if obj.variant else ''

    def get_variant_price(self, obj):
        return str(obj.variant.price) if obj.variant else ''

    def get_product_image(self, obj):
        request = self.context.get('request')
        return get_product_primary_image(obj.product, request)

    def get_line_total(self, obj):
        base_price = float(obj.variant.price) if obj.variant else float(obj.product.base_price)
        _, discount = get_best_offer(obj.product)
        unit_price = base_price - discount
        if unit_price < 0:
            unit_price = 0
        return round(unit_price * obj.quantity, 2)

    def get_offer_info(self, obj):
        offer, discount = get_best_offer(obj.product)
        if not offer:
            return None
        return {
            'name': offer.name,
            'badge_label': offer.badge_label,
            'discount_type': offer.discount_type,
            'discount_value': str(offer.discount_value),
            'savings_per_unit': round(discount, 2),
        }

    def validate(self, attrs):
        request = self.context.get('request')
        if request and request.method == 'POST':
            product = attrs.get('product')
            variant = attrs.get('variant')
            user = request.user
            existing = CartItem.objects.filter(user=user, product=product, variant=variant).first()
            if existing:
                existing.quantity += attrs.get('quantity', 1)
                existing.save()
                raise serializers.ValidationError('__QTY_UPDATED__')
        return attrs


class WishlistItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_slug = serializers.SlugField(source='product.slug', read_only=True)
    product_price = serializers.DecimalField(source='product.base_price', max_digits=10, decimal_places=2, read_only=True)
    product_image = serializers.SerializerMethodField()
    offer_info = serializers.SerializerMethodField()

    class Meta:
        model = WishlistItem
        fields = ['id', 'product', 'product_name', 'product_slug', 'product_price',
                  'product_image', 'offer_info', 'created_at', 'updated_at']
        read_only_fields = ['user', 'created_at', 'updated_at']

    def get_product_image(self, obj):
        request = self.context.get('request')
        return get_product_primary_image(obj.product, request)

    def get_offer_info(self, obj):
        from .utils import get_best_offer
        offer, discount = get_best_offer(obj.product)
        if not offer:
            return None
        return {
            'name': offer.name,
            'badge_label': offer.badge_label,
            'discount_type': offer.discount_type,
            'discount_value': str(offer.discount_value),
            'discounted_price': round(float(obj.product.base_price) - discount, 2),
        }
