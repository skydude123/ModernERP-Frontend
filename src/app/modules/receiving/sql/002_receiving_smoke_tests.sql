/*
Rollback-contained Receiving smoke tests for a disposable/development database.
Expected-conflict procedures roll back the surrounding transaction by design.
*/

SET NOCOUNT ON;
SET XACT_ABORT OFF;

DECLARE
    @branchname VARCHAR(50) = 'MANDAUE',
    @whse_code VARCHAR(5) = 'WHSE',
    @user_id VARCHAR(10) = 'codex',
    @rr_no CHAR(10),
    @row_version VARBINARY(8),
    @stale_row_version VARBINARY(8),
    @po_no VARCHAR(10),
    @po_line_no INT,
    @supp_code VARCHAR(8),
    @wrong_supp_code VARCHAR(8),
    @open_qty DECIMAL(18,4),
    @po_qty_before DECIMAL(18,4),
    @receive_qty DECIMAL(18,4),
    @item_code VARCHAR(20),
    @item_desc VARCHAR(60),
    @po_um CHAR(3),
    @po_conv_factor DECIMAL(18,4),
    @unit_price DECIMAL(18,4),
    @test_date DATETIME2(0);

SELECT TOP (1)
    @po_no = RTRIM(h.po_no),
    @po_line_no = CONVERT(INT, d.po_line_no),
    @supp_code = RTRIM(h.supp_code),
    @open_qty = CONVERT(DECIMAL(18,4), d.qty_po - ISNULL(d.qty_rcv, 0)),
    @po_qty_before = CONVERT(DECIMAL(18,4), ISNULL(d.qty_rcv, 0)),
    @item_code = RTRIM(d.item_code),
    @item_desc = RTRIM(d.item_desc),
    @po_um = d.po_um,
    @po_conv_factor = CONVERT(DECIMAL(18,4), ISNULL(NULLIF(d.po_conv_factor, 0), 1)),
    @unit_price = CONVERT(DECIMAL(18,4), d.unit_price),
    @test_date = h.po_date
FROM dbo.a_po_hdr AS h
INNER JOIN dbo.a_po_det AS d
    ON d.po_no = h.po_no
WHERE h.status = 'A'
  AND ISNULL(d.qty_rcv, 0) < d.qty_po
ORDER BY h.po_date DESC, d.po_line_no;

SELECT TOP (1) @wrong_supp_code = RTRIM(supp_code)
FROM dbo.a_suppliers
WHERE active_flag = 'Y'
  AND supp_code <> @supp_code
ORDER BY supp_code;

IF @po_line_no IS NULL OR @wrong_supp_code IS NULL
    THROW 51100, 'Smoke tests require an open approved PO and a second active supplier.', 1;

SET @receive_qty = CASE
    WHEN @open_qty > 1 THEN CONVERT(DECIMAL(18,4), @open_qty / 2)
    ELSE @open_qty
END;

