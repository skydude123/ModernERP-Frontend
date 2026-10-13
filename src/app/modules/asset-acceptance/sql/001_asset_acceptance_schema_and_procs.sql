/*
Asset Acceptance database objects. Execute against the INVENTORY database.
Assumes the ERP PO tables documented by the existing receiving module:
dbo.a_po_hdr(po_no, po_date, po_type, supp_code, status, branchname)
dbo.a_po_det(po_no, po_seq, item_code, item_desc, qty_po, unit_price)
and dbo.a_suppliers(supp_code, supp_name, active_flag), dbo.BRANCH(branchname).
*/
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET XACT_ABORT ON;
GO

IF OBJECT_ID('dbo.a_asset_category', 'U') IS NULL
CREATE TABLE dbo.a_asset_category(category_code VARCHAR(30) NOT NULL PRIMARY KEY, category_name NVARCHAR(100) NOT NULL, default_useful_life_months INT NOT NULL, active_flag CHAR(1) NOT NULL DEFAULT 'Y');
GO
IF OBJECT_ID('dbo.a_depreciation_method', 'U') IS NULL
CREATE TABLE dbo.a_depreciation_method(method_code VARCHAR(30) NOT NULL PRIMARY KEY, method_name NVARCHAR(100) NOT NULL, active_flag CHAR(1) NOT NULL DEFAULT 'Y');
GO
IF OBJECT_ID('dbo.a_asset_location', 'U') IS NULL
CREATE TABLE dbo.a_asset_location(location_code VARCHAR(30) NOT NULL PRIMARY KEY, location_name NVARCHAR(100) NOT NULL, active_flag CHAR(1) NOT NULL DEFAULT 'Y');
GO
IF OBJECT_ID('dbo.a_asset_custodian', 'U') IS NULL
CREATE TABLE dbo.a_asset_custodian(custodian_code VARCHAR(30) NOT NULL PRIMARY KEY, custodian_name NVARCHAR(150) NOT NULL, active_flag CHAR(1) NOT NULL DEFAULT 'Y');
GO
IF OBJECT_ID('dbo.a_asset_gl_account', 'U') IS NULL
CREATE TABLE dbo.a_asset_gl_account(account_code VARCHAR(30) NOT NULL PRIMARY KEY, account_name NVARCHAR(150) NOT NULL, active_flag CHAR(1) NOT NULL DEFAULT 'Y');
GO

IF NOT EXISTS (SELECT 1 FROM dbo.a_depreciation_method)
INSERT dbo.a_depreciation_method(method_code, method_name) VALUES ('SL','Straight Line'),('DDB','Double Declining Balance'),('NONE','Non-depreciable');
GO
IF NOT EXISTS (SELECT 1 FROM dbo.a_asset_category)
INSERT dbo.a_asset_category(category_code, category_name, default_useful_life_months) VALUES
('VEHICLE','Vehicle',60),('COMPUTER','Computer',36),('PRINTER','Printer',60),('AIRCON','Air Conditioner',60),('MACHINE','Machine',120),('TOOLS','Capitalizable Tools',36),('OFFICE','Office Equipment',60);
GO

IF OBJECT_ID('dbo.a_asset_acceptance_hdr', 'U') IS NULL
CREATE TABLE dbo.a_asset_acceptance_hdr
(
    asset_acceptance_no VARCHAR(30) NOT NULL CONSTRAINT PK_a_asset_acceptance_hdr PRIMARY KEY,
    acceptance_date DATE NOT NULL, po_no VARCHAR(30) NOT NULL, supp_code VARCHAR(30) NOT NULL,
    asset_category_code VARCHAR(30) NOT NULL, branch_name VARCHAR(50) NOT NULL, department VARCHAR(80) NOT NULL,
    received_by VARCHAR(80) NOT NULL, accepted_by VARCHAR(80) NOT NULL, in_service_date DATE NOT NULL,
    asset_location_code VARCHAR(30) NOT NULL, acquisition_mode VARCHAR(20) NOT NULL,
    downpayment_amount DECIMAL(19,4) NOT NULL DEFAULT 0, financed_amount DECIMAL(19,4) NOT NULL DEFAULT 0,
    financing_company NVARCHAR(150) NULL, loan_reference VARCHAR(80) NULL,
    status VARCHAR(15) NOT NULL CONSTRAINT CK_a_asset_acceptance_status CHECK(status IN ('DRAFT','SUBMITTED','ACCEPTED','POSTED','CANCELLED')),
    remarks NVARCHAR(500) NULL, user_id VARCHAR(50) NOT NULL, created_at DATETIME2(0) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_by VARCHAR(50) NULL, updated_at DATETIME2(0) NULL, submitted_by VARCHAR(50) NULL, submitted_at DATETIME2(0) NULL,
    accepted_by_user VARCHAR(50) NULL, accepted_at DATETIME2(0) NULL, posted_by VARCHAR(50) NULL, posted_at DATETIME2(0) NULL,
    cancelled_by VARCHAR(50) NULL, cancelled_at DATETIME2(0) NULL, cancellation_reason NVARCHAR(500) NULL,
    row_version ROWVERSION NOT NULL
);
GO

