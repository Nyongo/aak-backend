import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateImpactSurveyDto } from '../dto/create-impact-survey.dto';
import { UpdateImpactSurveyDto } from '../dto/update-impact-survey.dto';

@Injectable()
export class ImpactSurveyDbService {
  private readonly logger = new Logger(ImpactSurveyDbService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createImpactSurveyDto: CreateImpactSurveyDto) {
    try {
      const result = await this.prisma.impactSurvey.create({
        data: createImpactSurveyDto,
      });
      this.logger.log(`Created impact survey with ID: ${result.id}`);
      return result;
    } catch (error) {
      this.logger.error('Error creating impact survey:', error);
      throw error;
    }
  }

  async findAll() {
    try {
      return await this.prisma.impactSurvey.findMany({
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error('Error fetching all impact surveys:', error);
      throw error;
    }
  }

  async findOne(id: number) {
    try {
      return await this.prisma.impactSurvey.findUnique({
        where: { id },
      });
    } catch (error) {
      this.logger.error(`Error fetching impact survey with ID ${id}:`, error);
      throw error;
    }
  }

  async findBySheetId(sheetId: string) {
    try {
      return await this.prisma.impactSurvey.findUnique({
        where: { sheetId },
      });
    } catch (error) {
      this.logger.error(
        `Error fetching impact survey with sheet ID ${sheetId}:`,
        error,
      );
      throw error;
    }
  }

  async findByCreditApplicationId(creditApplicationId: string) {
    try {
      return await this.prisma.impactSurvey.findMany({
        where: { creditApplicationId },
        orderBy: { surveyDate: 'desc' },
      });
    } catch (error) {
      this.logger.error(
        `Error fetching impact surveys for credit application ${creditApplicationId}:`,
        error,
      );
      throw error;
    }
  }

  async findByDirectorId(directorId: string) {
    try {
      return await this.prisma.impactSurvey.findMany({
        where: { directorId },
        orderBy: { surveyDate: 'desc' },
      });
    } catch (error) {
      this.logger.error(
        `Error fetching impact surveys for director ${directorId}:`,
        error,
      );
      throw error;
    }
  }

  async update(
    id: number,
    updateImpactSurveyDto: UpdateImpactSurveyDto,
  ) {
    try {
      const result = await this.prisma.impactSurvey.update({
        where: { id },
        data: updateImpactSurveyDto,
      });
      this.logger.log(`Updated impact survey with ID: ${id}`);
      return result;
    } catch (error) {
      this.logger.error(`Error updating impact survey with ID ${id}:`, error);
      throw error;
    }
  }

  async remove(id: number) {
    try {
      const result = await this.prisma.impactSurvey.delete({
        where: { id },
      });
      this.logger.log(`Deleted impact survey with ID: ${id}`);
      return result;
    } catch (error) {
      this.logger.error(`Error deleting impact survey with ID ${id}:`, error);
      throw error;
    }
  }

  // Mapping from Google Sheets column names to database field names
  private sheetToDbMapping: Record<string, string> = {
    ID: 'sheetId',
    'Credit Application ID': 'creditApplicationId',
    'Survey Date': 'surveyDate',
    'Director ID': 'directorId',
    'Created By': 'createdBy',
    // Note: 'Created At' is handled by Prisma default
    'Is the school APBET or Private?': 'isSchoolAPBETOrPrivate',
    'What kind of area is the school in?': 'whatKindOfAreaIsTheSchoolIn',
    'What grade levels does the school serve?':
      'whatGradeLevelsDoesTheSchoolServe',
    'How many students does the school have?':
      'howManyStudentsDoesTheSchoolHave',
    'What percentage of children transitioned last school year from secondary school to tertiary or vocational school?':
      'whatPercentageOfChildrenTransitionedLastSchoolYearFromSecondarySchoolToTertiaryOrVocationalSchool',
    'The previous school year, what percentage of children passed the KCSE?':
      'thePreviousSchoolYearWhatPercentageOfChildrenPassedTheKCSE',
    'How many classrooms does the school have?':
      'howManyClassroomsDoesTheSchoolHave',
    'How many administrative rooms does the school have?':
      'howManyAdministrativeRoomsDoesTheSchoolHave',
    'How many teachers does the school have?':
      'howManyTeachersDoesTheSchoolHave',
    'Does the school have a dedicated assembly hall?':
      'doesTheSchoolHaveADedicatedAssemblyHall',
    'How many people can the assembly hall sit?':
      'howManyPeopleCanTheAssemblyHallSit',
    'Does the school have running water?': 'doesTheSchoolHaveRunningWater',
    'Describe the running water facilities.':
      'describeTheRunningWaterFacilities',
    'Is there purified drinking water available to students?':
      'isTherePurifiedDrinkingWaterAvailableToStudents',
    'Describe the purified water facilities.':
      'describeThePurifiedWaterFacilities',
    'Does the school have electricity?': 'doesTheSchoolHaveElectricity',
    'Describe the electrical system.': 'describeTheElectricalSystem',
    'Does the school have fire extinguishers?':
      'doesTheSchoolHaveFireExtinguishers',
    'How many fire extinguishers?': 'howManyFireExtinguishers',
    'Does the school provide meals?': 'doesTheSchoolProvideMeals',
    'Does the school have its own kitchen?':
      'doesTheSchoolHaveItsOwnKitchen',
    'What cooking equipment does the school have?':
      'whatCookingEquipmentDoesTheSchoolHave',
    'Does the school use charcoal, firewood, or gas? ':
      'doesTheSchoolUseCharcoalFirewoodOrGas',
    'How many students eat breakfast at the school?':
      'howManyStudentsEatBreakfastAtTheSchool',
    'How many students eat lunch at the school?':
      'howManyStudentsEatLunchAtTheSchool',
    'Describe the meals the school provides.':
      'describeTheMealsTheSchoolProvides',
    'Does the school own vehicles to transport students to school?':
      'doesTheSchoolOwnVehiclesToTransportStudentsToSchool',
    'How many vehicles does the school own?':
      'howManyVehiclesDoesTheSchoolOwn',
    'How many total children can all of the vehicles fit?':
      'howManyTotalChildrenCanAllOfTheVehiclesFit',
    'How many children are transported each day?':
      'howManyChildrenAreTransportedEachDay',
    'Does the school have its own fields?': 'doesTheSchoolHaveItsOwnFields',
    'Describe the facilities.': 'describeTheFacilities',
    'How does it provide access to fields for its students?':
      'howDoesItProvideAccessToFieldsForItsStudents',
    'Does the school have a dedicated science lab?':
      'doesTheSchoolHaveADedicatedScienceLab',
    'What does the science lab contain?': 'whatDoesTheScienceLabContain',
    'Does the school have a library?': 'doesTheSchoolHaveALibrary',
    'How many books does the library contain?':
      'howManyBooksDoesTheLibraryContain',
    'Describe the library.': 'describeTheLibrary',
    'Does the school have a computer lab?': 'doesTheSchoolHaveAComputerLab',
    'How many working computers does the computer lab have?':
      'howManyWorkingComputersDoesTheComputerLabHave',
    'What is the school made of?': 'whatIsTheSchoolMadeOf',
    "What are the school's floors made of?": 'whatAreTheSchoolSFloorsMadeOf',
    'Is the school building single or multistory?':
      'isTheSchoolBuildingSingleOrMultistory',
    'Is the school building painted?': 'isTheSchoolBuildingPainted',
    'Does the school have after school programs?':
      'doesTheSchoolHaveAfterSchoolPrograms',
    'What after school programs does the school have?':
      'whatAfterSchoolProgramsDoesTheSchoolHave',
    "Describe the school's washroom facilities.":
      'describeTheSchoolSWashroomFacilities',
    "How many girls' toilets does the school have?":
      'howManyGirlsToiletsDoesTheSchoolHave',
    "How many boys' toilets does the school have?":
      'howManyBoysToiletsDoesTheSchoolHave',
    'How many shared toilets does the school have?':
      'howManySharedToiletsDoesTheSchoolHave',
    'By percentage of children, how many children get sent home at least once per term because of school fees?':
      'byPercentageOfChildrenHowManyChildrenGetSentHomeAtLeastOncePerTermBecauseOfSchoolFees',
    'When you walked into the school, describe what you saw. (Teachers actively teaching, children eating, etc.)':
      'whenYouWalkedIntoTheSchoolDescribeWhatYouSaw',
    'Do any of the teachers and administration have smartphones?':
      'doAnyOfTheTeachersAndAdministrationHaveSmartphones',
    'How many teachers and admins have smartphones?':
      'howManyTeachersAndAdminsHaveSmartphones',
    'Do the teachers and administration have computers (personally or for school work)?':
      'doTheTeachersAndAdministrationHaveComputersPersonallyOrForSchoolWork',
    'How many computers are there for teachers to use for work or personally?':
      'howManyComputersAreThereForTeachersToUseForWorkOrPersonally',
    'How many female children attend the school?':
      'howManyFemaleChildrenAttendTheSchool',
    'How many male children attend the school?':
      'howManyMaleChildrenAttendTheSchool',
    'Does the school have textbooks for students?':
      'doesTheSchoolHaveTextbooksForStudents',
    'How many students share each textbook?':
      'howManyStudentsShareEachTextbook',
    'Is the school connected to a sewer line?':
      'isTheSchoolConnectedToASewerLine',
    'How many additional students does the director expect any project financed or asset purchased using the loan provided by Jackfruit will add to the school, if any? ':
      'howManyAdditionalStudentsDoesTheDirectorExpectAnyProjectFinancedOrAssetPurchasedUsingTheLoanProvidedByJackfruitWillAddToTheSchoolIfAny',
    'Any other notes on the school.': 'anyOtherNotesOnTheSchool',
    'Photos Added?': 'photosAdded',
    'Is the school a part of a school association? ':
      'isTheSchoolAPartOfASchoolAssociation',
    'Which school association?': 'whichSchoolAssociation',
    'Does the school take daily attendance records?':
      'doesTheSchoolTakeDailyAttendanceRecords',
    'How many male teachers does the schools have?':
      'howManyMaleTeachersDoesTheSchoolsHave',
    'How many female teachers does the schools have?':
      'howManyFemaleTeachersDoesTheSchoolsHave',
    'How many teachers did the school have last year?':
      'howManyTeachersDidTheSchoolHaveLastYear',
    'How many teachers did the school have two years ago?':
      'howManyTeachersDidTheSchoolHaveTwoYearsAgo',
    'What percentage of children transitioned last school year from primary school to secondary school?':
      'whatPercentageOfChildrenTransitionedLastSchoolYearFromPrimarySchoolToSecondarySchool',
    'What percentage of teachers from last year came back to teach again this year?':
      'whatPercentageOfTeachersFromLastYearCameBackToTeachAgainThisYear',
    'How many girls attend playgroup at the school? ':
      'howManyGirlsAttendPlaygroupAtTheSchool',
    'How many boys attend playgroup at the school? ':
      'howManyBoysAttendPlaygroupAtTheSchool',
    'How many girls attend PP1 or PP2 at the school? ':
      'howManyGirlsAttendPP1OrPP2AtTheSchool',
    'How many boys attend PP1 or PP2 at the school? ':
      'howManyBoysAttendPP1OrPP2AtTheSchool',
    'How many girls attend primary school at the school? ':
      'howManyGirlsAttendPrimarySchoolAtTheSchool',
    'How many boys attend primary school at the school? ':
      'howManyBoysAttendPrimarySchoolAtTheSchool',
    'How many girls attend secondary school at the school? ':
      'howManyGirlsAttendSecondarySchoolAtTheSchool',
    'How many boys attend secondary school at the school? ':
      'howManyBoysAttendSecondarySchoolAtTheSchool',
    'How many special needs boys attend the school?':
      'howManySpecialNeedsBoysAttendTheSchool',
    'How many special needs girls attend the school?':
      'howManySpecialNeedsGirlsAttendTheSchool',
    'How many classrooms did the school have last year?':
      'howManyClassroomsDidTheSchoolHaveLastYear',
    'How many clasrooms did the school have two years ago?':
      'howManyClasroomsDidTheSchoolHaveTwoYearsAgo',
    'If the school is a primary school, does it have a junior secondary school? ':
      'ifTheSchoolIsAPrimarySchoolDoesItHaveAJuniorSecondarySchool',
    'Does the school serve only special needs students?':
      'doesTheSchoolServeOnlySpecialNeedsStudents',
    'How many male employees who are not teachers does the school have? ':
      'howManyMaleEmployeesWhoAreNotTeachersDoesTheSchoolHave',
    'How many female employees who are not teachers does the school have? ':
      'howManyFemaleEmployeesWhoAreNotTeachersDoesTheSchoolHave',
    'How many Playschool, PP1, and PP2 teachers does the school have?':
      'howManyPlayschoolPP1AndPP2TeachersDoesTheSchoolHave',
    'How many primary teachers does the school have?':
      'howManyPrimaryTeachersDoesTheSchoolHave',
    'How many secondary teachers does the school have?':
      'howManySecondaryTeachersDoesTheSchoolHave',
    'Approximately how many times a year does the school test students in academic subjects (excluding KPSEA and KCPE). ':
      'approximatelyHowManyTimesAYearDoesTheSchoolTestStudentsInAcademicSubjectsExcludingKPSEAAndKCPE',
    'Does the school maintain records of individual pupil test scores?':
      'doesTheSchoolMaintainRecordsOfIndividualPupilTestScores',
    'How are records of pupil test scores stored?':
      'howAreRecordsOfPupilTestScoresStored',
    'Does the school maintain records of student absences?':
      'doesTheSchoolMaintainRecordsOfStudentAbsences',
    'How are records of absences stored for students?':
      'howAreRecordsOfAbsencesStoredForStudents',
    'Does the school conduct monitoring of teachers? By monitoring, I mean checking to make sure they are doing their jobs. This includes but is not limited to informal checks and teacher observations.  ':
      'doesTheSchoolConductMonitoringOfTeachers',
    'When the school conducts monitoring of teachers, is a form filled out?':
      'whenTheSchoolConductsMonitoringOfTeachersIsAFormFilledOut',
    'How many times a year does the school conduct monitoring of a given teacher? ':
      'howManyTimesAYearDoesTheSchoolConductMonitoringOfAGivenTeacher',
    'Does the school evaluate the performance of teachers?':
      'doesTheSchoolEvaluateThePerformanceOfTeachers',
    'How how many times per year does school evaluate teachers?':
      'howHowManyTimesPerYearDoesSchoolEvaluateTeachers',
    'What information does the school collect and use to evaluate the performance of your teachers?  ':
      'whatInformationDoesTheSchoolCollectAndUseToEvaluateThePerformanceOfYourTeachers',
    'How many teachers have been removed for unsatisfactory performance in the past 5 years':
      'howManyTeachersHaveBeenRemovedForUnsatisfactoryPerformanceInThePast5Years',
    'Do teachers receive monetary rewards for exceptional performance? (yes/no)':
      'doTeachersReceiveMonetaryRewardsForExceptionalPerformanceYesNo',
    'Is the school a member of the Kenya Private School Association':
      'isTheSchoolAMemberOfTheKenyaPrivateSchoolAssociation',
    'Do you have a child safeguarding policy?':
      'doYouHaveAChildSafeguardingPolicy',
    'What does your school do to observe child safeguarding?':
      'whatDoesYourSchoolDoToObserveChildSafeguarding',
  };

  // Helper method to safely get a value from sheet record
  private getSheetValue(sheetRecord: any, columnName: string): string | null {
    const value = sheetRecord[columnName];
    if (value !== undefined && value !== null && value !== '') {
      // Convert to string and trim
      const stringValue = String(value).trim();
      if (stringValue !== '') {
        return stringValue;
      }
    }
    return null;
  }

  convertSheetToDb(sheetRecord: any): CreateImpactSurveyDto {
    // Log all available keys in the sheet record for debugging
    const availableKeys = Object.keys(sheetRecord).filter(
      (key) =>
        sheetRecord[key] !== undefined &&
        sheetRecord[key] !== null &&
        sheetRecord[key] !== '',
    );
    if (availableKeys.length > 0) {
      this.logger.debug(
        `Converting sheet record. Available non-empty keys: ${availableKeys.join(', ')}`,
      );
    }

    // Map all columns from sheet to database fields using the mapping
    const dbRecord: any = {};

    for (const [sheetColumn, dbField] of Object.entries(this.sheetToDbMapping)) {
      const value = this.getSheetValue(sheetRecord, sheetColumn);
      if (value !== null) {
        dbRecord[dbField] = value;
      }
    }

    // Remove null/undefined values to keep the record clean
    Object.keys(dbRecord).forEach((key) => {
      if (dbRecord[key] === null || dbRecord[key] === undefined) {
        delete dbRecord[key];
      }
    });

    return dbRecord as CreateImpactSurveyDto;
  }
}
