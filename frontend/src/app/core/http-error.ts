import { HttpErrorResponse } from '@angular/common/http';

/**
 * Maps a backend or gateway rejection to a clear, specific user-facing
 * message instead of surfacing raw technical text. Recognizes this app's own
 * domain errors ({error:{code,message}} - the abuse-guard ban, the signup
 * invite gate) and the gateway's own rejections (plain {detail} shape, since
 * the gateway sits in front and can reject a request before it ever reaches
 * this app - e.g. an anonymous session that expired or lost its admitted
 * slot). Falls back to `fallback` only when nothing recognizable is present.
 */
export function extractErrorMessage(err: HttpErrorResponse, fallback: string): string {
  const body = err.error;

  const code = body?.error?.code;
  const appMessage = body?.error?.message;
  if (typeof appMessage === 'string' && appMessage) {
    if (code === 'forbidden' && appMessage.includes('blocked')) {
      return 'This connection has been temporarily blocked for unusual activity. Contact the site owner if you think this is a mistake.';
    }
    if (code === 'forbidden' && appMessage.includes('invite')) {
      return 'Sign-up is currently limited to invited users. Contact the site owner for an invite.';
    }
    return appMessage;
  }

  const detail = body?.detail;
  const detailText =
    typeof detail === 'string'
      ? detail
      : Array.isArray(detail) && typeof detail[0]?.msg === 'string'
        ? detail[0].msg
        : null;

  if (detailText) {
    if (detailText.includes('not admitted') || detailText.includes('queue')) {
      return 'Your session is no longer active - anonymous sessions are time-limited. Refresh the page to reconnect.';
    }
    return detailText;
  }

  return fallback;
}
