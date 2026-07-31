from rest_framework import serializers
from .models import Payment, PaymentProof, PaymentStatusHistory, Receipt


class PaymentProofSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = PaymentProof
        fields = ['id', 'payment', 'file', 'file_url', 'original_filename', 'file_type', 'customer_notes', 'file_size_bytes', 'uploaded_by', 'is_current', 'uploaded_at']
        read_only_fields = ['uploaded_by', 'uploaded_at', 'file_size_bytes', 'original_filename', 'file_type']

    def get_file_url(self, obj):
        if not obj.file:
            return ''
        request = self.context.get('request')
        url = obj.file.url
        return request.build_absolute_uri(url) if request else url


class PaymentStatusHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentStatusHistory
        fields = '__all__'


class ReceiptSerializer(serializers.ModelSerializer):
    class Meta:
        model = Receipt
        fields = '__all__'


class PaymentSerializer(serializers.ModelSerializer):
    proofs = PaymentProofSerializer(many=True, read_only=True)
    status_history = PaymentStatusHistorySerializer(many=True, read_only=True)
    order_number = serializers.CharField(source='order.order_number', read_only=True)

    class Meta:
        model = Payment
        fields = '__all__'
        read_only_fields = ['current_status', 'qr_reference', 'qr_code_image', 'upi_id', 'payment_details', 'created_at', 'updated_at', 'reviewed_at']
