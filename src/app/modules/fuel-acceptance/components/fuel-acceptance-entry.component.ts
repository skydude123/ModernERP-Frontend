import { CommonModule } from '@angular/common';

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';

import {
  takeUntilDestroyed,
} from '@angular/core/rxjs-interop';

import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import {
  ActivatedRoute,
  Router,
} from '@angular/router';

import {
  ButtonsModule,
} from '@progress/kendo-angular-buttons';

import {
  DateInputsModule,
} from '@progress/kendo-angular-dateinputs';

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

import {
  InputsModule,
} from '@progress/kendo-angular-inputs';

import {
  LabelModule,
} from '@progress/kendo-angular-label';

import {
  ToolBarModule,
} from '@progress/kendo-angular-toolbar';

import {
  take,
} from 'rxjs';

import {
  AuthFacadeService,
} from '../../../core/services/auth-facade.service';

import {
  ErpSaveConfirmDialogComponent,
  ErpSaveConfirmDialogData,
} from '../../../shared/save-confirm-dialog/erp-save-confirm-dialog.component';

import {
  ErpNotificationService,
} from '../../../shared/notification-card/erp-notification.service';

import {
  AppToolbarComponent,
} from '../../../shared/services/app-toolbar/app-toolbar.component';

import {
  AppToolbarService,
} from '../../../shared/services/app-toolbar/toolbar.service';

import {
  FuelAcceptanceFacade,
} from '../data-access/fuel-acceptance.facade';

import {
  FuelAcceptanceCommandResponse,
  FuelAcceptanceDetail,
  FuelAcceptanceSaveRequest,
  FuelAcceptanceStatus,
  FuelBranchLookup,
  FuelPoLineLookup,
  FuelSupplierLookup,
} from '../models/fuel-acceptance.models';


interface PreviewTotals {
  liters: number;
  gross: number;
  basic: number;
  inputVat: number;
  ewt: number;
  net: number;
  noReceipt: number;
}


