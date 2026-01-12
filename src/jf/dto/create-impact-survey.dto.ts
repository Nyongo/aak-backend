import { IsOptional, IsString, IsBoolean, IsInt } from 'class-validator';

export class CreateImpactSurveyDto {
  @IsOptional()
  @IsString()
  sheetId?: string;

  @IsOptional()
  @IsString()
  creditApplicationId?: string;

  @IsOptional()
  @IsString()
  surveyDate?: string;

  @IsOptional()
  @IsString()
  directorId?: string;

  @IsOptional()
  @IsString()
  createdBy?: string;

  @IsOptional()
  @IsString()
  isSchoolAPBETOrPrivate?: string;

  @IsOptional()
  @IsString()
  whatKindOfAreaIsTheSchoolIn?: string;

  @IsOptional()
  @IsString()
  whatGradeLevelsDoesTheSchoolServe?: string;

  @IsOptional()
  @IsString()
  howManyStudentsDoesTheSchoolHave?: string;

  @IsOptional()
  @IsString()
  whatPercentageOfChildrenTransitionedLastSchoolYearFromSecondarySchoolToTertiaryOrVocationalSchool?: string;

  @IsOptional()
  @IsString()
  thePreviousSchoolYearWhatPercentageOfChildrenPassedTheKCSE?: string;

  @IsOptional()
  @IsString()
  howManyClassroomsDoesTheSchoolHave?: string;

  @IsOptional()
  @IsString()
  howManyAdministrativeRoomsDoesTheSchoolHave?: string;

  @IsOptional()
  @IsString()
  howManyTeachersDoesTheSchoolHave?: string;

  @IsOptional()
  @IsString()
  doesTheSchoolHaveADedicatedAssemblyHall?: string;

  @IsOptional()
  @IsString()
  howManyPeopleCanTheAssemblyHallSit?: string;

  @IsOptional()
  @IsString()
  doesTheSchoolHaveRunningWater?: string;

  @IsOptional()
  @IsString()
  describeTheRunningWaterFacilities?: string;

  @IsOptional()
  @IsString()
  isTherePurifiedDrinkingWaterAvailableToStudents?: string;

  @IsOptional()
  @IsString()
  describeThePurifiedWaterFacilities?: string;

  @IsOptional()
  @IsString()
  doesTheSchoolHaveElectricity?: string;

  @IsOptional()
  @IsString()
  describeTheElectricalSystem?: string;

  @IsOptional()
  @IsString()
  doesTheSchoolHaveFireExtinguishers?: string;

  @IsOptional()
  @IsString()
  howManyFireExtinguishers?: string;

  @IsOptional()
  @IsString()
  doesTheSchoolProvideMeals?: string;

  @IsOptional()
  @IsString()
  doesTheSchoolHaveItsOwnKitchen?: string;

  @IsOptional()
  @IsString()
  whatCookingEquipmentDoesTheSchoolHave?: string;

  @IsOptional()
  @IsString()
  doesTheSchoolUseCharcoalFirewoodOrGas?: string;

  @IsOptional()
  @IsString()
  howManyStudentsEatBreakfastAtTheSchool?: string;

  @IsOptional()
  @IsString()
  howManyStudentsEatLunchAtTheSchool?: string;

  @IsOptional()
  @IsString()
  describeTheMealsTheSchoolProvides?: string;

  @IsOptional()
  @IsString()
  doesTheSchoolOwnVehiclesToTransportStudentsToSchool?: string;

  @IsOptional()
  @IsString()
  howManyVehiclesDoesTheSchoolOwn?: string;

  @IsOptional()
  @IsString()
  howManyTotalChildrenCanAllOfTheVehiclesFit?: string;

  @IsOptional()
  @IsString()
  howManyChildrenAreTransportedEachDay?: string;

  @IsOptional()
  @IsString()
  doesTheSchoolHaveItsOwnFields?: string;

  @IsOptional()
  @IsString()
  describeTheFacilities?: string;

  @IsOptional()
  @IsString()
  howDoesItProvideAccessToFieldsForItsStudents?: string;

  @IsOptional()
  @IsString()
  doesTheSchoolHaveADedicatedScienceLab?: string;

  @IsOptional()
  @IsString()
  whatDoesTheScienceLabContain?: string;

  @IsOptional()
  @IsString()
  doesTheSchoolHaveALibrary?: string;

