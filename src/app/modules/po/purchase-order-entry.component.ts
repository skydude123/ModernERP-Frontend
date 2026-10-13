import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  OnDestroy,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest, finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  AddEvent,
  CancelEvent,
  EditEvent,
  GridComponent,
  GridModule,
  RemoveEvent,
  SaveEvent,
  SelectableSettings,
} from '@progress/kendo-angular-grid';
import {
  DropDownFilterSettings,
  DropDownsModule,
  PopupSettings,
} from '@progress/kendo-angular-dropdowns';
import { InputsModule } from '@progress/kendo-angular-inputs';
import { DateInputsModule } from '@progress/kendo-angular-dateinputs';
import { ButtonsModule } from '@progress/kendo-angular-buttons';
import { ToolBarModule } from '@progress/kendo-angular-toolbar';
import {
  DialogCloseResult,
  DialogModule,
  DialogRef,
  DialogService,
} from '@progress/kendo-angular-dialog';
import { LabelModule } from '@progress/kendo-angular-label';

import { PurchaseOrderFacade } from './purchase-order.facade';
import { PurchaseOrderService } from './purchase-order.service';
import {
  ItemLookup,
  LookupUM,
  PurchaseOrderDetailRow,
  PurchaseOrderDetailSave,
  PurchaseOrderSaveRequest,
  SoVerification,
  TermLookup,
} from './purchase-order.model';
import {
  aggregateBy,
  AggregateDescriptor,
  AggregateResult,
} from '@progress/kendo-data-query';
import { checkIcon, searchIcon } from '@progress/kendo-svg-icons';
import {
  NotificationService,
  NotificationModule,
} from '@progress/kendo-angular-notification';
import { AppToolbarComponent } from '../../shared/services/app-toolbar/app-toolbar.component';
import { AppToolbarService } from '../../shared/services/app-toolbar/toolbar.service';

import {
  ErpSaveConfirmDialogComponent,
  ErpSaveConfirmDialogData,
} from '../../shared/NOTIFICATION-confirm-dialog/erp-save-confirm-dialog.component';

import { ErpNotificationService } from '../../shared/notification-card/erp-notification.service';

import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import {
  TelerikReportingModule,
  TelerikReportViewerComponent,
} from '@progress/telerik-angular-report-viewer';
import { ReportingUrlService } from '../../core/Reporting/reporting-url.service';
import { AuthFacadeService } from '../../core/services/auth-facade.service';
import { PurchasePriceFacade } from './pricing/purchase-price.facade';
import {
  PurchasePriceDialogContext,
  PurchasePriceItemUm,
  SupplierPriceListItem,
} from './pricing/purchase-price.model';
import { PriceInquiryDialogComponent } from './pricing/price-inquiry-dialog.component';
import { PriceHistoryDialogComponent } from './pricing/price-history-dialog.component';
import { SupplierPriceListComponent } from './pricing/supplier-price-list.component';

@Component({
  selector: 'app-purchase-order-entry',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    GridModule,
    DropDownsModule,
    InputsModule,
    DateInputsModule,
    ButtonsModule,
    ToolBarModule,
    DialogModule,
    NotificationModule,
    LabelModule,
    AppToolbarComponent,
    TelerikReportingModule,
    PriceInquiryDialogComponent,
    PriceHistoryDialogComponent,
    SupplierPriceListComponent,
  ],
  providers: [PurchaseOrderFacade],
  templateUrl: './purchase-order-entry.component.html',
  styleUrls: ['./purchase-order-entry.component.scss'],
})
export class PurchaseOrderEntryComponent implements OnDestroy {
  @ViewChild('printViewer', { static: false })
  printViewer!: TelerikReportViewerComponent;

  readonly hasBeenSaved = signal(false);
  readonly hasUnsavedChanges = signal(true);

  readonly auth = inject(AuthFacadeService);
  readonly userId = computed(() => this.auth.userId());

  readonly reportingUrlService = inject(ReportingUrlService);
  readonly facade = inject(PurchaseOrderFacade);
  readonly toolbarService = inject(AppToolbarService);
  readonly searchIcon = searchIcon;
  readonly checkIcon = checkIcon;

  private readonly supplierFilterText = signal<string>('');

  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(PurchaseOrderService);
  private readonly pricing = inject(PurchasePriceFacade);
  private readonly destroyRef = inject(DestroyRef);

  private readonly sanitizer = inject(DomSanitizer);

  private readonly dialogService = inject(DialogService);
  //private readonly notificationService = inject(NotificationService);
  private readonly erpNotify = inject(ErpNotificationService);
  readonly showTermsDialog = signal(false);
  readonly showVatDialog = signal(false);
  readonly showSoDialog = signal(false);
  readonly verifiedSoNo = signal('');
  readonly loadingPo = signal(false);
  readonly detailValidationError = signal<string | null>(null);
  readonly hasReceiving = signal(false);
  readonly poStatus = signal<'N' | 'P' | 'A' | 'C'>('N');
  readonly itemUms = signal<PurchasePriceItemUm[]>([]);
  readonly itemUmsLoading = signal(false);
  readonly itemUmsError = signal<string | null>(null);
  readonly showPriceInquiry = signal(false);
  readonly showPriceHistory = signal(false);
  readonly priceDialogContext = signal<PurchasePriceDialogContext | null>(null);
  private readonly priceActionRowIndex = signal<number | null>(null);
  readonly supplierPriceListOpened = signal(false);
  readonly supplierPriceListSupplierCode = signal('');
  readonly supplierPriceListSupplierName = signal('');
  private readonly supplierPriceListTargetRowIndex = signal<number | null>(
    null,
  );

  readonly showPrintDialog = signal(false);
  readonly printViewerUrl = signal<SafeResourceUrl | null>(null);
  readonly printPoNo = signal('');

  private editedRowIndex: number | undefined;

  readonly currentDetailForm = signal<FormGroup | null>(null);

  viewerContainerStyle = {
    position: 'relative',
    width: '1000px',
    height: '800px',
    ['font-family']: 'ms sans serif',
  };

  readonly detailsControls = signal<PurchaseOrderDetailRow[]>([]);

  // readonly detailLines = computed<PurchaseOrderDetailSave[]>(() =>
  //   this.detailsControls()
  //     .filter((row) => !!row.itemCode?.trim())
  //     .map((row, index) => ({
  //       lineNo: index + 1,
  //       itemCode: row.itemCode.trim(),
  //       itemDesc: row.itemDesc?.trim() || null,
  //       qtyPo: Number(row.qtyPo ?? 0),
  //       // Save payload must use poUm; umCode belongs only to lookup rows.
  //       poUm: row.poUm?.trim() || null,
  //       poConvFactor: Number(row.poConvFactor ?? 1),
  //       unitPrice: Number(row.unitPrice ?? 0),
  //     })),
  // );

  readonly detailLines = computed<PurchaseOrderDetailSave[]>(() =>
    this.detailsControls()
      .filter((row) => !!row.itemCode?.trim())
      .map((row, index) => ({
        /*
         * rowNo is only the request/TVP sequence.
         */
        rowNo: index + 1,

        /*
         * poLineNo identifies an EXISTING dbo.a_po_det row.
         * New rows remain NULL.
         */
        poLineNo:
          row.poLineNo !== null &&
            row.poLineNo !== undefined &&
            Number(row.poLineNo) > 0
            ? Number(row.poLineNo)
            : null,

        itemCode: row.itemCode.trim(),
        itemDesc: row.itemDesc?.trim() || null,
        qtyPo: Number(row.qtyPo ?? 0),
        poUm: row.poUm?.trim() || null,
        poConvFactor: Number(row.poConvFactor ?? 1),
        unitPrice: Number(row.unitPrice ?? 0),
      })),
  );

  readonly loadedItemLookups = signal<ItemLookup[]>([]);

  readonly soLookupText = signal('');
  private _suppcode = signal<string | null>(null);

  readonly selectableSettings: SelectableSettings = {
    enabled: true,
    mode: 'multiple',
    cell: true,
    drag: true,
    multipleRanges: true,
    cellAggregates: ['sum', 'average', 'count', 'min', 'max'],
  };

  readonly detailAggregates: AggregateDescriptor[] = [
    { field: 'qtyPo', aggregate: 'sum' },
    { field: 'lineAmount', aggregate: 'sum' },
  ];

  readonly detailFooterTotal = computed<AggregateResult>(() =>
    aggregateBy(this.detailsControls(), this.detailAggregates),
  );

  readonly footerQtySum = computed(() =>
    Number(this.detailFooterTotal()['qtyPo']?.sum ?? 0),
  );

