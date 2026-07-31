import uuid
from django.db import models


class Order(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PAYMENT_UPLOADED', 'Payment Uploaded'),
        ('PAYMENT_APPROVED', 'Payment Approved'),
        ('PAYMENT_REJECTED', 'Payment Rejected'),
        ('PROCESSING', 'Processing'),
        ('SHIPPED', 'Shipped'),
        ('DELIVERED', 'Delivered'),
        ('CANCELLED', 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey('accounts.User', on_delete=models.PROTECT, related_name='orders')
    shipping_email = models.EmailField(blank=True, default='')
    order_number = models.CharField(max_length=20, unique=True)
    current_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    cgst_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    sgst_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    notes = models.TextField(blank=True)
    shipping_full_name = models.CharField(max_length=255, blank=True, default='')
    shipping_phone = models.CharField(max_length=20, blank=True, default='')
    shipping_address_line1 = models.CharField(max_length=255, blank=True, default='')
    shipping_address_line2 = models.CharField(max_length=255, blank=True, default='')
    shipping_city = models.CharField(max_length=100, blank=True, default='')
    shipping_state = models.CharField(max_length=100, blank=True, default='')
    shipping_postal_code = models.CharField(max_length=20, blank=True, default='')
    shipping_country = models.CharField(max_length=100, default='India')
    customer_gst_number = models.CharField(max_length=20, blank=True, default='')
    admin_gst_number = models.CharField(max_length=20, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'orders_order'
        ordering = ['-created_at']

    def __str__(self):
        return self.order_number

    @property
    def current_delivery_assignment(self):
        return self.delivery_assignments.filter(completed_at__isnull=True).first()


class OrderItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product_id = models.UUIDField()
    product_name = models.CharField(max_length=255)
    product_slug = models.SlugField(max_length=280)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField()
    line_total = models.DecimalField(max_digits=10, decimal_places=2)
    applied_offer_id = models.UUIDField(null=True, blank=True)
    applied_offer_name = models.CharField(max_length=100, blank=True)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    variant_name = models.CharField(max_length=100, blank=True, default='')

    class Meta:
        db_table = 'orders_orderitem'


class OrderStatusHistory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='status_history')
    from_status = models.CharField(max_length=20, null=True, blank=True)
    to_status = models.CharField(max_length=20)
    changed_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True)
    remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'orders_orderstatushistory'
        ordering = ['created_at']


class DeliveryAssignment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='delivery_assignments')
    assigned_to = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, related_name='delivery_assignments')
    assigned_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, related_name='+')
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'orders_deliveryassignment'
        ordering = ['-created_at']

    def __str__(self):
        name = self.assigned_to.email if self.assigned_to else 'None'
        return f'{self.order.order_number} → {name}'
