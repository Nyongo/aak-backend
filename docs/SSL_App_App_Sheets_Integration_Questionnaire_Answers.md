# SSL App & App Sheets Integration – Questionnaire Answers

This document provides answers to the integration questionnaire, based on the **jf-backend** codebase. “App Sheets” here refers to **Google Sheets** (spreadsheet-based data store) and, where relevant, **AppSheet** (api.appsheet.com). The “SSL App” is the application layer that uses this backend and syncs with those data stores.

---

## 1. Narrative description of how the SSL App is integrated with App Sheets currently

The SSL App integrates with **App Sheets** in two ways:

**A) Google Sheets (primary “App Sheets” data store)**  
- The backend uses the **Google Sheets API v4** with a **service account** (via `GoogleAuthService` and `SheetsService`).  
- Two spreadsheet IDs are configured: `GOOGLE_SHEETS_BORROWERS_ID` and `GOOGLE_SHEETS_BORROWERS_ID_2`.  
- Data is read from and written to multiple **tabs** (e.g. Borrowers, Credit Applications, Directors, Loans) within these spreadsheets.  
- The SSL App keeps a **PostgreSQL database** (Prisma) as the primary data store and uses **sync services** to push/pull data to/from Google Sheets so that sheet data stays aligned with the database (e.g. after creating or updating borrowers, credit applications, or loans).

**B) AppSheet (api.appsheet.com)**  
- A separate integration exists via **AppSheetService**, which calls the AppSheet REST API (v2) using an Application Access Key and App ID.  
- The SSL App **reads** from AppSheet tables (e.g. Borrowers, Teachers, Schools) for operations such as borrower/teacher lookups and listing schools.  
- **Writes** to AppSheet are limited (e.g. adding Teachers). Most write traffic goes to Google Sheets and Postgres.

In summary: the SSL App treats **Google Sheets as the shared “App Sheets” store** for loan/borrower/application data, with Postgres as the app’s primary store and sync logic in the backend to keep both in sync.

---

## 2. All scenarios in which the SSL App currently writes to App Sheets

The SSL App writes to **Google Sheets** (App Sheets) in these scenarios:

| Scenario | Description | Sheet(s) / tab(s) |
|----------|-------------|--------------------|
| **Borrower sync** | After creating/updating borrowers in Postgres, unsynced records are pushed to Sheets (e.g. via `sync-to-sheets` or `BorrowersSyncService.syncBorrowerToSheet`). | Borrowers |
| **Credit application sync** | New or updated credit applications are written to the Credit Applications tab (create or update by sheetId). | Credit Applications |
| **Director sync** | Unsynced directors are synced from Postgres to the Users (or Directors) tab. | Users |
| **CRB Consent** | New or updated CRB consent records are appended or updated. | CRB Consent |
| **Referrer** | New or updated referrer records are written. | Referrers |
| **Active Debt** | Active debt records are added or updated. | Active Debt |
| **Fee Plan / Fee Plan Documents** | Fee plan document records are appended or updated. | Fee Plan Documents |
| **Payroll** | Payroll records are added or updated. | Payroll |
| **Enrollment Reports** | Enrollment verification/report records are written. | Enrollment Reports |
| **Bank Statements** | M-Pesa/bank statement records are added or updated. | Bank Statements |
| **Audited Financial Statements** | Audited financial records are written. | Audited Financial Statements |
| **Student Breakdown** | Student breakdown data is appended. | Student Breakdown |
| **Other Supporting Documents** | Other supporting doc records are written. | Other Supporting Documents |
| **Investment Committee** | Investment committee records are added or updated. | Investment Committee |
| **Home Visits** | Home visit records are written. | Home Visits |
| **Asset Titles** | Asset title/collateral records are added or updated. | Asset Titles |
| **Contract Details** | Contract details are added or updated. | Contract Details |
| **Principal Tranches** | Principal tranche records are written. | Principal Tranches |
| **Direct Lending Processing** | Direct lending payment/processing records are written. | Direct Lending Processing |
| **Impact Survey** | Impact survey responses are written. | Impact Survey |
| **Write Offs** | Write-off records are written. | Write Offs |
| **Restructurings** | Restructuring records are written. | Restructurings |
| **Loans** | Loan records are added or updated. | Loans |
| **Vendor Disbursement Details** | Vendor disbursement detail records are written. | Vendor Disbursement Details |
| **Financial Survey** | Financial survey records are written. | Financial Survey |
| **Credit Application Comments** | Comments on credit applications are written. | Credit Application Comments |
| **Direct Payment Schedules** | Direct payment schedule rows are written. | Direct Payment Schedules (tab name as used in sync) |

Writes are performed by **sync services** (e.g. `CreditApplicationsSyncService`, `BorrowersSyncService`, `ContractDetailsSyncService`) and migration/sync endpoints (e.g. `POST .../sync-to-sheets`, `POST .../sync/:id`).  
**AppSheet** writes are limited (e.g. adding a Teacher via the AppSheet API).

