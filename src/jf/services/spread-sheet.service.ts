import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';

@Injectable()
export class SpreadsheetService {
  private sheets;
  initTotalNoOfSchools: number = 20;
  initTotalMaleStudents: number = 2500;
  initTotalFemaleStudents: number = 2500;
  initTotalEnrollment: number = 5000;
  initTotalUrbanSchools: number = 20;
  initTotalFemaleDirectors: number = 20;
  initTotalTeachers: number = 100;

  constructor() {
    const auth = new google.auth.GoogleAuth({
      keyFile: 'keys/service-account.json',
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    this.sheets = google.sheets({ version: 'v4', auth });
  }
  private parseNumber(value: string): number {
    return Number(value.replace(/,/g, '')) || 0;
  }
  async readSheet(
    spreadsheetId: string,
    range: string = 'Worksheet!A1:CQ1000',
  ): Promise<any> {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      throw new Error('No data found in the sheet.');
    }

    const headers = rows[0];
    const data = rows.slice(1).map((row) =>
      headers.reduce((obj, key, index) => {
        obj[key] = row[index] || '';
        return obj;
      }, {}),
    );
    return this.getSummary(data);
  }

  async getSummary(data: any[]): Promise<any> {
    const allowedGrades = new Set(['primary', 'secondary', 'tertiary']);
    let totalMaleStudents = 0;
    let totalFemaleStudents = 0;
    let totalEnrolment = 0;
    let totalMaleDirectors = 0;
    let totalFemaleDirectors = 0;
    let totalTeachers = 0;
    let totalMaleTeachers = 0;
    let totalFemaleTeachers = 0;
    let schoolsWithRunningWater = 0;
    let schoolsWithoutRunningWater = 0;
    let schoolsWithKPLC = 0;
    let schoolsWithSolar = 0;
    let schoolsWithBoth = 0;
    let schoolsWithoutPowerSupply = 0;
    let schoolsWithComputerLab = 0;
    let schoolsWithoutComputerLab = 0;

    let yearStats: Record<string, any> = {
      2022: {
        totalSchools: 0,
        totalMaleStudents: 0,
        totalFemaleStudents: 0,
        totalMaleDirectors: 0,
        totalFemaleDirectors: 0,
        totalMaleTeachers: 0,
        totalFemaleTeachers: 0,
      },
      2023: {
        totalSchools: 0,
        totalMaleStudents: 0,
        totalFemaleStudents: 0,
        totalMaleDirectors: 0,
        totalFemaleDirectors: 0,
        totalMaleTeachers: 0,
        totalFemaleTeachers: 0,
      },
      2024: {
        totalSchools: 0,
        totalMaleStudents: 0,
        totalFemaleStudents: 0,
        totalMaleDirectors: 0,
        totalFemaleDirectors: 0,
        totalMaleTeachers: 0,
        totalFemaleTeachers: 0,
      },
      2025: {
        totalSchools: 0,
        totalMaleStudents: 0,
        totalFemaleStudents: 0,
        totalMaleDirectors: 0,
        totalFemaleDirectors: 0,
        totalMaleTeachers: 0,
        totalFemaleTeachers: 0,
      },
    };

    let feeCategoryStats = {
      '0-5000': 0,
      '5001-10000': 0,
      '10001-20000': 0,
      '>20000': 0,
    };

    let statsGradeServed: Record<string, number> = {};

    for (const school of data) {
      const gradesServed = school['Grades Served']
        .split(',')
        .map((g) => g.trim());

      gradesServed.forEach((g) => {
        const normalizedG = g.trim().toLowerCase();
        if (allowedGrades.has(normalizedG)) {
          statsGradeServed[g] = (statsGradeServed[g] || 0) + 1;
        }
      });

      const maleStudents =
        Number(school['How many male children attend the school?']) || 0;
      const femaleStudents =
        Number(school['How many female children attend the school?']) || 0;
      const enrolment = maleStudents + femaleStudents;
      const isFemaleDirector =
        school['Female DR?']?.toString().toLowerCase() === 'true';
      const maleTeachers = Number(school['Male']) || 0;
      const femaleTeachers = Number(school['Female']) || 0;
      const firstYear = Number(school['First year']) || 0;
      const hasRunningWater =
        school['Does the school have running water?']
          ?.toString()
          .toLowerCase() === 'true';
      const powerSupply = school['Elec Check']?.toString().toLowerCase();
      const hasComputerLab =
        school['Does the school have a computer lab?']
          ?.toString()
          .toLowerCase() === 'true';

      const schoolFees = this.parseNumber(school['Ave fee p.t']);

      totalMaleStudents += maleStudents;
      totalFemaleStudents += femaleStudents;
      totalEnrolment += enrolment;
      totalTeachers += maleTeachers + femaleTeachers;
      totalMaleTeachers += maleTeachers;
      totalFemaleTeachers += femaleTeachers;

      if (isFemaleDirector) {
        totalFemaleDirectors++;
      } else {
        totalMaleDirectors++;
      }

      if (hasRunningWater) {
        schoolsWithRunningWater++;
      } else {
        schoolsWithoutRunningWater++;
      }

      if (powerSupply === 'kplc') {
        schoolsWithKPLC++;
      } else if (powerSupply === 'solar') {
        schoolsWithSolar++;
      } else if (powerSupply === 'kplc & solar') {
        schoolsWithBoth++;
      } else {
        schoolsWithoutPowerSupply++;
      }

      if (hasComputerLab) {
        schoolsWithComputerLab++;
      } else {
        schoolsWithoutComputerLab++;
      }
      if (schoolFees <= 5000) {
        feeCategoryStats['0-5000']++;
      } else if (schoolFees <= 10000) {
        feeCategoryStats['5001-10000']++;
      } else if (schoolFees <= 20000) {
        feeCategoryStats['10001-20000']++;
      } else {
        feeCategoryStats['>20000']++;
      }

      if (yearStats[firstYear]) {
        yearStats[firstYear].totalSchools++;
        yearStats[firstYear].totalMaleStudents += maleStudents;
        yearStats[firstYear].totalFemaleStudents += femaleStudents;
        yearStats[firstYear].totalMaleDirectors += isFemaleDirector ? 0 : 1;
        yearStats[firstYear].totalFemaleDirectors += isFemaleDirector ? 1 : 0;
        yearStats[firstYear].totalMaleTeachers += maleTeachers;
        yearStats[firstYear].totalFemaleTeachers += femaleTeachers;
      }
    }
    const schoolLocations = data.map((rec) => {
      const location = {
        name: rec['Borrower Name'],
        location: rec['GPS'],
      };
      return location;
    });
    return {
      totalNoOfSchools: data.length + this.initTotalNoOfSchools,
      totalEnrolment: totalEnrolment + this.initTotalEnrollment,
      totalMaleStudents: totalMaleStudents + this.initTotalMaleStudents,
      totalFemaleStudents: totalFemaleStudents + this.initTotalFemaleStudents,
      totalTeachers,
      totalMaleTeachers,
      totalFemaleTeachers,
      directorsStat: {
        male: totalMaleDirectors,
        female: totalFemaleDirectors + 20,
        total: totalMaleDirectors + totalFemaleDirectors + 20,
      },
      powerConnectivityStats: {
        schoolsWithKPLC,
        schoolsWithSolar,
        schoolsWithBoth,
        schoolsWithoutPowerSupply,
      },
      runningWaterStats: {
        schoolsWithRunningWater,
        schoolsWithoutRunningWater,
      },
      computerLabStats: {
        schoolsWithComputerLab,
        schoolsWithoutComputerLab,
      },
      yearStats,
      feeCategoryStats,
      statsGradeServed,
      schoolLocations,
    };
  }
}
