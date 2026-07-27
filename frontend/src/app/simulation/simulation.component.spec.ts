import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { SimulationComponent } from './simulation.component';

describe('SimulationComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SimulationComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('shows the simulation result after a successful submit', () => {
    const fixture = TestBed.createComponent(SimulationComponent);
    fixture.detectChanges();

    fixture.componentInstance.submit();

    const req = httpMock.expectOne('api/simulate');
    expect(req.request.method).toBe('POST');
    req.flush({
      loan_amount: 230000,
      monthly_payment: 1150.5,
      total_interest: 115150,
      total_repayment: 345150,
      interest_rate: 0.035,
      term_years: 25,
      debt_to_income_ratio: 0.2,
      affordable: true,
    });

    expect(fixture.componentInstance.result()?.loan_amount).toBe(230000);
    expect(fixture.componentInstance.errorMessage()).toBeNull();
  });

  it('shows a backend error message when the request fails', () => {
    const fixture = TestBed.createComponent(SimulationComponent);
    fixture.detectChanges();

    fixture.componentInstance.submit();

    const req = httpMock.expectOne('api/simulate');
    req.flush(
      { error: { code: 'validation_error', message: 'down payment cannot exceed the property value' } },
      { status: 422, statusText: 'Unprocessable Content' },
    );

    expect(fixture.componentInstance.errorMessage()).toContain('down payment');
    expect(fixture.componentInstance.result()).toBeNull();
  });
});