---

## 3. All scenarios in which the SSL App currently reads from App Sheets

The SSL App reads from **App Sheets** in these scenarios:

**From Google Sheets:**

| Scenario | Description | Sheet(s) / tab(s) |
|----------|-------------|--------------------|
| **Borrower list (by SSL ID)** | Fetch borrowers for a given SSL ID (e.g. for CRM/SSL app UI). | Borrowers |
| **All borrowers** | Full or filtered borrower list from Sheets. | Borrowers |
| **Directors** | Directors by borrower or full list. | Users |
| **CRB Consent** | List or lookup of CRB consent records. | CRB Consent |
| **Referrers** | Referrer list/lookup. | Referrers |
| **Credit Applications** | Credit application list, by ID or other filters. | Credit Applications |
| **Active Debt** | Active debt records for applications/borrowers. | Active Debt |
| **Fee Plan Documents** | Fee plan document data. | Fee Plan Documents |
| **Payroll** | Payroll data. | Payroll |
| **Enrollment Reports** | Enrollment verification/report data. | Enrollment Reports |
| **Bank Statements** | Bank/M-Pesa statement data. | Bank Statements |
| **Audited Financial Statements** | Audited financial data. | Audited Financial Statements |
| **Student Breakdown** | Student breakdown data. | Student Breakdown |
| **Other Supporting Documents** | Supporting document metadata. | Other Supporting Documents |
| **Investment Committee** | Investment committee records (including large range). | Investment Committee |
| **Home Visits** | Home visit records. | Home Visits |
| **Asset Titles** | Asset title/collateral data. | Asset Titles |
| **Contract Details** | Contract details. | Contract Details |
| **Principal Tranches** | Principal tranche data. | Principal Tranches |
| **Direct Lending Processing** | Direct lending processing records. | Direct Lending Processing |
| **Impact Survey** | Impact survey data. | Impact Survey |
| **Write Offs** | Write-off records. | Write Offs |
| **Restructurings** | Restructuring records. | Restructurings |
| **Loans** | Loan list and detail. | Loans |
| **Vendor Disbursement Details** | Vendor disbursement details. | Vendor Disbursement Details |
| **Financial Survey** | Financial survey data. | Financial Survey |
| **Credit Application Comments** | Comments for credit applications. | Credit Application Comments |
| **Direct Payment Schedules** | Payment schedule rows. | Direct Payment Schedules |
| **Migration / import** | Bulk import from Sheets into Postgres (e.g. `import-from-sheets` for borrowers, directors, credit applications, etc.). | Various tabs above |

**From AppSheet (api.appsheet.com):**

| Scenario | Description | AppSheet table(s) |
|----------|-------------|-------------------|
| **Borrowers** | List all borrowers (with optional caching). | Borrowers |
| **Teachers** | List teachers; find by name. | Teachers |
| **Schools** | List schools. | Schools |
| **Generic table** | Arbitrary table read via `getTableData(tableName)`. | Any configured table |

Reads from Google Sheets use `SheetsService` (e.g. `getBorrowers(sslId)`, `getDirectors()`, `getCreditApplications()`, `getSheetData(sheetName)`). Reads from AppSheet use `AppSheetService` (e.g. `getBorrowers()`, `getTeachers()`, `getSchools()`, `getTableData(tableName)`).

---

## 4. Required API endpoints for the SSL App to integrate with the loan management system

**Context for this question**  
The organisation is planning to **migrate the core banking solution from AppSheet to a proper core banking platform** (e.g. MIFOS), while **keeping the SSL App** for:

1. **Loan origination** – submitting and managing credit applications and related data (borrowers, directors, supporting documents, etc.).  
2. **Field officer visibility** – giving field officers (identified by SSL ID) up-to-date status on their logged credit applications and on loans already disbursed.

The list below describes the **API contract that the core banking solution (e.g. MIFOS) must expose**—or that an intermediary layer (BFF/adapter) must provide—so that the SSL App can continue to support loan origination and field-officer status visibility after the migration. Endpoints are expressed as required **operations** with arguments and expected behaviour; the actual path and request format will depend on the chosen core banking product (e.g. MIFOS REST API) and any adapter in front of it.

---

### A. Loan origination (SSL App → core banking)

These endpoints support the SSL App’s role as the **loan origination** channel: creating and updating clients, applications, and supporting data in the core banking system.

