import json
import re
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from django.core.cache import cache

from .models import ServiceablePostalCode

NOMINATIM_URL = 'https://nominatim.openstreetmap.org'
ALLOWED_AREA_KEYS = {
    'bengaluru urban', 'bangalore urban', 'bengaluru rural', 'bangalore rural',
    'kolar', 'malur', 'kgf', 'kolar gold fields',
}


def normalize_postal_code(value):
    return re.sub(r'\D', '', str(value or '')).strip()


def _normalize_area(value):
    return re.sub(r'[^a-z0-9]+', ' ', str(value or '').lower()).strip()


def _is_allowed_address(address):
    values = {_normalize_area(address.get(key)) for key in (
        'state_district', 'county', 'city', 'town', 'municipality', 'village', 'suburb'
    ) if address.get(key)}
    return any(allowed == value or allowed in value or value in allowed for allowed in ALLOWED_AREA_KEYS for value in values)


def _nominatim_request(path, params):
    query = urlencode({**params, 'format': 'jsonv2', 'addressdetails': 1})
    request = Request(
        f'{NOMINATIM_URL}{path}?{query}',
        headers={'User-Agent': 'GNSPaperProducts-Serviceability/1.0 (gnspaperproducts50@gmail.com)'},
    )
    with urlopen(request, timeout=6) as response:
        return json.loads(response.read().decode('utf-8'))


def reverse_geocode(latitude, longitude):
    key = f'serviceability:reverse:{float(latitude):.4f}:{float(longitude):.4f}'
    cached = cache.get(key)
    if cached:
        return cached
    try:
        payload = _nominatim_request('/reverse', {'lat': latitude, 'lon': longitude, 'zoom': 18})
    except Exception:
        return None
    result = {'display_name': payload.get('display_name', ''), 'address': payload.get('address') or {}}
    cache.set(key, result, 86400)
    return result


def geocode_postal_code(postal_code):
    normalized = normalize_postal_code(postal_code)
    key = f'serviceability:postal:{normalized}'
    cached = cache.get(key)
    if cached:
        return cached
    try:
        payload = _nominatim_request('/search', {'postalcode': normalized, 'country': 'India', 'limit': 1})
    except Exception:
        return None
    if not payload:
        return None
    result = {'display_name': payload[0].get('display_name', ''), 'address': payload[0].get('address') or {}}
    cache.set(key, result, 604800)
    return result


def _address_payload(geocoded):
    address = (geocoded or {}).get('address') or {}
    return {
        'street': address.get('road') or address.get('pedestrian') or address.get('suburb') or address.get('village') or '',
        'city': address.get('city') or address.get('town') or address.get('municipality') or address.get('village') or '',
        'district': address.get('state_district') or address.get('county') or '',
        'state': address.get('state') or 'Karnataka',
        'postal_code': normalize_postal_code(address.get('postcode')),
        'country': address.get('country') or 'India',
        'display_name': (geocoded or {}).get('display_name', ''),
    }


def check_postal_code_serviceability(postal_code, geocode_if_unknown=True):
    normalized = normalize_postal_code(postal_code)
    if len(normalized) != 6:
        return {'serviceable': False, 'postal_code': normalized, 'code': 'INVALID_POSTAL_CODE', 'message': 'Enter a valid 6-digit PIN code.', 'area': None}
    area = ServiceablePostalCode.objects.filter(postal_code=normalized, is_active=True).first()
    if area:
        return {
            'serviceable': True, 'postal_code': normalized, 'code': 'SERVICEABLE',
            'message': f'Delivery is available in {area.area_name}.',
            'area': {'name': area.area_name, 'district': area.district, 'state': area.state,
                     'estimated_delivery_days': area.estimated_delivery_days,
                     'delivery_fee': str(area.delivery_fee) if area.delivery_fee is not None else None},
            'address': {'street': '', 'city': area.area_name, 'district': area.district, 'state': area.state,
                        'postal_code': normalized, 'country': 'India',
                        'display_name': f'{area.area_name}, {area.district}, {area.state} {normalized}'},
        }
    geocoded = geocode_postal_code(normalized) if geocode_if_unknown else None
    if geocoded and _is_allowed_address(geocoded.get('address') or {}):
        address = _address_payload(geocoded)
        return {'serviceable': True, 'postal_code': normalized, 'code': 'SERVICEABLE',
                'message': f"Delivery is available in {address['city'] or address['district']}.",
                'area': {'name': address['city'] or address['district'], 'district': address['district'],
                         'state': address['state'], 'estimated_delivery_days': None, 'delivery_fee': None},
                'address': address}
    return {'serviceable': False, 'postal_code': normalized, 'code': 'NON_SERVICEABLE_AREA',
            'message': 'Sorry, GNS Paper Products does not currently deliver to this location.',
            'area': None, 'address': _address_payload(geocoded) if geocoded else None}


def check_coordinate_serviceability(latitude, longitude):
    geocoded = reverse_geocode(latitude, longitude)
    if not geocoded:
        return {'serviceable': False, 'postal_code': '', 'code': 'LOCATION_LOOKUP_FAILED',
                'message': 'We could not identify this location. Enter your delivery PIN code manually.',
                'area': None, 'address': None}
    address = _address_payload(geocoded)
    if address['postal_code']:
        result = check_postal_code_serviceability(address['postal_code'], geocode_if_unknown=False)
        if result['serviceable']:
            result['address'] = address
            return result
    if _is_allowed_address(geocoded.get('address') or {}):
        return {'serviceable': True, 'postal_code': address['postal_code'], 'code': 'SERVICEABLE',
                'message': f"Delivery is available in {address['city'] or address['district']}.",
                'area': {'name': address['city'] or address['district'], 'district': address['district'],
                         'state': address['state'], 'estimated_delivery_days': None, 'delivery_fee': None},
                'address': address}
    return {'serviceable': False, 'postal_code': address['postal_code'], 'code': 'NON_SERVICEABLE_AREA',
            'message': 'Sorry, GNS Paper Products does not currently deliver to this location.',
            'area': None, 'address': address}
