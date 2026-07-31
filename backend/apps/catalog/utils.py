def build_absolute_file_url(request, file_field):
    if not file_field:
        return ''
    url = file_field.url
    return request.build_absolute_uri(url) if request else url


def get_product_primary_image(product, request=None):
    gallery_image = getattr(product, 'images', None)
    if gallery_image is not None:
        first_image = gallery_image.order_by('sort_order', 'created_at').first()
        if first_image and first_image.image:
            return build_absolute_file_url(request, first_image.image)

    if getattr(product, 'image', None):
        return build_absolute_file_url(request, product.image)

    return ''


def get_product_primary_image_positions(product):
    gallery_image = getattr(product, 'images', None)
    if gallery_image is not None:
        first_image = gallery_image.order_by('sort_order', 'created_at').first()
        if first_image:
            return {
                'card_object_position': first_image.card_object_position or '50% 50%',
                'object_position': first_image.object_position or '50% 50%',
            }
    return {'card_object_position': '50% 50%', 'object_position': '50% 50%'}


def get_product_gallery_urls(product, request=None):
    gallery = getattr(product, 'images', None)
    urls = []

    if gallery is not None:
        for image in gallery.order_by('sort_order', 'created_at'):
            if image.image:
                urls.append(build_absolute_file_url(request, image.image))

    if urls:
        return urls

    if getattr(product, 'image', None):
        return [build_absolute_file_url(request, product.image)]

    return []


def get_homepage_banner_images(product, request=None):
    gallery = getattr(product, 'images', None)
    if gallery is None:
        return []
    images = gallery.filter(is_homepage_banner=True).order_by('sort_order', 'created_at')
    return [
        {
            'id': str(image.id),
            'image_url': build_absolute_file_url(request, image.image),
            'sort_order': image.sort_order,
            'is_homepage_banner': image.is_homepage_banner,
            'object_position': image.object_position,
        }
        for image in images
        if image.image
    ]


def get_ad_banner_url(banner, request=None):
    return build_absolute_file_url(request, banner.image)
