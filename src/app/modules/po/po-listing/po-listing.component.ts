import { CommonModule } from '@angular/common';
import {
  Component,
  OnDestroy,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import {
  DataStateChangeEvent,
  GridDataResult,
  GridModule,
  GridSmartBoxSearchEvent,
  GridSmartBoxSearchSettings,
  KENDO_GRID,
} from '@progress/kendo-angular-grid';
import { ButtonsModule } from '@progress/kendo-angular-buttons';
import { KENDO_TOOLBAR, ToolBarModule } from '@progress/kendo-angular-toolbar';
import { InputsModule } from '@progress/kendo-angular-inputs';
import { DropDownsModule } from '@progress/kendo-angular-dropdowns';
import { DateInputsModule } from '@progress/kendo-angular-dateinputs';
import {
  DialogCloseResult,
  DialogModule,
  DialogRef,
  DialogService,
} from '@progress/kendo-angular-dialog';
import {
  NotificationModule,
  NotificationService,
} from '@progress/kendo-angular-notification';
import { LabelModule } from '@progress/kendo-angular-label';
import { CompositeFilterDescriptor, State } from '@progress/kendo-data-query';
import { KENDO_INDICATORS } from '@progress/kendo-angular-indicators';

import { AppToolbarComponent } from '../../../shared/services/app-toolbar/app-toolbar.component';
import { AppToolbarService } from '../../../shared/services/app-toolbar/toolbar.service';
import { PurchaseOrderFacade } from '../purchase-order.facade';
import { PurchaseOrderListItem, QuickDateKey } from '../purchase-order.model';
import {
  ErpSaveConfirmDialogComponent,
  ErpSaveConfirmDialogData,
} from '../../../shared/save-confirm-dialog/erp-save-confirm-dialog.component';
import { ErpNotificationService } from '../../../shared/notification-card/erp-notification.service';

import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ReportingUrlService } from '../../../core/Reporting/reporting-url.service';
import {
  TelerikReportingModule,
  TelerikReportViewerComponent,
} from '@progress/telerik-angular-report-viewer';
import { AuthFacadeService } from '../../../core/services/auth-facade.service';

@Component({
  selector: 'app-po-listing',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    GridModule,
    ButtonsModule,
    ToolBarModule,
    InputsModule,
    DropDownsModule,
    DateInputsModule,
    DialogModule,
    NotificationModule,
    LabelModule,
    AppToolbarComponent,
    KENDO_GRID,
    KENDO_TOOLBAR,
    KENDO_INDICATORS,
    TelerikReportingModule,
  ],
  templateUrl: './po-listing.component.html',
  styleUrls: ['./po-listing.component.scss'],
})
export class PoListingComponent implements OnDestroy {
  @ViewChild('printViewer', { static: false })
  printViewer!: TelerikReportViewerComponent;

  readonly reportingUrlService = inject(ReportingUrlService);

  readonly auth = inject(AuthFacadeService);

