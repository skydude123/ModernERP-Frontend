

import {
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';

import { KENDO_ICONS } from '@progress/kendo-angular-icons';

import {
  KENDO_TOOLBAR,
  ToolBarModule,
} from '@progress/kendo-angular-toolbar';

import {
  arrowLeftIcon,
  calendarDateIcon,
  calendarIcon,
  cancelIcon,
  checkCircleIcon,
  checkIcon,
  fileAddIcon,
  gridIcon,
  listUnorderedIcon,
  printIcon,
  repeatIcon,
  saveIcon,
  undoIcon,
  xCircleIcon,
} from '@progress/kendo-svg-icons';

import { ToolbarConfig } from './toolbar.service';

@Component({
  selector: 'app-toolbar',

  standalone: true,

  imports: [
    KENDO_ICONS,
    KENDO_TOOLBAR,
    ToolBarModule
],

  templateUrl: './app-toolbar.component.html',

  styleUrls: ['./app-toolbar.component.scss'],
})
export class AppToolbarComponent {
  readonly fileAddIcon = fileAddIcon;

  readonly arrowLeftIcon = arrowLeftIcon;

  readonly saveIcon = saveIcon;

  readonly printIcon = printIcon;

  readonly cancelIcon = cancelIcon;

  readonly checkIcon = checkIcon;

  readonly undoIcon = undoIcon;

  readonly listUnorderedIcon = listUnorderedIcon;

  readonly repeatIcon = repeatIcon;

  readonly gridIcon = gridIcon;

  readonly calendarDateIcon = calendarDateIcon;

  readonly calendarIcon = calendarIcon;

  readonly checkCircleIcon = checkCircleIcon;

  readonly xCircleIcon = xCircleIcon;

  /* =========================================================
     INPUTS
     ========================================================= */

  @Input() config: ToolbarConfig | null = null;

  /*
   * Used by Save / Update.
   */
  @Input() formValid = true;

  /*
   * Changes Save label to Update for existing documents.
   */
  @Input() editMode = false;

  /*
   * Workflow button modes.
   */
  @Input() submitMode = false;

  @Input() acceptMode = false;

  @Input() postingMode = false;

  @Input() reverseMode = false;

  @Input() activateMode = false;

  @Input() deactivateMode = false;

  @Input() title = '';

  @Input() subtitle = '';

  /* =========================================================
     OUTPUTS
     ========================================================= */

  @Output() readonly onNew = new EventEmitter<void>();

  @Output() readonly onSave = new EventEmitter<void>();

  @Output() readonly onBack = new EventEmitter<void>();

  @Output() readonly onPrint = new EventEmitter<void>();

  @Output() readonly onList = new EventEmitter<void>();

  /*
   * Workflow outputs.
   */
  @Output() readonly onSubmit = new EventEmitter<void>();

  @Output() readonly onAccept = new EventEmitter<void>();

  @Output() readonly onPost = new EventEmitter<void>();

  @Output() readonly onReverse = new EventEmitter<void>();

  @Output() readonly onActivate = new EventEmitter<void>();

  @Output() readonly onDeactivate = new EventEmitter<void>();

  @Output() readonly onCancel = new EventEmitter<void>();

  @Output() readonly onRefresh = new EventEmitter<void>();

  @Output() readonly onDataList = new EventEmitter<void>();

  @Output() readonly onToday = new EventEmitter<void>();

  @Output() readonly onYesterday = new EventEmitter<void>();

  @Output() readonly onThisMonth = new EventEmitter<void>();

  @Output() readonly onLastMonth = new EventEmitter<void>();

  @Output() readonly onThisYear = new EventEmitter<void>();

  @Output() readonly onLastYear = new EventEmitter<void>();

  @Output() readonly onThisWeek = new EventEmitter<void>();

  @Output() readonly onLastWeek = new EventEmitter<void>();

  @Output() readonly onCurrentYear = new EventEmitter<void>();

  /* =========================================================
     BUTTON STATES
     ========================================================= */

  get canSubmit(): boolean {
    return this.submitMode;
  }

  get canAccept(): boolean {
    return this.acceptMode;
  }

  get canPost(): boolean {
    return this.postingMode;
  }

  get canReverse(): boolean {
    return this.reverseMode;
  }

  get saveText(): string {
    return this.editMode ? 'Update' : 'Save';
  }

  get hasHeader(): boolean {
    return !!this.title || !!this.subtitle;
  }

  /* =========================================================
     GROUP VISIBILITY
     ========================================================= */

  get showPrimaryGroup(): boolean {
    const config = this.config;

    return !!(
      config?.showNew ||
      config?.showSave ||
      config?.showBack ||
      config?.showPrint ||
      config?.showCancel
    );
  }

  get showWorkflowGroup(): boolean {
    const config = this.config;

    return !!(
      config?.showSubmit ||
      config?.showAccept ||
      config?.showPost ||
      config?.showReverse ||
      config?.showActivate ||
      config?.showDeactivate
    );
  }

  get showNavigationGroup(): boolean {
    const config = this.config;

    return !!(
      config?.showList ||
      config?.showRefresh ||
      config?.showDataList
    );
  }

  get showDateGroup(): boolean {
    const config = this.config;

    return !!(
      config?.showToday ||
      config?.showYesterday ||
      config?.showThisMonth ||
      config?.showLastMonth ||
      config?.showThisYear ||
      config?.showLastYear ||
      config?.showThisWeek ||
      config?.showLastWeek ||
      config?.showCurrentYear
    );
  }

  /* =========================================================
     GUARDED WORKFLOW HANDLERS
     ========================================================= */

  submitClick(): void {
    if (!this.submitMode) {
      return;
    }

    this.onSubmit.emit();
  }

  acceptClick(): void {
    if (!this.acceptMode) {
      return;
    }

    this.onAccept.emit();
  }

  postClick(): void {
    if (!this.postingMode) {
      return;
    }

    this.onPost.emit();
  }

  reverseClick(): void {
    if (!this.reverseMode) {
      return;
    }

    this.onReverse.emit();
  }

  activateClick(): void {
    if (!this.activateMode) {
      return;
    }

    this.onActivate.emit();
  }

  deactivateClick(): void {
    if (!this.deactivateMode) {
      return;
    }

    this.onDeactivate.emit();
  }
}