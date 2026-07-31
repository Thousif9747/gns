from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, UserProfile, EmailOTP


class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    inlines = [UserProfileInline]
    readonly_fields = ('last_login', 'date_joined')
    list_display = ['email', 'role', 'profile_full_name', 'phone', 'phone_verified', 'is_active', 'email_verified', 'date_joined']
    list_filter = ['role', 'is_active', 'email_verified', 'phone_verified']
    search_fields = ['email', 'profile__full_name', 'phone']
    ordering = ['-date_joined']
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal Info', {'fields': ('phone', 'phone_verified')}),
        ('Permissions', {'fields': ('role', 'is_active', 'is_staff', 'is_superuser', 'email_verified')}),
        ('Important Dates', {'fields': ('last_login', 'date_joined')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2', 'role', 'phone'),
        }),
    )

    def profile_full_name(self, obj):
        return obj.profile.full_name if hasattr(obj, 'profile') else ''
    profile_full_name.short_description = 'Full Name'


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'full_name', 'address_count']
    search_fields = ['full_name', 'user__email']

    def address_count(self, obj):
        return len(obj.addresses or [])
    address_count.short_description = 'Addresses'


@admin.register(EmailOTP)
class EmailOTPAdmin(admin.ModelAdmin):
    list_display = ['email', 'phone', 'channel', 'otp', 'purpose', 'is_used', 'created_at']
    list_filter = ['purpose', 'channel', 'is_used']
    search_fields = ['email', 'phone', 'otp']
    readonly_fields = ['created_at']
