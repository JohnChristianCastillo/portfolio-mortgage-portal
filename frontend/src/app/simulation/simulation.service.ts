import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SimulateRequest {
  property_value: number;
  down_payment: number;
  monthly_income: number;
  monthly_expenses: number;
  term_years: number;
}

export interface SimulateResult {
  loan_amount: number;
  monthly_payment: number;
  total_interest: number;
  total_repayment: number;
  interest_rate: number;
  term_years: number;
  debt_to_income_ratio: number;
  affordable: boolean;
}

@Injectable({ providedIn: 'root' })
export class SimulationService {
  constructor(private readonly http: HttpClient) {}

  simulate(request: SimulateRequest): Observable<SimulateResult> {
    return this.http.post<SimulateResult>('/api/simulate', request);
  }
}
