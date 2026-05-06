-- CreateTable: JSON-based impact survey submissions from the SSL app form.
-- This table was missing from migrations (was only applied locally via db push).
CREATE TABLE IF NOT EXISTS "impact_survey_submissions" (
    "id"                          TEXT NOT NULL,
    "borrowerId"                  TEXT NOT NULL,
    "creditApplicationId"         TEXT NOT NULL,
    "submittedBySslUserId"        TEXT NOT NULL,
    "submittedAt"                 TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "surveyVersion"               TEXT NOT NULL,
    "responses"                   JSONB NOT NULL,
    "schoolType"                  TEXT,
    "areaType"                    TEXT,
    "isRepeatBorrower"            BOOLEAN,
    "totalStudentsMale"           INTEGER,
    "totalStudentsFemale"         INTEGER,
    "totalStudentsWithDisability" INTEGER,
    "totalStudents"               INTEGER,
    "totalStaffMale"              INTEGER,
    "totalStaffFemale"            INTEGER,
    "totalStaff"                  INTEGER,
    "createdAt"                   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"                   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "impact_survey_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "impact_survey_submissions_borrowerId_idx" ON "impact_survey_submissions"("borrowerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "impact_survey_submissions_creditApplicationId_idx" ON "impact_survey_submissions"("creditApplicationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "impact_survey_submissions_submittedBySslUserId_idx" ON "impact_survey_submissions"("submittedBySslUserId");
