"""Covers the simulate-endpoint burst guard: an anonymous IP that bursts past
the threshold gets auto-banned and rejected on every subsequent call, invited/
admin tiers are exempt entirely, and an admin can unban an IP.
"""

from fastapi.testclient import TestClient

from app.config import settings
from app.main import app

client = TestClient(app)

_PAYLOAD = {
    "property_value": 300000,
    "down_payment": 70000,
    "monthly_income": 5800,
    "monthly_expenses": 500,
    "term_years": 25,
}


def _simulate(ip: str, tier: str | None = None):
    headers = {"cf-connecting-ip": ip}
    if tier is not None:
        headers["X-Session-Tier"] = tier
    return client.post("/api/simulate", json=_PAYLOAD, headers=headers)


def test_anonymous_call_within_the_limit_succeeds():
    response = _simulate("10.0.0.1")
    assert response.status_code == 200


def test_bursting_past_the_threshold_bans_the_ip():
    ip = "10.0.0.2"
    for _ in range(settings.simulate_abuse_max_requests):
        assert _simulate(ip).status_code == 200

    # This call tips it over the threshold and trips the ban.
    over_limit = _simulate(ip)
    assert over_limit.status_code == 403
    assert over_limit.json()["error"]["code"] == "forbidden"

    # Now banned outright, even though this single call alone would be fine.
    still_banned = _simulate(ip)
    assert still_banned.status_code == 403


def test_invited_and_admin_tiers_are_exempt_from_the_burst_guard():
    for tier in ("invited", "admin"):
        ip = f"10.0.1.{'1' if tier == 'invited' else '2'}"
        for _ in range(settings.simulate_abuse_max_requests + 5):
            response = _simulate(ip, tier=tier)
            assert response.status_code == 200


def test_admin_can_list_and_unban():
    ip = "10.0.0.3"
    for _ in range(settings.simulate_abuse_max_requests + 1):
        _simulate(ip)

    listing = client.get("/api/admin/banned-ips", headers={"X-Session-Tier": "admin"})
    assert listing.status_code == 200
    assert any(row["ip"] == ip for row in listing.json())

    unban = client.delete(f"/api/admin/banned-ips/{ip}", headers={"X-Session-Tier": "admin"})
    assert unban.status_code == 200

    # No longer banned: the guard's ban check passes again, though the burst
    # window itself is untouched by unbanning (a fresh burst would re-trip it).
    listing_after = client.get("/api/admin/banned-ips", headers={"X-Session-Tier": "admin"})
    assert not any(row["ip"] == ip for row in listing_after.json())


def test_admin_endpoints_allowed_when_no_gateway_present():
    """No X-Session-Tier header at all means there is no gateway in front
    (local dev, standalone Docker), not a real anonymous visitor - so the
    admin gate must not block it."""
    assert client.get("/api/admin/banned-ips").status_code == 200


def test_admin_endpoints_require_admin_tier():
    assert (
        client.get("/api/admin/banned-ips", headers={"X-Session-Tier": "invited"}).status_code
        == 403
    )
    assert (
        client.get("/api/admin/banned-ips", headers={"X-Session-Tier": "anonymous"}).status_code
        == 403
    )
