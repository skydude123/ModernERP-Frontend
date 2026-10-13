import { Injectable, computed, inject, signal } from '@angular/core';

import { rxResource } from '@angular/core/rxjs-interop';

import {
  Observable,
  Subscription,
  catchError,
  finalize,
  tap,
  throwError,
} from 'rxjs';

import {
  ItemGroupLookup,
  ItemMasterListFilter,
  ItemMasterListItem,
  ItemMasterUpsertRequest,
  ItemMasterUpsertResponse,
  ItemUmLookup,
} from './item-master.model';

import { ItemMasterApiService } from './item-master-api.service';

@Injectable()
export class ItemMasterFacade {
  /*
   * ============================================================
   * API
   * ============================================================
   */

  private readonly api = inject(ItemMasterApiService);

  /*
   * ============================================================
   * ITEM MASTER GRID STATE
   * ============================================================
   */

  private readonly itemsState = signal<ItemMasterListItem[]>([]);

  /*
   * Total matching records in SQL.
   *
   * Example:
   *
   * Current page:
   * 20
   *
   * Total:
   * 6509
   */
  private readonly totalState = signal(0);

  private readonly loadingState = signal(false);

  private readonly savingState = signal(false);

  private readonly errorState = signal<string | null>(null);

  private loadSubscription:
  Subscription | null = null;

  private loadRequestId = 0;

  private readonly successMessageState = signal<string | null>(null);

  /*
   * ============================================================
   * PUBLIC STATE
   * ============================================================
   */

  readonly items = computed(() => this.itemsState());

  readonly total = computed(() => this.totalState());

  readonly loading = computed(() => this.loadingState());

  readonly saving = computed(() => this.savingState());

  readonly error = computed(() => this.errorState());

  readonly successMessage = computed(() => this.successMessageState());

  /*
   * ============================================================
   * ITEM GROUP LOOKUP
   * ============================================================
   */

  readonly itemGroupLookupResource = rxResource<
    ItemGroupLookup[],
    {
      includeAll: boolean;
    }
  >({
    params: () => ({
      includeAll: false,
    }),

    stream: ({ params }) => {
      return this.api.getItemGroupLookup(params.includeAll);
    },

    defaultValue: [],
  });

  readonly itemGroups = computed(() => {
    const value = this.itemGroupLookupResource.value();

    return Array.isArray(value) ? value : [];
  });

  readonly itemGroupsLoading = computed(() => {
    return this.itemGroupLookupResource.isLoading();
  });

  readonly itemGroupsError = computed(() => {
    return this.itemGroupLookupResource.error();
  });

  reloadItemGroups(): void {
    this.itemGroupLookupResource.reload();
  }

  /*
   * ============================================================
   * UNIT OF MEASURE LOOKUP
   * ============================================================
   */

  readonly itemUmLookupResource = rxResource<ItemUmLookup[], void>({
    stream: () => {
      return this.api.getItemUmLookup();
    },

    defaultValue: [],
  });

  readonly itemUms = computed(() => {
    const value = this.itemUmLookupResource.value();

    return Array.isArray(value) ? value : [];
  });

  readonly itemUmsLoading = computed(() => {
    return this.itemUmLookupResource.isLoading();
  });

  reloadItemUms(): void {
    this.itemUmLookupResource.reload();
  }

  /*
   * ============================================================
   * LOAD ITEM MASTER
   * SERVER-SIDE PAGING
   * ============================================================
   */

