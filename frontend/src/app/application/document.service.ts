import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface UploadedDocument {
  id: number;
  document_type: string;
  filename: string;
  content_type: string;
  size_bytes: number;
}

/** Multipart upload + listing for documents attached to a specific application. */
@Injectable({ providedIn: 'root' })
export class DocumentService {
  private readonly http = inject(HttpClient);

  upload(applicationId: number, documentType: string, file: File): Observable<UploadedDocument> {
    const formData = new FormData();
    formData.append('document_type', documentType);
    formData.append('file', file);
    return this.http.post<UploadedDocument>(
      `/api/applications/${applicationId}/documents`,
      formData,
    );
  }

  list(applicationId: number): Observable<UploadedDocument[]> {
    return this.http.get<UploadedDocument[]>(`/api/applications/${applicationId}/documents`);
  }
}
