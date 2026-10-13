import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { ExcelExportData } from '@progress/kendo-angular-excel-export';
import {
  EditEvent,
  GridDataResult,
  GridSmartBoxSearchSettings,
  KENDO_GRID,
  KENDO_GRID_EXCEL_EXPORT,
  PageChangeEvent
} from '@progress/kendo-angular-grid';
import { KENDO_TOOLBAR } from '@progress/kendo-angular-toolbar';
import { KENDO_BUTTONS } from '@progress/kendo-angular-buttons';
import { KENDO_DIALOGS } from '@progress/kendo-angular-dialog';
import { KENDO_DROPDOWNS, DropDownFilterSettings } from '@progress/kendo-angular-dropdowns';
import { KENDO_INPUTS } from '@progress/kendo-angular-inputs';
import { KENDO_LABELS } from '@progress/kendo-angular-label';

import {
  SVGIcon,
  cancelIcon,
  saveIcon
} from '@progress/kendo-svg-icons';

import {
  process,
  SortDescriptor
} from '@progress/kendo-data-query';

import {
  takeUntilDestroyed
} from '@angular/core/rxjs-interop';

import {
  debounceTime,
  distinctUntilChanged
} from 'rxjs';

import {
  ItemMasterActiveFlag,
  ItemMasterListItem,
  ItemMasterUpsertRequest
} from './item-master.model';

import { ItemMasterFacade } from './item-master-facade.service';
import { ErpNotificationService } from '../../shared/notification-card/erp-notification.service';
import {
  ItemWarehouseDialogComponent
} from '../item-warehouse/item-warehouse-dialog.component';

interface ItemTypeOption {
  text: string;
  value: string;
}

@Component({
  selector: 'app-inventory-listing',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,

    KENDO_GRID,
    KENDO_GRID_EXCEL_EXPORT,
    KENDO_TOOLBAR,
    KENDO_BUTTONS,
    KENDO_DIALOGS,
    KENDO_DROPDOWNS,
    KENDO_INPUTS,
    KENDO_LABELS,

    ItemWarehouseDialogComponent
  ],
  providers: [
    ItemMasterFacade
  ],
  templateUrl: './inventory-listing.component.html',
  styleUrl: './inventory-listing.component.scss'
})
export class InventoryListingComponent implements OnInit {
  readonly facade = inject(ItemMasterFacade);

 private readonly formBuilder = inject(FormBuilder);
private readonly notify = inject(ErpNotificationService);
private readonly destroyRef = inject(DestroyRef);

  /*
    Kendo button icons used inside the external editing Dialog.
  */
  readonly saveIcon: SVGIcon = saveIcon;
  readonly cancelIcon: SVGIcon = cancelIcon;

  /*
    Only active Item Master records are loaded by default.
  */
  readonly selectedActive: ItemMasterActiveFlag = 'Y';

  /*
    EXTERNAL EDITING STATE

    isEditDialogOpen:
    Controls whether the Add/Edit Kendo Dialog is displayed.

    isNew:
    true  = Add Item
    false = Edit Item
  */
  isEditDialogOpen = false;
  isNew = true;

  /*
    Keeps the original Grid row reference during Edit.

    We do not directly bind the Grid row to the form because we do not
    want the Grid values to change before the API save succeeds.
  */
  private editingSourceItem: ItemMasterListItem | null = null;

  /*
    Warehouse View dialog state.
  */
  selectedViewItem: ItemMasterListItem | null = null;
  showWarehouseDialog = false;

  /*
    Item Type ComboBox options.

    The actual saved value remains F, R, or U.
  */
  readonly itemTypeOptions: ItemTypeOption[] = [
    {
      text: 'Finished Goods',
      value: 'F'
    },
    {
      text: 'Raw Materials',
      value: 'R'
    },
    {
      text: 'Subassembly',
      value: 'S'
    },
    {
      text: 'Phantom',
      value: 'P'
    },
    {
      text: 'Supplies',
      value: 'U'
    }
  ];

  readonly umFilterSettings: DropDownFilterSettings = {
    caseSensitive: false,
    operator: 'contains',
    fields: ['um', 'umDesc']
  };

