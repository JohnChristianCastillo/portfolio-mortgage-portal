import { HttpInterceptorFn } from '@angular/common/http';

import { getStoredToken } from './token-storage';

/** Attaches the stored JWT (if any) to every outgoing request as a Bearer token. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = getStoredToken();
  if (!token) {
    return next(req);
  }
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
