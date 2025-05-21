import {
  Controller,
  Post,
  Get,
  Put,
  Param,
  Body,
  Logger,
} from '@nestjs/common';
import { SheetsService } from '../services/sheets.service';

interface ApiError {
  message: string;
  code?: number;
  status?: string;
}

@Controller('jf/impact-survey')
export class ImpactSurveyController {
  private readonly logger = new Logger(ImpactSurveyController.name);
  private readonly SHEET_NAME = 'Impact Survey';

  constructor(private readonly sheetsService: SheetsService) {}

  @Post()
  async createSurveyResponse(
    @Body()
    createDto: {
      'Credit Application ID'?: string;
      'Director ID'?: string;
      'Survey Date'?: string;
      'Is the school APBET or Private?'?: string;
      'What kind of area is the school in?'?: string;
      'What grade levels does the school serve?'?: string;
      'How many students does the school have?'?: string;
      'How many classrooms does the school have?'?: string;
      'How many administrative rooms does the school have?'?: string;
      'How many teachers does the school have?'?: string;
      'Does the school have a dedicated assembly hall?'?: string;
      'How many people can the assembly hall sit?'?: string;
      'Does the school have running water?'?: string;
      'Describe the running water facilities.'?: string;
      'Is there purified drinking water available to students?'?: string;
      'Describe the purified water facilities.'?: string;
      'Does the school have electricity?'?: string;
      'Describe the electrical system.'?: string;
      'Does the school have fire extinguishers?'?: string;
      'How many fire extinguishers?'?: string;
      'Does the school provide meals?'?: string;
      'Does the school have its own kitchen?'?: string;
      'What cooking equipment does the school have?'?: string;
      'Does the school use charcoal, firewood, or gas? '?: string;
      'How many students eat breakfast at the school?'?: string;
      'How many students eat lunch at the school?'?: string;
      'Describe the meals the school provides.'?: string;
      'Does the school own vehicles to transport students to school?'?: string;
      'How many vehicles does the school own?'?: string;
      'How many total children can all of the vehicles fit?'?: string;
      'How many children are transported each day?'?: string;
      'Does the school have its own fields?'?: string;
      'Describe the field facilities'?: string;
      'How does it provide access to fields for its students?'?: string;
      'Does the school have a dedicated science lab?'?: string;
      'What does the science lab contain?'?: string;
      'Does the school have a library?'?: string;
      'How many books are in the library?'?: string;
      'Describe the library.'?: string;
      'Does the school have a computer lab?'?: string;
      'Is the building painted?'?: string;
      'Does the school have after school programs?'?: string;
      'What after school programs does the school have?'?: string;
      'Describe the washroom facilities'?: string;
      'What percentage of children transitioned last school year from primary school to secondary school?'?: string;
      'What percentage of children transitioned last school year from secondary school to tertiary or vocational school?'?: string;
      'The previous school year, what percentage of children passed the KCSE?'?: string;
      'What is the school made of?'?: string;
      "What are the school's floors made of?"?: string;
      'Is the school building single or multistory?'?: string;
      'Is the school building painted?'?: string;
      "Describe the school's washroom facilities"?: string;
      "How many girls' toilets does the school have?"?: string;
      "How many boys' toilets does the school have?"?: string;
      'How many shared toilets does the school have?'?: string;
      'By percentage of children, how many children get sent home at least once per term because of school fees?'?: string;
      'When you walked into the school, describe what you saw. (Teachers actively teaching, children eating, etc.)'?: string;
      'Do any of the teachers and administration have smartphones?'?: string;
      'How many teachers and admins have smartphones?'?: string;
      'Do the teachers and administration have computers (personally or for school work)?'?: string;
      'How many computers are there for teachers to use for work or personally?'?: string;
      'How many female children attend the school?'?: string;
      'How many male children attend the school?'?: string;
      'Does the school have textbooks for students?'?: string;
      'How many students share each textbook?'?: string;
      'Is the school connected to a sewer line?'?: string;
      'How many additional facilities does the director expect any project financed or asset purchased using the loan provided by Jackfruit will add to the school, if any?'?: string;
      'Any other notes on the school.'?: string;
      'Is the school a part of a school association? '?: string;
      'Does the school take daily attendance records?'?: string;
      'How many male teachers does the schools have?'?: string;
      'How many female teachers does the schools have?'?: string;
      'How many teachers did the school have last year?'?: string;
      'How many teachers did the school have two years ago?'?: string;
      'What percentage of teachers from last year came back to teach again this year?'?: string;
      'How many girls attend playgroup at the school? '?: string;
      'How many boys attend playgroup at the school? '?: string;
      'How many girls attend PP1 or PP2 at the school? '?: string;
      'How many boys attend PP1 or PP2 at the school? '?: string;
      'How many girls attend primary school at the school? '?: string;
      'How many boys attend primary school at the school? '?: string;
      'How many girls attend secondary school at the school? '?: string;
      'How many boys attend secondary school at the school? '?: string;
      'How many special needs boys attend the school?'?: string;
      'How many special needs girls attend the school?'?: string;
      'How many classrooms did the school have last year?'?: string;
      'How many classrooms did the school have two years ago?'?: string;
      'If the school is a primary school, does it have a junior secondary school? '?: string;
      'Does the school serve only special needs students?'?: string;
      'How many male employees who are not teachers does the school have? '?: string;
      'How many female employees who are not teachers does the school have? '?: string;
      'How many Playschool, PP1, and PP2 teachers does the school have?'?: string;
      'How many primary teachers does the school have?'?: string;
      'How many secondary teachers does the school have?'?: string;
      'Approximately how many times a year does the school test students in academic subjects (excluding KPSEA and KCPE). '?: string;
      'Does the school maintain records of individual pupil test scores?'?: string;
      'Does the school maintain records of student absences?'?: string;
      'Does the school evaluate the performance of teachers?'?: string;
      'How many teachers have been removed for unsatisfactory performance in the past 5 years?'?: string;
      'Do teachers receive monetary rewards for exceptional performance?'?: string;
      'Is the school a member of the Kenya Private School Association'?: string;
      'Do you have a child safeguarding policy?'?: string;
      'What does your school do to observe child safeguarding?'?: string;
      'How many working computers does the computer lab have?'?: string;
      'Which school association?'?: string;
      'How are records of pupil test scores stored?'?: string;
      'How are records of absences stored for students?'?: string;
      'Does the school conduct monitoring of teachers? By monitoring, I mean checking to make sure they are doing their jobs. This includes but is not limited to informal checks and teacher observations.  '?: string;
      'When the school conducts monitoring of teachers, is a form filled out?'?: string;
      'How many times a year does the school conduct monitoring of a given teacher? '?: string;
      'How many times per year does school evaluate teachers?'?: string;
      'What information does the school collect and use to evaluate the performance of your teachers?  '?: string;
      'Do teachers receive monetary rewards for exceptional performance? (yes/no)'?: string;
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

      // Get the current sheet headers to ensure we save all fields
      const sheetData = await this.sheetsService.getSheetData(this.SHEET_NAME);
      const headers = sheetData[0];

      // Create a map of all fields to save
      const rowData = {
        ID: id,
        'Created At': createdAt,
      };

      // Add all fields from the DTO to the rowData
      for (const [key, value] of Object.entries(createDto)) {
        rowData[key] = value;
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

  @Put(':id')
  async updateSurveyResponse(
    @Param('id') id: string,
    @Body()
    updateDto: {
      'Credit Application ID'?: string;
      'Director ID'?: string;
      'Survey Date'?: string;
      'Is the school APBET or Private?'?: string;
      'What kind of area is the school in?'?: string;
      'What grade levels does the school serve?'?: string;
      'How many students does the school have?'?: string;
      'How many classrooms does the school have?'?: string;
      'How many administrative rooms does the school have?'?: string;
      'How many teachers does the school have?'?: string;
      'Does the school have a dedicated assembly hall?'?: string;
      'How many people can the assembly hall sit?'?: string;
      'Does the school have running water?'?: string;
      'Describe the running water facilities.'?: string;
      'Is there purified drinking water available to students?'?: string;
      'Describe the purified water facilities.'?: string;
      'Does the school have electricity?'?: string;
      'Describe the electrical system.'?: string;
      'Does the school have fire extinguishers?'?: string;
      'How many fire extinguishers?'?: string;
      'Does the school provide meals?'?: string;
      'Does the school have its own kitchen?'?: string;
      'What cooking equipment does the school have?'?: string;
      'Does the school use charcoal, firewood, or gas? '?: string;
      'How many students eat breakfast at the school?'?: string;
      'How many students eat lunch at the school?'?: string;
      'Describe the meals the school provides.'?: string;
      'Does the school own vehicles to transport students to school?'?: string;
      'How many vehicles does the school own?'?: string;
      'How many total children can all of the vehicles fit?'?: string;
      'How many children are transported each day?'?: string;
      'Does the school have its own fields?'?: string;
      'Describe the field facilities'?: string;
      'How does it provide access to fields for its students?'?: string;
      'Does the school have a dedicated science lab?'?: string;
      'What does the science lab contain?'?: string;
      'Does the school have a library?'?: string;
      'How many books are in the library?'?: string;
      'Describe the library.'?: string;
      'Does the school have a computer lab?'?: string;
      'Is the building painted?'?: string;
      'Does the school have after school programs?'?: string;
      'What after school programs does the school have?'?: string;
      'Describe the washroom facilities'?: string;
      'What percentage of children transitioned last school year from primary school to secondary school?'?: string;
      'What percentage of children transitioned last school year from secondary school to tertiary or vocational school?'?: string;
      'The previous school year, what percentage of children passed the KCSE?'?: string;
      'What is the school made of?'?: string;
      "What are the school's floors made of?"?: string;
      'Is the school building single or multistory?'?: string;
      'Is the school building painted?'?: string;
      "Describe the school's washroom facilities"?: string;
      "How many girls' toilets does the school have?"?: string;
      "How many boys' toilets does the school have?"?: string;
      'How many shared toilets does the school have?'?: string;
      'By percentage of children, how many children get sent home at least once per term because of school fees?'?: string;
      'When you walked into the school, describe what you saw. (Teachers actively teaching, children eating, etc.)'?: string;
      'Do any of the teachers and administration have smartphones?'?: string;
      'How many teachers and admins have smartphones?'?: string;
      'Do the teachers and administration have computers (personally or for school work)?'?: string;
      'How many computers are there for teachers to use for work or personally?'?: string;
      'How many female children attend the school?'?: string;
      'How many male children attend the school?'?: string;
      'Does the school have textbooks for students?'?: string;
      'How many students share each textbook?'?: string;
      'Is the school connected to a sewer line?'?: string;
      'How many additional facilities does the director expect any project financed or asset purchased using the loan provided by Jackfruit will add to the school, if any?'?: string;
      'Any other notes on the school.'?: string;
      'Is the school a part of a school association? '?: string;
      'Does the school take daily attendance records?'?: string;
      'How many male teachers does the schools have?'?: string;
      'How many female teachers does the schools have?'?: string;
      'How many teachers did the school have last year?'?: string;
      'How many teachers did the school have two years ago?'?: string;
      'What percentage of teachers from last year came back to teach again this year?'?: string;
      'How many girls attend playgroup at the school? '?: string;
      'How many boys attend playgroup at the school? '?: string;
      'How many girls attend PP1 or PP2 at the school? '?: string;
      'How many boys attend PP1 or PP2 at the school? '?: string;
      'How many girls attend primary school at the school? '?: string;
      'How many boys attend primary school at the school? '?: string;
      'How many girls attend secondary school at the school? '?: string;
      'How many boys attend secondary school at the school? '?: string;
      'How many special needs boys attend the school?'?: string;
      'How many special needs girls attend the school?'?: string;
      'How many classrooms did the school have last year?'?: string;
      'How many classrooms did the school have two years ago?'?: string;
      'If the school is a primary school, does it have a junior secondary school? '?: string;
      'Does the school serve only special needs students?'?: string;
      'How many male employees who are not teachers does the school have? '?: string;
      'How many female employees who are not teachers does the school have? '?: string;
      'How many Playschool, PP1, and PP2 teachers does the school have?'?: string;
      'How many primary teachers does the school have?'?: string;
      'How many secondary teachers does the school have?'?: string;
      'Approximately how many times a year does the school test students in academic subjects (excluding KPSEA and KCPE). '?: string;
      'Does the school maintain records of individual pupil test scores?'?: string;
      'Does the school maintain records of student absences?'?: string;
      'Does the school evaluate the performance of teachers?'?: string;
      'How many teachers have been removed for unsatisfactory performance in the past 5 years?'?: string;
      'Do teachers receive monetary rewards for exceptional performance?'?: string;
      'Is the school a member of the Kenya Private School Association'?: string;
      'Do you have a child safeguarding policy?'?: string;
      'What does your school do to observe child safeguarding?'?: string;
      'How many working computers does the computer lab have?'?: string;
      'Which school association?'?: string;
      'How are records of pupil test scores stored?'?: string;
      'How are records of absences stored for students?'?: string;
      'Does the school conduct monitoring of teachers? By monitoring, I mean checking to make sure they are doing their jobs. This includes but is not limited to informal checks and teacher observations.  '?: string;
      'When the school conducts monitoring of teachers, is a form filled out?'?: string;
      'How many times a year does the school conduct monitoring of a given teacher? '?: string;
      'How many times per year does school evaluate teachers?'?: string;
      'What information does the school collect and use to evaluate the performance of your teachers?  '?: string;
      'Do teachers receive monetary rewards for exceptional performance? (yes/no)'?: string;
    },
  ) {
    try {
      // Get the current sheet data
      const sheetData = await this.sheetsService.getSheetData(this.SHEET_NAME);
      if (!sheetData || sheetData.length === 0) {
        return { success: false, message: 'No surveys found' };
      }

      const headers = sheetData[0];
      const idIndex = headers.indexOf('ID');

      // Log the headers and ID for debugging
      this.logger.debug(`Sheet headers: ${headers.join(', ')}`);
      this.logger.debug(`Looking for ID: ${id}`);
      this.logger.debug(`Total rows in sheet: ${sheetData.length}`);

      // Find the row with the matching ID
      let surveyRowIndex = -1;
      for (let i = 1; i < sheetData.length; i++) {
        const rowId = sheetData[i][idIndex];
        this.logger.debug(`Row ${i}: Comparing ID "${rowId}" with "${id}"`);
        if (rowId === id) {
          surveyRowIndex = i;
          this.logger.debug(`Found matching ID at row ${i}`);
          break;
        }
      }

      if (surveyRowIndex === -1) {
        this.logger.error(`Survey with ID ${id} not found in sheet`);
        return { success: false, message: 'Survey not found' };
      }

      // Calculate the actual row number in the sheet (1-based)
      const sheetRowNumber = surveyRowIndex + 1; // +1 because we want the actual row number in the sheet
      this.logger.debug(
        `Found survey at array index: ${surveyRowIndex}, sheet row number: ${sheetRowNumber}`,
      );

      // Create updated row data
      const updatedRow = [...sheetData[surveyRowIndex]];
      const updatedFields = [];
      const invalidFields = [];

      // Check each field in the update DTO
      for (const [key, value] of Object.entries(updateDto)) {
        const fieldIndex = headers.indexOf(key);
        if (fieldIndex !== -1) {
          updatedRow[fieldIndex] = value;
          updatedFields.push(key);
        } else {
          invalidFields.push(key);
        }
      }

      // Log any invalid fields
      if (invalidFields.length > 0) {
        this.logger.warn(
          `Invalid fields in update request for survey ${id}: ${invalidFields.join(
            ', ',
          )}`,
        );
      }

      // If no valid fields to update, return early
      if (updatedFields.length === 0) {
        return {
          success: false,
          message: 'No valid fields to update',
          invalidFields,
        };
      }

      // Log the row update attempt
      this.logger.debug(
        `Attempting to update row ${sheetRowNumber} with ${updatedFields.length} fields`,
      );

      // Update the row in the sheet
      await this.sheetsService.updateRow(
        this.SHEET_NAME,
        sheetRowNumber.toString(),
        updatedRow,
      );

      // Get the complete updated record
      const updatedSurvey = {};
      headers.forEach((header, index) => {
        updatedSurvey[header] = updatedRow[index];
      });

      return {
        success: true,
        message: 'Impact survey updated successfully',
        data: updatedSurvey,
        updatedFields,
        invalidFields: invalidFields.length > 0 ? invalidFields : undefined,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error updating impact survey ${id}: ${apiError.message}`,
        error,
      );
      throw error;
    }
  }
}
