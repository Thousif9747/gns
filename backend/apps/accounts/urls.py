from django.urls import path
from . import views

urlpatterns = [
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('refresh/', views.TokenRefreshView.as_view(), name='token-refresh'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('profile/', views.UserViewSet.as_view({'get': 'profile', 'patch': 'profile'}), name='user-profile'),
    path('addresses/', views.UserViewSet.as_view({'get': 'addresses'}), name='user-addresses'),
    path('addresses/add/', views.UserViewSet.as_view({'post': 'add_address'}), name='user-add-address'),
    path('addresses/update/', views.UserViewSet.as_view({'patch': 'update_address'}), name='user-update-address'),
    path('addresses/delete/', views.UserViewSet.as_view({'delete': 'delete_address'}), name='user-delete-address'),
    path('addresses/set-primary/', views.UserViewSet.as_view({'post': 'set_primary_address'}), name='user-set-primary-address'),
    path('users/', views.UserViewSet.as_view({'get': 'list', 'post': 'create'}), name='user-list'),
    path('users/<uuid:pk>/', views.UserViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update', 'delete': 'destroy'}), name='user-detail'),
    path('users/<uuid:pk>/toggle-active/', views.UserViewSet.as_view({'post': 'toggle_active'}), name='user-toggle-active'),
    path('users/<uuid:pk>/update_profile/', views.UserViewSet.as_view({'patch': 'update_profile'}), name='user-update-profile'),
    path('update-fcm-token/', views.UserViewSet.as_view({'post': 'update_fcm_token'}), name='user-update-fcm-token'),
    path('update-phone/', views.UserViewSet.as_view({'post': 'update_phone'}), name='user-update-phone'),
    path('remove-fcm-token/', views.UserViewSet.as_view({'post': 'remove_fcm_token'}), name='user-remove-fcm-token'),
    path('send-otp/', views.SendOtpView.as_view(), name='send-otp'),
    path('verify-otp/', views.VerifyOtpView.as_view(), name='verify-otp'),
    path('set-password/', views.SetPasswordView.as_view(), name='set-password'),
    path('complete-registration/', views.CompleteRegistrationView.as_view(), name='complete-registration'),
]
