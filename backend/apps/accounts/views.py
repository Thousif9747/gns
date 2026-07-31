import uuid
from django.conf import settings
from rest_framework import permissions, viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.views import TokenRefreshView as BaseTokenRefreshView
from .models import User, UserProfile, DeviceToken
from .serializers import (
    UserSerializer, RegisterSerializer, LoginSerializer,
    ProfileSerializer, AdminUserSerializer, CreateUserSerializer,
    AddressSerializer, DeviceTokenSerializer, FcmTokenRemoveSerializer,
    SendOtpSerializer, VerifyOtpSerializer, SetPasswordSerializer,
    UpdatePhoneSerializer,
)


class TokenRefreshView(BaseTokenRefreshView):
    throttle_scope = 'refresh'


class RegisterView(APIView):
    """Step 1: Validate registration data and send OTP. User is NOT created yet."""
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'register'

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        password = serializer.validated_data['password']
        full_name = serializer.validated_data['full_name']
        phone = serializer.validated_data.get('phone', '')
        channel = request.data.get('channel', 'email')
        
        # Hash password before storing in metadata
        from django.contrib.auth.hashers import make_password
        hashed_pw = make_password(password)
        
        # Store registration data in OTP metadata, send OTP
        from django.utils import timezone
        from .utils import create_and_send_otp
        
        metadata = {
            'full_name': full_name,
            'email': email,
            'password_hash': hashed_pw,
            'registration_data': True,
            'accepted_terms': serializer.validated_data.get('accepted_terms', False),
            'terms_accepted_at': timezone.now().isoformat() if serializer.validated_data.get('accepted_terms') else None,
        }
        
        if channel == 'phone' and phone:
            metadata['phone'] = phone
            otp_obj = create_and_send_otp(
                phone=phone,
                purpose='verify_phone',
                channel='phone',
                metadata=metadata,
            )
            response_data = {
                'detail': 'OTP sent to your phone. Please verify to complete registration.',
                'phone': phone,
                'channel': 'phone',
            }
            if settings.TEST_OTP_ENABLED:
                response_data['test_otp'] = otp_obj.otp
            return Response(response_data, status=status.HTTP_200_OK)
        else:
            metadata['phone'] = phone
            otp_obj = create_and_send_otp(
                email=email,
                purpose='verify_email',
                metadata=metadata,
            )
            response_data = {
                'detail': 'OTP sent to your email. Please verify to complete registration.',
                'email': email,
                'channel': 'email',
            }
            if settings.TEST_OTP_ENABLED:
                response_data['test_otp'] = otp_obj.otp
            return Response(response_data, status=status.HTTP_200_OK)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'login'

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        return Response({
            'access': serializer.validated_data['access'],
            'refresh': serializer.validated_data['refresh'],
            'user': UserSerializer(serializer.validated_data['user']).data,
        })


