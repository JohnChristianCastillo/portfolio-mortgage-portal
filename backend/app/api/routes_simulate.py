from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.domain.simulation import MortgageSimulator, SimulationInput

router = APIRouter(tags=["simulation"])
_simulator = MortgageSimulator()


class SimulateRequest(BaseModel):
    property_value: float = Field(gt=0)
    down_payment: float = Field(ge=0)
    monthly_income: float = Field(ge=0)
    monthly_expenses: float = Field(default=0.0, ge=0)
    term_years: int = Field(default=25, ge=5, le=35)


class SimulateResponse(BaseModel):
    loan_amount: float
    monthly_payment: float
    total_interest: float
    total_repayment: float
    interest_rate: float
    term_years: int
    debt_to_income_ratio: float
    affordable: bool


@router.post("/simulate", response_model=SimulateResponse)
def simulate(payload: SimulateRequest) -> SimulateResponse:
    result = _simulator.simulate(
        SimulationInput(
            property_value=payload.property_value,
            down_payment=payload.down_payment,
            monthly_income=payload.monthly_income,
            monthly_expenses=payload.monthly_expenses,
            term_years=payload.term_years,
        )
    )
    return SimulateResponse(**result.__dict__)
