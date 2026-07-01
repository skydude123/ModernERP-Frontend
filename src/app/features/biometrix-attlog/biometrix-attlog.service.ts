import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  BiometrixAttendanceOtUpdateRequest,
  BiometrixAttendanceOtUpdateResponse,
  BiometrixBranch,
  BiometrixPayrollPeriod,
  BiometrixUploadBatchDetailResponse,
  BiometrixUploadBatchHistoryResponse,
  BiometrixUploadCommand
} from './biometrix-attlog.model';

@Injectable({ providedIn: 'root' })
export class BiometrixAttlogService {
  private readonly http = inject(HttpClient);

  // IMPORTANT:
  // Same base URL sa imong backend.
  private readonly apiBaseUrl = 'http://localhost:51033/api/biometrix/attlog';

  uploadAndProcess(command: BiometrixUploadCommand): Observable<BiometrixUploadBatchDetailResponse> {
    const formData = new FormData();

    formData.append('dateFrom', this.toDateOnly(command.dateFrom!));
    formData.append('dateTo', this.toDateOnly(command.dateTo!));
    formData.append('uploadedBy', command.uploadedBy ?? '');

    // MODIFICATION:
    // Sends selected payroll_period like 341, 342, 343.
    formData.append(
      'payrollPeriod',
      command.payrollPeriod !== null && command.payrollPeriod !== undefined
        ? String(command.payrollPeriod)
        : ''
    );

    // MODIFICATION:
    // Sends selected branchName like MANDAUE.
    formData.append('branchName', command.branchName ?? '');

    formData.append('file', command.file!, command.file!.name);

    return this.http.post<BiometrixUploadBatchDetailResponse>(
      `${this.apiBaseUrl}/upload-range`,
      formData
    );
  }

  getBatch(uploadBatchId: number): Observable<BiometrixUploadBatchDetailResponse> {
    return this.http.get<BiometrixUploadBatchDetailResponse>(
      `${this.apiBaseUrl}/batch/${uploadBatchId}`
    );
  }

  getHistory(take = 25): Observable<BiometrixUploadBatchHistoryResponse[]> {
    const params = new HttpParams().set('take', take);

    return this.http.get<BiometrixUploadBatchHistoryResponse[]>(
      `${this.apiBaseUrl}/history`,
      { params }
    );
  }

  // MODIFICATION:
  // Payroll Period ComboBox source.
  getPayrollPeriods(): Observable<BiometrixPayrollPeriod[]> {
    return this.http.get<BiometrixPayrollPeriod[]>(
      `${this.apiBaseUrl}/payroll-periods`
    );
  }

  // MODIFICATION:
  // Branch ComboBox source.
  getBranches(): Observable<BiometrixBranch[]> {
    return this.http.get<BiometrixBranch[]>(
      `${this.apiBaseUrl}/branches`
    );
  }

  // MODIFICATION:
  // Editable OT save.
  // Uses ProcessedAttendanceId only.
  updateAttendanceOt(
    request: BiometrixAttendanceOtUpdateRequest
  ): Observable<BiometrixAttendanceOtUpdateResponse> {
    return this.http.put<BiometrixAttendanceOtUpdateResponse>(
      `${this.apiBaseUrl}/attendance/ot`,
      request
    );
  }

  private toDateOnly(value: Date): string {
    const y = value.getFullYear();
    const m = `${value.getMonth() + 1}`.padStart(2, '0');
    const d = `${value.getDate()}`.padStart(2, '0');

    return `${y}-${m}-${d}`;
  }
}