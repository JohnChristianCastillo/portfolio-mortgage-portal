import { TestBed } from '@angular/core/testing';

import { TierBadgeComponent } from './tier-badge.component';

describe('TierBadgeComponent', () => {
  it('renders nothing when there is no tier', () => {
    const fixture = TestBed.createComponent(TierBadgeComponent);
    fixture.componentRef.setInput('tier', null);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.tier-badge')).toBeNull();
  });

  it('renders the label and hint for a known tier', () => {
    const fixture = TestBed.createComponent(TierBadgeComponent);
    fixture.componentRef.setInput('tier', 'invited');
    fixture.detectChanges();
    const badge = (fixture.nativeElement as HTMLElement).querySelector('.tier-badge');
    expect(badge?.textContent?.trim()).toBe('Invited');
    expect(badge?.getAttribute('title')).toContain('invite link');
  });

  it('renders nothing for an unrecognized tier value', () => {
    const fixture = TestBed.createComponent(TierBadgeComponent);
    fixture.componentRef.setInput('tier', 'bogus');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.tier-badge')).toBeNull();
  });
});
