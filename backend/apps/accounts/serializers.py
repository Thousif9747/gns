from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User, UserProfile, DeviceToken, EmailOTP


USER_PROFILE_FIELDS = {field.name for field in UserProfile._meta.get_fields()}
USER_PROFILE_HAS_AVATAR = 'avatar' in USER_PROFILE_FIELDS


def validate_address(value):
    if not isinstance(value, dict):
        raise serializers.ValidationError('Address must be an object.')
    required = ['address_line1', 'city', 'state', 'postal_code']
    for field in required:
        if not value.get(field):
            raise serializers.ValidationError(f'{field} is required.')
    return value


class AddressSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    address = serializers.CharField(max_length=255)
    city = serializers.CharField(max_length=100)
    state = serializers.CharField(max_length=100)
    postal_code = serializers.CharField(max_length=20)
    country = serializers.CharField(max_length=100, default='India')
    is_primary = serializers.BooleanField(default=False)

    def validate(self, attrs):
        if not attrs.get('country'):
            attrs['country'] = 'India'
        return attrs


class UserProfileSerializer(serializers.ModelSerializer):
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = ['full_name', 'gender', 'date_of_birth', 'gst_number', 'avatar_url', 'addresses'] + (['avatar'] if USER_PROFILE_HAS_AVATAR else [])
        extra_kwargs = {'avatar': {'write_only': True}} if USER_PROFILE_HAS_AVATAR else {}

    def get_avatar_url(self, obj):
        avatar = getattr(obj, 'avatar', None)
        if avatar:
            request = self.context.get('request')
            url = avatar.url
            return request.build_absolute_uri(url) if request else url
        return ''


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'phone', 'phone_verified', 'role', 'is_active', 'email_verified', 'date_joined', 'profile']
        read_only_fields = ['id', 'role', 'is_active', 'email_verified', 'phone_verified', 'date_joined']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, min_length=8)
    full_name = serializers.CharField(max_length=255)
    phone = serializers.CharField(max_length=30, required=False, allow_blank=True)
    accepted_terms = serializers.BooleanField(write_only=True)

    class Meta:
        model = User
        fields = ['email', 'password', 'confirm_password', 'full_name', 'phone', 'accepted_terms']

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return value

    def validate_accepted_terms(self, value):
        if not value:
            raise serializers.ValidationError('You must agree to the Terms of Service and Privacy Policy.')
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('confirm_password'):
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        full_name = validated_data.pop('full_name')
        phone = validated_data.pop('phone', '')
        password = validated_data.pop('password')
        validated_data.pop('accepted_terms', None)
        validated_data['phone'] = phone
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.full_name = full_name
        profile.save()
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=False, allow_blank=True)
    phone = serializers.CharField(max_length=30, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs.get('email')
        phone = attrs.get('phone')
        password = attrs.get('password')

        if not (email or phone):
            raise serializers.ValidationError('Email or phone is required.')
        if not password:
            raise serializers.ValidationError('Password is required.')

        user = None
        if email:
            try:
                user_obj = User.objects.get(email=email)
                if not user_obj.is_active:
                    raise serializers.ValidationError('Account is inactive.')
            except User.DoesNotExist:
                pass
            user = authenticate(request=self.context.get('request'), email=email, password=password)
            if not user:
                raise serializers.ValidationError('Invalid email or password.')
        elif phone:
            user = User.objects.filter(phone=phone).first()
            if user:
                if not user.is_active:
                    raise serializers.ValidationError('Account is inactive.')
                if not user.check_password(password):
                    user = None
            if not user:
                raise serializers.ValidationError('Invalid phone or password.')

        refresh = RefreshToken.for_user(user)
        attrs['refresh'] = str(refresh)
        attrs['access'] = str(refresh.access_token)
        attrs['user'] = user
        return attrs


class ProfileSerializer(serializers.ModelSerializer):
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = ['full_name', 'gender', 'date_of_birth', 'gst_number', 'avatar_url', 'addresses'] + (['avatar'] if USER_PROFILE_HAS_AVATAR else [])
        extra_kwargs = {'avatar': {'write_only': True}} if USER_PROFILE_HAS_AVATAR else {}

    def get_avatar_url(self, obj):
        avatar = getattr(obj, 'avatar', None)
        if avatar:
            request = self.context.get('request')
            url = avatar.url
            return request.build_absolute_uri(url) if request else url
        return ''


class AdminUserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'phone', 'phone_verified', 'role', 'is_active', 'is_staff',
                  'email_verified', 'date_joined', 'updated_at', 'profile']
        read_only_fields = ['id', 'date_joined', 'updated_at']


class CreateUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    full_name = serializers.CharField(max_length=255)
    phone = serializers.CharField(max_length=30, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['email', 'password', 'full_name', 'phone', 'role', 'is_active']

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return value

    def create(self, validated_data):
        full_name = validated_data.pop('full_name', '')
        phone = validated_data.pop('phone', '')
        password = validated_data.pop('password')
        validated_data['phone'] = phone
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.full_name = full_name
        profile.save()
        return user


class DeviceTokenSerializer(serializers.ModelSerializer):
    """Serialize device token registration/update."""

    class Meta:
        model = DeviceToken
        fields = ['token', 'device_type']

    def validate_token(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError('Token is required.')
        return value.strip()

    def create(self, validated_data):
        token = validated_data['token']
        user = self.context['request'].user
        device_type = validated_data.get('device_type', '')

        # Upsert: update existing token or create new one
        obj, created = DeviceToken.objects.update_or_create(
            token=token,
            defaults={
                'user': user,
                'device_type': device_type,
            },
        )
        return obj


class FcmTokenRemoveSerializer(serializers.Serializer):
    """Serialize FCM token removal on logout."""
    token = serializers.CharField(required=False, allow_blank=True)


class SendOtpSerializer(serializers.Serializer):
    email = serializers.EmailField(required=False, allow_blank=True)
    phone = serializers.CharField(max_length=30, required=False, allow_blank=True)
    channel = serializers.ChoiceField(choices=['email', 'phone'], default='email')
    purpose = serializers.ChoiceField(choices=['verify_email', 'verify_phone', 'reset_password', 'change_password', 'change_phone'])

    def validate(self, attrs):
        channel = attrs.get('channel', 'email')
        purpose = attrs.get('purpose')

        if channel == 'email':
            if not attrs.get('email'):
                raise serializers.ValidationError({'email': 'Email is required for email channel.'})
            if purpose in ('reset_password', 'change_password'):
                if not User.objects.filter(email__iexact=attrs['email']).exists():
                    raise serializers.ValidationError({'email': 'No account found with this email address.'})
        elif channel == 'phone':
            if not attrs.get('phone'):
                raise serializers.ValidationError({'phone': 'Phone is required for phone channel.'})
            if purpose in ('reset_password', 'change_password'):
                if not User.objects.filter(phone=attrs['phone']).exists():
                    raise serializers.ValidationError({'phone': 'No account found with this phone number.'})
        return attrs


class VerifyOtpSerializer(serializers.Serializer):
    email = serializers.EmailField(required=False, allow_blank=True)
    phone = serializers.CharField(max_length=30, required=False, allow_blank=True)
    otp = serializers.CharField(max_length=6)
    purpose = serializers.ChoiceField(choices=['verify_email', 'verify_phone', 'reset_password', 'change_password', 'change_phone'])

    def validate(self, attrs):
        purpose = attrs.get('purpose')
        otp_qs = EmailOTP.objects.filter(
            otp=attrs['otp'],
            purpose=purpose,
            is_used=False,
        )

        if attrs.get('email'):
            otp_qs = otp_qs.filter(email=attrs['email'])
        elif attrs.get('phone'):
            otp_qs = otp_qs.filter(phone=attrs['phone'])
        else:
            raise serializers.ValidationError('Either email or phone is required.')

        otp_obj = otp_qs.first()

        if not otp_obj:
            raise serializers.ValidationError('Invalid or expired OTP.')
        if not otp_obj.is_valid():
            otp_obj.is_used = True
            otp_obj.save(update_fields=['is_used'])
            raise serializers.ValidationError('OTP has expired. Please request a new one.')

        attrs['otp_obj'] = otp_obj
        return attrs


class SetPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField(required=False, allow_blank=True)
    phone = serializers.CharField(max_length=30, required=False, allow_blank=True)
    otp = serializers.CharField(max_length=6)
    new_password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, min_length=8)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})

        otp_qs = EmailOTP.objects.filter(
            otp=attrs['otp'],
            purpose__in=['reset_password', 'change_password'],
            is_used=False,
        )

        if attrs.get('email'):
            otp_qs = otp_qs.filter(email=attrs['email'])
        elif attrs.get('phone'):
            otp_qs = otp_qs.filter(phone=attrs['phone'])
        else:
            raise serializers.ValidationError('Either email or phone is required.')

        otp_obj = otp_qs.first()

        if not otp_obj:
            raise serializers.ValidationError('Invalid or expired OTP. Please verify your OTP first.')
        if not otp_obj.is_valid():
            otp_obj.is_used = True
            otp_obj.save(update_fields=['is_used'])
            raise serializers.ValidationError('OTP has expired. Please request a new one.')

        attrs['otp_obj'] = otp_obj
        return attrs


class UpdatePhoneSerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=30)
    otp = serializers.CharField(max_length=6)
