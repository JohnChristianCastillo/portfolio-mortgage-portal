import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('authGuard', () => {
  it('allows activation when a token is present', () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: { token: () => 'abc' } }],
    });

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as never, {} as never),
    );
    expect(result).toBe(true);
  });

  it('redirects to /signup with a returnUrl when no token is present', () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: { token: () => null } }],
    });

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/apply' } as never),
    );
    const router = TestBed.inject(Router);
    expect(result).toEqual(
      router.createUrlTree(['/signup'], { queryParams: { returnUrl: '/apply' } }),
    );
  });
});
