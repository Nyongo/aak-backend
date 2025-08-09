import { IsString, IsOptional, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateInvestmentCommitteeDto {
  @IsString()
  @IsOptional()
  'Credit Application ID'?: string;

  @IsString()
  @IsOptional()
  'SSL ID'?: string;

  @IsString()
  @IsOptional()
  'School ID'?: string;

  @IsString()
  @IsOptional()
  'Type of School'?: string;

  @IsString()
  @IsOptional()
  'Age of school'?: string;

  @IsString()
  @IsOptional()
  'Incorporation Structure'?: string;

  @IsString()
  @IsOptional()
  'School is profitable?'?: string;

  @IsString()
  @IsOptional()
  'Solvency (Assets/Liabilities)'?: string;

  @IsString()
  @IsOptional()
  'Number of Students the Previous Year'?: string;

  @IsString()
  @IsOptional()
  'Number of Students from Enrollment Verification'?: string;

  @IsString()
  @IsOptional()
  'Growth in Population'?: string;

  @IsString()
  @IsOptional()
  'Audited financials provided?'?: string;

  @IsString()
  @IsOptional()
  'School has a bank account and checks from that bank account?'?: string;

  @IsString()
  @IsOptional()
  'Asset value has increased from two years ago?'?: string;

  @IsString()
  @IsOptional()
  'Total annual revenue from fees from student breakdown, Unadjusted'?: string;

  @IsString()
  @IsOptional()
  'Annual revenue from Banka and M Pesa Statements'?: string;

  @IsString()
  @IsOptional()
  'Lesser of annual revenue from Banka and M Pesa Statements and 75% collections of school fees'?: string;

  @IsString()
  @IsOptional()
  'Collections Rate'?: string;

  @IsString()
  @IsOptional()
  'Average School Fees Charged'?: string;

  @IsString()
  @IsOptional()
  'School sits on owned, leased, or rented land'?: string;

  @IsString()
  @IsOptional()
  'Total cash held in bank and M Pesa accounts at time of credit scoring (KES)'?: string;

  @IsString()
  @IsOptional()
  'Total annual spending on salaries excluding cooks and drivers (KES)'?: string;

  @IsString()
  @IsOptional()
  'Total annual spending on rent (KES)'?: string;

  @IsString()
  @IsOptional()
  'Total annual owners draw (KES)'?: string;

  @IsString()
  @IsOptional()
  'Total annual debt payment of school and directors (KES)'?: string;

  @IsString()
  @IsOptional()
  'Total of salaries, rent, debt, and owners draw (KES)'?: string;

  @IsString()
  @IsOptional()
  'Annual Expense Estimate Excluding Payroll, Rent, Debt, Owners Draw, Food, and Transport'?: string;

  @IsString()
  @IsOptional()
  'Total Annual Expenses Excluding Food and Transport (KES)'?: string;

  @IsString()
  @IsOptional()
  'Annual Profit Excluding Food and Transport Expenses (Bank and M Pesa Collections Minus Expenses)'?: string;

  @IsString()
  @IsOptional()
  'Annual Transport Expense Estimate Including Driver Salaries (KES)'?: string;

  @IsString()
  @IsOptional()
  'Annual Food Expense Estimate Including Cook Salaries (KES)'?: string;

  @IsString()
  @IsOptional()
  'Annual Profit Including Food and Transport Expenses'?: string;

  @IsString()
  @IsOptional()
  'Monthly Profit Including all Expenses'?: string;

  @IsString()
  @IsOptional()
  'Lesser of monthly profit and 35% profit margin'?: string;

  @IsString()
  @IsOptional()
  'Debt Ratio'?: string;

  @IsString()
  @IsOptional()
  'Loan Length (Months)'?: string;

  @IsString()
  @IsOptional()
  'Annual Reducing Interest Rate'?: string;

  @IsString()
  @IsOptional()
  'Maximum Monthly Payment'?: string;

  @IsString()
  @IsOptional()
  'Maximum Loan'?: string;

  @IsString()
  @IsOptional()
  'Annual non school revenue generated  (KES)'?: string;

  @IsString()
  @IsOptional()
  'Annual sponsorship revenue (KES)'?: string;

  @IsString()
  @IsOptional()
  'Total bad debt on CRB held by school and directors (KES)'?: string;

  @IsString()
  @IsOptional()
  'Total debt on CRB fully paid off by school and directors'?: string;

  @IsString()
  @IsOptional()
  'Total estimated value of assets held by school and directors (KES)'?: string;

  @IsString()
  @IsOptional()
  'Annual donation revenue'?: string;

  @IsString()
  @IsOptional()
  'Maximum Previous Days Late'?: string;

  @IsString()
  @IsOptional()
  'Number of Installments Paid Late'?: string;

  @IsString()
  @IsOptional()
  'School Credit Risk'?: string;

  @IsString()
  @IsOptional()
  'Previous Restructure?'?: string;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  'Predicted Days Late'?: number;

  @IsString()
  @IsOptional()
  'Current Debt to Income'?: string;

  @IsString()
  @IsOptional()
  'Profit Margin (Total Profit/Total Revenue, not adjusted down to 35%)'?: string;

  @IsString()
  @IsOptional()
  'Total Debt'?: string;

  @IsString()
  @IsOptional()
  'Collateral Coverage of Loan Amount Requested'?: string;

  @IsString()
  @IsOptional()
  'Previous Loans with Jackfruit'?: string;

  @IsString()
  @IsOptional()
  'Average bank balance (KES)'?: string;

  @IsString()
  @IsOptional()
  'Average bank balance / total  unadjusted revenue'?: string;

  // Handle the redundant creditApplication field
  @IsString()
  @IsOptional()
  creditApplication?: string;
}
