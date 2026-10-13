import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Input,
  OnInit,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { ButtonsModule } from '@progress/kendo-angular-buttons';

import {
  GridModule,
  SelectionEvent,
} from '@progress/kendo-angular-grid';

import { InputsModule } from '@progress/kendo-angular-inputs';

import { PurchasePriceFacade } from './purchase-price.facade';

import {
  SupplierPriceListItem,
} from './purchase-price.model';


@Component({
  selector: 'app-supplier-price-list',
  standalone: true,

  imports: [
    CommonModule,
    ButtonsModule,
    GridModule,
    InputsModule,
  ],

  templateUrl: './supplier-price-list.component.html',
  styleUrls: ['./supplier-price-list.component.scss'],

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupplierPriceListComponent implements OnInit {

  /*
   * Supplier information passed from Purchase Order Entry.
   */
  @Input()
  supplierCode: string | null = null;

  @Input()
  supplierName: string | null = null;


  /*
   * Selected price returned back to Purchase Order Entry.
   */
  readonly selected =
    output<SupplierPriceListItem>();

  readonly closed =
    output<void>();


  private readonly pricing =
    inject(PurchasePriceFacade);

  private readonly destroyRef =
    inject(DestroyRef);


  /*
   * State
   */
  readonly searchText =
    signal('');

  readonly prices =
    signal<SupplierPriceListItem[]>([]);

  readonly selectedItem =
    signal<SupplierPriceListItem | null>(null);

  readonly loading =
    signal(false);

  readonly error =
    signal<string | null>(null);


  /*
   * Local filtering only.
   */
  readonly filteredPrices =
    computed(() => {

      const search =
        this.searchText()
          .trim()
          .toLowerCase();

      const source =
        this.prices();


      if (!search) {
        return source;
      }


      return source.filter(
        (item) =>
          [
            item.itemCode,
            item.itemDescription,
            item.poUm,
            item.baseUm,
          ].some(
            (value) =>
              String(
                value ?? ''
              )
                .trim()
                .toLowerCase()
                .includes(search)
          )
      );
    });


  ngOnInit(): void {
    this.loadPrices();
  }


  /* =========================================================
     SEARCH
     ========================================================= */

  onSearchChange(
    value: string
  ): void {

    this.searchText.set(
      String(
        value ?? ''
      )
    );


    this.selectedItem.set(
      null
    );
  }


  onSearchInput(
    event: Event
  ): void {

    const target =
      event.target;


    this.onSearchChange(
      target instanceof HTMLInputElement
        ? target.value
        : ''
    );
  }


  /* =========================================================
     GRID SELECTION
     ========================================================= */

  onSelectionChange(
    event: SelectionEvent
  ): void {

    const item =
      event.selectedRows?.[0]?.dataItem as
        | SupplierPriceListItem
        | undefined;


    this.selectedItem.set(
      item ?? null
    );
  }


  /* =========================================================
     REFRESH
     ========================================================= */

  refresh(): void {

    if (
      this.loading()
    ) {
      return;
    }


    this.loadPrices();
  }


  /* =========================================================
     USE SELECTED
     ========================================================= */

  useSelected(): void {

    const item =
      this.selectedItem();


    if (!item) {
      return;
    }


    this.selected.emit(
      item
    );
  }


  useItem(
    item: SupplierPriceListItem
  ): void {

    this.selectedItem.set(
      item
    );


    this.selected.emit(
      item
    );
  }


  /* =========================================================
     LOAD PRICE LIST
     ========================================================= */

// private loadPrices(): void {
//   const supplierCode =
//     String(this.supplierCode ?? '').trim();

//   this.prices.set([]);
//   this.selectedItem.set(null);
//   this.error.set(null);

//   if (!supplierCode) {
//     this.error.set(
//       'Supplier code is required.'
//     );

//     return;
//   }

//   this.loading.set(true);

//   this.pricing
//     .getSupplierPriceList(supplierCode)
//     .pipe(
//       takeUntilDestroyed(
//         this.destroyRef
//       ),

//       finalize(() =>
//         this.loading.set(false)
//       ),
//     )
//     .subscribe({
//       next: (rows) => {
//         this.prices.set(
//           rows ?? []
//         );
//       },

//       error: (error: unknown) => {
//         this.error.set(
//           this.errorMessage(error)
//         );
//       },
//     });
// }

private loadPrices(): void {
  this.prices.set([]);
  this.selectedItem.set(null);
  this.error.set(null);

  this.loading.set(true);

  this.pricing
    .getSupplierPriceList()
    .pipe(
      takeUntilDestroyed(this.destroyRef),

      finalize(() =>
        this.loading.set(false)
      ),
    )
    .subscribe({
      next: (rows) => {
        this.prices.set(
          rows ?? []
        );
      },

      error: (error: unknown) => {
        this.error.set(
          this.errorMessage(error)
        );
      },
    });
}


  /* =========================================================
     ERROR
     ========================================================= */

  private errorMessage(
    error: unknown
  ): string {

    if (
      error instanceof
      HttpErrorResponse
    ) {

      const detail =
        typeof error.error === 'object' &&
        error.error !== null

          ? String(
              error.error.detail ??
              error.error.message ??
              ''
            ).trim()

          : '';


      return (
        detail ||
        'Unable to load item master price list.'
      );
    }


    return (
      'Unable to load item master price list.'
    );
  }
}