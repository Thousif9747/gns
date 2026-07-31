from django.test import TestCase, override_settings
from django.core import mail
from unittest.mock import Mock, patch

from apps.notifications.email_service import (
    send_order_email, _build_email_body, _build_order_items_text,
    STATUS_EMAIL_SUBJECTS, STATUS_MESSAGES,
)


def _make_mock_order(email='customer@example.com'):
    item = Mock(
        product_name='Test Product',
        product_id='p1',
        unit_price='1000.00',
        quantity=2,
        line_total='2000.00',
    )
    user = Mock(email=email)
    order = Mock(
        order_number='ORD-001',
        user=user,
        total_amount='2000.00',
        id='order-uuid-123',
    )
    order.items.all.return_value = [item]
    order.get_current_status_display.return_value = 'Pending'
    return order


class BuildHelpersTests(TestCase):
    def test_build_order_items_text(self):
        order = _make_mock_order()
        text = _build_order_items_text(order)
        self.assertIn('Test Product', text)
        self.assertIn('₹1,000', text)
        self.assertIn('₹2,000', text)

    def test_build_email_body_contains_status_message(self):
        for status in STATUS_MESSAGES:
            order = _make_mock_order()
            body = _build_email_body(order, status)
            self.assertIn(STATUS_MESSAGES[status].strip()[:20], body)
            self.assertIn(order.order_number, body)
            self.assertIn('Grow Nest Team', body)


class SendOrderEmailTests(TestCase):
    def test_sends_email_to_correct_address(self):
        order = _make_mock_order('alice@test.com')
        send_order_email(order, 'PENDING')
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ['alice@test.com'])

    def test_subject_uses_correct_template(self):
        order = _make_mock_order()
        send_order_email(order, 'SHIPPED')
        subject = mail.outbox[0].subject
        self.assertIn('Order Shipped', subject)
        self.assertIn(order.order_number, subject)

    @override_settings(DEFAULT_FROM_EMAIL='shop@gns.com')
    def test_from_address_uses_settings(self):
        order = _make_mock_order()
        send_order_email(order, 'PENDING')
        self.assertEqual(mail.outbox[0].from_email, 'shop@gns.com')

    def test_missing_email_logs_warning_no_crash(self):
        order = _make_mock_order(email=None)
        send_order_email(order, 'PENDING')
        self.assertEqual(len(mail.outbox), 0)

    def test_missing_email_attribute_no_crash(self):
        order = _make_mock_order()
        del order.user.email
        send_order_email(order, 'PENDING')
        self.assertEqual(len(mail.outbox), 0)

    def test_smtp_failure_no_crash(self):
        order = _make_mock_order()
        with patch('apps.notifications.email_service.send_mail', side_effect=ConnectionError('SMTP down')):
            send_order_email(order, 'PENDING')
        self.assertEqual(len(mail.outbox), 0)

    def test_all_statuses_send_successfully(self):
        for status in STATUS_EMAIL_SUBJECTS:
            order = _make_mock_order()
            send_order_email(order, status)
            self.assertEqual(len(mail.outbox), 1)
            subject = mail.outbox[0].subject
            expected_prefix = STATUS_EMAIL_SUBJECTS[status].split(' - ')[0]
            self.assertIn(expected_prefix, subject)
            mail.outbox.clear()

    def test_unknown_status_uses_fallback_subject(self):
        order = _make_mock_order()
        send_order_email(order, 'UNKNOWN_STATUS')
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('Order Update', mail.outbox[0].subject)

    def test_recipient_email_override_used(self):
        order = _make_mock_order(email='original@test.com')
        send_order_email(order, 'PENDING', recipient_email='override@test.com')
        self.assertEqual(mail.outbox[0].to, ['override@test.com'])

    def test_body_contains_items_and_totals(self):
        order = _make_mock_order()
        send_order_email(order, 'DELIVERED')
        body = mail.outbox[0].body
        self.assertIn('ORD-001', body)
        self.assertIn('₹2,000', body)
        self.assertIn('Test Product', body)


class SignalTriggerEmailTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        from apps.orders.models import Order, OrderStatusHistory

        cls.user = User.objects.create_user(
            email='testuser@example.com',
            password='testpass123',
            role='CUS',
        )
        cls.order = Order.objects.create(
            user=cls.user,
            order_number='ORD-TEST-001',
            total_amount='1500.00',
            subtotal='1500.00',
            shipping_full_name='Test User',
            shipping_phone='9000000000',
            shipping_address_line1='123 Test St',
            shipping_city='Test City',
            shipping_state='Test State',
            shipping_postal_code='123456',
            shipping_country='India',
        )

    @patch('apps.notifications.signals.send_order_email')
    @patch('apps.notifications.signals.create_notification')
    def test_signal_calls_email_service(self, mock_create_notif, mock_send_email):
        from apps.orders.models import OrderStatusHistory

        history = OrderStatusHistory.objects.create(
            order=self.order,
            from_status='PENDING',
            to_status='SHIPPED',
            changed_by=self.user,
        )
        mock_send_email.assert_called_once_with(self.order, 'SHIPPED')

    @patch('apps.notifications.signals.send_order_email')
    @patch('apps.notifications.signals.create_notification')
    def test_signal_skips_when_not_created(self, mock_create_notif, mock_send_email):
        from apps.orders.models import OrderStatusHistory

        history = OrderStatusHistory(
            order=self.order,
            from_status='PENDING',
            to_status='SHIPPED',
            changed_by=self.user,
        )
        from django.db.models.signals import post_save
        post_save.send(OrderStatusHistory, instance=history, created=False)
        mock_send_email.assert_not_called()
