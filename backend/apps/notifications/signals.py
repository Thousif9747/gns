import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.orders.models import OrderStatusHistory

from .services import create_notification
from .email_service import send_order_email

logger = logging.getLogger(__name__)


@receiver(post_save, sender=OrderStatusHistory)
def handle_order_status_change(sender, instance, created, **kwargs):
    """Create a notification when OrderStatusHistory is created.

    This fires when:
    - An order is placed (initial PENDING status history)
    - An admin updates the order status via update_status action
    """
    if not created:
        return

    order = instance.order
    new_status = instance.to_status

    logger.info(
        'Signal fired: OrderStatusHistory #%s for order %s → status=%s, user=%s',
        instance.id, order.order_number, new_status, order.user.email,
    )

    try:
        notification = create_notification(order, new_status)
        if notification:
            logger.info(
                'Notification created: id=%s, type=%s, user=%s',
                notification.id, notification.notification_type, notification.user.email,
            )
        else:
            logger.info(
                'Notification skipped (duplicate or error): order=%s, status=%s',
                order.order_number, new_status,
            )
    except Exception as e:
        logger.error(
            'Notification creation failed for order %s status %s: %s',
            order.order_number, new_status, e,
        )

    try:
        send_order_email(order, new_status)
    except Exception as e:
        logger.error(
            'Email sending failed for order %s status %s: %s',
            order.order_number, new_status, e,
        )
