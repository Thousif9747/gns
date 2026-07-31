import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

JOIN_SEND_URL = 'https://joinjoaomgcd.appspot.com/_ah/api/messaging/v1/sendPush'


def send_sms(phone_number, message):
    """
    Send an SMS via Join by joaoapps (FCM push relay).
    The app on the phone receives the push and sends the SMS from its SIM.
    In development (no credentials), logs to console.
    """
    device_id = settings.JOIN_DEVICE_ID
    api_key = settings.JOIN_API_KEY

    if not device_id or not api_key:
        logger.info(f'[SMS] To: {phone_number} | Message: {message}')
        return

    params = {
        'deviceId': device_id,
        'apikey': api_key,
        'smsnumber': phone_number,
        'smstext': message,
    }

    try:
        logger.info(f'Sending SMS via Join to {phone_number}')
        response = requests.get(JOIN_SEND_URL, params=params, timeout=10)
        data = response.json()
        if data.get('success'):
            logger.info(f'SMS sent successfully to {phone_number}')
        else:
            logger.error(f'Join API error: {data}')
    except Exception as e:
        logger.error(f'Failed to send SMS: {e}')
