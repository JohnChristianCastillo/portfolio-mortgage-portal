/**
 * Lists the logged-in borrower's own applications and lets them withdraw a
 * submitted one. A draft is already freely editable elsewhere, so this list
 * only offers Withdraw on a submitted application (see ApplicationService).
 */
import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';

import { Application, ApplicationService } from '../application/application.service';
import { extractErrorMessage } from '../core/http-error';

@Component({
  selector: 'app-applications-list',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './applications-list.component.html',
  styleUrl: './applications-list.component.css',
})
export class ApplicationsListComponent implements OnInit {
  private readonly applications = inject(ApplicationService);

  readonly items = signal<Application[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly withdrawingId = signal<number | null>(null);

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.applications.list().subscribe({
      next: (items) => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(
          extractErrorMessage(err, 'Could not load your applications, please try again.'),
        );
        this.loading.set(false);
      },
    });
  }

  withdraw(id: number): void {
    this.withdrawingId.set(id);
    this.errorMessage.set(null);
    this.applications.withdraw(id).subscribe({
      next: (updated) => {
        this.items.update((items) => items.map((a) => (a.id === updated.id ? updated : a)));
        this.withdrawingId.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(extractErrorMessage(err, 'Could not withdraw, please try again.'));
        this.withdrawingId.set(null);
      },
    });
  }
}
