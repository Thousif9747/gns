from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('categories', views.CategoryViewSet)
router.register('products', views.ProductViewSet)
router.register('ad-banners', views.AdBannerViewSet)
router.register('announcements', views.AnnouncementViewSet)
router.register('offers', views.OfferViewSet)
router.register('reviews', views.ProductReviewViewSet)
router.register('product-images', views.ProductImageViewSet)
router.register('product-variants', views.ProductVariantViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
