import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { rxResource } from '@angular/core/rxjs-interop';
import { FileRestrictions } from '@progress/kendo-angular-upload';
import { catchError, forkJoin, of } from 'rxjs';
import { BiometrixAttlogService } from './biometrix-attlog.service';
import {
  BiometrixAttendanceOtUpdateRequest,
  BiometrixAttendanceRow,
  BiometrixBranch,
  BiometrixPayrollPeriod,
  BiometrixUploadBatchDetailResponse,
  BiometrixUploadCommand,
  BiometrixUploadSummary
} from './biometrix-attlog.model';

@Injectable()
export class BiometrixAttlogFacade {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(BiometrixAttlogService);

  private readonly _selectedFile = signal<File | null>(null);
  private readonly _busy = signal(false);
  private readonly _lookupBusy = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _batchDetail = signal<BiometrixUploadBatchDetailResponse | null>(null);
  private readonly _currentBatchId = signal<number | null>(null);

  private readonly _payrollPeriods = signal<BiometrixPayrollPeriod[]>([]);
  private readonly _branches = signal<BiometrixBranch[]>([]);

  readonly form = this.fb.group({
    dateFrom: [this.firstDayOfCurrentMonth(), Validators.required],
    dateTo: [this.today(), Validators.required]
  });

  readonly fileRestrictions: FileRestrictions = {
    allowedExtensions: ['.dat'],
    maxFileSize: 20 * 1024 * 1024
  };

  readonly batchReloadResource = rxResource<BiometrixUploadBatchDetailResponse | null, number | undefined>({
    request: () => this._currentBatchId() ?? undefined,
    loader: ({ request }) => {
      if (request === undefined) {
        return of(null);
      }

      return this.api.getBatch(request).pipe(
        catchError((error: HttpErrorResponse) => {
          this._error.set(this.toErrorMessage(error));
          return of(null);
        })
      );
    }
  });

  readonly selectedFile = computed(() => this._selectedFile());
  readonly selectedFileName = computed(() => this._selectedFile()?.name ?? 'No file selected');
  readonly selectedFileSizeText = computed(() => this.formatBytes(this._selectedFile()?.size ?? 0));
  readonly error = computed(() => this._error());
  readonly batchDetail = computed(() => this._batchDetail());
  readonly currentBatchId = computed(() => this._currentBatchId());
  readonly rows = computed<BiometrixAttendanceRow[]>(() => this._batchDetail()?.rows ?? []);
  readonly payrollPeriods = computed(() => this._payrollPeriods());
  readonly branches = computed(() => this._branches());

  readonly dirtyOtCount = computed(() =>
    this.rows().filter(row => row.otDirty === true).length
  );

  readonly hasSavingOt = computed(() =>
    this.rows().some(row => row.otSaving === true)
  );

  readonly loading = computed(() =>
    this._busy() ||
    this._lookupBusy() ||
    this.batchReloadResource.isLoading()
  );

  readonly canUpload = computed(() =>
    !!this._selectedFile() &&
    this.form.valid &&
    !this.loading() &&
    !this.hasSavingOt()
  );

  readonly canRefresh = computed(() =>
    this._currentBatchId() !== null &&
    !this.loading() &&
    !this.hasSavingOt()
  );

  readonly summary = computed<BiometrixUploadSummary>(() => {
    const rows = this.rows();

    return {
      totalRows: rows.length,
      totalHours: rows.reduce((sum, row) => sum + (Number(row.noOfHoursWork) || 0), 0),
      totalOt: rows.reduce((sum, row) => sum + (Number(row.ot) || 0), 0),
      incompleteRows: rows.filter(row => {
        const remarks = row.remarks ?? '';

        return (
          remarks.includes('MISSING') ||
          remarks.includes('INVALID') ||
          remarks.includes('INCOMPLETE')
        );
      }).length
    };
  });

  constructor() {
    effect(() => {
      const refreshedBatch = this.batchReloadResource.value();

      if (refreshedBatch) {
        this._batchDetail.set(this.prepareRowsForEdit(refreshedBatch));
      }
    });

    this.loadLookups();
  }

