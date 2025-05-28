import { Controller, Get, Logger, Param } from "@nestjs/common";
import { SheetsService } from '../services/sheets.service';

interface ApiError {
  message: string;
  code?: number;
  status?: string;
}

@Controller('jf/loans')
export class LoansController{
    private readonly logger = new Logger(LoansController.name);
    private readonly SHEET_NAME = 'Loans';

    constructor(
        private readonly sheetsService: SheetsService,
    ){}

    @Get(':borrowerId')
    async getAllLoansForABorrower(@Param('borrowerId') borrowerId: string){
        try {
            const allLoans = await this.sheetsService.getSheetData(this.SHEET_NAME);
            if (!allLoans || !allLoans.length) {
                return {
                    success: true,
                    count: 0,
                    data: [],
                };
            }
            const headers = allLoans[0];
						const borrowerIdIndex = headers.findIndex(
        			(header) => header === 'Borrower ID',
      			);

						if (borrowerIdIndex === -1) {
        			throw new Error('Borrower ID column not found in sheet');
      			}

						// Filter loans for this borrower
      			const loans = allLoans
        			.slice(1)
        			.filter((row) => row[borrowerIdIndex] === borrowerId)
        			.map((row) => {
          			const loan = {};
          			headers.forEach((header, index) => {
            			if (row[index]) {
              			loan[header] = row[index];
            			}
          			});
          			return loan;
        			});
						return {
        			success: true,
        			count: loans.length,
        			data: loans,
      			};
            
        } catch (error: unknown) {
            const apiError = error as ApiError;
            this.logger.error('Error fetching loans:', error);
            return {
              success: false,
              error: apiError.message || 'An unknown error occurred while fetching ',
            };
        }
    }
}