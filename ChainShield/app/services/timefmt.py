"""Show times in Indian Standard Time.

Timestamps are stored in UTC. Pages, chat and notifications show them in IST
(UTC+05:30) so they match the live map and the user's clock. CSV exports stay
in UTC and say so in their headers. A fixed offset is used (India has no
daylight saving), so no timezone database is needed in the Docker image.
"""
from datetime import timedelta

from flask import current_app, has_app_context


def local(dt):
    """UTC datetime -> local display time (IST by default)."""
    if dt is None:
        return None
    minutes = current_app.config.get("DISPLAY_UTC_OFFSET_MINUTES", 330) if has_app_context() else 330
    return dt + timedelta(minutes=minutes)
