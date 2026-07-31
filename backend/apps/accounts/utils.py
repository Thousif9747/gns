import random
import logging
from django.core.mail import send_mail
from django.conf import settings
from .models import EmailOTP
from apps.notifications.sms_service import send_sms

logger = logging.getLogger(__name__)

def generate_otp():
    """Generate a 6-digit OTP."""
    return str(random.randint(100000, 999999))

def send_otp_email(email, otp, purpose):
    """Send OTP via email. In dev mode, logs to console via console backend."""
    purpose_labels = {
        'verify_email': 'Email Verification',
        'verify_phone': 'Phone Verification',
        'reset_password': 'Password Reset',
        'change_password': 'Password Change',
        'change_phone': 'Phone Number Change',
    }
    label = purpose_labels.get(purpose, 'OTP')
    subject = f'GNS - {label}'
    message = f'''Hello,

Your {label.lower()} OTP code is: {otp}

This code is valid for 10 minutes. If you did not request this, please ignore this email.

Thank you,
GNS Team'''
    
    try:
        send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [email])
        logger.info(f'OTP email sent to {email} for purpose {purpose}')
    except Exception as e:
        logger.error(f'Failed to send OTP email to {email}: {e}')
        pass

def send_otp_sms(phone, otp, purpose):
    """Send OTP via SMS."""
    purpose_labels = {
        'verify_email': 'Email Verification',
        'verify_phone': 'Phone Verification',
        'reset_password': 'Password Reset',
        'change_password': 'Password Change',
        'change_phone': 'Phone Number Change',
    }
    label = purpose_labels.get(purpose, 'OTP')
    message = f'GNS - {label} OTP: {otp}. Valid for 10 minutes.'
    logger.info(f'send_otp_sms called: phone={phone}, purpose={purpose}')
    send_sms(phone, message)

def create_and_send_otp(email=None, phone=None, purpose=None, metadata=None, channel='email'):
    """
    Generate OTP, save to DB, and send via email or SMS.
    Either email or phone must be provided depending on channel.
    Returns the OTP object.
    """
    # Invalidate any previous unused OTPs for same identifier + purpose
    if channel == 'email' and email:
        EmailOTP.objects.filter(email=email, purpose=purpose, is_used=False).update(is_used=True)
    elif channel == 'phone' and phone:
        EmailOTP.objects.filter(phone=phone, purpose=purpose, is_used=False).update(is_used=True)

    otp_code = generate_otp()
    otp_obj = EmailOTP.objects.create(
        email=email or '',
        phone=phone or '',
        otp=otp_code,
        channel=channel,
        purpose=purpose,
        metadata=metadata or {},
    )

    if settings.TEST_OTP_ENABLED and channel == 'phone':
        logger.warning('TEST_OTP_ENABLED: SMS delivery skipped for phone OTP')
    elif channel == 'phone':
        send_otp_sms(phone, otp_code, purpose)
    else:
        send_otp_email(email, otp_code, purpose)

    return otp_obj