| # | Operation | Method | Arguments / body | Expected behaviour |
|---|-----------|--------|-------------------|---------------------|
| 1 | **Create or get client (borrower)** | POST / GET | Body or query: client/borrower identity (e.g. name, nationalId, phone, type/sector). Optional: `sslId` (field officer ID) for attribution. | Create a new client in core banking or return existing client by identifier; response must include stable **client/borrower ID** for linking applications and loans. |
| 2 | **Update client (borrower)** | PUT/PATCH | Path: client id. Body: updated client fields (contact, bank details, status, etc.). | Update client master data; return updated client. |
| 3 | **Create loan/credit application** | POST | Body: borrowerId, product/loan product id, requested amount, currency, term (months), purpose, application date, `sslId` (field officer), optional metadata (e.g. credit type, working capital app number, referred by). | Create application in core banking; return **application id** and status (e.g. Pending, In Review, Approved, Rejected). |
| 4 | **Update loan/credit application** | PUT/PATCH | Path: application id. Body: updatable fields (amount, term, status, internal notes, `sslAction`, `sslFeedbackOnAction`, etc.). | Update application; return updated application and status. |
| 5 | **Get application by id** | GET | Path: application id. | Return full application details and current status (for origination workflow and field officer view). |
| 6 | **Upload/link document to application** | POST | Path: application id (or client id). Body/multipart: document type (e.g. photoOfCheck, feePlan, auditedFinancial, collateral), file or file reference. | Attach document to application (or client); return document id or confirmation. |
| 7 | **Create or update loan (after approval)** | POST / PUT | Body: application id (or client id), product id, principal, interest terms, disbursement details, `sslId`. | Create loan from approved application or update loan details; return **loan id** and status. |
| 8 | **Disburse loan** | POST/PATCH | Path: loan id. Body: disbursement date, amount, transaction reference (optional). | Mark loan as disbursed (or record tranche); return updated loan and repayment schedule if applicable. |

Supporting data that the SSL App currently sends (fee plans, payroll, enrollment, bank statements, audited financials, collateral/asset titles, contract details, investment committee data, home visits, impact survey, vendor disbursement details, etc.) can be either: (i) sent as **payloads within the application create/update** (e.g. nested or as custom fields), or (ii) sent via **separate “supporting data” endpoints** that accept application id (or client id) + type + payload. The core banking system (or adapter) should accept and store enough of this data to support underwriting and audit, and optionally to sync back into the SSL App for display.

---

### B. Field officer visibility (core banking → SSL App)

These endpoints support **field officers** (identified by **SSL ID**) to see up-to-date status for their **logged credit applications** and for **loans already disbursed**.

| # | Operation | Method | Arguments | Expected behaviour |
|---|-----------|--------|------------|---------------------|
| 9 | **List applications by field officer (SSL ID)** | GET | Query: `sslId` (required), optional: `status`, `fromDate`, `toDate`, `borrowerId`. | Return list of credit/loan applications attributed to that SSL ID, with current status (e.g. Pending, In Review, Approved, Rejected), borrower name, requested amount, dates. |
| 10 | **Get application status** | GET | Path: application id. Optional query: `sslId` (for scoping). | Return application summary and **current status** (and, if allowed, next steps or rejection reason). |
| 11 | **List loans by field officer (SSL ID)** | GET | Query: `sslId` (required), optional: `loanStatus`, `borrowerId`, `fromDate`, `toDate`. | Return list of **disbursed loans** (and optionally approved-not-yet-disbursed) attributed to that SSL ID, with loan id, borrower, principal, outstanding balance, status, next due date. |
| 12 | **Get loan details and repayment status** | GET | Path: loan id. Optional query: `sslId`. | Return loan summary, **current status**, repayment schedule (or link to it), amounts due/paid, PAR (e.g. par30), next installment date. |
| 13 | **Get repayment schedule for a loan** | GET | Path: loan id. Optional: schedule type (e.g. principal-only vs full schedule). | Return list of installments (due date, principal, interest, fees, amount paid, balance, days late). |
| 14 | **List clients/borrowers by field officer (SSL ID)** | GET | Query: `sslId` (required). | Return list of clients/borrowers linked to that SSL ID (for “my borrowers” view and dropdowns in origination). |

Attribution of applications and loans to an **SSL ID** (field officer) must be stored in the core banking system when creating applications/loans (see operations 3 and 7) so that reads by `sslId` (operations 9, 11, 14) return only that officer’s data. If the core system uses a different notion of “loan officer” or “created by”, the adapter must map it to/from `sslId`.

---

### C. Additional behaviour and notes

- **Authentication / authorisation:** All endpoints must be secured (e.g. API key or OAuth). Field-officer scoping by `sslId` should be enforced so officers see only their own applications and loans (unless role allows otherwise).  
- **Idempotency:** Create application and create loan should support idempotency (e.g. client-generated id or idempotency key) to avoid duplicates when the SSL App retries.  
- **Sync direction:** Today the SSL App pushes data to AppSheet/Sheets. After migration, the SSL App will **push** origination data to the core banking system and **pull** status and repayment data from it; the core banking system is the source of truth for loan and repayment state.  
- **Current jf-backend behaviour:** The existing jf-backend implements similar operations locally (credit applications, loans, borrowers, directors, sync to Sheets, etc.). The above table is the **target contract** for the new core banking solution so that the SSL App (and any existing or new backend in front of it) can be adapted to call these endpoints instead of (or in addition to) writing to App Sheets / current backend.

