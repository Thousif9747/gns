from django.db import transaction
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Refund, RefundStatusHistory
from .serializers import RefundSerializer
from apps.catalog.models import Product


class RefundViewSet(viewsets.ModelViewSet):
    queryset = Refund.objects.all()
    serializer_class = RefundSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role == 'ADM':
            qs = Refund.objects.all()
            status_filter = self.request.query_params.get('status')
            if status_filter:
                qs = qs.filter(current_status=status_filter)
            return qs
        return Refund.objects.filter(requested_by=self.request.user)

    def create(self, request, *args, **kwargs):
        order_id = request.data.get('order')
        if order_id and Refund.objects.filter(order_id=order_id).exists():
            return Response(
                {'detail': 'A refund request already exists for this order.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(requested_by=self.request.user, current_status='REQUESTED')
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def review(self, request, pk=None):
        if request.user.role != 'ADM':
            return Response({'detail': 'Only admins can review refunds'}, status=status.HTTP_403_FORBIDDEN)

        refund = self.get_object()
        decision = request.data.get('decision')
        remarks = request.data.get('remarks', '')
        refund_method = request.data.get('refund_method')

        if decision not in ('APPROVED', 'REJECTED'):
            return Response({'detail': 'Decision must be APPROVED or REJECTED'}, status=status.HTTP_400_BAD_REQUEST)

        old_status = refund.current_status
        refund.current_status = decision
        refund.admin_remarks = remarks
        refund.reviewed_by = request.user
        refund.reviewed_at = timezone.now()
        if refund_method:
            refund.refund_method = refund_method
        refund.save()

        RefundStatusHistory.objects.create(
            refund=refund,
            from_status=old_status,
            to_status=decision,
            changed_by=request.user,
            remarks=remarks,
        )

        serializer = self.get_serializer(refund)
        return Response(serializer.data)

    @transaction.atomic
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        if request.user.role != 'ADM':
            return Response({'detail': 'Only admins can complete refunds'}, status=status.HTTP_403_FORBIDDEN)

        refund = self.get_object()
        remarks = request.data.get('remarks', '')

        if refund.current_status != 'APPROVED':
            return Response(
                {'detail': 'Only approved refunds can be marked as completed'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── Restore stock for each item in the order ──
        order = refund.order
        for item in order.items.all():
            product = Product.objects.select_for_update().get(id=item.product_id)
            product.stock += item.quantity
            product.save(update_fields=['stock'])

        old_status = refund.current_status
        refund.current_status = 'COMPLETED'
        if remarks:
            refund.admin_remarks = (refund.admin_remarks or '') + ('\n' + remarks if refund.admin_remarks else remarks)
        refund.save()

        RefundStatusHistory.objects.create(
            refund=refund,
            from_status=old_status,
            to_status='COMPLETED',
            changed_by=request.user,
            remarks=remarks,
        )

        serializer = self.get_serializer(refund)
        return Response(serializer.data)
