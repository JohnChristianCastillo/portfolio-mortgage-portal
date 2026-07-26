import pytest

from app.core.errors import ValidationError
from app.domain.simulation import MortgageSimulator, SimulationInput


@pytest.fixture
def simulator() -> MortgageSimulator:
    return MortgageSimulator()


def test_loan_amount_is_property_value_minus_down_payment(simulator: MortgageSimulator):
    result = simulator.simulate(
        SimulationInput(
            property_value=300_000,
            down_payment=70_000,
            monthly_income=5_800,
            monthly_expenses=500,
        )
    )
    assert result.loan_amount == 230_000


def test_monthly_payment_is_positive_and_amortizes_to_total_repayment(simulator: MortgageSimulator):
    result = simulator.simulate(
        SimulationInput(
            property_value=300_000,
            down_payment=70_000,
            monthly_income=5_800,
            monthly_expenses=500,
            term_years=25,
        )
    )
    assert result.monthly_payment > 0
    assert result.total_repayment == pytest.approx(result.monthly_payment * 25 * 12, rel=1e-6)
    assert result.total_interest == pytest.approx(result.total_repayment - result.loan_amount, rel=1e-6)


def test_high_loan_to_value_gets_a_rate_surcharge(simulator: MortgageSimulator):
    low_ltv = simulator.simulate(
        SimulationInput(property_value=300_000, down_payment=100_000, monthly_income=5_800)
    )
    high_ltv = simulator.simulate(
        SimulationInput(property_value=300_000, down_payment=10_000, monthly_income=5_800)
    )
    assert high_ltv.interest_rate > low_ltv.interest_rate


def test_unaffordable_when_payment_exceeds_available_income(simulator: MortgageSimulator):
    result = simulator.simulate(
        SimulationInput(
            property_value=300_000,
            down_payment=10_000,
            monthly_income=1_500,
            monthly_expenses=1_200,
        )
    )
    assert result.affordable is False


def test_down_payment_above_property_value_is_rejected(simulator: MortgageSimulator):
    with pytest.raises(ValidationError):
        simulator.simulate(
            SimulationInput(property_value=300_000, down_payment=350_000, monthly_income=5_800)
        )