  @IsOptional()
  @IsString()
  howManyBooksDoesTheLibraryContain?: string;

  @IsOptional()
  @IsString()
  describeTheLibrary?: string;

  @IsOptional()
  @IsString()
  doesTheSchoolHaveAComputerLab?: string;

  @IsOptional()
  @IsString()
  howManyWorkingComputersDoesTheComputerLabHave?: string;

  @IsOptional()
  @IsString()
  whatIsTheSchoolMadeOf?: string;

  @IsOptional()
  @IsString()
  whatAreTheSchoolSFloorsMadeOf?: string;

  @IsOptional()
  @IsString()
  isTheSchoolBuildingSingleOrMultistory?: string;

  @IsOptional()
  @IsString()
  isTheSchoolBuildingPainted?: string;

  @IsOptional()
  @IsString()
  doesTheSchoolHaveAfterSchoolPrograms?: string;

  @IsOptional()
  @IsString()
  whatAfterSchoolProgramsDoesTheSchoolHave?: string;

  @IsOptional()
  @IsString()
  describeTheSchoolSWashroomFacilities?: string;

  @IsOptional()
  @IsString()
  howManyGirlsToiletsDoesTheSchoolHave?: string;

  @IsOptional()
  @IsString()
  howManyBoysToiletsDoesTheSchoolHave?: string;

  @IsOptional()
  @IsString()
  howManySharedToiletsDoesTheSchoolHave?: string;

  @IsOptional()
  @IsString()
  byPercentageOfChildrenHowManyChildrenGetSentHomeAtLeastOncePerTermBecauseOfSchoolFees?: string;

  @IsOptional()
  @IsString()
  whenYouWalkedIntoTheSchoolDescribeWhatYouSaw?: string;

  @IsOptional()
  @IsString()
  doAnyOfTheTeachersAndAdministrationHaveSmartphones?: string;

  @IsOptional()
  @IsString()
  howManyTeachersAndAdminsHaveSmartphones?: string;

  @IsOptional()
  @IsString()
  doTheTeachersAndAdministrationHaveComputersPersonallyOrForSchoolWork?: string;

  @IsOptional()
  @IsString()
  howManyComputersAreThereForTeachersToUseForWorkOrPersonally?: string;

  @IsOptional()
  @IsInt()
  howManyFemaleChildrenAttendTheSchool?: number;

  @IsOptional()
  @IsInt()
  howManyMaleChildrenAttendTheSchool?: number;

  @IsOptional()
  @IsString()
  doesTheSchoolHaveTextbooksForStudents?: string;

  @IsOptional()
  @IsString()
  howManyStudentsShareEachTextbook?: string;

  @IsOptional()
  @IsString()
  isTheSchoolConnectedToASewerLine?: string;

  @IsOptional()
  @IsString()
  howManyAdditionalStudentsDoesTheDirectorExpectAnyProjectFinancedOrAssetPurchasedUsingTheLoanProvidedByJackfruitWillAddToTheSchoolIfAny?: string;

  @IsOptional()
  @IsString()
  anyOtherNotesOnTheSchool?: string;

  @IsOptional()
  @IsString()
  photosAdded?: string;

  @IsOptional()
  @IsString()
  isTheSchoolAPartOfASchoolAssociation?: string;

  @IsOptional()
  @IsString()
  whichSchoolAssociation?: string;

  @IsOptional()
  @IsString()
  doesTheSchoolTakeDailyAttendanceRecords?: string;

  @IsOptional()
  @IsInt()
  howManyMaleTeachersDoesTheSchoolsHave?: number;

  @IsOptional()
  @IsInt()
  howManyFemaleTeachersDoesTheSchoolsHave?: number;

  @IsOptional()
  @IsString()
  howManyTeachersDidTheSchoolHaveLastYear?: string;

  @IsOptional()
  @IsString()
  howManyTeachersDidTheSchoolHaveTwoYearsAgo?: string;

  @IsOptional()
  @IsString()
  whatPercentageOfChildrenTransitionedLastSchoolYearFromPrimarySchoolToSecondarySchool?: string;

  @IsOptional()
  @IsString()
  whatPercentageOfTeachersFromLastYearCameBackToTeachAgainThisYear?: string;

  @IsOptional()
  @IsString()
  howManyGirlsAttendPlaygroupAtTheSchool?: string;

