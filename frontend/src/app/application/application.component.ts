import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, switchMap, tap } from 'rxjs';

import { LastSimulationService } from '../simulation/last-simulation.service';
import { Application, ApplicationService } from './application.service';
import { DocumentService, UploadedDocument } from './document.service';
import { extractErrorMessage } from '../core/http-error';

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
 *
 * Progress is autosaved to the backend as a real draft application on every
 * step change, so a refresh, a crash, or a closed tab does not lose what has
 * been filled in. On load the most recent draft is resumed automatically.
 */
@Component({
  selector: 'app-application',
  standalone: true,
  imports: [ReactiveFormsModule, DecimalPipe],
  templateUrl: './application.component.html',
  styleUrl: './application.component.css',
})
export class ApplicationComponent implements OnInit {
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

  /** The persisted draft this form is bound to; null until the first save. */
  readonly draftId = signal<number | null>(null);
  readonly resumedDraft = signal(false);
  readonly loadingDraft = signal(true);
  readonly saving = signal(false);
  /** Set when an autosave fails, so the borrower knows progress is not being kept. */
  readonly saveError = signal<string | null>(null);

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

  ngOnInit(): void {
    // Resume the most recent unsubmitted draft, if there is one. The list
    // comes back newest-first from the backend, so the first draft in it is
    // the one to continue.
    this.applications.list().subscribe({
      next: (applications) => {
        const draft = applications.find((application) => application.status === 'draft');
        if (draft) {
          this.draftId.set(draft.id);
          this.resumedDraft.set(true);
          // A saved draft outranks the simulation pre-fill: it is what the
          // borrower actually typed, the pre-fill is only a starting guess.
          this.form.patchValue({
            property_value: draft.property_value,
            term_years: draft.term_years,
            employment_status: draft.employment_status ?? 'employee',
            monthly_income: draft.monthly_income,
            monthly_expenses: draft.monthly_expenses,
          });
        }
        this.loadingDraft.set(false);
      },
      // Fail open: not being able to look for a draft must not block starting
      // a fresh application, so this only stops the loading state.
      error: () => this.loadingDraft.set(false),
    });
  }

  next(): void {
    if (this.stepIndex() < STEPS.length - 1) {
      this.stepIndex.set(this.stepIndex() + 1);
      this.persistDraft();
    }
  }

  back(): void {
    if (this.stepIndex() > 0) {
      this.stepIndex.set(this.stepIndex() - 1);
      this.persistDraft();
    }
  }

  /** Discard the resumed draft and begin a new application from scratch. */
  startNewApplication(): void {
    this.draftId.set(null);
    this.resumedDraft.set(false);
    this.saveError.set(null);
    this.stepIndex.set(0);
    this.form.reset({
      property_value: this.lastSimulation.lastInputs()?.property_value ?? 300000,
      term_years: this.lastSimulation.lastInputs()?.term_years ?? 25,
      employment_status: 'employee',
      monthly_income: this.lastSimulation.lastInputs()?.monthly_income ?? 5800,
      monthly_expenses: this.lastSimulation.lastInputs()?.monthly_expenses ?? 500,
    });
  }

  /** Fire-and-forget autosave; submitting uses saveDraft() directly instead. */
  private persistDraft(): void {
    this.saving.set(true);
    this.saveDraft().subscribe({
      next: () => {
        this.saveError.set(null);
        this.saving.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.saveError.set(
          extractErrorMessage(err, 'Could not save your progress, please check your connection.'),
        );
        this.saving.set(false);
      },
    });
  }

  /**
   * Creates the draft on first save and updates it thereafter, so the caller
   * does not have to care which of the two it is.
   */
  private saveDraft(): Observable<Application> {
    const value = this.form.getRawValue();
    const fields = {
      property_value: value.property_value!,
      term_years: value.term_years!,
      employment_status: value.employment_status,
      monthly_income: value.monthly_income!,
      monthly_expenses: value.monthly_expenses!,
      loan_amount: this.lastResult?.loan_amount ?? value.property_value!,
      interest_rate: this.lastResult?.interest_rate ?? 0,
    };

    const id = this.draftId();
    return id === null
      ? this.applications.create(fields).pipe(tap((created) => this.draftId.set(created.id)))
      : this.applications.update(id, fields);
  }

  submitApplication(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    // Save the latest values first (creating the draft if this form was never
    // autosaved), then flip that same draft to submitted.
    this.saveDraft()
      .pipe(switchMap((application) => this.applications.submit(application.id)))
      .subscribe({
        next: (application) => {
          this.submittedApplication.set(application);
          this.submitting.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.errorMessage.set(
            extractErrorMessage(err, 'Could not submit the application, please try again.'),
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
        this.uploadError.set(extractErrorMessage(err, 'Upload failed, please try again.'));
        this.uploading.set(false);
      },
    });
  }
}
