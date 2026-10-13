import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';

import { ButtonsModule } from '@progress/kendo-angular-buttons';
import { DateInputsModule } from '@progress/kendo-angular-dateinputs';
import {
  DialogCloseResult,
  DialogModule,
  DialogRef,
  DialogService,
} from '@progress/kendo-angular-dialog';
import {
  DropDownFilterSettings,
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
import { LabelModule } from '@progress/kendo-angular-label';
import { ToolBarModule } from '@progress/kendo-angular-toolbar';
import { plusCircleIcon, trashIcon } from '@progress/kendo-svg-icons';

import { AuthFacadeService } from '../../../../core/services/auth-facade.service';
import { ErpNotificationService } from '../../../../shared/notification-card/erp-notification.service';
import {
  ErpSaveConfirmDialogComponent,
  ErpSaveConfirmDialogData,
} from '../../../../shared/save-confirm-dialog/erp-save-confirm-dialog.component';
import { AppToolbarComponent } from '../../../../shared/services/app-toolbar/app-toolbar.component';
import { AppToolbarService } from '../../../../shared/services/app-toolbar/toolbar.service';

import { ReceivingFacade } from '../../data-access/receiving.facade';
import { ReceivingService } from '../../data-access/receiving.service';
import {
  OpenPoLineLookup,
  ReceivingDetailRow,
  ReceivingDetailSave,
  ReceivingItemLookup,
  ReceivingSaveRequest,
  ReceivingStatus,
  ReceivingType,
} from '../../models/receiving.models';

@Component({
  selector: 'app-receiving-entry',
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
    LabelModule,
    AppToolbarComponent,
  ],
  providers: [ReceivingFacade],
  templateUrl: './receiving-entry.component.html',
  styleUrls: ['./receiving-entry.component.scss'],
})
export class ReceivingEntryComponent implements OnDestroy {
  readonly facade = inject(ReceivingFacade);
  readonly toolbarService = inject(AppToolbarService);