IF OBJECT_ID('dbo.a_asset_acceptance_det', 'U') IS NULL
CREATE TABLE dbo.a_asset_acceptance_det
(
    asset_acceptance_no VARCHAR(30) NOT NULL, line_no INT NOT NULL, po_seq INT NOT NULL,
    asset_code VARCHAR(50) NOT NULL, description NVARCHAR(255) NOT NULL, qty DECIMAL(18,4) NOT NULL,
    unit_cost DECIMAL(19,4) NOT NULL, tracking_mode VARCHAR(15) NOT NULL,
    serial_no VARCHAR(100) NULL, engine_no VARCHAR(100) NULL, chassis_no VARCHAR(100) NULL, plate_no VARCHAR(50) NULL,
    warranty_info NVARCHAR(255) NULL, condition_status VARCHAR(30) NOT NULL, remarks NVARCHAR(500) NULL,
    depreciation_method_code VARCHAR(30) NOT NULL, useful_life_months INT NOT NULL, residual_value DECIMAL(19,4) NOT NULL,
    depreciation_start_date DATE NOT NULL, asset_cost_account VARCHAR(30) NOT NULL, depreciation_expense_account VARCHAR(30) NOT NULL,
    accumulated_depreciation_account VARCHAR(30) NOT NULL, custodian_code VARCHAR(30) NOT NULL, asset_location_code VARCHAR(30) NOT NULL,
    CONSTRAINT PK_a_asset_acceptance_det PRIMARY KEY(asset_acceptance_no, line_no),
    CONSTRAINT FK_a_asset_acceptance_det_hdr FOREIGN KEY(asset_acceptance_no) REFERENCES dbo.a_asset_acceptance_hdr(asset_acceptance_no) ON DELETE CASCADE,
    CONSTRAINT CK_a_asset_acceptance_qty CHECK(qty > 0),
    CONSTRAINT CK_a_asset_acceptance_tracking CHECK((tracking_mode = 'INDIVIDUAL' AND qty = 1) OR tracking_mode = 'GROUPED')
);
GO

IF OBJECT_ID('dbo.a_asset_master', 'U') IS NULL
CREATE TABLE dbo.a_asset_master
(
    asset_master_id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY, asset_no VARCHAR(40) NOT NULL UNIQUE,
    source_acceptance_no VARCHAR(30) NOT NULL, source_line_no INT NOT NULL, asset_code VARCHAR(50) NOT NULL,
    description NVARCHAR(255) NOT NULL, quantity DECIMAL(18,4) NOT NULL, acquisition_cost DECIMAL(19,4) NOT NULL,
    asset_category_code VARCHAR(30) NOT NULL, in_service_date DATE NOT NULL, branch_name VARCHAR(50) NOT NULL,
    department VARCHAR(80) NOT NULL, serial_no VARCHAR(100) NULL, engine_no VARCHAR(100) NULL, chassis_no VARCHAR(100) NULL, plate_no VARCHAR(50) NULL,
    depreciation_method_code VARCHAR(30) NOT NULL, useful_life_months INT NOT NULL, residual_value DECIMAL(19,4) NOT NULL,
    depreciation_start_date DATE NOT NULL, asset_cost_account VARCHAR(30) NOT NULL, depreciation_expense_account VARCHAR(30) NOT NULL,
    accumulated_depreciation_account VARCHAR(30) NOT NULL, custodian_code VARCHAR(30) NOT NULL, asset_location_code VARCHAR(30) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', created_by VARCHAR(50) NOT NULL, created_at DATETIME2(0) NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_a_asset_master_source UNIQUE(source_acceptance_no, source_line_no)
);
GO