  /*
    Group Description ComboBox source.

    "ALL" is excluded because this lookup is used for saving an item,
    not for filtering the Grid.
  */
  readonly itemGroupOptions = computed(() => {
    return this.facade.itemGroups().filter((group) => {
      const groupCode = String(group.groupCode || '')
        .trim()
        .toUpperCase();

      return groupCode !== 'ALL';
    });
  });

  readonly totalItemCount = computed(() => {
  return this.facade.total();
});

  // readonly totalItemCount = computed(() => {
  //   return this.facade.items().length;
  // });

  readonly activeItemCount = computed(() => {
  return this.facade.total();
});

  // readonly activeItemCount = computed(() => {
  //   return this.facade.items().filter((item) => {
  //     return item.active === 'Y';
  //   }).length;
  // });

  readonly itemGroupCount = computed(() => {
    return this.itemGroupOptions().length;
  });

  /*
    One Reactive Form is used for both Add and Edit.

    Active remains hidden from the user, but it is still included
    because the existing API request requires it.
  */
  readonly editForm: FormGroup = this.formBuilder.group({
    itemCode: [
      '',
      [
        Validators.required,
        Validators.maxLength(10)
      ]
    ],

    itemDesc: [
      '',
      [
        Validators.required
      ]
    ],

    groupCode: [
      '',
      [
        Validators.required
      ]
    ],

    itemType: [''],

    um: [
      '',
      [
        Validators.required
      ]
    ],

    bufferQty: [
      0,
      [
        Validators.min(0)
      ]
    ],

    unitCost: [
      0,
      [
        Validators.min(0)
      ]
    ],

    lastUnitCost: [
      0,
      [
        Validators.min(0)
      ]
    ],

    /*
      Hidden field.

      Do not delete because this is part of ItemMasterUpsertRequest.
    */
    active: [
      'Y'
    ]
  });

  /*
    Existing Kendo Grid SmartBox configuration.
  */
// readonly searchSettings: GridSmartBoxSearchSettings = {
//   enabled: true,

//   history: {
//     size: 5,
//     timestampFormat: 'HH:mm:ss'
//   },

//   placeholder: 'Search item code, description, group, or type...',
//   delay: 300,

//   fields: [
//     'itemCode',
//     'itemDesc',
//     'groupCode',
//     'groupDesc',
//     'itemType',
//     'um'
//   ]
// };

readonly searchControl = new FormControl('', {
  nonNullable: true
});

gridSkip = 0;

gridPageSize = 20;

gridSort: SortDescriptor[] = [
  {
    field: 'itemCode',
    dir: 'asc'
  }
];

readonly gridView = computed<GridDataResult>(() => ({
  data: this.facade.items(),
  total: this.facade.total()
}));

  /*
    Excel fetchData callback.

    Arrow function is used so that "this" remains bound to the component.
  */
  readonly allData = (): ExcelExportData => {
    return {
      data: process(
        this.facade.items(),
        {
          sort: [
            {
              field: 'itemCode',
              dir: 'asc'
            }
          ]
        }
      ).data
    };
  };

  readonly searchSettings: GridSmartBoxSearchSettings = {
  enabled: true,

  history: {
    size: 5,
    timestampFormat: 'HH:mm:ss'
  },

  placeholder:
    'Search item code, description, group, or type...',

  delay: 300,

  fields: [
    'itemCode',
    'itemDesc',
    'groupCode',
    'groupDesc',
    'itemType',
    'um'
  ]
};

 ngOnInit(): void {
  this.facade.reloadItemGroups();

  this.facade.reloadItemUms();

  this.searchControl.valueChanges
    .pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    )
    .subscribe(() => {
      this.gridSkip = 0;
      this.loadItems();
    });

  this.loadItems();
}

  // ngOnInit(): void {
  //   /*
  //     Load Group Description ComboBox lookup.
  //   */
  //   this.facade.reloadItemGroups();

  //   this.facade.reloadItemUms();

  //   /*
  //     Load active Item Master records.
  //   */
  //   this.loadItems();
  // }

  loadItems(): void {
  const currentSort = this.gridSort[0];

  this.facade.load({
    active: this.selectedActive,

    search:
      this.searchControl.value.trim() || null,

    skip:
      this.gridSkip,

    take:
      this.gridPageSize,

    sortField:
      currentSort?.field
        ? String(currentSort.field)
        : 'itemCode',

    sortDir:
      currentSort?.dir === 'desc'
        ? 'desc'
        : 'asc'
  });
}

