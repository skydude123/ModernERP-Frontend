import {
  HttpClient,
  HttpParams
} from '@angular/common/http';

import {
  Inject,
  Injectable,
  inject
} from '@angular/core';

import {
  Observable,
  map
} from 'rxjs';

import {
  ItemGroupLookup,
  ItemMasterListFilter,
  ItemMasterPagedResponse,
  ItemMasterUpsertRequest,
  ItemMasterUpsertResponse,
  ItemUmLookup
} from './item-master.model';

import {
  API_BASE_URL
} from '../../core/tokens/api-base-url.token';


@Injectable({
  providedIn: 'root'
})
export class ItemMasterApiService {

  /*
   * ============================================================
   * DEPENDENCIES
   * ============================================================
   */

  private readonly http =
    inject(HttpClient);

  private readonly apiBaseUrl:
    string;


  /*
   * ============================================================
   * CONSTRUCTOR
   * ============================================================
   */

  constructor(
    @Inject(API_BASE_URL)
    apiBaseUrl: string
  ) {

    this.apiBaseUrl =
      this.buildItemMasterBaseUrl(
        apiBaseUrl
      );
  }


  /*
   * ============================================================
   * ITEM MASTER LIST
   * SERVER-SIDE PAGING / SEARCH / SORT
   * ============================================================
   */

  getList(
    filter: ItemMasterListFilter
  ): Observable<ItemMasterPagedResponse> {

    let params =
      new HttpParams()

        .set(
          'active',
          filter.active ?? 'Y'
        )

        .set(
          'skip',
          String(
            filter.skip ?? 0
          )
        )

        .set(
          'take',
          String(
            filter.take ?? 20
          )
        )

        .set(
          'sortField',
          filter.sortField ??
          'itemCode'
        )

        .set(
          'sortDir',
          filter.sortDir ??
          'asc'
        );


    /*
     * Search is optional.
     */
    if (
      filter.search?.trim()
    ) {

      params =
        params.set(
          'search',
          filter.search.trim()
        );
    }


    /*
     * Item Group filter is optional.
     */
    if (
      filter.groupCode?.trim()
    ) {

      params =
        params.set(
          'groupCode',
          filter.groupCode.trim()
        );
    }


    /*
     * Item Type filter is optional.
     */
    if (
      filter.itemType?.trim()
    ) {

      params =
        params.set(
          'itemType',
          filter.itemType.trim()
        );
    }


    return this.http
      .get<ItemMasterPagedResponse>(
        `${this.apiBaseUrl}/list`,
        {
          params
        }
      );
  }


  /*
   * ============================================================
   * ITEM GROUP LOOKUP
   * ============================================================
   */

  getItemGroupLookup(
    includeAll = false
  ): Observable<ItemGroupLookup[]> {

    const params =
      new HttpParams()
        .set(
          'includeAll',
          String(includeAll)
        );


    return this.http
      .get<unknown>(
        `${this.apiBaseUrl}/group-lookup`,
        {
          params
        }
      )
      .pipe(

        map(
          (response) =>
            this.normalizeGroupLookupResponse(
              response
            )
        )
      );
  }


  /*
   * ============================================================
   * ITEM UM LOOKUP
   * ============================================================
   */

  getItemUmLookup():
    Observable<ItemUmLookup[]> {

    return this.http
      .get<unknown>(
        `${this.apiBaseUrl}/um-lookup`
      )
      .pipe(

        map(
          (response) =>
            this.normalizeUmLookupResponse(
              response
            )
        )
      );
  }


  /*
   * ============================================================
   * SAVE / UPDATE
   * ============================================================
   */

  upsert(
    request: ItemMasterUpsertRequest
  ): Observable<ItemMasterUpsertResponse> {

    return this.http
      .post<ItemMasterUpsertResponse>(
        `${this.apiBaseUrl}/save`,
        request
      );
  }


  /*
   * ============================================================
   * BUILD API URL
   * ============================================================
   *
   * Supports:
   *
   * http://localhost:51043
   *
   * http://localhost:51043/api
   *
   * http://localhost:51043/api/item-master
   *
   * ============================================================
   */

  private buildItemMasterBaseUrl(
    apiBaseUrl: string
  ): string {

    const cleanBaseUrl =
      String(
        apiBaseUrl || ''
      )
        .replace(
          /\/+$/,
          ''
        );


    if (
      cleanBaseUrl.endsWith(
        '/api/item-master'
      )
    ) {

      return cleanBaseUrl;
    }


    if (
      cleanBaseUrl.endsWith(
        '/api'
      )
    ) {

      return (
        `${cleanBaseUrl}/item-master`
      );
    }


    return (
      `${cleanBaseUrl}/api/item-master`
    );
  }


  /*
   * ============================================================
   * GROUP LOOKUP NORMALIZATION
   * ============================================================
   */

  private normalizeGroupLookupResponse(
    response: unknown
  ): ItemGroupLookup[] {

    const rows =
      this.extractArray(
        response
      );


    return rows.map(
      (row: any) => ({

        groupCode:
          row.groupCode ??
          row.GroupCode ??
          row.group_code ??
          '',

        groupDesc:
          row.groupDesc ??
          row.GroupDesc ??
          row.group_desc ??
          '',

        displayName:
          row.displayName ??
          row.DisplayName ??
          row.display_name ??
          '',

        sortOrder:
          Number(
            row.sortOrder ??
            row.SortOrder ??
            row.sort_order ??
            0
          )
      })
    );
  }


  /*
   * ============================================================
   * UNIT OF MEASURE NORMALIZATION
   * ============================================================
   */

  private normalizeUmLookupResponse(
    response: unknown
  ): ItemUmLookup[] {

    const rows =
      this.extractArray(
        response
      );


    return rows
      .map(
        (row: any) => ({

          um:
            row.um ??
            row.Um ??
            row.UM ??
            '',

          umDesc:
            row.umDesc ??
            row.UmDesc ??
            row.um_desc ??
            ''
        })
      )
      .filter(
        (row) => {

          return (
            String(
              row.um || ''
            )
              .trim()
              .length > 0
          );
        }
      );
  }


  /*
   * ============================================================
   * GENERIC ARRAY EXTRACTOR
   * ============================================================
   */

  private extractArray(
    response: unknown
  ): any[] {

    /*
     * Direct array.
     */
    if (
      Array.isArray(response)
    ) {

      return response;
    }


    if (
      !response ||
      typeof response !==
      'object'
    ) {

      return [];
    }


    const obj =
      response as any;


    /*
     * {
     *   data: []
     * }
     */
    if (
      Array.isArray(
        obj.data
      )
    ) {

      return obj.data;
    }


    /*
     * {
     *   result: []
     * }
     */
    if (
      Array.isArray(
        obj.result
      )
    ) {

      return obj.result;
    }


    /*
     * {
     *   items: []
     * }
     */
    if (
      Array.isArray(
        obj.items
      )
    ) {

      return obj.items;
    }


    /*
     * {
     *   value: []
     * }
     */
    if (
      Array.isArray(
        obj.value
      )
    ) {

      return obj.value;
    }


    /*
     * {
     *   records: []
     * }
     */
    if (
      Array.isArray(
        obj.records
      )
    ) {

      return obj.records;
    }


    return [];
  }
}