  /*
 * ============================================================
 * LOAD ITEM MASTER
 * SERVER-SIDE PAGING / SEARCH / SORT
 * ============================================================
 */
load(
  filter: ItemMasterListFilter
): void {

  /*
   * ------------------------------------------------------------
   * Cancel previous Grid request.
   * ------------------------------------------------------------
   *
   * Example:
   *
   * User types:
   *
   * B
   * BE
   * BEA
   * BEAR
   * BEARING
   *
   * Only the newest request should be allowed to update
   * the Item Master Grid.
   */
  this.loadSubscription?.unsubscribe();


  /*
   * Create a unique identifier for this request.
   */
  const requestId =
    ++this.loadRequestId;


  this.loadingState.set(true);

  this.errorState.set(null);


  /*
   * Normalize the filter before sending it to the API.
   */
  const normalizedFilter:
    ItemMasterListFilter = {

      search:
        filter.search?.trim() || null,

      groupCode:
        filter.groupCode?.trim() || null,

      itemType:
        filter.itemType?.trim() || null,

      active:
        filter.active ?? 'Y',

      skip:
        Math.max(
          0,
          Number(filter.skip ?? 0)
        ),

      take:
        Math.min(
          100,
          Math.max(
            1,
            Number(filter.take ?? 20)
          )
        ),

      sortField:
        filter.sortField || 'itemCode',

      sortDir:
        filter.sortDir === 'desc'
          ? 'desc'
          : 'asc'
    };


  this.loadSubscription =
    this.api
      .getList(normalizedFilter)
      .pipe(

        finalize(() => {

          /*
           * Do not allow an old cancelled request
           * to switch off the loading state of
           * the newest request.
           */
          if (
            requestId ===
            this.loadRequestId
          ) {

            this.loadingState.set(false);
          }
        })
      )
      .subscribe({

        /*
         * ========================================================
         * SUCCESS
         * ========================================================
         */
        next: (result) => {

          /*
           * Ignore stale responses.
           */
          if (
            requestId !==
            this.loadRequestId
          ) {
            return;
          }


          /*
           * API returned success = false.
           */
          if (
            !result ||
            !result.success
          ) {

            this.itemsState.set([]);

            this.totalState.set(0);

            this.showError(
              result?.message ||
              'Unable to load Item Master records.'
            );

            return;
          }


          /*
           * Current server page.
           *
           * IMPORTANT:
           * This is not client-side search.
           * SQL already searched the complete matching
           * Item Master dataset before returning this page.
           */
          this.itemsState.set(
            Array.isArray(result.data)
              ? result.data
              : []
          );


          /*
           * Total matching records from SQL.
           *
           * Example:
           *
           * Search = "BEARING"
           *
           * SQL found = 87
           *
           * Current page = 20
           *
           * totalState = 87
           *
           * Kendo will therefore show all matching
           * pages, not only the first 20 records.
           */
          this.totalState.set(
            Number(
              result.total ?? 0
            )
          );
        },


        /*
         * ========================================================
         * HTTP / NETWORK / SQL ERROR
         * ========================================================
         */
        error: (
          error: unknown
        ) => {

          /*
           * Ignore errors belonging to an old
           * cancelled request.
           */
          if (
            requestId !==
            this.loadRequestId
          ) {
            return;
          }


          this.itemsState.set([]);

          this.totalState.set(0);


          this.showError(
            this.getErrorMessage(
              error,
              'Unable to load Item Master records.'
            )
          );
        }
      });
}

  // load(filter: ItemMasterListFilter): void {
  //   this.loadingState.set(true);

  //   this.errorState.set(null);

  //   this.api
  //     .getList(filter)
  //     .pipe(
  //       finalize(() => {
  //         this.loadingState.set(false);
  //       }),
  //     )
  //     .subscribe({
  //       /*
  //        * ======================================================
  //        * SUCCESS
  //        * ======================================================
  //        */

  //       next: (result) => {
  //         /*
  //          * Valid HTTP request but API
  //          * reported success = false.
  //          */
  //         if (!result || !result.success) {
  //           this.itemsState.set([]);

  //           this.totalState.set(0);

  //           this.showError(
  //             result?.message || 'Unable to load Item Master records.',
  //           );

  //           return;
  //         }

  //         /*
  //          * Current Grid page.
  //          */
  //         this.itemsState.set(Array.isArray(result.data) ? result.data : []);

  //         /*
  //          * Total matching records.
  //          */
  //         this.totalState.set(Number(result.total ?? 0));
  //       },

  //       /*
  //        * ======================================================
  //        * HTTP / NETWORK / SQL ERROR
  //        * ======================================================
  //        */

  //       error: (error: unknown) => {
  //         this.itemsState.set([]);

  //         this.totalState.set(0);

  //         this.showError(
  //           this.getErrorMessage(error, 'Unable to load Item Master records.'),
  //         );
  //       },
  //     });
  // }

  /*
   * ============================================================
   * SAVE / UPDATE
   * ============================================================
   */

  upsert(
    request: ItemMasterUpsertRequest,
  ): Observable<ItemMasterUpsertResponse> {
    this.savingState.set(true);

    this.errorState.set(null);

    this.successMessageState.set(null);

    return this.api.upsert(request).pipe(
      /*
       * ======================================================
       * SUCCESS
       * ======================================================
       */

      tap((result) => {
        if (!result?.success || !result?.item) {
          throw new Error(
            result?.message ||
              'The server did not return the saved inventory item.',
          );
        }

        /*
         * Immediately update current
         * local Grid page.
         */
        this.applySavedItem(result.item);

        this.showSuccess(
          result.message || 'Inventory item saved successfully.',
        );
      }),

      /*
       * ======================================================
       * ERROR
       * ======================================================
       */

      catchError((error) => {
        this.showError(
          this.getErrorMessage(error, 'Unable to save inventory item.'),
        );

        return throwError(() => error);
      }),

      /*
       * ======================================================
       * FINISH
       * ======================================================
       */

      finalize(() => {
        this.savingState.set(false);
      }),
    );
  }

