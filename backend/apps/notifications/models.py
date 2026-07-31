import uuid

from django.db import models


class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ('ORDER_PLACED', 'Order Placed'),
        ('PAYMENT_UPLOADED', 'Payment Uploaded'),
        ('PAYMENT_APPROVED', 'Payment Approved'),
        ('PAYMENT_REJECTED', 'Payment Rejected'),
        ('ORDER_PROCESSING', 'Order Processing'),
        ('ORDER_SHIPPED', 'Order Shipped'),
        ('ORDER_DELIVERED', 'Order Delivered'),
        ('ORDER_CANCELLED', 'Order Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='notifications',
        db_index=True,
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    notification_type = models.CharField(max_length=30, choices=NOTIFICATION_TYPES)
    is_read = models.BooleanField(default=False, db_index=True)
    order_id = models.CharField(max_length=255, blank=True, default='')
    redirect_url = models.CharField(max_length=500, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'notifications_notification'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read', '-created_at']),
            models.Index(fields=['user', 'notification_type', 'order_id']),
        ]

    def __str__(self):
        return f'{self.notification_type} - {self.user.email}'