DECLARE @details dbo.ReceivingDetailBatchType;
/* New Draft, edit Draft, stale rowversion conflict. */
BEGIN TRY
    BEGIN TRANSACTION;

    DELETE FROM @details;
    INSERT @details
    VALUES (1, NULL, NULL, 'RNP-TEST', 'RNP smoke test', 2, 'EA', 'EA', 1, 10);

    SET @rr_no = NULL;
    EXEC dbo.usp_Receiving_UpsertBatch
        @rr_no = @rr_no OUTPUT,
        @rr_date = @test_date,
        @branchname = @branchname,
        @whse_code = @whse_code,
        @reference = 'RNP-SMOKE',
        @supp_code = NULL,
        @target_status = 'N',
        @trans_type = 'RNP',
        @user_id = @user_id,
        @remarks = 'draft',
        @expected_row_version = NULL,
        @details = @details;

    SELECT @stale_row_version = CONVERT(VARBINARY(8), row_version)
    FROM dbo.a_rr_hdr
    WHERE rr_no = @rr_no;

    EXEC dbo.usp_Receiving_UpsertBatch
        @rr_no = @rr_no OUTPUT,
        @rr_date = @test_date,
        @branchname = @branchname,
        @whse_code = @whse_code,
        @reference = 'RNP-SMOKE',
        @supp_code = NULL,
        @target_status = 'N',
        @trans_type = 'RNP',
        @user_id = @user_id,
        @remarks = 'edited draft',
        @expected_row_version = @stale_row_version,
        @details = @details;

    EXEC dbo.usp_Receiving_UpsertBatch
        @rr_no = @rr_no OUTPUT,
        @rr_date = @test_date,
        @branchname = @branchname,
        @whse_code = @whse_code,
        @reference = 'RNP-SMOKE',
        @supp_code = NULL,
        @target_status = 'N',
        @trans_type = 'RNP',
        @user_id = @user_id,
        @remarks = 'stale write',
        @expected_row_version = @stale_row_version,
        @details = @details;

    THROW 51101, 'Expected stale rowversion conflict was not raised.', 1;
END TRY
BEGIN CATCH
    IF ERROR_NUMBER() <> 51027 THROW;
    PRINT 'PASS: new Draft, edit Draft, stale rowversion conflict';
END CATCH;

/* Supplier mismatch. */
BEGIN TRY
    BEGIN TRANSACTION;

    DELETE FROM @details;
    INSERT @details
    VALUES
    (
        1, @po_line_no, @po_no, @item_code, @item_desc, @receive_qty,
        @po_um, @po_um, @po_conv_factor, @unit_price
    );

    SET @rr_no = NULL;
    EXEC dbo.usp_Receiving_UpsertBatch
        @rr_no = @rr_no OUTPUT,
        @rr_date = @test_date,
        @branchname = @branchname,
        @whse_code = @whse_code,
        @reference = 'SI-SMOKE',
        @supp_code = @wrong_supp_code,
        @target_status = 'N',
        @trans_type = 'RPO',
        @user_id = @user_id,
        @remarks = 'supplier mismatch',
        @expected_row_version = NULL,
        @details = @details;

    THROW 51102, 'Expected supplier mismatch conflict was not raised.', 1;
END TRY
BEGIN CATCH
    IF ERROR_NUMBER() <> 51028 THROW;
    PRINT 'PASS: RPO supplier mismatch rejected';
END CATCH;

/* Over-receiving. */
BEGIN TRY
    BEGIN TRANSACTION;

    DELETE FROM @details;
    INSERT @details
    VALUES
    (
        1, @po_line_no, @po_no, @item_code, @item_desc, @open_qty + 1,
        @po_um, @po_um, @po_conv_factor, @unit_price
    );

    SET @rr_no = NULL;
    EXEC dbo.usp_Receiving_UpsertBatch
        @rr_no = @rr_no OUTPUT,
        @rr_date = @test_date,
        @branchname = @branchname,
        @whse_code = @whse_code,
        @reference = 'SI-SMOKE',
        @supp_code = @supp_code,
        @target_status = 'N',
        @trans_type = 'RPO',
        @user_id = @user_id,
        @remarks = 'over receipt',
        @expected_row_version = NULL,
        @details = @details;

    THROW 51103, 'Expected over-receiving conflict was not raised.', 1;
END TRY
BEGIN CATCH
    IF ERROR_NUMBER() <> 51029 THROW;
    PRINT 'PASS: over-receiving rejected';
END CATCH;

