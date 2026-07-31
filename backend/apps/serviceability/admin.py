from django.contrib import admin
from .models import ServiceablePostalCode


@admin.register(ServiceablePostalCode)
class ServiceablePostalCodeAdmin(admin.ModelAdmin):
    list_display = ['postal_code', 'area_name', 'district', 'state', 'is_active', 'estimated_delivery_days', 'delivery_fee']
    list_filter = ['is_active', 'district', 'state']
    search_fields = ['postal_code', 'area_name', 'district']
    list_editable = ['is_active']
