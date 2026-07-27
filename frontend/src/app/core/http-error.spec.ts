import { HttpErrorResponse } from '@angular/common/http';

import { extractErrorMessage } from './http-error';

function errorFrom(body: unknown, status = 400): HttpErrorResponse {
  return new HttpErrorResponse({ error: body, status });
}

describe('extractErrorMessage', () => {
  it('returns this app own error message as-is when not a known special case', () => {
    const err = errorFrom({ error: { code: 'not_found', message: 'application not found' } });
    expect(extractErrorMessage(err, 'fallback')).toBe('application not found');
  });

  it('gives a specific message for an abuse-guard ban', () => {
    const err = errorFrom({
      error: { code: 'forbidden', message: 'this IP has been temporarily blocked' },
    });
    expect(extractErrorMessage(err, 'fallback')).toContain('temporarily blocked');
  });

  it('gives a specific message for the signup invite gate', () => {
    const err = errorFrom({ error: { code: 'forbidden', message: 'sign-up requires an invite' } });
    expect(extractErrorMessage(err, 'fallback')).toContain('invited users');
  });

  it('translates the gateway not-admitted rejection into a session-expiry message', () => {
    const err = errorFrom({ detail: 'not admitted (join the queue first)' }, 403);
    expect(extractErrorMessage(err, 'fallback')).toContain('session is no longer active');
  });

  it('reads the first message out of a FastAPI validation-error array', () => {
    const err = errorFrom({ detail: [{ msg: 'field required', loc: ['body', 'email'] }] }, 422);
    expect(extractErrorMessage(err, 'fallback')).toBe('field required');
  });

  it('falls back when nothing recognizable is present', () => {
    const err = errorFrom(null, 500);
    expect(extractErrorMessage(err, 'fallback text')).toBe('fallback text');
  });
});
