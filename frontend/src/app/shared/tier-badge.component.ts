import { Component, computed, input } from '@angular/core';

// Labels/hints mirror the gateway's own tier vocabulary and the
// trading-helper app's TierBadge, so what a visitor sees here reads the same
// as the session table in the admin panel.
const LABELS: Record<string, string> = {
  admin: 'Admin',
  invited: 'Invited',
  anonymous: 'Anonymous',
};

const HINTS: Record<string, string> = {
  admin: 'You are signed in as the owner, with full access.',
  invited: 'You are here on an invite link.',
  anonymous: 'You are browsing as a guest, on the anonymous slot pool.',
};

/** Shows which access tier the gateway admitted this session under. Renders
 * nothing without a recognized tier (local dev, or before admission). */
@Component({
  selector: 'app-tier-badge',
  standalone: true,
  templateUrl: './tier-badge.component.html',
  styleUrl: './tier-badge.component.css',
})
export class TierBadgeComponent {
  readonly tier = input<string | null>(null);

  protected readonly label = computed(() => {
    const t = this.tier();
    return t ? (LABELS[t] ?? null) : null;
  });

  protected readonly hint = computed(() => {
    const t = this.tier();
    return t ? (HINTS[t] ?? '') : '';
  });
}
