# Asset Acceptance SQL

Execute `001_asset_acceptance_schema_and_procs.sql` once against the ERP `INVENTORY` database. It creates module reference tables, header/detail tables, the detail TVP, Asset Master (only when absent), indexes, lookups, read/list procedures, draft upsert, status transitions, idempotent posting, and draft deletion.

Before production execution, verify the documented `a_po_hdr`, `a_po_det`, `a_suppliers`, and `BRANCH` column assumptions. Populate locations, custodians, and GL accounts from the ERP chart/master data before enabling entry users.