  readonly facade = inject(PurchaseOrderFacade);
  readonly toolbarService = inject(AppToolbarService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly notificationService = inject(NotificationService);
  private readonly dialogService = inject(DialogService);
  private readonly sanitizer = inject(DomSanitizer);
  //private readonly notificationService = inject(NotificationService);
  //private readonly dialogService = inject(DialogService);
  private readonly erpNotify = inject(ErpNotificationService);

  readonly selectedPo = signal<PurchaseOrderListItem | null>(null);
  readonly showActionDialog = signal(false);
  readonly actionMode = signal<
    'POST' | 'APPROVE' | 'REOPEN' | 'REVERSE' | null
  >(null);

  readonly showPrintDialog = signal(false);
  readonly printViewerUrl = signal<SafeResourceUrl | null>(null);
  readonly printPoNo = signal('');

  //readonly actionMode = signal<'APPROVE' | 'REVERSE' | null>(null);

  viewerContainerStyle = {
    position: 'relative',
    width: '1000px',
    height: '800px',
    ['font-family']: 'ms sans serif',
  };

  readonly gridState = signal<State>({
    skip: 0,
    take: 50,
    sort: [{ field: 'poDate', dir: 'desc' }],
  });

  readonly filterForm = this.fb.group({
    fromDate: [new Date(new Date().getFullYear(), 0, 1)],
    toDate: [new Date()],
    status: ['ALL'],
    branchName: [null as string | null],
    search: [''],
  });

  // public filter: CompositeFilterDescriptor = {
  //   logic: "and",
  //   filters: [
  //     { field: "primaryDiagnosis", operator: "contains", value: "Chronic" },
  //   ],
  // };

  public filter: CompositeFilterDescriptor = {
    logic: 'and',
    filters: [],
  };

  public searchSettings: GridSmartBoxSearchSettings = {
    enabled: true,
    history: {
      size: 5,
      timestampFormat: 'HH:mm:ss',
    },
    placeholder: 'Search purchase orders...',
    delay: 300,
    fields: [
      'poNo',
      'status',
      'statusName',
      'branchName',
      'suppName',
      'termCode',
      'vatType',
      'soNo',
      'poDate',
    ],
  };

  readonly actionForm = this.fb.group({
    remarks: [''],
  });

  readonly gridData = computed<GridDataResult>(() => ({
    data: this.facade.poList(),
    total: this.facade.poTotal(),
  }));

  readonly selectedStatusText = computed(() => {
    const row = this.selectedPo();

    if (!row) {
      return '';
    }

    return `${row.poNo} - ${row.statusName}`;
  });

  readonly canPost = computed(() => this.selectedPo()?.status === 'N');
  readonly canApprove = computed(() => this.selectedPo()?.status === 'P');
  //readonly canReopen = computed(() => this.selectedPo()?.status === 'P');

  readonly canReverse = computed(() => {
    const row = this.selectedPo();

    if (!row) {
      return false;
    }

    return (
      row.status === 'P' || (row.status === 'A' && row.hasReceiving !== true)
    );
  });

  constructor() {
    this.toolbarService.setConfig({
      showNew: true,
      showSave: false,
      showPrint: true,
      showPost: true,
      showReverse: true,
      showRefresh: true,
      showToday: true,
      showYesterday: true,
      showThisMonth: true,
      showLastMonth: true,
      showThisYear: true,
      showLastYear: true,
    });

    this.applyFilters();
  }

  ngOnDestroy(): void {
    this.toolbarService.reset();
  }

  applyFilters(): void {
    const currentUserId = this.getCurrentUserId();

    const raw = this.filterForm.getRawValue();
    const state = this.gridState();
    const firstSort = state.sort?.[0];

    this.facade.updateQuery({
      fromDate: raw.fromDate ? this.toDateOnly(raw.fromDate) : null,

      toDate: raw.toDate ? this.toDateOnly(raw.toDate) : null,

      status: raw.status || 'ALL',
      branchName: raw.branchName || null,
      search: raw.search?.trim() || null,

      // ADDED:
      // Only retrieve records belonging to this logged-in user.
      userId: currentUserId,

      skip: state.skip ?? 0,
      take: state.take ?? 50,
      sortField: firstSort?.field ?? 'poDate',
      sortDir: firstSort?.dir ?? 'desc',
    });
  }

  clearFilters(): void {
    this.filterForm.reset({
      fromDate: new Date(new Date().getFullYear(), 0, 1),
      toDate: new Date(),
      status: 'ALL',
      branchName: null,
      search: '',
    });

    this.gridState.set({
      skip: 0,
      take: 50,
      sort: [{ field: 'poDate', dir: 'desc' }],
    });

    this.applyFilters();
  }

  public testConfirmDialog(): void {
    const row = this.selectedPo();

    const poNo = row?.poNo ?? 'AUTO / TEST';
    const statusName = row?.statusName ?? 'DRAFT';

    const dialog: DialogRef = this.dialogService.open({
      content: ErpSaveConfirmDialogComponent,
      width: 640,
      minWidth: 360,
      cssClass: 'erp-confirm-dialog-host',
    });

    const component = dialog.content.instance as ErpSaveConfirmDialogComponent;

    const data: ErpSaveConfirmDialogData = {
      title: 'Test Purchase Order Confirmation',
      message:
        'This is a sample confirmation dialog for Purchase Order Listing.',
      moduleName: 'Purchase Order Listing',
      documentNo: poNo,
      status: statusName,
      effectText:
        'This is only a test. No Purchase Order transaction will be posted, reversed, or saved.',
      note: 'Use this button only to test the new ERP Kendo confirmation dialog and notification style.',
      questionText: 'Do you want to proceed with this test confirmation?',
      confirmText: 'Yes, Test',
      cancelText: 'Cancel',
      showGrid: true,
      gridHeight: 155,
      gridData: [
        {
          poNo,
          statusName,
          branchName: row?.branchName ?? '-',
          suppName: row?.suppName ?? '-',
          totalAmount: row?.totalAmount ?? 0,
        },
      ],
      gridColumns: [
        { field: 'poNo', title: 'PO No.', width: 120 },
        { field: 'statusName', title: 'Status', width: 110 },
        { field: 'branchName', title: 'Branch', width: 120 },
        { field: 'suppName', title: 'Supplier', width: 220 },
        { field: 'totalAmount', title: 'Amount', width: 120 },
      ],
      showForm: true,
      formFields: [
        {
          name: 'remarks',
          label: 'Remarks',
          type: 'textarea',
          rows: 3,
          placeholder: 'Optional test remarks',
        },
      ],
    };

    component.data = data;

    dialog.result.subscribe((result) => {
      if (result instanceof DialogCloseResult) {
        return;
      }

      const response = result as {
        action?: string;
        formValue?: Record<string, string>;
      };

      if (response.action !== 'confirm') {
        this.erpNotify.info(
          'The test confirmation was cancelled.',
          'Test Cancelled',
          poNo,
          'Purchase Order Listing',
        );
        return;
      }

      const remarks = response.formValue?.['remarks']?.trim();

      this.erpNotify.success(
        remarks
          ? `Test confirmed successfully. Remarks: ${remarks}`
          : 'Test confirmed successfully.',
        'Test Confirmed',
        poNo,
        'Purchase Order Listing',
      );
    });
  }

  applyQuickDate(key: QuickDateKey): void {
    const range = this.getQuickDateRange(key);

    // Quick date filters intentionally modify only fromDate and toDate.
    // Branch, status, and search are left unchanged to avoid hidden filtering side effects.
    this.filterForm.patchValue(
      {
        fromDate: range.fromDate,
        toDate: range.toDate,
      },
      { emitEvent: false },
    );

    this.gridState.update((state) => ({
      ...state,
      skip: 0,
    }));

    this.facade.applyQuickDate(key);
  }

  // dataStateChange(state: DataStateChangeEvent): void {
  //   this.gridState.set({
  //     skip: state.skip ?? 0,
  //     take: state.take ?? 50,
  //     sort: state.sort?.length ? state.sort : [{ field: 'poDate', dir: 'desc' }]
  //   });

  //   this.applyFilters();
  // }

  // onGridSearch(event: unknown): void {
  //   const searchValue = this.getSmartBoxSearchValue(event);

  //   this.filterForm.patchValue({
  //     search: searchValue
  //   });

  //   this.gridState.update(state => ({
  //     ...state,
  //     skip: 0
  //   }));

  //   this.applyFilters();
  // }

  dataStateChange(state: DataStateChangeEvent): void {
    this.filter = state.filter ?? {
      logic: 'and',
      filters: [],
    };

    this.gridState.set({
      skip: state.skip ?? 0,
      take: state.take ?? 50,
      sort: state.sort?.length
        ? state.sort
        : [{ field: 'poDate', dir: 'desc' }],
    });

    this.applyFilters();
  }

  onGridSearch(event: GridSmartBoxSearchEvent): void {
    // Server-side ni nga grid, so ayaw ipa-client-side filter ni SmartBox.
    event.preventDefault();

    const searchValue = event.searchValue?.trim() ?? '';

    this.filterForm.patchValue({
      search: searchValue,
    });

    this.gridState.update((state) => ({
      ...state,
      skip: 0,
    }));

    this.applyFilters();
  }

  private getSmartBoxSearchValue(event: unknown): string {
    const value = event as {
      searchValue?: unknown;
      value?: unknown;
      query?: unknown;
      text?: unknown;
    };

    return String(
      value?.searchValue ?? value?.value ?? value?.query ?? value?.text ?? '',
    ).trim();
  }

  onSelectionChange(event: any): void {
    const selectedRows = event?.selectedRows ?? [];

    const selectedItem =
      selectedRows.length > 0
        ? (selectedRows[0]?.dataItem as PurchaseOrderListItem)
        : null;

    this.selectedPo.set(selectedItem ?? null);
  }

  newPo(): void {
    this.router.navigate(['/order/purchase-order-entry']);
  }

  readonly reportingServiceUrl = this.reportingUrlService.reportingServiceUrl;
  public rs: any;

  printSelected(): void {
    const row = this.selectedPo();

    const poNo = String(row?.poNo ?? '').trim();

    if (!poNo) {
      this.showError('Please select a Purchase Order before printing.');

      return;
    }

    this.rs = {
      report: 'PurchaseOrder.trdp',
      parameters: {
        po_no: poNo,
      },
    };

    // const viewerUrl =
    //   `/reporting/purchase-order-viewer.html` +
    //   `?poNo=${encodeURIComponent(poNo)}` +
    //   `&v=${Date.now()}`;

    // this.printPoNo.set(poNo);

    // this.printViewerUrl.set(
    //   this.sanitizer.bypassSecurityTrustResourceUrl(
    //     viewerUrl
    //   )
    // );

    this.showPrintDialog.set(true);
  }

  closePrintDialog(): void {
    this.showPrintDialog.set(false);
    this.printViewerUrl.set(null);
    this.printPoNo.set('');
  }

  refresh(): void {
    this.facade.reload();
  }

  openPost(): void {
    this.openAction('POST');
  }

  openReverse(): void {
    this.openAction('REVERSE');
  }

  editSelected(): void {
    const row = this.selectedPo();

    if (!row?.poNo) {
      return;
    }

    this.router.navigate(['/order/purchase-order-entry', row.poNo]);
  }

  openAction(mode: 'POST' | 'APPROVE' | 'REOPEN' | 'REVERSE'): void {
    const row = this.selectedPo();

    if (!row) {
      return;
    }

    this.actionMode.set(mode);
    this.actionForm.reset({ remarks: '' });
    this.showActionDialog.set(true);
  }

  // public showError(message: string): void {
  //   this.notificationService.show({
  //     content: message,
  //     hideAfter: 2500,
  //     cssClass: ['notification-colors-error', 'notification-font-error'],
  //     position: { horizontal: 'center', vertical: 'top' },
  //     animation: { type: 'fade', duration: 800 },
  //     height: 90,
  //     width: 550,
  //     type: { style: 'error', icon: true }
  //   });
  // }

  // public showSuccess(message: string): void {
  //   this.notificationService.show({
  //     content: message,
  //     hideAfter: 2500,
  //     cssClass: ['notification-colors', 'notification-font'],
  //     position: { horizontal: 'center', vertical: 'top' },
  //     animation: { type: 'fade', duration: 800 },
  //     height: 90,
  //     width: 550,
  //     type: { style: 'success', icon: true }
  //   });
  // }

  public showError(message: string): void {
    this.erpNotify.error(
      message,
      'Purchase Order Action Failed',
      '',
      'Purchase Order Listing',
    );
  }

  public showSuccess(message: string): void {
    this.erpNotify.success(
      message,
      'Purchase Order Action Successful',
      '',
      'Purchase Order Listing',
    );
  }

  private getNotificationError(error: unknown, fallback: string): string {
    const err = error as {
      error?: string | { message?: string };
      message?: string;
    };

    if (typeof err?.error === 'string') {
      return err.error;
    }

    return err?.error?.message || err?.message || fallback;
  }

  confirmAction(): void {
    const row = this.selectedPo();
    const mode = this.actionMode();

    if (!row || !mode) {
      return;
    }

    this.showActionConfirmDialog(mode, row.poNo, () => {
      const remarks = this.actionForm.getRawValue().remarks?.trim() || null;
      const userId = this.getCurrentUserId();

      const command =
        mode === 'POST'
          ? this.facade.postPo(row.poNo, userId, remarks)
          : mode === 'APPROVE'
            ? this.facade.approvePo(row.poNo, userId, remarks)
            : mode === 'REVERSE'
              ? row.status === 'P'
                ? this.facade.reopenPo(row.poNo, userId, remarks)
                : this.facade.reversePo(row.poNo, userId, remarks)
              : this.facade.reopenPo(row.poNo, userId, remarks);

      command.subscribe({
        next: (result) => {
          this.showActionDialog.set(false);
          this.selectedPo.set(null);

          this.showSuccess(`${result.poNo} is now ${result.statusName}.`);
        },
        error: (error) => {
          this.showError(
            this.getNotificationError(
              error,
              this.facade.actionError() || `${mode} failed.`,
            ),
          );
        },
      });
    });
  }

  private getActionTitle(
    mode: 'POST' | 'APPROVE' | 'REOPEN' | 'REVERSE',
  ): string {
    switch (mode) {
      case 'POST':
        return 'Post Purchase Order';
      case 'APPROVE':
        return 'Approve Purchase Order';
      case 'REOPEN':
        return 'Reopen Purchase Order';
      case 'REVERSE':
        return 'Reverse Purchase Order';
      default:
        return 'Confirm Action';
    }
  }

  private getActionMessage(
    mode: 'POST' | 'APPROVE' | 'REOPEN' | 'REVERSE',
    poNo: string,
  ): string {
    switch (mode) {
      case 'POST':
        return `Are you sure you want to post PO No. ${poNo}?`;
      case 'APPROVE':
        return `Are you sure you want to approve PO No. ${poNo}?`;
      case 'REOPEN':
        return `Are you sure you want to reopen PO No. ${poNo}?`;
      case 'REVERSE':
        return `Are you sure you want to reverse PO No. ${poNo}?`;
      default:
        return `Are you sure you want to continue with PO No. ${poNo}?`;
    }
  }

  // private showActionConfirmDialog(
  //   mode: 'POST' | 'APPROVE' | 'REOPEN' | 'REVERSE',
  //   poNo: string,
  //   yesCallback: () => void
  // ): void {
  //   const dialog: DialogRef = this.dialogService.open({
  //     title: 'Please confirm?',
  //     content: this.getActionMessage(mode, poNo),
  //     actions: [
  //       { text: 'No' },
  //       { text: 'Yes', themeColor: 'primary' }
  //     ],
  //     width: 550,
  //     height: 200,
  //     minWidth: 250,
  //     cssClass: 'custom-css-class'
  //   });

  //   dialog.result.subscribe(result => {
  //     if (result instanceof DialogCloseResult) {
  //       return;
  //     }

  //     if (result.text === 'Yes') {
  //       yesCallback();
  //     }
  //   });
  // }

  private showActionConfirmDialog(
    mode: 'POST' | 'APPROVE' | 'REOPEN' | 'REVERSE',
    poNo: string,
    yesCallback: () => void,
  ): void {
    const row = this.selectedPo();

    const dialog: DialogRef = this.dialogService.open({
      content: ErpSaveConfirmDialogComponent,
      width: 660,
      minWidth: 360,
      cssClass: 'erp-confirm-dialog-host',
    });

    const component = dialog.content.instance as ErpSaveConfirmDialogComponent;

    component.data = {
      title: this.getActionTitle(mode),
      message: this.getActionMessage(mode, poNo),
      moduleName: 'Purchase Order Listing',
      documentNo: poNo,
      status: row?.statusName ?? mode,
      effectText: this.getActionEffectText(mode, poNo),
      note: 'Please review the selected Purchase Order before continuing. This action may update the document status.',
      questionText: 'Do you want to proceed?',
      confirmText: this.getActionConfirmText(mode),
      cancelText: 'Back',
      showGrid: true,
      gridHeight: 155,
      gridData: [
        {
          poNo,
          statusName: row?.statusName ?? '-',
          branchName: row?.branchName ?? '-',
          suppName: row?.suppName ?? '-',
          totalAmount: row?.totalAmount ?? 0,
        },
      ],
      gridColumns: [
        { field: 'poNo', title: 'PO No.', width: 115 },
        { field: 'statusName', title: 'Status', width: 115 },
        { field: 'branchName', title: 'Branch', width: 120 },
        { field: 'suppName', title: 'Supplier', width: 230 },
        { field: 'totalAmount', title: 'Amount', width: 120 },
      ],
      showForm: false,
    };

    dialog.result.subscribe((result) => {
      if (result instanceof DialogCloseResult) {
        return;
      }

      const response = result as {
        action?: string;
        formValue?: Record<string, string>;
      };

      if (response.action === 'confirm') {
        yesCallback();
      }
    });
  }

  private getActionConfirmText(
    mode: 'POST' | 'APPROVE' | 'REOPEN' | 'REVERSE',
  ): string {
    switch (mode) {
      case 'POST':
        return 'Post PO';
      case 'APPROVE':
        return 'Approve PO';
      case 'REOPEN':
        return 'Reopen PO';
      case 'REVERSE':
        return 'Reverse PO';
      default:
        return 'Confirm';
    }
  }

  private getActionEffectText(
    mode: 'POST' | 'APPROVE' | 'REOPEN' | 'REVERSE',
    poNo: string,
  ): string {
    switch (mode) {
      case 'POST':
        return `Posting PO No. ${poNo} will move this document from Draft to Posted status.`;
      case 'APPROVE':
        return `Approving PO No. ${poNo} will mark this document as approved for processing.`;
      case 'REOPEN':
        return `Reopening PO No. ${poNo} will return the document to editable status.`;
      case 'REVERSE':
        return `Reversing PO No. ${poNo} will undo the current posted or approved status when allowed.`;
      default:
        return `This action will update PO No. ${poNo}.`;
    }
  }

  closeActionDialog(): void {
    this.showActionDialog.set(false);
  }

  statusClass(status: string): string {
    return `status-${status}`;
  }
private getCurrentUserId(): string {
  const currentUserId = String(this.auth.userId() ?? '')
    .trim()
    .toUpperCase();

  if (!currentUserId) {
    throw new Error(
      'Unable to determine the currently logged-in user. Please log in again.'
    );
  }

  return currentUserId;
}

  private toDateOnly(value: unknown): string {
    const date = value instanceof Date ? value : new Date(String(value));

    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private getQuickDateRange(key: QuickDateKey): {
    fromDate: Date;
    toDate: Date;
  } {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    switch (key) {
      case 'TODAY':
        return {
          fromDate: new Date(year, month, today.getDate()),
          toDate: new Date(year, month, today.getDate()),
        };

      case 'YESTERDAY': {
        const yesterday = new Date(year, month, today.getDate() - 1);
        return {
          fromDate: yesterday,
          toDate: yesterday,
        };
      }

      case 'THIS_MONTH':
        return {
          fromDate: new Date(year, month, 1),
          toDate: new Date(year, month + 1, 0),
        };

      case 'LAST_MONTH':
        return {
          fromDate: new Date(year, month - 1, 1),
          toDate: new Date(year, month, 0),
        };

      case 'THIS_YEAR':
        return {
          fromDate: new Date(year, 0, 1),
          toDate: new Date(year, 11, 31),
        };

      case 'LAST_YEAR':
        return {
          fromDate: new Date(year - 1, 0, 1),
          toDate: new Date(year - 1, 11, 31),
        };
    }
  }
}