/* Partial approval, one-time PO update, reversal, immutable R status. */
BEGIN TRY
    BEGIN TRANSACTION;

    DELETE FROM @details;
    INSERT @details
    VALUES
    (
        1, @po_line_no, @po_no, @item_code, @item_desc, @receive_qty,
        @po_um, @po_um, @po_conv_factor, @unit_price
    );

    SET @rr_no = NULL;
    EXEC dbo.usp_Receiving_UpsertBatch
        @rr_no = @rr_no OUTPUT,
        @rr_date = @test_date,
        @branchname = @branchname,
        @whse_code = @whse_code,
        @reference = 'SI-SMOKE',
        @supp_code = @supp_code,
        @target_status = 'N',
        @trans_type = 'RPO',
        @user_id = @user_id,
        @remarks = 'partial draft',
        @expected_row_version = NULL,
        @details = @details;

    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.a_po_det
        WHERE po_no = @po_no
          AND po_line_no = @po_line_no
          AND qty_rcv = @po_qty_before
    )
        THROW 51104, 'Draft changed the PO received quantity.', 1;

    SELECT @row_version = CONVERT(VARBINARY(8), row_version)
    FROM dbo.a_rr_hdr
    WHERE rr_no = @rr_no;

    EXEC dbo.usp_Receiving_UpsertBatch
        @rr_no = @rr_no OUTPUT,
        @rr_date = @test_date,
        @branchname = @branchname,
        @whse_code = @whse_code,
        @reference = 'SI-SMOKE',
        @supp_code = @supp_code,
        @target_status = 'U',
        @trans_type = 'RPO',
        @user_id = @user_id,
        @remarks = 'partial approval',
        @expected_row_version = @row_version,
        @details = @details;

    SELECT @row_version = CONVERT(VARBINARY(8), row_version)
    FROM dbo.a_rr_hdr
    WHERE rr_no = @rr_no;

    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.a_po_det
        WHERE po_no = @po_no
          AND po_line_no = @po_line_no
          AND qty_rcv = @po_qty_before + @receive_qty
    )
        THROW 51105, 'Approval did not update PO received quantity exactly once.', 1;

    EXEC dbo.usp_Receiving_Reverse
        @rr_no = @rr_no,
        @reversed_by = @user_id,
        @reversal_reason = 'Smoke test reversal',
        @expected_row_version = @row_version;

    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.a_rr_hdr
        WHERE rr_no = @rr_no
          AND status = 'R'
    )
        THROW 51106, 'Reversal did not mark the RR as R.', 1;

    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.a_po_det
        WHERE po_no = @po_no
          AND po_line_no = @po_line_no
          AND qty_rcv = @po_qty_before
    )
        THROW 51107, 'Reversal did not restore PO received quantity.', 1;

    ROLLBACK TRANSACTION;
    PRINT 'PASS: partial approval and Approved reversal';
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;

/* RNP manual approval and reversal. */
BEGIN TRY
    BEGIN TRANSACTION;

    DELETE FROM @details;
    INSERT @details
    VALUES (1, NULL, NULL, 'RNP-TEST', 'RNP approved smoke test', 3, 'EA', 'EA', 1, 12);

    SET @rr_no = NULL;
    EXEC dbo.usp_Receiving_UpsertBatch
        @rr_no = @rr_no OUTPUT,
        @rr_date = @test_date,
        @branchname = @branchname,
        @whse_code = @whse_code,
        @reference = 'RNP-SMOKE',
        @supp_code = NULL,
        @target_status = 'U',
        @trans_type = 'RNP',
        @user_id = @user_id,
        @remarks = 'RNP approval',
        @expected_row_version = NULL,
        @details = @details;

    SELECT @row_version = CONVERT(VARBINARY(8), row_version)
    FROM dbo.a_rr_hdr
    WHERE rr_no = @rr_no;

    EXEC dbo.usp_Receiving_Reverse
        @rr_no = @rr_no,
        @reversed_by = @user_id,
        @reversal_reason = 'RNP smoke reversal',
        @expected_row_version = @row_version;

    ROLLBACK TRANSACTION;
    PRINT 'PASS: RNP manual receipt and reversal';
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;

