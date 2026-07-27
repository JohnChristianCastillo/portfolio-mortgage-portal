import { Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { SimulateResult, SimulationService } from './simulation.service';
import { LastSimulationService } from './last-simulation.service';
import { extractErrorMessage } from '../core/http-error';

@Component({
  selector: 'app-simulation',
  standalone: true,
  imports: [ReactiveFormsModule, DecimalPipe],
  templateUrl: './simulation.component.html',
  styleUrl: './simulation.component.css',
})
export class SimulationComponent {
  private readonly fb = inject(FormBuilder);
  private readonly simulation = inject(SimulationService);
  private readonly lastSimulation = inject(LastSimulationService);

  readonly result = signal<SimulateResult | null>(null);
  readonly errorMessage = signal<string | null>(null);
  protected readonly submitting = signal(false);

  protected readonly form = this.fb.group({
    property_value: [300000, [Validators.required, Validators.min(1)]],
    down_payment: [70000, [Validators.required, Validators.min(0)]],
    monthly_income: [5800, [Validators.required, Validators.min(0)]],
    monthly_expenses: [500, [Validators.required, Validators.min(0)]],
    term_years: [25, [Validators.required, Validators.min(5), Validators.max(35)]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    this.result.set(null);

    const value = this.form.getRawValue();
    const request = {
      property_value: value.property_value!,
      down_payment: value.down_payment!,
      monthly_income: value.monthly_income!,
      monthly_expenses: value.monthly_expenses!,
      term_years: value.term_years!,
    };
    this.simulation.simulate(request).subscribe({
      next: (result) => {
        this.result.set(result);
        this.lastSimulation.remember(request, result);
        this.submitting.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(
          extractErrorMessage(err, 'Simulation failed, please check your inputs.'),
        );
        this.submitting.set(false);
      },
    });
  }
}
