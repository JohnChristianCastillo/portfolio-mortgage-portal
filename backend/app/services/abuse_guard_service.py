"""Detects one IP bursting the simulation endpoint and auto-bans it, logging
the ban so it is visible without digging through request logs. Invited/admin
tier is exempt entirely - this exists for anonymous-tier abuse only. Bans are
persisted (survive restart); the burst window itself is in-memory and does
not need to be, since it only matters over a few seconds.
"""

import logging
import time

from app.config import settings
from app.core.errors import ForbiddenError
from app.repositories.banned_ip_repository import BannedIpRepository

logger = logging.getLogger("mortgage-portal.abuse")

_EXEMPT_TIERS = {"invited", "admin"}


class AbuseGuardService:
    # Shared across requests/instances on purpose: the burst window has to see
    # every call for an IP, not just the calls seen by one Session's instance.
    _recent_calls: dict[str, list[float]] = {}

    def __init__(self, repo: BannedIpRepository):
        self.repo = repo

    def check(self, ip: str, tier: str | None) -> None:
        """Raises ForbiddenError if this IP is banned or just tripped the ban."""
        if tier in _EXEMPT_TIERS:
            return

        if self.repo.get(ip) is not None:
            raise ForbiddenError("this IP has been temporarily blocked")

        now = time.monotonic()
        window_start = now - settings.simulate_abuse_window_seconds
        calls = [t for t in self._recent_calls.get(ip, []) if t >= window_start]
        calls.append(now)
        self._recent_calls[ip] = calls

        if len(calls) > settings.simulate_abuse_max_requests:
            reason = (
                f"{len(calls)} simulate calls within "
                f"{settings.simulate_abuse_window_seconds}s"
            )
            self.repo.ban(ip, reason)
            logger.warning("Auto-banned IP %s: %s", ip, reason)
            raise ForbiddenError("this IP has been temporarily blocked")
