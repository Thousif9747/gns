from django.contrib import admin

from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    """Admin interface for the Notification model."""

    list_display = [
        'title',
        'user',
        'notification_type',
        'is_read',
        'order_id',
        'created_at',
    ]
    list_filter = ['notification_type', 'is_read', 'created_at']
    search_fields = [
        'user__email',
        'order_id',
        'title',
        'message',
    ]
    readonly_fields = [
        'id',
        'user',
        'title',
        'message',
        'notification_type',
        'order_id',
        'redirect_url',
        'created_at',
    ]
    date_hierarchy = 'created_at'
    list_select_related = ['user']

    def has_add_permission(self, request):
        """Notifications are created automatically by the system."""
        return False

    def has_change_permission(self, request, obj=None):
        """Allow marking as read in admin, but not editing other fields."""
        if obj is not None:
            # Only allow editing is_read field
            return True
        return super().has_change_permission(request, obj)
