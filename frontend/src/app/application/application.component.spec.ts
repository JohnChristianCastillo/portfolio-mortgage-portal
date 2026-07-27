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

    const createReq = httpMock.expectOne('api/applications');
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

    const submitReq = httpMock.expectOne('api/applications/42/submit');
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

    const createReq = httpMock.expectOne('api/applications');
    createReq.flush(
      { error: { code: 'unauthorized', message: 'missing or malformed Authorization header' } },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(fixture.componentInstance.errorMessage()).toContain('missing or malformed');
  });

  function reachSubmittedState(fixture: ReturnType<typeof TestBed.createComponent<ApplicationComponent>>) {
    fixture.componentInstance.submitApplication();
    const createReq = httpMock.expectOne('api/applications');
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
    const submitReq = httpMock.expectOne('api/applications/42/submit');
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
  }

  it('uploads a document once the application is submitted', () => {
    const fixture = TestBed.createComponent(ApplicationComponent);
    fixture.detectChanges();
    reachSubmittedState(fixture);

    const file = new File(['fake pdf'], 'epc.pdf', { type: 'application/pdf' });
    fixture.componentInstance.selectedFile.set(file);
    fixture.componentInstance.uploadDocument();

    const uploadReq = httpMock.expectOne('api/applications/42/documents');
    expect(uploadReq.request.method).toBe('POST');
    uploadReq.flush({
      id: 1,
      document_type: 'EPC Certificate',
      filename: 'epc.pdf',
      content_type: 'application/pdf',
      size_bytes: 8,
    });

    expect(fixture.componentInstance.uploadedDocuments().length).toBe(1);
    expect(fixture.componentInstance.selectedFile()).toBeNull();
  });

  it('shows a backend error message when upload fails', () => {
    const fixture = TestBed.createComponent(ApplicationComponent);
    fixture.detectChanges();
    reachSubmittedState(fixture);

    const file = new File(['fake exe'], 'virus.exe', { type: 'application/x-msdownload' });
    fixture.componentInstance.selectedFile.set(file);
    fixture.componentInstance.uploadDocument();

    const uploadReq = httpMock.expectOne('api/applications/42/documents');
    uploadReq.flush(
      { error: { code: 'validation_error', message: 'unsupported file type: application/x-msdownload' } },
      { status: 422, statusText: 'Unprocessable Content' },
    );

    expect(fixture.componentInstance.uploadError()).toContain('unsupported file type');
  });
});
