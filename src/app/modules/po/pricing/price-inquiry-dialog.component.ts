import { CommonModule } from '@angular/common';

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { ButtonsModule } from '@progress/kendo-angular-buttons';
import { DateInputsModule } from '@progress/kendo-angular-dateinputs';
import { DialogModule } from '@progress/kendo-angular-dialog';

import {
  DropDownsModule,
  PopupSettings,
} from '@progress/kendo-angular-dropdowns';

import {
  GridDataResult,
  GridModule,
  PageChangeEvent,
} from '@progress/kendo-angular-grid';

import { InputsModule } from '@progress/kendo-angular-inputs';
import { LabelModule } from '@progress/kendo-angular-label';

import { AuthFacadeService } from '../../../core/services/auth-facade.service';
import { ErpNotificationService } from '../../../shared/notification-card/erp-notification.service';

import { PurchaseOrderFacade } from '../purchase-order.facade';

import {
  ItemLookup,
  SupplierLookup,
} from '../purchase-order.model';

import { PurchasePriceFacade } from './purchase-price.facade';

import {
  PurchasePriceDialogContext,
  PurchasePriceInquiryResult,
  PurchasePriceItemUm,
  SupplierPriceUpsertRequest,
} from './purchase-price.model';

@Component({
  selector: 'app-price-inquiry-dialog',
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
  ],

  templateUrl: './price-inquiry-dialog.component.html',
  styleUrls: ['./price-inquiry-dialog.component.scss'],

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PriceInquiryDialogComponent implements OnInit {

  @Input()
  context: PurchasePriceDialogContext | null = null;

  @Output()
  readonly closed = new EventEmitter<void>();

  @Output()
  readonly priceSelected = new EventEmitter<number>();


  private readonly facade =
    inject(PurchasePriceFacade);

  readonly poFacade =
    inject(PurchaseOrderFacade);

  private readonly auth =
    inject(AuthFacadeService);

  private readonly notify =
    inject(ErpNotificationService);

  private readonly destroyRef =
    inject(DestroyRef);

  private readonly fb =
    inject(FormBuilder);

  private readonly router =
    inject(Router);


  readonly dialogOpen =
    signal(true);

  readonly loading =
    signal(false);

  readonly saving =
    signal(false);

  readonly umLoading =
    signal(false);

  readonly error =
    signal<string | null>(null);

  readonly inquiry =
    signal<PurchasePriceInquiryResult | null>(null);

  readonly itemUms =
    signal<PurchasePriceItemUm[]>([]);

    private readonly supplierFilterText =
  signal<string>('');

readonly filteredSuppliers = computed(() => {
  const suppliers =
    this.poFacade.suppliers() ?? [];

  const searchText =
    this.supplierFilterText()
      .trim()
      .toLowerCase();

  if (!searchText) {
    return suppliers;
  }

  return suppliers.filter((supplier) => {
    const supplierCode =
      String(
        supplier.suppCode ?? ''
      )
        .trim()
        .toLowerCase();

    const supplierName =
      String(
        supplier.suppName ?? ''
      )
        .trim()
        .toLowerCase();

    return (
      supplierCode.includes(searchText) ||
      supplierName.includes(searchText)
    );
  });
});

  readonly standaloneContext =
    signal<PurchasePriceDialogContext | null>(null);

  readonly skip =
    signal(0);

  readonly pageSize =
    10;


  readonly activeContext =
    computed(() =>
      this.context ??
      this.standaloneContext()
    );


  readonly standaloneMode =
    computed(() =>
      this.context == null
    );


  readonly supplierPopupSettings: PopupSettings = {
    width: 620,
    height: 340,
  };


  readonly itemPopupSettings: PopupSettings = {
    width: 850,
    height: 380,
  };

readonly umPopupSettings: PopupSettings = {
  width: 560,
  height: 300,
};

  readonly searchForm =
    this.fb.group({
      supplierCode: [
        '',
        Validators.required,
      ],

      itemCode: [
        '',
        Validators.required,
      ],

      poUm: [
        '',
        Validators.required,
      ],
    });


  readonly priceForm =
    this.fb.group({
      unitPrice: [
        0,
        [
          Validators.required,
          Validators.min(0),
        ],
      ],

      effectiveDate: [
        new Date(),
        Validators.required,
      ],

      isActive: [
        true,
      ],

      remarks: [
        '',
        Validators.maxLength(500),
      ],
    });


  readonly mayMaintain =
    computed(() =>
      this.auth.hasPermission(
        'SUPPLIER_EDIT'
      )
    );


  readonly comparisonData =
    computed<GridDataResult>(() => ({
      data:
        this.inquiry()
          ?.configuredPrices ?? [],

      total:
        this.inquiry()
          ?.total ?? 0,
    }));


  ngOnInit(): void {

    this.poFacade
      .supplierSearch
      .set('');

    this.poFacade
      .itemSearch
      .set('');


    /*
     * PO ENTRY MODE
     */
    if (this.context) {

      this.loadItemUms(
        this.context.itemCode,
        this.context.poUm
      );

      this.load();
    }
  }


  /* =========================================================
     SUPPLIER
     ========================================================= */

  onSupplierFilterChange(
  value: string
): void {
  this.supplierFilterText.set(
    String(value ?? '')
  );
}


  onSupplierValueChange(
    supplierCode: string | null
  ): void {

    const code =
      String(
        supplierCode ?? ''
      ).trim();

    this.searchForm.patchValue({
      supplierCode: code,
    });

    this.clearResult();
  }


  /* =========================================================
     ITEM
     ========================================================= */

  onItemFilterChange(
    value: string
  ): void {

    this.poFacade
      .itemSearch
      .set(
        String(value ?? '').trim()
      );
  }


  onItemValueChange(
    itemCode: string | null
  ): void {

    const code =
      String(
        itemCode ?? ''
      ).trim();


    this.searchForm.patchValue({
      itemCode: code,
      poUm: '',
    });


    this.itemUms.set([]);

    this.clearResult();


    if (!code) {
      return;
    }


    this.loadItemUms(code);
  }


  /* =========================================================
     U/M
     ========================================================= */

  onUmChange(
    poUm: string | null
  ): void {

    this.searchForm.patchValue({
      poUm:
        String(
          poUm ?? ''
        ).trim(),
    });

    this.clearResult();
  }


  /* =========================================================
     SEARCH
     ========================================================= */

  search(): void {

    if (
      this.searchForm.invalid ||
      this.loading()
    ) {

      this.searchForm
        .markAllAsTouched();

      this.error.set(
        'Please select Supplier, Item and PO U/M.'
      );

      return;
    }


    const raw =
      this.searchForm.getRawValue();


    const supplierCode =
      String(
        raw.supplierCode ?? ''
      ).trim();


    const itemCode =
      String(
        raw.itemCode ?? ''
      ).trim();


    const poUm =
      String(
        raw.poUm ?? ''
      ).trim();


    const supplier =
      this.findSupplier(
        supplierCode
      );


    const item =
      this.findItem(
        itemCode
      );


    const um =
      this.itemUms().find(
        (row) =>
          String(row.poUm)
            .trim()
            .toUpperCase() ===
          poUm.toUpperCase()
      );


    this.standaloneContext.set({

      poNo: null,

      supplierCode,

      supplierName:
        supplier?.suppName ?? '',

      itemCode,

      itemDescription:
        item?.itemDesc ?? '',

      poUm,

      poConvFactor:
        Number(
          um?.conversionFactor ??
          item?.poConvFactor ??
          1
        ),

      actualUnitPrice:
        Number(
          item?.unitPrice ?? 0
        ),

      editable: false,
    });


    this.skip.set(0);

    this.load();
  }


  clearSearch(): void {

    this.searchForm.reset({
    supplierCode: '',
    itemCode: '',
    poUm: '',
  });

  this.supplierFilterText.set('');

  this.itemUms.set([]);
  
    this.standaloneContext.set(
      null
    );

    this.clearResult();


    this.poFacade
      .supplierSearch
      .set('');


    this.poFacade
      .itemSearch
      .set('');
  }


  /* =========================================================
     CLOSE
     ========================================================= */

  close(): void {

    this.dialogOpen.set(false);


    /*
     * Opened from PO Entry
     */
    if (this.context) {

      this.closed.emit();

      return;
    }


    /*
     * Opened from sidebar
     */
    setTimeout(() => {

      void this.router.navigate([
        '/order/po-listing',
      ]);

    }, 0);
  }


  /* =========================================================
     USE PRICE
     ========================================================= */

  useSuggested(): void {

    const ctx =
      this.activeContext();


    const price =
      this.inquiry()
        ?.resolution
        ?.suggestedPrice;


    if (
      !ctx ||
      !this.context ||
      !ctx.editable ||
      price === null ||
      price === undefined
    ) {
      return;
    }


    this.priceSelected.emit(
      price
    );
  }


  /* =========================================================
     PAGE
     ========================================================= */

  pageChange(
    event: PageChangeEvent
  ): void {

    this.skip.set(
      event.skip
    );

    this.load();
  }


  /* =========================================================
     SAVE MASTER
     ========================================================= */

  saveMaster(): void {

    const ctx =
      this.activeContext();


    if (!ctx) {

      this.error.set(
        'Select Supplier, Item and U/M first.'
      );

      return;
    }


    if (
      !this.mayMaintain() ||
      this.priceForm.invalid ||
      this.saving()
    ) {

      this.priceForm
        .markAllAsTouched();

      return;
    }


    const raw =
      this.priceForm.getRawValue();


    const request:
      SupplierPriceUpsertRequest = {

        supplierCode:
          ctx.supplierCode,

        itemCode:
          ctx.itemCode,

        poUm:
          ctx.poUm,

        unitPrice:
          Number(
            raw.unitPrice ?? 0
          ),

        effectiveDate:
          this.toDateOnly(
            raw.effectiveDate ??
            new Date()
          ),

        isActive:
          raw.isActive === true,

        remarks:
          this.emptyToNull(
            raw.remarks
          ),

        sourceReference:
          ctx.poNo,

        expectedRowVersion:
          this.inquiry()
            ?.resolution
            ?.configuredSupplierRowVersion ??
          null,
      };


    this.saving.set(true);

    this.error.set(null);


    this.facade
      .upsert(request)
      .pipe(

        takeUntilDestroyed(
          this.destroyRef
        ),

        finalize(() =>
          this.saving.set(false)
        ),
      )

      .subscribe({

        next: (result) => {

          this.notify.success(

            result.wasChanged
              ? 'Supplier price master and history were updated.'
              : 'Supplier price master already contains the same values.',

            'Supplier Price Saved',

            ctx.poNo ?? '',

            'Purchase Order Price Inquiry',
          );


          this.load();
        },


        error: (error: unknown) => {

          this.error.set(
            this.errorMessage(
              error
            )
          );
        },
      });
  }


  /* =========================================================
     VARIANCE
     ========================================================= */

  varianceAmount(): number | null {

    const ctx =
      this.activeContext();

    const suggested =
      this.inquiry()
        ?.resolution
        ?.suggestedPrice;


    if (
      !ctx ||
      suggested === null ||
      suggested === undefined
    ) {
      return null;
    }


    return (
      ctx.actualUnitPrice -
      suggested
    );
  }


  variancePercent(): number | null {

    const ctx =
      this.activeContext();

    const suggested =
      this.inquiry()
        ?.resolution
        ?.suggestedPrice;


    if (
      !ctx ||
      suggested === null ||
      suggested === undefined ||
      suggested === 0
    ) {
      return null;
    }


    return (
      (
        (
          ctx.actualUnitPrice -
          suggested
        )
        /
        suggested
      )
      *
      100
    );
  }


  sourceLabel(
    source: string
  ): string {

    const labels:
      Record<string, string> = {

        SUPPLIER_MASTER:
          'Supplier price master',

        LEGACY_DEFAULT:
          'Legacy item default',

        LAST_ACTUAL_PO:
          'Last actual PO price',

        NONE:
          'No suggested price',

        INVALID_UM:
          'Invalid item / U/M',
      };


    return (
      labels[source] ??
      source
    );
  }


  /* =========================================================
     LOAD U/M
     ========================================================= */

  private loadItemUms(
    itemCode: string,
    preferredUm?: string
  ): void {

    const code =
      String(
        itemCode ?? ''
      ).trim();


    if (!code) {

      this.itemUms.set([]);

      return;
    }


    this.umLoading.set(true);


    this.facade
      .getItemUms(code)
      .pipe(

        takeUntilDestroyed(
          this.destroyRef
        ),

        finalize(() =>
          this.umLoading.set(false)
        ),
      )

      .subscribe({

        next: (rows) => {

          console.log(
    'SELECTED ITEM CODE:',
    code
  );

  console.log(
    'PO U/M FROM API:',
    rows
  );


          const data =
            rows ?? [];


          this.itemUms.set(
            data
          );


          /*
           * Sidebar mode.
           * Auto-select one U/M.
           */
          if (
            !this.context &&
            data.length === 1
          ) {

            this.searchForm.patchValue(
              {
                poUm:
                  data[0].poUm,
              },
              {
                emitEvent: false,
              }
            );
          }


          /*
           * Preferred U/M if provided.
           */
          if (
            !this.context &&
            preferredUm
          ) {

            const found =
              data.some(
                (row) =>
                  String(row.poUm)
                    .trim()
                    .toUpperCase() ===
                  String(preferredUm)
                    .trim()
                    .toUpperCase()
              );


            if (found) {

              this.searchForm.patchValue(
                {
                  poUm:
                    preferredUm,
                },
                {
                  emitEvent: false,
                }
              );
            }
          }


          if (
            !this.context &&
            data.length === 0
          ) {

            this.error.set(
              'No Purchase U/M was found for the selected item.'
            );
          }
        },


        error: (error: unknown) => {

          this.itemUms.set([]);

          this.error.set(
            this.errorMessage(
              error
            )
          );
        },
      });
  }


  /* =========================================================
     LOAD
     ========================================================= */

  private load(): void {

    const ctx =
      this.activeContext();


    if (!ctx) {
      return;
    }


    const supplierCode =
      String(
        ctx.supplierCode ?? ''
      ).trim();


    const itemCode =
      String(
        ctx.itemCode ?? ''
      ).trim();


    const poUm =
      String(
        ctx.poUm ?? ''
      ).trim();


    if (
      !supplierCode ||
      !itemCode ||
      !poUm
    ) {

      this.error.set(
        'Supplier, Item and PO U/M are required.'
      );

      return;
    }


    this.loading.set(true);

    this.error.set(null);


    this.facade
      .inquiry(
        supplierCode,
        itemCode,
        poUm,
        this.skip(),
        this.pageSize,
      )
      .pipe(

        takeUntilDestroyed(
          this.destroyRef
        ),

        finalize(() =>
          this.loading.set(false)
        ),
      )

      .subscribe({

        next: (result) => {

          this.inquiry.set(
            result
          );


          const resolution =
            result.resolution;


          this.priceForm.patchValue(
            {

              unitPrice:
                resolution
                  .configuredSupplierMasterPrice ??
                resolution
                  .suggestedPrice ??
                ctx.actualUnitPrice,

              effectiveDate:
                resolution
                  .configuredSupplierEffectiveDate
                  ? new Date(
                      resolution
                        .configuredSupplierEffectiveDate
                    )
                  : new Date(),

              isActive:
                resolution
                  .configuredSupplierIsActive ??
                true,

              remarks:
                resolution
                  .configuredSupplierRemarks ??
                '',
            },

            {
              emitEvent: false,
            }
          );
        },


        error: (error: unknown) => {

          this.error.set(
            this.errorMessage(
              error
            )
          );
        },
      });
  }


  /* =========================================================
     HELPERS
     ========================================================= */

  private clearResult(): void {

    this.inquiry.set(
      null
    );

    this.error.set(
      null
    );

    this.skip.set(
      0
    );
  }


  private findSupplier(
    code: string
  ): SupplierLookup | undefined {

    return (
      this.poFacade
        .suppliers() ?? []
    ).find(

      (row) =>

        String(row.suppCode)
          .trim()
          .toUpperCase() ===
        code.toUpperCase()
    );
  }


  private findItem(
    code: string
  ): ItemLookup | undefined {

    return (
      this.poFacade
        .itemLookupData() ?? []
    ).find(

      (row) =>

        String(row.itemCode)
          .trim()
          .toUpperCase() ===
        code.toUpperCase()
    );
  }


  private toDateOnly(
    value: Date
  ): string {

    const year =
      value.getFullYear();

    const month =
      String(
        value.getMonth() + 1
      ).padStart(
        2,
        '0'
      );

    const day =
      String(
        value.getDate()
      ).padStart(
        2,
        '0'
      );


    return (
      `${year}-${month}-${day}`
    );
  }


  private emptyToNull(
    value:
      | string
      | null
      | undefined
  ): string | null {

    const normalized =
      String(
        value ?? ''
      ).trim();


    return (
      normalized ||
      null
    );
  }


  private errorMessage(
    error: unknown
  ): string {

    const response =
      error as {

        error?:
          | {
              detail?: string;
              message?: string;
              title?: string;
            }
          | string;

        message?: string;
      };


    if (
      typeof response.error ===
      'string'
    ) {
      return response.error;
    }


    return (
      response.error?.detail ??
      response.error?.message ??
      response.error?.title ??
      response.message ??
      'Unable to load purchase pricing.'
    );
  }
}