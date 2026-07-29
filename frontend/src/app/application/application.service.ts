import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ApplicationFields {
  property_value: number;
  loan_amount: number;
  monthly_income: number;
  monthly_expenses: number;
  term_years: number;
  interest_rate: number;
  employment_status: string | null;
}

export interface Application extends ApplicationFields {
  id: number;
  status: 'draft' | 'submitted' | 'withdrawn';
}

/** Typed HTTP calls for the mortgage application create/update/submit/withdraw endpoints. */
@Injectable({ providedIn: 'root' })
export class ApplicationService {
  private readonly http = inject(HttpClient);

  create(fields: Partial<ApplicationFields>): Observable<Application> {
    // Relative, not leading-slash - see simulation.service.ts's note.
    return this.http.post<Application>('api/applications', fields);
  }

  submit(id: number): Observable<Application> {
    return this.http.post<Application>(`api/applications/${id}/submit`, {});
  }

  withdraw(id: number): Observable<Application> {
    return this.http.post<Application>(`api/applications/${id}/withdraw`, {});
  }

  list(): Observable<Application[]> {
    return this.http.get<Application[]>('api/applications');
  }
}
