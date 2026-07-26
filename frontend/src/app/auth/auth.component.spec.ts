import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';

import { AuthComponent } from './auth.component';

describe('AuthComponent', () => {
  let httpMock: HttpTestingController;

  async function setup(mode: 'signup' | 'login') {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [AuthComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { data: { mode } } },
        },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(AuthComponent);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('defaults to the mode given by route data', async () => {
    const fixture = await setup('login');
    expect(fixture.componentInstance.mode()).toBe('login');
  });

  it('calls signup and clears the error on success', async () => {
    const fixture = await setup('signup');
    fixture.componentInstance.form.setValue({ email: 'a@example.com', password: 'supersecret' });

    fixture.componentInstance.submit();

    const req = httpMock.expectOne('/api/auth/signup');
    req.flush({ access_token: 'token123', token_type: 'bearer' });

    const meReq = httpMock.expectOne('/api/auth/me');
    meReq.flush({ id: 1, email: 'a@example.com' });

    expect(fixture.componentInstance.errorMessage()).toBeNull();
  });

  it('shows inline validation errors and does not call the API for invalid input', async () => {
    const fixture = await setup('signup');
    fixture.componentInstance.form.setValue({ email: '123', password: '123123' });

    fixture.componentInstance.submit();
    fixture.detectChanges();

    httpMock.expectNone('/api/auth/signup');

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Enter a valid email address');
    expect(text).toContain('Password must be at least 8 characters long');
  });

  it('shows the backend error message on a failed login', async () => {
    const fixture = await setup('login');
    fixture.componentInstance.form.setValue({ email: 'a@example.com', password: 'wrongpass' });

    fixture.componentInstance.submit();

    const req = httpMock.expectOne('/api/auth/login');
    req.flush(
      { error: { code: 'unauthorized', message: 'invalid email or password' } },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(fixture.componentInstance.errorMessage()).toContain('invalid email or password');
  });
});