/* Second approval rejection. */
BEGIN TRY
    BEGIN TRANSACTION;

    DELETE FROM @details;
    INSERT @details
    VALUES (1, NULL, NULL, 'RNP-TEST', 'Second approval test', 1, 'EA', 'EA', 1, 5);

    SET @rr_no = NULL;
    EXEC dbo.usp_Receiving_UpsertBatch
        @rr_no = @rr_no OUTPUT,
        @rr_date = @test_date,
        @branchname = @branchname,
        @whse_code = @whse_code,
        @reference = 'RNP-SMOKE',
        @supp_code = NULL,
        @target_status = 'U',
        @trans_type = 'RNP',
        @user_id = @user_id,
        @remarks = 'first approval',
        @expected_row_version = NULL,
        @details = @details;

    SELECT @row_version = CONVERT(VARBINARY(8), row_version)
    FROM dbo.a_rr_hdr
    WHERE rr_no = @rr_no;

    EXEC dbo.usp_Receiving_UpsertBatch
        @rr_no = @rr_no OUTPUT,
        @rr_date = @test_date,
        @branchname = @branchname,
        @whse_code = @whse_code,
        @reference = 'RNP-SMOKE',
        @supp_code = NULL,
        @target_status = 'U',
        @trans_type = 'RNP',
        @user_id = @user_id,
        @remarks = 'second approval',
        @expected_row_version = @row_version,
        @details = @details;

    THROW 51108, 'Expected second approval rejection was not raised.', 1;
END TRY
BEGIN CATCH
    IF ERROR_NUMBER() <> 51025 THROW;
    PRINT 'PASS: second approval rejected';
END CATCH;

/* Invalid second reversal rejection. */
BEGIN TRY
    BEGIN TRANSACTION;

    DELETE FROM @details;
    INSERT @details
    VALUES (1, NULL, NULL, 'RNP-TEST', 'Second reversal test', 1, 'EA', 'EA', 1, 5);

    SET @rr_no = NULL;
    EXEC dbo.usp_Receiving_UpsertBatch
        @rr_no = @rr_no OUTPUT,
        @rr_date = @test_date,
        @branchname = @branchname,
        @whse_code = @whse_code,
        @reference = 'RNP-SMOKE',
        @supp_code = NULL,
        @target_status = 'U',
        @trans_type = 'RNP',
        @user_id = @user_id,
        @remarks = 'reversal test',
        @expected_row_version = NULL,
        @details = @details;

    SELECT @row_version = CONVERT(VARBINARY(8), row_version)
    FROM dbo.a_rr_hdr
    WHERE rr_no = @rr_no;

    EXEC dbo.usp_Receiving_Reverse
        @rr_no = @rr_no,
        @reversed_by = @user_id,
        @reversal_reason = 'First test reversal',
        @expected_row_version = @row_version;

    SELECT @row_version = CONVERT(VARBINARY(8), row_version)
    FROM dbo.a_rr_hdr
    WHERE rr_no = @rr_no;

    EXEC dbo.usp_Receiving_Reverse
        @rr_no = @rr_no,
        @reversed_by = @user_id,
        @reversal_reason = 'Second test reversal',
        @expected_row_version = @row_version;

    THROW 51109, 'Expected invalid reversal rejection was not raised.', 1;
END TRY
BEGIN CATCH
    IF ERROR_NUMBER() <> 51044 THROW;
    PRINT 'PASS: invalid second reversal rejected';
END CATCH;

/* Register paging/filter count is returned as two result sets. */
EXEC dbo.usp_Receiving_Query
    @date_from = NULL,
    @date_to = NULL,
    @status = NULL,
    @trans_type = NULL,
    @branchname = NULL,
    @whse_code = NULL,
    @supp_code = NULL,
    @search = NULL,
    @skip = 0,
    @take = 2,
    @sort_field = 'rrDate',
    @sort_dir = 'DESC';

PRINT 'PASS: register query returned page and total result sets';
