from rest_framework import serializers


class ServiceabilityCheckSerializer(serializers.Serializer):
    postal_code = serializers.RegexField(regex=r'^\s*\d{6}\s*$', trim_whitespace=True, required=False)
    latitude = serializers.FloatField(min_value=-90, max_value=90, required=False)
    longitude = serializers.FloatField(min_value=-180, max_value=180, required=False)

    def validate_postal_code(self, value):
        return value.strip()

    def validate(self, attrs):
        has_coordinates = attrs.get('latitude') is not None and attrs.get('longitude') is not None
        if not attrs.get('postal_code') and not has_coordinates:
            raise serializers.ValidationError('Provide a postal code or latitude and longitude.')
        return attrs
