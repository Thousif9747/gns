from rest_framework import serializers
from django.db import models
from .models import Category, Product, ProductImage, ProductReview, AdBanner, Announcement, Offer, ProductVariant
from .utils import build_absolute_file_url, get_ad_banner_url, get_homepage_banner_images, get_product_gallery_urls, get_product_primary_image, get_product_primary_image_positions
import json
from apps.commerce.utils import get_best_offer
from apps.orders.models import OrderItem


class CategorySerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = '__all__'
        extra_kwargs = { 'image': { 'write_only': True } }

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            url = obj.image.url
            return request.build_absolute_uri(url) if request else url
        return ''


class ProductImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = ProductImage
        fields = ['id', 'image', 'image_url', 'sort_order', 'is_homepage_banner', 'object_position', 'card_object_position', 'created_at']
        extra_kwargs = {'image': {'write_only': True}}

    def get_image_url(self, obj):
        request = self.context.get('request')
        return build_absolute_file_url(request, obj.image)


class ProductVariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductVariant
        fields = ['id', 'product', 'name', 'sku', 'price', 'mrp', 'stock', 'sort_order', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']

    def validate(self, attrs):
        price = attrs.get('price', getattr(self.instance, 'price', None))
        mrp = attrs.get('mrp', getattr(self.instance, 'mrp', None))
        if mrp is not None and price is not None and mrp <= price:
            raise serializers.ValidationError({'mrp': 'MRP must be greater than the selling price.'})
        return attrs


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    image_url = serializers.SerializerMethodField()
    image_urls = serializers.SerializerMethodField()
    images = ProductImageSerializer(many=True, read_only=True)
    homepage_banner_images = serializers.SerializerMethodField()
    homepage_banner_image_url = serializers.SerializerMethodField()
    offer_info = serializers.SerializerMethodField()
    cheapest_variant = serializers.SerializerMethodField()
    average_rating = serializers.DecimalField(max_digits=3, decimal_places=1, read_only=True, allow_null=True)
    review_count = serializers.IntegerField(read_only=True)
    card_object_position = serializers.SerializerMethodField()
    object_position = serializers.SerializerMethodField()
    variants = ProductVariantSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = [
            'id',
            'category',
            'category_name',
            'name',
            'slug',
            'description',
            'base_price',
            'mrp',
            'stock',
            'image',
            'image_url',
            'image_urls',
            'images',
            'homepage_banner_images',
            'homepage_banner_image_url',
            'card_object_position',
            'object_position',
            'unit_label',
            'is_available',
            'is_active',
            'is_featured',
            'created_at',
            'updated_at',
            'offer_info',
            'cheapest_variant',
            'average_rating',
            'review_count',
            'variants',
        ]

    def validate(self, attrs):
        price = attrs.get('base_price', getattr(self.instance, 'base_price', None))
        mrp = attrs.get('mrp', getattr(self.instance, 'mrp', None))
        if mrp is not None and price is not None and mrp <= price:
            raise serializers.ValidationError({'mrp': 'MRP must be greater than the selling price.'})
        return attrs

    def get_image_url(self, obj):
        request = self.context.get('request')
        return get_product_primary_image(obj, request)

    def get_image_urls(self, obj):
        request = self.context.get('request')
        return get_product_gallery_urls(obj, request)

    def get_homepage_banner_images(self, obj):
        request = self.context.get('request')
        return get_homepage_banner_images(obj, request)

    def get_homepage_banner_image_url(self, obj):
        banners = self.get_homepage_banner_images(obj)
        if banners:
            return banners[0]['image_url']
        return self.get_image_url(obj)

    def get_card_object_position(self, obj):
        return get_product_primary_image_positions(obj)['card_object_position']

    def get_object_position(self, obj):
        return get_product_primary_image_positions(obj)['object_position']

    def get_offer_info(self, obj):
        offer, discount = get_best_offer(obj)
        if not offer:
            return None
        return {
            'name': offer.name,
            'badge_label': offer.badge_label,
            'discount_type': offer.discount_type,
            'discount_value': str(offer.discount_value),
            'discounted_price': round(float(obj.base_price) - discount, 2),
        }

    def get_cheapest_variant(self, obj):
        variants = obj.variants.filter(is_active=True).order_by('price')
        if not variants:
            return None
        cheapest = variants.first()
        return {
            'id': str(cheapest.id),
            'name': cheapest.name,
            'price': float(cheapest.price),
            'stock': cheapest.stock,
        }

    # ── Image upload / banner helpers (used by create & update) ──

    def _extract_uploaded_images(self):
        request = self.context.get('request')
        if not request:
            return []
        return request.FILES.getlist('images')

    def _extract_json_payload(self, key, default):
        request = self.context.get('request')
        if not request:
            return default
        raw_value = request.data.get(key)
        if not raw_value:
            return default
        try:
            return json.loads(raw_value)
        except (TypeError, ValueError, json.JSONDecodeError):
            return default

    def _apply_existing_image_flags(self, product):
        states = self._extract_json_payload('existing_image_state', [])
        if not states:
            return
        image_map = {str(image.id): image for image in product.images.all()}
        for state in states:
            image_id = str(state.get('id') or '')
            image = image_map.get(image_id)
            if not image:
                continue
            image.is_homepage_banner = bool(state.get('is_homepage_banner'))
            if state.get('sort_order') is not None:
                image.sort_order = int(state.get('sort_order') or 0)
            if state.get('object_position'):
                image.object_position = str(state.get('object_position'))
            if state.get('card_object_position'):
                image.card_object_position = str(state.get('card_object_position'))
            image.save(update_fields=['is_homepage_banner', 'sort_order', 'object_position', 'card_object_position'])

    def _get_new_image_banner_flags(self):
        flags = self._extract_json_payload('new_image_banners', [])
        if isinstance(flags, list):
            return [bool(flag) for flag in flags]
        return []

    def _get_new_image_positions(self):
        positions = self._extract_json_payload('new_image_positions', [])
        if isinstance(positions, list):
            return [str(p) if p else '50% 50%' for p in positions]
        return []

    def _get_new_card_positions(self):
        positions = self._extract_json_payload('new_card_positions', [])
        if isinstance(positions, list):
            return [str(p) if p else '50% 50%' for p in positions]
        return []

    def create(self, validated_data):
        uploaded_images = self._extract_uploaded_images()
        banner_flags = self._get_new_image_banner_flags()
        banner_positions = self._get_new_image_positions()
        card_positions = self._get_new_card_positions()
        product = Product.objects.create(**validated_data)

        if uploaded_images:
            product.image = uploaded_images[0]
            product.save(update_fields=['image'])
            gallery_rows = []
            for index, image in enumerate(uploaded_images):
                gallery_rows.append(
                    ProductImage(
                        product=product,
                        image=image,
                        sort_order=index,
                        is_homepage_banner=banner_flags[index] if index < len(banner_flags) else False,
                        object_position=banner_positions[index] if index < len(banner_positions) else '50% 50%',
                        card_object_position=card_positions[index] if index < len(card_positions) else '50% 50%',
                    )
                )
            ProductImage.objects.bulk_create(gallery_rows)

        return product

    def update(self, instance, validated_data):
        uploaded_images = self._extract_uploaded_images()
        banner_flags = self._get_new_image_banner_flags()
        banner_positions = self._get_new_image_positions()
        card_positions = self._get_new_card_positions()

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()
        if uploaded_images:
            start_order = instance.images.aggregate(max_order=models.Max('sort_order')).get('max_order') or -1
            gallery_rows = []
            for offset, image in enumerate(uploaded_images, start=1):
                gallery_rows.append(
                    ProductImage(
                        product=instance,
                        image=image,
                        sort_order=start_order + offset,
                        is_homepage_banner=banner_flags[offset - 1] if offset - 1 < len(banner_flags) else False,
                        object_position=banner_positions[offset - 1] if offset - 1 < len(banner_positions) else '50% 50%',
                        card_object_position=card_positions[offset - 1] if offset - 1 < len(card_positions) else '50% 50%',
                    )
                )
            ProductImage.objects.bulk_create(gallery_rows)

        self._apply_existing_image_flags(instance)

        primary_image = instance.images.order_by('sort_order', 'created_at').first()
        if primary_image and primary_image.image:
            instance.image = primary_image.image
            instance.save(update_fields=['image'])

        return instance


class ProductReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    user_avatar = serializers.SerializerMethodField()
    is_verified_purchase = serializers.SerializerMethodField()

    class Meta:
        model = ProductReview
        fields = [
            'id', 'product', 'user', 'rating', 'title', 'content',
            'is_approved', 'is_verified_purchase', 'created_at',
            'updated_at', 'user_name', 'user_avatar',
        ]
        read_only_fields = ['user', 'is_approved', 'created_at', 'updated_at']

    def get_user_name(self, obj):
        try:
            return obj.user.profile.full_name or obj.user.email
        except Exception:
            return obj.user.email

    def get_user_avatar(self, obj):
        try:
            if obj.user.profile.avatar:
                request = self.context.get('request')
                url = obj.user.profile.avatar.url
                return request.build_absolute_uri(url) if request else url
        except Exception:
            pass
        return None

    def get_is_verified_purchase(self, obj):
        return OrderItem.objects.filter(
            product_id=obj.product_id,
            order__user=obj.user,
            order__current_status='DELIVERED',
        ).exists()


class AnnouncementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Announcement
        fields = ['id', 'text', 'link_url', 'display_order', 'is_active', 'created_at', 'updated_at']


class AdBannerSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = AdBanner
        fields = ['id', 'title', 'image', 'image_url', 'link_url', 'display_order', 'is_active', 'object_position', 'created_at', 'updated_at']
        extra_kwargs = {
            'image': {'write_only': True},
            'link_url': {'required': False, 'allow_blank': True},
        }

    def get_image_url(self, obj):
        request = self.context.get('request')
        return get_ad_banner_url(obj, request)


class OfferSerializer(serializers.ModelSerializer):
    product_count = serializers.SerializerMethodField()
    products = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Offer
        fields = '__all__'
        extra_kwargs = {
            'image': {'write_only': True},
        }

    def validate_code(self, value):
        return value if value else None

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            return get_ad_banner_url(obj, request)
        return ''

    def get_product_count(self, obj):
        return len(obj.product_ids) if obj.product_ids else 0

    def get_products(self, obj):
        from .models import Product
        ids = obj.product_ids or []
        if not ids:
            return []
        products = Product.objects.filter(id__in=ids).only('id', 'name', 'slug', 'base_price')
        return [{'id': str(p.id), 'name': p.name, 'slug': p.slug, 'base_price': str(p.base_price)} for p in products]
