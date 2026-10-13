# MODERN ERP Frontend — Angular and Kendo UI Instructions

## Scope

These instructions apply to all files under `frontend/`.

Read the repository root `AGENTS.md` first. Read `server/AGENTS.md` whenever a frontend change calls or changes an API. Read `database/AGENTS.md` only when the task requires understanding database-driven business behavior.

## Inspect before editing

Before implementing an Angular change, locate and inspect:

- The nearest similar module.
- Existing routes and menu configuration.
- Component, facade, service, model, template, and stylesheet patterns.
- Shared toolbar and notification components.
- Existing Kendo Grid, ComboBox, DropDownList, DatePicker, dialog, and form usage.
- The matching API controller and C# DTOs.
- Existing unit tests and package scripts.

Do not guess API routes or response shapes. Do not create duplicate shared components when an existing one can be reused.

## Angular architecture

Preserve the repository's established Angular architecture.

Preferred rules when compatible with the existing codebase:

- Use standalone components.
- Use `ChangeDetectionStrategy.OnPush`.
- Use typed Reactive Forms.
- Use signals and `computed` values for local and derived state.
- Use RxJS for asynchronous streams and composition.
- Use a facade when the module already follows a facade pattern.
- Keep HTTP calls in Angular services, not in components.
- Keep business and orchestration logic out of templates.
- Avoid manual subscriptions when the same behavior can be expressed declaratively.
- When a manual subscription is necessary, use the project's established cleanup mechanism.
- Do not introduce NgRx or another state-management library unless explicitly requested.

## API integration

Before editing an Angular service:

1. Read the matching ASP.NET Core controller.
2. Read the request and response DTOs.
3. Confirm the route prefix, action route, HTTP verb, route parameters, query parameters, and body shape.
4. Confirm the JSON property naming and nullability.
5. Confirm whether the endpoint returns an array, object, paged result, `GridDataResult`-compatible result, generated document number, or no content.

Rules:

- Keep TypeScript interfaces aligned with C# DTOs.
- Do not use `any` when a meaningful interface can be defined.
- Do not silently remap incompatible fields only to hide a backend contract mismatch.
- Centralize base URLs using the existing environment or API configuration.
- Preserve existing interceptors for authentication, errors, and loading behavior.
- Use normal service methods for `POST`, `PUT`, `PATCH`, and `DELETE`.
- Use the project's established read-state pattern for `GET` requests.
- Handle API validation and conflict responses visibly and accurately.
- Do not display success until the API confirms success.

## Reactive Forms

- Use typed controls where practical.
- Apply required, length, numeric, date, and range validators based on the API and database contract.
- Keep disabled display-only controls distinct from submitted fields.
- Use `getRawValue()` only when disabled values must intentionally be included.
- Do not submit UI-only fields unless the API contract requires them.
- Normalize optional strings consistently.
- Preserve decimal values without lossy string or floating-point transformations.
- Validate detail rows before batch saving.
- Mark controls as touched when presenting validation after an attempted save.
- Prevent duplicate save clicks while a command is in progress.

## Kendo UI and ERP layout

- Reuse the existing Kendo UI components and theme.
- Preserve a professional, responsive ERP layout.
- Use consistent form spacing, labels, action placement, loading indicators, empty states, and validation messages.
- Use Kendo Grid server-side paging for large datasets.
- Keep the grid data contract compatible with `GridDataResult` when the module uses it.
- Reset `skip` to zero when filters materially change.
- Preserve selected-row and edit-row identity using stable keys.
- Avoid loading tens of thousands of records into the browser for local paging.
- Use lookup virtualization or server filtering when lookup datasets are large.
- Maintain keyboard usability and accessible labels.

## Shared application components

Inspect and reuse these existing shared locations when applicable:

- `src/app/shared/services/app-toolbar`
- `src/app/shared/notification-card`
- `src/app/notification-confirm-dialog`
- `src/app/save-confirm-dialog`
- Menu configuration under `src/app`

Toolbar behavior must reflect the current form state and permissions. Do not enable Save, Post, Delete, or Print actions when the operation is invalid or unauthorized.

Use the global notification and confirmation patterns rather than browser `alert()` or ad hoc dialogs.

## State and command behavior

- Separate read state from write commands.
- Expose loading, saving, posting, deleting, error, and success states explicitly.
- Prevent concurrent duplicate commands.
- Refresh only the affected query after a successful command.
- Preserve unsaved-change protection if the module already supports it.
- Do not overwrite user input because a lookup or background refresh completed late.
- Use stable comparison rules for Kendo value binding, especially for object-valued ComboBox or DropDownList controls.

## Routing and module integration

When creating a module:

- Add the route in the established route configuration.
- Add menu entries only when requested and authorized.
- Preserve lazy loading where the project uses it.
- Confirm route parameter names match component retrieval logic.
- Handle direct browser navigation and refresh.
- Do not hardcode branch, user, entity, or permissions when they are available from authenticated application state.

## Error handling

- Use the established global interceptor and notification behavior.
- Preserve server validation messages when safe and useful.
- Provide a clear fallback message for network or unexpected failures.
- Do not expose stack traces or raw server exception details.
- Do not transform a failed response into an empty successful result.
- Keep loading indicators accurate through success, error, and cancellation paths.

## Performance

- Use server-side filtering and paging for large grids.
- Debounce remote text searches using the existing project pattern.
- Avoid repeated API calls caused by unstable effects or subscriptions.
- Use `trackBy` or stable row keys where applicable.
- Avoid expensive functions called repeatedly from templates.
- Preserve immutable state updates when required by change detection.
- Do not use `shareReplay` without understanding cache lifetime and invalidation.

## Testing and verification

Add or update focused tests where the repository supports them:

- Form validation.
- DTO mapping.
- Service route and verb.
- Facade state transitions.
- Grid paging and filters.
- Save success, conflict, validation failure, and network failure.
- Toolbar enablement and command behavior.

Discover the actual scripts in `package.json`. Run the applicable commands, commonly:

```powershell
npm ci
npm run lint
npm run build
npm test -- --watch=false
```

Do not claim that lint or tests passed if the scripts do not exist or could not run.

## Completion checklist

Before finishing a frontend task, confirm:

- Angular service route and verb match the controller.
- TypeScript contracts match C# DTOs.
- Form values match the request body.
- Kendo value binding works for initial load and editing.
- Shared toolbar and notifications are integrated where required.
- Loading and command states prevent duplicate actions.
- Large listings use server-side operations.
- Routes, menu entries, imports, and providers are complete.
- The production build and applicable tests pass.
