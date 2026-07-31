from django.contrib import admin
from .models import Order, OrderItem, OrderStatusHistory, DeliveryAssignment


class OrderItemInline(admin.TabularInline):
    model = OrderItem


class OrderStatusHistoryInline(admin.TabularInline):
    model = OrderStatusHistory
    readonly_fields = ['from_status', 'to_status', 'changed_by', 'created_at']


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['order_number', 'user', 'current_status', 'total_amount', 'created_at']
    list_filter = ['current_status']
    search_fields = ['order_number', 'user__email']
    inlines = [OrderItemInline, OrderStatusHistoryInline]


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ['order', 'product_name', 'quantity', 'unit_price', 'line_total']


@admin.register(OrderStatusHistory)
class OrderStatusHistoryAdmin(admin.ModelAdmin):
    list_display = ['order', 'from_status', 'to_status', 'changed_by', 'created_at']


@admin.register(DeliveryAssignment)
class DeliveryAssignmentAdmin(admin.ModelAdmin):
    list_display = ['order', 'assigned_to', 'assigned_by', 'started_at', 'completed_at', 'created_at']
    list_filter = ['assigned_to', 'created_at']