---

## 5. Schema for the App Sheets data store (Google Sheets)

The App Sheets data store is implemented as **Google Sheets** with one workbook per env (e.g. `GOOGLE_SHEETS_BORROWERS_ID`) and **one tab per entity**. Column names are the “schema”; types are not enforced by Sheets. The backend maps header row names to DTOs/Prisma. Below are the **table (tab) names** and **column names** as implied by the codebase (Prisma/DB mappings and sync logic).

- **Borrowers** – e.g. SSL ID, Name, Customer Type, Type, Location Description, Society Certificate, Year Founded, Location Pin, Historical Payment Details, Payment Method, Bank Name, Account Name, Account Number, Primary Phone, Document Verifying Account, Manager Verification, Status, Notes, Entity Type, Registration Number, Notes On Status, Official Search, Peleza Search, Products Requested, Data Collection Progress, Initial Contact Notes, KRA Pin Photo, KRA Pin Number, Created At, Created By, How Heard, Month Year Created, Moe Certified, Moe Certificate, County, CR12, National Id Number, National Id Front, National Id Back, Date Of Birth, Private Or Apbet, related fields (e.g. Related Credit Applications, Related Handovers, Related CRB Consents, Related Collaterals, Related Users, Related Referrers, Related Customer Care Calls, Related Escalations, Related Enrollment Reports, Related Loans, Related Dir Payment Schedules), Synced, ID (sheet row id).  
- **Users** (used for Directors) – Director-related columns: ID, Borrower ID, Name, National Id Number, KRA Pin Number, Phone Number, Email, Gender, Role In School, Status, Date Of Birth, Education Level, Insured For Credit Life, Address, Postal Address, National Id Front, National Id Back, KRA Pin Photo, Passport Photo, Created At, Synced, Type.  
- **CRB Consent** – ID, Borrower ID, Agreement, Signed By Name, Date, Role In Organization, Signature, Created At, Synced.  
- **Referrers** – ID, School ID, Referrer Name, Mpesa Number, Referral Reward Paid, Date Paid, Amount Paid, Proof Of Payment, Created At, Synced.  
- **Credit Applications** – ID, Customer Type, Borrower ID, Application Start Date, Credit Type, Total Amount Requested, Working Capital Application Number, SSL Action Needed, SSL Action, SSL ID, SSL Feedback On Action, School CRB Available?, Status, Referred By, Current Cost Of Capital, Checks Collected, Checks Needed For Loan, Photo Of Check, Comments On Checks, Created At, Final Amount Approved And Disbursed, Synced.  
- **Active Debt** – ID, Credit Application ID, Debt Status, Listed On CRB, Personal Loan Or School Loan, Lender, Date Loan Taken, Final Due Date, Total Loan Amount, Balance, Amount Overdue, Monthly Payment, Debt Statement, Annual Declining Balance Interest Rate, Is Loan Collateralized, Type Of Collateral, What Was Loan Used For, Created At, Synced.  
- **Fee Plan Documents** – Columns aligned with FeePlan (Credit Application ID, School Year, Photo, File, Created At, Synced, ID).  
- **Payroll** – ID, Credit Application ID, Role, Number Of Employees In Role, Monthly Salary, Months Per Year The Role Is Paid, Notes, Total Annual Cost, Created At, Synced.  
- **Enrollment Reports** – ID, Credit Application ID, Sub County Enrollment Report, Enrollment Report, Number Of Students This Year/Last Year/Two Years Ago, Created At, Synced.  
- **Bank Statements** – ID, Credit Application ID, Personal Or Business Account, Type, Account Details, Description, Statement, Statement Start Date, Statement End Date, Total Revenue, Converted Excel File, Created At, Synced.  
- **Audited Financial Statements** – ID, Credit Application ID, Statement Type, Notes, File, Created At, Synced.  
- **Student Breakdown** – ID, Credit Application ID, Fee Type, Term, Grade, Number Of Students, Fee, Total Revenue, Created At, Synced.  
- **Other Supporting Documents** – ID, Credit Application ID, Document Type, Notes, File, Image, Created At, Synced.  
- **Investment Committee** – Many columns including Credit Application ID, Audited Financials Provided, School Has Bank Account And Checks, Annual Revenue From Bank And MPesa Statements, Total Cash Held, Debt Ratio, Loan Length Months, Annual Reducing Interest Rate, Total Estimated Value Of Assets, Predicted Days Late, Average Bank Balance, and numerous calculated/risk fields (e.g. Total Annual Revenue From Fees From Student Breakdown Unadjusted, Age Of School, Annual Donation Revenue, Maximum Loan, School Credit Risk, School Id, SSL Id, Synced, Created At, ID).  
- **Home Visits** – ID, Credit Application ID, User ID, County, Address Details, Location Pin, Own Or Rent, How Many Years Stayed, Marital Status, How Many Children, Is Spouse Involved In School, Does Spouse Have Other Income, etc., Created At, Synced.  
- **Asset Titles** – ID, Credit Application ID, Type, To Be Used As Security, Description, Legal Owner, User ID, Full Owner Details, Collateral Owned By Director Of School, Plot Number, School Sits On Land, Has Comprehensive Insurance, Original Insurance Coverage, Initial Estimated Value, Evaluators Market Value, Evaluators Forced Value, Money Owed On Asset, License Plate Number, Engine CC, Year Of Manufacture, Logbook Photo, Title Deed Photo, Full Title Deed, Evaluators Report, Created At, Synced.  
- **Contract Details** – ID, Credit Application ID, Loan Length Requested Months, Months School Requests Forgiveness, Disbursal Date Requested, Ten Percent Down On Vehicle Or Land Financing, Created By, Created At, Synced.  
- **Credit Application Comments** – ID, Credit Application ID, Commenter Type, Comments, Commenter Name, Created At, Synced.  
- **Principal Tranches** – ID, Direct Loan ID, Contract Signing Date, Amount, SSL ID, Initial Disbursement Date In Contract, Date Tranche Has Gone Par30, Created At, Created By, Has Female Director, Loan Type, Reassigned, Team Leader, Region, Synced.  
- **Direct Lending Processing** – ID, Payment Type, Payment Source, Borrower Type, Borrower ID, Direct Loan ID, Payment Schedule ID, Payment Date, Amount Paid, Payment Reference Or Transaction Code, installment fields (Principal, Interest, Vehicle Insurance, etc.), Created By, SSL ID, Region, Synced, Created At.  
- **Impact Survey** – ID, Credit Application ID, Survey Date, Director ID, Created By, and many survey question columns (e.g. Is School APBET Or Private, What Kind Of Area, Grade Levels, Student Count, Classroom Count, etc.), Synced, Created At.  
- **Write Offs** – ID, Date, Loan ID, Payment Schedule ID, Principal Amount Written Off, Interest Amount Written Off, Vehicle Insurance Amount Written Off, Total Amount, Created At Sheet, Created By, Region, SSL ID, Loan Or Payment Level, Penalty Amount Written Off, Synced, Created At.  
- **Restructurings** – ID, Loan ID, Date, Restructuring Date, Reason, Previous/New Loan Terms, Principal Amounts, Interest Rates, Number Of Months, Monthly Payment, Approved By, Approval Date, Created At Sheet, Created By, Region, SSL ID, Notes, Synced, Created At.  
- **Loans** – Many columns including Sheet Id, Loan Type, Loan Purpose, Borrower Type, Borrower ID, Borrower Name, Principal Amount, Interest Type, Annual Declining/Flat Interest, Processing Fee %, Credit Life Insurance %, Securitization Fee, Processing Fee, Credit Life Insurance Fee, Number Of Months, Daily Penalty, Amount To Disburse, Total Comprehensive Vehicle Insurance Payments To Pay, Total Interest Charged/To Pay, Total Principal To Pay, Credit Application ID, First Payment Period, Created By, totals for paid/penalties/insurance, PAR (par14, par30, par60, par90, par120), Amount Overdue, Loan Fully Paid, Loan Status, Total Amount Due To Date, Amount Disbursed To Date, Balance Of Disbursements Owed, Principal Paid To Date, Outstanding Principal Balance, collateral/insurance/director flags, Percent Disbursed, Days Late, Restructured, Region, SSL ID, Loan Number, Team Leader, Created At, Synced, etc.  
- **Vendor Disbursement Details** – ID, Credit Application ID, Vendor Payment Method, Phone Number For MPesa Payment, Manager Verification, Document Verifying Payment Account, Bank Name, Account Name, Account Number, Phone Number For Bank Account, Paybill Number And Account, Buy Goods Till, Created At, Synced.  
- **Financial Survey** – ID, Credit Application ID, Survey Date, Director ID, and many survey fields (e.g. School Grades, Is School APBET Or Private, Church Support, Facility Ownership, Annual Lease Rent, Owner Annual Withdrawal, Monthly Debt Payments, Provides Meals, Termly Food/Fuel Expense, etc.), Created At, Synced.  
- **Direct Payment Schedules** – ID, Borrower ID, Due Date, Amount Due, Amount Paid, Created At, Synced, and many payment/forgiveness/insurance columns (e.g. Adjusted Month, Amount Still Unpaid, Borrower Type, Check Cashing Status, Credit Life Insurance fields, Date Fully Paid, Days Late, Debt Type, Direct Loan ID, Holiday Forgiveness, Interest Charged Without Forgiveness, Interest Repayment Due, Notes On Payment, par14/30/60/90/120, Payment Overdue, Principal Repayment Due, Vehicle Insurance fields, SSL ID, Date To Bank Check, Loan Category, Write Off Date, Interest Suspended, Region, Date For Mpesa Bank Transfer, Created By).  

