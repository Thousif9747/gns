from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Notification
from .serializers import (
    NotificationSerializer,
    UnreadCountSerializer,
)


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    # Pagination uses DEFAULT_PAGINATION_CLASS from settings (PageNumberPagination, page_size=20)

    def get_queryset(self):
        qs = Notification.objects.filter(user=self.request.user).order_by('-created_at')
        is_read = self.request.query_params.get('is_read')
        if is_read is not None:
            is_read_bool = is_read.lower() in ('true', '1', 'yes')
            qs = qs.filter(is_read=is_read_bool)
        return qs

    @action(detail=False, methods=['get'])
    def unread_count(self, request, *args, **kwargs):
        count = Notification.objects.filter(user=request.user, is_read=False).count()
        serializer = UnreadCountSerializer({'count': count})
        return Response(serializer.data)

    @action(detail=True, methods=['patch'])
    def mark_read(self, request, pk=None, *args, **kwargs):
        notification = self.get_object()
        notification.is_read = True
        notification.save(update_fields=['is_read'])
        return Response({'status': 'marked as read'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['patch'])
    def mark_all_read(self, request, *args, **kwargs):
        updated = Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({'status': f'{updated} notifications marked as read'}, status=status.HTTP_200_OK)