  /*
   * ============================================================
   * APPLY SAVED ITEM
   * ============================================================
   */

  private applySavedItem(savedItem: ItemMasterListItem): void {
    const normalizedCode = String(savedItem.itemCode || '')
      .trim()
      .toUpperCase();

    if (!normalizedCode) {
      return;
    }

    this.itemsState.update((currentItems) => {
      /*
       * ====================================================
       * FIND ITEM
       * ====================================================
       */

      const existingIndex = currentItems.findIndex((item) => {
        return (
          String(item.itemCode || '')
            .trim()
            .toUpperCase() === normalizedCode
        );
      });

      /*
       * ====================================================
       * UPDATE EXISTING CURRENT PAGE ROW
       * ====================================================
       */

      if (existingIndex >= 0) {
        const nextItems = [...currentItems];

        nextItems[existingIndex] = {
          ...savedItem,
        };

        return nextItems;
      }

      /*
       * ====================================================
       * NEW ACTIVE ITEM
       * ====================================================
       *
       * Temporarily insert locally.
       *
       * The component should reload
       * the current server page after save.
       * ====================================================
       */

      if (savedItem.active === 'Y') {
        return [
          {
            ...savedItem,
          },

          ...currentItems,
        ].sort((a, b) => {
          return String(a.itemCode || '').localeCompare(
            String(b.itemCode || ''),
          );
        });
      }

      return currentItems;
    });
  }

  /*
   * ============================================================
   * ERROR MESSAGE PARSER
   * ============================================================
   */

  private getErrorMessage(error: unknown, fallback: string): string {
    /*
     * ==========================================================
     * STANDARD JAVASCRIPT ERROR
     * ==========================================================
     */

    if (error instanceof Error) {
      const message = String(error.message || '').trim();

      if (message) {
        return message;
      }
    }

    /*
     * ==========================================================
     * HTTP RESPONSE OBJECT
     * ==========================================================
     */

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

      /*
       * ========================================================
       * PLAIN STRING ERROR
       * ========================================================
       */

      if (typeof response.error === 'string') {
        const message = response.error.trim();

        if (message) {
          return message;
        }
      }

      /*
       * ========================================================
       * API ERROR OBJECT
       * ========================================================
       */

      if (typeof response.error === 'object' && response.error !== null) {
        const apiMessage =
          response.error.message ||
          response.error.detail ||
          response.error.error;

        if (apiMessage?.trim()) {
          return apiMessage.trim();
        }

        /*
         * ======================================================
         * ASP.NET VALIDATION PROBLEM DETAILS
         * ======================================================
         */

        if (response.error.errors) {
          const validationMessages = Object.values(response.error.errors)

            .flatMap((entry) => {
              return Array.isArray(entry) ? entry : [entry];
            })

            .map((entry) => {
              return String(entry || '').trim();
            })

            .filter((entry) => {
              return entry.length > 0;
            });

          if (validationMessages.length > 0) {
            return validationMessages.join(' ');
          }
        }

        /*
         * API title fallback.
         */
        if (response.error.title?.trim()) {
          return response.error.title.trim();
        }
      }

      /*
       * ========================================================
       * NETWORK ERROR
       * ========================================================
       */

      if (response.status === 0) {
        return (
          'Unable to connect to the server. ' +
          'Check your network connection and confirm that the API is running.'
        );
      }

      /*
       * ========================================================
       * ANGULAR ERROR MESSAGE
       * ========================================================
       */

      if (response.message?.trim()) {
        return response.message.trim();
      }

      /*
       * ========================================================
       * HTTP STATUS TEXT
       * ========================================================
       */

      if (response.statusText?.trim()) {
        return response.statusText.trim();
      }
    }

    return fallback;
  }

  /*
   * ============================================================
   * DISPLAY ERROR
   * ============================================================
   */

  showError(message: string): void {
    this.errorState.set(message);

    this.successMessageState.set(null);

    window.setTimeout(
      () => {
        if (this.errorState() === message) {
          this.errorState.set(null);
        }
      },

      5000,
    );
  }

  /*
   * ============================================================
   * DISPLAY SUCCESS
   * ============================================================
   */

  showSuccess(message: string): void {
    this.successMessageState.set(message);

    this.errorState.set(null);

    window.setTimeout(
      () => {
        if (this.successMessageState() === message) {
          this.successMessageState.set(null);
        }
      },

      5000,
    );
  }
}
