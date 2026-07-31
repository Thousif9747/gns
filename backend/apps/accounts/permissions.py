from rest_framework.permissions import BasePermission


class IsAdminRole(BasePermission):
    """Allow application admins as well as Django staff/superusers."""

    message = 'Administrator access is required.'

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (
                getattr(user, 'role', None) == 'ADM'
                or user.is_staff
                or user.is_superuser
            )
        )