  readonly plusCircleIcon = plusCircleIcon;
  readonly trashIcon = trashIcon;

  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ReceivingService);
  private readonly dialogService = inject(DialogService);
  private readonly notify = inject(ErpNotificationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthFacadeService);


  readonly loadingDocument = signal(false);


  readonly selectedOpenPoLine = signal<OpenPoLineLookup | null>(null);

  readonly details = signal<ReceivingDetailRow[]>([]);

  readonly rowVersion = signal<string | null>(null);

  readonly targetStatus = signal<ReceivingStatus>('N');

  readonly transType = signal<ReceivingType>('RPO');

  readonly validationMessage = signal<string | null>(null);

  readonly formValidState = signal(false);

  readonly editedRowIndex = signal<number | null>(null);

  readonly filterSettings: DropDownFilterSettings = {
    caseSensitive: false,
    operator: 'contains',
  };

  readonly poPopupSettings: PopupSettings = {
    width: 1050,
    height: 360,
    popupClass: 'rpo-line-popup',
  };

  readonly itemPopupSettings: PopupSettings = {
    width: 1050,
    height: 350,
    popupClass: 'rwp-item-popup',
  };

  readonly form = this.fb.group({
    rrNo: [''],

    rrDate: [new Date(), Validators.required],

    transType: ['RPO' as ReceivingType, Validators.required],

    branchname: ['MANDAUE', Validators.required],

    whseCode: ['WHSE', Validators.required],

    suppCode: ['', Validators.required],

    reference: [
      '',
      [
        Validators.required,
        Validators.pattern(/\S+/),
      ],
    ],

    remarks: [''],
  });

  readonly manualLineForm = this.fb.group({
    itemCode: [''],
    itemDesc: [''],
    qtyRcv: [1],
    poUm: [''],
    baseUm: [''],
    poConvFactor: [1],
    unitPrice: [0],
  });

  readonly statusText = computed(() => this.getStatusText(this.targetStatus()));

  /*
  |--------------------------------------------------------------------------
  | Editable only when status is Draft
  |--------------------------------------------------------------------------
  |
  | N = Editable
  | U = Read-only
  | C = Read-only
  |
  */

  readonly isReadOnly = computed(
    () => this.targetStatus() !== 'N' || this.form.disabled,
  );

  readonly canPost = computed(
    () =>
      this.targetStatus() === 'N' &&
      this.formValidState() &&
      this.details().length > 0 &&
      !!this.currentUserId() &&
      !this.loadingDocument() &&
      !this.facade.commandBusy(),
  );

  readonly canReverse = computed(
    () =>
      this.targetStatus() === 'U' &&
      !!this.currentRrNo() &&
      !!this.rowVersion() &&
      !!this.currentUserId() &&
      !this.loadingDocument() &&
      !this.facade.commandBusy(),
  );

  readonly totalQty = computed(() =>
    this.details().reduce((total, line) => total + Number(line.qtyRcv || 0), 0),
  );

  readonly totalAmount = computed(() =>
    this.details().reduce((total, line) => total + this.lineAmount(line), 0),
  );

  constructor() {
    this.toolbarService.setConfig({
      showNew: true,
      showSave: true,
      showPost: true,
      showReverse: true,
      showList: true,
    });

    this.formValidState.set(this.form.valid);

    /*
    |--------------------------------------------------------------------------
    | Track form validation
    |--------------------------------------------------------------------------
    */

    this.form.statusChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.formValidState.set(this.form.valid);
      });

    /*
    |--------------------------------------------------------------------------
    | Supplier change
    |--------------------------------------------------------------------------
    */

    this.form.controls.suppCode.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.facade.setOpenPoSupplier(value || null);

        this.selectedOpenPoLine.set(null);
      });

    /*
    |--------------------------------------------------------------------------
    | Receiving type change
    |--------------------------------------------------------------------------
    */

    this.form.controls.transType.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        const selectedType = (value || 'RPO') as ReceivingType;

        this.transType.set(selectedType);
        this.validationMessage.set(null);
        this.selectedOpenPoLine.set(null);

        if (selectedType === 'RWP') {
          this.details.update((rows) =>
            rows.map((row) => ({
              ...row,
              poNo: null,
              poLineNo: null,
              poSeq: null,
              orderedQty: null,
              cumulativeReceivedQty: null,
              openQty: null,
            })),
          );
        }
      });

    /*
    |--------------------------------------------------------------------------
    | Route parameter
    |--------------------------------------------------------------------------
    */

    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((paramMap) => {
        const rrNo = String(paramMap.get('rrNo') || '').trim();

        if (rrNo && rrNo.toLowerCase() !== 'new') {
          this.loadReceiving(rrNo);
          return;
        }

        this.prepareNew();
      });
  }

  ngOnDestroy(): void {
    this.toolbarService.reset();
  }

  /*
  |--------------------------------------------------------------------------
  | Toolbar actions
  |--------------------------------------------------------------------------
  */

  newReceiving(): void {
    this.prepareNew();

    void this.router.navigate(['/receiving/new']);
  }

  goToList(): void {
    void this.router.navigate(['/receiving']);
  }

  reload(): void {
    const rrNo = this.currentRrNo();

    if (rrNo) {
      this.loadReceiving(rrNo);
      return;
    }

    this.prepareNew();
  }

  // print(): void {
  //   const rrNo = this.currentRrNo();

  //   if (!rrNo) {
  //     this.notify.warning(
  //       'Save the receiving document before printing.',
  //       'Print Receiving',
  //     );

  //     return;
  //   }

  //   void this.router.navigate(['/receiving/report', rrNo]);
  // }

  /*
  |--------------------------------------------------------------------------
  | Save Draft
  |--------------------------------------------------------------------------
  */

  saveDraft(): void {
    if (this.isReadOnly()) {
      return;
    }

    this.submit('N');
  }

  /*
  |--------------------------------------------------------------------------
  | Post / Approve
  |--------------------------------------------------------------------------
  */

  approve(): void {
    if (!this.canPost()) {
      return;
    }

    this.submit('U');
  }

  /*
  |--------------------------------------------------------------------------
  | Unpost
  |--------------------------------------------------------------------------
  |
  | U = Approved
  | After successful unpost:
  | U → N
  |
  */

  reverse(): void {
    const rrNo = this.currentRrNo();

    const rowVersion = this.rowVersion();

    const userId = this.currentUserId();

    if (this.targetStatus() !== 'U' || !rrNo || !rowVersion) {
      this.notify.warning(
        'Only an approved receiving transaction can be unposted.',
        'Unable to Unpost',
        rrNo,
        'Receiving Entry',
      );

      return;
    }

    if (!userId) {
      this.notify.error(
        'Unable to identify the logged-in user.',
        'User Required',
        rrNo,
        'Receiving Entry',
      );

      return;
    }

    this.openConfirmDialog(
      {
        title: 'Unpost Receiving',

        message: `Unpost RR No. ${rrNo}?`,

        moduleName: 'Receiving Entry',

        documentNo: rrNo,

        status: this.statusText(),

        effectText:
          'Unposting restores the related PO received quantity and returns this receiving document to Draft status.',

        note: 'The document becomes editable again after unposting. A reason of at least 5 characters is required.',

        questionText: 'Do you want to unpost this receiving document?',

        confirmText: 'Unpost RR',

        cancelText: 'Back',

        showGrid: true,

        gridHeight: 140,

        gridData: [this.confirmGridRow()],

        gridColumns: this.confirmGridColumns(),

        showForm: true,

        formFields: [
          {
            name: 'reason',
            label: 'Unpost Reason',
            type: 'textarea',
            rows: 3,
            placeholder: 'Enter unpost reason',
          },
        ],
      },

      (formValue) => {
        const reason = String(formValue?.['reason'] || '').trim();

        if (reason.length < 5) {
          this.notify.warning(
            'Please enter an unpost reason with at least 5 characters.',
            'Reason Required',
            rrNo,
            'Receiving Entry',
          );

          return;
        }

        this.facade
          .reverse(rrNo, {
            rowVersion,
            reason,
            userId,
          })
          .subscribe({
            next: (result) => {
              // Unpost flow: U → N
              this.targetStatus.set('N');

              // Save the latest row version returned by SQL
              this.rowVersion.set(result.rowVersion);



              // Make the document editable immediately
              this.form.enable({
                emitEvent: false,
              });


              this.validationMessage.set(null);

              this.notify.success(
                result.message ||
                'Receiving unposted successfully and returned to Draft.',
                'Receiving Unposted',
                rrNo,
                'Receiving Entry',
              );

              // Reload the same RR without going back to the list
              this.loadReceiving(rrNo);
            },

            error: (error) => {
              this.notify.error(
                this.facade.getErrorMessage(error),
                'Unpost Failed',
                rrNo,
                'Receiving Entry',
              );
            },
          });
      },
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Open PO line
  |--------------------------------------------------------------------------
  */

  onOpenPoSelection(line: OpenPoLineLookup | null): void {
    this.selectedOpenPoLine.set(line ?? null);
  }

  addSelectedPoLine(): void {
    const selected = this.selectedOpenPoLine();

    if (!selected || this.isReadOnly()) {
      return;
    }

    const duplicate = this.details().some(
      (row) =>
        row.poNo === selected.poNo &&
        Number(row.poLineNo ?? 0) === Number(selected.poLineNo ?? 0) &&
        Number(row.poSeq ?? 0) === Number(selected.poSeq ?? 0),
    );

    if (duplicate) {
      this.notify.warning(
        'This PO line is already in the receiving grid.',
        'Duplicate PO Line',
        selected.poNo,
        'Receiving Entry',
      );

      return;
    }

    this.details.update((rows) => [
      ...rows,
      {
        rrSeq: this.nextLineNo(rows),

        poNo: selected.poNo,

        poLineNo: selected.poLineNo,

        poSeq: selected.poSeq,

        itemCode: selected.itemCode,

        itemDesc: selected.itemDesc,

        qtyRcv: Number(selected.openQty || 0),

        poUm: selected.poUm,

        baseUm: selected.baseUm,

        poConvFactor: Number(selected.poConvFactor || 1),

        unitPrice: Number(selected.unitPrice || 0),

        orderedQty: Number(selected.qtyPo || 0),

        cumulativeReceivedQty: Number(selected.qtyRcv || 0),

        openQty: Number(selected.openQty || 0),
      },
    ]);

    this.selectedOpenPoLine.set(null);
  }

  /*
  |--------------------------------------------------------------------------
  | Manual RWP line
  |--------------------------------------------------------------------------
  */

  addManualLine(): void {
    if (this.isReadOnly() || this.transType() !== 'RWP') {
      return;
    }

    const raw = this.manualLineForm.getRawValue();

    const itemCode = String(raw.itemCode || '').trim();

    const itemDesc = String(raw.itemDesc || '').trim();

    const qtyRcv = Number(raw.qtyRcv || 0);

    const poUm = String(raw.poUm || '').trim();

    const baseUm = String(raw.baseUm || raw.poUm || '').trim();

    const poConvFactor = Number(raw.poConvFactor || 0);

    const unitPrice = Number(raw.unitPrice || 0);

    if (
      !itemCode ||
      !itemDesc ||
      !baseUm ||
      qtyRcv <= 0 ||
      poConvFactor <= 0 ||
      unitPrice < 0
    ) {
      this.notify.warning(
        'Manual receiving lines require item, description, quantity, U/M, conversion, and valid price.',
        'Incomplete Line',
      );

      return;
    }

    this.details.update((rows) => [
      ...rows,
      {
        rrSeq: this.nextLineNo(rows),

        poNo: null,
        poLineNo: null,
        poSeq: null,

        itemCode,
        itemDesc,
        qtyRcv,
        poUm,
        baseUm,
        poConvFactor,
        unitPrice,

        orderedQty: null,
        cumulativeReceivedQty: null,
        openQty: null,
      },
    ]);

    this.manualLineForm.reset({
      itemCode: '',
      itemDesc: '',
      qtyRcv: 1,
      poUm: '',
      baseUm: '',
      poConvFactor: 1,
      unitPrice: 0,
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Kendo Grid event handlers
  |--------------------------------------------------------------------------
  */

  addHandler(args: AddEvent): void {
    try {
      if (this.isReadOnly()) {
        this.notify.warning(
          'This receiving document is read-only.',
          'Add Receiving Line',
        );

        return;
      }

      if (
        this.transType() === 'RPO' &&
        !String(this.form.controls.suppCode.value || '').trim()
      ) {
        this.form.controls.suppCode.markAsTouched();

        this.notify.warning(
          'Select a supplier before adding an approved PO line.',
          'Supplier Required',
        );

        return;
      }

      this.closeGridEditor(args.sender);

      args.sender.addRow(
        this.createDetailGroup({
          rrSeq: this.nextLineNo(this.details()),
          poNo: null,
          poLineNo: null,
          poSeq: null,
          itemCode: '',
          itemDesc: '',
          qtyRcv: 1,
          poUm: '',
          baseUm: '',
          poConvFactor: 1,
          unitPrice: 0,
          orderedQty: null,
          cumulativeReceivedQty: null,
          openQty: null,
        }),
      );
    } catch (error: unknown) {
      this.handleGridError(error, 'Add Receiving Line Failed');
    }
  }

  editHandler(args: EditEvent): void {
    try {
      if (this.isReadOnly()) {
        this.notify.warning(
          'This receiving document is read-only.',
          'Edit Receiving Line',
        );

        return;
      }

      this.closeGridEditor(args.sender);

      this.editedRowIndex.set(args.rowIndex);

      args.sender.editRow(args.rowIndex, this.createDetailGroup(args.dataItem));
    } catch (error: unknown) {
      this.handleGridError(error, 'Edit Receiving Line Failed');
    }
  }

  cancelHandler(args: CancelEvent): void {
    try {
      args.sender.closeRow(args.rowIndex);
      this.editedRowIndex.set(null);
    } catch (error: unknown) {
      this.handleGridError(error, 'Cancel Line Editing Failed');
    }
  }

  saveHandler(args: SaveEvent): void {
    try {
      const { formGroup, isNew, rowIndex, dataItem, sender } = args;

      if (this.isReadOnly()) {
        this.notify.warning(
          'This receiving document is read-only.',
          'Save Receiving Line',
        );

        return;
      }

      formGroup.markAllAsTouched();
      formGroup.updateValueAndValidity({
        emitEvent: false,
      });

      if (formGroup.invalid) {
        this.notify.warning(
          this.transType() === 'RPO'
            ? 'Select a valid open PO line and enter a received quantity greater than zero.'
            : 'Complete item, description, quantity, U/M, conversion, and unit price.',
          'Invalid Receiving Line',
        );

        return;
      }

      const row = this.normalizeGridDetail(
        {
          ...formGroup.getRawValue(),
          rrSeq: isNew
            ? this.nextLineNo(this.details())
            : Number(dataItem?.rrSeq || rowIndex + 1),
        },
        rowIndex,
      );

      if (this.transType() === 'RPO') {
        const duplicate = this.details().some(
          (existing, index) =>
            index !== rowIndex &&
            String(existing.poNo || '') === String(row.poNo || '') &&
            Number(existing.poLineNo || 0) === Number(row.poLineNo || 0),
        );

        if (duplicate) {
          this.notify.warning(
            'This PO line is already included in the receiving grid.',
            'Duplicate PO Line',
          );

          return;
        }

        if (
          row.openQty !== null &&
          row.openQty !== undefined &&
          Number(row.qtyRcv) > Number(row.openQty)
        ) {
          this.notify.warning(
            `Received quantity cannot exceed the open quantity of ${Number(
              row.openQty,
            ).toFixed(2)}.`,
            'Open Quantity Exceeded',
          );

          return;
        }
      }

      this.details.update((rows) => {
        if (isNew) {
          return [...rows, row];
        }

        return rows.map((existing, index) =>
          index === rowIndex ? row : existing,
        );
      });

      sender.closeRow(rowIndex);
      this.editedRowIndex.set(null);
      this.validationMessage.set(null);
    } catch (error: unknown) {
      this.handleGridError(error, 'Save Receiving Line Failed');
    }
  }

  removeHandler(args: RemoveEvent): void {
    try {
      if (this.isReadOnly()) {
        this.notify.warning(
          'This receiving document is read-only.',
          'Remove Receiving Line',
        );

        return;
      }

      const row = args.dataItem as ReceivingDetailRow | undefined;

      if (!row) {
        this.notify.warning(
          'The selected receiving line no longer exists.',
          'Remove Receiving Line',
        );

        return;
      }

      this.openConfirmDialog(
        {
          title: 'Remove Receiving Line',

          message: `Remove ${row.itemCode || 'this item'} from the receiving grid?`,

          moduleName: 'Receiving Entry',

          documentNo: this.currentRrNo() || 'NEW',

          status: this.statusText(),

          effectText:
            'Removing the line updates only the current receiving detail grid until the document is saved.',

          note: 'Review the remaining receiving quantities before saving.',

          questionText: 'Do you want to remove this receiving line?',

          confirmText: 'Remove Line',

          cancelText: 'Back',

          showGrid: false,
        },

        () => {
          this.details.update((rows) =>
            rows
              .filter((_, index) => index !== args.rowIndex)
              .map((existing, index) => ({
                ...existing,
                rrSeq: index + 1,
                lineNo: index + 1,
              })),
          );

          args.sender.closeRow(args.rowIndex);
          this.editedRowIndex.set(null);
          this.validationMessage.set(null);
        },
      );
    } catch (error: unknown) {
      this.handleGridError(error, 'Remove Receiving Line Failed');
    }
  }

  onGridItemSelected(
    formGroup: FormGroup,
    selected: ReceivingItemLookup | null | undefined,
  ): void {
    try {
      if (!selected) {
        formGroup.patchValue(
          {
            itemCode: '',
            itemDesc: '',
            poUm: '',
            baseUm: '',
            poConvFactor: 1,
            unitPrice: 0,
          },
          {
            emitEvent: false,
          },
        );

        return;
      }

      const baseUm = String(selected.baseUm || '').trim();

      const poUm =
        String(selected.poUm || '').trim() ||
        baseUm;

      const convFactor =
        Number(selected.poConvFactor || 0) > 0
          ? Number(selected.poConvFactor)
          : 1;

      formGroup.patchValue(
        {
          itemCode: String(selected.itemCode || '').trim(),

          itemDesc: String(selected.itemDesc || '').trim(),

          poUm,

          baseUm,

          poConvFactor: convFactor,

          unitPrice: Number(selected.unitPrice || 0),
        },
        {
          emitEvent: false,
        },
      );

      formGroup.get('itemCode')?.setErrors(null);
      formGroup.get('itemCode')?.markAsDirty();

      formGroup.updateValueAndValidity({
        emitEvent: false,
      });
    } catch (error: unknown) {
      this.handleGridError(
        error,
        'Item Selection Failed',
      );
    }
  }

  onGridItemFilterChange(search: string): void {
    try {
      this.facade.setItemSearch(
        String(search || '').trim(),
      );
    } catch (error: unknown) {
      this.handleGridError(
        error,
        'Item Search Failed',
      );
    }
  }

  onGridPoLineSelected(
    formGroup: FormGroup,
    selected: OpenPoLineLookup | null | undefined,
  ): void {
    try {
      if (!selected) {
        formGroup.patchValue(
          {
            poNo: null,
            poLineNo: null,
            poSeq: null,
            itemCode: '',
            itemDesc: '',
            qtyRcv: 0,
            poUm: '',
            baseUm: '',
            poConvFactor: 1,
            unitPrice: 0,
            orderedQty: null,
            cumulativeReceivedQty: null,
            openQty: null,
          },
          {
            emitEvent: false,
          },
        );

        return;
      }

      formGroup.patchValue(
        {
          poNo: selected.poNo,
          poLineNo: selected.poLineNo,
          poSeq: selected.poSeq,
          itemCode: selected.itemCode,
          itemDesc: selected.itemDesc,
          qtyRcv: Number(selected.openQty || 0),
          poUm: selected.poUm,
          baseUm:
            String(selected.baseUm || '').trim() ||
            String(selected.poUm || '').trim(),
          poConvFactor: Number(selected.poConvFactor || 1),
          unitPrice: Number(selected.unitPrice || 0),
          orderedQty: Number(selected.qtyPo || 0),
          cumulativeReceivedQty: Number(selected.qtyRcv || 0),
          openQty: Number(selected.openQty || 0),
        },
        {
          emitEvent: false,
        },
      );

      // formGroup.get('poLineNo')?.setErrors(null);
      // formGroup.get('poLineNo')?.markAsDirty();

      formGroup.get('poNo')?.setErrors(null);
      formGroup.get('poLineNo')?.setErrors(null);
      formGroup.get('itemCode')?.setErrors(null);
      formGroup.get('itemDesc')?.setErrors(null);
      formGroup.get('baseUm')?.setErrors(null);

      formGroup.markAsDirty();

      formGroup.updateValueAndValidity({
        emitEvent: true,
      });

    } catch (error: unknown) {
      this.handleGridError(error, 'PO Line Selection Failed');
    }
  }

  onGridPoFilterChange(search: string): void {
    try {
      this.facade.setOpenPoSearch(String(search || '').trim());
    } catch (error: unknown) {
      this.handleGridError(error, 'PO Line Search Failed');
    }
  }

  lineAmountFromForm(formGroup: FormGroup): number {
    const raw = formGroup.getRawValue();

    return Number(raw.qtyRcv || 0) * Number(raw.unitPrice || 0);
  }

  private createDetailGroup(line?: Partial<ReceivingDetailRow>): FormGroup {
    const isRpo = this.transType() === 'RPO';

    return this.fb.group({
      rrSeq: [Number(line?.rrSeq || 0)],
      poNo: [line?.poNo ?? null, isRpo ? Validators.required : []],
      poLineNo: [line?.poLineNo ?? null, isRpo ? Validators.required : []],
      poSeq: [line?.poSeq ?? null],
      itemCode: [String(line?.itemCode || ''), Validators.required],
      itemDesc: [String(line?.itemDesc || ''), Validators.required],
      qtyRcv: [
        Number(line?.qtyRcv || 0),
        [Validators.required, Validators.min(0.01)],
      ],
      poUm: [String(line?.poUm || '')],
      baseUm: [String(line?.baseUm || ''), Validators.required],
      poConvFactor: [
        {
          value: Number(line?.poConvFactor || 1),
          disabled: isRpo,
        },
        [Validators.required, Validators.min(0.0001)],
      ],
      unitPrice: [
        {
          value: Number(line?.unitPrice || 0),
          disabled: isRpo,
        },
        [Validators.required, Validators.min(0)],
      ],
      orderedQty: [line?.orderedQty ?? null],
      cumulativeReceivedQty: [line?.cumulativeReceivedQty ?? null],
      openQty: [line?.openQty ?? null],
    });
  }

  private normalizeGridDetail(
    line: Partial<ReceivingDetailRow>,
    index = 0,
  ): ReceivingDetailRow {
    return {
      ...line,

      rrSeq: Number(line.rrSeq || index + 1),

      lineNo: Number(line.rrSeq || index + 1),

      poNo:
        this.transType() === 'RPO'
          ? String(line.poNo || '').trim() || null
          : null,

      poLineNo: this.transType() === 'RPO' ? (line.poLineNo ?? null) : null,

      poSeq: this.transType() === 'RPO' ? (line.poSeq ?? null) : null,

      itemCode: String(line.itemCode || '').trim(),

      itemDesc: String(line.itemDesc || '').trim(),

      qtyRcv: Number(line.qtyRcv || 0),

      poUm: String(line.poUm || '').trim(),

      baseUm: String(line.baseUm || line.poUm || '').trim(),

      poConvFactor: Number(line.poConvFactor || 1),

      unitPrice: Number(line.unitPrice || 0),

      orderedQty:
        line.orderedQty === null || line.orderedQty === undefined
          ? null
          : Number(line.orderedQty),

      cumulativeReceivedQty:
        line.cumulativeReceivedQty === null ||
          line.cumulativeReceivedQty === undefined
          ? null
          : Number(line.cumulativeReceivedQty),

      openQty:
        line.openQty === null || line.openQty === undefined
          ? null
          : Number(line.openQty),
    } as ReceivingDetailRow;
  }

  private closeGridEditor(grid: GridComponent): void {
    const rowIndex = this.editedRowIndex();

    if (rowIndex !== null) {
      grid.closeRow(rowIndex);
      this.editedRowIndex.set(null);
    }
  }

  private handleGridError(error: unknown, title: string): void {
    const message =
      error instanceof Error && error.message
        ? error.message
        : 'An unexpected error occurred. Please try again.';

    this.notify.error(message, title, this.currentRrNo(), 'Receiving Entry');
  }

  /*
  |--------------------------------------------------------------------------
  | Detail editing
  |--------------------------------------------------------------------------
  */

  updateRowNumber(
    index: number,
    field: 'qtyRcv' | 'poConvFactor' | 'unitPrice',
    value: number | null,
  ): void {
    this.details.update((rows) =>
      rows.map((row, rowIndex) =>
        rowIndex === index
          ? {
            ...row,
            [field]: Number(value ?? 0),
          }
          : row,
      ),
    );
  }

  updateRowText(
    index: number,
    field: 'itemCode' | 'itemDesc' | 'poUm' | 'baseUm',
    value: string,
  ): void {
    this.details.update((rows) =>
      rows.map((row, rowIndex) =>
        rowIndex === index
          ? {
            ...row,
            [field]: String(value ?? '').trim(),
          }
          : row,
      ),
    );
  }

  removeRow(index: number): void {
    if (this.isReadOnly()) {
      return;
    }

    this.details.update((rows) =>
      rows
        .filter((_, rowIndex) => rowIndex !== index)
        .map((row, rowIndex) => ({
          ...row,
          lineNo: rowIndex + 1,
        })),
    );
  }

  lineAmount(row: ReceivingDetailRow): number {
    return Number(row.qtyRcv || 0) * Number(row.unitPrice || 0);
  }

  statusClass(status: ReceivingStatus): string {
    return `status-${status}`;
  }

  /*
  |--------------------------------------------------------------------------
  | Save / Post validation
  |--------------------------------------------------------------------------
  */

  private submit(status: 'N' | 'U'): void {
    this.validationMessage.set(null);
    this.form.markAllAsTouched();

    const userId = this.currentUserId();

    if (!userId) {
      this.notify.error(
        'Unable to identify the logged-in user.',
        'User Required',
        this.currentRrNo(),
        'Receiving Entry',
      );

      return;
    }

    if (this.form.invalid) {
      this.notify.warning(
        'Please complete the required receiving header fields.',
        'Missing Header',
      );

      return;
    }

    if (!this.validateDetails()) {
      this.notify.warning(
        this.validationMessage() || 'Please complete receiving details.',
        'Invalid Details',
      );

      return;
    }

    const rrNo = this.currentRrNo() || 'NEW';

    this.openConfirmDialog(
      {
        title: status === 'U' ? 'Post Receiving' : 'Save Receiving Draft',

        message:
          status === 'U'
            ? `Post RR No. ${rrNo}?`
            : `Save RR No. ${rrNo} as Draft?`,

        moduleName: 'Receiving Entry',

        documentNo: rrNo,

        status: status === 'U' ? 'APPROVED / POST' : 'DRAFT',

        effectText:
          status === 'U'
            ? 'Posting approves the receiving document and updates the related PO received quantity.'
            : 'Saving stores the receiving document as Draft without updating the PO received quantity.',

        note: 'The database will validate the PO open quantity and current rowversion before saving.',

        questionText: 'Do you want to proceed?',

        confirmText: status === 'U' ? 'Post RR' : 'Save Draft',

        cancelText: 'Back',

        showGrid: true,

        gridHeight: 140,

        gridData: [this.confirmGridRow()],

        gridColumns: this.confirmGridColumns(),
      },

      () => {
        this.submitConfirmed(status);
      },
    );
  }
  /*  */
  private submitConfirmed(status: 'N' | 'U'): void {
    if (this.facade.commandBusy()) {
      return;
    }

    if (status === 'N' && this.isReadOnly()) {
      return;
    }

    if (status === 'U' && !this.canPost()) {
      return;
    }

    const request = this.buildSaveRequest(status);

    this.facade.upsert(request).subscribe({
      next: (result) => {
        const savedRrNo =
          String(result?.rrNo || '').trim() ||
          this.currentRrNo();

        if (!savedRrNo) {
          this.notify.error(
            'Receiving was saved but RR number was not returned by the API.',
            'Receiving Response Error',
            '',
            'Receiving Entry',
          );

          return;
        }

        /*
        |--------------------------------------------------------------------------
        | Update RR number immediately
        |--------------------------------------------------------------------------
        */
        this.form.patchValue(
          {
            rrNo: savedRrNo,
          },
          {
            emitEvent: false,
          },
        );

        /*
        |--------------------------------------------------------------------------
        | IMPORTANT:
        | N = Draft
        | U = Posted / Approved
        |--------------------------------------------------------------------------
        */
        const newStatus =
          result?.status === 'U' || result?.status === 'N' || result?.status === 'C'
            ? result.status
            : status;

        this.targetStatus.set(newStatus);

        /*
        |--------------------------------------------------------------------------
        | Keep latest RowVersion returned by API
        |--------------------------------------------------------------------------
        */
        this.rowVersion.set(result.rowVersion);


        /*
        |--------------------------------------------------------------------------
        | Update form mode immediately
        |--------------------------------------------------------------------------
        */
        if (newStatus === 'N') {
          this.form.enable({
            emitEvent: false,
          });
        } else {
          this.form.disable({
            emitEvent: false,
          });
        }

        /*
        |--------------------------------------------------------------------------
        | Refresh validation / toolbar state
        |--------------------------------------------------------------------------
        */
        this.formValidState.set(this.form.valid);


        /*
        |--------------------------------------------------------------------------
        | Notification
        |--------------------------------------------------------------------------
        */
        this.notify.success(
          result.message || 'Receiving saved successfully.',
          status === 'U' ? 'Receiving Posted' : 'Receiving Saved',
          savedRrNo,
          'Receiving Entry',
        );

        /*
        |--------------------------------------------------------------------------
        | Update URL only when needed
        |--------------------------------------------------------------------------
        */
        const routeRrNo = String(
          this.route.snapshot.paramMap.get('rrNo') || '',
        ).trim();

        if (routeRrNo !== savedRrNo) {
          void this.router.navigate(['/receiving', savedRrNo], {
            replaceUrl: true,
          });
        }

        /*
        |--------------------------------------------------------------------------
        | IMPORTANT:
        | DO NOT call loadReceiving(savedRrNo) here after POST.
        |
        | The POST response already tells the UI that status = U.
        | Reloading immediately can overwrite the current state with an older
        | GET response and make the toolbar look Draft again.
        |--------------------------------------------------------------------------
        */

        if (status === 'U') {
          this.loadReceiving(savedRrNo);
        }
      },

      error: (error) => {
        this.notify.error(
          this.facade.getErrorMessage(error),
          status === 'U' ? 'Posting Failed' : 'Receiving Failed',
          this.currentRrNo(),
          'Receiving Entry',
        );
      },
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Load receiving
  |--------------------------------------------------------------------------
  */

  private loadReceiving(rrNo: string): void {
    this.loadingDocument.set(true);

    this.api
      .getByNo(rrNo)
      .pipe(
        finalize(() => {
          this.loadingDocument.set(false);
        }),
      )
      .subscribe({
        next: (response) => {
          if (!response.header) {
            this.notify.warning(
              'Receiving document was not found.',
              'Not Found',
              rrNo,
              'Receiving Entry',
            );

            // this.prepareNew();
            return;
          }

          const header = response.header;

          this.targetStatus.set(header.status);

          this.rowVersion.set(header.rowVersion);

          this.transType.set(header.transType);

          this.form.enable({
            emitEvent: false,
          });

          this.form.patchValue(
            {
              rrNo: header.rrNo || rrNo,

              rrDate: header.rrDate ? new Date(header.rrDate) : new Date(),

              transType: header.transType,

              branchname: header.branchname || 'MANDAUE',

              whseCode: header.whseCode || 'WHSE',

              suppCode: header.suppCode || '',

              reference: header.reference || '',

              remarks: header.remarks || '',
            },
            {
              emitEvent: false,
            },
          );

          this.facade.setOpenPoSupplier(header.suppCode || null);

          this.details.set(
            (response.details ?? []).map((row, index) => ({
              ...row,

              lineNo: Number(row.rrSeq || index + 1),

              qtyRcv: Number(row.qtyRcv || 0),

              poConvFactor: Number(row.poConvFactor || 1),

              unitPrice: Number(row.unitPrice || 0),
            })),
          );

          /*
          |--------------------------------------------------------------------------
          | N = Editable
          | U = Read-only
          | C = Read-only
          |--------------------------------------------------------------------------
          */

          if (header.status === 'U' || header.status === 'C') {
            this.form.disable({
              emitEvent: false,
            });
          } else {
            this.form.enable({
              emitEvent: false,
            });
          }

          this.formValidState.set(this.form.valid);
        },

        error: (error) => {
          this.notify.error(
            this.facade.getErrorMessage(error),
            'Load Failed',
            rrNo,
            'Receiving Entry',
          );

          // this.prepareNew();
        },
      });
  }

  /*
  |--------------------------------------------------------------------------
  | Prepare new
  |--------------------------------------------------------------------------
  */

  private prepareNew(): void {
    this.targetStatus.set('N');

    this.transType.set('RPO');
    this.rowVersion.set(null);
    this.details.set([]);
    this.selectedOpenPoLine.set(null);
    this.validationMessage.set(null);
    this.editedRowIndex.set(null);

    this.form.enable({
      emitEvent: false,
    });

    this.form.reset(
      {
        rrNo: '',
        rrDate: new Date(),
        transType: 'RPO',
        branchname: 'MANDAUE',
        whseCode: 'WHSE',
        suppCode: '',
        reference: '',
        remarks: '',
      },
      {
        emitEvent: false,
      },
    );

    this.manualLineForm.reset({
      itemCode: '',
      itemDesc: '',
      qtyRcv: 1,
      poUm: '',
      baseUm: '',
      poConvFactor: 1,
      unitPrice: 0,
    });

    this.facade.setOpenPoSupplier(null);

    this.formValidState.set(this.form.valid);
  }

  /*
  |--------------------------------------------------------------------------
  | Detail validation
  |--------------------------------------------------------------------------
  */

  private validateDetails(): boolean {
    const type = this.transType();

    const details = this.details();

    if (details.length === 0) {
      this.validationMessage.set('Please add at least one receiving line.');

      return false;
    }

    const invalid = details.find(
      (line) =>
        !String(line.itemCode || '').trim() ||
        !String(line.itemDesc || '').trim() ||
        !String(line.baseUm || '').trim() ||
        Number(line.qtyRcv) <= 0 ||
        Number(line.poConvFactor) <= 0 ||
        Number(line.unitPrice) < 0 ||
        (type === 'RPO' && (!line.poNo || (!line.poLineNo && !line.poSeq))) ||
        (type === 'RWP' && !!line.poNo),
    );

    if (invalid) {
      this.validationMessage.set(
        type === 'RPO'
          ? 'RPO lines require a PO line, item, description, U/M, and positive received quantity.'
          : 'RWP lines require item, description, U/M, and must not contain a PO reference.',
      );

      return false;
    }

    const overOpen = details.find(
      (line) =>
        type === 'RPO' &&
        line.openQty !== null &&
        line.openQty !== undefined &&
        Number(line.qtyRcv) > Number(line.openQty),
    );

    if (overOpen) {
      this.validationMessage.set(
        'Received quantity cannot exceed the displayed open PO quantity.',
      );

      return false;
    }

    return true;
  }

  /*
  |--------------------------------------------------------------------------
  | Build request
  |--------------------------------------------------------------------------
  */

  private buildSaveRequest(status: 'N' | 'U'): ReceivingSaveRequest {
    const raw = this.form.getRawValue();

    return {
      rrNo: this.emptyToNull(raw.rrNo),

      rowVersion: this.rowVersion(),

      rrDate: this.toSqlDate(raw.rrDate) || this.toSqlDate(new Date())!,

      transType: (raw.transType || 'RPO') as ReceivingType,

      targetStatus: status,

      branchname: raw.branchname || 'MANDAUE',

      whseCode: raw.whseCode || 'WHSE',

      suppCode: raw.suppCode || '',

      reference: this.emptyToNull(raw.reference),

      remarks: this.emptyToNull(raw.remarks),

      userId: this.currentUserId(),

      details: this.details().map(
        (row, index): ReceivingDetailSave => ({
          rrSeq: Number(row.rrSeq || index + 1),

          poNo: this.emptyToNull(row.poNo),

          poLineNo: row.poLineNo ?? null,

          //poSeq: row.poSeq ?? null,

          itemCode: String(row.itemCode || '').trim(),

          itemDesc: this.emptyToNull(row.itemDesc),

          qtyRcv: Number(row.qtyRcv || 0),

          poUm: this.emptyToNull(row.poUm),

          baseUm: this.emptyToNull(row.baseUm),

          poConvFactor: Number(row.poConvFactor || 1),

          unitPrice: Number(row.unitPrice || 0),
        }),
      ),
    };
  }

  /*
  |--------------------------------------------------------------------------
  | Confirmation dialog
  |--------------------------------------------------------------------------
  */

  private openConfirmDialog(
    data: ErpSaveConfirmDialogData,

    onConfirm: (formValue?: Record<string, string>) => void,
  ): void {
    const dialog: DialogRef = this.dialogService.open({
      content: ErpSaveConfirmDialogComponent,

      width: 680,

      minWidth: 360,

      cssClass: 'erp-confirm-dialog-host',
    });

    const component = dialog.content.instance as ErpSaveConfirmDialogComponent;

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
          onConfirm(response.formValue);
        }
      });
  }

  private confirmGridRow(): Record<string, unknown> {
    const raw = this.form.getRawValue();

    return {
      rrNo: this.currentRrNo() || 'NEW',

      statusName: this.statusText(),

      transType: raw.transType,

      branchname: raw.branchname,

      supplier: raw.suppCode || '-',

      lines: this.details().length,

      totalAmount: this.totalAmount(),
    };
  }

  private confirmGridColumns() {
    return [
      {
        field: 'rrNo',
        title: 'RR No.',
        width: 110,
      },
      {
        field: 'statusName',
        title: 'Status',
        width: 115,
      },
      {
        field: 'transType',
        title: 'Type',
        width: 80,
      },
      {
        field: 'branchname',
        title: 'Branch',
        width: 110,
      },
      {
        field: 'supplier',
        title: 'Supplier',
        width: 170,
      },
      {
        field: 'lines',
        title: 'Lines',
        width: 80,
      },
      {
        field: 'totalAmount',
        title: 'Amount',
        width: 110,
      },
    ];
  }

  /*
  |--------------------------------------------------------------------------
  | Helpers
  |--------------------------------------------------------------------------
  */

  private nextLineNo(rows: ReceivingDetailRow[]): number {
    if (rows.length === 0) {
      return 1;
    }

    return Math.max(...rows.map((row) => Number(row.rrSeq || 0))) + 1;
  }

  // private currentRrNo(): string {
  //   return String(this.form.getRawValue().rrNo || '').trim();
  // }

  private currentRrNo(): string {
    const formRrNo = String(this.form.getRawValue().rrNo || '').trim();

    if (formRrNo) {
      return formRrNo;
    }

    const routeRrNo = String(
      this.route.snapshot.paramMap.get('rrNo') || '',
    ).trim();

    return routeRrNo.toLowerCase() === 'new'
      ? ''
      : routeRrNo;
  }

  private currentUserId(): string {
    return String(this.auth.user()?.userId ?? '').trim();
  }

  private emptyToNull(value: unknown): string | null {
    const text = String(value ?? '').trim();

    return text ? text : null;
  }

  private toSqlDate(value: Date | string | null | undefined): string | null {
    if (!value) {
      return null;
    }

    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    const year = date.getFullYear();

    const month = `${date.getMonth() + 1}`.padStart(2, '0');

    const day = `${date.getDate()}`.padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  /*
  |--------------------------------------------------------------------------
  | Status labels
  |--------------------------------------------------------------------------
  */

  private getStatusText(status: ReceivingStatus): string {
    switch (status) {
      case 'N':
        return 'Draft';

      case 'U':
        return 'Approved';

      case 'C':
        return 'Cancelled';

      default:
        return status;
    }
  }
}