Exact column names in the live sheets may differ slightly (e.g. spacing or casing); the application uses the first row as headers and maps by name.

---

## 6. Schema for the SSL App data store

The SSL App data store is **PostgreSQL** managed with **Prisma**. The schema is defined in `prisma/schema.prisma`. Below is a concise list of **tables and main columns** used for loan/borrower/application and related data (excluding non-JF modules such as CaseStudy, Newsletter, ContactMessage, ProductCategory, Supplier, Product, SalesOrder, etc.).

**Core identity & users**  
- **User** – id, password, createdAt, email, name, phoneNumber, roleId, isActive, lastLoggedInOn, requirePasswordReset, lastPasswordChangedOn.  
- **Role** – id, name, createdAt, createdById, isActive, lastUpdatedAt, lastUpdatedById.  
- **Permission** – id, name.  
- **RolePermission** – id, roleId, permissionId.

**SSL / schools**  
- **SslStaff** – id, name, type, borrowerId, email, sslId, nationalIdNumber, nationalIdFront/Back, kraPinNumber/Photo, phoneNumber, status, roleInSchool, dateOfBirth, address, gender, postalAddress, startDate, insuredForCreditLife, paymentThisMonth, terminationDate, educationLevel, sslEmail, secondaryRole, monthlyTarget, creditLifeHelper, teamLeader, passportPhoto, sslLevel, sslArea, isActive, createdAt, lastUpdatedAt, createdById, lastUpdatedById.  
- **School** – id, name, schoolId, email, phoneNumber, address, postalAddress, county, region, schoolType, status, principalName/Phone/Email, totalStudents, totalTeachers, registrationNumber, establishmentDate, isActive, createdAt, lastUpdatedAt, createdById, lastUpdatedById, locationPin, sslId.  
- **DailyWorkPlan** – id, date, plannedVisit, actualGpsCoordinates, callsMadeDescription, notes, supervisorReview, status, sslStaffId, createdAt, lastUpdatedAt, createdById, lastUpdatedById, locationIsVerified, marketingOfficerComments, pinnedLocation, region, schoolName, taskOfTheDay, teamLeaderId, schoolId, transportCost, isVerified, verifiedOn, verifiedBy, isPaid.