  loadLookups(): void {
    this._lookupBusy.set(true);
    this._error.set(null);

    forkJoin({
      payrollPeriods: this.api.getPayrollPeriods(),
      branches: this.api.getBranches()
    }).subscribe({
      next: result => {
        this._payrollPeriods.set(result.payrollPeriods);
        this._branches.set(result.branches);
        this._lookupBusy.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this._error.set(this.toErrorMessage(error));
        this._lookupBusy.set(false);
      }
    });
  }

  setSelectedFile(file: File | null): void {
    this._selectedFile.set(file);
  }

  clear(): void {
    this.form.reset({
      dateFrom: this.firstDayOfCurrentMonth(),
      dateTo: this.today()
    });

    this._selectedFile.set(null);
    this._error.set(null);
    this._batchDetail.set(null);
    this._currentBatchId.set(null);
  }

  uploadAndProcess(payrollPeriod: number | null, branchName: string | null): void {
    if (!this.form.valid) {
      this._error.set('Date From and Date To are required.');
      return;
    }

    const dateFrom = this.form.controls.dateFrom.value;
    const dateTo = this.form.controls.dateTo.value;

    if (!dateFrom || !dateTo) {
      this._error.set('Date From and Date To are required.');
      return;
    }

    if (dateFrom > dateTo) {
      this._error.set('Date From cannot be later than Date To.');
      return;
    }

    if (!this._selectedFile()) {
      this._error.set('ATTLOG.DAT file is required.');
      return;
    }

    if (!payrollPeriod) {
      this._error.set('Payroll Period is required.');
      return;
    }

    if (!branchName) {
      this._error.set('Branch Name is required.');
      return;
    }

    const command: BiometrixUploadCommand = {
      dateFrom,
      dateTo,
      payrollPeriod,
      branchName,
      file: this._selectedFile(),
      uploadedBy: null
    };

    this._busy.set(true);
    this._error.set(null);

    this.api.uploadAndProcess(command).subscribe({
      next: response => {
        this._batchDetail.set(this.prepareRowsForEdit(response));
        this._currentBatchId.set(response.uploadBatchId);
        this._busy.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this._error.set(this.toErrorMessage(error));
        this._busy.set(false);
      }
    });
  }

  refreshCurrentBatch(): void {
    if (this._currentBatchId() === null) {
      return;
    }

    if (this.dirtyOtCount() > 0) {
      this._error.set('Please save or revert edited OT before refreshing.');
      return;
    }

    this._error.set(null);
    this.batchReloadResource.reload();
  }

  updateOtLocally(rowKey: string, value: number | null): void {
    const normalizedOt = this.normalizeOt(value);

    this.updateRowByKey(rowKey, row => {
      const originalOt = row.originalOt ?? this.toNumber(row.ot);

      return {
        ...row,
        originalOt,
        ot: normalizedOt,
        otDirty: normalizedOt !== originalOt,
        otSaveError: null
      };
    });
  }

  saveOt(rowKey: string, updatedBy: string | null = 'Admin'): void {
    const batch = this._batchDetail();

    if (!batch) {
      this.setRowOtError(rowKey, 'No active upload batch.');
      return;
    }

    const row = batch.rows.find(item => this.buildRowKey(item) === rowKey);

    if (!row) {
      this.setRowOtError(rowKey, 'Attendance row was not found.');
      return;
    }

    if (!row.processedAttendanceId) {
      this.setRowOtError(rowKey, 'ProcessedAttendanceId is missing from API result.');
      return;
    }

    const request: BiometrixAttendanceOtUpdateRequest = {
      processedAttendanceId: Number(row.processedAttendanceId),
      otHours: this.normalizeOt(row.ot),
      updatedBy
    };

    this.updateRowByKey(rowKey, item => ({
      ...item,
      otSaving: true,
      otSaveError: null
    }));

    this.api.updateAttendanceOt(request).subscribe({
      next: response => {
        const savedOt = this.normalizeOt(response.otHours);

        this.updateRowByKey(rowKey, item => ({
          ...item,
          ot: savedOt,
          originalOt: savedOt,
          otDirty: false,
          otSaving: false,
          otSaveError: null
        }));
      },
      error: (error: HttpErrorResponse) => {
        this.updateRowByKey(rowKey, item => ({
          ...item,
          otSaving: false,
          otSaveError: this.toErrorMessage(error)
        }));
      }
    });
  }

