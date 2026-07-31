from django.test import TestCase
from apps.accounts.models import User, UserProfile


class UserModelTest(TestCase):
    def test_create_customer(self):
        user = User.objects.create_user(
            email='test@example.com',
            password='testpass123'
        )
        self.assertEqual(user.role, 'CUS')
        self.assertTrue(user.is_active)

    def test_create_admin(self):
        admin = User.objects.create_superuser(
            email='admin@example.com',
            password='adminpass123'
        )
        self.assertEqual(admin.role, 'ADM')
        self.assertTrue(admin.is_staff)
        self.assertTrue(admin.is_superuser)

    def test_profile_auto_created(self):
        user = User.objects.create_user(email='p@example.com', password='pass123')
        self.assertTrue(UserProfile.objects.filter(user=user).exists())
        self.assertEqual(user.profile.user, user)
