import logging

from django.apps import AppConfig

logger = logging.getLogger(__name__)


class NotificationsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.notifications'

    def ready(self):
        logger.info('NotificationsConfig.ready() called — registering signals')
        import apps.notifications.signals  # noqa
        logger.info('Notifications signals registered successfully')