class LogoutView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'logout'

    def post(self, request):
        token = request.data.get('refresh')
        if not token:
            return Response({'detail': 'Refresh token is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            RefreshToken(token).blacklist()
        except TokenError:
            pass
        return Response({'detail': 'Logged out successfully.'}, status=status.HTTP_200_OK)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'profile':
            return ProfileSerializer
        if self.action == 'create':
            return CreateUserSerializer
        if self.request.user.role == 'ADM':
            return AdminUserSerializer
        return UserSerializer

    def get_queryset(self):
        if self.request.user.role == 'ADM':
            qs = User.objects.all()
            role = self.request.query_params.get('role')
            if role:
                qs = qs.filter(role=role)
            email = self.request.query_params.get('email')
            if email:
                qs = qs.filter(email__iexact=email)
            return qs
        return User.objects.filter(id=self.request.user.id)

    def create(self, request, *args, **kwargs):
        if request.user.role != 'ADM':
            return Response({'detail': 'Only admins can create users.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(AdminUserSerializer(user, context={'request': request}).data, status=status.HTTP_201_CREATED)

    def get_profile_or_create(self, user):
        profile, _ = UserProfile.objects.get_or_create(user=user)
        return profile

    @action(detail=False, methods=['get', 'patch'])
    def profile(self, request):
        profile = self.get_profile_or_create(request.user)
        user = request.user
        if request.method == 'GET':
            profile_data = ProfileSerializer(profile, context={'request': request}).data
            return Response({
                'email': user.email,
                'phone': user.phone,
                'phone_verified': user.phone_verified,
                'role': user.role,
                'email_verified': user.email_verified,
                'date_joined': user.date_joined,
                **profile_data,
            })
        serializer = self.get_serializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        profile_data = ProfileSerializer(profile).data
        return Response({
            'email': user.email,
            'phone': user.phone,
            'phone_verified': user.phone_verified,
            'role': user.role,
            'email_verified': user.email_verified,
            'date_joined': user.date_joined,
            **profile_data,
        })

    @action(detail=True, methods=['patch'])
    def update_profile(self, request, pk=None):
        """Admin-only: update any user's profile fields (e.g. gst_number)."""
        if request.user.role != 'ADM':
            return Response({'detail': 'Only admins can update other users profiles'}, status=status.HTTP_403_FORBIDDEN)
        target_user = self.get_object()
        profile, _ = UserProfile.objects.get_or_create(user=target_user)
        serializer = ProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def addresses(self, request):
        profile = self.get_profile_or_create(request.user)
        return Response(profile.addresses)

    @action(detail=False, methods=['post'])
    def add_address(self, request):
        profile = self.get_profile_or_create(request.user)
        serializer = AddressSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        address = serializer.validated_data
        address['id'] = str(uuid.uuid4())
        if not profile.addresses:
            address['is_primary'] = True
        elif address.get('is_primary'):
            for a in profile.addresses:
                a['is_primary'] = False
        profile.addresses.append(address)
        profile.save(update_fields=['addresses'])
        return Response(address, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['patch'])
    def update_address(self, request):
        address_id = request.data.get('id')
        if not address_id:
            return Response({'detail': 'Address id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        profile = self.get_profile_or_create(request.user)
        for i, a in enumerate(profile.addresses):
            if a.get('id') == address_id:
                serializer = AddressSerializer(data={**a, **request.data})
                serializer.is_valid(raise_exception=True)
                updated = serializer.validated_data
                updated['id'] = address_id
                if updated.get('is_primary'):
                    for other in profile.addresses:
                        other['is_primary'] = False
                profile.addresses[i] = updated
                if updated.get('is_primary'):
                    profile.addresses[i]['is_primary'] = True
                profile.save(update_fields=['addresses'])
                return Response(profile.addresses[i])
        return Response({'detail': 'Address not found.'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['delete'])
    def delete_address(self, request):
        address_id = request.query_params.get('id') or request.data.get('id')
        if not address_id:
            return Response({'detail': 'Address id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        profile = self.get_profile_or_create(request.user)
        was_primary = False
        new_addrs = []
        for a in profile.addresses:
            if a.get('id') == address_id:
                was_primary = a.get('is_primary', False)
            else:
                new_addrs.append(a)
        if len(new_addrs) == len(profile.addresses):
            return Response({'detail': 'Address not found.'}, status=status.HTTP_404_NOT_FOUND)
        if was_primary and new_addrs:
            new_addrs[0]['is_primary'] = True
        profile.addresses = new_addrs
        profile.save(update_fields=['addresses'])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['post'])
    def set_primary_address(self, request):
        address_id = request.data.get('id')
        if not address_id:
            return Response({'detail': 'Address id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        profile = self.get_profile_or_create(request.user)
        found = False
        for a in profile.addresses:
            if a.get('id') == address_id:
                a['is_primary'] = True
                found = True
            else:
                a['is_primary'] = False
        if not found:
            return Response({'detail': 'Address not found.'}, status=status.HTTP_404_NOT_FOUND)
        profile.save(update_fields=['addresses'])
        return Response(profile.addresses)

    @action(detail=False, methods=['post'])
    def update_phone(self, request):
        """Change phone number with SMS OTP verification."""
        serializer = UpdatePhoneSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_phone = serializer.validated_data['phone']
        otp = serializer.validated_data['otp']

        # Verify OTP for change_phone purpose
        otp_obj = EmailOTP.objects.filter(
            phone=new_phone,
            otp=otp,
            purpose='change_phone',
            is_used=False,
        ).first()

        if not otp_obj:
            return Response({'detail': 'Invalid or expired OTP.'}, status=status.HTTP_400_BAD_REQUEST)
        if not otp_obj.is_valid():
            otp_obj.is_used = True
            otp_obj.save(update_fields=['is_used'])
            return Response({'detail': 'OTP has expired. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check if phone already taken
        if User.objects.filter(phone=new_phone).exclude(id=request.user.id).exists():
            return Response({'detail': 'This phone number is already in use.'}, status=status.HTTP_400_BAD_REQUEST)

        request.user.phone = new_phone
        request.user.phone_verified = True
        request.user.save(update_fields=['phone', 'phone_verified'])

        otp_obj.is_used = True
        otp_obj.save(update_fields=['is_used'])

        return Response({'detail': 'Phone number updated and verified.', 'phone': new_phone, 'phone_verified': True})

    @action(detail=False, methods=['post'])
    def update_fcm_token(self, request):
        """Register or update an FCM device token for push notifications."""
        serializer = DeviceTokenSerializer(
            data=request.data,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'status': 'token registered'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def remove_fcm_token(self, request):
        """Remove an FCM device token (e.g. on logout)."""
        serializer = FcmTokenRemoveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token = serializer.validated_data.get('token')

        if token:
            DeviceToken.objects.filter(token=token).delete()
        else:
            # Remove all tokens for this user (full logout from all devices)
            DeviceToken.objects.filter(user=request.user).delete()

        return Response({'status': 'token removed'}, status=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        if request.user.role != 'ADM':
            return Response({'detail': 'Only admins can delete users.'}, status=status.HTTP_403_FORBIDDEN)
        user = self.get_object()
        user.is_active = False
        user.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        if request.user.role != 'ADM':
            return Response({'detail': 'Only admins can toggle user status.'}, status=status.HTTP_403_FORBIDDEN)
        user = self.get_object()
        user.is_active = not user.is_active
        user.save(update_fields=['is_active'])
        return Response({'is_active': user.is_active})


from .utils import create_and_send_otp
from .models import EmailOTP


class SendOtpView(APIView):
    """Send OTP via email or SMS for verification, password reset, or password change."""
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'send_otp'

    def post(self, request):
        serializer = SendOtpSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data.get('email', '')
        phone = serializer.validated_data.get('phone', '')
        channel = serializer.validated_data.get('channel', 'email')
        purpose = serializer.validated_data['purpose']
        
        otp_obj = create_and_send_otp(
            email=email or None,
            phone=phone or None,
            purpose=purpose,
            channel=channel,
        )
        
        response_data = {
            'detail': 'OTP sent to your phone.' if channel == 'phone' else 'OTP sent to your email.',
        }
        if settings.TEST_OTP_ENABLED:
            response_data['test_otp'] = otp_obj.otp
        return Response(response_data, status=status.HTTP_200_OK)


class VerifyOtpView(APIView):
    """Verify OTP for email/phone verification or password reset step 1."""
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'verify_otp'

    def post(self, request):
        serializer = VerifyOtpSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        otp_obj = serializer.validated_data['otp_obj']
        purpose = serializer.validated_data['purpose']
        email = serializer.validated_data.get('email', '')
        phone = serializer.validated_data.get('phone', '')
        
        if purpose in ('verify_email', 'verify_phone'):
            # Mark OTP as used
            otp_obj.is_used = True
            otp_obj.save(update_fields=['is_used'])
            
            if email:
                try:
                    user = User.objects.get(email=email)
                    user.email_verified = True
                    user.save(update_fields=['email_verified'])
                    return Response({'detail': 'Email verified successfully.', 'email_verified': True})
                except User.DoesNotExist:
                    return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
            elif phone:
                try:
                    user = User.objects.get(phone=phone)
                    user.phone_verified = True
                    user.save(update_fields=['phone_verified'])
                    return Response({'detail': 'Phone verified successfully.', 'phone_verified': True})
                except User.DoesNotExist:
                    return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        # For reset_password / change_password / change_phone — OTP is verified
        return Response({
            'detail': 'OTP verified successfully.',
            'verified': True,
            'purpose': purpose,
        })


class SetPasswordView(APIView):
    """Set a new password after OTP verification (forgot password / change password)."""
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'set_password'

    def post(self, request):
        serializer = SetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        otp_obj = serializer.validated_data['otp_obj']
        email = serializer.validated_data.get('email', '')
        phone = serializer.validated_data.get('phone', '')
        new_password = serializer.validated_data['new_password']
        
        # Mark OTP as used (if not already by VerifyOtpView — this is a second validation)
        if not otp_obj.is_used:
            otp_obj.is_used = True
            otp_obj.save(update_fields=['is_used'])
        
        try:
            if email:
                user = User.objects.get(email=email)
            elif phone:
                user = User.objects.get(phone=phone)
            else:
                return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
            user.set_password(new_password)
            user.save(update_fields=['password'])
            return Response({'detail': 'Password updated successfully.'})
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)


class CompleteRegistrationView(APIView):
    """Step 2: Verify OTP and create the user account."""
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'register'

    def post(self, request):
        email = request.data.get('email', '')
        phone = request.data.get('phone', '')
        otp = request.data.get('otp')

        if not otp:
            return Response({'detail': 'OTP is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not email and not phone:
            return Response({'detail': 'Email or phone is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Find the OTP record
        otp_qs = EmailOTP.objects.filter(otp=otp, purpose__in=['verify_email', 'verify_phone'], is_used=False)
        if email:
            otp_qs = otp_qs.filter(email=email)
        elif phone:
            otp_qs = otp_qs.filter(phone=phone)

        otp_obj = otp_qs.first()

        if not otp_obj:
            return Response({'detail': 'Invalid or expired OTP.'}, status=status.HTTP_400_BAD_REQUEST)

        if not otp_obj.is_valid():
            otp_obj.is_used = True
            otp_obj.save(update_fields=['is_used'])
            return Response({'detail': 'OTP has expired. Please register again.'}, status=status.HTTP_400_BAD_REQUEST)

        # Extract registration data from metadata
        metadata = otp_obj.metadata or {}
        if not metadata.get('registration_data'):
            return Response({'detail': 'No pending registration found. Please register again.'}, status=status.HTTP_400_BAD_REQUEST)

        full_name = metadata.get('full_name', '')
        profile_phone = metadata.get('phone', '')
        reg_email = metadata.get('email', '')
        password_hash = metadata.get('password_hash', '')

        if not password_hash:
            return Response({'detail': 'Invalid registration data. Please register again.'}, status=status.HTTP_400_BAD_REQUEST)

        # Determine the email to use
        user_email = email or reg_email
        if not user_email:
            return Response({'detail': 'Email not found in registration data.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check if user already exists
        if User.objects.filter(email__iexact=user_email).exists():
            otp_obj.is_used = True
            otp_obj.save(update_fields=['is_used'])
            return Response({'detail': 'An account with this email already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        # Create the user
        is_phone_verified = otp_obj.channel == 'phone'
        user = User(
            email=user_email,
            phone=profile_phone or phone,
            phone_verified=is_phone_verified,
            password=password_hash,
            email_verified=not is_phone_verified,
            accepted_terms=metadata.get('accepted_terms', False),
        )
        terms_accepted_at = metadata.get('terms_accepted_at')
        if terms_accepted_at:
            from django.utils.dateparse import parse_datetime
            parsed = parse_datetime(terms_accepted_at)
            if parsed:
                user.terms_accepted_at = parsed
        user.save()

        # Create profile
        from .models import UserProfile
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.full_name = full_name
        profile.save()

        # Mark OTP as used
        otp_obj.is_used = True
        otp_obj.save(update_fields=['is_used'])

        return Response({
            'detail': 'Registration complete! You can now login.',
            'email_verified': not is_phone_verified,
            'phone_verified': is_phone_verified,
        }, status=status.HTTP_201_CREATED)
