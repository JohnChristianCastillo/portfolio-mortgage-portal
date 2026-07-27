import { TestBed } from '@angular/core/testing';

import { GatewayService } from './gateway.service';

describe('GatewayService', () => {
  it('is a no-op admitted immediately when not served under /mortgage/ (local dev/test)', () => {
    // jsdom's default document.baseURI has no /mortgage/ segment, so the
    // ENABLED flag (computed at module load) is false here, same as running
    // via ng serve locally - there is no real gateway to talk to.
    const gateway = TestBed.inject(GatewayService);
    expect(gateway.state()).toBe('admitted');
    expect(gateway.sessionId()).toBeNull();
  });
});
