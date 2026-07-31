import json
import os

import firebase_admin
from firebase_admin import credentials, messaging
from django.conf import settings


def _get_firebase_app():
    """Initialize and return the Firebase app singleton."""
    if not firebase_admin._apps:
        cred_path = getattr(settings, 'FIREBASE_CREDENTIALS', None)
        if not cred_path or not os.path.exists(cred_path):
            return None
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    return firebase_admin.get_app()


def send_push_notification(tokens, title, message, data=None):
    """
    Send a Firebase Cloud Messaging push notification to one or more devices.

    Args:
        tokens (list[str]): List of FCM device tokens to send to.
        title (str): Notification title.
        message (str): Notification body.
        data (dict, optional): Custom data payload for deep linking.

    Returns:
        tuple: (success_count, failed_tokens)
            - success_count (int): Number of successful deliveries.
            - failed_tokens (list[str]): Tokens that are invalid/unregistered.
    """
    app = _get_firebase_app()
    if app is None:
        return 0, []

    if isinstance(tokens, str):
        tokens = [tokens]

    success_count = 0
    failed_tokens = []

    for token in tokens:
        try:
            msg = messaging.Message(
                notification=messaging.Notification(
                    title=title,
                    body=message,
                ),
                data={k: str(v) for k, v in (data or {}).items()},
                token=token,
            )
            messaging.send(msg, app=app)
            success_count += 1
        except messaging.UnregisteredError:
            # Token is no longer valid — should be removed from DB
            failed_tokens.append(token)
        except messaging.InvalidArgumentError:
            # Malformed token — should be removed
            failed_tokens.append(token)
        except messaging.SenderIdMismatchError:
            # Token belongs to a different project — should be removed
            failed_tokens.append(token)
        except Exception:
            # Temporary failure (network, quota, etc.) — skip, don't remove
            pass

    return success_count, failed_tokens


def send_push_to_user(user, title, message, data=None):
    """
    Send push notification to all devices of a user.

    Queries the user's DeviceToken records, sends to each,
    and auto-cleans any invalid tokens.

    Args:
        user: User model instance.
        title (str): Notification title.
        message (str): Notification body.
        data (dict, optional): Custom data payload.

    Returns:
        int: Number of successful deliveries.
    """
    from apps.accounts.models import DeviceToken

    tokens = list(
        DeviceToken.objects.filter(user=user)
        .values_list('token', flat=True)
    )
    if not tokens:
        return 0

    success_count, failed_tokens = send_push_notification(
        tokens, title, message, data,
    )

    # Clean up invalid tokens
    if failed_tokens:
        DeviceToken.objects.filter(token__in=failed_tokens).delete()

    return success_count