**Borrowers & directors**  
- **Borrower** – id, sheetId, customerType, type, name, locationDescription, societyCertificate, yearFounded, sslId, locationPin, historicalPaymentDetails, paymentMethod, bankName, accountName, accountNumber, primaryPhone, documentVerifyingAccount, managerVerification, status, notes, entityType, registrationNumber, notesOnStatus, officialSearch, pelezaSearch, productsRequested, dataCollectionProgress, initialContactNotes, kraPinPhoto, kraPinNumber, createdAt, createdBy, howHeard, monthYearCreated, moeCertified, moeCertificate, county, cr12, nationalIdNumber, nationalIdFront/Back, dateOfBirth, privateOrApbet, relatedCreditApplications, relatedHandoversGivingId/ReceivingId, relatedCrbConsents, relatedCollaterals, relatedUsers, relatedReferrers, relatedCustomerCareCalls, relatedEscalations, relatedEnrollmentReports, relatedLoans, relatedDirPaymentSchedules, relatedCollateralsByLoanId, synced, cbsClientId, cbsResourceId.  
- **Director** – id, sheetId, borrowerId, name, nationalIdNumber, kraPinNumber, phoneNumber, email, gender, roleInSchool, status, dateOfBirth, educationLevel, insuredForCreditLife, address, postalAddress, nationalIdFront/Back, kraPinPhoto, passportPhoto, createdAt, synced, type.

