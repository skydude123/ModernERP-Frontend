ALTER PROCEDURE dbo.usp_PurchaseOrder_ListPage
(
    @from_date   DATE = NULL,
    @to_date     DATE = NULL,
    @status      VARCHAR(10) = 'ALL',
    @branchname  VARCHAR(15) = NULL,
    @search      VARCHAR(100) = NULL,
    @skip        INT = 0,
    @take        INT = 50,
    @sort_field  VARCHAR(50) = 'poDate',
    @sort_dir    VARCHAR(4) = 'DESC'
)
AS
BEGIN
    SET NOCOUNT ON;

    SET @skip = CASE WHEN @skip < 0 THEN 0 ELSE ISNULL(@skip, 0) END;
    SET @take = CASE WHEN ISNULL(@take, 0) <= 0 THEN 50 ELSE @take END;
    SET @status = NULLIF(LTRIM(RTRIM(ISNULL(@status, 'ALL'))), '');
    SET @branchname = NULLIF(LTRIM(RTRIM(@branchname)), '');
    SET @search = NULLIF(LTRIM(RTRIM(@search)), '');
    SET @sort_field = ISNULL(NULLIF(LTRIM(RTRIM(@sort_field)), ''), 'poDate');
    SET @sort_dir = CASE WHEN UPPER(@sort_dir) = 'ASC' THEN 'ASC' ELSE 'DESC' END;

    ;WITH po_source AS
    (
        SELECT
            h.po_no AS PoNo,
            h.po_date AS PoDate,
            h.po_del_date AS PoDelDate,
            h.po_type AS PoType,
            h.term_code AS TermCode,
            ISNULL(t.term_description, h.term_code) AS TermDescription,
            h.status AS Status,
            CASE h.status
                WHEN 'N' THEN 'Draft'
                WHEN 'P' THEN 'Posted'
                WHEN 'A' THEN 'Approved'
                WHEN 'C' THEN 'Cancelled'
                ELSE h.status
            END AS StatusName,
            h.vat_type AS VatType,
            ISNULL(v.tax_name, h.vat_type) AS TaxName,
            h.cheque_type AS ChequeType,
            CASE h.cheque_type
                WHEN 'N' THEN 'N/A'
                WHEN 'P' THEN 'PDC'
                WHEN 'O' THEN 'COD'
                WHEN 'C' THEN 'Cash'
                ELSE h.cheque_type
            END AS ChequeTypeName,
            h.supp_code AS SuppCode,
            ISNULL(s.supp_name, h.supp_code) AS SuppName,
            h.branchname AS BranchName,
            h.so_no AS SoNo,
            h.remarks AS Remarks,
            h.cust_id AS CustId,
            h.user_id AS UserId,
            h.date_changed AS DateChanged,
            COUNT(d.po_no) AS LineCount,
            ISNULL(SUM(ISNULL(d.qty_po, 0) * ISNULL(d.unit_price, 0)), 0) AS TotalAmount,
            CAST(
                CASE
                    WHEN EXISTS
                    (
                        SELECT 1
                        FROM dbo.ReceivingReceiptDetail rr
                        WHERE rr.po_no = h.po_no
                    )
                    THEN 1
                    ELSE 0
                END AS BIT
            ) AS HasReceiving
        FROM dbo.PurchaseOrderHeader h
        LEFT JOIN dbo.PurchaseOrderDetail d
            ON d.po_no = h.po_no
        LEFT JOIN dbo.Supplier s
            ON s.supp_code = h.supp_code
        LEFT JOIN dbo.Terms t
            ON t.term_code = h.term_code
        LEFT JOIN dbo.TaxType v
            ON v.vat_type = h.vat_type
        WHERE
            -- Date filtering is inclusive for @to_date by using < DATEADD(DAY, 1, @to_date).
            -- This works safely even if po_date is datetime.
            (@from_date IS NULL OR h.po_date >= @from_date)
            AND (@to_date IS NULL OR h.po_date < DATEADD(DAY, 1, @to_date))
            AND (@status IS NULL OR @status = 'ALL' OR h.status = @status)
            AND (@branchname IS NULL OR h.branchname = @branchname)
            AND
            (
                @search IS NULL
                OR h.po_no LIKE '%' + @search + '%'
                OR h.supp_code LIKE '%' + @search + '%'
                OR s.supp_name LIKE '%' + @search + '%'
                OR h.so_no LIKE '%' + @search + '%'
                OR h.remarks LIKE '%' + @search + '%'
            )
        GROUP BY
            h.po_no,
            h.po_date,
            h.po_del_date,
            h.po_type,
            h.term_code,
            t.term_description,
            h.status,
            h.vat_type,
            v.tax_name,
            h.cheque_type,
            h.supp_code,
            s.supp_name,
            h.branchname,
            h.so_no,
            h.remarks,
            h.cust_id,
            h.user_id,
            h.date_changed
    ),
    po_paged AS
    (
        SELECT
            *,
            COUNT(1) OVER() AS TotalCount
        FROM po_source
    )
    SELECT
        PoNo,
        PoDate,
        PoDelDate,
        PoType,
        TermCode,
        TermDescription,
        Status,
        StatusName,
        VatType,
        TaxName,
        ChequeType,
        ChequeTypeName,
        SuppCode,
        SuppName,
        BranchName,
        SoNo,
        Remarks,
        CustId,
        UserId,
        DateChanged,
        LineCount,
        TotalAmount,
        HasReceiving,
        TotalCount
    FROM po_paged
    ORDER BY
        CASE WHEN @sort_field = 'poNo' AND @sort_dir = 'ASC' THEN PoNo END ASC,
        CASE WHEN @sort_field = 'poNo' AND @sort_dir = 'DESC' THEN PoNo END DESC,
        CASE WHEN @sort_field = 'poDate' AND @sort_dir = 'ASC' THEN PoDate END ASC,
        CASE WHEN @sort_field = 'poDate' AND @sort_dir = 'DESC' THEN PoDate END DESC,
        CASE WHEN @sort_field = 'status' AND @sort_dir = 'ASC' THEN Status END ASC,
        CASE WHEN @sort_field = 'status' AND @sort_dir = 'DESC' THEN Status END DESC,
        CASE WHEN @sort_field = 'branchName' AND @sort_dir = 'ASC' THEN BranchName END ASC,
        CASE WHEN @sort_field = 'branchName' AND @sort_dir = 'DESC' THEN BranchName END DESC,
        CASE WHEN @sort_field = 'suppName' AND @sort_dir = 'ASC' THEN SuppName END ASC,
        CASE WHEN @sort_field = 'suppName' AND @sort_dir = 'DESC' THEN SuppName END DESC,
        CASE WHEN @sort_field = 'totalAmount' AND @sort_dir = 'ASC' THEN TotalAmount END ASC,
        CASE WHEN @sort_field = 'totalAmount' AND @sort_dir = 'DESC' THEN TotalAmount END DESC,
        PoDate DESC,
        PoNo DESC
    OFFSET @skip ROWS FETCH NEXT @take ROWS ONLY;
END;