onSearchValueChange(value: string): void {
  this.searchControl.setValue(
    String(value ?? ''),
    {
      emitEvent: true
    }
  );
}

onGridPageChange(
  event: PageChangeEvent
): void {
  this.gridSkip = event.skip;
  this.gridPageSize = event.take;

  this.loadItems();
}

onGridSortChange(
  sort: SortDescriptor[]
): void {
  this.gridSort =
    sort.length > 0
      ? sort
      : [
          {
            field: 'itemCode',
            dir: 'asc'
          }
        ];

  this.gridSkip = 0;

  this.loadItems();
}

  // loadItems(): void {
  //   this.facade.load({
  //     active: this.selectedActive
  //   });
  // }

  /*
    ADD ITEM

    Instead of inserting an editable Grid row, this initializes
    the Reactive Form and opens the external Kendo Dialog.
  */
  addNewItem(): void {
    if (this.facade.saving()) {
      return;
    }

    this.isNew = true;
    this.editingSourceItem = null;

    this.resetEditForm({
      itemCode: '',
      itemDesc: '',
      groupCode: '',
      groupDesc: '',
      itemType: '',
      um: '',
      bufferQty: 0,
      unitCost: 0,
      lastUnitCost: 0,
      active: 'Y'
    });

    this.isEditDialogOpen = true;
  }

  /*
    EDIT ITEM

    Triggered by the Kendo Grid Edit command.

    The selected record is copied to the Reactive Form.
    The original row is stored separately and is updated only after
    a successful API response.
  */
  editHandler(args: EditEvent): void {
    if (this.facade.saving()) {
      return;
    }

    const selectedItem =
      args.dataItem as ItemMasterListItem;

    this.isNew = false;
    this.editingSourceItem = selectedItem;

    this.resetEditForm({
      ...selectedItem,

      bufferQty:
        Number(selectedItem.bufferQty || 0),

      unitCost:
        Number(selectedItem.unitCost || 0),

      lastUnitCost:
        Number(selectedItem.lastUnitCost || 0),

      active:
        selectedItem.active || 'Y'
    });

    this.isEditDialogOpen = true;
  }

  /*
   SAVE FROM EXTERNAL DIALOG
   WITH LOCAL AND API ERROR HANDLING
 */
  saveEditDialog(): void {
    /*
      Prevent duplicate save requests.
    */
    if (this.facade.saving()) {
      this.facade.showError(
        'Another inventory item save request is still running.'
      );

      return;
    }




    /*
      Validate the form before building the request.
    */
    this.editForm.markAllAsTouched();

    this.editForm.updateValueAndValidity({
      emitEvent: false
    });

    if (this.editForm.invalid) {
      this.facade.showError(
        'Complete all required inventory item fields and correct the invalid values.'
      );

      return;
    }

    /*
      Preserve the operation type and original row reference.
    */
    const wasNew = this.isNew;

    const sourceItem = this.editingSourceItem;

    try {
      /*
        buildUpsertRequest() may throw a local JavaScript error
        before the HTTP request is sent.
      */
      const request = this.buildUpsertRequest();

      /*
        Final request validation after trimming and conversion.
      */
      if (!request.itemCode) {
        this.facade.showError(
          'Item code is required.'
        );

        return;
      }

      if (!request.itemDesc) {
        this.facade.showError(
          'Item description is required.'
        );

        return;
      }

      if (!request.groupCode) {
        this.facade.showError(
          'Group code is required.'
        );

        return;
      }

      if (!request.um) {
        this.facade.showError(
          'Unit of Measure is required.'
        );

        return;
      }

      if (
        !Number.isFinite(request.bufferQty) ||
        request.bufferQty < 0
      ) {
        this.facade.showError(
          'Buffer quantity must be zero or greater.'
        );

        return;
      }

      if (
        !Number.isFinite(request.unitCost) ||
        request.unitCost < 0
      ) {
        this.facade.showError(
          'Unit cost must be zero or greater.'
        );

        return;
      }

      if (
        !Number.isFinite(request.lastUnitCost) ||
        request.lastUnitCost < 0
      ) {
        this.facade.showError(
          'Last unit cost must be zero or greater.'
        );

        return;
      }

      this.facade
        .upsert(request)
        .subscribe({
          next: () => {
            try {

              this.notify.success(
                wasNew
                  ? `Inventory item ${request.itemCode} added successfully.`
                  : `Inventory item ${request.itemCode} updated successfully.`,
                wasNew ? 'Item Added' : 'Item Updated',
                request.itemCode,
                'Item Master',
              );

              if (!wasNew && sourceItem) {
                /*
                  UPDATE:
  
                  Update the existing Grid object only after
                  the API save succeeds.
                */
                Object.assign(sourceItem, {
                  itemCode: request.itemCode,

                  itemDesc: request.itemDesc,

                  groupCode: request.groupCode,

                  groupDesc:
                    this.getGroupDescByCode(
                      request.groupCode
                    ),

                  itemType:
                    request.itemType || '',

                  um:
                    request.um,


                  bufferQty:
                    request.bufferQty,

                  unitCost:
                    request.unitCost,

                  lastUnitCost:
                    request.lastUnitCost,

                  active:
                    request.active
                });

                this.finishEditing();

                return;
              }

              /*
                ADD:
  
                Close the editor and reload the Grid from
                the database after a successful save.
              */
              this.finishEditing();

              this.loadItems();
            } catch (error: unknown) {
              /*
                Handles errors while processing the successful
                API response or updating the Grid.
              */
              this.facade.showError(
                this.getSaveErrorMessage(
                  error,
                  'The item was saved, but the Grid could not be updated.'
                )
              );
            }
          },

          /*
            Handles backend, HTTP, SQL, network,
            validation and authorization errors.
          */
          error: (error: unknown) => {
            this.notify.error(
              this.getSaveErrorMessage(
                error,
                wasNew
                  ? 'Unable to add the inventory item.'
                  : 'Unable to update the inventory item.'
              ),
              wasNew ? 'Item Add Failed' : 'Item Update Failed',
              request.itemCode,
              'Item Master',
            );
          }
        });
    } catch (error: unknown) {
      /*
        Handles local errors before the HTTP request,
        including buildUpsertRequest() conversion errors.
      */
      this.facade.showError(
        this.getSaveErrorMessage(
          error,
          wasNew
            ? 'Unable to prepare the new inventory item request.'
            : 'Unable to prepare the inventory item update request.'
        )
      );
    }
  }

  /*
    SAVE ERROR MESSAGE HELPER
  */
  private getSaveErrorMessage(
    error: unknown,
    fallback: string
  ): string {
    /*
      Normal JavaScript Error.
    */
    if (error instanceof Error) {
      const message = String(
        error.message || ''
      ).trim();

      if (message) {
        return message;
      }
    }

    if (
      typeof error === 'object' &&
      error !== null
    ) {
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

          errors?: Record<
            string,
            string[] | string
          >;
        };
      };

      /*
        API returned a plain string response.
      */
      if (typeof response.error === 'string') {
        const message =
          response.error.trim();

        if (message) {
          return message;
        }
      }

      /*
        API returned an error object.
      */
      if (
        typeof response.error === 'object' &&
        response.error !== null
      ) {
        const apiMessage =
          response.error.message ||
          response.error.detail ||
          response.error.error;

        if (apiMessage?.trim()) {
          return apiMessage.trim();
        }

        /*
          ASP.NET Core ValidationProblemDetails.
        */
        if (response.error.errors) {
          const validationMessages =
            Object.values(
              response.error.errors
            )
              .flatMap((entry) =>
                Array.isArray(entry)
                  ? entry
                  : [entry]
              )
              .map((entry) =>
                String(entry || '').trim()
              )
              .filter(
                (entry) =>
                  entry.length > 0
              );

          if (validationMessages.length > 0) {
            return validationMessages.join(' ');
          }
        }

        if (response.error.title?.trim()) {
          return response.error.title.trim();
        }
      }

      /*
        Network error or API unavailable.
      */
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

  /*
    Called by the Dialog X button and Cancel button.
  */
  closeEditDialog(): void {
    /*
      Prevent closing while the API request is being processed.
    */
    if (this.facade.saving()) {
      return;
    }

    this.finishEditing();
  }

  /*
    Warehouse / Storage Balance View.
  */
  openWarehouseDialog(
    item: ItemMasterListItem
  ): void {
    this.selectedViewItem = item;
    this.showWarehouseDialog = true;
  }

  closeWarehouseDialog(): void {
    this.selectedViewItem = null;
    this.showWarehouseDialog = false;
  }

  /*
    Dialog titles.
  */
  get editDialogTitle(): string {
    return this.isNew
      ? 'Add Inventory Item'
      : 'Edit Inventory Item';
  }

  get editDialogDescription(): string {
    return this.isNew
      ? 'Create a new Item Master record using the required inventory information.'
      : 'Review and update the selected Item Master record.';
  }

  get saveButtonText(): string {
    if (this.facade.saving()) {
      return 'Saving...';
    }

    return this.isNew
      ? 'Add Item'
      : 'Save Changes';
  }

  /*
    Reactive Form validation helpers.
  */
  isControlInvalid(
    controlName: string
  ): boolean {
    const control =
      this.editForm.get(controlName);

    return !!control &&
      control.invalid &&
      (control.dirty || control.touched);
  }

  hasControlError(
    controlName: string,
    errorName: string
  ): boolean {
    const control =
      this.editForm.get(controlName);

    return !!control &&
      control.hasError(errorName) &&
      (control.dirty || control.touched);
  }

  /*
    Populate the Add/Edit form without binding directly to the Grid row.
  */
  private resetEditForm(
    item: ItemMasterListItem
  ): void {
    this.editForm.reset({
      itemCode:
        item.itemCode || '',

      itemDesc:
        item.itemDesc || '',

      groupCode:
        item.groupCode || '',

      itemType:
        item.itemType || '',

      um:
        item.um || '',

      bufferQty:
        Number(item.bufferQty || 0),

      unitCost:
        Number(item.unitCost || 0),

      lastUnitCost:
        Number(item.lastUnitCost || 0),

      active:
        item.active || 'Y'
    });

    this.editForm.markAsPristine();
    this.editForm.markAsUntouched();
  }

  /*
    Convert the form value into the existing API request model.
  */
  private buildUpsertRequest(): ItemMasterUpsertRequest {
    const value =
      this.editForm.getRawValue();

    return {
      itemCode:
  String(value.itemCode || '')
    .trim()
    .toUpperCase(),
      // itemCode:
      //   String(value.itemCode || '').trim(),

      itemDesc:
        String(value.itemDesc || '').trim(),

      groupCode:
        String(value.groupCode || '').trim(),

      itemType:
        String(value.itemType || '').trim() ||
        null,

      um:
        String(value.um || '')
          .trim()
          .toUpperCase(),

      bufferQty:
        Number(value.bufferQty || 0),

      unitCost:
        Number(value.unitCost || 0),

      lastUnitCost:
        Number(value.lastUnitCost || 0),

      active:
        (value.active || 'Y') as ItemMasterActiveFlag
    };
  }

  /*
    Force-close and reset the external editing state.

    This private method intentionally does not check facade.saving()
    because it is also called after a successful save, before finalize
    has necessarily finished updating the saving signal.
  */
  private finishEditing(): void {
    this.isEditDialogOpen = false;
    this.isNew = true;
    this.editingSourceItem = null;

    this.editForm.reset({
      itemCode: '',
      itemDesc: '',
      groupCode: '',
      itemType: '',
      um: '',
      bufferQty: 0,
      unitCost: 0,
      lastUnitCost: 0,
      active: 'Y'
    });

    this.editForm.markAsPristine();
    this.editForm.markAsUntouched();
  }

  /*
    Resolve the display description from the saved Group Code.
  */
  private getGroupDescByCode(
    groupCode: string | null | undefined
  ): string {
    const cleanGroupCode =
      String(groupCode || '').trim();

    if (!cleanGroupCode) {
      return '';
    }

    const selectedGroup =
      this.itemGroupOptions().find((group) => {
        return String(group.groupCode || '').trim() ===
          cleanGroupCode;
      });

    return selectedGroup?.groupDesc ||
      cleanGroupCode;
  }

  getItemTypeDescription(
    itemType: string | null | undefined
  ): string {
    const cleanItemType =
      String(itemType || '')
        .trim()
        .toUpperCase();

    const selectedType =
      this.itemTypeOptions.find((type) => {
        return type.value === cleanItemType;
      });

    return selectedType?.text ||
      cleanItemType ||
      '—';
  }
}