import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { switchMap } from 'rxjs';

import { LastSimulationService } from '../simulation/last-simulation.service';
import { Application, ApplicationService } from './application.service';
import { DocumentService, UploadedDocument } from './document.service';

export const DOCUMENT_TYPES = ['EPC Certificate', 'ID Document', 'Proof of Income', 'Other'];

type Step = 'about' | 'personal' | 'income' | 'expenses' | 'submit';

const STEPS: { key: Step; label: string }[] = [
  { key: 'about', label: 'About project' },
  { key: 'personal', label: 'Personal details' },
  { key: 'income', label: 'Income details' },
  { key: 'expenses', label: 'Expenses details' },
  { key: 'submit', label: 'Submit application' },
];

/**
 * A single component with visual step sections (About/Personal/Income/
 * Expenses/Submit, names borrowed from the Loom demo) instead of a routed
 * wizard - the brief explicitly allows "a single multi-step form". Pre-fills
 * from LastSimulationService when the borrower ran a simulation first.
 */
@Component({
  selector: 'app-application',
  standalone: true,
  imports: [ReactiveFormsModule, DecimalPipe],
  templateUrl: './application.component.html',
  styleUrl: './application.component.css',
})
export class ApplicationComponent {
  private readonly fb = inject(FormBuilder);
  private readonly applications = inject(ApplicationService);
  private readonly lastSimulation = inject(LastSimulationService);
  private readonly documentsApi = inject(DocumentService);

  protected readonly documentTypes = DOCUMENT_TYPES;
  readonly documentType = signal(DOCUMENT_TYPES[0]);
  readonly selectedFile = signal<File | null>(null);
  readonly uploadedDocuments = signal<UploadedDocument[]>([]);
  readonly uploadError = signal<string | null>(null);
  protected readonly uploading = signal(false);

  protected readonly steps = STEPS;
  protected readonly stepIndex = signal(0);
  readonly currentStep = computed(() => STEPS[this.stepIndex()].key);

  readonly submittedApplication = signal<Application | null>(null);
  readonly errorMessage = signal<string | null>(null);
  protected readonly submitting = signal(false);

  private readonly lastResult = this.lastSimulation.lastResult();

  protected readonly form = this.fb.group({
    property_value: [
      this.lastSimulation.lastInputs()?.property_value ?? 300000,
      [Validators.required, Validators.min(1)],
    ],
    term_years: [
      this.lastSimulation.lastInputs()?.term_years ?? 25,
      [Validators.required, Validators.min(5), Validators.max(35)],
    ],
    employment_status: ['employee', [Validators.required]],
    monthly_income: [
      this.lastSimulation.lastInputs()?.monthly_income ?? 5800,
      [Validators.required, Validators.min(0)],
    ],
    monthly_expenses: [
      this.lastSimulation.lastInputs()?.monthly_expenses ?? 500,
      [Validators.required, Validators.min(0)],
    ],
  });

  next(): void {
    if (this.stepIndex() < STEPS.length - 1) {
      this.stepIndex.set(this.stepIndex() + 1);
    }
  }

  back(): void {
    if (this.stepIndex() > 0) {
      this.stepIndex.set(this.stepIndex() - 1);
    }
  }

  submitApplication(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    const value = this.form.getRawValue();
    this.applications
      .create({
        property_value: value.property_value!,
        term_years: value.term_years!,
        employment_status: value.employment_status,
        monthly_income: value.monthly_income!,
        monthly_expenses: value.monthly_expenses!,
        loan_amount: this.lastResult?.loan_amount ?? value.property_value!,
        interest_rate: this.lastResult?.interest_rate ?? 0,
      })
      .pipe(switchMap((application) => this.applications.submit(application.id)))
      .subscribe({
        next: (application) => {
          this.submittedApplication.set(application);
          this.submitting.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.errorMessage.set(
            err.error?.error?.message ?? 'Could not submit the application, please try again.',
          );
          this.submitting.set(false);
        },
      });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile.set(input.files?.[0] ?? null);
  }

  uploadDocument(): void {
    const file = this.selectedFile();
    const application = this.submittedApplication();
    if (!file || !application) {
      return;
    }

    this.uploading.set(true);
    this.uploadError.set(null);

    this.documentsApi.upload(application.id, this.documentType(), file).subscribe({
      next: (document) => {
        this.uploadedDocuments.update((docs) => [...docs, document]);
        this.selectedFile.set(null);
        this.uploading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.uploadError.set(err.error?.error?.message ?? 'Upload failed, please try again.');
        this.uploading.set(false);
      },
    });
  }
}
