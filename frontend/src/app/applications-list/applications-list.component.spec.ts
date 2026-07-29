import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { ApplicationsListComponent } from './applications-list.component';

const SAMPLE_APPLICATION = {
  id: 1,
  status: 'submitted',
  property_value: 300000,
  loan_amount: 300000,
  monthly_income: 5800,
  monthly_expenses: 500,
  term_years: 25,
  interest_rate: 3.5,
  employment_status: 'employee',
};

describe('ApplicationsListComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApplicationsListComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loads the borrower\'s applications on init', () => {
    const fixture = TestBed.createComponent(ApplicationsListComponent);
    fixture.detectChanges();

    const req = httpMock.expectOne('api/applications');
    expect(req.request.method).toBe('GET');
    req.flush([SAMPLE_APPLICATION]);

    expect(fixture.componentInstance.items().length).toBe(1);
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('shows a backend error message when loading fails', () => {
    const fixture = TestBed.createComponent(ApplicationsListComponent);
    fixture.detectChanges();

    const req = httpMock.expectOne('api/applications');
    req.flush(
      { error: { code: 'unauthorized', message: 'missing or malformed Authorization header' } },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(fixture.componentInstance.errorMessage()).toContain('missing or malformed');
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('withdraws a submitted application and updates it in place', () => {
    const fixture = TestBed.createComponent(ApplicationsListComponent);
    fixture.detectChanges();
    httpMock.expectOne('api/applications').flush([SAMPLE_APPLICATION]);

    fixture.componentInstance.withdraw(1);

    const req = httpMock.expectOne('api/applications/1/withdraw');
    expect(req.request.method).toBe('POST');
    req.flush({ ...SAMPLE_APPLICATION, status: 'withdrawn' });

    expect(fixture.componentInstance.items()[0].status).toBe('withdrawn');
    expect(fixture.componentInstance.withdrawingId()).toBeNull();
  });

  it('shows a backend error message when withdrawing fails', () => {
    const fixture = TestBed.createComponent(ApplicationsListComponent);
    fixture.detectChanges();
    httpMock.expectOne('api/applications').flush([SAMPLE_APPLICATION]);

    fixture.componentInstance.withdraw(1);

    const req = httpMock.expectOne('api/applications/1/withdraw');
    req.flush(
      { error: { code: 'conflict', message: 'only a submitted application can be withdrawn' } },
      { status: 409, statusText: 'Conflict' },
    );

    expect(fixture.componentInstance.errorMessage()).toContain('only a submitted application');
    expect(fixture.componentInstance.withdrawingId()).toBeNull();
  });
});
