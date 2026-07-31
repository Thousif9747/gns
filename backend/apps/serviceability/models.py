from django.core.validators import RegexValidator
from django.db import models


postal_code_validator = RegexValidator(r'^\d{6}$', 'Enter a valid 6-digit Indian PIN code.')


class ServiceablePostalCode(models.Model):
    postal_code = models.CharField(max_length=6, unique=True, db_index=True, validators=[postal_code_validator])
    area_name = models.CharField(max_length=120)
    district = models.CharField(max_length=120)
    state = models.CharField(max_length=120, default='Karnataka')
    is_active = models.BooleanField(default=True, db_index=True)
    estimated_delivery_days = models.PositiveSmallIntegerField(null=True, blank=True)
    delivery_fee = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'serviceability_postal_code'
        ordering = ['district', 'area_name', 'postal_code']

    def save(self, *args, **kwargs):
        self.postal_code = ''.join(filter(str.isdigit, str(self.postal_code)))
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.postal_code} — {self.area_name}, {self.district}'
