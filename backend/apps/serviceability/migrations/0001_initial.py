import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='ServiceablePostalCode',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('postal_code', models.CharField(db_index=True, max_length=6, unique=True, validators=[django.core.validators.RegexValidator('^\\d{6}$', 'Enter a valid 6-digit Indian PIN code.')])),
                ('area_name', models.CharField(max_length=120)),
                ('district', models.CharField(max_length=120)),
                ('state', models.CharField(default='Karnataka', max_length=120)),
                ('is_active', models.BooleanField(db_index=True, default=True)),
                ('estimated_delivery_days', models.PositiveSmallIntegerField(blank=True, null=True)),
                ('delivery_fee', models.DecimalField(blank=True, decimal_places=2, max_digits=8, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'serviceability_postal_code',
                'ordering': ['district', 'area_name', 'postal_code'],
            },
        ),
    ]
