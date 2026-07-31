from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from django.conf import settings
from django.conf.urls.static import static
from django.views.decorators.csrf import csrf_exempt
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

def health_check(request):
    return JsonResponse({'status': 'ok'})

@csrf_exempt
def assetlinks(request):
    package_name = getattr(settings, 'ANDROID_PACKAGE_NAME', 'com.GrowNest.app')
    sha256 = getattr(settings, 'ANDROID_SHA256_FINGERPRINT', '')
    return JsonResponse([{
        'relation': ['delegate_permission/common.handle_all_urls'],
        'target': {
            'namespace': 'android_app',
            'package_name': package_name,
            'sha256_cert_fingerprints': [sha256],
        },
    }], safe=False)

urlpatterns = [
    path('django-admin/', admin.site.urls),
    path('api/health/', health_check, name='health-check'),
    path('api/auth/', include('apps.accounts.urls')),
    path('api/catalog/', include('apps.catalog.urls')),
    path('api/commerce/', include('apps.commerce.urls')),
    path('api/orders/', include('apps.orders.urls')),
    path('api/payments/', include('apps.payments.urls')),
    path('api/refunds/', include('apps.refunds.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
    path('api/serviceability/', include('apps.serviceability.urls')),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('.well-known/assetlinks.json', assetlinks, name='assetlinks'),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
