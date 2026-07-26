from dataclasses import dataclass

from app.core.errors import ValidationError


@dataclass(frozen=True)
class SimulationInput:
    property_value: float
    down_payment: float
    monthly_income: float
    monthly_expenses: float = 0.0
    term_years: int = 25


@dataclass(frozen=True)
class SimulationResult:
    loan_amount: float
    monthly_payment: float
    total_interest: float
    total_repayment: float
    interest_rate: float
    term_years: int
    debt_to_income_ratio: float
    affordable: bool


class MortgageSimulator:
    """Amortization-based mortgage simulator with a simple loan-to-value adjusted rate.

    Not a real underwriting model, deliberately simple: fixed base rate with a
    surcharge above a loan-to-value threshold, standard amortization formula for
    the monthly payment, and a debt-to-income cutoff for the affordability flag.
    """

    BASE_RATE = 0.035
    HIGH_LTV_SURCHARGE = 0.005
    HIGH_LTV_THRESHOLD = 0.8
    MAX_AFFORDABLE_DTI = 0.45

    def simulate(self, data: SimulationInput) -> SimulationResult:
        if data.down_payment > data.property_value:
            raise ValidationError("down payment cannot exceed the property value")

        loan_amount = data.property_value - data.down_payment
        rate = self._interest_rate_for(loan_amount, data.property_value)
        monthly_payment = round(self._monthly_payment(loan_amount, rate, data.term_years), 2)
        total_repayment = round(monthly_payment * data.term_years * 12, 2)
        total_interest = max(round(total_repayment - loan_amount, 2), 0.0)

        dti = (
            monthly_payment / data.monthly_income
            if data.monthly_income > 0
            else 1.0
        )
        available_income = max(data.monthly_income - data.monthly_expenses, 0.0)
        affordable = monthly_payment <= available_income and dti <= self.MAX_AFFORDABLE_DTI

        return SimulationResult(
            loan_amount=round(loan_amount, 2),
            monthly_payment=round(monthly_payment, 2),
            total_interest=round(total_interest, 2),
            total_repayment=round(total_repayment, 2),
            interest_rate=rate,
            term_years=data.term_years,
            debt_to_income_ratio=round(dti, 4),
            affordable=affordable,
        )

    def _interest_rate_for(self, loan_amount: float, property_value: float) -> float:
        if property_value <= 0:
            return self.BASE_RATE
        loan_to_value = loan_amount / property_value
        surcharge = self.HIGH_LTV_SURCHARGE if loan_to_value > self.HIGH_LTV_THRESHOLD else 0.0
        return self.BASE_RATE + surcharge

    def _monthly_payment(self, principal: float, annual_rate: float, term_years: int) -> float:
        if principal <= 0:
            return 0.0
        monthly_rate = annual_rate / 12
        n_payments = term_years * 12
        if monthly_rate == 0:
            return principal / n_payments
        factor = (1 + monthly_rate) ** n_payments
        return principal * monthly_rate * factor / (factor - 1)