  saveAllOtChanges(): void {
    const dirtyRowKeys = this.rows()
      .filter(row => row.otDirty === true && row.otSaving !== true)
      .map(row => this.buildRowKey(row));

    dirtyRowKeys.forEach(rowKey => this.saveOt(rowKey, 'Admin'));
  }

  revertOt(rowKey: string): void {
    this.updateRowByKey(rowKey, row => {
      const originalOt = row.originalOt ?? this.toNumber(row.ot);

      return {
        ...row,
        ot: originalOt,
        otDirty: false,
        otSaving: false,
        otSaveError: null
      };
    });
  }

  isOtDirty(rowKey: string): boolean {
    return this.rows().some(row => this.buildRowKey(row) === rowKey && row.otDirty === true);
  }

  isOtSaving(rowKey: string): boolean {
    return this.rows().some(row => this.buildRowKey(row) === rowKey && row.otSaving === true);
  }

  getOtSaveError(rowKey: string): string | null {
    return this.rows().find(row => this.buildRowKey(row) === rowKey)?.otSaveError ?? null;
  }

  buildRowKey(row: Partial<BiometrixAttendanceRow>): string {
    return [
      row.idno ?? '',
      row.date ?? '',
      row.timeIn ?? '',
      row.timeOut ?? ''
    ].join('|');
  }

  private prepareRowsForEdit(
    batch: BiometrixUploadBatchDetailResponse
  ): BiometrixUploadBatchDetailResponse {
    return {
      ...batch,
      rows: batch.rows.map(row => {
        const originalOt = this.toNumber(row.ot);

        return {
          ...row,
          ot: originalOt,
          originalOt,
          otDirty: false,
          otSaving: false,
          otSaveError: null
        };
      })
    };
  }

  private updateRowByKey(
    rowKey: string,
    updater: (row: BiometrixAttendanceRow) => BiometrixAttendanceRow
  ): void {
    const batch = this._batchDetail();

    if (!batch) {
      return;
    }

    this._batchDetail.set({
      ...batch,
      rows: batch.rows.map(row =>
        this.buildRowKey(row) === rowKey ? updater(row) : row
      )
    });
  }

  private setRowOtError(rowKey: string, message: string): void {
    this.updateRowByKey(rowKey, row => ({
      ...row,
      otSaving: false,
      otSaveError: message
    }));
  }

  private normalizeOt(value: unknown): number {
    const numericValue = this.toNumber(value);

    if (numericValue < 0) {
      return 0;
    }

    if (numericValue > 24) {
      return 24;
    }

    return Number(numericValue.toFixed(2));
  }

  private toNumber(value: unknown): number {
    if (value === null || value === undefined || value === '') {
      return 0;
    }

    const numericValue = Number(value);

    if (Number.isNaN(numericValue)) {
      return 0;
    }

    return numericValue;
  }

  private toErrorMessage(error: HttpErrorResponse): string {
    if (typeof error.error === 'string' && error.error.trim() !== '') {
      return error.error;
    }

    if (error.error?.message) {
      return error.error.message;
    }

    if (error.error?.detail) {
      return error.error.detail;
    }

    if (error.message) {
      return error.message;
    }

    return 'An unexpected error occurred while processing the attendance upload.';
  }

  private firstDayOfCurrentMonth(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  private today(): Date {
    return new Date();
  }

  private formatBytes(bytes: number): string {
    if (!bytes || bytes <= 0) {
      return '0 B';
    }

    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let index = 0;

    while (size >= 1024 && index < units.length - 1) {
      size /= 1024;
      index++;
    }

    return `${size.toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
  }
}