import { Test, TestingModule } from '@nestjs/testing';
import { LoansService } from './loans.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLoanDto } from '../dto/create-loan.dto';

describe('LoansService', () => {
  let service: LoansService;
  let prismaService: any;

  const mockLoanCreate = jest.fn();
  const mockLoanFindUnique = jest.fn();
  const mockLoanCount = jest.fn();

  beforeEach(async () => {
    mockLoanCreate.mockReset();
    mockLoanFindUnique.mockReset();
    mockLoanCount.mockReset();

    const mockPrismaService = {
      loan: {
        create: mockLoanCreate,
        findMany: jest.fn(),
        findUnique: mockLoanFindUnique,
        update: jest.fn(),
        delete: jest.fn(),
        count: mockLoanCount,
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoansService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<LoansService>(LoansService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should handle synced field as boolean true', async () => {
      const createLoanDto: CreateLoanDto = {
        sheetId: 'TEST-001',
        loanType: 'Working Capital',
        principalAmount: 100000,
        synced: true, // Boolean
      };

      const mockCreatedLoan = {
        id: 1,
        ...createLoanDto,
        createdAt: new Date(),
      };

      mockLoanCreate.mockResolvedValue(mockCreatedLoan as any);

      await service.create(createLoanDto);

      // Verify that prisma.loan.create was called
      expect(mockLoanCreate).toHaveBeenCalledTimes(1);

      // Get the data object passed to prisma.loan.create
      const callArgs = mockLoanCreate.mock.calls[0][0];
      const data = callArgs.data;

      // Verify synced is a boolean, not a string
      expect(typeof data.synced).toBe('boolean');
      expect(data.synced).toBe(true);
    });

    it('should handle synced field as boolean false', async () => {
      const createLoanDto: CreateLoanDto = {
        sheetId: 'TEST-002',
        loanType: 'Term Loan',
        principalAmount: 50000,
        synced: false, // Boolean
      };

      const mockCreatedLoan = {
        id: 2,
        ...createLoanDto,
        createdAt: new Date(),
      };

      mockLoanCreate.mockResolvedValue(mockCreatedLoan as any);

      await service.create(createLoanDto);

      const callArgs = mockLoanCreate.mock.calls[0][0];
      const data = callArgs.data;

      expect(typeof data.synced).toBe('boolean');
      expect(data.synced).toBe(false);
    });

    it('should convert string "true" to boolean true for synced field', async () => {
      const createLoanDto: any = {
        sheetId: 'TEST-003',
        loanType: 'Bridge Loan',
        principalAmount: 75000,
        synced: 'true', // String (should be converted to boolean)
      };

      const mockCreatedLoan = {
        id: 3,
        sheetId: 'TEST-003',
        createdAt: new Date(),
      };

      mockLoanCreate.mockResolvedValue(mockCreatedLoan as any);

      await service.create(createLoanDto);

      const callArgs = mockLoanCreate.mock.calls[0][0];
      const data = callArgs.data;

      // Should convert string "true" to boolean true
      expect(typeof data.synced).toBe('boolean');
      expect(data.synced).toBe(true);
    });

    it('should convert string "false" to boolean false for synced field', async () => {
      const createLoanDto: any = {
        sheetId: 'TEST-004',
        loanType: 'Equipment Loan',
        principalAmount: 25000,
        synced: 'false', // String (should be converted to boolean)
      };

      const mockCreatedLoan = {
        id: 4,
        sheetId: 'TEST-004',
        createdAt: new Date(),
      };

      mockLoanCreate.mockResolvedValue(mockCreatedLoan as any);

      await service.create(createLoanDto);

      const callArgs = mockLoanCreate.mock.calls[0][0];
      const data = callArgs.data;

      expect(typeof data.synced).toBe('boolean');
      expect(data.synced).toBe(false);
    });

    it('should handle synced as null', async () => {
      const createLoanDto: CreateLoanDto = {
        sheetId: 'TEST-005',
        loanType: 'Invoice Financing',
        principalAmount: 150000,
        synced: undefined, // Will be handled as null
      };

      const mockCreatedLoan = {
        id: 5,
        sheetId: 'TEST-005',
        createdAt: new Date(),
      };

      mockLoanCreate.mockResolvedValue(mockCreatedLoan as any);

      await service.create(createLoanDto);

      const callArgs = mockLoanCreate.mock.calls[0][0];
      const data = callArgs.data;

      // synced should not be in the data object if undefined
      expect(data.synced).toBeUndefined();
    });

    it('should handle numeric fields correctly', async () => {
      const createLoanDto: CreateLoanDto = {
        sheetId: 'TEST-006',
        principalAmount: 200000, // Float field
        outstandingPrincipalBalance: 150000, // Float field
        outstandingInterestBalance: 25000, // Float field
        numberOfMonths: 12, // Int field
        daysLate: 5, // Int field
        hasFemaleDirector: 1, // Int field (boolean as int)
        synced: true, // Boolean field
      };

      const mockCreatedLoan = {
        id: 6,
        ...createLoanDto,
        createdAt: new Date(),
      };

      mockLoanCreate.mockResolvedValue(mockCreatedLoan as any);

      await service.create(createLoanDto);

      const callArgs = mockLoanCreate.mock.calls[0][0];
      const data = callArgs.data;

      // Verify float fields
      expect(typeof data.principalAmount).toBe('number');
      expect(data.principalAmount).toBe(200000);
      expect(typeof data.outstandingPrincipalBalance).toBe('number');
      expect(data.outstandingPrincipalBalance).toBe(150000);
      expect(typeof data.outstandingInterestBalance).toBe('number');
      expect(data.outstandingInterestBalance).toBe(25000);

      // Verify int fields
      expect(typeof data.numberOfMonths).toBe('number');
      expect(Number.isInteger(data.numberOfMonths)).toBe(true);
      expect(data.numberOfMonths).toBe(12);
      expect(typeof data.daysLate).toBe('number');
      expect(Number.isInteger(data.daysLate)).toBe(true);
      expect(data.daysLate).toBe(5);
      expect(typeof data.hasFemaleDirector).toBe('number');
      expect(Number.isInteger(data.hasFemaleDirector)).toBe(true);
      expect(data.hasFemaleDirector).toBe(1);

      // Verify boolean field
      expect(typeof data.synced).toBe('boolean');
      expect(data.synced).toBe(true);
    });

    it('should convert currency strings to numbers', async () => {
      const createLoanDto: any = {
        sheetId: 'TEST-007',
        principalAmount: 'KSh 100,000', // Currency string
        outstandingPrincipalBalance: '50,000.50', // Currency string with decimals
        outstandingInterestBalance: '$5,000', // Dollar currency
      };

      const mockCreatedLoan = {
        id: 7,
        sheetId: 'TEST-007',
        createdAt: new Date(),
      };

      mockLoanCreate.mockResolvedValue(mockCreatedLoan as any);

      await service.create(createLoanDto);

      const callArgs = mockLoanCreate.mock.calls[0][0];
      const data = callArgs.data;

      // Should parse currency strings to numbers
      expect(typeof data.principalAmount).toBe('number');
      expect(data.principalAmount).toBe(100000);
      expect(typeof data.outstandingPrincipalBalance).toBe('number');
      expect(data.outstandingPrincipalBalance).toBe(50000.5);
      expect(typeof data.outstandingInterestBalance).toBe('number');
      expect(data.outstandingInterestBalance).toBe(5000);
    });

    it('should remove undefined values before Prisma call', async () => {
      const createLoanDto: CreateLoanDto = {
        sheetId: 'TEST-008',
        loanType: 'Working Capital',
        principalAmount: 100000,
        borrowerId: undefined, // Should be removed
        borrowerName: undefined, // Should be removed
        synced: true,
      };

      const mockCreatedLoan = {
        id: 8,
        sheetId: 'TEST-008',
        createdAt: new Date(),
      };

      mockLoanCreate.mockResolvedValue(mockCreatedLoan as any);

      await service.create(createLoanDto);

      const callArgs = mockLoanCreate.mock.calls[0][0];
      const data = callArgs.data;

      // Undefined fields should not be present
      expect(data.borrowerId).toBeUndefined();
      expect(data.borrowerName).toBeUndefined();

      // Defined fields should be present
      expect(data.sheetId).toBe('TEST-008');
      expect(data.loanType).toBe('Working Capital');
      expect(data.principalAmount).toBe(100000);
      expect(data.synced).toBe(true);
    });
  });

  describe('findBySheetId', () => {
    it('should find loan by sheetId', async () => {
      const mockLoan = {
        id: 1,
        sheetId: 'LOAN-001',
        loanType: 'Working Capital',
        createdAt: new Date(),
      };

      mockLoanFindUnique.mockResolvedValue(mockLoan as any);

      const result = await service.findBySheetId('LOAN-001');

      expect(result).toEqual(mockLoan);
      expect(mockLoanFindUnique).toHaveBeenCalledWith({
        where: { sheetId: 'LOAN-001' },
      });
    });

    it('should return null if loan not found', async () => {
      mockLoanFindUnique.mockResolvedValue(null);

      const result = await service.findBySheetId('NONEXISTENT');

      expect(result).toBeNull();
    });
  });

  describe('getLoansCount', () => {
    it('should return loan count', async () => {
      mockLoanCount.mockResolvedValue(42);

      const result = await service.getLoansCount();

      expect(result).toBe(42);
      expect(mockLoanCount).toHaveBeenCalledTimes(1);
    });

    it('should return 0 on error', async () => {
      mockLoanCount.mockRejectedValue(new Error('Database error'));

      const result = await service.getLoansCount();

      expect(result).toBe(0);
    });
  });
});
