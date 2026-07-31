from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('', views.PaymentViewSet)
router.register('proofs', views.PaymentProofViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
