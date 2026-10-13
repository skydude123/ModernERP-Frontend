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

import { PurchaseOrderFacade } from '../purchase-order.facade';

import {
  ItemLookup,
  SupplierLookup,
} from '../purchase-order.model';

import { PurchasePriceFacade } from './purchase-price.facade';

import {
  ActualPoPriceHistoryRecord,
  PurchasePriceDialogContext,
  PurchasePriceHistoryQuery,
  PurchasePriceItemUm,
  SupplierPriceHistoryRecord,
} from './purchase-price.model';

@Component({
  selector: 'app-price-history-dialog',
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

  templateUrl: './price-history-dialog.component.html',
  styleUrls: ['./price-history-dialog.component.scss'],

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PriceHistoryDialogComponent
  implements OnInit {

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

  private readonly destroyRef =
    inject(DestroyRef);

  private readonly fb =
    inject(FormBuilder);

  private readonly router =
    inject(Router);


  readonly dialogOpen =
    signal(true);

  readonly standaloneContext =
    signal<PurchasePriceDialogContext | null>(null);


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


  readonly umLoading =
    signal(false);


  readonly searchForm =
    this.fb.group({
      supplierCode: [''],

      itemCode: [
        '',
        Validators.required,
      ],

      poUm: [
        '',
        Validators.required,
      ],
    });


  readonly filterForm =
    this.fb.group({
      fromDate: [
        new Date(
          new Date().getFullYear() - 1,
          0,
          1
        ),
      ],

      toDate: [
        new Date(),
      ],
    });


  readonly masterRows =
    signal<
      SupplierPriceHistoryRecord[]
    >([]);


  readonly actualRows =
    signal<
      ActualPoPriceHistoryRecord[]
    >([]);


  readonly masterTotal =
    signal(0);

  readonly actualTotal =
    signal(0);


  readonly masterSkip =
    signal(0);

  readonly actualSkip =
    signal(0);


  readonly masterLoading =
    signal(false);

  readonly actualLoading =
    signal(false);


  readonly error =
    signal<string | null>(null);


  readonly pageSize =
    10;


  readonly masterData =
    computed<GridDataResult>(() => ({
      data:
        this.masterRows(),

      total:
        this.masterTotal(),
    }));


  readonly actualData =
    computed<GridDataResult>(() => ({
      data:
        this.actualRows(),

      total:
        this.actualTotal(),
    }));


  readonly totalRecords =
    computed(() =>
      this.masterTotal() +
      this.actualTotal()
    );


  readonly isLoading =
    computed(() =>
      this.masterLoading() ||
      this.actualLoading()
    );


  ngOnInit(): void {

    this.poFacade
      .supplierSearch
      .set('');

    this.poFacade
      .itemSearch
      .set('');


    if (this.context) {

      this.loadItemUms(
        this.context.itemCode
      );

      this.reload();
    }
  }


onSupplierFilterChange(
  value: string
): void {
  this.supplierFilterText.set(
    String(value ?? '')
  );
}


  onItemFilterChange(
    value: string
  ): void {

    this.poFacade
      .itemSearch
      .set(
        String(value ?? '').trim()
      );
  }


  onSupplierValueChange(
    value: string | null
  ): void {

    this.searchForm.patchValue({
      supplierCode:
        String(
          value ?? ''
        ).trim(),
    });


    this.clearResults();
  }


  onItemValueChange(
    value: string | null
  ): void {

    const code =
      String(
        value ?? ''
      ).trim();


    this.searchForm.patchValue({
      itemCode: code,
      poUm: '',
    });


    this.itemUms.set([]);

    this.clearResults();


    if (code) {

      this.loadItemUms(
        code
      );
    }
  }


  onUmChange(
    value: string | null
  ): void {

    this.searchForm.patchValue({
      poUm:
        String(
          value ?? ''
        ).trim(),
    });


    this.clearResults();
  }


  search(): void {

    if (
      this.searchForm.invalid
    ) {

      this.searchForm
        .markAllAsTouched();

      this.error.set(
        'Please select Item and PO U/M.'
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


    this.reload();
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


    this.clearResults();


    this.poFacade
      .supplierSearch
      .set('');


    this.poFacade
      .itemSearch
      .set('');
  }


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


  reload(): void {

    const ctx =
      this.activeContext();


    if (!ctx) {

      this.error.set(
        'Select Item and PO U/M first.'
      );

      return;
    }


    if (
      !String(
        ctx.itemCode ?? ''
      ).trim() ||
      !String(
        ctx.poUm ?? ''
      ).trim()
    ) {

      this.error.set(
        'Item and PO U/M are required.'
      );

      return;
    }


    const raw =
      this.filterForm.getRawValue();


    if (
      raw.fromDate &&
      raw.toDate &&
      raw.fromDate >
      raw.toDate
    ) {

      this.error.set(
        'From Date cannot be later than To Date.'
      );

      return;
    }


    this.error.set(null);


    this.masterSkip.set(0);

    this.actualSkip.set(0);


    this.loadMaster();

    this.loadActual();
  }


  masterPageChange(
    event: PageChangeEvent
  ): void {

    this.masterSkip.set(
      event.skip
    );


    this.loadMaster();
  }


  actualPageChange(
    event: PageChangeEvent
  ): void {

    this.actualSkip.set(
      event.skip
    );


    this.loadActual();
  }


  canUse(
    supplierCode: string
  ): boolean {

    const ctx =
      this.activeContext();


    if (
      !ctx ||
      !this.context
    ) {
      return false;
    }


    return (
      ctx.editable &&
      String(
        supplierCode
      )
        .trim()
        .toUpperCase() ===
      String(
        ctx.supplierCode
      )
        .trim()
        .toUpperCase()
    );
  }


  use(
    price: number,
    supplierCode: string
  ): void {

    if (
      this.canUse(
        supplierCode
      )
    ) {

      this.priceSelected.emit(
        price
      );
    }
  }


  /* =========================================================
     LOAD U/M
     ========================================================= */

  private loadItemUms(
    itemCode: string
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

          const data =
            rows ?? [];

             console.log(
      'SELECTED ITEM CODE:',
      code
    );

    console.log(
      'PO U/M FROM API:',
      rows
    );


          this.itemUms.set(
            data
          );


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


  private loadMaster(): void {

    this.masterLoading.set(
      true
    );

    this.error.set(
      null
    );


    this.facade
      .masterHistory(
        this.query(
          this.masterSkip()
        )
      )
      .pipe(

        takeUntilDestroyed(
          this.destroyRef
        ),

        finalize(() =>
          this.masterLoading.set(
            false
          )
        ),
      )

      .subscribe({

        next: (result) => {

          this.masterRows.set(
            result.data ?? []
          );

          this.masterTotal.set(
            result.total ?? 0
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


  private loadActual(): void {

    this.actualLoading.set(
      true
    );

    this.error.set(
      null
    );


    this.facade
      .actualPoHistory(
        this.query(
          this.actualSkip()
        )
      )
      .pipe(

        takeUntilDestroyed(
          this.destroyRef
        ),

        finalize(() =>
          this.actualLoading.set(
            false
          )
        ),
      )

      .subscribe({

        next: (result) => {

          this.actualRows.set(
            result.data ?? []
          );

          this.actualTotal.set(
            result.total ?? 0
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


  private query(
    skip: number
  ): PurchasePriceHistoryQuery {

    const ctx =
      this.activeContext();


    if (!ctx) {

      throw new Error(
        'Price history context is required.'
      );
    }


    const raw =
      this.filterForm.getRawValue();


    const supplierCode =
      String(
        ctx.supplierCode ?? ''
      ).trim();


    return {

      supplierCode:
        supplierCode ||
        null,

      itemCode:
        String(
          ctx.itemCode
        ).trim(),

      poUm:
        String(
          ctx.poUm
        ).trim(),

      fromDate:
        raw.fromDate
          ? this.toDateOnly(
              raw.fromDate
            )
          : null,

      toDate:
        raw.toDate
          ? this.toDateOnly(
              raw.toDate
            )
          : null,

      skip,

      take:
        this.pageSize,
    };
  }


  private clearResults(): void {

    this.masterRows.set([]);

    this.actualRows.set([]);

    this.masterTotal.set(0);

    this.actualTotal.set(0);

    this.masterSkip.set(0);

    this.actualSkip.set(0);

    this.error.set(null);
  }


  private findSupplier(
    code: string
  ): SupplierLookup | undefined {

    if (!code) {
      return undefined;
    }


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
      'Unable to load purchase price history.'
    );
  }
}