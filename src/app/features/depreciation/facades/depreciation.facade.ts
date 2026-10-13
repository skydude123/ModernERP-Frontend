import { computed, inject, Injectable, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Observable, finalize, of, tap } from 'rxjs';
import { DepreciationService } from '../data-access/depreciation.service';
import {
  CommandRequest, CommandResult, DepreciationPreview, DepreciationRun,
  DepreciationRunQuery, PreviewRequest, ReverseRequest, SaveRequest
} from '../models/depreciation.models';

@Injectable()
export class DepreciationFacade {
  private readonly api = inject(DepreciationService);
  readonly query = signal<DepreciationRunQuery>({
    periodFrom: null, periodTo: null, runDateFrom: null, runDateTo: null, status: 'ALL',
    branchCode: null, assetCategoryCode: null, methodCode: null, search: null,
    skip: 0, take: 50, sortField: 'runDate', sortDir: 'desc'
  });
  readonly depRunNo = signal<string | null>(null);
  readonly eligibleRequest = signal<PreviewRequest | null>(null);
  readonly preview = signal<DepreciationPreview | null>(null);
  readonly busy = signal(false);

  private readonly listResource = rxResource({
    params: () => this.query(),
    stream: ({ params }) => this.api.query(params),
    defaultValue: { data: [], total: 0 }
  });

  private readonly runResource = rxResource<DepreciationRun | null, string | null>({
    params: () => this.depRunNo(),
    stream: ({ params }) =>
      params ? this.api.get(params) : of(null),
    defaultValue: null
  });

  private readonly branchesResource = rxResource({
    stream: () => this.api.lookup('branches'),
    defaultValue: []
  });

  private readonly categoriesResource = rxResource({
    stream: () => this.api.lookup('categories'),
    defaultValue: []
  });

  private readonly methodsResource = rxResource({
    stream: () => this.api.lookup('methods'),
    defaultValue: []
  });

  private readonly conventionsResource = rxResource({
    stream: () => this.api.lookup('conventions'),
    defaultValue: []
  });

  private readonly eligibleResource = rxResource({
    params: () => this.eligibleRequest(),
    stream: ({ params }) =>
      params ? this.api.eligible(params) : of([]),
    defaultValue: []
  });

  readonly list = computed(() => this.listResource.value().data);
  readonly total = computed(() => this.listResource.value().total);
  readonly listLoading = computed(() => this.listResource.isLoading());
  readonly run = computed(() => this.runResource.value());
  readonly runLoading = computed(() => this.runResource.isLoading());
  readonly branches = computed(() => this.branchesResource.value());
  readonly categories = computed(() => this.categoriesResource.value());
  readonly methods = computed(() => this.methodsResource.value());
  readonly conventions = computed(() => this.conventionsResource.value());
  readonly eligibleLines = computed(() => this.eligibleResource.value());

  setQuery(query: Partial<DepreciationRunQuery>): void { this.query.update(value => ({ ...value, ...query })); }
  load(depRunNo: string | null): void { this.depRunNo.set(depRunNo); }
  reloadRun(): void { if (this.depRunNo()) this.runResource.reload(); }
  loadEligible(request: PreviewRequest): void { this.eligibleRequest.set({ ...request }); }
  reload(): void { this.listResource.reload(); }
  calculate(request: PreviewRequest): Observable<DepreciationPreview> {
    return this.runCommand(this.api.preview(request)).pipe(tap(result => this.preview.set(result)));
  }
  save(depRunNo: string | null, request: SaveRequest): Observable<CommandResult> {
    return this.runCommand(depRunNo ? this.api.update(depRunNo, request) : this.api.create(request));
  }
  transition(depRunNo: string, action: string, request: CommandRequest): Observable<CommandResult> {
    return this.runCommand(action === 'delete' ? this.api.delete(depRunNo, request) : this.api.transition(depRunNo, action, request));
  }
  reverse(depRunNo: string, request: ReverseRequest): Observable<CommandResult> {
    return this.runCommand(this.api.reverse(depRunNo, request));
  }
  private runCommand<T>(source: Observable<T>): Observable<T> {
    this.busy.set(true); return source.pipe(finalize(() => this.busy.set(false)));
  }
}
