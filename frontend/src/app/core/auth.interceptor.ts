import { HttpInterceptorFn } from '@angular/common/http';

import { getStoredToken } from './token-storage';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = getStoredToken();
  if (!token) {
    return next(req);
  }
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
