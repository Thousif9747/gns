import uuid
from django.db import models


class Refund(models.Model):
    STATUS_CHOICES = [
        ('REQUESTED', 'Requested'),
        ('UNDER_REVIEW', 'Under Review'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
        ('PROCESSING', 'Processing'),
        ('COMPLETED', 'Completed'),
    ]

    METHOD_CHOICES = [
        ('ORIGINAL', 'Original Payment Method'),
        ('BANK_TRANSFER', 'Bank Transfer'),
        ('STORE_CREDIT', 'Store Credit'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey('orders.Order', on_delete=models.PROTECT, related_name='refunds')
    payment = models.ForeignKey('payments.Payment', on_delete=models.SET_NULL, null=True, blank=True)
    requested_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, related_name='refund_requests')
    current_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='REQUESTED')
    refund_amount = models.DecimalField(max_digits=10, decimal_places=2)
    reason = models.TextField()
    refund_method = models.CharField(max_length=20, choices=METHOD_CHOICES, null=True, blank=True)
    admin_remarks = models.TextField(blank=True)
    reviewed_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_refunds')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'refunds_refund'

    def __str__(self):
        return f'Refund-{self.order.order_number}'


class RefundStatusHistory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    refund = models.ForeignKey(Refund, on_delete=models.CASCADE, related_name='status_history')
    from_status = models.CharField(max_length=20, null=True, blank=True)
    to_status = models.CharField(max_length=20)
    changed_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True)
    remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'refunds_refundstatushistory'
        ordering = ['created_at']
