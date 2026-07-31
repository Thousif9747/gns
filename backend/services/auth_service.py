class AuthService:
    @staticmethod
    def create_user(email, full_name, password, role='CUS', **extra):
        from apps.auth.models import User
        return User.objects.create_user(
            email=email,
            full_name=full_name,
            password=password,
            role=role,
            **extra
        )
