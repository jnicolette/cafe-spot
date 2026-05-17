"""
limiter.py
Rate limiting for CafeSpot API — prevents brute-force on auth endpoints.
"""

from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[],
    storage_uri="memory://"
)