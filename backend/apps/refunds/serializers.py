from rest_framework import serializers
from .models import Refund, RefundStatusHistory


class RefundStatusHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = RefundStatusHistory
        fields = '__all__'


class RefundSerializer(serializers.ModelSerializer):
    status_history = RefundStatusHistorySerializer(many=True, read_only=True)
    order_number = serializers.CharField(source='order.order_number', read_only=True)
    requested_by_email = serializers.EmailField(source='requested_by.email', read_only=True, default=None)
    requested_by_name = serializers.SerializerMethodField()

    def get_requested_by_name(self, obj):
        if hasattr(obj.requested_by, 'profile') and obj.requested_by.profile.full_name:
            return obj.requested_by.profile.full_name
        return obj.requested_by.email if obj.requested_by else None

    class Meta:
        model = Refund
        fields = [
            'id', 'order', 'payment', 'requested_by', 'requested_by_email', 'requested_by_name',
            'current_status', 'refund_amount', 'reason', 'refund_method', 'admin_remarks',
            'reviewed_by', 'reviewed_at', 'created_at', 'updated_at',
            'order_number', 'status_history',
        ]
        read_only_fields = ['current_status', 'created_at', 'updated_at', 'reviewed_at']
