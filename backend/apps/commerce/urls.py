from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('cart-items', views.CartItemViewSet)
router.register('wishlist-items', views.WishlistItemViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
