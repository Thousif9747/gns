from rest_framework import serializers
from .models import Order, OrderItem, OrderStatusHistory, DeliveryAssignment


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = '__all__'


class OrderStatusHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderStatusHistory
        fields = '__all__'


class DeliveryAssignmentSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.SerializerMethodField()
    assigned_by_name = serializers.SerializerMethodField()

    class Meta:
        model = DeliveryAssignment
        fields = '__all__'

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            try:
                return obj.assigned_to.profile.full_name or obj.assigned_to.email
            except Exception:
                return obj.assigned_to.email
        return ''

    def get_assigned_by_name(self, obj):
        if obj.assigned_by:
            try:
                return obj.assigned_by.profile.full_name or obj.assigned_by.email
            except Exception:
                return obj.assigned_by.email
        return ''


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    status_history = OrderStatusHistorySerializer(many=True, read_only=True)
    delivery_assignments = DeliveryAssignmentSerializer(many=True, read_only=True)
    payment = serializers.SerializerMethodField()
    user_email = serializers.SerializerMethodField()
    user_name = serializers.SerializerMethodField()
    user_phone = serializers.SerializerMethodField()
    delivery_person_name = serializers.SerializerMethodField()
    delivery_person_phone = serializers.SerializerMethodField()
    customer_gst = serializers.SerializerMethodField()
    admin_gst = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = '__all__'
        read_only_fields = ['order_number', 'current_status']

    def get_payment(self, obj):
        try:
            return {'id': str(obj.payment.id), 'current_status': obj.payment.current_status}
        except Exception:
            return None

    def get_user_email(self, obj):
        return obj.shipping_email or obj.user.email

    def get_user_name(self, obj):
        try:
            return obj.user.profile.full_name
        except Exception:
            return ''

    def get_user_phone(self, obj):
        try:
            return obj.user.phone
        except Exception:
            return ''

    def get_delivery_person_name(self, obj):
        current = obj.current_delivery_assignment
        if current and current.assigned_to:
            try:
                return current.assigned_to.profile.full_name
            except Exception:
                return current.assigned_to.email
        return ''

    def get_delivery_person_phone(self, obj):
        current = obj.current_delivery_assignment
        if current and current.assigned_to:
            try:
                return current.assigned_to.phone
            except Exception:
                return ''
        return ''

    def get_customer_gst(self, obj):
        return obj.customer_gst_number or ''

    def get_admin_gst(self, obj):
        return obj.admin_gst_number or ''
