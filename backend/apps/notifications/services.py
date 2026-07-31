import logging
from typing import Optional

from django.db import transaction

from .models import Notification

logger = logging.getLogger(__name__)


def _get_notification_title(order, status: str) -> str:
    return f'Order #{order.order_number}'


def _get_notification_type(status: str) -> str:
    mapping = {
        'PENDING': 'ORDER_PLACED',
        'PAYMENT_UPLOADED': 'PAYMENT_UPLOADED',
        'PAYMENT_APPROVED': 'PAYMENT_APPROVED',
        'PAYMENT_REJECTED': 'PAYMENT_REJECTED',
        'PROCESSING': 'ORDER_PROCESSING',
        'SHIPPED': 'ORDER_SHIPPED',
        'DELIVERED': 'ORDER_DELIVERED',
        'CANCELLED': 'ORDER_CANCELLED',
    }
    return mapping.get(status, 'ORDER_PLACED')


def _get_notification_message(order, status: str) -> str:
    messages = {
        'PENDING': f'Your order #{order.order_number} has been placed successfully',
        'PAYMENT_UPLOADED': f'Payment receipt uploaded for order #{order.order_number}',
        'PAYMENT_APPROVED': f'Payment approved for order #{order.order_number}',
        'PAYMENT_REJECTED': f'Payment rejected for order #{order.order_number}',
        'PROCESSING': f'Order #{order.order_number} is now being processed',
        'SHIPPED': f'Order #{order.order_number} has been shipped',
        'DELIVERED': f'Order #{order.order_number} has been delivered',
        'CANCELLED': f'Order #{order.order_number} has been cancelled',
    }
    return messages.get(status, f'Order #{order.order_number} status updated to {status}')


def _get_redirect_url(order) -> str:
    return f'/orders/{order.id}'


def _send_fcm_push(user, title, message, notification_type, order_id, redirect_url):
    """Send Firebase push notification asynchronously after DB commit."""
    try:
        from integrations.firebase import send_push_to_user
        send_push_to_user(
            user=user,
            title=title,
            message=message,
            data={
                'type': notification_type,
                'order_id': str(order_id),
                'redirect_url': redirect_url,
            },
        )
    except Exception:
        # Firebase failure should never break the order flow
        pass


def create_notification(order, status: str) -> Optional[Notification]:
    user = order.user
    notification_type = _get_notification_type(status)
    title = _get_notification_title(order, status)
    message = _get_notification_message(order, status)
    redirect_url = _get_redirect_url(order)

    logger.debug(
        'create_notification called: order=%s, status=%s, user=%s, type=%s',
        order.order_number, status, user.email, notification_type,
    )

    with transaction.atomic():
        existing = Notification.objects.filter(
            user=user,
            notification_type=notification_type,
            order_id=str(order.id),
        ).exists()

        if existing:
            logger.info(
                'Notification skipped — duplicate: order=%s, type=%s, user=%s',
                order.order_number, notification_type, user.email,
            )
            return None

        notification = Notification.objects.create(
            user=user,
            title=title,
            message=message,
            notification_type=notification_type,
            order_id=str(order.id),
            redirect_url=redirect_url,
        )

    logger.info(
        'Notification created: id=%s, type=%s, user=%s, order=%s',
        notification.id, notification_type, user.email, order.order_number,
    )

    # Send Firebase push after the transaction commits successfully.
    # This ensures the notification is persisted before we try to deliver it.
    transaction.on_commit(
        lambda: _send_fcm_push(
            user=user,
            title=title,
            message=message,
            notification_type=notification_type,
            order_id=order.id,
            redirect_url=redirect_url,
        )
    )

    return notification