IF OBJECT_ID('dbo.a_asset_acceptance_series', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.a_asset_acceptance_series(series_key VARCHAR(20) NOT NULL PRIMARY KEY, last_no INT NOT NULL, updated_at DATETIME2(0) NOT NULL DEFAULT SYSUTCDATETIME());
    INSERT dbo.a_asset_acceptance_series(series_key,last_no) VALUES ('AA',0);
END;
GO

IF TYPE_ID('dbo.AssetAcceptanceDetailBatchType') IS NULL
CREATE TYPE dbo.AssetAcceptanceDetailBatchType AS TABLE
(
    line_no INT NOT NULL, po_seq INT NOT NULL, asset_code VARCHAR(50) NOT NULL, description NVARCHAR(255) NOT NULL,
    qty DECIMAL(18,4) NOT NULL, unit_cost DECIMAL(19,4) NOT NULL, tracking_mode VARCHAR(15) NOT NULL,
    serial_no VARCHAR(100) NULL, engine_no VARCHAR(100) NULL, chassis_no VARCHAR(100) NULL, plate_no VARCHAR(50) NULL,
    warranty_info NVARCHAR(255) NULL, condition_status VARCHAR(30) NOT NULL, remarks NVARCHAR(500) NULL,
    depreciation_method_code VARCHAR(30) NOT NULL, useful_life_months INT NOT NULL, residual_value DECIMAL(19,4) NOT NULL,
    depreciation_start_date DATE NOT NULL, asset_cost_account VARCHAR(30) NOT NULL, depreciation_expense_account VARCHAR(30) NOT NULL,
    accumulated_depreciation_account VARCHAR(30) NOT NULL, custodian_code VARCHAR(30) NOT NULL, asset_location_code VARCHAR(30) NOT NULL
);
GO

IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.a_asset_acceptance_det') AND name='UX_asset_acceptance_serial') CREATE UNIQUE INDEX UX_asset_acceptance_serial ON dbo.a_asset_acceptance_det(serial_no) WHERE serial_no IS NOT NULL;
GO
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.a_asset_acceptance_det') AND name='UX_asset_acceptance_engine') CREATE UNIQUE INDEX UX_asset_acceptance_engine ON dbo.a_asset_acceptance_det(engine_no) WHERE engine_no IS NOT NULL;
GO
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.a_asset_acceptance_det') AND name='UX_asset_acceptance_chassis') CREATE UNIQUE INDEX UX_asset_acceptance_chassis ON dbo.a_asset_acceptance_det(chassis_no) WHERE chassis_no IS NOT NULL;
GO
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.a_asset_acceptance_det') AND name='UX_asset_acceptance_plate') CREATE UNIQUE INDEX UX_asset_acceptance_plate ON dbo.a_asset_acceptance_det(plate_no) WHERE plate_no IS NOT NULL;
GO
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.a_asset_acceptance_hdr') AND name='IX_asset_acceptance_register') CREATE INDEX IX_asset_acceptance_register ON dbo.a_asset_acceptance_hdr(acceptance_date DESC,status,branch_name,asset_category_code) INCLUDE(po_no,supp_code);
GO

CREATE OR ALTER PROCEDURE dbo.usp_AssetAcceptance_List
 @from_date DATE=NULL,@to_date DATE=NULL,@status VARCHAR(15)='ALL',@branch_name VARCHAR(50)=NULL,@asset_category_code VARCHAR(30)=NULL,
 @search NVARCHAR(100)=NULL,@skip INT=0,@take INT=50,@sort_field VARCHAR(30)='acceptanceDate',@sort_dir VARCHAR(4)='desc'
AS
BEGIN
 SET NOCOUNT ON; SET @take=IIF(@take BETWEEN 1 AND 200,@take,50); SET @skip=IIF(@skip>=0,@skip,0);
 ;WITH src AS (
 SELECT h.asset_acceptance_no,h.acceptance_date,h.po_no,h.supp_code,ISNULL(s.supp_name,h.supp_code) supp_name,h.asset_category_code,h.branch_name,h.status,h.remarks,
 COUNT(d.line_no) line_count,ISNULL(SUM(d.qty*d.unit_cost),0) total_cost
 FROM dbo.a_asset_acceptance_hdr h LEFT JOIN dbo.a_asset_acceptance_det d ON d.asset_acceptance_no=h.asset_acceptance_no LEFT JOIN dbo.a_suppliers s ON s.supp_code=h.supp_code
 WHERE (@from_date IS NULL OR h.acceptance_date>=@from_date) AND (@to_date IS NULL OR h.acceptance_date<=@to_date)
 AND (@status='ALL' OR h.status=@status) AND (@branch_name IS NULL OR h.branch_name=@branch_name) AND (@asset_category_code IS NULL OR h.asset_category_code=@asset_category_code)
 AND (@search IS NULL OR h.asset_acceptance_no LIKE '%'+@search+'%' OR h.po_no LIKE '%'+@search+'%' OR h.supp_code LIKE '%'+@search+'%' OR s.supp_name LIKE '%'+@search+'%' OR d.asset_code LIKE '%'+@search+'%' OR d.description LIKE '%'+@search+'%')
 GROUP BY h.asset_acceptance_no,h.acceptance_date,h.po_no,h.supp_code,s.supp_name,h.asset_category_code,h.branch_name,h.status,h.remarks), numbered AS (
 SELECT *,COUNT(*) OVER() total_count,ROW_NUMBER() OVER(ORDER BY
  CASE WHEN @sort_field='assetAcceptanceNo' AND @sort_dir='asc' THEN asset_acceptance_no END ASC,CASE WHEN @sort_field='assetAcceptanceNo' AND @sort_dir='desc' THEN asset_acceptance_no END DESC,
  CASE WHEN @sort_field='totalCost' AND @sort_dir='asc' THEN total_cost END ASC,CASE WHEN @sort_field='totalCost' AND @sort_dir='desc' THEN total_cost END DESC,
  CASE WHEN @sort_dir='asc' THEN acceptance_date END ASC,CASE WHEN @sort_dir<>'asc' THEN acceptance_date END DESC,asset_acceptance_no DESC) rn FROM src)
 SELECT asset_acceptance_no AssetAcceptanceNo,acceptance_date AcceptanceDate,po_no PoNo,supp_code SuppCode,supp_name SuppName,asset_category_code AssetCategoryCode,branch_name BranchName,status Status,line_count LineCount,total_cost TotalCost,remarks Remarks,total_count TotalCount
 FROM numbered WHERE rn>@skip AND rn<=@skip+@take ORDER BY rn;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_AssetAcceptance_Get
(
    @asset_acceptance_no VARCHAR(30)
)
AS
BEGIN
    SET NOCOUNT ON;

    -------------------------------------------------------------------------
    -- Normalize parameter
    -------------------------------------------------------------------------
    SET @asset_acceptance_no =
        NULLIF(LTRIM(RTRIM(@asset_acceptance_no)), '');

    IF @asset_acceptance_no IS NULL
    BEGIN
        THROW 50001, 'Asset Acceptance Number is required.', 1;
    END;

    -------------------------------------------------------------------------
    -- Result Set 1: Header
    -------------------------------------------------------------------------
    SELECT
        h.asset_acceptance_no                              AS AssetAcceptanceNo,
        h.acceptance_date                                  AS AcceptanceDate,
        h.po_no                                            AS PoNo,
        h.supp_code                                        AS SuppCode,
        ISNULL(NULLIF(LTRIM(RTRIM(s.supp_name)), ''), 
               h.supp_code)                                AS SuppName,
        h.asset_category_code                              AS AssetCategoryCode,
        h.branch_name                                      AS BranchName,
        h.department                                       AS Department,
        h.received_by                                      AS ReceivedBy,
        h.accepted_by                                      AS AcceptedBy,
        h.in_service_date                                  AS InServiceDate,
        h.asset_location_code                              AS AssetLocationCode,
        h.acquisition_mode                                 AS AcquisitionMode,
        h.downpayment_amount                               AS DownpaymentAmount,
        h.financed_amount                                  AS FinancedAmount,
        h.financing_company                                AS FinancingCompany,
        h.loan_reference                                   AS LoanReference,
        h.status                                           AS Status,
        h.remarks                                          AS Remarks,
        h.user_id                                          AS UserId,
        CONVERT(VARCHAR(16), h.row_version, 2)              AS RowVersion
    FROM dbo.a_asset_acceptance_hdr AS h
    LEFT JOIN dbo.a_suppliers AS s
        ON s.supp_code = h.supp_code
    WHERE h.asset_acceptance_no = @asset_acceptance_no;

    -------------------------------------------------------------------------
    -- Result Set 2: Details
    -------------------------------------------------------------------------
    SELECT
        d.line_no                                           AS LineNo,
        d.po_seq                                            AS PoSeq,
        d.asset_code                                        AS AssetCode,
        d.description                                       AS Description,
        d.qty                                               AS Qty,

        CAST(
            CASE
                WHEN ISNULL(p.qty_po, 0) - ISNULL(a.accepted_qty, 0) < 0
                    THEN 0
                ELSE ISNULL(p.qty_po, 0) - ISNULL(a.accepted_qty, 0)
            END
            AS DECIMAL(18, 4)
        )                                                   AS OpenPoQty,

        d.unit_cost                                         AS UnitCost,
        d.tracking_mode                                     AS TrackingMode,
        d.serial_no                                         AS SerialNo,
        d.engine_no                                         AS EngineNo,
        d.chassis_no                                        AS ChassisNo,
        d.plate_no                                          AS PlateNo,
        d.warranty_info                                     AS WarrantyInfo,
        d.condition_status                                  AS ConditionStatus,
        d.remarks                                           AS Remarks,
        d.depreciation_method_code                          AS DepreciationMethodCode,
        d.useful_life_months                                AS UsefulLifeMonths,
        d.residual_value                                    AS ResidualValue,
        d.depreciation_start_date                           AS DepreciationStartDate,
        d.asset_cost_account                                AS AssetCostAccount,
        d.depreciation_expense_account                      AS DepreciationExpenseAccount,
        d.accumulated_depreciation_account                  AS AccumulatedDepreciationAccount,
        d.custodian_code                                    AS CustodianCode,
        d.asset_location_code                               AS AssetLocationCode
    FROM dbo.a_asset_acceptance_det AS d
    INNER JOIN dbo.a_asset_acceptance_hdr AS h
        ON h.asset_acceptance_no = d.asset_acceptance_no
    LEFT JOIN dbo.a_po_det AS p
        ON p.po_no = h.po_no
       AND p.po_seq = d.po_seq
    OUTER APPLY
    (
        SELECT
            SUM(ISNULL(ad.qty, 0)) AS accepted_qty
        FROM dbo.a_asset_acceptance_det AS ad
        INNER JOIN dbo.a_asset_acceptance_hdr AS ah
            ON ah.asset_acceptance_no = ad.asset_acceptance_no
        WHERE ah.po_no = h.po_no
          AND ad.po_seq = d.po_seq
          AND ah.asset_acceptance_no <> @asset_acceptance_no
          AND ISNULL(ah.status, '') <> 'CANCELLED'
    ) AS a
    WHERE d.asset_acceptance_no = @asset_acceptance_no
    ORDER BY d.line_no;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_AssetAcceptance_Upsert
 @asset_acceptance_no VARCHAR(30)=NULL,@acceptance_date DATE,@po_no VARCHAR(30),@supp_code VARCHAR(30),@asset_category_code VARCHAR(30),@branch_name VARCHAR(50),@department VARCHAR(80),@received_by VARCHAR(80),@accepted_by VARCHAR(80),@in_service_date DATE,@asset_location_code VARCHAR(30),@acquisition_mode VARCHAR(20),@downpayment_amount DECIMAL(19,4),@financed_amount DECIMAL(19,4),@financing_company NVARCHAR(150)=NULL,@loan_reference VARCHAR(80)=NULL,@remarks NVARCHAR(500)=NULL,@user_id VARCHAR(50),@expected_row_version VARCHAR(20)=NULL,@details dbo.AssetAcceptanceDetailBatchType READONLY
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 IF NOT EXISTS(SELECT 1 FROM @details) THROW 52001,'At least one asset detail is required.',1;
 IF EXISTS(SELECT 1 FROM @details WHERE tracking_mode='INDIVIDUAL' AND qty<>1) THROW 52002,'Individual tracking requires quantity 1.',1;
 IF EXISTS(SELECT 1 FROM @details WHERE NULLIF(LTRIM(RTRIM(asset_code)),'') IS NULL OR NULLIF(LTRIM(RTRIM(description)),'') IS NULL OR NULLIF(LTRIM(RTRIM(depreciation_method_code)),'') IS NULL OR useful_life_months<1 OR residual_value<0 OR NULLIF(LTRIM(RTRIM(asset_cost_account)),'') IS NULL OR NULLIF(LTRIM(RTRIM(depreciation_expense_account)),'') IS NULL OR NULLIF(LTRIM(RTRIM(accumulated_depreciation_account)),'') IS NULL OR NULLIF(LTRIM(RTRIM(custodian_code)),'') IS NULL OR NULLIF(LTRIM(RTRIM(asset_location_code)),'') IS NULL) THROW 52007,'Each detail requires asset, depreciation, GL account, custodian, and location values.',1;
 IF @acquisition_mode='FINANCED' AND (@financed_amount<=0 OR NULLIF(@financing_company,'') IS NULL OR NULLIF(@loan_reference,'') IS NULL) THROW 52003,'Financing company, loan reference, and financed amount are required.',1;
 BEGIN TRAN;
 IF NOT EXISTS(SELECT 1 FROM dbo.a_po_hdr WITH(UPDLOCK,HOLDLOCK) WHERE po_no=@po_no AND status='A' AND po_type='FAP') THROW 52004,'PO must be an approved Fixed Asset PO.',1;
 IF EXISTS(SELECT 1 FROM @details x LEFT JOIN dbo.a_po_det p WITH(UPDLOCK,HOLDLOCK) ON p.po_no=@po_no AND p.po_seq=x.po_seq OUTER APPLY(SELECT SUM(ad.qty) used_qty FROM dbo.a_asset_acceptance_det ad JOIN dbo.a_asset_acceptance_hdr ah ON ah.asset_acceptance_no=ad.asset_acceptance_no WHERE ah.po_no=@po_no AND ad.po_seq=x.po_seq AND ah.status<>'CANCELLED' AND ah.asset_acceptance_no<>ISNULL(@asset_acceptance_no,''))u WHERE p.po_no IS NULL OR x.qty>ISNULL(p.qty_po,0)-ISNULL(u.used_qty,0)) THROW 52005,'Accepted quantity exceeds the open PO quantity.',1;
 IF NULLIF(@asset_acceptance_no,'') IS NULL
 BEGIN
  UPDATE dbo.a_asset_acceptance_series WITH(UPDLOCK,HOLDLOCK) SET last_no=last_no+1,updated_at=SYSUTCDATETIME() WHERE series_key='AA';
  SELECT @asset_acceptance_no='AA-'+CONVERT(CHAR(6),@acceptance_date,112)+'-'+RIGHT('000000'+CAST(last_no AS VARCHAR(6)),6) FROM dbo.a_asset_acceptance_series WHERE series_key='AA';
  INSERT dbo.a_asset_acceptance_hdr(asset_acceptance_no,acceptance_date,po_no,supp_code,asset_category_code,branch_name,department,received_by,accepted_by,in_service_date,asset_location_code,acquisition_mode,downpayment_amount,financed_amount,financing_company,loan_reference,status,remarks,user_id)
  VALUES(@asset_acceptance_no,@acceptance_date,@po_no,@supp_code,@asset_category_code,@branch_name,@department,@received_by,@accepted_by,@in_service_date,@asset_location_code,@acquisition_mode,@downpayment_amount,@financed_amount,NULLIF(@financing_company,''),NULLIF(@loan_reference,''),'DRAFT',@remarks,@user_id);
 END
 ELSE
 BEGIN
  IF NOT EXISTS(SELECT 1 FROM dbo.a_asset_acceptance_hdr WITH(UPDLOCK,HOLDLOCK) WHERE asset_acceptance_no=@asset_acceptance_no AND status IN('DRAFT','SUBMITTED') AND row_version=CONVERT(VARBINARY(8),@expected_row_version,2)) THROW 52006,'Document changed, is read-only, or no longer exists.',1;
  UPDATE dbo.a_asset_acceptance_hdr SET acceptance_date=@acceptance_date,po_no=@po_no,supp_code=@supp_code,asset_category_code=@asset_category_code,branch_name=@branch_name,department=@department,received_by=@received_by,accepted_by=@accepted_by,in_service_date=@in_service_date,asset_location_code=@asset_location_code,acquisition_mode=@acquisition_mode,downpayment_amount=@downpayment_amount,financed_amount=@financed_amount,financing_company=NULLIF(@financing_company,''),loan_reference=NULLIF(@loan_reference,''),remarks=@remarks,updated_by=@user_id,updated_at=SYSUTCDATETIME() WHERE asset_acceptance_no=@asset_acceptance_no;
  DELETE dbo.a_asset_acceptance_det WHERE asset_acceptance_no=@asset_acceptance_no;
 END;
 INSERT dbo.a_asset_acceptance_det SELECT @asset_acceptance_no,line_no,po_seq,asset_code,description,qty,unit_cost,tracking_mode,NULLIF(serial_no,''),NULLIF(engine_no,''),NULLIF(chassis_no,''),NULLIF(plate_no,''),warranty_info,condition_status,remarks,depreciation_method_code,useful_life_months,residual_value,depreciation_start_date,asset_cost_account,depreciation_expense_account,accumulated_depreciation_account,custodian_code,asset_location_code FROM @details;
 COMMIT;
 SELECT @asset_acceptance_no AssetAcceptanceNo,status Status,CONVERT(VARCHAR(20),row_version,2) RowVersion,'Asset acceptance saved.' Message FROM dbo.a_asset_acceptance_hdr WHERE asset_acceptance_no=@asset_acceptance_no;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_AssetAcceptance_Transition @asset_acceptance_no VARCHAR(30),@action VARCHAR(15),@user_id VARCHAR(50),@expected_row_version VARCHAR(20)=NULL,@reason NVARCHAR(500)=NULL
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON; SET @action=UPPER(@action); BEGIN TRAN;
 DECLARE @status VARCHAR(15); SELECT @status=status FROM dbo.a_asset_acceptance_hdr WITH(UPDLOCK,HOLDLOCK) WHERE asset_acceptance_no=@asset_acceptance_no;
 IF @status IS NULL THROW 52010,'Document no longer exists.',1;
 IF @action='POST' AND @status='POSTED' BEGIN COMMIT; SELECT @asset_acceptance_no AssetAcceptanceNo,'POSTED' Status,CONVERT(VARCHAR(20),row_version,2) RowVersion,'Document was already posted; no duplicate asset cards were created.' Message,0 AssetCardsCreated FROM dbo.a_asset_acceptance_hdr WHERE asset_acceptance_no=@asset_acceptance_no; RETURN; END;
 IF NOT EXISTS(SELECT 1 FROM dbo.a_asset_acceptance_hdr WHERE asset_acceptance_no=@asset_acceptance_no AND row_version=CONVERT(VARBINARY(8),@expected_row_version,2)) THROW 52010,'Document changed; reload it before continuing.',1;
 IF @action='SUBMIT' AND @status='DRAFT' UPDATE dbo.a_asset_acceptance_hdr SET status='SUBMITTED',submitted_by=@user_id,submitted_at=SYSUTCDATETIME(),updated_by=@user_id,updated_at=SYSUTCDATETIME() WHERE asset_acceptance_no=@asset_acceptance_no;
 ELSE IF @action='ACCEPT' AND @status='SUBMITTED' UPDATE dbo.a_asset_acceptance_hdr SET status='ACCEPTED',accepted_by_user=@user_id,accepted_at=SYSUTCDATETIME(),updated_by=@user_id,updated_at=SYSUTCDATETIME() WHERE asset_acceptance_no=@asset_acceptance_no;
 ELSE IF @action='CANCEL' AND @status<>'POSTED' AND @status<>'CANCELLED' UPDATE dbo.a_asset_acceptance_hdr SET status='CANCELLED',cancelled_by=@user_id,cancelled_at=SYSUTCDATETIME(),cancellation_reason=@reason,updated_by=@user_id,updated_at=SYSUTCDATETIME() WHERE asset_acceptance_no=@asset_acceptance_no;
 ELSE IF @action='POST' AND @status='ACCEPTED'
 BEGIN
  INSERT dbo.a_asset_master(asset_no,source_acceptance_no,source_line_no,asset_code,description,quantity,acquisition_cost,asset_category_code,in_service_date,branch_name,department,serial_no,engine_no,chassis_no,plate_no,depreciation_method_code,useful_life_months,residual_value,depreciation_start_date,asset_cost_account,depreciation_expense_account,accumulated_depreciation_account,custodian_code,asset_location_code,created_by)
  SELECT @asset_acceptance_no+'-'+RIGHT('000'+CAST(d.line_no AS VARCHAR(3)),3),h.asset_acceptance_no,d.line_no,d.asset_code,d.description,d.qty,d.qty*d.unit_cost,h.asset_category_code,h.in_service_date,h.branch_name,h.department,d.serial_no,d.engine_no,d.chassis_no,d.plate_no,d.depreciation_method_code,d.useful_life_months,d.residual_value,d.depreciation_start_date,d.asset_cost_account,d.depreciation_expense_account,d.accumulated_depreciation_account,d.custodian_code,d.asset_location_code,@user_id FROM dbo.a_asset_acceptance_hdr h JOIN dbo.a_asset_acceptance_det d ON d.asset_acceptance_no=h.asset_acceptance_no WHERE h.asset_acceptance_no=@asset_acceptance_no AND NOT EXISTS(SELECT 1 FROM dbo.a_asset_master m WHERE m.source_acceptance_no=d.asset_acceptance_no AND m.source_line_no=d.line_no);
  DECLARE @created INT=@@ROWCOUNT; UPDATE dbo.a_asset_acceptance_hdr SET status='POSTED',posted_by=@user_id,posted_at=SYSUTCDATETIME(),updated_by=@user_id,updated_at=SYSUTCDATETIME() WHERE asset_acceptance_no=@asset_acceptance_no;
 END
 ELSE THROW 52011,'The requested workflow transition is not allowed for the current status.',1;
 COMMIT;
 SELECT asset_acceptance_no AssetAcceptanceNo,status Status,CONVERT(VARCHAR(20),row_version,2) RowVersion,CONCAT('Asset acceptance ',LOWER(status),'.') Message,CASE WHEN @action='POST' THEN ISNULL(@created,0) END AssetCardsCreated FROM dbo.a_asset_acceptance_hdr WHERE asset_acceptance_no=@asset_acceptance_no;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_AssetAcceptance_Delete @asset_acceptance_no VARCHAR(30),@user_id VARCHAR(50),@expected_row_version VARCHAR(20)
AS
BEGIN
 SET NOCOUNT ON; DELETE dbo.a_asset_acceptance_hdr WHERE asset_acceptance_no=@asset_acceptance_no AND status='DRAFT' AND row_version=CONVERT(VARBINARY(8),@expected_row_version,2);
 IF @@ROWCOUNT=0 THROW 52012,'Only the current Draft version can be deleted.',1;
 SELECT @asset_acceptance_no AssetAcceptanceNo,'CANCELLED' Status,NULL RowVersion,'Draft asset acceptance deleted.' Message;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_AssetAcceptance_GetFixedAssetPos @search VARCHAR(100)=NULL
AS
BEGIN SET NOCOUNT ON; SELECT TOP(100) h.po_no PoNo,h.po_date PoDate,h.supp_code SuppCode,ISNULL(s.supp_name,h.supp_code) SuppName,h.branchname BranchName,COUNT(*) OpenLineCount,SUM((d.qty_po-ISNULL(x.used_qty,0))*d.unit_price) OpenAmount FROM dbo.a_po_hdr h JOIN dbo.a_po_det d ON d.po_no=h.po_no LEFT JOIN dbo.a_suppliers s ON s.supp_code=h.supp_code OUTER APPLY(SELECT SUM(ad.qty) used_qty FROM dbo.a_asset_acceptance_det ad JOIN dbo.a_asset_acceptance_hdr ah ON ah.asset_acceptance_no=ad.asset_acceptance_no WHERE ah.po_no=h.po_no AND ad.po_seq=d.po_seq AND ah.status<>'CANCELLED')x WHERE h.status='A' AND h.po_type='FAP' AND d.qty_po>ISNULL(x.used_qty,0) AND (@search IS NULL OR h.po_no LIKE '%'+@search+'%' OR s.supp_name LIKE '%'+@search+'%') GROUP BY h.po_no,h.po_date,h.supp_code,s.supp_name,h.branchname ORDER BY h.po_date DESC; END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_AssetAcceptance_GetFixedAssetPoLines @po_no VARCHAR(30)
AS
BEGIN SET NOCOUNT ON; SELECT d.po_no PoNo,d.po_seq PoSeq,d.item_code AssetCode,d.item_desc Description,d.qty_po OrderedQty,ISNULL(x.used_qty,0) AcceptedQty,d.qty_po-ISNULL(x.used_qty,0) OpenQty,d.unit_price UnitCost,CAST(NULL AS VARCHAR(30)) AssetCategoryCode FROM dbo.a_po_det d OUTER APPLY(SELECT SUM(ad.qty) used_qty FROM dbo.a_asset_acceptance_det ad JOIN dbo.a_asset_acceptance_hdr ah ON ah.asset_acceptance_no=ad.asset_acceptance_no WHERE ah.po_no=d.po_no AND ad.po_seq=d.po_seq AND ah.status<>'CANCELLED')x WHERE d.po_no=@po_no AND d.qty_po>ISNULL(x.used_qty,0) ORDER BY d.po_seq; END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_AssetAcceptance_GetSuppliers @search VARCHAR(100)=NULL AS BEGIN SET NOCOUNT ON; SELECT supp_code SuppCode,supp_name SuppName FROM dbo.a_suppliers WHERE active_flag='Y' AND (@search IS NULL OR supp_code LIKE '%'+@search+'%' OR supp_name LIKE '%'+@search+'%') ORDER BY supp_name; END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_AssetAcceptance_GetBranches @search VARCHAR(100)=NULL AS BEGIN SET NOCOUNT ON; SELECT branchname BranchName FROM dbo.BRANCH WHERE @search IS NULL OR branchname LIKE '%'+@search+'%' ORDER BY branchname; END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_AssetAcceptance_GetCategories @search VARCHAR(100)=NULL AS BEGIN SET NOCOUNT ON; SELECT category_code Code,category_name Name FROM dbo.a_asset_category WHERE active_flag='Y' AND (@search IS NULL OR category_code LIKE '%'+@search+'%' OR category_name LIKE '%'+@search+'%') ORDER BY category_name; END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_AssetAcceptance_GetDepreciationMethods @search VARCHAR(100)=NULL AS BEGIN SET NOCOUNT ON; SELECT method_code Code,method_name Name FROM dbo.a_depreciation_method WHERE active_flag='Y' AND (@search IS NULL OR method_code LIKE '%'+@search+'%' OR method_name LIKE '%'+@search+'%') ORDER BY method_name; END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_AssetAcceptance_GetLocations @search VARCHAR(100)=NULL AS BEGIN SET NOCOUNT ON; SELECT location_code Code,location_name Name FROM dbo.a_asset_location WHERE active_flag='Y' AND (@search IS NULL OR location_code LIKE '%'+@search+'%' OR location_name LIKE '%'+@search+'%') ORDER BY location_name; END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_AssetAcceptance_GetCustodians @search VARCHAR(100)=NULL AS BEGIN SET NOCOUNT ON; SELECT custodian_code Code,custodian_name Name FROM dbo.a_asset_custodian WHERE active_flag='Y' AND (@search IS NULL OR custodian_code LIKE '%'+@search+'%' OR custodian_name LIKE '%'+@search+'%') ORDER BY custodian_name; END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_AssetAcceptance_GetAccounts @search VARCHAR(100)=NULL AS BEGIN SET NOCOUNT ON; SELECT account_code Code,account_name Name FROM dbo.a_asset_gl_account WHERE active_flag='Y' AND (@search IS NULL OR account_code LIKE '%'+@search+'%' OR account_name LIKE '%'+@search+'%') ORDER BY account_name; END;
GO
