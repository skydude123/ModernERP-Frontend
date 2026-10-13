/*
Receiving module database script.

Schema assumptions that must be verified against the live TwinBee database before production:
- dbo.a_po_hdr key: po_no; columns: po_date, supp_code, status, branchname.
- dbo.a_po_det key: (po_no, po_seq); columns: item_code, item_desc, qty_po, qty_rcv, po_um,
  base_um, po_conv_factor, unit_price.
- dbo.a_rr_hdr key: rr_no.
- dbo.a_rr_det key: (rr_no, line_no).

The requested BRANCH storage columns are validated below. If dbo.BRANCH does not contain
whse_code/whse_desc, change usp_Receiving_GetWarehouses to the real warehouse master table while
preserving API fields WhseCode and WhseDesc.
*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF COL_LENGTH('dbo.a_rr_hdr', 'branchname') IS NULL
    ALTER TABLE dbo.a_rr_hdr ADD branchname VARCHAR(50) NOT NULL CONSTRAINT DF_a_rr_hdr_branchname DEFAULT ('MANDAUE');
GO

IF COL_LENGTH('dbo.a_rr_hdr', 'row_version') IS NULL
    ALTER TABLE dbo.a_rr_hdr ADD row_version ROWVERSION NOT NULL;
GO

IF COL_LENGTH('dbo.a_rr_hdr', 'rr_type') IS NULL
    ALTER TABLE dbo.a_rr_hdr ADD rr_type VARCHAR(3) NOT NULL CONSTRAINT DF_a_rr_hdr_rr_type DEFAULT ('RPO');
GO

IF COL_LENGTH('dbo.a_rr_hdr', 'whse_code') IS NULL
    ALTER TABLE dbo.a_rr_hdr ADD whse_code VARCHAR(30) NOT NULL CONSTRAINT DF_a_rr_hdr_whse DEFAULT ('WHSE');
GO

IF COL_LENGTH('dbo.a_rr_hdr', 'reference_no') IS NULL
    ALTER TABLE dbo.a_rr_hdr ADD reference_no VARCHAR(50) NULL;
GO

IF OBJECT_ID('dbo.a_rr_number_series', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.a_rr_number_series
    (
        series_key VARCHAR(20) NOT NULL CONSTRAINT PK_a_rr_number_series PRIMARY KEY,
        last_no INT NOT NULL,
        date_changed DATETIME2(0) NOT NULL CONSTRAINT DF_a_rr_number_series_date_changed DEFAULT (SYSUTCDATETIME())
    );

    INSERT dbo.a_rr_number_series(series_key, last_no)
    VALUES ('RR', 0);
END;
GO

IF OBJECT_ID('dbo.a_rr_reversal_log', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.a_rr_reversal_log
    (
        reversal_id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_a_rr_reversal_log PRIMARY KEY,
        rr_no VARCHAR(30) NOT NULL,
        reason NVARCHAR(500) NOT NULL,
        reversed_by VARCHAR(50) NOT NULL,
        reversed_at DATETIME2(0) NOT NULL CONSTRAINT DF_a_rr_reversal_log_reversed_at DEFAULT (SYSUTCDATETIME()),
        original_row_version VARBINARY(8) NOT NULL
    );
END;
GO

IF TYPE_ID('dbo.ReceivingDetailBatchType') IS NULL
    CREATE TYPE dbo.ReceivingDetailBatchType AS TABLE
    (
        line_no INT NOT NULL,
        po_no VARCHAR(30) NULL,
        po_line_no INT NULL,
        po_seq INT NULL,
        item_code VARCHAR(50) NOT NULL,
        item_desc VARCHAR(255) NULL,
        qty_received DECIMAL(18, 4) NOT NULL,
        po_um VARCHAR(20) NULL,
        base_um VARCHAR(20) NULL,
        po_conv_factor DECIMAL(18, 6) NOT NULL,
        unit_price DECIMAL(18, 6) NOT NULL
    );
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.a_rr_hdr') AND name = 'IX_a_rr_hdr_register')
    CREATE INDEX IX_a_rr_hdr_register ON dbo.a_rr_hdr(rr_date DESC, status, branchname, whse_code, supp_code) INCLUDE (rr_type, reference_no, user_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.a_rr_det') AND name = 'IX_a_rr_det_po_lookup')
    CREATE INDEX IX_a_rr_det_po_lookup ON dbo.a_rr_det(po_no, po_seq) INCLUDE (rr_no, qty_rcv);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.a_po_det') AND name = 'IX_a_po_det_receiving_open')
    CREATE INDEX IX_a_po_det_receiving_open ON dbo.a_po_det(po_no, po_seq) INCLUDE (qty_po, qty_rcv, item_code, item_desc, po_um, po_conv_factor, unit_price);
GO

CREATE OR ALTER PROCEDURE dbo.usp_Receiving_GetSuppliers
    @search VARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET @search = NULLIF(LTRIM(RTRIM(@search)), '');

    SELECT
        supp_code AS SuppCode,
        supp_name AS SuppName
    FROM dbo.a_suppliers
    WHERE active_flag = 'Y'
      AND (@search IS NULL OR supp_code LIKE '%' + @search + '%' OR supp_name LIKE '%' + @search + '%')
    ORDER BY supp_name;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_Receiving_GetBranches
    @search VARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET @search = NULLIF(LTRIM(RTRIM(@search)), '');

    SELECT branchname AS BranchName
    FROM dbo.BRANCH
    WHERE @search IS NULL OR branchname LIKE '%' + @search + '%'
    ORDER BY branchname;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_Receiving_GetWarehouses
    @search VARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET @search = NULLIF(LTRIM(RTRIM(@search)), '');

    IF COL_LENGTH('dbo.BRANCH', 'whse_code') IS NOT NULL AND COL_LENGTH('dbo.BRANCH', 'whse_desc') IS NOT NULL
    BEGIN
        SELECT DISTINCT
            whse_code AS WhseCode,
            whse_desc AS WhseDesc
        FROM dbo.BRANCH
        WHERE @search IS NULL OR whse_code LIKE '%' + @search + '%' OR whse_desc LIKE '%' + @search + '%'
        ORDER BY whse_code;
        RETURN;
    END;

    THROW 51001, 'dbo.BRANCH does not contain whse_code/whse_desc. Point usp_Receiving_GetWarehouses to the real warehouse master.', 1;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_Receiving_GetOpenPOLines
    @supp_code VARCHAR(30) = NULL,
    @search VARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET @supp_code = NULLIF(LTRIM(RTRIM(@supp_code)), '');
    SET @search = NULLIF(LTRIM(RTRIM(@search)), '');

    SELECT TOP (100)
        h.po_no AS PoNo,
        CAST(NULL AS INT) AS PoLineNo,
        d.po_seq AS PoSeq,
        h.supp_code AS SuppCode,
        s.supp_name AS SuppName,
        d.item_code AS ItemCode,
        d.item_desc AS ItemDesc,
        CAST(ISNULL(d.qty_po, 0) AS DECIMAL(18,4)) AS QtyPo,
        CAST(ISNULL(d.qty_rcv, 0) AS DECIMAL(18,4)) AS QtyRcv,
        CAST(ISNULL(d.qty_po, 0) - ISNULL(d.qty_rcv, 0) AS DECIMAL(18,4)) AS OpenQty,
        d.po_um AS PoUm,
        ISNULL(d.base_um, d.po_um) AS BaseUm,
        CAST(ISNULL(d.po_conv_factor, 1) AS DECIMAL(18,6)) AS PoConvFactor,
        CAST(ISNULL(d.unit_price, 0) AS DECIMAL(18,6)) AS UnitPrice
    FROM dbo.a_po_hdr h
    INNER JOIN dbo.a_po_det d
        ON d.po_no = h.po_no
    LEFT JOIN dbo.a_suppliers s
        ON s.supp_code = h.supp_code
    WHERE h.status = 'A'
      AND ISNULL(d.qty_rcv, 0) < d.qty_po
      AND (@supp_code IS NULL OR h.supp_code = @supp_code)
      AND
      (
        @search IS NULL
        OR h.po_no LIKE '%' + @search + '%'
        OR d.item_code LIKE '%' + @search + '%'
        OR d.item_desc LIKE '%' + @search + '%'
      )
    ORDER BY h.po_no DESC, d.po_seq;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_Receiving_GetByNo
    @rr_no VARCHAR(30)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        h.rr_no AS RrNo,
        h.rr_date AS RrDate,
        h.rr_type AS RrType,
        h.status AS Status,
        h.branchname AS BranchName,
        h.whse_code AS WhseCode,
        h.whse_code AS WhseDesc,
        h.supp_code AS SuppCode,
        ISNULL(s.supp_name, h.supp_code) AS SuppName,
        h.reference_no AS ReferenceNo,
        h.remarks AS Remarks,
        h.user_id AS UserId,
        CAST('' AS XML).value('xs:base64Binary(sql:column("h.row_version"))', 'VARCHAR(20)') AS RowVersion
    FROM dbo.a_rr_hdr h
    LEFT JOIN dbo.a_suppliers s
        ON s.supp_code = h.supp_code
    WHERE h.rr_no = @rr_no;

    SELECT
        d.line_no AS LineNo,
        d.po_no AS PoNo,
        CAST(NULL AS INT) AS PoLineNo,
        d.po_seq AS PoSeq,
        d.item_code AS ItemCode,
        d.item_desc AS ItemDesc,
        CAST(d.qty_rcv AS DECIMAL(18,4)) AS QtyReceived,
        d.po_um AS PoUm,
        ISNULL(d.base_um, d.po_um) AS BaseUm,
        CAST(ISNULL(d.po_conv_factor, 1) AS DECIMAL(18,6)) AS PoConvFactor,
        CAST(ISNULL(d.unit_price, 0) AS DECIMAL(18,6)) AS UnitPrice,
        CAST(p.qty_po AS DECIMAL(18,4)) AS OrderedQty,
        CAST(p.qty_rcv AS DECIMAL(18,4)) AS CumulativeReceivedQty,
        CAST(ISNULL(p.qty_po, 0) - ISNULL(p.qty_rcv, 0) AS DECIMAL(18,4)) AS OpenQty
    FROM dbo.a_rr_det d
    LEFT JOIN dbo.a_po_det p
        ON p.po_no = d.po_no
       AND p.po_seq = d.po_seq
    WHERE d.rr_no = @rr_no
    ORDER BY d.line_no;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_Receiving_Query
(
    @from_date DATE = NULL,
    @to_date DATE = NULL,
    @status VARCHAR(10) = 'ALL',
    @rr_type VARCHAR(10) = 'ALL',
    @branchname VARCHAR(50) = NULL,
    @whse_code VARCHAR(30) = NULL,
    @supp_code VARCHAR(30) = NULL,
    @search VARCHAR(100) = NULL,
    @skip INT = 0,
    @take INT = 50,
    @sort_field VARCHAR(50) = 'rrDate',
    @sort_dir VARCHAR(4) = 'DESC'
)
AS
BEGIN
    SET NOCOUNT ON;

    SET @skip = CASE WHEN @skip < 0 THEN 0 ELSE ISNULL(@skip, 0) END;
    SET @take = CASE WHEN ISNULL(@take, 0) <= 0 THEN 50 ELSE @take END;
    SET @status = NULLIF(LTRIM(RTRIM(ISNULL(@status, 'ALL'))), '');
    SET @rr_type = NULLIF(LTRIM(RTRIM(ISNULL(@rr_type, 'ALL'))), '');
    SET @branchname = NULLIF(LTRIM(RTRIM(@branchname)), '');
    SET @whse_code = NULLIF(LTRIM(RTRIM(@whse_code)), '');
    SET @supp_code = NULLIF(LTRIM(RTRIM(@supp_code)), '');
    SET @search = NULLIF(LTRIM(RTRIM(@search)), '');
    SET @sort_dir = CASE WHEN UPPER(@sort_dir) = 'ASC' THEN 'ASC' ELSE 'DESC' END;

    ;WITH rr_source AS
    (
        SELECT
            h.rr_no AS RrNo,
            h.rr_date AS RrDate,
            h.status AS Status,
            CASE h.status WHEN 'N' THEN 'Draft' WHEN 'U' THEN 'Approved' WHEN 'R' THEN 'Reversed' WHEN 'C' THEN 'Cancelled' ELSE h.status END AS StatusName,
            h.rr_type AS RrType,
            h.branchname AS BranchName,
            h.whse_code AS WhseCode,
            h.whse_code AS WhseDesc,
            h.reference_no AS ReferenceNo,
            h.supp_code AS SuppCode,
            ISNULL(s.supp_name, h.supp_code) AS SuppName,
            COUNT(d.line_no) AS LineCount,
            CAST(ISNULL(SUM(ISNULL(d.qty_rcv, 0)), 0) AS DECIMAL(18,4)) AS TotalQty,
            CAST(ISNULL(SUM(ISNULL(d.qty_rcv, 0) * ISNULL(d.unit_price, 0)), 0) AS DECIMAL(18,4)) AS TotalAmount,
            h.user_id AS UserId,
            h.remarks AS Remarks
        FROM dbo.a_rr_hdr h
        LEFT JOIN dbo.a_rr_det d
            ON d.rr_no = h.rr_no
        LEFT JOIN dbo.a_suppliers s
            ON s.supp_code = h.supp_code
        WHERE (@from_date IS NULL OR h.rr_date >= @from_date)
          AND (@to_date IS NULL OR h.rr_date < DATEADD(DAY, 1, @to_date))
          AND (@status IS NULL OR @status = 'ALL' OR h.status = @status)
          AND (@rr_type IS NULL OR @rr_type = 'ALL' OR h.rr_type = @rr_type)
          AND (@branchname IS NULL OR h.branchname = @branchname)
          AND (@whse_code IS NULL OR h.whse_code = @whse_code)
          AND (@supp_code IS NULL OR h.supp_code = @supp_code)
          AND
          (
            @search IS NULL
            OR h.rr_no LIKE '%' + @search + '%'
            OR h.reference_no LIKE '%' + @search + '%'
            OR s.supp_name LIKE '%' + @search + '%'
            OR h.remarks LIKE '%' + @search + '%'
          )
        GROUP BY h.rr_no, h.rr_date, h.status, h.rr_type, h.branchname, h.whse_code, h.reference_no, h.supp_code, s.supp_name, h.user_id, h.remarks
    ),
    rr_paged AS
    (
        SELECT *, COUNT(1) OVER() AS TotalCount
        FROM rr_source
    )
    SELECT *
    FROM rr_paged
    ORDER BY
        CASE WHEN @sort_field = 'rrNo' AND @sort_dir = 'ASC' THEN RrNo END ASC,
        CASE WHEN @sort_field = 'rrNo' AND @sort_dir = 'DESC' THEN RrNo END DESC,
        CASE WHEN @sort_field = 'rrDate' AND @sort_dir = 'ASC' THEN RrDate END ASC,
        CASE WHEN @sort_field = 'rrDate' AND @sort_dir = 'DESC' THEN RrDate END DESC,
        CASE WHEN @sort_field = 'status' AND @sort_dir = 'ASC' THEN Status END ASC,
        CASE WHEN @sort_field = 'status' AND @sort_dir = 'DESC' THEN Status END DESC,
        CASE WHEN @sort_field = 'suppName' AND @sort_dir = 'ASC' THEN SuppName END ASC,
        CASE WHEN @sort_field = 'suppName' AND @sort_dir = 'DESC' THEN SuppName END DESC,
        RrDate DESC,
        RrNo DESC
    OFFSET @skip ROWS FETCH NEXT @take ROWS ONLY;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_Receiving_UpsertBatch
(
    @rr_no VARCHAR(30) = NULL OUTPUT,
    @row_version VARBINARY(8) = NULL,
    @rr_date DATE,
    @rr_type VARCHAR(3),
    @status CHAR(1),
    @branchname VARCHAR(50),
    @whse_code VARCHAR(30),
    @supp_code VARCHAR(30),
    @reference_no VARCHAR(50) = NULL,
    @remarks VARCHAR(500) = NULL,
    @user_id VARCHAR(50),
    @details dbo.ReceivingDetailBatchType READONLY
)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @status NOT IN ('N', 'U') THROW 51010, 'Receiving upsert accepts only Draft or Approved status.', 1;
    IF @rr_type NOT IN ('RPO', 'RNP') THROW 51011, 'Receiving type must be RPO or RNP.', 1;
    IF NULLIF(LTRIM(RTRIM(@supp_code)), '') IS NULL THROW 51012, 'Supplier is required.', 1;
    IF NOT EXISTS (SELECT 1 FROM @details WHERE qty_received > 0) THROW 51013, 'At least one positive receiving detail is required.', 1;

    IF @rr_type = 'RPO'
    BEGIN
        IF EXISTS (SELECT 1 FROM @details WHERE po_no IS NULL OR po_seq IS NULL)
            THROW 51014, 'RPO receiving requires PO number and PO sequence on every line.', 1;

        IF EXISTS
        (
            SELECT 1
            FROM @details
            GROUP BY po_no, po_seq
            HAVING COUNT(*) > 1
        )
            THROW 51015, 'The same PO line cannot be received twice in one RR.', 1;
    END;

    IF @rr_type = 'RNP' AND EXISTS (SELECT 1 FROM @details WHERE po_no IS NOT NULL OR po_seq IS NOT NULL)
        THROW 51016, 'RNP receiving cannot contain PO references.', 1;

    BEGIN TRANSACTION;

    DECLARE @is_new BIT = CASE WHEN NULLIF(LTRIM(RTRIM(@rr_no)), '') IS NULL THEN 1 ELSE 0 END;
    DECLARE @current_status CHAR(1);
    DECLARE @next_no INT;

    IF @is_new = 1
    BEGIN
        UPDATE dbo.a_rr_number_series WITH (UPDLOCK, HOLDLOCK)
        SET @next_no = last_no = last_no + 1,
            date_changed = SYSUTCDATETIME()
        WHERE series_key = 'RR';

        SET @rr_no = CONCAT('RR', FORMAT(SYSUTCDATETIME(), 'yyyyMM'), RIGHT(CONCAT('00000', @next_no), 5));
    END
    ELSE
    BEGIN
        SELECT @current_status = status
        FROM dbo.a_rr_hdr WITH (UPDLOCK, HOLDLOCK)
        WHERE rr_no = @rr_no;

        IF @current_status IS NULL THROW 51017, 'Receiving document was not found.', 1;
        IF @current_status <> 'N' THROW 51018, 'Only Draft receiving documents can be edited or approved.', 1;
        IF NOT EXISTS (SELECT 1 FROM dbo.a_rr_hdr WHERE rr_no = @rr_no AND row_version = @row_version)
            THROW 51019, 'Receiving document has changed. Reload before saving.', 1;
    END;

    IF @rr_type = 'RPO'
    BEGIN
        IF EXISTS
        (
            SELECT 1
            FROM @details x
            LEFT JOIN dbo.a_po_hdr h WITH (UPDLOCK, HOLDLOCK)
                ON h.po_no = x.po_no
            LEFT JOIN dbo.a_po_det d WITH (UPDLOCK, HOLDLOCK)
                ON d.po_no = x.po_no
               AND d.po_seq = x.po_seq
            WHERE h.po_no IS NULL
               OR d.po_no IS NULL
               OR h.status <> 'A'
               OR h.supp_code <> @supp_code
               OR x.qty_received > (ISNULL(d.qty_po, 0) - ISNULL(d.qty_rcv, 0))
        )
            THROW 51020, 'PO validation failed. The PO must be approved, match the supplier, and have enough open quantity.', 1;
    END;

    IF @is_new = 1
    BEGIN
        INSERT dbo.a_rr_hdr(rr_no, rr_date, rr_type, status, branchname, whse_code, supp_code, reference_no, remarks, user_id, date_changed)
        VALUES (@rr_no, @rr_date, @rr_type, @status, @branchname, @whse_code, @supp_code, @reference_no, @remarks, @user_id, SYSUTCDATETIME());
    END
    ELSE
    BEGIN
        UPDATE dbo.a_rr_hdr
        SET rr_date = @rr_date,
            rr_type = @rr_type,
            status = @status,
            branchname = @branchname,
            whse_code = @whse_code,
            supp_code = @supp_code,
            reference_no = @reference_no,
            remarks = @remarks,
            user_id = @user_id,
            date_changed = SYSUTCDATETIME()
        WHERE rr_no = @rr_no;

        DELETE dbo.a_rr_det WHERE rr_no = @rr_no;
    END;

    INSERT dbo.a_rr_det(rr_no, line_no, po_no, po_seq, item_code, item_desc, qty_rcv, po_um, base_um, po_conv_factor, unit_price)
    SELECT
        @rr_no,
        x.line_no,
        CASE WHEN @rr_type = 'RPO' THEN x.po_no ELSE NULL END,
        CASE WHEN @rr_type = 'RPO' THEN x.po_seq ELSE NULL END,
        CASE WHEN @rr_type = 'RPO' THEN d.item_code ELSE x.item_code END,
        CASE WHEN @rr_type = 'RPO' THEN d.item_desc ELSE x.item_desc END,
        x.qty_received,
        CASE WHEN @rr_type = 'RPO' THEN d.po_um ELSE x.po_um END,
        CASE WHEN @rr_type = 'RPO' THEN ISNULL(d.base_um, d.po_um) ELSE x.base_um END,
        CASE WHEN @rr_type = 'RPO' THEN ISNULL(d.po_conv_factor, 1) ELSE x.po_conv_factor END,
        CASE WHEN @rr_type = 'RPO' THEN ISNULL(d.unit_price, 0) ELSE x.unit_price END
    FROM @details x
    LEFT JOIN dbo.a_po_det d
        ON d.po_no = x.po_no
       AND d.po_seq = x.po_seq
    WHERE x.qty_received > 0;

    IF @status = 'U' AND @rr_type = 'RPO'
    BEGIN
        UPDATE d
        SET d.qty_rcv = ISNULL(d.qty_rcv, 0) + x.qty_received
        FROM dbo.a_po_det d WITH (UPDLOCK, HOLDLOCK)
        INNER JOIN @details x
            ON x.po_no = d.po_no
           AND x.po_seq = d.po_seq;
    END;

    /*
      Posting hook:
      Call the real inventory/AP/GL posting stored procedure here once identified in the backend/database.
      This script intentionally does not invent ledger table names.
    */

    DECLARE @new_row_version VARBINARY(8);
    SELECT @new_row_version = row_version FROM dbo.a_rr_hdr WHERE rr_no = @rr_no;

    COMMIT TRANSACTION;

    SELECT
        @rr_no AS RrNo,
        @status AS Status,
        CAST('' AS XML).value('xs:base64Binary(sql:variable("@new_row_version"))', 'VARCHAR(20)') AS RowVersion,
        CASE WHEN @status = 'U' THEN 'Receiving approved successfully.' ELSE 'Receiving draft saved successfully.' END AS Message;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_Receiving_Reverse
