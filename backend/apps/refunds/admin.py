from django.contrib import admin
from .models import Refund, RefundStatusHistory


@admin.register(Refund)
class RefundAdmin(admin.ModelAdmin):
    list_display = ['order', 'current_status', 'refund_amount', 'reason', 'created_at']
    list_filter = ['current_status', 'refund_method']
    search_fields = ['order__order_number', 'reason']