**Credit & loans**  
- **CreditApplication** – id, sheetId, customerType, borrowerId, applicationStartDate, creditType, workingCapitalApplicationNumber, sslActionNeeded, sslAction, sslId, sslFeedbackOnAction, schoolCrbAvailable, referredBy, photoOfCheck, status, commentsOnChecks, createdAt, synced, totalAmountRequested, currentCostOfCapital, checksCollected, checksNeededForLoan, finalAmountApprovedAndDisbursed.  
- **Loan** – id, sheetId, loanType, loanPurpose, borrowerType, borrowerId, borrowerName, principalAmount, interestType, annualDecliningInterest, annualFlatInterest, processingFeePercentage, creditLifeInsurancePercentage, securitizationFee, processingFee, creditLifeInsuranceFee, numberOfMonths, dailyPenalty, amountToDisburse, totalComprehensiveVehicleInsurancePaymentsToPay, totalInterestCharged/ToPay, totalPrincipalToPay, creditApplicationId, firstPaymentPeriod, createdBy, totalLoanAmountPaidIncludingPenaltiesAndInsurance, totalPenaltiesAssessed/Paid, penaltiesStillDue, sslId, loanOverdue, par14/30/60/90/120, amountOverdue, loanFullyPaid, loanStatus, totalAmountDueToDate, amountDisbursedToDateIncludingFees, balanceOfDisbursementsOwed, principalPaidToDate, outstandingPrincipalBalance, numberOfAssetsUsedAsCollateral, numberOfAssetsRecorded, allCollateralRecorded, principalDifference, creditLifeInsuranceSubmitted, directorHasCompletedCreditLifeHealthExamination, recordOfReceiptForCreditLifeInsurance, percentDisbursed, daysLate, totalUnpaidLiability, restructured, collateralCheckedByLegalTeam, hasFemaleDirector, reportsGenerated, contractUploaded, percentChargeOnVehicleInsuranceFinancing, customerCareCallDone, checksHeld, remainingPeriodsForChecks, adequateChecksForRemainingPeriods, totalLiabilityAmountFromContract, liabilityCheck, creditLifeInsurer, interestChargedVsDueDifference, principalDueWithForgivenessVsWithoutForgiveness, insuranceDueWithVsWithoutForgiveness, firstLoan, additionalFeesWithheldFromDisbursement, daysSinceCreation, referral, numberOfInstallmentsOverdue, amountPaidTowardsOverdueInstallments, borrowerIdForContracts, mostRecentInstallmentPartiallyPaid, willingnessToPay, capabilityToPay, loanRiskCategory, calculatedAmountToDisburse, differenceBetweenCalculatedAndRecordedDisbursement, teachers, totalInterestPaid, outstandingInterestBalance, totalVehicleInsuranceDue/Paid, outstandingVehicleInsuranceBalance, reassigned, flexiLoan, loanQualifiesForCatalyzeProgram, allStaff, loanHasGonePAR30, hasMaleDirector, schoolArea, firstDisbursement, totalAdditionalFeesNotWithheldFromDisbursement, additionalFeesNotWithheldFromDisbursementPaid/StillDue, averageSchoolFees, contractingDate, submittedToCatalyze, mostRecentContract, mostRecentContractType, schoolType, howManyClassroomsWillBeConstructedWithTheLoan, howManyVehiclesWillBePurchasedWithTheLoan, principalWrittenOff, interestWrittenOff, vehicleInsuranceWrittenOff, segmentedRepaymentView, beforeJan12024, loanNumber, teamLeader, vehicleInsuranceWithoutForgivenessCheck, vehicleInsuranceWithForgivenessCheck, suspendedInterestCharged, suspendedInterestDue, region, exciseDuty, createdAt, synced, totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleInsurance.

