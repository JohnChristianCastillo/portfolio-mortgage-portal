import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { ApplicationComponent } from './application.component';

describe('ApplicationComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApplicationComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('starts on the About project step', () => {
    const fixture = TestBed.createComponent(ApplicationComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.currentStep()).toBe('about');
  });

  it('moves forward and back through steps', () => {
    const fixture = TestBed.createComponent(ApplicationComponent);
    fixture.detectChanges();
    fixture.componentInstance.next();
    expect(fixture.componentInstance.currentStep()).toBe('personal');
    fixture.componentInstance.back();
    expect(fixture.componentInstance.currentStep()).toBe('about');
  });

  it('creates then submits the application in sequence', () => {
    const fixture = TestBed.createComponent(ApplicationComponent);
    fixture.detectChanges();

    fixture.componentInstance.submitApplication();

    const createReq = httpMock.expectOne('/api/applications');
    expect(createReq.request.method).toBe('POST');
    createReq.flush({
      id: 42,
      status: 'draft',
      property_value: 300000,
      loan_amount: 300000,
      monthly_income: 5800,
      monthly_expenses: 500,
      term_years: 25,
      interest_rate: 0,
      employment_status: 'employee',
    });

    const submitReq = httpMock.expectOne('/api/applications/42/submit');
    expect(submitReq.request.method).toBe('POST');
    submitReq.flush({
      id: 42,
      status: 'submitted',
      property_value: 300000,
      loan_amount: 300000,
      monthly_income: 5800,
      monthly_expenses: 500,
      term_years: 25,
      interest_rate: 0,
      employment_status: 'employee',
    });

    expect(fixture.componentInstance.submittedApplication()?.status).toBe('submitted');
  });

  it('shows a backend error message when submission fails', () => {
    const fixture = TestBed.createComponent(ApplicationComponent);
    fixture.detectChanges();

    fixture.componentInstance.submitApplication();

    const createReq = httpMock.expectOne('/api/applications');
    createReq.flush(
      { error: { code: 'unauthorized', message: 'missing or malformed Authorization header' } },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(fixture.componentInstance.errorMessage()).toContain('missing or malformed');
  });
});
