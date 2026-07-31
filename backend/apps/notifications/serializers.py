from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'id', 'user', 'title', 'message', 'notification_type',
            'is_read', 'order_id', 'redirect_url', 'created_at',
        ]
        read_only_fields = [
            'id', 'user', 'title', 'message', 'notification_type',
            'order_id', 'redirect_url', 'created_at',
        ]


class NotificationMarkReadSerializer(serializers.Serializer):
    id = serializers.UUIDField()

    def validate_id(self, value):
        if not Notification.objects.filter(id=value).exists():
            raise serializers.ValidationError('Notification not found.')
        return value


class UnreadCountSerializer(serializers.Serializer):
    count = serializers.IntegerField(read_only=True)
