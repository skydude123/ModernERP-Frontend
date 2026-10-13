import { CommonModule } from '@angular/common';
import {
  Component,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { ButtonsModule } from '@progress/kendo-angular-buttons';
import { DateInputsModule } from '@progress/kendo-angular-dateinputs';
import {
  DialogCloseResult,
  DialogModule,
  DialogRef,
  DialogService,
} from '@progress/kendo-angular-dialog';
import {
  DropDownsModule,
  PopupSettings,
} from '@progress/kendo-angular-dropdowns';
import {
  AddEvent,
  CancelEvent,
  EditEvent,
  GridComponent,
  GridModule,
  RemoveEvent,
  SaveEvent,
} from '@progress/kendo-angular-grid';
import { InputsModule } from '@progress/kendo-angular-inputs';
import { LayoutModule } from '@progress/kendo-angular-layout';
import { ToolBarModule } from '@progress/kendo-angular-toolbar';
import { take } from 'rxjs';

import { AuthFacadeService } from '../../../core/services/auth-facade.service';
import {
  ErpSaveConfirmDialogComponent,
  ErpSaveConfirmDialogData,
} from '../../../shared/NOTIFICATION-confirm-dialog/erp-save-confirm-dialog.component';
import { ErpNotificationService } from '../../../shared/notification-card/erp-notification.service';
import { AppToolbarComponent } from '../../../shared/services/app-toolbar/app-toolbar.component';
import { AppToolbarService } from '../../../shared/services/app-toolbar/toolbar.service';
import { ServiceAcceptanceFacade } from '../data-access/service-acceptance.facade';
import {
  ServiceAcceptanceCommandResponse,
  ServiceAcceptanceDetail,
  ServiceAcceptanceSaveRequest,
  ServiceAcceptanceStatus,
  ServiceBranchLookup,
  ServiceOpenPoLineLookup,
  ServiceSupplierLookup,
  ServiceType,
} from '../models/service-acceptance.models';

type WorkflowAction = 'accept' | 'post' | 'reverse';

@Component({
  selector: 'app-service-acceptance-entry',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonsModule,
    DateInputsModule,
    DialogModule,
    DropDownsModule,
    GridModule,
    InputsModule,
    LayoutModule,
    ToolBarModule,
    AppToolbarComponent,
  ],
  providers: [ServiceAcceptanceFacade],
  templateUrl: './service-acceptance-entry.component.html',
  styleUrl: './service-acceptance-entry.component.scss',
})
export class ServiceAcceptanceEntryComponent implements OnDestroy {
  readonly facade = inject(ServiceAcceptanceFacade);
  readonly toolbar = inject(AppToolbarService);

  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthFacadeService);
  private readonly notify = inject(ErpNotificationService);
  private readonly dialogs = inject(DialogService);

  readonly status = signal<ServiceAcceptanceStatus>('DRAFT');
  readonly rowVersion = signal<string | null>(null);
  readonly documentNo = signal<string>('');
  readonly details = signal<ServiceAcceptanceDetail[]>([]);
  readonly editingRowIndex = signal<number | null>(null);
  readonly gridHasUnsavedChanges = signal(false);

  readonly poLinePopupSettings: PopupSettings = {
    width: 1100,
    height: 380,
    popupClass: 'service-po-line-popup',
  };

  readonly serviceTypes: Array<{ value: ServiceType; text: string }> = [
    { value: 'REPAIR_MAINTENANCE', text: 'Repair / Maintenance' },
    { value: 'MECHANIC_SERVICE', text: 'Mechanic Service' },
    { value: 'COMPUTER_REPAIR', text: 'Computer Repair' },
    { value: 'JOB_OUT', text: 'Job-out' },
    { value: 'INSTALLATION', text: 'Installation' },
    { value: 'LABOR', text: 'Labor' },
    { value: 'FREIGHT', text: 'Freight Service' },
  ];

  readonly form = this.fb.group({
    serviceAcceptanceNo: [''],
    acceptanceDate: [new Date(), Validators.required],
    suppCode: ['', [Validators.required, Validators.pattern(/\S/)]],
    suppName: [''],
    serviceType: ['REPAIR_MAINTENANCE' as ServiceType, Validators.required],
    branchName: ['MANDAUE', [Validators.required, Validators.pattern(/\S/)]],
    departmentCode: [''],
    projectNo: [''],
    joNo: [''],
    serviceLocation: [''],
  servicePeriodFrom: [
  null as Date | null,
  Validators.required,
],
    servicePeriodTo: [
  null as Date | null,
  Validators.required,
],
    requestedBy: [''],
    remarks: [''],
  });

  readonly isEditable = computed(
    () => this.status() === 'DRAFT' && !this.facade.commandBusy(),
  );

  readonly totalAmount = computed(() =>
    this.details().reduce((total, line) => total + this.amount(line), 0),
  );

  readonly canAccept = computed(() => {
    const validStatus =
      this.status() === 'DRAFT' || this.status() === 'SUBMITTED';

    return (
      validStatus &&
      this.documentNo().trim().length > 0 &&
      !!this.rowVersion()?.trim() &&
      this.details().length > 0 &&
      this.totalAmount() > 0 &&
      this.form.pristine &&
      !this.gridHasUnsavedChanges() &&
      !this.facade.commandBusy()
    );
  });

  readonly canPost = computed(
    () =>
      this.status() === 'ACCEPTED' &&
      this.documentNo().trim().length > 0 &&
      !!this.rowVersion()?.trim() &&
      this.totalAmount() > 0 &&
      !this.facade.commandBusy(),
  );

  readonly canReverse = computed(
    () =>
      this.status() === 'POSTED' &&
      this.documentNo().trim().length > 0 &&
      !!this.rowVersion()?.trim() &&
      !this.facade.commandBusy(),
  );

  constructor() {
    this.toolbar.setConfig({
      showNew: true,
      showSave: true,
      showSubmit: false,
      showAccept: true,
      showPost: true,
      showReverse: true,
      showDataList: true,
      showRefresh: true,
    });

    const routeDocumentNo = this.route.snapshot.paramMap.get(
      'serviceAcceptanceNo',
    );

    if (routeDocumentNo && routeDocumentNo.toLowerCase() !== 'new') {
      const cleanDocumentNo = routeDocumentNo.trim();
      this.documentNo.set(cleanDocumentNo);
      this.facade.loadDocument(cleanDocumentNo);
    }

    effect(
      () => {
        const document = this.facade.document();
        if (!document) {
          return;
        }

        const header = document.header;
        const cleanDocumentNo = String(
          header.serviceAcceptanceNo ?? '',
        ).trim();
        const supplierCode = String(header.suppCode ?? '').trim();
        const branchName = String(header.branchName ?? '').trim() || 'MANDAUE';

        this.documentNo.set(cleanDocumentNo);
        this.status.set(this.normalizeStatus(header.status));
        this.rowVersion.set(this.normalizeRowVersion(header.rowVersion));

        this.form.patchValue(
          {
            serviceAcceptanceNo: cleanDocumentNo,
            acceptanceDate: this.asDate(header.acceptanceDate),
            suppCode: supplierCode,
            suppName: String(header.suppName ?? '').trim(),
            serviceType: header.serviceType,
            branchName,
            departmentCode: header.departmentCode ?? '',
            projectNo: header.projectNo ?? '',
            joNo: header.joNo ?? '',
            serviceLocation: header.serviceLocation ?? '',
            servicePeriodFrom: this.asNullableDate(header.servicePeriodFrom),
            servicePeriodTo: this.asNullableDate(header.servicePeriodTo),
            requestedBy: header.requestedBy ?? '',
            remarks: header.remarks ?? '',
          },
          { emitEvent: false },
        );

        this.details.set(
          (document.details ?? []).map((detail, index) => ({
            ...detail,
            lineSeq: index + 1,
            poNo: String(detail.poNo ?? '').trim(),
            poSeq: Number(detail.poSeq ?? 0),
            itemCode: detail.itemCode ? String(detail.itemCode).trim() : null,
            serviceDescription: String(detail.serviceDescription ?? '').trim(),
            unitOfMeasure: detail.unitOfMeasure
              ? String(detail.unitOfMeasure).trim()
              : null,
            poQty: Number(detail.poQty ?? 0),
            remainingQty: Number(detail.remainingQty ?? 0),
            acceptedQty: Number(detail.acceptedQty ?? 0),
            rate: Number(detail.rate ?? 0),
            acceptedAmount: this.round4(
              Number(detail.acceptedQty ?? 0) * Number(detail.rate ?? 0),
            ),
            taxSchemeCode: String(detail.taxSchemeCode ?? 'NV') || 'NV',
            remarks: detail.remarks ?? null,
          })),
        );

        this.facade.selectSupplier(supplierCode || null);
        this.facade.selectBranch(branchName);
        this.facade.setExcludeAcceptanceNo(cleanDocumentNo || null);
        this.facade.reloadSuppliers();
        this.facade.reloadBranches();

        this.form.markAsPristine();
        this.form.markAsUntouched();
        this.gridHasUnsavedChanges.set(false);
        this.editingRowIndex.set(null);
      },
      { allowSignalWrites: true },
    );
  }

  ngOnDestroy(): void {
    this.toolbar.reset();
  }

  supplierData(): ServiceSupplierLookup[] {
    const lookup = this.facade.suppliers();
    const suppCode = String(this.form.controls.suppCode.value ?? '').trim();
    const suppName = String(this.form.controls.suppName.value ?? '').trim();

    if (!suppCode) {
      return lookup;
    }

    const exists = lookup.some(
      (item) => String(item.suppCode ?? '').trim() === suppCode,
    );

    if (exists) {
      return lookup;
    }

    return [
      {
        suppCode,
        suppName: suppName || suppCode,
        displayText: `${suppCode} - ${suppName || suppCode}`,
      },
      ...lookup,
    ];
  }

  branchData(): ServiceBranchLookup[] {
    const lookup = this.facade.branches();
    const branchName = String(
      this.form.controls.branchName.value ?? '',
    ).trim();

    if (!branchName) {
      return lookup;
    }

    const exists = lookup.some(
      (item) => String(item.branchName ?? '').trim() === branchName,
    );

    return exists ? lookup : [{ branchName }, ...lookup];
  }

  isFieldInvalid(controlName: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.touched || control.dirty);
  }

  isInvalid(control: AbstractControl): boolean {
    return control.invalid && (control.touched || control.dirty);
  }

  newDocument(): void {
    this.facade.loadDocument(null);
    this.facade.selectSupplier(null);
    this.facade.selectBranch('MANDAUE');
    this.facade.setExcludeAcceptanceNo(null);

    this.documentNo.set('');
    this.status.set('DRAFT');
    this.rowVersion.set(null);
    this.details.set([]);
    this.editingRowIndex.set(null);
    this.gridHasUnsavedChanges.set(false);

    this.form.reset({
      serviceAcceptanceNo: '',
      acceptanceDate: new Date(),
      suppCode: '',
      suppName: '',
      serviceType: 'REPAIR_MAINTENANCE',
      branchName: 'MANDAUE',
      departmentCode: '',
      projectNo: '',
      joNo: '',
      serviceLocation: '',
      servicePeriodFrom: null,
      servicePeriodTo: null,
      requestedBy: '',
      remarks: '',
    });

    this.form.markAsPristine();
    this.form.markAsUntouched();

    this.facade.reloadSuppliers();
    this.facade.reloadBranches();

    void this.router.navigate(['/service-acceptance/new']);
  }

  list(): void {
    void this.router.navigate(['/service-acceptance']);
  }

  print(): void {
    window.print();
  }

  refresh(): void {
    const documentNo = this.documentNo().trim();

    this.facade.reloadSuppliers();
    this.facade.reloadBranches();

    if (documentNo) {
      this.facade.loadDocument(documentNo);
      this.facade.reloadDocument();
      return;
    }

    if (this.form.controls.suppCode.value?.trim()) {
      this.facade.reloadOpenPoLines();
    }
  }

  supplierFilterChanged(value: string): void {
    this.facade.searchSuppliers(value ?? '');
  }

  supplierChanged(
    supplier: ServiceSupplierLookup | null | undefined,
  ): void {
    if (!this.isEditable()) {
      return;
    }

    if (!supplier) {
      this.form.patchValue(
        { suppCode: '', suppName: '' },
        { emitEvent: false },
      );
      this.details.set([]);
      this.facade.selectSupplier(null);
      this.form.markAsDirty();
      this.gridHasUnsavedChanges.set(true);
      return;
    }

    const code = String(supplier.suppCode ?? '').trim();
    const name = String(supplier.suppName ?? '').trim();
    const previousCode = String(
      this.form.controls.suppCode.value ?? '',
    ).trim();

    if (!code) {
      return;
    }

    if (previousCode && previousCode !== code && this.details().length > 0) {
      this.details.set([]);
    }

    this.form.patchValue(
      { suppCode: code, suppName: name },
      { emitEvent: false },
    );

    this.facade.selectSupplier(code);
    this.facade.reloadOpenPoLines();
    this.form.markAsDirty();
    this.gridHasUnsavedChanges.set(true);
  }

  branchChanged(branchName: string | null): void {
    if (!this.isEditable()) {
      return;
    }

    const cleanBranch = String(branchName ?? '').trim();
    const previousBranch = String(
      this.form.controls.branchName.value ?? '',
    ).trim();

    this.form.controls.branchName.setValue(cleanBranch, {
      emitEvent: false,
    });

    if (
      previousBranch &&
      previousBranch !== cleanBranch &&
      this.details().length > 0
    ) {
      this.details.set([]);
    }

    this.facade.selectBranch(cleanBranch || null);
    this.facade.reloadOpenPoLines();
    this.form.markAsDirty();
    this.gridHasUnsavedChanges.set(true);
  }

  addHandler(args: AddEvent): void {
    if (!this.isEditable()) {
      return;
    }

    const supplierCode = String(
      this.form.controls.suppCode.value ?? '',
    ).trim();
    const branchName = String(
      this.form.controls.branchName.value ?? '',
    ).trim();

    if (!supplierCode) {
      this.form.controls.suppCode.markAsTouched();
      this.notify.warning(
        'Select a Supplier before adding a Service line.',
        'Supplier Required',
      );
      return;
    }

    if (!branchName) {
      this.form.controls.branchName.markAsTouched();
      this.notify.warning(
        'Select a Branch before adding a Service line.',
        'Branch Required',
      );
      return;
    }

    this.facade.selectSupplier(supplierCode);
    this.facade.selectBranch(branchName);
    this.facade.reloadOpenPoLines();

    this.closeEditor(args.sender);
    this.editingRowIndex.set(-1);

    args.sender.addRow(
      this.createDetailGroup({
        lineSeq: this.nextLineSeq(),
        poNo: '',
        poSeq: 0,
        itemCode: null,
        serviceDescription: '',
        unitOfMeasure: null,
        poQty: 0,
        remainingQty: 0,
        acceptedQty: 0,
        rate: 0,
        acceptedAmount: 0,
        taxSchemeCode: 'NV',
        remarks: null,
      }),
    );
  }

  editHandler(args: EditEvent): void {
    if (!this.isEditable()) {
      return;
    }

    this.closeEditor(args.sender);
    this.editingRowIndex.set(args.rowIndex);
    args.sender.editRow(
      args.rowIndex,
      this.createDetailGroup(args.dataItem as ServiceAcceptanceDetail),
    );
  }

  cancelHandler(args: CancelEvent): void {
    args.sender.closeRow(args.rowIndex);
    this.editingRowIndex.set(null);
  }

  onGridPoLineSelected(
    formGroup: FormGroup,
    selected: ServiceOpenPoLineLookup | null | undefined,
  ): void {
    if (!selected) {
      formGroup.patchValue(
        {
          poNo: '',
          poSeq: 0,
          itemCode: '',
          serviceDescription: '',
          unitOfMeasure: '',
          poQty: 0,
          remainingQty: 0,
          acceptedQty: 0,
          rate: 0,
          taxSchemeCode: 'NV',
        },
        { emitEvent: false },
      );
      return;
    }

    const remainingQty = Number(selected.remainingQty ?? 0);
    const rate = Number(selected.rate ?? 0);

    formGroup.patchValue(
      {
        poNo: String(selected.poNo ?? '').trim(),
        poSeq: Number(selected.poSeq ?? 0),
        itemCode: String(selected.itemCode ?? '').trim(),
        serviceDescription: String(selected.serviceDescription ?? '').trim(),
        unitOfMeasure: String(selected.unitOfMeasure ?? '').trim(),
        poQty: Number(selected.poQty ?? 0),
        remainingQty,
        acceptedQty: remainingQty,
        rate,
        taxSchemeCode: 'NV',
      },
      { emitEvent: false },
    );

    formGroup.markAsDirty();
    formGroup.updateValueAndValidity({ emitEvent: true });
  }

  saveHandler(args: SaveEvent): void {
    if (!this.isEditable()) {
      return;
    }

    const group = args.formGroup;
    group.markAllAsTouched();
    group.updateValueAndValidity({ emitEvent: false });

    if (group.invalid) {
      this.notify.warning(
        'Select a valid open Service PO line.',
        'Service Line Validation',
      );
      return;
    }

    const raw = group.getRawValue();
    const poNo = String(raw.poNo ?? '').trim();
    const poSeq = Number(raw.poSeq ?? 0);

    const duplicate = this.details().some((existing, index) => {
      const isSameEditedRow = !args.isNew && index === args.rowIndex;
      if (isSameEditedRow) {
        return false;
      }

      return (
        String(existing.poNo ?? '').trim().toUpperCase() ===
        poNo.toUpperCase() && Number(existing.poSeq ?? 0) === poSeq
      );
    });

    if (duplicate) {
      this.notify.warning(
        `PO ${poNo} / Line ${poSeq} is already included.`,
        'Duplicate Service PO Line',
      );
      return;
    }

    const existing = args.dataItem as ServiceAcceptanceDetail | undefined;
    const lineSeq = args.isNew
      ? this.nextLineSeq()
      : Number(existing?.lineSeq ?? args.rowIndex + 1);

    const remainingQty = Number(raw.remainingQty ?? 0);
    const acceptedQty = Number(raw.acceptedQty ?? remainingQty);
    const rate = Number(raw.rate ?? 0);

    const line: ServiceAcceptanceDetail = {
      serviceLineNo: existing?.serviceLineNo,
      serviceAcceptanceNo: existing?.serviceAcceptanceNo,
      lineSeq,
      poNo,
      poSeq,
      itemCode: String(raw.itemCode ?? '').trim() || null,
      serviceDescription: String(raw.serviceDescription ?? '').trim(),
      unitOfMeasure: String(raw.unitOfMeasure ?? '').trim() || null,
      poQty: Number(raw.poQty ?? 0),
      remainingQty,
      acceptedQty,
      rate,
      acceptedAmount: this.round4(acceptedQty * rate),
      taxSchemeCode: 'NV',
      remarks: String(raw.remarks ?? '').trim() || null,
    };

    if (args.isNew) {
      this.details.update((rows) => [...rows, line]);
    } else {
      this.details.update((rows) =>
        rows.map((row, index) => (index === args.rowIndex ? line : row)),
      );
    }

    args.sender.closeRow(args.rowIndex);
    this.editingRowIndex.set(null);
    this.gridHasUnsavedChanges.set(true);
    this.form.markAsDirty();
  }

  removeHandler(args: RemoveEvent): void {
    if (!this.isEditable()) {
      return;
    }

    const line = args.dataItem as ServiceAcceptanceDetail;
    const targetPoNo = String(line.poNo ?? '').trim().toUpperCase();
    const targetPoSeq = Number(line.poSeq ?? 0);

    this.details.update((rows) =>
      rows
        .filter(
          (row) =>
            !(
              String(row.poNo ?? '').trim().toUpperCase() === targetPoNo &&
              Number(row.poSeq ?? 0) === targetPoSeq
            ),
        )
        .map((row, index) => ({ ...row, lineSeq: index + 1 })),
    );

    this.editingRowIndex.set(null);
    this.gridHasUnsavedChanges.set(true);
    this.form.markAsDirty();
  }

  amount(line: ServiceAcceptanceDetail): number {
    return this.round4(
      Number(line.acceptedQty ?? 0) * Number(line.rate ?? 0),
    );
  }

  save(): void {
    if (!this.isEditable()) {
      return;
    }

    this.form.markAllAsTouched();

    if (this.form.invalid) {
      this.notify.warning(
        'Please complete all required Service Acceptance header fields.',
        'Service Acceptance Validation',
      );
      return;
    }

    if (!this.validServicePeriod()) {
      return;
    }

    if (this.details().length === 0) {
      this.notify.warning(
        'Add at least one Service PO line.',
        'Service Line Required',
      );
      return;
    }

    if (!this.validateDetails()) {
      return;
    }

    const userId = this.currentUser();

    if (!userId) {
      this.notify.error(
        'Current authenticated user ID is unavailable.',
        'Service Acceptance Save Failed',
      );
      return;
    }

    const documentNo = this.documentNo().trim();
    const isUpdate = documentNo.length > 0;

    this.openConfirmation(
      {
        title: isUpdate
          ? 'Update Service Acceptance'
          : 'Save Service Acceptance',
        message: isUpdate
          ? `Update Service Acceptance ${documentNo}?`
          : 'Save this Service Acceptance as Draft?',
        moduleName: 'Service Acceptance',
        documentNo: documentNo || 'NEW',
        status: this.status(),
        effectText: isUpdate
          ? 'The current Draft Service Acceptance will be updated with the latest header and Service PO lines.'
          : 'A new Draft Service Acceptance will be created using the selected supplier and Service PO lines.',
        note: isUpdate
          ? 'Review the changes before continuing.'
          : 'The document will remain in Draft after saving.',
        questionText: isUpdate
          ? 'Proceed with update?'
          : 'Proceed with save?',
        confirmText: isUpdate ? 'Update' : 'Save',
        cancelText: 'Back',
        showForm: false,
        formFields: [],
      },
      () => this.executeSave(userId),
      isUpdate
        ? 'erp-kendo-dialog--save'
        : 'erp-kendo-dialog--save',
    );
  }

  private executeSave(userId: string): void {
    this.facade.save(this.buildRequest(userId)).subscribe({
      next: (result) => {
        this.applyWorkflowResult(result);
        this.form.markAsPristine();
        this.form.markAsUntouched();
        this.gridHasUnsavedChanges.set(false);

        this.notify.success(
          result.message,
          'Service Acceptance Saved',
          result.serviceAcceptanceNo,
          'Service Acceptance',
        );

        void this.router.navigate([
          '/service-acceptance',
          result.serviceAcceptanceNo,
        ]);
      },
      error: (error) =>
        this.notify.error(
          this.facade.errorMessage(error),
          'Service Acceptance Save Failed',
        ),
    });
  }

  accept(): void {
    if (!this.canAccept()) {
      if (this.form.dirty || this.gridHasUnsavedChanges()) {
        this.notify.warning(
          'Save or Update the Service Acceptance before accepting it.',
          'Update Required',
        );
        return;
      }

      this.notify.warning(
        'The Service Acceptance is not ready for acceptance.',
      );
      return;
    }

    const documentNo = this.documentNo().trim();

    this.openConfirmation(
      {
        title: 'Accept Service',
        message: `Accept Service Acceptance ${documentNo}?`,
        moduleName: 'Service Acceptance',
        documentNo,
        status: this.status(),
        effectText:
          'The Service Acceptance will move from Draft to Accepted and will become ready for posting.',
        note:
          'Make sure the supplier, Service PO lines, quantities, rates, and remarks are correct before accepting.',
        questionText: 'Proceed with acceptance?',
        confirmText: 'Accept Service',
        cancelText: 'Back',
        showForm: false,
        formFields: [],
      },
      () => this.runTransition('accept'),
      'erp-kendo-dialog--accept',
    );
  }

  post(): void {
    if (!this.canPost()) {
      this.notify.warning(
        'Only an Accepted Service Acceptance can be posted.',
      );
      return;
    }

    const documentNo = this.documentNo().trim();

    this.openConfirmation(
      {
        title: 'Post Service Acceptance',
        message: `Post Service Acceptance ${documentNo}?`,
        moduleName: 'Service Acceptance',
        documentNo,
        status: this.status(),
        effectText:
          'Posting will finalize this Service Acceptance and enable it for VP processing.',
        note:
          'After posting, the document cannot be edited unless it is successfully reversed.',
        questionText: 'Proceed with posting?',
        confirmText: 'Post Transaction',
        cancelText: 'Back',
        showForm: false,
        formFields: [],
      },
      () => this.runTransition('post'),
      'erp-kendo-dialog--post',
    );
  }

  requestReverse(): void {
    if (!this.canReverse()) {
      this.notify.warning(
        'Only a Posted Service Acceptance can be reversed.',
      );
      return;
    }

    const documentNo = this.documentNo().trim();

    const dialog: DialogRef = this.dialogs.open({
      content: ErpSaveConfirmDialogComponent,
      width: 720,
      minWidth: 420,
      cssClass: ['erp-kendo-dialog', 'erp-kendo-dialog--reverse'],
    });

    const component = dialog.content.instance as ErpSaveConfirmDialogComponent;

    const data: ErpSaveConfirmDialogData = {
      title: 'Reverse Service Acceptance',
      message: `Reverse ${documentNo}? A linked VP will prevent this action.`,
      moduleName: 'Service Acceptance',
      documentNo,
      status: this.status(),
      effectText:
        'The Service Acceptance will return to Draft and can be edited again.',
      note: 'A reversal reason is required.',
      questionText: 'Proceed with reversal?',
      confirmText: 'Reverse',
      cancelText: 'Back',
      showForm: true,
      formFields: [
        {
          name: 'reverseReason',
          label: 'Reversal Reason *',
          type: 'textarea',
          rows: 4,
        },
      ],
    };

    component.data = data;

    dialog.result.pipe(take(1)).subscribe((result) => {
      if (result instanceof DialogCloseResult) {
        return;
      }

      const response = result as {
        action?: string;
        formValue?: Record<string, unknown>;
      };

      if (response.action !== 'confirm') {
        return;
      }

      const reason = String(
        response.formValue?.['reverseReason'] ?? '',
      ).trim();

      if (!reason) {
        this.notify.warning('Reversal reason is required.');
        return;
      }

      this.runTransition('reverse', reason);
    });
  }

  private openConfirmation(
    data: ErpSaveConfirmDialogData,
    onConfirm: () => void,
    cssClass = 'erp-kendo-dialog--confirm',
  ): void {
    const dialog: DialogRef = this.dialogs.open({
      content: ErpSaveConfirmDialogComponent,
      width: 720,
      minWidth: 420,
      cssClass: ['erp-kendo-dialog', cssClass],
    });

    const component =
      dialog.content.instance as ErpSaveConfirmDialogComponent;

    component.data = data;

    dialog.result.pipe(take(1)).subscribe((result) => {
      if (result instanceof DialogCloseResult) {
        return;
      }

      const response = result as {
        action?: string;
      };

      if (response.action !== 'confirm') {
        return;
      }

      onConfirm();
    });
  }

  private runTransition(action: WorkflowAction, reason?: string): void {
    const documentNo = this.documentNo().trim();
    const rowVersion = this.rowVersion()?.trim() || null;
    const userId = this.currentUser();

    if (!documentNo) {
      this.notify.warning('Save the Service Acceptance first.');
      return;
    }

    if (!rowVersion) {
      this.notify.warning(
        'Row version is unavailable. Refresh the Service Acceptance.',
      );
      return;
    }

    if (!userId) {
      this.notify.error(
        'Authenticated user ID is unavailable.',
        'Workflow Failed',
      );
      return;
    }

    this.facade
      .transition(documentNo, action, {
        userId,
        rowVersion,
        reason: reason ?? null,
      })
      .subscribe({
        next: (result) => {
          this.applyWorkflowResult(result);
          this.form.markAsPristine();
          this.form.markAsUntouched();
          this.gridHasUnsavedChanges.set(false);

          const title =
            action === 'accept'
              ? 'Service Accepted'
              : action === 'post'
                ? 'Service Acceptance Posted'
                : 'Service Acceptance Reversed';

          this.notify.success(
            result.message,
            title,
            result.serviceAcceptanceNo,
            'Service Acceptance',
          );

          this.facade.reloadDocument();
          this.facade.reloadOpenPoLines();
        },
        error: (error) =>
          this.notify.error(
            this.facade.errorMessage(error),
            'Workflow Failed',
          ),
      });
  }

  private applyWorkflowResult(result: ServiceAcceptanceCommandResponse): void {
    const documentNo = String(
      result.serviceAcceptanceNo || this.documentNo(),
    ).trim();

    this.documentNo.set(documentNo);
    this.status.set(this.normalizeStatus(result.status));
    this.rowVersion.set(this.normalizeRowVersion(result.rowVersion));

    this.form.controls.serviceAcceptanceNo.setValue(documentNo, {
      emitEvent: false,
    });

    this.facade.loadDocument(documentNo);
    this.facade.setExcludeAcceptanceNo(documentNo);
  }

  private buildRequest(userId: string): ServiceAcceptanceSaveRequest {
    const header = this.form.getRawValue();

    const optional = (
      value: string | null | undefined,
    ): string | null => String(value ?? '').trim() || null;

    return {
      header: {
        serviceAcceptanceNo: this.documentNo().trim() || null,
        acceptanceDate: this.dateOnly(header.acceptanceDate!),
        suppCode: String(header.suppCode ?? '').trim(),
        serviceType: header.serviceType!,
        branchName: String(header.branchName ?? 'MANDAUE').trim(),
        departmentCode: optional(header.departmentCode),
        projectNo: optional(header.projectNo),
        joNo: optional(header.joNo),
        serviceLocation: optional(header.serviceLocation),
        servicePeriodFrom: header.servicePeriodFrom
          ? this.dateOnly(header.servicePeriodFrom)
          : null,
        servicePeriodTo: header.servicePeriodTo
          ? this.dateOnly(header.servicePeriodTo)
          : null,
        requestedBy: optional(header.requestedBy),
        remarks: optional(header.remarks),
        userId,
        rowVersion: this.rowVersion()?.trim() || null,
      },
      details: this.details().map((detail, index) => ({
        ...detail,
        lineSeq: index + 1,
        poNo: String(detail.poNo ?? '').trim(),
        poSeq: Number(detail.poSeq ?? 0),
        poQty: Number(detail.poQty ?? 0),
        remainingQty: Number(detail.remainingQty ?? 0),
        acceptedQty: Number(detail.acceptedQty ?? 0),
        rate: Number(detail.rate ?? 0),
        acceptedAmount: this.amount(detail),
        taxSchemeCode: 'NV',
        remarks: detail.remarks ?? null,
      })),
      checklist: [],
    };
  }

  private validateDetails(): boolean {
    const keys = new Set<string>();

    for (const line of this.details()) {
      const poNo = String(line.poNo ?? '').trim();
      const poSeq = Number(line.poSeq ?? 0);
      const acceptedQty = Number(line.acceptedQty ?? 0);
      const remainingQty = Number(line.remainingQty ?? 0);

      if (!poNo || poSeq <= 0) {
        this.notify.warning(
          `Service line ${line.lineSeq} has no valid PO reference.`,
        );
        return false;
      }

      if (acceptedQty <= 0 || acceptedQty > remainingQty) {
        this.notify.warning(
          `Service line ${line.lineSeq} contains an invalid accepted quantity.`,
        );
        return false;
      }

      const key = `${poNo.toUpperCase()}|${poSeq}`;
      if (keys.has(key)) {
        this.notify.warning(`PO ${poNo} / Line ${poSeq} is duplicated.`);
        return false;
      }

      keys.add(key);
    }

    return true;
  }

  private createDetailGroup(
    detail?: Partial<ServiceAcceptanceDetail>,
  ): FormGroup {
    return this.fb.group({
      poNo: [detail?.poNo ?? '', Validators.required],
      poSeq: [
        detail?.poSeq ?? 0,
        [Validators.required, Validators.min(1)],
      ],
      itemCode: [detail?.itemCode ?? ''],
      serviceDescription: [
        detail?.serviceDescription ?? '',
        Validators.required,
      ],
      unitOfMeasure: [detail?.unitOfMeasure ?? ''],
      poQty: [detail?.poQty ?? 0],
      remainingQty: [
        detail?.remainingQty ?? 0,
        [Validators.required, Validators.min(0.0001)],
      ],
      acceptedQty: [
        detail?.acceptedQty ?? detail?.remainingQty ?? 0,
        [Validators.required, Validators.min(0.0001)],
      ],
      rate: [
        detail?.rate ?? 0,
        [Validators.required, Validators.min(0)],
      ],
      taxSchemeCode: [detail?.taxSchemeCode ?? 'NV'],
      remarks: [detail?.remarks ?? ''],
    });
  }

  private validServicePeriod(): boolean {
    const fromDate = this.form.controls.servicePeriodFrom.value;
    const toDate = this.form.controls.servicePeriodTo.value;

    if (!fromDate && !toDate) {
      return true;
    }

    if (fromDate && !toDate) {
      this.notify.warning(
        'Service Period To is required when Service Period From is provided.',
      );
      return false;
    }

    if (!fromDate && toDate) {
      this.notify.warning(
        'Service Period From is required when Service Period To is provided.',
      );
      return false;
    }

    if (fromDate && toDate && toDate < fromDate) {
      this.notify.warning(
        'Service Period To cannot be earlier than Service Period From.',
      );
      return false;
    }

    return true;
  }

  private nextLineSeq(): number {
    return (
      this.details().reduce(
        (max, line) => Math.max(max, Number(line.lineSeq ?? 0)),
        0,
      ) + 1
    );
  }

  private closeEditor(grid: GridComponent): void {
    const rowIndex = this.editingRowIndex();

    if (rowIndex !== null && rowIndex >= 0) {
      grid.closeRow(rowIndex);
    }

    this.editingRowIndex.set(null);
  }

  private normalizeStatus(
    value: string | null | undefined,
  ): ServiceAcceptanceStatus {
    const normalized = String(value ?? 'DRAFT').trim().toUpperCase();

    switch (normalized) {
      case 'DRAFT':
      case 'SUBMITTED':
      case 'ACCEPTED':
      case 'POSTED':
      case 'REVERSED':
        return normalized as ServiceAcceptanceStatus;
      default:
        return 'DRAFT';
    }
  }

  private normalizeRowVersion(
    value: string | null | undefined,
  ): string | null {
    const clean = String(value ?? '').trim();
    return clean || null;
  }

  private currentUser(): string {
    return String(this.auth.userId() ?? '').trim();
  }

  private asDate(value: string | Date | null | undefined): Date {
    if (value instanceof Date) {
      return value;
    }

    const text = String(value ?? '').trim();
    if (!text) {
      return new Date();
    }

    return new Date(`${text.substring(0, 10)}T00:00:00`);
  }

  private asNullableDate(
    value: string | Date | null | undefined,
  ): Date | null {
    return value ? this.asDate(value) : null;
  }

  private dateOnly(date: Date): string {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-');
  }

  private round4(value: number): number {
    return Math.round((Number(value ?? 0) + Number.EPSILON) * 10000) / 10000;
  }
}
