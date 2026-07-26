import { Injectable, signal } from '@angular/core';

import { SimulateRequest, SimulateResult } from './simulation.service';

/**
 * Holds the most recent simulation's inputs and result in memory only (no
 * backend persistence - SimulationResult was cut from the data model per
 * 03_01_system_architecture.md). Lets the application form pre-fill from a
 * prior simulation, mirroring the Loom demo's "convert simulation into
 * application" step without adding a table for it.
 */
@Injectable({ providedIn: 'root' })
export class LastSimulationService {
  readonly lastInputs = signal<SimulateRequest | null>(null);
  readonly lastResult = signal<SimulateResult | null>(null);

  remember(inputs: SimulateRequest, result: SimulateResult): void {
    this.lastInputs.set(inputs);
    this.lastResult.set(result);
  }
}
