import { TestBed } from '@angular/core/testing';
import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';

import { GatewayStatusService } from './gateway-status.service';

// Matches by suffix, not exact string: the service builds an absolute
// origin+path URL (see gateway-status.service.ts) rather than a plain
// relative "/status", so the exact origin depends on the test environment.
const isStatusRequest = (req: HttpRequest<unknown>) => req.url.endsWith('/status');

describe('GatewayStatusService', () => {
  let service: GatewayStatusService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(GatewayStatusService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    service.stopPolling();
    httpMock.verify();
    vi.useRealTimers();
  });

  it('fetches /status immediately and stores the result', () => {
    service.startPolling();
    httpMock.expectOne(isStatusRequest).flush({
      maintenance: false,
      active: { anonymous: 1, invited: 0, total: 1 },
      capacity: { anonymous: 5, invited: 5, invite_link_max_concurrent: 5 },
      queue: { anonymous: 0, invited: 0 },
    });
    expect(service.status()?.active.total).toBe(1);
  });

  it('polls again after the interval elapses', () => {
    service.startPolling();
    httpMock.expectOne(isStatusRequest).flush({
      maintenance: false,
      active: { anonymous: 0, invited: 0, total: 0 },
      capacity: { anonymous: 5, invited: 5, invite_link_max_concurrent: 5 },
      queue: { anonymous: 0, invited: 0 },
    });

    vi.advanceTimersByTime(5000);
    httpMock.expectOne(isStatusRequest).flush({
      maintenance: false,
      active: { anonymous: 2, invited: 1, total: 3 },
      capacity: { anonymous: 5, invited: 5, invite_link_max_concurrent: 5 },
      queue: { anonymous: 0, invited: 0 },
    });
    expect(service.status()?.active.total).toBe(3);
  });

  it('does not start a second interval if already polling', () => {
    service.startPolling();
    httpMock.expectOne(isStatusRequest).flush({
      maintenance: false,
      active: { anonymous: 0, invited: 0, total: 0 },
      capacity: { anonymous: 5, invited: 5, invite_link_max_concurrent: 5 },
      queue: { anonymous: 0, invited: 0 },
    });

    service.startPolling();
    httpMock.expectNone(isStatusRequest);
  });
});