@Component({
  selector: 'app-fuel-acceptance-entry',

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
    LabelModule,
    ToolBarModule,
    AppToolbarComponent,
  ],

  providers: [
    FuelAcceptanceFacade,
  ],

  templateUrl:
    './fuel-acceptance-entry.component.html',

  styleUrl:
    './fuel-acceptance-entry.component.scss',

  changeDetection:
    ChangeDetectionStrategy.OnPush,
})
export class FuelAcceptanceEntryComponent
  implements OnDestroy {
  readonly facade =
    inject(FuelAcceptanceFacade);

  readonly toolbar =
    inject(AppToolbarService);

  private readonly fb =
    inject(FormBuilder);

  private readonly router =
    inject(Router);

  private readonly route =
    inject(ActivatedRoute);

  private readonly auth =
    inject(AuthFacadeService);

  private readonly dialogs =
    inject(DialogService);

  private readonly notify =
    inject(ErpNotificationService);

  private readonly destroyRef =
    inject(DestroyRef);


  /* =============================================================
     DOCUMENT STATE
     ============================================================= */

  readonly status =
    signal<FuelAcceptanceStatus>('N');

  readonly rowVersion =
    signal<string | null>(null);

  readonly documentNo =
    signal<string>('');

  readonly details =
    signal<FuelAcceptanceDetail[]>([]);

  readonly editingRowIndex =
    signal<number | null>(null);


  /* =============================================================
     PO LINE POPUP
     ============================================================= */

  readonly poLinePopupSettings:
    PopupSettings =
    {
      width: 1050,
      height: 360,
      popupClass:
        'fuel-po-line-popup',
    };


  /* =============================================================
     HEADER FORM
     ============================================================= */

  readonly form =
    this.fb.nonNullable.group({
      fuelAcceptanceNo: [''],

      acceptanceDate: [
        new Date(),
        Validators.required,
      ],

      /*
       * Legacy only.
       * Actual PO is now detail-level.
       */
      poNo: [''],

      suppCode: [
        '',
        [
          Validators.required,
          Validators.maxLength(20),
        ],
      ],

      suppName: [''],

      branchName: [
        'MANDAUE',
        [
          Validators.required,
          Validators.maxLength(50),
        ],
      ],

      reference: [
        '',
        [
          Validators.required,
          Validators.maxLength(20),
        ],
      ],

      vehicleNo: [
        '',
        Validators.maxLength(50),
      ],

      plateNo: [
        '',
        [
          Validators.required,
          Validators.maxLength(30),
        ],
      ],

      driverName: [
        '',
        [
          Validators.required,
          Validators.maxLength(150),
        ],
      ],

      purpose: [
        '',
        Validators.maxLength(250),
      ],

      /*
       * Compatibility only.
       * Not displayed anymore.
       */
      poAmount: [0],

      statusDisplay: [
        'DRAFT',
      ],

      remarks: [
        '',
        Validators.maxLength(500),
      ],

      userId: [
        this.auth.userId(),
      ],
    });


  /* =============================================================
     STATUS
     ============================================================= */

  readonly isDraftStatus =
    computed(
      () =>
        this.status() === 'N',
    );


  readonly isPostedStatus =
    computed(
      () =>
        this.status() === 'A',
    );


  readonly isReversedStatus =
    computed(
      () =>
        this.status() === 'R',
    );


  /* =============================================================
     EDITABLE
     ============================================================= */

  readonly isEditable =
    computed(
      () =>
        this.status() === 'N' &&
        !this.facade.commandBusy(),
    );


  /* =============================================================
     POST
     ============================================================= */

  readonly canPost =
    computed(
      () =>
        this.status() === 'N' &&

        !!this.documentNo()
          .trim() &&

        this.details().length >
        0 &&

        !!this.rowVersion(),
    );


  /* =============================================================
     REVERSE
     ============================================================= */

  readonly canReverse =
    computed(
      () =>
        this.status() === 'A' &&

        !!this.documentNo()
          .trim() &&

        !!this.rowVersion(),
    );


  /* =============================================================
     TOTALS
     ============================================================= */

  readonly totals =
    computed<PreviewTotals>(
      () =>
        this.details().reduce(
          (
            total,
            detail,
          ) => ({
            liters:
              total.liters +
              Number(
                detail.liters ??
                0,
              ),

            gross:
              total.gross +
              Number(
                detail.grossAmount ??
                0,
              ),

            basic:
              total.basic +
              Number(
                detail.basicAmount ??
                0,
              ),

            inputVat:
              total.inputVat +
              Number(
                detail.inputVat ??
                0,
              ),

            ewt:
              total.ewt +
              Number(
                detail.ewtAmount ??
                0,
              ),

            net:
              total.net +
              Number(
                detail.netAmount ??
                0,
              ),

            noReceipt:
              total.noReceipt +
              (
                detail.hasReceipt
                  ? 0
                  : Number(
                    detail.grossAmount ??
                    0,
                  )
              ),
          }),

          {
            liters: 0,
            gross: 0,
            basic: 0,
            inputVat: 0,
            ewt: 0,
            net: 0,
            noReceipt: 0,
          },
        ),
    );


  /* =============================================================
     CONSTRUCTOR
     ============================================================= */

  constructor() {
    this.toolbar.setConfig({
      showNew: true,
      showSave: true,
      showPost: true,
      showReverse: true,
      showDataList: true,
      showRefresh: true,
    });


    /* ===========================================================
       SUPPLIER VALUE CHANGE
       =========================================================== */

    this.form.controls
      .suppCode
      .valueChanges
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe(
        (
          supplierCode,
        ) => {
          this.facade.selectSupplier(
            supplierCode ||
            null,
          );
        },
      );


    /* ===========================================================
       ROUTE
       =========================================================== */

    const fuelAcceptanceNo =
      this.route.snapshot
        .paramMap
        .get(
          'fuelAcceptanceNo',
        );


    if (
      fuelAcceptanceNo &&
      fuelAcceptanceNo
        .toLowerCase() !==
      'new'
    ) {
      const documentNo =
        fuelAcceptanceNo.trim();


      this.documentNo.set(
        documentNo,
      );


      this.facade.loadDocument(
        documentNo,
      );
    }


    /* ===========================================================
       DOCUMENT LOAD
       =========================================================== */

    effect(
      () => {
        const document =
          this.facade.document();


        if (!document) {
          return;
        }


        const header =
          document.header;


        const loadedDocumentNo =
          String(
            header.fuelAcceptanceNo ??
            '',
          ).trim();


        const normalizedStatus =
          this.normalizeStatus(
            header.status,
          );


        const normalizedRowVersion =
          this.normalizeRowVersion(
            header.rowVersion,
          );


        const supplierCode =
          String(
            header.suppCode ??
            '',
          ).trim();


        const supplierName =
          String(
            header.suppName ??
            '',
          ).trim();


        const branchName =
          String(
            header.branchName ??
            '',
          ).trim() ||
          'MANDAUE';


        /* =======================================================
           LOCAL STATE
           ======================================================= */

        this.documentNo.set(
          loadedDocumentNo,
        );


        this.status.set(
          normalizedStatus,
        );


        this.rowVersion.set(
          normalizedRowVersion,
        );


        /* =======================================================
           HEADER VALUES
           ======================================================= */

        this.form.patchValue(
          {
            fuelAcceptanceNo:
              loadedDocumentNo,

            acceptanceDate:
              this.asDate(
                header.acceptanceDate,
              ),

            poNo:
              String(
                header.poNo ??
                '',
              ).trim(),

            suppCode:
              supplierCode,

            suppName:
              supplierName,

            branchName,

            reference:
                String(
                  header.reference ??
                  '',
                ).trim(),

            vehicleNo:
              String(
                header.vehicleNo ??
                '',
              ).trim(),

            plateNo:
              String(
                header.plateNo ??
                '',
              ).trim(),

            driverName:
              String(
                header.driverName ??
                '',
              ).trim(),

            purpose:
              String(
                header.purpose ??
                '',
              ).trim(),

            poAmount:
              Number(
                header.poAmount ??
                0,
              ),

            statusDisplay:
              this.statusLabel(
                normalizedStatus,
              ),

            remarks:
              String(
                header.remarks ??
                '',
              ),

            userId:
              String(
                header.userId ??
                '',
              ).trim() ||
              this.auth.userId(),
          },
          {
            emitEvent:
              false,
          },
        );


        /* =======================================================
           DETAILS
           ======================================================= */

        this.details.set(
          (
            document.details ??
            []
          ).map(
            (
              detail,
            ) =>
              this.calculate({
                ...detail,

                poNo:
                  String(
                    detail.poNo ??
                    '',
                  ).trim(),

                /*
                 * Existing document fallback.
                 */
                openQty:
                  Number(
                    detail.openQty ??
                    detail.liters ??
                    detail.qtyPo ??
                    0,
                  ),
              }),
          ),
        );


        /* =======================================================
           LOOKUPS

           Important:
           Kendo needs supplier/branch row to exist in data.
           ======================================================= */

        this.facade.reloadSuppliers();

        this.facade.reloadBranches();


        this.facade.selectSupplier(
          supplierCode ||
          null,
        );


        this.facade
          .setExcludeAcceptanceNo(
            loadedDocumentNo ||
            null,
          );


        this.editingRowIndex.set(
          null,
        );
      },
      {
        allowSignalWrites:
          true,
      },
    );
  }


  /* =============================================================
     DESTROY
     ============================================================= */

  ngOnDestroy(): void {
    this.toolbar.reset();
  }


  /* =============================================================
     SUPPLIER DATA

     Critical fix:
     Saved supplier stays in Kendo data even if supplier lookup
     is loading or does not currently contain the record.
     ============================================================= */

  supplierData():
    FuelSupplierLookup[] {
    const lookup =
      this.facade.suppliers();


    const suppCode =
      String(
        this.form.controls
          .suppCode.value ??
        '',
      ).trim();


    const suppName =
      String(
        this.form.controls
          .suppName.value ??
        '',
      ).trim();


    if (!suppCode) {
      return lookup;
    }


    const exists =
      lookup.some(
        (
          item,
        ) =>
          String(
            item.suppCode ??
            '',
          ).trim() ===
          suppCode,
      );


    if (exists) {
      return lookup;
    }


    return [
      {
        suppCode,

        suppName:
          suppName ||
          suppCode,
      },

      ...lookup,
    ];
  }


  /* =============================================================
     BRANCH DATA

     Same protection as Supplier.
     ============================================================= */

  branchData():
    FuelBranchLookup[] {
    const lookup =
      this.facade.branches();


    const branchName =
      String(
        this.form.controls
          .branchName.value ??
        '',
      ).trim();


    if (!branchName) {
      return lookup;
    }


    const exists =
      lookup.some(
        (
          item,
        ) =>
          String(
            item.branchName ??
            '',
          ).trim() ===
          branchName,
      );


    if (exists) {
      return lookup;
    }


    return [
      {
        branchName,
      },

      ...lookup,
    ];
  }


  /* =============================================================
     STATUS LABEL
     ============================================================= */

  statusLabel(
    status:
      FuelAcceptanceStatus =
      this.status(),
  ): string {
    switch (status) {
      case 'N':
        return 'DRAFT';

      case 'A':
        return 'POSTED / READY FOR VP';

      case 'R':
        return 'REVERSED';

      default:
        return String(
          status ??
          '',
        );
    }
  }


  /* =============================================================
     VALIDATION DISPLAY
     ============================================================= */

  isInvalid(
    control: AbstractControl,
  ): boolean {
    return (
      control.invalid &&
      (
        control.touched ||
        control.dirty
      )
    );
  }


  /* =============================================================
     NEW DOCUMENT
     ============================================================= */

  newDocument(): void {
    this.facade.loadDocument(
      null,
    );


    this.facade.selectSupplier(
      null,
    );


    this.facade
      .setExcludeAcceptanceNo(
        null,
      );


    this.status.set(
      'N',
    );


    this.rowVersion.set(
      null,
    );


    this.documentNo.set(
      '',
    );


    this.details.set(
      [],
    );


    this.editingRowIndex.set(
      null,
    );


    this.form.reset({
      fuelAcceptanceNo: '',

      acceptanceDate:
        new Date(),

      poNo: '',

      suppCode: '',

      suppName: '',

      branchName:
        'MANDAUE',

      vehicleNo: '',

      plateNo: '',

      driverName: '',

      purpose: '',

      poAmount: 0,

      statusDisplay:
        'DRAFT',

      remarks: '',

      userId:
        this.auth.userId(),
    });


    this.facade.reloadSuppliers();

    this.facade.reloadBranches();


    void this.router.navigate([
      '/fuel-acceptance/new',
    ]);
  }


  /* =============================================================
     LIST
     ============================================================= */

  list(): void {
    void this.router.navigate([
      '/fuel-acceptance',
    ]);
  }


  /* =============================================================
     PRINT
     ============================================================= */

  print(): void {
    window.print();
  }


  /* =============================================================
     REFRESH
     ============================================================= */

  refresh(): void {
    const documentNo =
      this.documentNo()
        .trim() ||

      this.form.controls
        .fuelAcceptanceNo
        .value
        .trim();


    if (documentNo) {
      /*
       * Refresh lookup rows too.
       */
      this.facade.reloadSuppliers();

      this.facade.reloadBranches();


      this.facade.loadDocument(
        documentNo,
      );


      this.facade.reloadDocument();


      return;
    }


    this.facade.reloadSuppliers();

    this.facade.reloadBranches();


    const supplierCode =
      String(
        this.form.controls
          .suppCode.value ??
        '',
      ).trim();


    if (supplierCode) {
      this.facade.selectSupplier(
        supplierCode,
      );


      this.facade
        .reloadPurchaseOrderLines();
    }
  }


  /* =============================================================
     SUPPLIER CHANGED
     ============================================================= */

  supplierChanged(
    supplier:
      FuelSupplierLookup
      | null
      | undefined,
  ): void {
    if (!this.isEditable()) {
      return;
    }

    /* ============================================================
       CLEARED SUPPLIER
       ============================================================ */

    if (!supplier) {
      this.form.patchValue(
        {
          suppCode: '',
          suppName: '',
          poNo: '',
          poAmount: 0,
        },
        {
          emitEvent: false,
        },
      );

      this.details.set([]);

      this.facade.selectSupplier(
        null,
      );

      return;
    }


    /* ============================================================
       GET EXACT SELECTED SUPPLIER
  
       selectionChange gives us the WHOLE supplier row:
         suppCode
         suppName
  
       So we no longer need to search the lookup array again.
       ============================================================ */

    const cleanSupplierCode =
      String(
        supplier.suppCode ?? '',
      ).trim();

    const cleanSupplierName =
      String(
        supplier.suppName ?? '',
      ).trim();


    if (!cleanSupplierCode) {
      return;
    }


    const previousSupplierCode =
      String(
        this.form.controls
          .suppCode.value ?? '',
      ).trim();


    /* ============================================================
       IF CHANGING SUPPLIER, CLEAR OLD DETAILS
       ============================================================ */

    if (
      previousSupplierCode &&
      previousSupplierCode !== cleanSupplierCode &&
      this.details().length > 0
    ) {
      this.details.set([]);
    }


    /* ============================================================
       SAVE BOTH CODE + NAME INTO FORM
       ============================================================ */

    this.form.patchValue(
      {
        suppCode:
          cleanSupplierCode,

        suppName:
          cleanSupplierName,

        poNo: '',

        poAmount: 0,
      },
      {
        emitEvent: false,
      },
    );


    /* ============================================================
       LOAD OPEN PO LINES FOR SELECTED SUPPLIER
       ============================================================ */

    this.facade.selectSupplier(
      cleanSupplierCode,
    );
  }


  /* =============================================================
     ADD DETAIL
     ============================================================= */

  addHandler(
    args: AddEvent,
  ): void {
    if (
      !this.isEditable()
    ) {
      return;
    }


    const supplierCode =
      String(
        this.form.controls
          .suppCode.value ??
        '',
      ).trim();


    if (!supplierCode) {
      this.form.controls
        .suppCode
        .markAsTouched();


      this.notify.warning(
        'Select a Supplier before adding a Fuel PO line.',
        'Supplier Required',
      );


      return;
    }


    this.facade.selectSupplier(
      supplierCode,
    );


    this.closeEditor(
      args.sender,
    );


    this.editingRowIndex.set(
      -1,
    );


    args.sender.addRow(
      this.createDetailGroup({
        lineSeq:
          this.nextLineSeq(),

        poNo: '',

        poLineNo:
          null,

        itemCode: '',

        itemDesc: '',

        qtyPo: 0,

        openQty: 0,

        poUm: '',

        baseUm: '',

        poConvFactor: 1,

        fuelDate:
          this.dateOnly(
            new Date(),
          ),

        fuelStation: '',

        fuelType: '',

        hasReceipt:
          false,

        receiptNo:
          null,

        noReceiptReason:
          null,

        liters: 0,

        unitPrice: 0,

        taxSchemeCode:
          'NV',

        remarks:
          null,
      }),
    );
  }


  /* =============================================================
     EDIT DETAIL
     ============================================================= */

  editHandler(
    args: EditEvent,
  ): void {
    if (
      !this.isEditable()
    ) {
      return;
    }


    this.closeEditor(
      args.sender,
    );


    this.editingRowIndex.set(
      args.rowIndex,
    );


    args.sender.editRow(
      args.rowIndex,

      this.createDetailGroup(
        args.dataItem as
        FuelAcceptanceDetail,
      ),
    );
  }


  /* =============================================================
     CANCEL DETAIL
     ============================================================= */

  cancelHandler(
    args: CancelEvent,
  ): void {
    args.sender.closeRow(
      args.rowIndex,
    );


    this.editingRowIndex.set(
      null,
    );
  }


  /* =============================================================
     SELECT PO LINE
     ============================================================= */

  onGridPoLineSelected(
    formGroup: FormGroup,

    selected:
      | FuelPoLineLookup
      | null
      | undefined,
  ): void {
    if (!selected) {
      formGroup.patchValue(
        {
          poNo: '',

          poLineNo:
            null,

          itemCode: '',

          itemDesc: '',

          qtyPo: 0,

          openQty: 0,

          poUm: '',

          baseUm: '',

          poConvFactor: 1,

          fuelType: '',

          liters: 0,

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
        poNo:
          String(
            selected.poNo ??
            '',
          ).trim(),

        poLineNo:
          Number(
            selected.poLineNo,
          ),

        itemCode:
          String(
            selected.itemCode ??
            '',
          ).trim(),

        itemDesc:
          String(
            selected.itemDesc ??
            '',
          ).trim(),

        qtyPo:
          Number(
            selected.qtyPo ??
            0,
          ),

        openQty:
          Number(
            selected.openQty ??
            0,
          ),

        poUm:
          String(
            selected.poUm ??
            '',
          ).trim(),

        baseUm:
          String(
            selected.baseUm ??
            '',
          ).trim(),

        poConvFactor:
          Number(
            selected.poConvFactor ??
            1,
          ),

        fuelType:
          String(
            selected.fuelType ||
            selected.itemDesc ||
            '',
          )
            .trim()
            .toUpperCase(),

        /*
         * Use remaining quantity.
         */
        liters:
          Number(
            selected.openQty ??
            0,
          ),

        unitPrice:
          Number(
            selected.unitPrice ??
            0,
          ),

        hasReceipt:
          false,

        receiptNo:
          '',

        noReceiptReason:
          '',

        taxSchemeCode:
          'NV',
      },
      {
        emitEvent: false,
      },
    );


    formGroup.markAsDirty();


    formGroup
      .updateValueAndValidity({
        emitEvent: true,
      });
  }


  /* =============================================================
     SAVE DETAIL
     ============================================================= */

  saveHandler(
    args: SaveEvent,
  ): void {
    if (
      !this.isEditable()
    ) {
      return;
    }


    const group =
      args.formGroup;


    group.markAllAsTouched();


    group.updateValueAndValidity({
      emitEvent: false,
    });


    if (group.invalid) {
      this.notify.warning(
        'PO No., PO Line, Item, Open Qty, PO U/M and Unit Price are required.',
        'Fuel Line Validation',
      );


      return;
    }


    const raw =
      group.getRawValue();


    const poNo =
      String(
        raw.poNo ??
        '',
      ).trim();


    const poLineNo =
      Number(
        raw.poLineNo ??
        0,
      );


    const rowIndex =
      args.isNew
        ? -1
        : args.rowIndex;


    /* ===========================================================
       DUPLICATE = PO NO + PO LINE
       =========================================================== */

    const duplicate =
      this.details().some(
        (
          existing,
          index,
        ) =>
          index !==
          rowIndex &&

          String(
            existing.poNo ??
            '',
          ).trim() ===
          poNo &&

          Number(
            existing.poLineNo ??
            0,
          ) ===
          poLineNo,
      );


    if (duplicate) {
      this.notify.warning(
        `PO ${poNo} / Line ${poLineNo} is already included.`,
        'Duplicate PO Line',
      );


      return;
    }


    const lineSeq =
      args.isNew
        ? this.nextLineSeq()
        : Number(
          (
            args.dataItem as
            FuelAcceptanceDetail
          ).lineSeq,
        );


    const line =
      this.calculate({
        lineSeq,

        poNo,

        poLineNo,

        itemCode:
          String(
            raw.itemCode ??
            '',
          ).trim(),

        itemDesc:
          String(
            raw.itemDesc ??
            '',
          ).trim(),

        qtyPo:
          Number(
            raw.qtyPo ??
            0,
          ),

        openQty:
          Number(
            raw.openQty ??
            0,
          ),

        poUm:
          String(
            raw.poUm ??
            '',
          ).trim(),

        baseUm:
          String(
            raw.baseUm ??
            '',
          ).trim(),

        poConvFactor:
          Number(
            raw.poConvFactor ??
            1,
          ),

        fuelDate:
          this.dateOnly(
            raw.fuelDate ??
            new Date(),
          ),

        fuelStation:
          '',

        fuelType:
          String(
            raw.fuelType ??
            raw.itemDesc ??
            '',
          )
            .trim()
            .toUpperCase(),

        hasReceipt:
          false,

        receiptNo:
          null,

        noReceiptReason:
          null,

        liters:
          Number(
            raw.openQty ??
            raw.liters ??
            0,
          ),

        unitPrice:
          Number(
            raw.unitPrice ??
            0,
          ),

        taxSchemeCode:
          'NV',

        remarks:
          null,
      });


    if (args.isNew) {
      this.details.update(
        (
          lines,
        ) => [
          ...lines,
          line,
        ].sort(
          (
            a,
            b,
          ) =>
            a.lineSeq -
            b.lineSeq,
        ),
      );
    } else {
      this.details.update(
        (
          lines,
        ) =>
          lines.map(
            (
              item,
              index,
            ) =>
              index ===
                args.rowIndex
                ? line
                : item,
          ),
      );
    }


    args.sender.closeRow(
      args.rowIndex,
    );


    this.editingRowIndex.set(
      null,
    );
  }


  /* =============================================================
     REMOVE DETAIL
     ============================================================= */

  removeHandler(
    args: RemoveEvent,
  ): void {
    if (
      !this.isEditable()
    ) {
      return;
    }


    const line =
      args.dataItem as
      FuelAcceptanceDetail;


    this.details.update(
      (
        lines,
      ) =>
        lines
          .filter(
            (
              item,
            ) =>
              !(
                String(
                  item.poNo ??
                  '',
                ).trim() ===
                String(
                  line.poNo ??
                  '',
                ).trim()

                &&

                Number(
                  item.poLineNo ??
                  0,
                ) ===
                Number(
                  line.poLineNo ??
                  0,
                )
              ),
          )
          .map(
            (
              item,
              index,
            ) => ({
              ...item,

              lineSeq:
                index + 1,
            }),
          ),
    );


    this.editingRowIndex.set(
      null,
    );
  }


  /* =============================================================
     SAVE / UPDATE CONFIRMATION
     ============================================================= */

  save(): void {
    this.form.markAllAsTouched();


    if (
      !this.validateDocument()
    ) {
      return;
    }


    const isUpdate =
      !!this.documentNo()
        .trim();


    const raw =
      this.form.getRawValue();


    const dialog =
      this.dialogs.open({
        content:
          ErpSaveConfirmDialogComponent,

        width:
          700,

        minWidth:
          420,

        maxWidth:
          740,

        cssClass: [
          'erp-kendo-dialog',
          'erp-kendo-dialog--save',
        ],
      });


    const component =
      dialog.content.instance as
      ErpSaveConfirmDialogComponent;


    const data:
      ErpSaveConfirmDialogData =
    {
      title:
        isUpdate
          ? 'Update Fuel Acceptance'
          : 'Save Fuel Acceptance',

      message:
        isUpdate
          ? `Do you want to update Fuel Acceptance ${this.documentNo()}?`
          : 'Do you want to save this new Fuel Acceptance?',

      moduleName:
        'Fuel Acceptance',

      documentNo:
        this.documentNo()
          .trim() ||
        'NEW',

      status:
        this.statusLabel(),

      effectText:
        isUpdate
          ? 'The current Draft Fuel Acceptance will be updated.'
          : 'A new Draft Fuel Acceptance will be created.',

      note:
        'Review the Supplier and selected Purchase Order lines before continuing.',

      questionText:
        isUpdate
          ? 'Proceed with Update?'
          : 'Proceed with Save?',

      confirmText:
        isUpdate
          ? 'Update'
          : 'Save',

      cancelText:
        'Back',

      showGrid:
        true,

      gridHeight:
        145,

      gridData: [
        {
          documentNo:
            this.documentNo()
              .trim() ||
            'NEW',

          supplier:
            raw.suppName ||
            raw.suppCode ||
            '-',

          branch:
            raw.branchName ||
            '-',

          lines:
            this.details().length,

          gross:
            this.totals().gross,
        },
      ],

      gridColumns: [
        {
          field:
            'documentNo',

          title:
            'Acceptance No.',

          width:
            160,
        },

        {
          field:
            'supplier',

          title:
            'Supplier',

          width:
            220,
        },

        {
          field:
            'branch',

          title:
            'Branch',

          width:
            110,
        },

        {
          field:
            'lines',

          title:
            'Lines',

          width:
            70,
        },

        {
          field:
            'gross',

          title:
            'Gross',

          width:
            110,
        },
      ],
    };


    component.data =
      data;


    dialog.result
      .pipe(
        take(1),
      )
      .subscribe(
        (
          result,
        ) => {
          if (
            result instanceof
            DialogCloseResult
          ) {
            return;
          }


          const response =
            result as {
              action?: string;
            };


          if (
            response.action !==
            'confirm'
          ) {
            return;
          }


          this.executeSave();
        },
      );
  }


  /* =============================================================
     EXECUTE SAVE
     ============================================================= */

  private executeSave(): void {
    this.facade
      .save(
        this.buildRequest(),
      )
      .subscribe({
        next:
          (
            result,
          ) => {
            const newStatus =
              this.normalizeStatus(
                result.status,
              );


            const newRowVersion =
              this.normalizeRowVersion(
                result.rowVersion,
              );


            this.status.set(
              newStatus,
            );


            this.rowVersion.set(
              newRowVersion,
            );


            this.documentNo.set(
              result.fuelAcceptanceNo,
            );


            this.form.patchValue(
              {
                fuelAcceptanceNo:
                  result.fuelAcceptanceNo,

                statusDisplay:
                  this.statusLabel(
                    newStatus,
                  ),
              },
              {
                emitEvent:
                  false,
              },
            );


            this.facade
              .setExcludeAcceptanceNo(
                result.fuelAcceptanceNo,
              );


            this.notify.success(
              result.message,
              'Fuel Acceptance Saved',
              result.fuelAcceptanceNo,
              'Fuel Acceptance',
            );


            void this.router.navigate([
              '/fuel-acceptance',
              result.fuelAcceptanceNo,
            ]);
          },

        error:
          (
            error,
          ) =>
            this.error(
              this.facade
                .errorMessage(
                  error,
                ),
            ),
      });
  }


  /* =============================================================
     POST CONFIRMATION
     ============================================================= */

  post(): void {
    if (
      !this.canPost()
    ) {
      this.error(
        'Save the Draft Fuel Acceptance before posting.',
      );


      return;
    }


    const documentNo =
      this.documentNo()
        .trim();


    const rowVersion =
      this.rowVersion();


    if (
      !documentNo ||
      !rowVersion
    ) {
      this.error(
        'Save the document before posting.',
      );


      return;
    }


    const raw =
      this.form.getRawValue();


    const dialog =
      this.dialogs.open({
        content:
          ErpSaveConfirmDialogComponent,

        width:
          700,

        minWidth:
          420,

        maxWidth:
          740,

        cssClass: [
          'erp-kendo-dialog',
          'erp-kendo-dialog--post',
        ],
      });


    const component =
      dialog.content.instance as
      ErpSaveConfirmDialogComponent;


    const data:
      ErpSaveConfirmDialogData =
    {
      title:
        'Post Fuel Acceptance',

      message:
        `Are you sure you want to post Fuel Acceptance ${documentNo}?`,

      moduleName:
        'Fuel Acceptance',

      documentNo,

      status:
        this.statusLabel(),

      effectText:
        'Posting will register this document as a GAS source for Voucher Payable.',

      note:
        'After posting, the document becomes read-only unless reversed.',

      questionText:
        'Do you want to proceed with posting?',

      confirmText:
        'Post Transaction',

      cancelText:
        'Back',

      showGrid:
        true,

      gridHeight:
        145,

      gridData: [
        {
          documentNo,

          supplier:
            raw.suppName ||
            raw.suppCode ||
            '-',

          branch:
            raw.branchName ||
            '-',

          lines:
            this.details().length,

          gross:
            this.totals().gross,
        },
      ],

      gridColumns: [
        {
          field:
            'documentNo',

          title:
            'Acceptance No.',

          width:
            165,
        },

        {
          field:
            'supplier',

          title:
            'Supplier',

          width:
            220,
        },

        {
          field:
            'branch',

          title:
            'Branch',

          width:
            110,
        },

        {
          field:
            'lines',

          title:
            'Lines',

          width:
            70,
        },

        {
          field:
            'gross',

          title:
            'Gross',

          width:
            110,
        },
      ],
    };


    component.data =
      data;


    dialog.result
      .pipe(
        take(1),
      )
      .subscribe(
        (
          result,
        ) => {
          if (
            result instanceof
            DialogCloseResult
          ) {
            return;
          }


          const response =
            result as {
              action?: string;
            };


          if (
            response.action !==
            'confirm'
          ) {
            return;
          }


          this.executePost(
            documentNo,
            rowVersion,
          );
        },
      );
  }


  /* =============================================================
     EXECUTE POST
     ============================================================= */

  private executePost(
    documentNo: string,
    rowVersion: string,
  ): void {
    this.facade
      .post(
        documentNo,
        {
          rowVersion,
        },
      )
      .subscribe({
        next:
          (
            result,
          ) =>
            this.applyWorkflowResult(
              result,
              'Fuel Acceptance Posted',
            ),

        error:
          (
            error,
          ) =>
            this.error(
              this.facade
                .errorMessage(
                  error,
                ),
            ),
      });
  }


  /* =============================================================
     REVERSE WITH REQUIRED REASON
     ============================================================= */

  requestReverse(): void {
    if (
      !this.canReverse()
    ) {
      this.error(
        'Only a Posted Fuel Acceptance can be reversed.',
      );


      return;
    }


    const documentNo =
      this.documentNo()
        .trim();


    const rowVersion =
      this.rowVersion();


    if (
      !documentNo ||
      !rowVersion
    ) {
      this.error(
        'Save the document before reversing.',
      );


      return;
    }


    const raw =
      this.form.getRawValue();


    const dialog:
      DialogRef =
      this.dialogs.open({
        content:
          ErpSaveConfirmDialogComponent,

        width:
          720,

        minWidth:
          420,

        maxWidth:
          760,

        minHeight:
          340,

        cssClass: [
          'erp-kendo-dialog',
          'erp-kendo-dialog--reverse',
        ],

        htmlAttributes: {
          'data-dialog-role':
            'fuel-acceptance-reverse',
        },
      });


    const component =
      dialog.content.instance as
      ErpSaveConfirmDialogComponent;


    const data:
      ErpSaveConfirmDialogData =
    {
      title:
        'Reverse Fuel Acceptance',

      message:
        `Are you sure you want to reverse Fuel Acceptance ${documentNo}?`,

      moduleName:
        'Fuel Acceptance',

      documentNo,

      status:
        this.statusLabel(),

      effectText:
        `Reversing ${documentNo} will reopen the Fuel Acceptance as Draft and close its GAS source for Voucher Payable.`,

      note:
        'A reversal reason is required. Reversal is blocked if this document is already reserved or used by Voucher Payable.',

      questionText:
        'Do you want to proceed with the reversal?',

      confirmText:
        'Reverse Acceptance',

      cancelText:
        'Back',

      showGrid:
        true,

      gridHeight:
        145,

      gridData: [
        {
          documentNo,

          status:
            this.statusLabel(),

          branchName:
            raw.branchName ||
            '-',

          supplier:
            raw.suppName ||
            raw.suppCode ||
            '-',

          lines:
            this.details().length,

          gross:
            this.totals().gross,
        },
      ],

      gridColumns: [
        {
          field:
            'documentNo',

          title:
            'Acceptance No.',

          width:
            170,
        },

        {
          field:
            'status',

          title:
            'Status',

          width:
            125,
        },

        {
          field:
            'branchName',

          title:
            'Branch',

          width:
            110,
        },

        {
          field:
            'supplier',

          title:
            'Supplier',

          width:
            220,
        },

        {
          field:
            'lines',

          title:
            'Lines',

          width:
            75,
        },

        {
          field:
            'gross',

          title:
            'Gross',

          width:
            120,
        },
      ],


      /* =========================================================
         IMPORTANT:
         Display reversal reason textarea.
         ========================================================= */

      showForm:
        true,


      formFields: [
        {
          name:
            'reverseReason',

          label:
            'Reversal Reason *',

          type:
            'textarea',

          placeholder:
            'Enter reason for reversing this Fuel Acceptance',

          rows:
            4,

          value:
            '',
        },
      ],
    };


    component.data =
      data;


    dialog.result
      .pipe(
        take(1),
      )
      .subscribe(
        (
          result,
        ) => {
          if (
            result instanceof
            DialogCloseResult
          ) {
            return;
          }


          const response =
            result as {
              action?: string;

              formValue?: Record<
                string,
                unknown
              >;
            };


          if (
            response.action !==
            'confirm'
          ) {
            return;
          }


          const reason =
            String(
              response
                .formValue?.[
              'reverseReason'
              ] ??
              '',
            ).trim();


          if (!reason) {
            this.notify.warning(
              'Reversal reason is required.',
              'Fuel Acceptance',
            );


            return;
          }


          if (
            reason.length >
            500
          ) {
            this.notify.warning(
              'Reversal reason cannot exceed 500 characters.',
              'Fuel Acceptance',
            );


            return;
          }


          this.facade
            .reverse(
              documentNo,
              {
                rowVersion,
                reason,
              },
            )
            .subscribe({
              next:
                (
                  workflowResult,
                ) =>
                  this.applyWorkflowResult(
                    workflowResult,
                    'Fuel Acceptance Reversed',
                  ),

              error:
                (
                  error,
                ) =>
                  this.error(
                    this.facade
                      .errorMessage(
                        error,
                      ),
                  ),
            });
        },
      );
  }


  /* =============================================================
     APPLY POST / REVERSE RESULT

     DO NOT reload whole document here.
     This is what allows toolbar to update immediately.
     ============================================================= */

  private applyWorkflowResult(
    result:
      FuelAcceptanceCommandResponse,

    title:
      string,
  ): void {
    const newStatus =
      this.normalizeStatus(
        result.status,
      );


    const newRowVersion =
      this.normalizeRowVersion(
        result.rowVersion,
      );


    const newDocumentNo =
      String(
        result.fuelAcceptanceNo ||
        this.documentNo(),
      ).trim();


    this.documentNo.set(
      newDocumentNo,
    );


    this.status.set(
      newStatus,
    );


    this.rowVersion.set(
      newRowVersion,
    );


    this.form.patchValue(
      {
        fuelAcceptanceNo:
          newDocumentNo,

        statusDisplay:
          this.statusLabel(
            newStatus,
          ),
      },
      {
        emitEvent:
          false,
      },
    );


    this.facade
      .setExcludeAcceptanceNo(
        newDocumentNo,
      );


    this.facade
      .reloadPurchaseOrderLines();


    this.notify.success(
      result.message,
      title,
      newDocumentNo,
      'Fuel Acceptance',
    );
  }


  /* =============================================================
     VALIDATE DOCUMENT
     ============================================================= */

  private validateDocument():
    boolean {
    this.form.markAllAsTouched();


    if (
      this.form.invalid
    ) {
      this.notify.warning(
        'Complete all required Fuel Acceptance header fields.',
        'Fuel Acceptance Validation',
      );


      return false;
    }


    const supplierCode =
      String(
        this.form.controls
          .suppCode.value ??
        '',
      ).trim();


    if (!supplierCode) {
      this.notify.warning(
        'Select a Supplier.',
        'Supplier Required',
      );


      return false;
    }


    if (
      this.details().length ===
      0
    ) {
      this.notify.warning(
        'Add at least one Fuel PO line.',
        'Fuel Line Required',
      );


      return false;
    }


    const duplicateKeys =
      new Set<string>();


    for (
      const detail
      of this.details()
    ) {
      const poNo =
        String(
          detail.poNo ??
          '',
        ).trim();


      const poLineNo =
        Number(
          detail.poLineNo ??
          0,
        );


      if (
        !poNo ||
        poLineNo <= 0
      ) {
        this.notify.warning(
          `Fuel line ${detail.lineSeq} requires PO No. and PO Line.`,
          'Fuel Line Validation',
        );


        return false;
      }


      if (
        !String(
          detail.itemCode ??
          '',
        ).trim()

        ||

        !String(
          detail.itemDesc ??
          '',
        ).trim()

        ||

        Number(
          detail.liters ??
          0,
        ) <= 0

        ||

        Number(
          detail.unitPrice ??
          0,
        ) <= 0

        ||

        !String(
          detail.poUm ??
          '',
        ).trim()
      ) {
        this.notify.warning(
          `Fuel line ${detail.lineSeq} contains incomplete PO information.`,
          'Fuel Line Validation',
        );


        return false;
      }


      const key =
        `${poNo.toUpperCase()}|${poLineNo}`;


      if (
        duplicateKeys.has(
          key,
        )
      ) {
        this.notify.warning(
          `PO ${poNo} / Line ${poLineNo} is duplicated.`,
          'Duplicate PO Line',
        );


        return false;
      }


      duplicateKeys.add(
        key,
      );
    }


    if (
      !this.currentUser()
    ) {
      this.error(
        'Authenticated user could not be resolved.',
      );


      return false;
    }


    return true;
  }


  /* =============================================================
     BUILD REQUEST
     ============================================================= */

  private buildRequest():
    FuelAcceptanceSaveRequest {
    const header =
      this.form.getRawValue();


    return {
      header: {
        fuelAcceptanceNo:
          this.documentNo()
            .trim() ||
          null,

        acceptanceDate:
          this.dateOnly(
            header.acceptanceDate,
          ),

        /*
         * No single header PO.
         */
        poNo:
          null,

        suppCode:
          String(
            header.suppCode ??
            '',
          ).trim(),

        branchName:
          String(
            header.branchName ??
            'MANDAUE',
          ).trim(),

          reference:
            String(
              header.reference ??
              '',
            ).trim(),

        vehicleNo:
          String(
            header.vehicleNo ??
            '',
          ).trim(),

        plateNo:
          String(
            header.plateNo ??
            '',
          ).trim(),

        driverName:
          String(
            header.driverName ??
            '',
          ).trim(),

        purpose:
          String(
            header.purpose ??
            '',
          ).trim(),

        remarks:
          String(
            header.remarks ??
            '',
          ).trim() ||
          null,

        rowVersion:
          this.rowVersion(),
      },


      details:
        this.details().map(
          (
            detail,
            index,
          ) => ({
            ...detail,

            lineSeq:
              index + 1,

            poNo:
              String(
                detail.poNo ??
                '',
              ).trim(),

            poLineNo:
              Number(
                detail.poLineNo ??
                0,
              ),

            itemCode:
              String(
                detail.itemCode ??
                '',
              ).trim(),

            itemDesc:
              String(
                detail.itemDesc ??
                '',
              ).trim(),

            qtyPo:
              Number(
                detail.qtyPo ??
                0,
              ),

            openQty:
              Number(
                detail.openQty ??
                detail.liters ??
                0,
              ),

            poUm:
              String(
                detail.poUm ??
                '',
              ).trim(),

            baseUm:
              String(
                detail.baseUm ??
                '',
              ).trim(),

            poConvFactor:
              Number(
                detail.poConvFactor ??
                1,
              ),

            fuelDate:
              this.dateOnly(
                detail.fuelDate,
              ),

            fuelStation:
              '',

            hasReceipt:
              false,

            receiptNo:
              null,

            noReceiptReason:
              null,

            fuelType:
              String(
                detail.fuelType ||
                detail.itemDesc ||
                'GASOLINE',
              )
                .trim()
                .toUpperCase(),

            liters:
              Number(
                detail.liters ??
                detail.openQty ??
                0,
              ),

            unitPrice:
              Number(
                detail.unitPrice ??
                0,
              ),

            taxSchemeCode:
              'NV',

            remarks:
              detail.remarks ??
              null,
          }),
        ),
    };
  }


  /* =============================================================
     DETAIL FORM GROUP
     ============================================================= */

  private createDetailGroup(
    detail?:
      Partial<
        FuelAcceptanceDetail
      >,
  ): FormGroup {
    return this.fb.group({
      poNo: [
        detail?.poNo ??
        '',
        Validators.required,
      ],

      poLineNo: [
        detail?.poLineNo ??
        null,
        Validators.required,
      ],

      itemCode: [
        detail?.itemCode ??
        '',
        Validators.required,
      ],

      itemDesc: [
        detail?.itemDesc ??
        '',
        Validators.required,
      ],

      qtyPo: [
        detail?.qtyPo ??
        0,
      ],

      openQty: [
        detail?.openQty ??
        detail?.liters ??
        0,
        [
          Validators.required,
          Validators.min(
            0.0001,
          ),
        ],
      ],

      poUm: [
        detail?.poUm ??
        '',
        Validators.required,
      ],

      baseUm: [
        detail?.baseUm ??
        '',
      ],

      poConvFactor: [
        detail?.poConvFactor ??
        1,
      ],

      fuelDate: [
        this.asDate(
          detail?.fuelDate ??
          new Date(),
        ),
        Validators.required,
      ],

      fuelStation: [
        detail?.fuelStation ??
        '',
      ],

      fuelType: [
        detail?.fuelType ??
        '',
        Validators.required,
      ],

      hasReceipt: [
        false,
      ],

      receiptNo: [
        '',
      ],

      noReceiptReason: [
        '',
      ],

      liters: [
        detail?.liters ??
        detail?.openQty ??
        0,
        [
          Validators.required,
          Validators.min(
            0.0001,
          ),
        ],
      ],

      unitPrice: [
        detail?.unitPrice ??
        0,
        [
          Validators.required,
          Validators.min(
            0.0001,
          ),
        ],
      ],

      taxSchemeCode: [
        'NV',
      ],

      remarks: [
        detail?.remarks ??
        '',
      ],
    });
  }


  /* =============================================================
     CALCULATE
     ============================================================= */

  private calculate(
    detail:
      FuelAcceptanceDetail,
  ): FuelAcceptanceDetail {
    const liters =
      Number(
        detail.liters ??
        detail.openQty ??
        0,
      );


    const unitPrice =
      Number(
        detail.unitPrice ??
        0,
      );


    const gross =
      this.round4(
        liters *
        unitPrice,
      );


    return {
      ...detail,

      poNo:
        String(
          detail.poNo ??
          '',
        ).trim(),

      poLineNo:
        detail.poLineNo ==
          null
          ? null
          : Number(
            detail.poLineNo,
          ),

      qtyPo:
        Number(
          detail.qtyPo ??
          0,
        ),

      openQty:
        Number(
          detail.openQty ??
          liters,
        ),

      poConvFactor:
        Number(
          detail.poConvFactor ??
          1,
        ),

      fuelStation:
        '',

      hasReceipt:
        false,

      receiptNo:
        null,

      noReceiptReason:
        null,

      liters,

      unitPrice,

      grossAmount:
        gross,

      taxSchemeCode:
        'NV',

      vatRate:
        0,

      ewtRate:
        0,

      basicAmount:
        gross,

      inputVat:
        0,

      ewtAmount:
        0,

      netAmount:
        gross,
    };
  }


  /* =============================================================
     NEXT LINE
     ============================================================= */

  private nextLineSeq():
    number {
    return (
      this.details().reduce(
        (
          max,
          line,
        ) =>
          Math.max(
            max,
            Number(
              line.lineSeq ??
              0,
            ),
          ),
        0,
      ) +
      1
    );
  }


  /* =============================================================
     CLOSE GRID EDITOR
     ============================================================= */

  private closeEditor(
    grid: GridComponent,
  ): void {
    const rowIndex =
      this.editingRowIndex();


    if (
      rowIndex !==
      null
    ) {
      grid.closeRow(
        rowIndex,
      );
    }


    this.editingRowIndex.set(
      null,
    );
  }


  /* =============================================================
     USER
     ============================================================= */

  private currentUser():
    string {
    return String(
      this.auth.userId() ??
      '',
    ).trim();
  }


  /* =============================================================
     ERROR
     ============================================================= */

  private error(
    message:
      string,
  ): void {
    this.notify.error(
      message,
      'Fuel Acceptance',
    );
  }


  /* =============================================================
     STATUS
     ============================================================= */

  private normalizeStatus(
    status:
      string
      | null
      | undefined,
  ): FuelAcceptanceStatus {
    const normalized =
      String(
        status ??
        'N',
      )
        .trim()
        .toUpperCase();


    if (
      normalized === 'A' ||
      normalized ===
      'POSTED'
    ) {
      return 'A';
    }


    if (
      normalized === 'R' ||
      normalized ===
      'REVERSED'
    ) {
      return 'R';
    }


    return 'N';
  }


  /* =============================================================
     ROWVERSION
     ============================================================= */

  private normalizeRowVersion(
    rowVersion:
      string
      | null
      | undefined,
  ): string | null {
    const value =
      String(
        rowVersion ??
        '',
      ).trim();


    return value ||
      null;
  }


  /* =============================================================
     DATE
     ============================================================= */

  private asDate(
    value:
      string
      | Date
      | null
      | undefined,
  ): Date {
    if (
      value instanceof Date
    ) {
      return value;
    }


    const text =
      String(
        value ??
        '',
      ).trim();


    if (!text) {
      return new Date();
    }


    const parts =
      text
        .substring(
          0,
          10,
        )
        .split('-');


    if (
      parts.length === 3
    ) {
      return new Date(
        Number(
          parts[0],
        ),

        Number(
          parts[1],
        ) - 1,

        Number(
          parts[2],
        ),
      );
    }


    const parsed =
      new Date(
        text,
      );


    return Number.isNaN(
      parsed.getTime(),
    )
      ? new Date()
      : parsed;
  }


  private dateOnly(
    value:
      string
      | Date
      | null
      | undefined,
  ): string {
    const date =
      this.asDate(
        value,
      );


    const month =
      String(
        date.getMonth() +
        1,
      ).padStart(
        2,
        '0',
      );


    const day =
      String(
        date.getDate(),
      ).padStart(
        2,
        '0',
      );


    return (
      `${date.getFullYear()}-` +
      `${month}-` +
      `${day}`
    );
  }


  /* =============================================================
     ROUND
     ============================================================= */

  private round4(
    value:
      number,
  ): number {
    return (
      Math.round(
        (
          Number(
            value ??
            0,
          ) +
          Number.EPSILON
        ) *
        10000,
      ) /
      10000
    );
  }
}