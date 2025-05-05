import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseInterceptors,
  UploadedFiles,
  Logger,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { SheetsService } from '../services/sheets.service';
import { GoogleDriveService } from '../services/google-drive.service';

interface ApiError {
  message: string;
  code?: number;
  status?: string;
}

@Controller('jf/impact-survey')
export class ImpactSurveyController {
  private readonly logger = new Logger(ImpactSurveyController.name);
  private readonly SHEET_NAME = 'Impact Survey';

  constructor(
    private readonly sheetsService: SheetsService,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'schoolPhotos', maxCount: 10 }]),
  )
  async createSurveyResponse(
    @Body()
    createDto: {
      'Credit Application ID': string;
      'Survey Date': string;
      'Director Responding': string;
      'Is the school APBET or Private?': 'APBET' | 'Private';
      'What kind of area is the school in?': 'Urban' | 'Rural' | 'Peri-Urban';
      'What grade levels does the school serve?': string[];

      // School Statistics
      'How many students does the school have?': number;
      'How many classrooms does the school have?': number;
      'How many administrative rooms does the school have?': number;
      'How many teachers does the school have?': number;

      // Facilities (Y/N questions)
      'Does the school have a dedicated assembly hall?': 'Y' | 'N';
      'Does the school have running water?': 'Y' | 'N';
      'Is there purified drinking water available to students?': 'Y' | 'N';
      'Does the school have electricity?': 'Y' | 'N';
      'Does the school have fire extinguishers?': 'Y' | 'N';
      'Does the school provide meals?': 'Y' | 'N';
      'Does the school own vehicles to transport students to school?':
        | 'Y'
        | 'N';
      'Does the school have its own field?': 'Y' | 'N';
      'Does the school have a dedicated science lab?': 'Y' | 'N';
      'Does the school have a library?': 'Y' | 'N';
      'Does the school have a computer lab?': 'Y' | 'N';

      // Building Information
      'What is the school made of?': string;
      "What are the school's floors made of?": string;
      'Is the school building single or multistory?':
        | 'Single story'
        | 'Multistory'
        | 'Both';
      'Is the school building painted?': string;
      'Does the school have after school programs?': 'Y' | 'N';

      // Washroom Facilities
      "Describe the school's washroom facilities": string;
      "How many girls' toilets does the school have?": number;
      "How many boys' toilets does the school have?": number;
      'How many shared toilets does the school have?': number;

      // Fee Information
      'By percentage of children, how many children get sent home at least once per term because of school fees?': number;

      // School Environment
      'When you walked into the school, describe what you saw': string;

      // Technology
      'Do any of the teachers and administration have smartphones?': 'Y' | 'N';
      'Do the teachers and administration have computers?': 'Y' | 'N';

      // Student Demographics
      'How many female children attend the school?': number;
      'How many male children attend the school?': number;

      // Additional Facilities
      'Does the school have textbooks for students?': 'Y' | 'N';
      'Is the school connected to a sewer line?': 'Y' | 'N';

      // Future Plans
      'How many additional facilities does the director expect any project financed or asset purchased using the loan provided by Jackfruit will add to the school, if any?': string;
      'Any other notes on the school': string;

      // School Associations
      'Is the school a part of a school association?': 'Y' | 'N';

      // Record Keeping
      'Does the school take daily attendance records?': 'Y' | 'N';

      // Staff Information
      'How many male teachers does the schools have?': number;
      'How many female teachers does the schools have?': number;
      'How many teachers did the school have last year?': number;
      'How many teachers did the school have two years ago?': number;

      // Student Transition
      'What percentage of children transitioned last school year from primary school to secondary school?': number;
      'What percentage of teachers from last year came back to teach again this year?': number;

      // Student Distribution
      'How many girls attend playgroup at the school?': number;
      'How many boys attend playgroup at the school?': number;
      'How many girls attend PP1 or PP2 at the school?': number;
      'How many boys attend PP1 or PP2 at the school?': number;
      'How many girls attend primary school at the school?': number;
      'How many boys attend primary school at the school?': number;
      'How many girls attend secondary school at the school?': number;
      'How many boys attend secondary school at the school?': number;
      'How many special needs boys attend the school?': number;
      'How many special needs girls attend the school?': number;

      // Historical Data
      'How many classrooms did the school have last year?': number;
      'How many classrooms did the school have two years ago?': number;

      // School Type
      'If the school is a primary school, does it have a junior secondary school?':
        | 'Y'
        | 'N';
      'Does the school serve only special needs students?': 'Y' | 'N';

      // Staff Distribution
      'How many male employees who are not teachers does the school have?': number;
      'How many female employees who are not teachers does the school have?': number;
      'How many Playschool, PP1, and PP2 teachers does the school have?': number;
      'How many primary teachers does the school have?': number;
      'How many secondary teachers does the school have?': number;

      // Academic Assessment
      'Approximately how many times a year does the school test students in academic subjects?': number;
      'Does the school maintain records of individual pupil test scores?':
        | 'Y'
        | 'N';
      'Does the school maintain records of student absences?': 'Y' | 'N';

      // Teacher Evaluation
      'Does the school conduct monitoring of teachers?': 'Y' | 'N';
      'Does the school evaluate the performance of teachers?': 'Y' | 'N';
      'How many teachers have been removed for unsatisfactory performance in the past 5 years?': number;
      'Do teachers receive monetary rewards for exceptional performance?':
        | 'Y'
        | 'N';

      // Associations and Policies
      'Is the school a member of the Kenya Private School Association?':
        | 'Y'
        | 'N';
      'Do you have a child safeguarding policy?': 'Y' | 'N';
      'What does your school do to observe child safeguarding?': string;
    },
    @UploadedFiles()
    files: {
      schoolPhotos?: Express.Multer.File[];
    },
  ) {
    try {
      // Generate unique ID for the survey response
      const id = `IS-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

      // Format current date as DD/MM/YYYY HH:mm:ss
      const now = new Date();
      const createdAt = now.toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });

      // Upload photos if provided
      const photoUrls = [];
      if (files.schoolPhotos) {
        for (const photo of files.schoolPhotos) {
          const url = await this.googleDriveService.uploadFile(
            photo.buffer,
            photo.originalname,
            photo.mimetype,
          );
          photoUrls.push(url);
        }
      }

      // Get the current sheet headers to ensure we save all fields
      const sheetData = await this.sheetsService.getSheetData(this.SHEET_NAME);
      const headers = sheetData[0];

      // Create a map of all fields to save
      const rowData = {
        ID: id,
        'Created At': createdAt,
        'School Photos': photoUrls.join(', '),
      };

      // Add all fields from the DTO to the rowData
      for (const [key, value] of Object.entries(createDto)) {
        console.log(key);
        if (key === 'What grade levels does the school serve?') {
          rowData[key] = Array.isArray(value) ? value.join(', ') : value || '';
        } else {
          rowData[key] = value;
        }
      }

      // Ensure all headers from the sheet are included in the rowData
      for (const header of headers) {
        if (!(header in rowData)) {
          rowData[header] = '';
        }
      }

      await this.sheetsService.appendRow(this.SHEET_NAME, rowData);

      return {
        success: true,
        message: 'Impact survey response created successfully',
        data: rowData,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error creating impact survey response: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Get('by-application/:creditApplicationId')
  async getSurveysByApplication(
    @Param('creditApplicationId') creditApplicationId: string,
  ) {
    try {
      const surveys = await this.sheetsService.getSheetData(this.SHEET_NAME);
      if (!surveys || surveys.length === 0) {
        return { success: true, count: 0, data: [] };
      }

      const headers = surveys[0];
      const applicationIdIndex = headers.indexOf('Credit Application ID');

      const filteredData = surveys
        .slice(1)
        .filter((row) => row[applicationIdIndex] === creditApplicationId)
        .map((row) => {
          const survey = {};
          headers.forEach((header, index) => {
            survey[header] = row[index];
          });
          return survey;
        });

      return {
        success: true,
        count: filteredData.length,
        data: filteredData,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching surveys for application ${creditApplicationId}: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Get(':id')
  async getSurveyById(@Param('id') id: string) {
    try {
      const surveys = await this.sheetsService.getSheetData(this.SHEET_NAME);
      if (!surveys || surveys.length === 0) {
        return { success: false, message: 'No surveys found' };
      }

      const headers = surveys[0];
      const idIndex = headers.indexOf('ID');
      const surveyRow = surveys.find((row) => row[idIndex] === id);

      if (!surveyRow) {
        return { success: false, message: 'Survey not found' };
      }

      const survey = {};
      headers.forEach((header, index) => {
        survey[header] = surveyRow[index];
      });

      return { success: true, data: survey };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error fetching survey ${id}: ${apiError.message}`);
      throw error;
    }
  }

  @Get()
  async getAllSurveys() {
    try {
      const surveys = await this.sheetsService.getSheetData(this.SHEET_NAME);

      if (!surveys || surveys.length === 0) {
        return { success: true, count: 0, data: [] };
      }

      const headers = surveys[0];
      const data = surveys.slice(1).map((row) => {
        const survey = {};
        headers.forEach((header, index) => {
          survey[header] = row[index];
        });
        return survey;
      });

      return {
        success: true,
        count: data.length,
        data,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error fetching all surveys: ${apiError.message}`);
      throw error;
    }
  }
}
