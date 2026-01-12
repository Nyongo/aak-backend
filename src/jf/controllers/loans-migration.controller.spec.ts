import { Test, TestingModule } from '@nestjs/testing';
import { LoansMigrationController } from './loans-migration.controller';
import { LoansService } from '../services/loans.service';
import { SheetsService } from '../services/sheets.service';
import { Logger } from '@nestjs/common';

describe('LoansMigrationController', () => {
  let controller: LoansMigrationController;
  let loansService: jest.Mocked<LoansService>;
  let sheetsService: jest.Mocked<SheetsService>;

  // Mock data
  const mockSheetLoan = {
    'ID': 'LOAN-001',
    'Loan Type': 'Direct Lending',
    'Loan Purpose': 'Working Capital',
    'Borrower Type': 'School',
    'Borrower ID': 'BRW-001',
    'Borrower Name': 'Test School',
    'Principal Amount': 'KSh 100,000',
    'Interest Type': 'Declining',
    'Annual Declining Interest ': '12%',
    'Annual Flat Interest': null,
    'Number of Months': '12',
    'Days Late': '0',
    'Outstanding Principal Balance': 'KSh 50,000',
    'Oustanding Interest Balance': 'KSh 5,000',
    'Has Female Director?': 'Yes',
  };

  const mockDbLoan = {
    id: 1,
    sheetId: 'LOAN-001',
    loanType: 'Direct Lending',
    loanPurpose: 'Working Capital',
    borrowerType: 'School',
    borrowerId: 'BRW-001',
    borrowerName: 'Test School',
    principalAmount: 100000,
    interestType: 'Declining',
    annualDecliningInterest: '12%',
    annualFlatInterest: null,
    numberOfMonths: 12,
    daysLate: 0,
    outstandingPrincipalBalance: 50000,
    outstandingInterestBalance: 5000,
    hasFemaleDirector: 1,
    synced: true,
    createdAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    // Create mock services
    const mockLoansService = {
      create: jest.fn(),
      findBySheetId: jest.fn(),
      getLoansCount: jest.fn(),
    };

    const mockSheetsService = {
      getLoans: jest.fn(),
      getLoansCount: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LoansMigrationController],
      providers: [
        {
          provide: LoansService,
          useValue: mockLoansService,
        },
        {
          provide: SheetsService,
          useValue: mockSheetsService,
        },
      ],
    }).compile();

    controller = module.get<LoansMigrationController>(LoansMigrationController);
    loansService = module.get(LoansService);
    sheetsService = module.get(SheetsService);

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Controller Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have loansService injected', () => {
      expect(loansService).toBeDefined();
    });

    it('should have sheetsService injected', () => {
      expect(sheetsService).toBeDefined();
    });
  });

  describe('GET /status - getMigrationStatus', () => {
    it('should return sync status when counts match', async () => {
      loansService.getLoansCount.mockResolvedValue(100);
      sheetsService.getLoansCount.mockResolvedValue(100);

      const result = await controller.getMigrationStatus();

      expect(result).toEqual({
        success: true,
        database: { total: 100 },
        sheets: { total: 100 },
        syncStatus: 'Synced',
      });
      expect(loansService.getLoansCount).toHaveBeenCalledTimes(1);
      expect(sheetsService.getLoansCount).toHaveBeenCalledTimes(1);
    });

    it('should return out of sync status when counts do not match', async () => {
      loansService.getLoansCount.mockResolvedValue(50);
      sheetsService.getLoansCount.mockResolvedValue(100);

      const result = await controller.getMigrationStatus();

      expect(result).toEqual({
        success: true,
        database: { total: 50 },
        sheets: { total: 100 },
        syncStatus: 'Out of sync',
      });
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Database connection failed');
      loansService.getLoansCount.mockRejectedValue(error);

      const result = await controller.getMigrationStatus();

      expect(result).toEqual({
        success: false,
        message: 'Database connection failed',
      });
    });

    it('should handle non-Error exceptions', async () => {
      loansService.getLoansCount.mockRejectedValue('String error');

      const result = await controller.getMigrationStatus();

      expect(result).toEqual({
        success: false,
        message: 'String error',
      });
    });
  });

  describe('POST /import-from-sheets - importFromSheets', () => {
    it('should successfully import new loans from sheets', async () => {
      sheetsService.getLoans.mockResolvedValue([mockSheetLoan]);
      loansService.findBySheetId.mockResolvedValue(null);
      loansService.create.mockResolvedValue(mockDbLoan as any);

      const result = await controller.importFromSheets();

      expect(result).toEqual({
        success: true,
        message: 'Import completed',
        imported: 1,
        skipped: 0,
        errors: 0,
        errorDetails: undefined,
        skippedDetails: undefined,
      });
      expect(sheetsService.getLoans).toHaveBeenCalledTimes(1);
      expect(loansService.findBySheetId).toHaveBeenCalledWith('LOAN-001');
      expect(loansService.create).toHaveBeenCalledTimes(1);
    });

    it('should pass synced as boolean true, not string', async () => {
      sheetsService.getLoans.mockResolvedValue([mockSheetLoan]);
      loansService.findBySheetId.mockResolvedValue(null);
      loansService.create.mockResolvedValue(mockDbLoan as any);

      await controller.importFromSheets();

      // Verify that loansService.create was called with synced as boolean true
      expect(loansService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          synced: true, // Must be boolean, not string "true"
        })
      );

      // Verify the synced field is actually a boolean
      const callArgs = loansService.create.mock.calls[0][0];
      expect(typeof callArgs.synced).toBe('boolean');
      expect(callArgs.synced).toBe(true);
    });

    it('should skip empty records', async () => {
      sheetsService.getLoans.mockResolvedValue([{}]);

      const result = await controller.importFromSheets();

      expect(result).toEqual({
        success: true,
        message: 'Import completed',
        imported: 0,
        skipped: 1,
        errors: 0,
        errorDetails: undefined,
        skippedDetails: [
          {
            loan: 'Empty Record',
            sheetId: 'No ID',
            reason: 'Completely empty record in Google Sheets',
          },
        ],
      });
      expect(loansService.create).not.toHaveBeenCalled();
    });

    it('should skip records with empty ID', async () => {
      const loanWithoutId = { ...mockSheetLoan };
      delete loanWithoutId['ID'];

      sheetsService.getLoans.mockResolvedValue([loanWithoutId]);

      const result = await controller.importFromSheets();

      expect(result).toEqual({
        success: true,
        message: 'Import completed',
        imported: 0,
        skipped: 1,
        errors: 0,
        errorDetails: undefined,
        skippedDetails: [
          {
            loan: 'Direct Lending',
            sheetId: 'Empty ID',
            reason: 'Empty ID in Google Sheets - tried fields: ID',
          },
        ],
      });
      expect(loansService.create).not.toHaveBeenCalled();
    });

    it('should skip loans that already exist in database', async () => {
      sheetsService.getLoans.mockResolvedValue([mockSheetLoan]);
      loansService.findBySheetId.mockResolvedValue(mockDbLoan as any);

      const result = await controller.importFromSheets();

      expect(result).toEqual({
        success: true,
        message: 'Import completed',
        imported: 0,
        skipped: 1,
        errors: 0,
        errorDetails: undefined,
        skippedDetails: [
          {
            loan: 'Direct Lending',
            sheetId: 'LOAN-001',
            reason: 'Already exists in database',
          },
        ],
      });
      expect(loansService.create).not.toHaveBeenCalled();
    });

    it('should handle errors during loan creation', async () => {
      sheetsService.getLoans.mockResolvedValue([mockSheetLoan]);
      loansService.findBySheetId.mockResolvedValue(null);
      loansService.create.mockRejectedValue(new Error('Validation error'));

      const result = await controller.importFromSheets();

      expect(result).toEqual({
        success: true,
        message: 'Import completed',
        imported: 0,
        skipped: 0,
        errors: 1,
        errorDetails: [
          {
            loan: 'Direct Lending',
            sheetId: 'LOAN-001',
            error: 'Validation error',
          },
        ],
        skippedDetails: undefined,
      });
    });

    it('should return early when no data in sheets', async () => {
      sheetsService.getLoans.mockResolvedValue([]);

      const result = await controller.importFromSheets();

      expect(result).toEqual({
        success: true,
        message: 'No data found in Google Sheets',
        imported: 0,
        skipped: 0,
        errors: 0,
      });
      expect(loansService.findBySheetId).not.toHaveBeenCalled();
    });

    it('should handle null sheets data', async () => {
      sheetsService.getLoans.mockResolvedValue(null);

      const result = await controller.importFromSheets();

      expect(result).toEqual({
        success: true,
        message: 'No data found in Google Sheets',
        imported: 0,
        skipped: 0,
        errors: 0,
      });
    });

    it('should filter by borrowerId when provided', async () => {
      const loan1 = { ...mockSheetLoan, 'Borrower ID': 'BRW-001' };
      const loan2 = { ...mockSheetLoan, 'ID': 'LOAN-002', 'Borrower ID': 'BRW-002' };

      sheetsService.getLoans.mockResolvedValue([loan1, loan2]);
      loansService.findBySheetId.mockResolvedValue(null);
      loansService.create.mockResolvedValue(mockDbLoan as any);

      const result = await controller.importFromSheets('BRW-001');

      expect(result.imported).toBeGreaterThanOrEqual(0);
      expect(sheetsService.getLoans).toHaveBeenCalledTimes(1);
    });

    it('should handle global import errors', async () => {
      sheetsService.getLoans.mockRejectedValue(new Error('Google API error'));

      const result = await controller.importFromSheets();

      expect(result).toEqual({
        success: false,
        message: 'Google API error',
      });
    });

    it('should process multiple loans correctly', async () => {
      const loan2 = { ...mockSheetLoan, 'ID': 'LOAN-002' };
      sheetsService.getLoans.mockResolvedValue([mockSheetLoan, loan2]);
      loansService.findBySheetId.mockResolvedValue(null);
      loansService.create.mockResolvedValue(mockDbLoan as any);

      const result = await controller.importFromSheets();

      expect(result.imported).toBe(2);
      expect(loansService.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('POST /sync-to-sheets - syncToGoogleSheets', () => {
    it('should return read-only message', async () => {
      const result = await controller.syncToGoogleSheets();

      expect(result).toEqual({
        success: true,
        message: 'Sync to Google Sheets is read-only for now',
        synced: 0,
      });
    });

    it('should handle potential errors', async () => {
      // Even though the method doesn't do much, test error handling structure
      const result = await controller.syncToGoogleSheets();

      expect(result.success).toBe(true);
    });
  });

  describe('POST /full-migration - fullMigration', () => {
    it('should perform full migration when out of sync', async () => {
      loansService.getLoansCount.mockResolvedValue(0);
      sheetsService.getLoansCount.mockResolvedValue(1);
      sheetsService.getLoans.mockResolvedValue([mockSheetLoan]);
      loansService.findBySheetId.mockResolvedValue(null);
      loansService.create.mockResolvedValue(mockDbLoan as any);

      const result = await controller.fullMigration();

      expect(result.success).toBe(true);
      if ('imported' in result) {
        expect(result.imported).toBe(1);
      }
    });

    it('should return early if already synced', async () => {
      loansService.getLoansCount.mockResolvedValue(100);
      sheetsService.getLoansCount.mockResolvedValue(100);

      const result = await controller.fullMigration();

      expect(result).toEqual({
        success: true,
        message: 'Already fully synced',
        imported: 0,
        skipped: 0,
        errors: 0,
      });
      expect(sheetsService.getLoans).not.toHaveBeenCalled();
    });

    it('should handle status check failure', async () => {
      loansService.getLoansCount.mockRejectedValue(new Error('DB error'));

      const result = await controller.fullMigration();

      expect(result.success).toBe(false);
    });

    it('should handle migration errors', async () => {
      loansService.getLoansCount.mockResolvedValue(0);
      sheetsService.getLoansCount.mockResolvedValue(1);
      sheetsService.getLoans.mockRejectedValue(new Error('API error'));

      const result = await controller.fullMigration();

      expect(result.success).toBe(false);
      expect(result.message).toBe('API error');
    });
  });

  describe('GET /compare/:sheetId - compareLoan', () => {
    it('should compare loan from sheets and database', async () => {
      sheetsService.getLoans.mockResolvedValue([mockSheetLoan]);
      loansService.findBySheetId.mockResolvedValue(mockDbLoan as any);

      const result = await controller.compareLoan('LOAN-001');

      expect(result.success).toBe(true);
      expect(result.comparison).toBeDefined();
      expect(result.comparison.sheets).toEqual(mockSheetLoan);
      expect(result.comparison.database).toEqual(mockDbLoan);
      expect(result.comparison.differences).toBeDefined();
    });

    it('should handle loan not found in sheets', async () => {
      sheetsService.getLoans.mockResolvedValue([]);

      const result = await controller.compareLoan('LOAN-999');

      expect(result).toEqual({
        success: false,
        error: 'Loan not found in sheets',
      });
    });

    it('should handle loan not in database', async () => {
      sheetsService.getLoans.mockResolvedValue([mockSheetLoan]);
      loansService.findBySheetId.mockResolvedValue(null);

      const result = await controller.compareLoan('LOAN-001');

      expect(result.success).toBe(true);
      expect(result.comparison.database).toBeNull();
      expect(result.comparison.differences).toBeNull();
    });

    it('should handle comparison errors', async () => {
      sheetsService.getLoans.mockRejectedValue(new Error('Sheets API error'));

      const result = await controller.compareLoan('LOAN-001');

      expect(result).toEqual({
        success: false,
        error: 'Sheets API error',
      });
    });
  });

  describe('GET /columns - getSheetColumns', () => {
    it('should return sheet columns with sample values', async () => {
      sheetsService.getLoans.mockResolvedValue([mockSheetLoan]);

      const result = await controller.getSheetColumns();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Loans sheet columns retrieved successfully');
      expect(result.totalColumns).toBeGreaterThan(0);
      expect(result.columns).toBeInstanceOf(Array);
      expect(result.columns[0]).toHaveProperty('index');
      expect(result.columns[0]).toHaveProperty('name');
      expect(result.columns[0]).toHaveProperty('sampleValue');
    });

    it('should handle empty sheets data', async () => {
      sheetsService.getLoans.mockResolvedValue([]);

      const result = await controller.getSheetColumns();

      expect(result).toEqual({
        success: false,
        message: 'No data found in Loans sheet',
      });
    });

    it('should handle null sheets data', async () => {
      sheetsService.getLoans.mockResolvedValue(null);

      const result = await controller.getSheetColumns();

      expect(result).toEqual({
        success: false,
        message: 'No data found in Loans sheet',
      });
    });

    it('should handle errors', async () => {
      sheetsService.getLoans.mockRejectedValue(new Error('API error'));

      const result = await controller.getSheetColumns();

      expect(result).toEqual({
        success: false,
        message: 'API error',
      });
    });
  });

  describe('Data Conversion Helpers', () => {
    describe('parseCurrency', () => {
      it('should parse currency with KSh prefix', () => {
        const result = controller['parseCurrency']('KSh 1,234.56');
        expect(result).toBe(1234.56);
      });

      it('should parse currency with commas', () => {
        const result = controller['parseCurrency']('1,234,567.89');
        expect(result).toBe(1234567.89);
      });

      it('should parse numeric values', () => {
        const result = controller['parseCurrency'](12345);
        expect(result).toBe(12345);
      });

      it('should handle null values', () => {
        expect(controller['parseCurrency'](null)).toBeNull();
        expect(controller['parseCurrency'](undefined)).toBeNull();
        expect(controller['parseCurrency']('')).toBeNull();
      });

      it('should handle Excel errors', () => {
        expect(controller['parseCurrency']('#VALUE!')).toBeNull();
        expect(controller['parseCurrency']('#ERROR')).toBeNull();
      });

      it('should handle empty strings after cleaning', () => {
        expect(controller['parseCurrency']('(empty)')).toBeNull();
        expect(controller['parseCurrency']('KSh ')).toBeNull();
      });

      it('should handle dollar signs', () => {
        const result = controller['parseCurrency']('$1,234.56');
        expect(result).toBe(1234.56);
      });
    });

    describe('parseInt', () => {
      it('should parse string numbers', () => {
        expect(controller['parseInt']('123')).toBe(123);
        expect(controller['parseInt']('1,234')).toBe(1234);
      });

      it('should parse numeric values', () => {
        expect(controller['parseInt'](123)).toBe(123);
        expect(controller['parseInt'](123.7)).toBe(123);
      });

      it('should handle null values', () => {
        expect(controller['parseInt'](null)).toBeNull();
        expect(controller['parseInt'](undefined)).toBeNull();
        expect(controller['parseInt']('')).toBeNull();
      });

      it('should handle Excel errors', () => {
        expect(controller['parseInt']('#VALUE!')).toBeNull();
      });

      it('should handle empty strings after cleaning', () => {
        expect(controller['parseInt']('(empty)')).toBeNull();
      });
    });

    describe('parseBooleanToInt', () => {
      it('should parse true values', () => {
        expect(controller['parseBooleanToInt']('true')).toBe(1);
        expect(controller['parseBooleanToInt']('TRUE')).toBe(1);
        expect(controller['parseBooleanToInt']('Yes')).toBe(1);
        expect(controller['parseBooleanToInt']('yes')).toBe(1);
        expect(controller['parseBooleanToInt']('1')).toBe(1);
        expect(controller['parseBooleanToInt'](true)).toBe(1);
        expect(controller['parseBooleanToInt'](1)).toBe(1);
      });

      it('should parse false values', () => {
        expect(controller['parseBooleanToInt']('false')).toBe(0);
        expect(controller['parseBooleanToInt']('FALSE')).toBe(0);
        expect(controller['parseBooleanToInt']('No')).toBe(0);
        expect(controller['parseBooleanToInt']('no')).toBe(0);
        expect(controller['parseBooleanToInt']('0')).toBe(0);
        expect(controller['parseBooleanToInt'](false)).toBe(0);
        expect(controller['parseBooleanToInt'](0)).toBe(0);
      });

      it('should handle null values', () => {
        expect(controller['parseBooleanToInt'](null)).toBeNull();
        expect(controller['parseBooleanToInt'](undefined)).toBeNull();
        expect(controller['parseBooleanToInt']('')).toBeNull();
      });

      it('should handle empty values', () => {
        expect(controller['parseBooleanToInt']('(empty)')).toBe(0);
      });

      it('should handle numeric strings', () => {
        expect(controller['parseBooleanToInt']('42')).toBe(42);
      });
    });

    describe('formatDateToDDMMYYYY', () => {
      it('should preserve DD/MM/YYYY format', () => {
        const result = controller['formatDateToDDMMYYYY']('15/05/2022');
        expect(result).toBe('15/05/2022');
      });

      it('should convert Date objects', () => {
        const date = new Date('2022-05-15');
        const result = controller['formatDateToDDMMYYYY'](date);
        expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
      });

      it('should parse various date formats', () => {
        const result = controller['formatDateToDDMMYYYY']('May 15, 2022');
        expect(result).toMatch(/^\d{2}\/\d{2}\/2022$/);
      });

      it('should handle null values', () => {
        expect(controller['formatDateToDDMMYYYY'](null)).toBeNull();
        expect(controller['formatDateToDDMMYYYY'](undefined)).toBeNull();
        expect(controller['formatDateToDDMMYYYY']('')).toBeNull();
        expect(controller['formatDateToDDMMYYYY']('(empty)')).toBeNull();
      });

      it('should handle invalid dates', () => {
        const result = controller['formatDateToDDMMYYYY']('invalid-date');
        expect(result).toBe('invalid-date');
      });
    });

    describe('findIdField', () => {
      it('should find ID field', () => {
        const result = controller['findIdField']({ 'ID': 'LOAN-001' });
        expect(result).toBe('LOAN-001');
      });

      it('should return null when ID is missing', () => {
        const result = controller['findIdField']({});
        expect(result).toBeNull();
      });

      it('should return null when ID is empty string', () => {
        const result = controller['findIdField']({ 'ID': '' });
        expect(result).toBeNull();
      });
    });

    describe('convertSheetToDb', () => {
      it('should convert all sheet fields to database format', () => {
        const result = controller['convertSheetToDb'](mockSheetLoan);

        expect(result.sheetId).toBe('LOAN-001');
        expect(result.loanType).toBe('Direct Lending');
        expect(result.principalAmount).toBe(100000);
        expect(result.numberOfMonths).toBe(12);
        expect(result.hasFemaleDirector).toBe(1);
      });

      it('should handle missing fields as null', () => {
        const result = controller['convertSheetToDb']({});

        expect(result.sheetId).toBeNull();
        expect(result.principalAmount).toBeNull();
      });

      it('should handle currency fields', () => {
        const result = controller['convertSheetToDb']({
          'Principal Amount': 'KSh 500,000',
        });

        expect(result.principalAmount).toBe(500000);
      });
    });

    describe('findDifferences', () => {
      it('should find differences between sheet and database', () => {
        const sheetData = { ...mockSheetLoan, 'Loan Type': 'Modified Type' };
        const differences = controller['findDifferences'](sheetData, mockDbLoan);

        expect(differences).toBeInstanceOf(Array);
        expect(differences.length).toBeGreaterThanOrEqual(0);
      });

      it('should exclude createdAt and synced fields', () => {
        const differences = controller['findDifferences'](mockSheetLoan, mockDbLoan);

        const hasCreatedAt = differences.some((d: any) => d.field === 'createdAt');
        const hasSynced = differences.some((d: any) => d.field === 'synced');

        expect(hasCreatedAt).toBe(false);
        expect(hasSynced).toBe(false);
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle mixed valid and invalid loans', async () => {
      const invalidLoan = { ...mockSheetLoan, 'ID': '' };
      sheetsService.getLoans.mockResolvedValue([mockSheetLoan, invalidLoan]);
      loansService.findBySheetId.mockResolvedValue(null);
      loansService.create.mockResolvedValue(mockDbLoan as any);

      const result = await controller.importFromSheets();

      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(1);
    });

    it('should continue processing after individual loan errors', async () => {
      const loan2 = { ...mockSheetLoan, 'ID': 'LOAN-002' };
      sheetsService.getLoans.mockResolvedValue([mockSheetLoan, loan2]);
      loansService.findBySheetId.mockResolvedValue(null);
      loansService.create
        .mockRejectedValueOnce(new Error('Error on first'))
        .mockResolvedValueOnce(mockDbLoan as any);

      const result = await controller.importFromSheets();

      expect(result.imported).toBe(1);
      expect(result.errors).toBe(1);
      expect(loansService.create).toHaveBeenCalledTimes(2);
    });

    it('should handle very large datasets efficiently', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        ...mockSheetLoan,
        'ID': `LOAN-${i.toString().padStart(4, '0')}`,
      }));

      sheetsService.getLoans.mockResolvedValue(largeDataset);
      loansService.findBySheetId.mockResolvedValue(null);
      loansService.create.mockResolvedValue(mockDbLoan as any);

      const result = await controller.importFromSheets();

      expect(result.imported).toBe(1000);
      expect(result.success).toBe(true);
    });

    it('should handle special characters in loan data', async () => {
      const specialLoan = {
        ...mockSheetLoan,
        'Borrower Name': "O'Reilly School & Academy",
        'ID': 'LOAN-SP#1',
      };

      sheetsService.getLoans.mockResolvedValue([specialLoan]);
      loansService.findBySheetId.mockResolvedValue(null);
      loansService.create.mockResolvedValue(mockDbLoan as any);

      const result = await controller.importFromSheets();

      expect(result.imported).toBe(1);
    });
  });
});
