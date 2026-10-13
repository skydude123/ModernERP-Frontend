import { Injectable, inject } from '@angular/core';

import { PurchasePriceService } from './purchase-price.service';
import {
  PurchasePriceHistoryQuery,
  SupplierPriceUpsertRequest,
} from './purchase-price.model';

@Injectable({ providedIn: 'root' })
export class PurchasePriceFacade {
  private readonly api = inject(PurchasePriceService);

  getItemUms(itemCode: string) {
    return this.api.getItemUms(itemCode);
  }

// getSupplierPriceList(supplierCode: string) {
//   return this.api.getSupplierPriceList(supplierCode);
// }

getSupplierPriceList() {
  return this.api.getSupplierPriceList();
}

  resolve(supplierCode: string, itemCode: string, poUm: string) {
    return this.api.resolve(supplierCode, itemCode, poUm);
  }

  inquiry(
    supplierCode: string,
    itemCode: string,
    poUm: string,
    skip: number,
    take: number,
  ) {
    return this.api.getInquiry(supplierCode, itemCode, poUm, skip, take);
  }

  upsert(request: SupplierPriceUpsertRequest) {
    return this.api.upsertCurrent(request);
  }

  masterHistory(query: PurchasePriceHistoryQuery) {
    return this.api.getMasterHistory(query);
  }

  actualPoHistory(query: PurchasePriceHistoryQuery) {
    return this.api.getActualPoHistory(query);
  }
}
