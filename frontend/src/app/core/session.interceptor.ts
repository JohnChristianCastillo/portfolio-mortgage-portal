import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';

import { GatewayService } from './gateway.service';

/**
 * Attaches the gateway-admitted session id to every api/* request (a plain
 * relative reference, not leading-slash - see simulation.service.ts's note
 * on why). Separate from authInterceptor's JWT: X-Session-Id proves the
 * gateway admitted this browser session at all, the JWT proves which
 * borrower it is. A no-op (sessionId stays null) when GatewayService is
 * disabled, i.e. local dev.
 */
export const sessionInterceptor: HttpInterceptorFn = (req, next) => {
  const gateway = inject(GatewayService);
  const sessionId = gateway.sessionId();
  if (!sessionId || !req.url.startsWith('api/')) {
    return next(req);
  }
  return next(req.clone({ setHeaders: { 'X-Session-Id': sessionId } }));
};
