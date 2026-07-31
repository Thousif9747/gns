import logging
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)

STATUS_EMAIL_SUBJECTS = {
    'PENDING': 'Order Confirmed - {order_number}',
    'PAYMENT_UPLOADED': 'Payment Uploaded - {order_number}',
    'PAYMENT_APPROVED': 'Payment Approved - {order_number}',
    'PAYMENT_REJECTED': 'Payment Rejected - {order_number}',
    'PROCESSING': 'Order Processing - {order_number}',
    'SHIPPED': 'Order Shipped - {order_number}',
    'DELIVERED': 'Order Delivered - {order_number}',
    'CANCELLED': 'Order Cancelled - {order_number}',
}

STATUS_MESSAGES = {
    'PENDING': (
        'Your order has been placed successfully!\n\n'
        'We have received your order and it is now being reviewed. '
        'You will receive updates as your order progresses.\n'
    ),
    'PAYMENT_UPLOADED': (
        'Your payment proof has been received.\n\n'
        'Our team is reviewing your payment. This usually takes a few hours. '
        'We will notify you once it is approved.\n'
    ),
    'PAYMENT_APPROVED': (
        'Your payment has been approved!\n\n'
        'Thank you! Your payment is confirmed. Your order will be processed shortly.\n'
    ),
    'PAYMENT_REJECTED': (
        'Your payment was not approved.\n\n'
        'Unfortunately, your payment proof could not be verified. '
        'Please log in to your account and upload a clear screenshot or receipt.\n'
    ),
    'PROCESSING': (
        'Your order is now being processed!\n\n'
        'Our team has started preparing your items. '
        'We will notify you once it is shipped.\n'
    ),
    'SHIPPED': (
        'Your order has been shipped!\n\n'
        'Your items are on their way! Please track your order for the latest updates.\n'
    ),
    'DELIVERED': (
        'Your order has been delivered!\n\n'
        'We hope you love your products! If you have any feedback, '
        'please leave a review on our platform.\n'
    ),
    'CANCELLED': (
        'Your order has been cancelled.\n\n'
        'If you have any questions regarding the cancellation, '
        'please contact our support team.\n'
    ),
}


def _build_order_items_text(order):
    """Build a plain-text summary of order items."""
    lines = []
    for item in order.items.all():
        product_name = item.product_name or f'Product #{item.product_id}'
        unit_price = float(item.unit_price or 0)
        qty = item.quantity or 0
        line_total = float(item.line_total or 0)
        lines.append(f'  {product_name} x {qty}  @ ₹{unit_price:,.0f}  =  ₹{line_total:,.0f}')
    return '\n'.join(lines)


def _build_email_body(order, status):
    """Build the full plain-text email body."""
    status_msg = STATUS_MESSAGES.get(status, 'Your order status has been updated.')
    items_text = _build_order_items_text(order)
    total = float(order.total_amount)

    body = f"""Dear Customer,

{status_msg}

━━━━━━━━━━━━━━━━━━━━━━━━━
Order Summary
━━━━━━━━━━━━━━━━━━━━━━━━━
Order Number: {order.order_number}
Status:       {order.get_current_status_display()}
Total Amount: ₹{total:,.0f}

Items:
{items_text}

━━━━━━━━━━━━━━━━━━━━━━━━━

For real-time updates, log in to your account and track your order.

Thank you for choosing GNS!
Grow Nest Team
"""
    return body


def send_order_email(order, status, recipient_email=None):
    """
    Send an order status email notification.

    Args:
        order: Order model instance
        status: Status string (e.g. 'PENDING', 'SHIPPED')
        recipient_email: Optional override; defaults to order.user.email
    """
    if not recipient_email:
        recipient_email = getattr(order.user, 'email', None)
    if not recipient_email:
        logger.warning('No recipient email for order %s status %s', order.order_number, status)
        return

    subject_template = STATUS_EMAIL_SUBJECTS.get(status, 'Order Update - {order_number}')
    subject = subject_template.format(order_number=order.order_number)
    message = _build_email_body(order, status)

    try:
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [recipient_email],
            fail_silently=False,
        )
        logger.info('Order email sent to %s for order %s (status: %s)', recipient_email, order.order_number, status)
    except Exception as e:
        logger.error('Failed to send order email to %s for order %s: %s', recipient_email, order.order_number, e)