  readonly footerAmountSum = computed(() =>
    Number(this.detailFooterTotal()['lineAmount']?.sum ?? 0),
  );

  readonly statusCode = computed(() => this.poStatus());

  readonly statusText = computed(() =>
    this.getPoStatusLabel(this.statusCode()),
  );

  readonly itemLookupData = computed<ItemLookup[]>(() => {
    const map = new Map<string, ItemLookup>();

    for (const item of this.loadedItemLookups()) {
      if (item.itemCode) {
        map.set(item.itemCode, item);
      }
    }

    for (const item of this.facade.itemLookupData()) {
      if (item.itemCode) {
        map.set(item.itemCode, item);
      }
    }

    return Array.from(map.values());
  });

  readonly poform = this.fb.group({
    poNo: [''],
    poDate: [new Date(), Validators.required],
    poDelDate: [new Date()],
    poType: ['WO', Validators.required],
    termCode: ['', Validators.required],

    // Store DB code here: N, P, C, A
    status: [this.getPoStatusLabel('N'), Validators.required],

    vatType: ['', Validators.required],
    chequeType: ['N', Validators.required],
    suppCode: ['', Validators.required],
    branchName: ['MANDAUE', Validators.required],
    soNo: [''],
    clientName: [{ value: '', disabled: true }],
    remarks: [''],
    custId: [null as number | null],
    userId: [this.userId()],
  });

