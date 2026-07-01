import { Injectable, computed, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';

import { BiometrixDtrListingService } from './biometrix-dtr-listing.service';
import { BiometrixDtrListingFilter, BiometrixDtrListingRow, BiometrixDtrListingUpdateRequest, BiometrixLookupItem } from '../biometrix-attlog.model';

@Injectable()
export class BiometrixDtrListingFacade {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(BiometrixDtrListingService);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly branches = signal<BiometrixLookupItem[]>([]);
  readonly payrollPeriods = signal<BiometrixLookupItem[]>([]);
  readonly rows = signal<BiometrixDtrListingRow[]>([]);

  readonly editDialogOpen = signal(false);
  readonly selectedRow = signal<BiometrixDtrListingRow | null>(null);

  readonly filterForm = this.fb.group({
    branchName: ['ALL', Validators.required],
    payrollPeriod: ['', Validators.required]
  });

  readonly editForm = this.fb.group({
    dtrId: [0, Validators.required],
    employeeIdNo: [{ value: '', disabled: true }],
    hrisIdNo: [{ value: '', disabled: true }],
    empName: [{ value: '', disabled: true }],
    workDate: [null as Date | null, Validators.required],
    scheduleStartTime: [null as Date | null, Validators.required],
    scheduleEndTime: [null as Date | null, Validators.required],
    timeIn: [null as Date | null],
    timeOut: [null as Date | null],
    noOfHoursWork: [0, Validators.required],
    otHours: [0, Validators.required],
    remarks: ['']
  });

  readonly totalRows = computed(() => this.rows().length);

  readonly totalHours = computed(() =>
    this.rows().reduce((sum, row) => sum + (Number(row.noOfHoursWork) || 0), 0)
  );

  readonly totalOt = computed(() =>
    this.rows().reduce((sum, row) => sum + (Number(row.otHours) || 0), 0)
  );

  readonly canExport = computed(() => this.rows().length > 0 && !this.loading());

  loadLookups(): void {
    this.error.set(null);

    this.service.getBranches().subscribe({
      next: (response) => {
        const branchItems = [...(response ?? [])];
        const hasAll = branchItems.some(x => (x.value ?? '').toUpperCase() === 'ALL');

        if (!hasAll) {
          branchItems.unshift({ text: 'ALL', value: 'ALL' });
        }

        this.branches.set(branchItems);
      },
      error: (err) => this.error.set(this.toErrorMessage(err))
    });

    this.service.getPayrollPeriods().subscribe({
      next: (response) => this.payrollPeriods.set(response ?? []),
      error: (err) => this.error.set(this.toErrorMessage(err))
    });
  }

  loadRows(): void {
    if (this.filterForm.invalid) {
      this.error.set('Branch Name and Payroll Period are required.');
      return;
    }

    const branchName = this.filterForm.controls.branchName.value ?? 'ALL';
    const payrollPeriodValue = this.filterForm.controls.payrollPeriod.value;

    if (!payrollPeriodValue) {
      this.error.set('Payroll period is required.');
      return;
    }

    const filter: BiometrixDtrListingFilter = {
      branchName,
      payrollPeriod: Number(payrollPeriodValue)
    };

    this.loading.set(true);
    this.error.set(null);

    this.service.getListing(filter).subscribe({
      next: (response) => {
        this.rows.set(response ?? []);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(this.toErrorMessage(err));
        this.rows.set([]);
        this.loading.set(false);
      }
    });
  }

  clearFilter(): void {
    this.filterForm.reset({
      branchName: 'ALL',
      payrollPeriod: ''
    });

    this.rows.set([]);
    this.error.set(null);
  }

  openEditDialog(row: BiometrixDtrListingRow): void {
    this.selectedRow.set(row);
    this.editDialogOpen.set(true);

    this.editForm.patchValue({
      dtrId: row.dtrId,
      employeeIdNo: row.employeeIdNo,
      hrisIdNo: row.hrisIdNo ?? '',
      empName: row.empName ?? '',
      workDate: this.toDate(row.workDate),
      scheduleStartTime: this.toTime(row.scheduleStartTime),
      scheduleEndTime: this.toTime(row.scheduleEndTime),
      timeIn: this.toTime(row.timeIn),
      timeOut: this.toTime(row.timeOut),
      noOfHoursWork: row.noOfHoursWork,
      otHours: row.otHours,
      remarks: row.remarks ?? ''
    });
  }

  closeEditDialog(): void {
    this.editDialogOpen.set(false);
    this.selectedRow.set(null);

    this.editForm.reset({
      dtrId: 0,
      employeeIdNo: '',
      hrisIdNo: '',
      empName: '',
      workDate: null,
      scheduleStartTime: null,
      scheduleEndTime: null,
      timeIn: null,
      timeOut: null,
      noOfHoursWork: 0,
      otHours: 0,
      remarks: ''
    });
  }

  saveEdit(): void {
    if (this.editForm.invalid) {
      this.error.set('Please complete the required edit fields.');
      return;
    }

    const dtrId = this.editForm.controls.dtrId.value!;
    const workDate = this.editForm.controls.workDate.value!;
    const scheduleStartTime = this.editForm.controls.scheduleStartTime.value!;
    const scheduleEndTime = this.editForm.controls.scheduleEndTime.value!;

    const payload: BiometrixDtrListingUpdateRequest = {
      dtrId,
      workDate: this.toDateOnly(workDate),
      scheduleStartTime: this.toTimeOnly(scheduleStartTime)!,
      scheduleEndTime: this.toTimeOnly(scheduleEndTime)!,
      timeIn: this.toTimeOnly(this.editForm.controls.timeIn.value),
      timeOut: this.toTimeOnly(this.editForm.controls.timeOut.value),
      noOfHoursWork: Number(this.editForm.controls.noOfHoursWork.value ?? 0),
      otHours: Number(this.editForm.controls.otHours.value ?? 0),
      remarks: this.editForm.controls.remarks.value ?? ''
    };

    this.saving.set(true);
    this.error.set(null);

    this.service.updateDtr(dtrId, payload).subscribe({
      next: (updatedRow) => {
        const newRows = [...this.rows()];
        const rowIndex = newRows.findIndex(x => x.dtrId === updatedRow.dtrId);

        if (rowIndex >= 0) {
          newRows[rowIndex] = updatedRow;
          this.rows.set(newRows);
        }

        this.saving.set(false);
        this.closeEditDialog();
      },
      error: (err) => {
        this.error.set(this.toErrorMessage(err));
        this.saving.set(false);
      }
    });
  }

  readonly exportFileName = computed(() => {
    const branch = (this.filterForm.controls.branchName.value ?? 'ALL').toString().trim() || 'ALL';
    const payrollPeriod = (this.filterForm.controls.payrollPeriod.value ?? 'PAYROLL').toString().trim() || 'PAYROLL';
    return `Biometrix_DTR_${branch.replace(/\s+/g, '_')}_Payroll_${payrollPeriod}.xlsx`;
  });

  private toDate(value: string | null): Date | null {
    if (!value) return null;
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  private toTime(value: string | null): Date | null {
    if (!value) return null;
    const [hh, mm, ss] = value.split(':').map(Number);
    const dt = new Date();
    dt.setHours(hh ?? 0, mm ?? 0, ss ?? 0, 0);
    return dt;
  }

  private toDateOnly(value: Date | null): string {
    if (!value) return '';
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private toTimeOnly(value: Date | null): string | null {
    if (!value) return null;
    const hh = String(value.getHours()).padStart(2, '0');
    const mm = String(value.getMinutes()).padStart(2, '0');
    const ss = String(value.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }

  private toErrorMessage(error: any): string {
    if (typeof error?.error === 'string' && error.error.trim() !== '') {
      return error.error;
    }

    if (error?.error?.message) {
      return error.error.message;
    }

    if (error?.error?.detail) {
      return error.error.detail;
    }

    if (error?.message) {
      return error.message;
    }

    return 'An unexpected error occurred.';
  }
}