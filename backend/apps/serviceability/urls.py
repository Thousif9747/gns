from django.urls import path
from .views import ServiceabilityCheckView

urlpatterns = [path('check/', ServiceabilityCheckView.as_view(), name='serviceability-check')]