**Supporting entities (each with id, sheetId, synced, createdAt where applicable)**  
- **CrbConsent** – borrowerId, agreement, signedByName, date, roleInOrganization, signature.  
- **Referrer** – schoolId, referrerName, mpesaNumber, referralRewardPaid, datePaid, amountPaid, proofOfPayment.  
- **ActiveDebt** – creditApplicationId, debtStatus, listedOnCrb, personalLoanOrSchoolLoan, lender, dateLoanTaken, finalDueDate, totalLoanAmount, balance, amountOverdue, monthlyPayment, debtStatement, annualDecliningBalanceInterestRate, isLoanCollateralized, typeOfCollateral, whatWasLoanUsedFor.  
- **FeePlan** – creditApplicationId, schoolYear, photo, file.  
- **Payroll** – creditApplicationId, role, numberOfEmployeesInRole, monthlySalary, monthsPerYearTheRoleIsPaid, notes, totalAnnualCost.  
- **EnrollmentVerification** – creditApplicationId, subCountyEnrollmentReport, enrollmentReport, numberOfStudentsThisYear/LastYear/TwoYearsAgo.  
- **MpesaBankStatement** – creditApplicationId, personalOrBusinessAccount, type, accountDetails, description, statement, statementStartDate, statementEndDate, totalRevenue, convertedExcelFile.  
- **AuditedFinancial** – creditApplicationId, statementType, notes, file.  
- **StudentBreakdown** – creditApplicationId, feeType, term, grade, numberOfStudents, fee, totalRevenue.  
- **OtherSupportingDoc** – creditApplicationId, documentType, notes, file, image.  
- **InvestmentCommittee** – creditApplicationId and many calculated/risk fields (auditedFinancialsProvided, schoolHasBankAccountAndChecks, annualRevenueFromBankaAndMPesaStatements, totalCashHeldInBankAndMPesaAccounts, debtRatio, loanLengthMonths, annualReducingInterestRate, totalEstimatedValueOfAssets, predictedDaysLate, averageBankBalance, totalAnnualRevenueFromFeesFromStudentBreakdownUnadjusted, ageOfSchool, schoolCreditRisk, schoolId, sslId, maximumLoan, etc.).  
- **VendorDisbursementDetail** – creditApplicationId, vendorPaymentMethod, phoneNumberForMPesaPayment, managerVerification, documentVerifyingPaymentAccount, bankName, accountName, accountNumber, phoneNumberForBankAccount, paybillNumberAndAccount, buyGoodsTill.  
- **HomeVisit** – creditApplicationId, userId, county, addressDetails, locationPin, ownOrRent, howManyYearsStayed, maritalStatus, howManyChildren, isSpouseInvolvedInSchool, doesSpouseHaveOtherIncome, ifYesHowMuchPerMonth, isDirectorBehindOnUtilityBills, totalNumberOfRooms, howIsNeighborhood, howAccessibleIsHouse, isDirectorHomeInSameCity, isDirectorTrainedEducator, doesDirectorHaveOtherBusiness, otherNotes.  
- **AssetTitle** – creditApplicationId, type, toBeUsedAsSecurity, description, legalOwner, userId, fullOwnerDetails, collateralOwnedByDirectorOfSchool, plotNumber, schoolSitsOnLand, hasComprehensiveInsurance, originalInsuranceCoverage, initialEstimatedValue, approvedByLegalTeamOrNTSAAgent, notesOnApprovalForUse, evaluatorsMarketValue, evaluatorsForcedValue, moneyOwedOnAsset, licensePlateNumber, engineCC, yearOfManufacture, logbookPhoto, titleDeedPhoto, fullTitleDeed, evaluatorsReport.  
- **ContractDetails** – creditApplicationId, loanLengthRequestedMonths, monthsSchoolRequestsForgiveness, disbursalDateRequested, tenPercentDownOnVehicleOrLandFinancing, createdBy.  
- **CreditApplicationComment** – creditApplicationId, commenterType, comments, commenterName.  
- **DirectPaymentSchedule** – borrowerId, dueDate, amountDue, amountPaid, createdAt, adjustedMonth, amountStillUnpaid, borrowerType, checkCashingStatus, creditLifeInsuranceFee fields, dateFullyPaid, daysLate, debtType, directLoanId, holidayForgiveness, interestChargedWithoutForgiveness, interestRepaymentDue, notesOnPayment, par14/30/60/90/120, paymentOverdue, principalRepaymentDue, principalRepaymentWithoutForgiveness, vehicleInsurance fields, sslId, dateToBankCheck, loanCategory, writeOffDate, interestSuspended, region, dateForMpesaBankTransfer, createdBy.  
- **PrincipalTranche** – directLoanId, contractSigningDate, amount, sslId, initialDisbursementDateInContract, dateTrancheHasGonePar30, createdAt, createdBy, hasFemaleDirector, loanType, reassigned, teamLeader, region.  
- **DirectLendingProcessing** – paymentType, paymentSource, borrowerType, borrowerId, directLoanId, paymentScheduleId, paymentDate, amountPaid, paymentReferenceOrTransactionCode, installment* fields, createdBy, sslId, region.  
- **FinancialSurvey** – creditApplicationId, surveyDate, directorId, and many survey columns (schoolGrades, isSchoolAPBETOrPrivate, isChurchSupported, churchName, churchAnnualSupport, facilityOwnership, annualLeaseRent, ownerAnnualWithdrawal, monthlyDebtPayments, providesMeals, termlyFoodExpense, etc.).  
- **ImpactSurvey** – creditApplicationId, surveyDate, directorId, createdBy, and many impact survey question columns (isSchoolAPBETOrPrivate, whatKindOfAreaIsTheSchoolIn, whatGradeLevelsDoesTheSchoolServe, howManyStudentsDoesTheSchoolHave, etc.).  
- **WriteOff** – date, loanId, paymentScheduleId, principalAmountWrittenOff, interestAmountWrittenOff, vehicleInsuranceAmountWrittenOff, totalAmount, createdAtSheet, createdBy, region, sslId, loanOrPaymentLevel, penaltyAmountWrittenOff.  
- **Restructuring** – loanId, date, restructuringDate, reason, previousLoanTerms, newLoanTerms, previousPrincipalAmount, newPrincipalAmount, previousInterestRate, newInterestRate, previousNumberOfMonths, newNumberOfMonths, previousMonthlyPayment, newMonthlyPayment, approvedBy, approvalDate, createdAtSheet, createdBy, region, sslId, notes.

**Pipeline**  
- **PipelineEntry** – id, clientType, entityName, clientTel, sector, product, amount, topUpAmount, isTopUp, crossSellOpportunities, sourceOfClient, sslStaffId, region, loanStage, loanStageEnteredAt, estimatedClosing, probabilityOfClosing, expectedDisbursement, status, comments, createdAt, updatedAt, createdById, updatedById.  
- **PipelineStageHistory** – id, pipelineEntryId, stageName, enteredAt, exitedAt, wasDelayed, delayFlag.

**Other**  
- **WhatsAppConversation** – id, phoneNumber, state, data, leadId, createdAt, updatedAt.

For the full, authoritative schema (including types and relations), see `prisma/schema.prisma`.

---

*Document generated from the jf-backend codebase. Update this file when integration or schemas change.*
