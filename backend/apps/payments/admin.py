from django.contrib import admin
from django.utils.html import format_html
from .models import Payment, PaymentProof, PaymentStatusHistory, Receipt, PaymentConfig, PaymentConfig


class PaymentProofInline(admin.TabularInline):
    model = PaymentProof
    readonly_fields = ['file', 'original_filename', 'file_type', 'customer_notes', 'uploaded_by', 'uploaded_at']
    can_delete = False
    extra = 0


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    inlines = [PaymentProofInline]
    readonly_fields = ['qr_code_preview', 'current_status', 'qr_reference', 'chosen_method', 'created_at', 'updated_at', 'reviewed_at']
    list_display = ['qr_reference', 'order', 'current_status', 'chosen_method', 'expected_amount', 'created_at']
    list_filter = ['current_status']
    search_fields = ['qr_reference', 'order__order_number']
    list_display_links = ['qr_reference']

    def qr_code_preview(self, obj):
        if obj.qr_code_image:
            return format_html('<img src="{}" width="100" height="100" />', obj.qr_code_image.url)
        return '-'
    qr_code_preview.short_description = 'QR Code'


@admin.register(PaymentConfig)
class PaymentConfigAdmin(admin.ModelAdmin):
    """Dedicated admin section showing only the global config Payment (order=NULL)."""
    def get_queryset(self, request):
        return PaymentConfig.objects.filter(order__isnull=True)

    readonly_fields = ['qr_code_preview', 'config_badge', 'qr_reference', 'current_status', 'upi_id', 'payment_details', 'created_at', 'updated_at']
    list_display = ['config_badge_sm', 'qr_code_thumb', 'upi_id', 'bank_summary', 'updated_at']
    fieldsets = [
        ('⚙️ Global Payment Configuration', {
            'fields': ['config_badge', 'qr_code_preview', 'upi_id', 'payment_details'],
            'description': 'This is the global payment configuration. Customers see these methods during checkout. Changes here apply to all FUTURE orders.',
        }),
    ]

    def config_badge(self, obj):
        return format_html('<span style="background:#059669;color:white;padding:4px 14px;border-radius:20px;font-size:11px;font-weight:600">⚙️ GLOBAL CONFIG</span>')
    config_badge.short_description = ''

    def config_badge_sm(self, obj):
        return format_html('<span style="background:#059669;color:white;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:600">CONFIG</span>')
    config_badge_sm.short_description = ''

    def qr_code_thumb(self, obj):
        if obj.qr_code_image:
            return format_html('<img src="{}" width="40" height="40" style="border-radius:6px;object-fit:cover" />', obj.qr_code_image.url)
        return '—'
    qr_code_thumb.short_description = 'QR'

    def bank_summary(self, obj):
        if not obj.payment_details:
            return '—'
        lines = obj.payment_details.split('\n')
        details = {}
        for line in lines:
            if ':' in line:
                k, v = line.split(':', 1)
                details[k.strip().lower()] = v.strip()
        parts = [details.get('bank', ''), details.get('account holder', '')]
        return ' · '.join(p for p in parts if p) or '—'
    bank_summary.short_description = 'Bank'

    def qr_code_preview(self, obj):
        if obj.qr_code_image:
            return format_html('<img src="{}" width="120" style="border-radius:8px;border:1px solid #ddd" />', obj.qr_code_image.url)
        return '— No QR uploaded yet'
    qr_code_preview.short_description = 'QR Code Image'

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(PaymentProof)
class PaymentProofAdmin(admin.ModelAdmin):
    list_display = ['payment', 'file_type', 'original_filename', 'is_current', 'uploaded_at', 'file_size_bytes']
    readonly_fields = ['file', 'original_filename', 'file_type', 'customer_notes', 'uploaded_by', 'uploaded_at']


@admin.register(PaymentStatusHistory)
class PaymentStatusHistoryAdmin(admin.ModelAdmin):
    list_display = ['payment', 'from_status', 'to_status', 'changed_by', 'created_at']


@admin.register(Receipt)
class ReceiptAdmin(admin.ModelAdmin):
    list_display = ['order', 'receipt_download', 'file_type', 'generated_at']
    readonly_fields = ['order', 'receipt_download', 'original_filename', 'file_type', 'generated_at']

    def receipt_download(self, obj):
        if obj.file:
            return format_html('<a href="{}" download>📄 Download {}</a>', obj.file.url, obj.original_filename)
        return '-'
    receipt_download.short_description = 'Receipt'