(
    @rr_no VARCHAR(30),
    @row_version VARBINARY(8),
    @reason NVARCHAR(500),
    @user_id VARCHAR(50)
)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF LEN(LTRIM(RTRIM(ISNULL(@reason, '')))) < 5
        THROW 51030, 'A meaningful reversal reason is required.', 1;

    BEGIN TRANSACTION;

    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.a_rr_hdr WITH (UPDLOCK, HOLDLOCK)
        WHERE rr_no = @rr_no
          AND status = 'U'
          AND row_version = @row_version
    )
        THROW 51031, 'Only an unchanged Approved receiving document can be reversed.', 1;

    IF EXISTS
    (
        SELECT 1
        FROM dbo.a_rr_det r
        INNER JOIN dbo.a_po_det p WITH (UPDLOCK, HOLDLOCK)
            ON p.po_no = r.po_no
           AND p.po_seq = r.po_seq
        WHERE r.rr_no = @rr_no
          AND ISNULL(p.qty_rcv, 0) < ISNULL(r.qty_rcv, 0)
    )
        THROW 51032, 'PO received quantity is lower than the receiving quantity and cannot be safely reversed.', 1;

    UPDATE p
    SET p.qty_rcv = ISNULL(p.qty_rcv, 0) - ISNULL(r.qty_rcv, 0)
    FROM dbo.a_po_det p WITH (UPDLOCK, HOLDLOCK)
    INNER JOIN dbo.a_rr_det r
        ON r.po_no = p.po_no
       AND r.po_seq = p.po_seq
    WHERE r.rr_no = @rr_no;

    /*
      Exact inverse posting hook:
      Call the real inventory/AP/GL reversal stored procedure here and THROW if it cannot reverse.
      Do not mark the RR reversed unless downstream documents are safely reversed in this transaction.
    */

    INSERT dbo.a_rr_reversal_log(rr_no, reason, reversed_by, original_row_version)
    VALUES (@rr_no, LTRIM(RTRIM(@reason)), @user_id, @row_version);

    UPDATE dbo.a_rr_hdr
    SET status = 'R',
        date_changed = SYSUTCDATETIME(),
        user_id = @user_id
    WHERE rr_no = @rr_no;

    DECLARE @new_row_version VARBINARY(8);
    SELECT @new_row_version = row_version FROM dbo.a_rr_hdr WHERE rr_no = @rr_no;

    COMMIT TRANSACTION;

    SELECT
        @rr_no AS RrNo,
        'R' AS Status,
        CAST('' AS XML).value('xs:base64Binary(sql:variable("@new_row_version"))', 'VARCHAR(20)') AS RowVersion,
        'Receiving reversed successfully.' AS Message;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_Receiving_ReportData
    @rr_no VARCHAR(30)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        h.rr_no AS RrNo,
        h.rr_date AS RrDate,
        h.status AS Status,
        CASE h.status WHEN 'N' THEN 'Draft' WHEN 'U' THEN 'Approved' WHEN 'R' THEN 'Reversed' WHEN 'C' THEN 'Cancelled' ELSE h.status END AS StatusName,
        h.rr_type AS RrType,
        h.branchname AS BranchName,
        h.whse_code AS WhseCode,
        h.reference_no AS ReferenceNo,
        h.supp_code AS SuppCode,
        ISNULL(s.supp_name, h.supp_code) AS SuppName,
        h.remarks AS Remarks,
        h.user_id AS UserId,
        d.line_no AS LineNo,
        d.po_no AS PoNo,
        d.item_code AS ItemCode,
        d.item_desc AS ItemDesc,
        CAST(d.qty_rcv AS DECIMAL(18,4)) AS QtyReceived,
        d.po_um AS PoUm,
        ISNULL(d.base_um, d.po_um) AS BaseUm,
        CAST(ISNULL(d.po_conv_factor, 1) AS DECIMAL(18,6)) AS PoConvFactor,
        CAST(ISNULL(d.unit_price, 0) AS DECIMAL(18,6)) AS UnitPrice,
        CAST(ISNULL(d.qty_rcv, 0) * ISNULL(d.unit_price, 0) AS DECIMAL(18,4)) AS LineAmount,
        SYSUTCDATETIME() AS PrintTimestamp
    FROM dbo.a_rr_hdr h
    INNER JOIN dbo.a_rr_det d
        ON d.rr_no = h.rr_no
    LEFT JOIN dbo.a_suppliers s
        ON s.supp_code = h.supp_code
    WHERE h.rr_no = @rr_no
    ORDER BY d.line_no;
END;
GO
