import uuid
from django.db import models


class Payment(models.Model):
    STATUS_CHOICES = [
        ('INITIATED', 'Initiated'),
        ('PROOF_UPLOADED', 'Proof Uploaded'),
        ('UNDER_REVIEW', 'Under Review'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
        ('EXPIRED', 'Expired'),
        ('COD', 'COD Pending'),
        ('COLLECTED', 'Collected'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.OneToOneField('orders.Order', on_delete=models.PROTECT, related_name='payment', null=True, blank=True)
    current_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='INITIATED')
    expected_amount = models.DecimalField(max_digits=10, decimal_places=2)
    claimed_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    qr_reference = models.CharField(max_length=50, unique=True)
    admin_remarks = models.TextField(blank=True)
    reviewed_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_payments')
    qr_code_image = models.ImageField(upload_to='payment_qr/', null=True, blank=True)
    upi_id = models.CharField(max_length=100, blank=True, default='')
    payment_details = models.TextField(blank=True, default='')
    chosen_method = models.CharField(max_length=20, blank=True, default='')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'payments_payment'

    def __str__(self):
        return self.qr_reference


class PaymentProof(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name='proofs')
    file = models.FileField(upload_to='payment_proofs/', null=True, blank=True)
    original_filename = models.CharField(max_length=255, blank=True)
    file_type = models.CharField(max_length=20, blank=True)
    customer_notes = models.TextField(blank=True)
    file_size_bytes = models.IntegerField(null=True, blank=True)
    uploaded_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True)
    is_current = models.BooleanField(default=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'payments_paymentproof'
        ordering = ['-uploaded_at']


class PaymentStatusHistory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name='status_history')
    from_status = models.CharField(max_length=20, null=True, blank=True)
    to_status = models.CharField(max_length=20)
    changed_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True)
    proof = models.ForeignKey(PaymentProof, on_delete=models.SET_NULL, null=True, blank=True)
    remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'payments_paymentstatushistory'
        ordering = ['created_at']


def receipt_upload_path(instance, filename):
    return f'receipts/order_{instance.order.order_number}_{filename}'


class Receipt(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.OneToOneField('orders.Order', on_delete=models.CASCADE, related_name='receipt')
    file = models.FileField(upload_to=receipt_upload_path)
    original_filename = models.CharField(max_length=255, blank=True)
    file_type = models.CharField(max_length=20, blank=True)
    generated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'payments_receipt'


class PaymentConfig(Payment):
    """Proxy model to show only the global config Payment (order=NULL) in admin."""
    class Meta:
        proxy = True
        verbose_name = 'Payment Config'
        verbose_name_plural = 'Payment Config'
