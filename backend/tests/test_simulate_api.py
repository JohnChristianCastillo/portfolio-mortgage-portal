from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_simulate_endpoint_returns_expected_fields():
    response = client.post(
        "/api/simulate",
        json={
            "property_value": 300000,
            "down_payment": 70000,
            "monthly_income": 5800,
            "monthly_expenses": 500,
            "term_years": 25,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["loan_amount"] == 230000
    assert body["monthly_payment"] > 0
    assert "affordable" in body


def test_simulate_rejects_down_payment_above_property_value():
    response = client.post(
        "/api/simulate",
        json={
            "property_value": 300000,
            "down_payment": 350000,
            "monthly_income": 5800,
        },
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


def test_simulate_rejects_negative_property_value():
    response = client.post(
        "/api/simulate",
        json={
            "property_value": -1,
            "down_payment": 0,
            "monthly_income": 5800,
        },
    )
    assert response.status_code == 422
