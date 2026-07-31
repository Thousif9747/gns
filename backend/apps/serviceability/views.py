from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .serializers import ServiceabilityCheckSerializer
from .services import check_coordinate_serviceability, check_postal_code_serviceability


class ServiceabilityCheckView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'serviceability'

    def post(self, request):
        serializer = ServiceabilityCheckSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        result = check_postal_code_serviceability(data['postal_code']) if data.get('postal_code') else check_coordinate_serviceability(data['latitude'], data['longitude'])
        return Response(result)
