# Receiving SQL And Reporting Notes

Run `001_receiving_schema_and_procs.sql` only in a disposable/test database first.

Unresolved live-schema assumptions:

- The PO line key is assumed to be `(po_no, po_seq)` because this checkout does not include SQL Server schema metadata.
- `dbo.BRANCH` is expected to contain `whse_code` and `whse_desc`. If it does not, update only `usp_Receiving_GetWarehouses` to the real warehouse master and keep the API DTO shape `{ whseCode, whseDesc }`.
- Inventory/AP/GL posting and inverse reversal hooks are intentionally left as compile-safe comments. The repository/database procedures must be identified before production posting can be claimed complete.

`ReceivingReport.trdp` must be created with Telerik Report Designer:

- Hidden string parameter: `rr_no`.
- Named connection: `TwinBeeErpReporting`.
- SqlDataSource stored procedure: `dbo.usp_Receiving_ReportData`.
- Parameter mapping: `@rr_no = Parameters.rr_no.Value`.
- Add document header, supplier/document fields, item table, totals, signatures, page numbering, print timestamp, and conditional `REVERSED` watermark.
- Save the licensed report file as `Reports/ReceivingReport.trdp` in the .NET API project.

The Angular route uses `/reporting/receiving-viewer.html` to isolate jQuery/Kendo report viewer scripts from Angular Kendo v24. Copy licensed Telerik Reporting HTML5 viewer assets into `public/reporting/lib` during frontend hosting, or into the API `wwwroot/reporting/lib` when the API serves static files.
