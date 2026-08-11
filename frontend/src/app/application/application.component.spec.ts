import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { ApplicationComponent } from './application.component';

const DRAFT = {
  id: 42,
  status: 'draft',
  property_value: 300000,
  loan_amount: 300000,
  monthly_income: 5800,
  monthly_expenses: 500,
  term_years: 25,
  interest_rate: 0,
  employment_status: 'employee',
};

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

  /**
   * Creates the component and answers the draft lookup it fires on init.
   * Pass existing applications to exercise the resume path.
   */
  function setup(existing: unknown[] = []) {
    const fixture = TestBed.createComponent(ApplicationComponent);
    fixture.detectChanges();
    httpMock
      .expectOne((req) => req.url === 'api/applications' && req.method === 'GET')
      .flush(existing);
    return fixture;
  }

  // create and the draft lookup share a URL, so these match on method too.
  function expectCreate() {
    return httpMock.expectOne((req) => req.url === 'api/applications' && req.method === 'POST');
  }

  function expectPatch(id = 42) {
    return httpMock.expectOne((req) => req.url === `api/applications/${id}` && req.method === 'PATCH');
  }

  it('starts on the About project step', () => {
    const fixture = setup();
    expect(fixture.componentInstance.currentStep()).toBe('about');
  });

  it('moves forward and back through steps', () => {
    const fixture = setup();

    fixture.componentInstance.next();
    expect(fixture.componentInstance.currentStep()).toBe('personal');
    expectCreate().flush(DRAFT);

    fixture.componentInstance.back();
    expect(fixture.componentInstance.currentStep()).toBe('about');
    expectPatch().flush(DRAFT);
  });

  it('creates the draft on the first step change, then updates the same one', () => {
    const fixture = setup();

    fixture.componentInstance.next();
    expectCreate().flush(DRAFT);
    expect(fixture.componentInstance.draftId()).toBe(42);

    fixture.componentInstance.next();
    // Second save is a PATCH of the existing draft, not another create.
    expectPatch().flush(DRAFT);
    expect(fixture.componentInstance.draftId()).toBe(42);
  });

  it('resumes the most recent draft on load', () => {
    const fixture = setup([{ ...DRAFT, id: 7, property_value: 450000, term_years: 30 }]);

    expect(fixture.componentInstance.draftId()).toBe(7);
    expect(fixture.componentInstance.resumedDraft()).toBe(true);

    // The saved values, not the defaults, are what the form now holds and
    // therefore what the next save sends back.
    fixture.componentInstance.next();
    const req = expectPatch(7);
    expect(req.request.body.property_value).toBe(450000);
    expect(req.request.body.term_years).toBe(30);
    req.flush(DRAFT);
  });

  it('ignores already-submitted applications when looking for a draft', () => {
    const fixture = setup([{ ...DRAFT, id: 9, status: 'submitted' }]);

    expect(fixture.componentInstance.draftId()).toBeNull();
    expect(fixture.componentInstance.resumedDraft()).toBe(false);
  });

  it('still lets the borrower start if the draft lookup fails', () => {
    const fixture = TestBed.createComponent(ApplicationComponent);
    fixture.detectChanges();
    httpMock
      .expectOne((req) => req.url === 'api/applications' && req.method === 'GET')
      .flush({ error: { code: 'server_error', message: 'boom' } }, { status: 500, statusText: 'Error' });

    expect(fixture.componentInstance.loadingDraft()).toBe(false);
    expect(fixture.componentInstance.draftId()).toBeNull();
  });

  it('starting a new application detaches from the resumed draft', () => {
    const fixture = setup([{ ...DRAFT, id: 7 }]);
    expect(fixture.componentInstance.draftId()).toBe(7);

    fixture.componentInstance.startNewApplication();

    expect(fixture.componentInstance.draftId()).toBeNull();
    expect(fixture.componentInstance.resumedDraft()).toBe(false);
    expect(fixture.componentInstance.currentStep()).toBe('about');

    // The next save creates a brand new draft rather than patching the old one.
    fixture.componentInstance.next();
    expectCreate().flush(DRAFT);
  });

  it('surfaces a message when an autosave fails', () => {
    const fixture = setup();

    fixture.componentInstance.next();
    expectCreate().flush(
      { error: { code: 'unauthorized', message: 'missing or malformed Authorization header' } },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(fixture.componentInstance.saveError()).toContain('missing or malformed');
  });

  it('creates then submits the application in sequence', () => {
    const fixture = setup();

    fixture.componentInstance.submitApplication();

    expectCreate().flush(DRAFT);

    const submitReq = httpMock.expectOne('api/applications/42/submit');
    expect(submitReq.request.method).toBe('POST');
    submitReq.flush({ ...DRAFT, status: 'submitted' });

    expect(fixture.componentInstance.submittedApplication()?.status).toBe('submitted');
  });

  it('submits an already-autosaved draft by updating it, not creating another', () => {
    const fixture = setup([{ ...DRAFT, id: 7 }]);

    fixture.componentInstance.submitApplication();

    expectPatch(7).flush({ ...DRAFT, id: 7 });
    httpMock.expectOne('api/applications/7/submit').flush({ ...DRAFT, id: 7, status: 'submitted' });

    expect(fixture.componentInstance.submittedApplication()?.status).toBe('submitted');
  });

  it('shows a backend error message when submission fails', () => {
    const fixture = setup();

    fixture.componentInstance.submitApplication();

    expectCreate().flush(
      { error: { code: 'unauthorized', message: 'missing or malformed Authorization header' } },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(fixture.componentInstance.errorMessage()).toContain('missing or malformed');
  });

  function reachSubmittedState(fixture: ReturnType<typeof TestBed.createComponent<ApplicationComponent>>) {
    fixture.componentInstance.submitApplication();
    expectCreate().flush(DRAFT);
    httpMock.expectOne('api/applications/42/submit').flush({ ...DRAFT, status: 'submitted' });
  }

  it('uploads a document once the application is submitted', () => {
    const fixture = setup();
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
    const fixture = setup();
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
