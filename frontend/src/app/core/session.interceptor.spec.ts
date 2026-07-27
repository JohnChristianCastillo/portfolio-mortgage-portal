import { TestBed } from '@angular/core/testing';
import { HttpRequest } from '@angular/common/http';

import { sessionInterceptor } from './session.interceptor';
import { GatewayService } from './gateway.service';

describe('sessionInterceptor', () => {
  function run(req: HttpRequest<unknown>, sessionId: string | null) {
    let captured: HttpRequest<unknown> | null = null;
    TestBed.configureTestingModule({
      providers: [{ provide: GatewayService, useValue: { sessionId: () => sessionId } }],
    });
    TestBed.runInInjectionContext(() => {
      sessionInterceptor(req, (r) => {
        captured = r;
        return null as never;
      });
    });
    return captured as unknown as HttpRequest<unknown> | null;
  }

  it('attaches X-Session-Id to /api requests when a session id is present', () => {
    const req = new HttpRequest('GET', 'api/simulate');
    const forwarded = run(req, 'abc123');
    expect(forwarded?.headers.get('X-Session-Id')).toBe('abc123');
  });

  it('does not attach the header when there is no session id', () => {
    const req = new HttpRequest('GET', 'api/simulate');
    const forwarded = run(req, null);
    expect(forwarded?.headers.has('X-Session-Id')).toBe(false);
  });

  it('does not attach the header to non-/api requests', () => {
    const req = new HttpRequest('GET', 'health');
    const forwarded = run(req, 'abc123');
    expect(forwarded?.headers.has('X-Session-Id')).toBe(false);
  });
});