  constructor() {
    this.toolbarService.setConfig({
      showNew: true,
      showSave: true,
      showPrint: true,
      showPost: true,
      showReverse: true,
      showList: true,
      showRefresh: true,
    });

    this.poform.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.hasBeenSaved()) {
          this.hasUnsavedChanges.set(true);
        }
      });

    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([paramMap, queryParamMap]) => {
        const poNo = String(
          paramMap.get('poNo') || queryParamMap.get('poNo') || '',
        ).trim();

        if (poNo) {
          this.loadPo(poNo);
          return;
        }

        this.prepareNewPo(false);
      });
  }

  ngOnDestroy(): void {
    this.toolbarService.reset();
  }

  canPost(): boolean {
    return (
      this.statusCode() === 'N' &&
      this.poform.valid &&
      this.detailLines().length > 0 &&
      !!this.getCurrentPoNo() &&
      this.hasBeenSaved() &&
      !this.hasUnsavedChanges() &&
      !this.poform.disabled
    );
  }

  canReverse(): boolean {
    return (
      this.statusCode() === 'P' ||
      (this.statusCode() === 'A' && this.hasReceiving() !== true)
    );
  }

  isReadOnly(): boolean {
    return (
      this.statusCode() === 'P' ||
      this.statusCode() === 'A' ||
      this.poform.disabled
    );
  }

  newPo(): void {
    this.prepareNewPo(true);
    this.router.navigate(['/order/purchase-order-entry']);
  }

  openTerms(): void {
    this.showTermsDialog.set(true);
  }

  public filterSettings: DropDownFilterSettings = {
    caseSensitive: false,
    operator: 'contains',
  };

  selectTerm(term: TermLookup): void {
    this.poform.patchValue({
      termCode: term.termCode,
    });

    this.showTermsDialog.set(false);
  }

  public readonly filteredSuppliers = computed(() => {
    const suppliers = this.facade.suppliers() ?? [];

    const searchText = this.supplierFilterText().trim().toLowerCase();

    if (!searchText) {
      return suppliers;
    }

    return suppliers.filter((supplier) => {
      const supplierCode = String(supplier.suppCode ?? '')
        .trim()
        .toLowerCase();

      const supplierName = String(supplier.suppName ?? '')
        .trim()
        .toLowerCase();

      return (
        supplierCode.includes(searchText) || supplierName.includes(searchText)
      );
    });
  });

  public events: string[] = [];
  private log(event: string, arg?: any): void {
    this.events.unshift(`${event} ${arg || ''}`);
  }

  public onSupplierFilterChange(searchText: string): void {
    this.supplierFilterText.set(searchText ?? '');
  }

  public OnSupplierSelectionChange(event: any): void {
    this.log('OnSupplierSelectionChange', event);
  }

  public onSupplierChange(value: unknown): void {
    this.log('valueChange', value);
    const supplierCode = String(value ?? '').trim();
    this._suppcode.set(supplierCode || null);

    if (supplierCode) {
      this.prefillMissingRowPrices(supplierCode);
    }
  }

  openSoLookup(): void {
    this.verifySoFromMainField();
  }

  verifySo(): void {
    this.verifySoFromMainField();
  }

  selectSo(so: SoVerification): void {
    this.poform.patchValue({
      soNo: so.soNo,
      custId: so.customerId,
      clientName: so.custName,
    });

    this.showSoDialog.set(false);
  }

  // save(): void {
  //   if (this.poform.disabled) {
  //     return;
  //   }

  //   this.poform.markAllAsTouched();
  //   this.facade.clearMessages();
  //   this.detailValidationError.set(null);

  //   if (this.poform.invalid) {
  //     return;
  //   }

  //   // Validate detail rows before the command so malformed grid state never reaches details[].poUm.
  //   if (!this.validateDetailLines()) {
  //     return;
  //   }

  //   const request = this.buildSaveRequest();

  //   this.facade.save(request).subscribe({
  //     next: result => {
  //       this.poform.patchValue(
  //         {
  //           poNo: result.poNo || result.returnPONumber || request.poNo || ''
  //         },
  //         { emitEvent: false }
  //       );

  //       const savedDetailLines =
  //         result.details && result.details.length > 0
  //           ? result.details
  //           : this.detailsControls();

  //       this.setDetailLines(savedDetailLines);
  //     }
  //   });
  // }

  // private confirmDialog(
  //   title: string,
  //   content: string,
  //   yesCallback: () => void
  // ): void {
  //   const dialog: DialogRef = this.dialogService.open({
  //     title,
  //     content,
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

  private confirmDialog(
    title: string,
    content: string,
    yesCallback: (formValue?: Record<string, string>) => void,
  ): void {
    const poNo = this.getCurrentPoNo();
    const confirmTitle = this.getErpConfirmTitle(title, content);

    const isReverse = confirmTitle === 'Reverse Purchase Order';

    const dialog: DialogRef = this.dialogService.open({
      content: ErpSaveConfirmDialogComponent,
      width: 660,
      minWidth: 360,
      cssClass: 'erp-confirm-dialog-host',
    });

    const component = dialog.content.instance as ErpSaveConfirmDialogComponent;

    const data: ErpSaveConfirmDialogData = {
      title: confirmTitle,
      message: content,
      moduleName: 'Purchase Order Entry',
      documentNo: poNo,
      status: this.statusText(),

      effectText: this.getErpConfirmEffectText(confirmTitle, poNo),

      note: isReverse
        ? 'A reverse / unpost reason of at least 5 characters is required.'
        : this.getErpConfirmNote(confirmTitle),

      questionText: 'Do you want to proceed?',

      confirmText: this.getErpConfirmButtonText(confirmTitle),

      cancelText: 'Back',

      showGrid: true,

      gridHeight: 145,

      gridData: this.getErpConfirmGridData(),

      gridColumns: [
        {
          field: 'poNo',
          title: 'PO No.',
          width: 125,
        },
        {
          field: 'statusName',
          title: 'Status',
          width: 110,
        },
        {
          field: 'branchName',
          title: 'Branch',
          width: 120,
        },
        {
          field: 'supplier',
          title: 'Supplier',
          width: 220,
        },
        {
          field: 'detailCount',
          title: 'Lines',
          width: 90,
        },
        {
          field: 'totalAmount',
          title: 'Amount',
          width: 120,
        },
      ],

      /*
       * MODIFICATION:
       * Only Reverse / Unpost requires an additional form.
       */
      showForm: isReverse,

      /*
       * MODIFICATION:
       * Same pattern used by Receiving Entry.
       */
      formFields: isReverse
        ? [
          {
            name: 'reason',
            label: 'Reverse / Unpost Reason',
            type: 'textarea',
            rows: 3,
            placeholder: 'Enter reverse / unpost reason',
          },
        ]
        : [],
    };

    component.data = data;

    dialog.result
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result instanceof DialogCloseResult) {
          return;
        }

        const response = result as {
          action?: string;
          formValue?: Record<string, string>;
        };

        if (response.action === 'confirm') {
          yesCallback(response.formValue);
        }
      });
  }

  // private infoDialog(title: string, content: string): void {
  //   this.dialogService.open({
  //     title,
  //     content,
  //     actions: [
  //       { text: 'OK', themeColor: 'primary' }
  //     ],
  //     width: 450,
  //     height: 180,
  //     minWidth: 250,
  //     cssClass: 'custom-css-class'
  //   });
  // }

  private infoDialog(title: string, content: string): void {
    this.erpNotify.info(
      content,
      title,
      this.getCurrentPoNo(),
      'Purchase Order Entry',
    );
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
      'Purchase Order Failed',
      this.getCurrentPoNo(),
      'Purchase Order Entry',
    );
  }

  public showSuccess(message: string): void {
    this.erpNotify.success(
      message,
      'Purchase Order Successful',
      this.getCurrentPoNo(),
      'Purchase Order Entry',
    );
  }

  private getNotificationError(error: unknown, fallback: string): string {
    if (error instanceof Error) {
      const message = String(error.message ?? '').trim();

      if (message) {
        return message;
      }
    }

    if (typeof error === 'object' && error !== null) {
      const response = error as {
        status?: number;
        statusText?: string;
        message?: string;
        error?:
        | string
        | {
          message?: string;
          detail?: string;
          error?: string;
          title?: string;
          errors?: Record<string, string[] | string>;
        };
      };

      if (typeof response.error === 'string') {
        const message = response.error.trim();

        if (message) {
          return message;
        }
      }

      if (typeof response.error === 'object' && response.error !== null) {
        const apiMessage =
          response.error.message ||
          response.error.detail ||
          response.error.error;

        if (apiMessage?.trim()) {
          return apiMessage.trim();
        }

        if (response.error.errors) {
          const validationMessages = Object.values(response.error.errors)
            .flatMap((entry) => (Array.isArray(entry) ? entry : [entry]))
            .map((entry) => String(entry ?? '').trim())
            .filter((entry) => entry.length > 0);

          if (validationMessages.length > 0) {
            return validationMessages.join(' ');
          }
        }

        if (response.error.title?.trim()) {
          return response.error.title.trim();
        }
      }

      if (response.status === 0) {
        return 'Unable to connect to the server. Check your network connection and confirm that the API is running.';
      }

      if (response.message?.trim()) {
        return response.message.trim();
      }

      if (response.statusText?.trim()) {
        return response.statusText.trim();
      }
    }

    return fallback;
  }

  private getCurrentPoNo(): string {
    const poNo = String(this.poform.getRawValue().poNo || '').trim();
    return poNo || 'AUTO / DRAFT';
  }

  private getCurrentSupplierText(): string {
    const raw = this.poform.getRawValue();
    const suppCode = String(raw.suppCode || '').trim();

    if (!suppCode) {
      return '-';
    }

    const supplier = this.facade
      .suppliers()
      .find((row) => row.suppCode === suppCode);

    return supplier?.suppName || suppCode;
  }

  private getErpConfirmGridData(): any[] {
    const raw = this.poform.getRawValue();

    return [
      {
        poNo: this.getCurrentPoNo(),
        statusName: this.statusText(),
        branchName: raw.branchName || '-',
        supplier: this.getCurrentSupplierText(),
        detailCount: this.detailLines().length,
        totalAmount: this.footerAmountSum(),
      },
    ];
  }

  private getErpConfirmTitle(title: string, content: string): string {
    const text = `${title} ${content}`.toLowerCase();

    if (text.includes('save this purchase order')) {
      return 'Save Purchase Order';
    }

    if (text.includes('post purchase order')) {
      return 'Post Purchase Order';
    }

    if (text.includes('reverse purchase order')) {
      return 'Reverse Purchase Order';
    }

    if (text.includes('cancel editing')) {
      return 'Cancel Item Editing';
    }

    if (text.includes('add this item line')) {
      return 'Add Item Line';
    }

    if (text.includes('save changes to this item line')) {
      return 'Save Item Line';
    }

    if (text.includes('remove')) {
      return 'Remove Item Line';
    }

    return title && title !== 'Please confirm?' ? title : 'Confirm Action';
  }

  private getErpConfirmButtonText(title: string): string {
    const text = title.toLowerCase();

    if (text.includes('save purchase order')) {
      return 'Save PO';
    }

    if (text.includes('post')) {
      return 'Post PO';
    }

    if (text.includes('reverse')) {
      return 'Reverse PO';
    }

    if (text.includes('cancel')) {
      return 'Cancel Editing';
    }

    if (text.includes('add')) {
      return 'Add Line';
    }

    if (text.includes('save item')) {
      return 'Save Line';
    }

    if (text.includes('remove')) {
      return 'Remove Line';
    }

    return 'Confirm';
  }

  private getErpConfirmEffectText(title: string, poNo: string): string {
    const text = title.toLowerCase();

    if (text.includes('save purchase order')) {
      return `Saving PO No. ${poNo} will store the current header and detail lines.`;
    }

    if (text.includes('post')) {
      return `Posting PO No. ${poNo} will move this document to Posted status.`;
    }

    if (text.includes('reverse')) {
      return `Reversing PO No. ${poNo} will update the document status when allowed.`;
    }

    if (text.includes('cancel')) {
      return 'Cancelling will discard the current item line edit only.';
    }

    if (text.includes('remove')) {
      return 'Removing this line will delete it from the current detail grid.';
    }

    if (text.includes('add') || text.includes('save item')) {
      return 'This will update the item detail grid before the Purchase Order is saved.';
    }

    return `This action will continue for PO No. ${poNo}.`;
  }

  private getErpConfirmNote(title: string): string {
    const text = title.toLowerCase();

    if (text.includes('save purchase order')) {
      return 'Please review required fields and detail lines before saving.';
    }

    if (text.includes('post') || text.includes('reverse')) {
      return 'Please review the selected Purchase Order status before continuing.';
    }

    if (text.includes('item') || text.includes('line')) {
      return 'This affects the current item line only.';
    }

    return 'Please review the information before continuing.';
  }

  private readonly requiredHeaderFields = [
    'poDate',
    'poType',
    'suppCode',
    'branchName',
    'termCode',
    'vatType',
    'chequeType',
  ] as const;

  hasRequiredError(fieldName: string): boolean {
    const control = this.poform.get(fieldName);

    return (
      !!control &&
      control.hasError('required') &&
      (control.touched || control.dirty)
    );
  }

  private validateHeaderBeforeSave(): boolean {
    const fieldLabels: Record<string, string> = {
      poDate: 'PO Date',
      poType: 'PO Type',
      suppCode: 'Supplier',
      branchName: 'Branch',
      termCode: 'Terms',
      vatType: 'VAT Type',
      chequeType: 'Cheque Type',
    };

    const missingFields: string[] = [];

    this.requiredHeaderFields.forEach((fieldName) => {
      const control = this.poform.get(fieldName);

      control?.markAsTouched();
      control?.markAsDirty();
      control?.updateValueAndValidity({
        onlySelf: true,
        emitEvent: false,
      });

      if (control?.hasError('required')) {
        missingFields.push(fieldLabels[fieldName] || fieldName);
      }
    });

    this.poform.updateValueAndValidity({
      emitEvent: false,
    });

    if (missingFields.length > 0) {
      this.showError(
        `Please complete the following required fields: ${missingFields.join(', ')}.`,
      );

      return false;
    }

    if (this.poform.invalid) {
      this.showError('Please correct the highlighted fields before saving.');

      return false;
    }

    return true;
  }

  save(): void {
    if (this.poform.disabled) {
      return;
    }

    this.facade.clearMessages();
    this.detailValidationError.set(null);

    this.poform.markAllAsTouched();

    if (!this.validateHeaderBeforeSave()) {
      return;
    }

    if (!this.validateDetailLines()) {
      this.showError(
        this.detailValidationError() ||
        'Please complete Purchase Order details.',
      );
      return;
    }

    const poNo = this.poform.get('poNo')?.value || 'AUTO';

    this.confirmDialog(
      'Please confirm?',
      `Are you sure you want to save this Purchase Order? PO No: ${poNo}`,
      () => this.saveConfirmed(),
    );
  }

  private saveConfirmed(): void {
    if (this.poform.disabled) {
      this.showError('This Purchase Order is read-only and cannot be saved.');

      return;
    }

    this.poform.markAllAsTouched();

    this.poform.updateValueAndValidity({
      emitEvent: false,
    });

    this.facade.clearMessages();
    this.detailValidationError.set(null);

    if (this.poform.invalid) {
      this.showError('Please complete all required fields before saving.');

      return;
    }

    if (!this.validateDetailLines()) {
      this.showError(
        this.detailValidationError() ||
        'Please complete all Purchase Order detail lines.',
      );

      return;
    }

    try {
      /*
       * Handles local errors while preparing the payload.
       */
      const request = this.buildSaveRequest();

      this.facade
        .save(request)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (result) => {
            try {
              console.log('SAVE RESULT:', result);

              const savedPoNo = String(
                result?.poNo || result?.returnPONumber || request.poNo || '',
              ).trim();

              if (!savedPoNo) {
                this.showError(
                  'The API did not return a Purchase Order Number.',
                );

                return;
              }

              this.poform.patchValue(
                {
                  poNo: savedPoNo,
                },
                {
                  emitEvent: false,
                },
              );

              const savedDetailLines =
                result?.details && result.details.length > 0
                  ? result.details
                  : this.detailsControls();

              this.setDetailLines(savedDetailLines);

              this.hasBeenSaved.set(true);
              this.hasUnsavedChanges.set(false);

              this.showSuccess(
                `Purchase Order ${savedPoNo} has been saved successfully.`,
              );
            } catch (error: unknown) {
              this.showError(
                this.getNotificationError(
                  error,
                  'The Purchase Order was saved, but the returned response could not be processed.',
                ),
              );
            }
          },

          /*
           * Handles API, SQL, validation, authorization,
           * server, network, and connection errors.
           */
          error: (error: unknown) => {
            this.showError(
              this.getNotificationError(
                error,
                this.facade.saveError() || 'Failed to save Purchase Order.',
              ),
            );
          },
        });
    } catch (error: unknown) {
      this.showError(
        this.getNotificationError(
          error,
          'Unable to prepare the Purchase Order save request.',
        ),
      );
    }
  }

  readonly reportingServiceUrl = this.reportingUrlService.reportingServiceUrl;
  public rs: any;

  printPo(): void {
    const poNo = String(this.poform.getRawValue().poNo ?? '').trim();

    if (!poNo) {
      this.showError('Please save the Purchase Order before printing.');

      return;
    }

    this.printPoNo.set(poNo);

    /*
     * Update the report source first.
     * The Telerik viewer will receive this source when
     * the print dialog and viewer component are created.
     */
    this.rs = {
      report: 'PurchaseOrder.trdp',
      parameters: {
        po_no: poNo,
      },
    };
    //  this.printViewer.setReportSource(this.rs);

    /*
     * Open the dialog after preparing the report source.
     */
    this.showPrintDialog.set(true);
  }

  // printPo(): void {

  //   const poNo = String(
  //     this.poform.getRawValue().poNo ?? ''
  //   ).trim();

  //   if (!poNo) {
  //     this.showError(
  //       'Please save the Purchase Order before printing.'
  //     );

  //     return;
  //   }

  //   var rs = {
  //     report: 'PurchaseOrder.trdp',
  //     parameters: { po_no: poNo }
  //   };
  //   this.printViewer.setReportSource(rs);

  //   // const viewerUrl =
  //   //   `/reporting/purchase-order-viewer.html` +
  //   //   `?poNo=${encodeURIComponent(poNo)}` +
  //   //   `&v=${Date.now()}`;

  //   // this.printPoNo.set(poNo);

  //   // this.printViewerUrl.set(
  //   //   this.sanitizer.bypassSecurityTrustResourceUrl(
  //   //     viewerUrl
  //   //   )
  //   // );

  //   this.showPrintDialog.set(true);
  // }

  closePrintDialog(): void {
    this.showPrintDialog.set(false);
    this.printViewerUrl.set(null);
    this.printPoNo.set('');
  }

  goToList(): void {
    this.router.navigate(['/order/po-listing']);
  }

  reloadPo(): void {
    const poNo = String(this.poform.getRawValue().poNo || '').trim();

    if (poNo) {
      this.loadPo(poNo);
      return;
    }

    this.prepareNewPo(true);
  }

  postPo(): void {
    if (!this.canPost()) {
      return;
    }

    const poNo = String(this.poform.getRawValue().poNo || '').trim();

    if (!poNo) {
      this.showError('Please save the Purchase Order before posting.');
      return;
    }

    this.confirmDialog(
      'Please confirm?',
      `Are you sure you want to post Purchase Order ${poNo}?`,
      () => {
        this.facade.postPo(poNo, this.getCurrentUserId(), null).subscribe({
          next: (result) => {
            this.poStatus.set(this.getPoStatusCode(result.status));
            this.poform.patchValue(
              { status: this.getPoStatusLabel(result.status) },
              { emitEvent: false },
            );
            this.poform.disable({ emitEvent: false });
            this.showSuccess(
              result.resultMessage ||
              `${result.poNo} is now ${result.statusName}.`,
            );
          },
          error: (error) => {
            this.showError(
              this.getNotificationError(
                error,
                this.facade.actionError() || 'Failed to post Purchase Order.',
              ),
            );
          },
        });
      },
    );
  }

  reversePo(): void {
    if (!this.canReverse()) {
      return;
    }

    const poNo = String(this.poform.getRawValue().poNo || '').trim();

    if (!poNo) {
      this.showError('Unable to determine the Purchase Order number.');

      return;
    }

    this.confirmDialog(
      'Please confirm?',
      `Are you sure you want to reverse Purchase Order ${poNo}?`,

      (formValue) => {
        const userId = this.getCurrentUserId();

        /*
         * MODIFICATION:
         * Get the reason entered in the confirmation dialog.
         */
        const reason = String(formValue?.['reason'] ?? '').trim();

        /*
         * Require a meaningful reverse reason.
         * Same minimum length used by Receiving.
         */
        if (reason.length < 5) {
          this.showError(
            'Please enter a Reverse / Unpost Reason with at least 5 characters.',
          );

          return;
        }

        /*
         * P = Posted
         * A = Approved
         *
         * Pass the entered reason instead of null.
         */
        const command =
          this.statusCode() === 'P'
            ? this.facade.reopenPo(poNo, userId, reason)
            : this.facade.reversePo(poNo, userId, reason);

        command.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: (result) => {
            const statusCode = this.getPoStatusCode(result.status);

            this.poStatus.set(statusCode);

            this.poform.patchValue(
              {
                status: this.getPoStatusLabel(statusCode),
              },
              {
                emitEvent: false,
              },
            );

            /*
             * Once returned to Draft,
             * make the PO editable again.
             */
            if (statusCode === 'N') {
              this.poform.enable({
                emitEvent: false,
              });

              this.poform.get('clientName')?.disable({
                emitEvent: false,
              });

              /*
               * After Reverse / Unpost, require Update first
               * before allowing Post again.
               */
              this.hasBeenSaved.set(true);
              this.hasUnsavedChanges.set(true);
            }

            this.showSuccess(
              result.resultMessage ||
              `${result.poNo} is now ${result.statusName}.`,
            );
          },

          error: (error) => {
            this.showError(
              this.getNotificationError(
                error,
                this.facade.actionError() ||
                'Failed to reverse Purchase Order.',
              ),
            );
          },
        });
      },
    );
  }
  private normalizeDetailRow(
    line: Partial<PurchaseOrderDetailRow> & { poLineNo?: number | null },
    index = 0,
  ): PurchaseOrderDetailRow {
    const qtyPo = Number(line.qtyPo ?? 0);
    const unitPrice = Number(line.unitPrice ?? 0);

    return {
      lineNo: index + 1,

      poLineNo:
        line.poLineNo !== null &&
          line.poLineNo !== undefined &&
          Number(line.poLineNo) > 0
          ? Number(line.poLineNo)
          : null,

      itemCode: String(line.itemCode ?? '').trim(),
      itemDesc: String(line.itemDesc ?? '').trim(),
      qtyPo,
      poUm: String(line.poUm ?? '').trim(),
      poConvFactor: Number(line.poConvFactor ?? 0),
      unitPrice,
      lineAmount: qtyPo * unitPrice,
    };
  }

  private setDetailLines(
    detailLines: Partial<PurchaseOrderDetailRow>[] | null | undefined,
  ): void {
    const normalized = (detailLines ?? []).map((line, index) =>
      this.normalizeDetailRow(line, index),
    );

    this.detailsControls.set(normalized);
    this.syncLoadedItemLookups(normalized);
  }

  private syncLoadedItemLookups(detailLines: PurchaseOrderDetailRow[]): void {
    this.loadedItemLookups.set(
      detailLines
        .filter((line) => !!line.itemCode)
        .map((line) => ({
          itemCode: line.itemCode,
          itemDesc: line.itemDesc,
          // Item lookup still exposes umCode; loaded detail rows keep that value as poUm.
          umCode: line.poUm,
          unitPrice: line.unitPrice,
        })),
    );
  }

  private getPoStatusLabel(status?: string | null): string {
    switch ((status || 'N').toUpperCase()) {
      case 'N':
        return 'Draft';
      case 'P':
        return 'Posted';
      case 'C':
        return 'Cancelled';
      case 'A':
        return 'Approved';
      default:
        return 'Draft';
    }
  }

  private getPoStatusCode(status?: string | null): 'N' | 'P' | 'A' | 'C' {
    const value = String(status || 'N').toUpperCase();

    if (value === 'P' || value === 'POSTED' || value === 'PROCESS') {
      return 'P';
    }

    if (value === 'A' || value === 'APPROVED') {
      return 'A';
    }

    if (value === 'C' || value === 'CANCELLED' || value === 'CANCEL') {
      return 'C';
    }

    return 'N';
  }

  private loadPo(poNo: string): void {
    this.loadingPo.set(true);
    this.facade.clearMessages();

    this.poform.enable({ emitEvent: false });
    this.poform.get('clientName')?.disable({ emitEvent: false });

    this.api
      .getByNo(poNo)
      .pipe(finalize(() => this.loadingPo.set(false)))
      .subscribe({
        next: (response) => {
          const header = response.header;

          if (!header) {
            this.prepareNewPo(false);
            return;
          }

          const statusCode = this.getPoStatusCode(header.status);
          this.poStatus.set(statusCode);
          this.hasReceiving.set(header.hasReceiving === true);

          this.poform.patchValue(
            {
              poNo: header.poNo,
              poDate: header.poDate ? new Date(header.poDate) : new Date(),
              poDelDate: header.poDelDate ? new Date(header.poDelDate) : null,
              poType: header.poType || 'WO',
              termCode: header.termCode || '',
              status: this.getPoStatusLabel(statusCode),
              vatType: header.vatType || '',
              chequeType: header.chequeType || 'N',
              suppCode: header.suppCode || '',
              branchName: header.branchName || 'MANDAUE',
              soNo: header.soNo || '',
              clientName: header.custName || '',
              remarks: header.remarks || '',
              custId: header.custId ?? null,

              userId: header.userId || this.getCurrentUserId(),
            },
            { emitEvent: false },
          );

          const detailLines = response.details ?? [];

          this.setDetailLines(detailLines);

          this.hasBeenSaved.set(true);
          this.hasUnsavedChanges.set(false);

          this.poform.markAsPristine();

          if (statusCode === 'P' || statusCode === 'A') {
            this.poform.disable({ emitEvent: false });
          } else {
            this.poform.enable({ emitEvent: false });
            this.poform.get('clientName')?.disable({ emitEvent: false });
          }
        },
        error: (error) => {
          console.error('Failed to load PO:', error);
          this.prepareNewPo(false);
        },
      });
  }

  private prepareNewPo(clearMessage: boolean): void {
    if (clearMessage) {
      this.facade.clearMessages();
    }

    this.loadedItemLookups.set([]);
    this.detailValidationError.set(null);
    this.poStatus.set('N');
    this.hasReceiving.set(false);

    this.hasBeenSaved.set(false);
    this.hasUnsavedChanges.set(true);

    this.poform.enable({ emitEvent: false });

    this.poform.reset({
      poNo: '',
      poDate: new Date(),
      poDelDate: new Date(),
      poType: 'WO',
      termCode: '',
      status: this.getPoStatusLabel('N'),
      vatType: '',
      chequeType: 'N',
      suppCode: '',
      branchName: 'MANDAUE',
      soNo: '',
      clientName: '',
      remarks: '',
      custId: null,
      userId: this.getCurrentUserId(),
    });

    this.poform.get('clientName')?.disable({ emitEvent: false });
    this.setDetailLines([]);
  }

  private createDetailGroup(
    line?: Partial<PurchaseOrderDetailRow> & { poLineNo?: number | null },
  ) {
    return this.fb.group({
      poLineNo: [(line?.poLineNo ?? line?.lineNo ?? null) as number | null],
      itemCode: [line?.itemCode ?? '', Validators.required],
      itemDesc: [{ value: line?.itemDesc ?? '', disabled: true }],
      qtyPo: [line?.qtyPo ?? 1, [Validators.required, Validators.min(0.01)]],
      // Kendo MultiColumnComboBox binds primitive umCode here so the row and DTO remain poUm.
      poUm: [line?.poUm ?? '', Validators.required],
      unitPrice: [
        line?.unitPrice ?? 0,
        [Validators.required, Validators.min(0.0001)],
      ],
      poConvFactor: [
        line?.poConvFactor ?? 0,
        [Validators.required, Validators.min(0.01)],
      ],
    });
  }

  private buildSaveRequest(): PurchaseOrderSaveRequest {
    const raw = this.poform.getRawValue();

    return {
      poNo: this.emptyToNull(raw.poNo),
      poDate: this.toSqlDate(raw.poDate) ?? this.toSqlDate(new Date())!,
      poDelDate: this.toSqlDate(raw.poDelDate),
      poType: raw.poType ?? 'WO',
      termCode: raw.termCode ?? '',
      status: this.getPoStatusCode(raw.status),
      vatType: raw.vatType ?? '',
      chequeType: raw.chequeType ?? 'N',
      suppCode: raw.suppCode ?? '',
      branchName: raw.branchName ?? 'MANDAUE',
      soNo: this.emptyToNull(raw.soNo),
      remarks: this.emptyToNull(raw.remarks),
      custId: raw.custId ?? null,
      userId: this.getCurrentUserId(),
      replaceDetails: true,
      details: this.detailLines(),
    };
  }

  private emptyToNull(value: string | null | undefined): string | null {
    const text = String(value ?? '').trim();
    return text.length > 0 ? text : null;
  }

  // private getCurrentUserId(): string {
  //   const raw = localStorage.getItem('userData');

  //   if (!raw) {
  //     return 'admin';
  //   }

  //   try {
  //     const user = JSON.parse(raw);
  //     return user?.userid || user?.userId || 'admin';
  //   } catch {
  //     return 'admin';
  //   }
  // }

  private getCurrentUserId(): string {
    const currentUserId = String(this.auth.userId() ?? '').trim();

    if (!currentUserId) {
      throw new Error(
        'Unable to determine the currently logged-in user. Please log in again.',
      );
    }

    return currentUserId;
  }

  private toSqlDate(value: Date | string | null | undefined): string | null {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) {
        return null;
      }

      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const day = String(value.getDate()).padStart(2, '0');

      return `${year}-${month}-${day}`;
    }

    const text = String(value).trim();

    if (!text) {
      return null;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      return text;
    }

    const parsed = new Date(text);

    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private toDateOnly(value: unknown): string {
    const date = value instanceof Date ? value : new Date(String(value));

    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  // BAG O CODE
  editHandler(args: EditEvent): void {
    const { sender, rowIndex, dataItem } = args;

    this.closeEditor(sender);

    this.editedRowIndex = rowIndex;
    const formGroup = this.createDetailGroup(dataItem);
    this.currentDetailForm.set(formGroup);

    sender.editRow(rowIndex, formGroup);
    this.loadItemUms(String(dataItem?.itemCode ?? ''), formGroup, false);
  }

  // addHandler(args: AddEvent): void {
  //   this.closeEditor(args.sender);

  //   args.sender.addRow(
  //     this.createDetailGroup({
  //       itemCode: '',
  //       itemDesc: '',
  //       qtyPo: 0,
  //       poUm: '',
  //       poConvFactor: 1,
  //       unitPrice: 0
  //     })
  //   );
  // }

  addHandler(args: AddEvent): void {
    this.closeEditor(args.sender);

    /*
     * New row has no selected item yet.
     * Clear only any previous error.
     *
     * Do NOT treat this as a U/M configuration error.
     * The U/M list will be loaded after the user selects an Item Code.
     */
    this.itemUms.set([]);
    this.itemUmsError.set(null);

    const formGroup = this.createDetailGroup({
      poLineNo: null,
      itemCode: '',
      itemDesc: '',
      qtyPo: 0,
      poUm: '',
      poConvFactor: 0,
      unitPrice: 0,
    });

    this.currentDetailForm.set(formGroup);

    args.sender.addRow(formGroup);
  }

  // addHandler(args: AddEvent): void {
  //   this.closeEditor(args.sender);

  //   args.sender.addRow(
  //     this.createDetailGroup({
  //       itemCode: '',
  //       itemDesc: '',
  //       qtyPo: 0,
  //       poUm: '',
  //       poConvFactor: 1,
  //       unitPrice: 0
  //     })
  //   );

  //   this.infoDialog(
  //     'Item Row Added',
  //     'A new item row has been added. Please complete the item details.'
  //   );
  // }

  // cancelHandler(args: CancelEvent): void {
  //   args.sender.closeRow(args.rowIndex);
  //   this.editedRowIndex = undefined;
  // }

  cancelHandler(args: CancelEvent): void {
    this.confirmDialog(
      'Please confirm?',
      'Are you sure you want to cancel editing this item?',
      () => {
        args.sender.closeRow(args.rowIndex);
        this.editedRowIndex = undefined;
        this.currentDetailForm.set(null);

        this.infoDialog(
          'Editing Cancelled',
          'Item editing has been cancelled.',
        );
      },
    );
  }

  // saveHandler(args: SaveEvent): void {
  //   const { sender, rowIndex, formGroup, isNew, dataItem } = args;

  //   if (formGroup.invalid) {
  //     formGroup.markAllAsTouched();
  //     return;
  //   }

  //   const raw = formGroup.getRawValue();

  //   const detail: PurchaseOrderDetailRow = this.normalizeDetailRow(
  //     {
  //       ...raw,
  //       lineNo: isNew
  //         ? this.getNextDetailLineNo()
  //         : dataItem?.lineNo ?? rowIndex + 1
  //     },
  //     rowIndex
  //   );

  //   this.detailsControls.update(rows => {
  //     if (isNew) {
  //       return [...rows, detail];
  //     }

  //     return rows.map((row, index) =>
  //       index === rowIndex ? detail : row
  //     );
  //   });

  //   sender.closeRow(rowIndex);
  //   this.editedRowIndex = undefined;
  // }

  canSaveCurrentDetail(): boolean {
    const formGroup = this.currentDetailForm();

    if (!formGroup) {
      return false;
    }

    const unitPrice = Number(
      formGroup.get('unitPrice')?.value ?? 0
    );

    return formGroup.valid && unitPrice > 0;
  }

  saveHandler(args: SaveEvent): void {
    const { formGroup, isNew } = args;

    if (formGroup.invalid) {
      formGroup.markAllAsTouched();
      return;
    }

    this.confirmDialog(
      'Please confirm?',
      isNew
        ? 'Are you sure you want to add this item line?'
        : 'Are you sure you want to save changes to this item line?',
      () => this.saveDetailRowConfirmed(args),
    );
  }

  private saveDetailRowConfirmed(args: SaveEvent): void {
    const { sender, rowIndex, formGroup, isNew, dataItem } = args;

    const raw = formGroup.getRawValue();

    const detail: PurchaseOrderDetailRow = this.normalizeDetailRow(
      {
        ...raw,
        lineNo: isNew
          ? this.getNextDetailLineNo()
          : (dataItem?.lineNo ?? rowIndex + 1),
      },
      rowIndex,
    );

    this.detailsControls.update((rows) => {
      const updatedRows = isNew
        ? [...rows, detail]
        : rows.map((row, index) => (index === rowIndex ? detail : row));

      return updatedRows.map((row, index) => ({
        ...row,
        lineNo: index + 1,
      }));
    });

    this.hasUnsavedChanges.set(true);

    sender.closeRow(rowIndex);
    this.editedRowIndex = undefined;
    this.currentDetailForm.set(null);

    this.infoDialog(
      isNew ? 'Item Added' : 'Item Updated',
      isNew
        ? 'The item line has been added.'
        : 'The item line has been updated.',
    );
  }

  private getNextDetailLineNo(): number {
    const lineNumbers = this.detailsControls().map((row) =>
      Number(row.lineNo ?? 0),
    );

    const maxLineNo = lineNumbers.length > 0 ? Math.max(...lineNumbers) : 0;

    return maxLineNo + 1;
  }

  // removeHandler(args: RemoveEvent): void {
  //   this.detailsControls.update(rows =>
  //     rows.filter((_, index) => index !== args.rowIndex)
  //   );
  // }

  removeHandler(args: RemoveEvent): void {
    const itemCode = String(args.dataItem?.itemCode ?? '').trim();
    const itemDesc = String(args.dataItem?.itemDesc ?? '').trim();

    const itemText =
      itemCode || itemDesc
        ? `${itemCode} ${itemDesc}`.trim()
        : 'this item line';

    this.confirmDialog(
      'Please confirm?',
      `Are you sure you want to remove ${itemText}?`,
      () => {
        this.detailsControls.update((rows) =>
          rows
            .filter((_, index) => index !== args.rowIndex)
            .map((row, index) => ({
              ...row,
              lineNo: index + 1,
            })),
        );

        this.hasUnsavedChanges.set(true);
        this.infoDialog('Item Removed', `${itemText} has been removed.`);
      },
    );
  }

  private closeEditor(grid: GridComponent): void {
    if (this.editedRowIndex !== undefined) {
      grid.closeRow(this.editedRowIndex);
      this.editedRowIndex = undefined;
    }
  }

  onItemFilterChange(search: string): void {
    this.facade.setItemLookupSearch(search);
  }

  // onItemChanged(formGroup: FormGroup, itemCode: string): void {
  //   const selected = this.itemLookupData().find(
  //     item => item.itemCode === itemCode
  //   );

  //   if (!selected) {
  //     return;
  //   }

  //   formGroup.patchValue({
  //     itemDesc: selected.itemDesc ?? '',
  //     // Selecting an item defaults the detail U/M by copying lookup umCode into poUm.
  //     poUm: selected.umCode ?? '',
  //     poConvFactor: selected.poConvFactor ?? 1,
  //     unitPrice: selected.unitPrice ?? 0
  //   });
  // }

  //   public onItemSelected(
  //   formGroup: FormGroup,
  //   selected: any | null | undefined
  // ): void {
  //   if (!selected) {
  //     formGroup.patchValue(
  //       {
  //         itemCode: '',
  //         itemDesc: '',
  //         poUm: '',
  //         poConvFactor: 1,
  //         unitPrice: 0
  //       },
  //       {
  //         emitEvent: false
  //       }
  //     );

  //     return;
  //   }

  //   formGroup.patchValue(
  //     {
  //       itemCode: String(selected.itemCode ?? '').trim(),
  //       itemDesc: selected.itemDesc ?? '',
  //       poUm: selected.umCode ?? '',
  //       poConvFactor: selected.poConvFactor ?? 1,
  //       unitPrice: selected.unitPrice ?? 0
  //     },
  //     {
  //       emitEvent: false
  //     }
  //   );
  // }

  public onItemSelected(
    formGroup: FormGroup,
    selected: ItemLookup | null | undefined,
  ): void {
    this.itemUmsError.set(null);

    if (!selected) {
      formGroup.patchValue(
        {
          itemCode: '',
          itemDesc: '',
          poUm: '',
          qtyPo: 1,
          poConvFactor: 1,
          unitPrice: 0,
        },
        {
          emitEvent: false,
        },
      );

      return;
    }

    formGroup.patchValue(
      {
        itemCode: String(selected.itemCode ?? '').trim(),
        itemDesc: String(selected.itemDesc ?? '').trim(),

        /*
         * U/M must be selected manually from the complete U/M master list.
         */
        poUm: '',

        qtyPo: 1,

        /*
         * Conversion must be entered manually.
         */
        poConvFactor: 1,

        unitPrice: Number(selected.unitPrice ?? 0),
      },
      {
        emitEvent: false,
      },
    );
  }

  lineAmount(row: PurchaseOrderDetailRow): number {
    const qty = Number(row.qtyPo ?? 0);
    const unitPrice = Number(row.unitPrice ?? 0);

    return qty * unitPrice;
  }

  lineAmountFromForm(formGroup: FormGroup): number {
    const value = formGroup.getRawValue() as PurchaseOrderDetailRow;
    return this.lineAmount(value);
  }

  baseQuantity(row: PurchaseOrderDetailRow): number {
    return Number(row.qtyPo ?? 0) * Number(row.poConvFactor ?? 0);
  }

  baseQuantityFromForm(formGroup: FormGroup): number {
    const value = formGroup.getRawValue() as PurchaseOrderDetailRow;
    return this.baseQuantity(value);
  }

  readonly uomFilterSettings: DropDownFilterSettings = {
    caseSensitive: false,
    operator: 'contains',
    fields: ['umCode', 'umDesc'],
  };

  readonly uomPopupSettings: PopupSettings = {
    width: 450,
    height: 300,
  };

  readonly itemPopupSettings: PopupSettings = {
    width: 950,
    height: 320,
  };

  uomControl(formGroup: FormGroup): FormControl<string> {
    // Grid editor must point at poUm; po_um is only a backend/database column name.
    return formGroup.get('poUm') as FormControl<string>;
  }


  onUomSelectionChange(selected: LookupUM | null, formGroup: FormGroup): void {
    const control = this.uomControl(formGroup);

    if (!selected) {
      control.setValue('', {
        emitEvent: false,
      });
      control.setErrors({ required: true });
      return;
    }

    control.setValue(String(selected.umCode ?? '').trim(), {
      emitEvent: false,
    });
    control.setErrors(null);
    control.markAsDirty();

    /*
     * Do NOT set poConvFactor here.
     * Conversion is entered manually by the user.
     */
  }

  // onUomSelectionChange(
  //   selected: PurchasePriceItemUm | null,
  //   formGroup: FormGroup,
  // ): void {
  //   const control = this.uomControl(formGroup);

  //   if (!selected) {
  //     control.setValue('');
  //     control.setErrors({ required: true });

  //     formGroup.get('poConvFactor')?.setValue(0);

  //     return;
  //   }

  //   control.setValue(selected.poUm, {
  //     emitEvent: false,
  //   });

  //   control.setErrors(null);
  //   control.markAsDirty();

  //   formGroup
  //     .get('poConvFactor')
  //     ?.setValue(Number(selected.conversionFactor ?? 0), {
  //       emitEvent: false,
  //     });

  //   formGroup.get('poConvFactor')?.markAsDirty();

  //   /*
  //    * Every time the user changes Purchase U/M,
  //    * re-resolve supplier pricing for that U/M.
  //    */
  //   this.resolvePriceForForm(formGroup, selected);
  // }

  // onUomValueChange(value: string | null, formGroup: FormGroup): void {
  //   const control = this.uomControl(formGroup);

  //   const code = String(value ?? '').trim();

  //   if (!code) {
  //     control.setErrors({
  //       required: true,
  //     });

  //     formGroup.get('poConvFactor')?.setValue(0, {
  //       emitEvent: false,
  //     });

  //     return;
  //   }

  //   const selected = this.itemUms().find(
  //     (row) =>
  //       String(row.poUm ?? '')
  //         .trim()
  //         .toUpperCase() === code.toUpperCase(),
  //   );

  //   if (!selected) {
  //     control.setErrors({
  //       invalidUom: true,
  //     });

  //     formGroup.get('poConvFactor')?.setValue(0, {
  //       emitEvent: false,
  //     });

  //     return;
  //   }

  //   control.setErrors(null);

  //   formGroup
  //     .get('poConvFactor')
  //     ?.setValue(Number(selected.conversionFactor ?? 0), {
  //       emitEvent: false,
  //     });
  // }


  onUomValueChange(value: string | null, formGroup: FormGroup): void {
    const control = this.uomControl(formGroup);
    const code = String(value ?? '').trim();

    if (!code) {
      control.setErrors({ required: true });
      return;
    }

    if (!this.facade.unitMeasureExists(code)) {
      control.setErrors({ invalidUom: true });
      return;
    }

    control.setErrors(null);
  }


  onUomBlur(formGroup: FormGroup): void {
    const control = this.uomControl(formGroup);
    const code = String(control.value ?? '').trim();

    control.markAsTouched();

    if (!code) {
      control.setErrors({ required: true });
      return;
    }

    if (!this.facade.unitMeasureExists(code)) {
      control.setErrors({ invalidUom: true });
      return;
    }

    control.setErrors(null);
  }


  // onUomBlur(formGroup: FormGroup): void {
  //   const control = this.uomControl(formGroup);
  //   const code = String(control.value ?? '').trim();

  //   control.markAsTouched();

  //   if (!code) {
  //     control.setErrors({ required: true });
  //     return;
  //   }

  //   if (!this.itemUms().some((row) => row.poUm === code)) {
  //     control.setErrors({ invalidUom: true });
  //     return;
  //   }

  //   control.setErrors(null);
  // }

  private loadItemUms(
    itemCode: string,
    formGroup: FormGroup,
    applyDefault: boolean,
    preferredUm = '',
  ): void {
    const normalizedItem = String(itemCode ?? '').trim();

    this.itemUmsError.set(null);

    if (!normalizedItem) {
      this.itemUms.set([]);

      formGroup.patchValue(
        {
          poUm: '',
          poConvFactor: 0,
        },
        {
          emitEvent: false,
        },
      );

      return;
    }

    this.itemUmsLoading.set(true);

    this.pricing
      .getItemUms(normalizedItem)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.itemUmsLoading.set(false)),
      )
      .subscribe({
        next: (rows) => {
          /*
           * Prevent a late API response from another item
           * from being applied to the currently edited row.
           */
          const currentItemCode = String(
            formGroup.get('itemCode')?.value ?? '',
          ).trim();

          if (currentItemCode !== normalizedItem) {
            return;
          }

          const availableUms = (rows ?? []).filter(
            (row) =>
              !!String(row.poUm ?? '').trim() &&
              Number(row.conversionFactor ?? 0) > 0,
          );

          this.itemUms.set(availableUms);

          if (availableUms.length === 0) {
            formGroup.patchValue(
              {
                poUm: '',
                poConvFactor: 0,
              },
              {
                emitEvent: false,
              },
            );

            formGroup.get('poUm')?.setErrors({
              invalidUom: true,
            });

            this.itemUmsError.set(
              `No valid Purchase U/M was found for item ${normalizedItem}.`,
            );

            return;
          }

          /*
           * Current value is useful when editing an existing PO line.
           */
          const currentUm = String(formGroup.get('poUm')?.value ?? '').trim();

          /*
           * Try to default in this order:
           *
           * 1. preferred U/M from Item Master / Item Lookup
           * 2. existing PO line U/M
           * 3. Base U/M where conversion = 1
           * 4. first valid returned U/M
           */
          let selectedUm: PurchasePriceItemUm | undefined;

          if (applyDefault) {
            const preferred = String(preferredUm ?? '').trim();

            if (preferred) {
              selectedUm = availableUms.find(
                (row) =>
                  String(row.poUm ?? '')
                    .trim()
                    .toUpperCase() === preferred.toUpperCase(),
              );
            }
          }

          if (!selectedUm && currentUm) {
            selectedUm = availableUms.find(
              (row) =>
                String(row.poUm ?? '')
                  .trim()
                  .toUpperCase() === currentUm.toUpperCase(),
            );
          }

          if (!selectedUm) {
            selectedUm = availableUms.find(
              (row) => Number(row.conversionFactor ?? 0) === 1,
            );
          }

          if (!selectedUm) {
            selectedUm = availableUms[0];
          }

          if (!selectedUm) {
            return;
          }

          formGroup.patchValue(
            {
              poUm: selectedUm.poUm,
              poConvFactor: Number(selectedUm.conversionFactor),
            },
            {
              emitEvent: false,
            },
          );

          formGroup.get('poUm')?.setErrors(null);

          /*
           * Resolve supplier/item/U/M-specific price.
           */
          this.resolvePriceForForm(formGroup, selectedUm);
        },

        error: (error: unknown) => {
          this.itemUms.set([]);

          formGroup.patchValue(
            {
              poUm: '',
              poConvFactor: 0,
            },
            {
              emitEvent: false,
            },
          );

          formGroup.get('poUm')?.setErrors({
            invalidUom: true,
          });

          this.itemUmsError.set(
            this.getNotificationError(
              error,
              'Unable to load Purchase U/Ms for the selected item.',
            ),
          );
        },
      });
  }

  private resolvePriceForForm(
    formGroup: FormGroup,
    selectedUm: PurchasePriceItemUm,
  ): void {
    const supplierCode = String(
      this.poform.getRawValue().suppCode ?? '',
    ).trim();
    const itemCode = String(formGroup.get('itemCode')?.value ?? '').trim();
    if (!supplierCode || !itemCode || !selectedUm.poUm) {
      return;
    }

    this.pricing
      .resolve(supplierCode, itemCode, selectedUm.poUm)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resolution) => {
          const unchanged =
            String(formGroup.get('itemCode')?.value ?? '').trim() ===
            itemCode &&
            String(formGroup.get('poUm')?.value ?? '').trim() ===
            selectedUm.poUm &&
            String(this.poform.getRawValue().suppCode ?? '').trim() ===
            supplierCode;

          if (!unchanged) {
            return;
          }
          if (!resolution.isUmValid) {
            formGroup.get('poUm')?.setErrors({ invalidUom: true });
            formGroup.get('poConvFactor')?.setValue(0);
            return;
          }

          formGroup
            .get('poConvFactor')
            ?.setValue(resolution.poConvFactor ?? selectedUm.conversionFactor);
          const currentPrice = Number(formGroup.get('unitPrice')?.value ?? 0);
          if (
            currentPrice <= 0 &&
            resolution.suggestedPrice !== null &&
            resolution.suggestedPrice !== undefined
          ) {
            formGroup.get('unitPrice')?.setValue(resolution.suggestedPrice);
          }
        },
        error: (error: unknown) => {
          this.itemUmsError.set(
            this.getNotificationError(
              error,
              'Unable to resolve a reference price.',
            ),
          );
        },
      });
  }

  private prefillMissingRowPrices(supplierCode: string): void {
    this.detailsControls().forEach((row, index) => {
      if (!row.itemCode || !row.poUm || Number(row.unitPrice) > 0) {
        return;
      }

      this.pricing
        .resolve(supplierCode, row.itemCode, row.poUm)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (resolution) => {
            if (
              String(this.poform.getRawValue().suppCode ?? '').trim() !==
              supplierCode ||
              !resolution.isUmValid ||
              resolution.suggestedPrice === null ||
              resolution.suggestedPrice === undefined
            ) {
              return;
            }

            this.detailsControls.update((rows) =>
              rows.map((current, currentIndex) =>
                currentIndex === index &&
                  current.itemCode === row.itemCode &&
                  current.poUm === row.poUm &&
                  Number(current.unitPrice) <= 0
                  ? {
                    ...current,
                    unitPrice: resolution.suggestedPrice!,
                    lineAmount:
                      Number(current.qtyPo) * resolution.suggestedPrice!,
                  }
                  : current,
              ),
            );
          },
        });
    });
  }

  openPriceInquiry(row: PurchaseOrderDetailRow, rowIndex: number): void {
    const context = this.buildPriceContext(row);
    if (!context) {
      return;
    }
    this.priceActionRowIndex.set(rowIndex);
    this.priceDialogContext.set(context);
    this.showPriceInquiry.set(true);
  }

  openSupplierPriceList(): void {
    this.openSupplierPriceListForTarget(null);
  }

  openSupplierPriceListForRow(rowIndex: number): void {
    this.openSupplierPriceListForTarget(rowIndex);
  }

  closeSupplierPriceList(): void {
    this.supplierPriceListOpened.set(false);
    this.supplierPriceListTargetRowIndex.set(null);
  }

  onSupplierPriceSelected(price: SupplierPriceListItem): void {
    const targetRowIndex = this.supplierPriceListTargetRowIndex();
    const duplicateIndex = this.findSupplierPriceDuplicate(
      price,
      targetRowIndex,
    );

    if (duplicateIndex !== null) {
      this.showError(
        `Item ${price.itemCode} / ${price.poUm} already exists in PO details on line ${duplicateIndex + 1}.`,
      );
      return;
    }

    if (targetRowIndex !== null) {
      const target = this.detailsControls()[targetRowIndex];

      if (!target) {
        this.showError('The selected PO detail row is no longer available.');
        this.closeSupplierPriceList();
        return;
      }

      // Preserve the ordered quantity and database row identity. This command
      // explicitly replaces only the selected row's item/U/M pricing reference.
      this.detailsControls.update((rows) =>
        rows.map((row, index) =>
          index === targetRowIndex
            ? this.normalizeDetailRow(
              {
                ...row,
                itemCode: price.itemCode,
                itemDesc: price.itemDescription,
                poUm: price.poUm,
                poConvFactor: price.poConvFactor,
                unitPrice: price.unitPrice,
              },
              index,
            )
            : row,
        ),
      );
    } else {
      // Match the existing grid Add behavior: quantity remains zero until the
      // purchasing user intentionally enters the ordered quantity.
      const detail = this.normalizeDetailRow(
        {
          lineNo: this.getNextDetailLineNo(),
          poLineNo: null,
          itemCode: price.itemCode,
          itemDesc: price.itemDescription,
          qtyPo: 0,
          poUm: price.poUm,
          poConvFactor: price.poConvFactor,
          unitPrice: price.unitPrice,
        },
        this.detailsControls().length,
      );

      this.detailsControls.update((rows) => [...rows, detail]);
    }

    this.syncLoadedItemLookups(this.detailsControls());
    this.hasUnsavedChanges.set(true);
    this.closeSupplierPriceList();
    this.infoDialog(
      targetRowIndex === null
        ? 'Supplier Price Added'
        : 'PO Line Price Updated',
      targetRowIndex === null
        ? 'The supplier price was added as a new PO detail line. Enter the ordered quantity before saving.'
        : 'The selected supplier price was applied to the current PO detail line. Its quantity was preserved.',
    );
  }

  private openSupplierPriceListForTarget(rowIndex: number | null): void {
    // if (this.isReadOnly()) {
    //   return;
    // }

    const supplierCode = String(
      this.poform.getRawValue().suppCode ?? '',
    ).trim();

    if (!supplierCode) {
      this.showError('Please select a supplier first.');
      return;
    }

    const supplierName =
      this.facade.suppliers().find((row) => row.suppCode === supplierCode)
        ?.suppName ?? supplierCode;

    this.supplierPriceListSupplierCode.set(supplierCode);
    this.supplierPriceListSupplierName.set(supplierName);
    this.supplierPriceListTargetRowIndex.set(rowIndex);
    this.supplierPriceListOpened.set(true);
  }

  private findSupplierPriceDuplicate(
    price: SupplierPriceListItem,
    excludedRowIndex: number | null,
  ): number | null {
    const itemCode = price.itemCode.trim().toUpperCase();
    const poUm = price.poUm.trim().toUpperCase();
    const index = this.detailsControls().findIndex(
      (row, rowIndex) =>
        rowIndex !== excludedRowIndex &&
        row.itemCode.trim().toUpperCase() === itemCode &&
        row.poUm.trim().toUpperCase() === poUm,
    );

    return index >= 0 ? index : null;
  }

  openPriceHistory(row: PurchaseOrderDetailRow, rowIndex: number): void {
    const context = this.buildPriceContext(row);
    if (!context) {
      return;
    }
    this.priceActionRowIndex.set(rowIndex);
    this.priceDialogContext.set(context);
    this.showPriceHistory.set(true);
  }

  closePriceDialogs(): void {
    this.showPriceInquiry.set(false);
    this.showPriceHistory.set(false);
    this.priceDialogContext.set(null);
    this.priceActionRowIndex.set(null);
  }

  usePriceForCurrentRow(price: number): void {
    const rowIndex = this.priceActionRowIndex();
    if (rowIndex === null || this.isReadOnly() || price < 0) {
      return;
    }

    this.detailsControls.update((rows) =>
      rows.map((row, index) =>
        index === rowIndex
          ? {
            ...row,
            unitPrice: price,
            lineAmount: Number(row.qtyPo) * price,
          }
          : row,
      ),
    );
    this.hasUnsavedChanges.set(true);
    this.closePriceDialogs();
    this.infoDialog(
      'PO Line Price Updated',
      'The price was copied to the current PO row. Save the Purchase Order to persist it.',
    );
  }

  private buildPriceContext(
    row: PurchaseOrderDetailRow,
  ): PurchasePriceDialogContext | null {
    const supplierCode = String(
      this.poform.getRawValue().suppCode ?? '',
    ).trim();
    if (!supplierCode || !row.itemCode || !row.poUm || row.poConvFactor <= 0) {
      this.showError(
        'Select a supplier and a valid item-specific U/M before opening pricing.',
      );
      return null;
    }

    const supplierName =
      this.facade.suppliers().find((row) => row.suppCode === supplierCode)
        ?.suppName ?? supplierCode;

    return {
      poNo: this.emptyToNull(this.poform.getRawValue().poNo),
      supplierCode,
      supplierName,
      itemCode: row.itemCode,
      itemDescription: row.itemDesc,
      poUm: row.poUm,
      poConvFactor: row.poConvFactor,
      actualUnitPrice: row.unitPrice,
      editable: !this.isReadOnly(),
    };
  }

  private validateDetailLines(): boolean {
    const details = this.detailLines();

    if (details.length === 0) {
      this.detailValidationError.set('Please add at least one detail line.');
      return false;
    }

    const invalidLine = details.find(
      (line) =>
        !line.itemCode ||
        !line.poUm ||
        Number(line.qtyPo) <= 0 ||
        Number(line.poConvFactor) <= 0 ||
        Number(line.unitPrice) <= 0,
    );

    if (invalidLine) {
      this.detailValidationError.set(
        'Please complete item, U/M, quantity, conversion, and price for every detail line.',
      );
      return false;
    }

    return true;
  }

  verifySoFromMainField(): void {
    const soNoControl = this.poform.get('soNo');
    const soNo = String(soNoControl?.value ?? '').trim();

    if (!soNo) {
      soNoControl?.markAsTouched();
      return;
    }

    soNoControl?.setValue(soNo, { emitEvent: false });

    this.verifiedSoNo.set(soNo);
    this.showSoDialog.set(true);

    // One-time verification diri.
    // Mao ni mo tawag sa API dayon inig click sa first Verify button.
    this.facade.verifySoNo(soNo);
  }

  closeSoDialog(): void {
    this.showSoDialog.set(false);
  }
}