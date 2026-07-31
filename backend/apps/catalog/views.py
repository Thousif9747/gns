from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q, Avg, Count
from django.db.models.deletion import ProtectedError
import uuid
from .models import Category, Product, ProductReview, ProductImage, AdBanner, Announcement, Offer, ProductVariant
from .serializers import CategorySerializer, ProductSerializer, ProductReviewSerializer, AdBannerSerializer, AnnouncementSerializer, OfferSerializer, ProductImageSerializer, ProductVariantSerializer
from apps.accounts.permissions import IsAdminRole


class CatalogPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 200


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.filter(is_active=True)
    serializer_class = CategorySerializer
    lookup_field = 'slug'
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy', 'remove_image'):
            return [IsAdminRole()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        if self.action == 'list' and self.request.query_params.get('all'):
            return Category.objects.all()
        if self.action in ('update', 'partial_update', 'destroy'):
            return Category.objects.all()
        return Category.objects.filter(is_active=True)

    @action(detail=True, methods=['post'])
    def remove_image(self, request, slug=None):
        category = self.get_object()
        if category.image:
            category.image.delete(save=False)
            category.image = None
            category.save(update_fields=['image'])
        return Response(status=status.HTTP_204_NO_CONTENT)

    def destroy(self, request, *args, **kwargs):
        category = self.get_object()
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError as e:
            product_names = ", ".join(p.name for p in e.protected_objects)
            count = len(e.protected_objects)
            msg = f"Cannot delete '{category.name}' — it has {count} product(s) linked: {product_names}. Delete or reassign those products first."
            return Response({"error": msg}, status=status.HTTP_400_BAD_REQUEST)


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    pagination_class = CatalogPagination
    lookup_field = 'slug'
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAdminRole()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        queryset = Product.objects.select_related('category').prefetch_related('images').annotate(
            average_rating=Avg('reviews__rating', filter=Q(reviews__is_approved=True)),
            review_count=Count('reviews', filter=Q(reviews__is_approved=True)),
        )
        params = self.request.query_params

        if self.action in {'retrieve', 'update', 'partial_update', 'destroy'}:
            return queryset

        if params.get('all') not in {'1', 'true', 'True'}:
            queryset = queryset.filter(is_active=True)

        if params.get('homepage_banner') in {'1', 'true', 'True'}:
            queryset = queryset.filter(images__is_homepage_banner=True).distinct()

        category = params.get('category')
        if category:
            category = category.strip()
            category_filters = Q(category__slug=category)
            try:
                category_uuid = uuid.UUID(category)
            except (ValueError, TypeError):
                category_uuid = None
            if category_uuid:
                category_filters |= Q(category__id=category_uuid)
            queryset = queryset.filter(category_filters)

        search = params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | Q(description__icontains=search)
            )

        featured = params.get('is_featured')
        if featured in {'1', 'true', 'True'}:
            queryset = queryset.filter(is_featured=True)

        available = params.get('is_available')
        if available in {'0', 'false', 'False'}:
            queryset = queryset.filter(is_available=False)
        elif available in {'1', 'true', 'True'}:
            queryset = queryset.filter(is_available=True)

        active = params.get('is_active')
        if active in {'0', 'false', 'False'}:
            queryset = queryset.filter(is_active=False)
        elif active in {'1', 'true', 'True'}:
            queryset = queryset.filter(is_active=True)

        ordering = params.get('ordering')
        allowed_ordering = {
            'created_at',
            '-created_at',
            'base_price',
            '-base_price',
            'name',
            '-name',
            'stock',
            '-stock',
        }
        if ordering in allowed_ordering:
            queryset = queryset.order_by(ordering)
        else:
            queryset = queryset.order_by('-created_at')

        return queryset

    @action(detail=True, methods=['get'], url_path='variants')
    def list_variants(self, request, slug=None):
        product = self.get_object()
        variants = product.variants.filter(is_active=True)
        serializer = ProductVariantSerializer(variants, many=True, context=self.get_serializer_context())
        return Response(serializer.data)


class ProductVariantViewSet(viewsets.ModelViewSet):
    queryset = ProductVariant.objects.all()
    serializer_class = ProductVariantSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        qs = ProductVariant.objects.filter(is_active=True)
        product_slug = self.request.query_params.get('product_slug') or self.kwargs.get('product_slug')
        if product_slug:
            qs = qs.filter(product__slug=product_slug)
        product_id = self.request.query_params.get('product')
        if product_id:
            qs = qs.filter(product_id=product_id)
        return qs

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAdminRole()]
        return [permissions.AllowAny()]


class OfferViewSet(viewsets.ModelViewSet):
    queryset = Offer.objects.all()
    serializer_class = OfferSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAdminRole()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        qs = Offer.objects.all()
        if self.action == 'list':
            is_homepage = self.request.query_params.get('is_homepage_banner')
            if is_homepage:
                qs = qs.filter(is_homepage_banner=True, is_active=True).exclude(image='')
                return qs
            if self.request.query_params.get('all'):
                return qs
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return qs
        return qs.filter(is_active=True)


class ProductImageViewSet(viewsets.ModelViewSet):
    queryset = ProductImage.objects.all()
    serializer_class = ProductImageSerializer
    permission_classes = [IsAdminRole]
    lookup_field = 'id'
    http_method_names = ['delete', 'head', 'options']


class ProductReviewViewSet(viewsets.ModelViewSet):
    queryset = ProductReview.objects.select_related('user__profile')
    serializer_class = ProductReviewSerializer

    def get_queryset(self):
        qs = ProductReview.objects.filter(is_approved=True).select_related('user__profile')
        product = self.request.query_params.get('product')
        if product:
            qs = qs.filter(product_id=product)
        return qs

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user, is_approved=True)

    def perform_update(self, serializer):
        if serializer.instance.user != self.request.user and self.request.user.role != 'ADM':
            raise PermissionDenied('You can only edit your own reviews.')
        serializer.save()

    def perform_destroy(self, instance):
        if instance.user != self.request.user and self.request.user.role != 'ADM':
            raise PermissionDenied('You can only delete your own reviews.')
        instance.delete()


class AdBannerViewSet(viewsets.ModelViewSet):
    queryset = AdBanner.objects.all()
    serializer_class = AdBannerSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    lookup_field = 'id'

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy', 'remove_image'):
            return [IsAdminRole()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        if self.action in ('update', 'partial_update', 'destroy', 'remove_image'):
            return AdBanner.objects.all()
        if self.action == 'list' and self.request.query_params.get('all'):
            return AdBanner.objects.all()
        return AdBanner.objects.filter(is_active=True)

    @action(detail=True, methods=['post'])
    def remove_image(self, request, id=None):
        banner = self.get_object()
        if banner.image:
            banner.image.delete(save=False)
            banner.image = None
            banner.save(update_fields=['image'])
        return Response(status=status.HTTP_204_NO_CONTENT)


class AnnouncementViewSet(viewsets.ModelViewSet):
    queryset = Announcement.objects.all()
    serializer_class = AnnouncementSerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAdminRole()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        if self.action in ('update', 'partial_update', 'destroy'):
            return Announcement.objects.all()
        if self.action == 'list' and self.request.query_params.get('all'):
            return Announcement.objects.all()
        return Announcement.objects.filter(is_active=True)

