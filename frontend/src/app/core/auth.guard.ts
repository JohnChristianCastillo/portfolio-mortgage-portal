import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

/**
 * Blocks a route unless a token is present, redirecting to /signup otherwise.
 * Carries the originally requested URL as a returnUrl query param so
 * AuthComponent can send the borrower back to where they meant to go (e.g.
 * /apply) instead of always landing on the home page after signing up.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.token()) {
    return true;
  }
  return router.createUrlTree(['/signup'], { queryParams: { returnUrl: state.url } });
};
