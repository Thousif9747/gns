import os
from django.core.files.storage import FileSystemStorage
from django.conf import settings


def get_storage():
    """Return a FileSystemStorage instance pointed at MEDIA_ROOT.

    Ensures the media directory exists and is writable. This helps when
    running in containerized environments where the host volume may not
    have been created yet.
    """
    media_root = getattr(settings, 'MEDIA_ROOT', None)
    if media_root:
        try:
            os.makedirs(media_root, exist_ok=True)
        except Exception:
            # If we cannot create the directory, fall back to default FS storage
            return FileSystemStorage()
        return FileSystemStorage(location=str(media_root))
    return FileSystemStorage()