  @IsOptional()
  @IsString()
  howManyBoysAttendPlaygroupAtTheSchool?: string;

  @IsOptional()
  @IsString()
  howManyGirlsAttendPP1OrPP2AtTheSchool?: string;

  @IsOptional()
  @IsString()
  howManyBoysAttendPP1OrPP2AtTheSchool?: string;

  @IsOptional()
  @IsString()
  howManyGirlsAttendPrimarySchoolAtTheSchool?: string;

  @IsOptional()
  @IsString()
  howManyBoysAttendPrimarySchoolAtTheSchool?: string;

  @IsOptional()
  @IsString()
  howManyGirlsAttendSecondarySchoolAtTheSchool?: string;

  @IsOptional()
  @IsString()
  howManyBoysAttendSecondarySchoolAtTheSchool?: string;

  @IsOptional()
  @IsInt()
  howManySpecialNeedsBoysAttendTheSchool?: number;

  @IsOptional()
  @IsInt()
  howManySpecialNeedsGirlsAttendTheSchool?: number;

  @IsOptional()
  @IsString()
  howManyClassroomsDidTheSchoolHaveLastYear?: string;

  @IsOptional()
  @IsString()
  howManyClasroomsDidTheSchoolHaveTwoYearsAgo?: string;

  @IsOptional()
  @IsString()
  ifTheSchoolIsAPrimarySchoolDoesItHaveAJuniorSecondarySchool?: string;

  @IsOptional()
  @IsString()
  doesTheSchoolServeOnlySpecialNeedsStudents?: string;

  @IsOptional()
  @IsString()
  howManyMaleEmployeesWhoAreNotTeachersDoesTheSchoolHave?: string;

  @IsOptional()
  @IsString()
  howManyFemaleEmployeesWhoAreNotTeachersDoesTheSchoolHave?: string;

  @IsOptional()
  @IsString()
  howManyPlayschoolPP1AndPP2TeachersDoesTheSchoolHave?: string;

  @IsOptional()
  @IsString()
  howManyPrimaryTeachersDoesTheSchoolHave?: string;

  @IsOptional()
  @IsString()
  howManySecondaryTeachersDoesTheSchoolHave?: string;

  @IsOptional()
  @IsString()
  approximatelyHowManyTimesAYearDoesTheSchoolTestStudentsInAcademicSubjectsExcludingKPSEAAndKCPE?: string;

  @IsOptional()
  @IsString()
  doesTheSchoolMaintainRecordsOfIndividualPupilTestScores?: string;

  @IsOptional()
  @IsString()
  howAreRecordsOfPupilTestScoresStored?: string;

  @IsOptional()
  @IsString()
  doesTheSchoolMaintainRecordsOfStudentAbsences?: string;

  @IsOptional()
  @IsString()
  howAreRecordsOfAbsencesStoredForStudents?: string;

  @IsOptional()
  @IsString()
  doesTheSchoolConductMonitoringOfTeachers?: string;

  @IsOptional()
  @IsString()
  whenTheSchoolConductsMonitoringOfTeachersIsAFormFilledOut?: string;

  @IsOptional()
  @IsString()
  howManyTimesAYearDoesTheSchoolConductMonitoringOfAGivenTeacher?: string;

  @IsOptional()
  @IsString()
  doesTheSchoolEvaluateThePerformanceOfTeachers?: string;

  @IsOptional()
  @IsString()
  howHowManyTimesPerYearDoesSchoolEvaluateTeachers?: string;

  @IsOptional()
  @IsString()
  whatInformationDoesTheSchoolCollectAndUseToEvaluateThePerformanceOfYourTeachers?: string;

  @IsOptional()
  @IsString()
  howManyTeachersHaveBeenRemovedForUnsatisfactoryPerformanceInThePast5Years?: string;

  @IsOptional()
  @IsString()
  doTeachersReceiveMonetaryRewardsForExceptionalPerformanceYesNo?: string;

  @IsOptional()
  @IsString()
  isTheSchoolAMemberOfTheKenyaPrivateSchoolAssociation?: string;

  @IsOptional()
  @IsString()
  doYouHaveAChildSafeguardingPolicy?: string;

  @IsOptional()
  @IsString()
  whatDoesYourSchoolDoToObserveChildSafeguarding?: string;

  @IsOptional()
  @IsBoolean()
  synced?: boolean;
}
