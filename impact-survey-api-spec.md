# Impact Survey (School) — API Spec & Expected Fields

This document describes **how to tie an impact survey submission to both**:

- **Borrower ID** (school) and
- **Credit Application ID** (loan application for that borrower),

and proposes the **endpoints and payload schema** the backend should expose.

It is based on:
- Existing CRM frontend patterns (`/jf/borrowers/by-ssl/:sslUserId`, `/jf/credit-applications/by-borrower/:borrowerId`)
- The current HTML prototype: `JFN_Impact_Survey_v04162026.html` (sections S1–S6).

---

## 1) UX / Flow (what the frontend will do)

1. SSL opens **Dashboard → Impact Survey**
2. SSL selects **Borrower (school)** from their borrower list (by SSL ID)
3. App fetches and displays **Credit Applications** for that borrower
4. SSL selects **Credit Application**
5. SSL fills the survey and submits
6. Submission is saved as a new survey record tied to both IDs

---

## 2) Required endpoints

### 2.1 Borrowers for current SSL

**GET** `/jf/borrowers/by-ssl/:sslUserId`

- **Purpose**: list schools that belong to (or are assigned to) the logged-in SSL.
- **Response (example shape)**:

```json
{
  "success": true,
  "data": [
    {
      "sheetId": "12345",
      "Name": "St Ann Primary",
      "Primary Phone for Borrower": "0700..."
    }
  ]
}
```

Notes:
- The frontend will treat borrower identifier as `sheetId` (preferred) falling back to `dbId` if present.

### 2.2 Credit applications for a borrower

**GET** `/jf/credit-applications/by-borrower/:borrowerId`

- **Purpose**: show applications the SSL can attach the survey to.
- **Response**: list of credit applications (already used in borrowers UI).

### 2.3 (Recommended) Fetch existing surveys for a credit application or borrower

Option A:

**GET** `/jf/impact-survey/by-application/:creditApplicationId`

Option B:

**GET** `/jf/impact-survey/by-borrower/:borrowerId`

- **Purpose**:
  - Prevent duplicate submissions or allow multiple submissions (versioned) depending on business rules.
  - Display history if required.

### 2.4 Create a new impact survey (JSON)

**POST** `/jf/impact-survey`

**Request body** (JSON):
- Must include **Borrower ID** and **Credit Application ID** (as separate fields).
- Must include `submittedBySslUserId` (from auth context or explicit).
- Contains the survey responses structured by section (S1–S6).

Example:

```json
{
  "borrowerId": "12345",
  "creditApplicationId": "CA-0001",
  "submittedBySslUserId": "42",
  "surveyVersion": "JFN_Impact_Survey_v04162026",
  "responses": { "...": "..." }
}
```

**Response**:
- Return the created record, including `id`, timestamps, and normalized fields.

### 2.5 Update an existing impact survey (optional)

**PATCH** `/jf/impact-survey/:impactSurveyId`

- **Purpose**: allow corrections after submission (if permitted).
- **Body**: same schema as create, but partial updates allowed.

---

## 3) Data model (recommended)

### 3.1 ImpactSurvey record (storage)

Minimum fields the backend should store:

- **id**: string/uuid
- **borrowerId**: string (Borrower / School ID)
- **creditApplicationId**: string
- **submittedBySslUserId**: string
- **submittedAt**: ISO timestamp
- **surveyVersion**: string (e.g. `JFN_Impact_Survey_v04162026`)
- **responses**: JSON (full structured form responses)
- **derived / indexed fields** (optional but recommended):
  - `schoolType`, `areaType`, `isRepeatBorrower`
  - `totalStudentsMale`, `totalStudentsFemale`, `totalStudentsWithDisability`, `totalStudents`
  - `totalStaffMale`, `totalStaffFemale`, `totalStaff`

This hybrid approach lets you keep the full raw response for auditability while also indexing key fields for reporting.

---

## 4) Expected request payload fields (by section)

The HTML prototype uses question codes like **S1.1**, **S2.1**, etc. The backend should accept a structured payload that matches these questions, and the frontend should submit values as normalized enums/numbers/strings.

### 4.1 Section S1 — School profile

- **S1.1 `schoolType`**: `"APBET"` | `"Private"`
- **S1.2 `areaType`**: `"Urban"` | `"Peri-urban"` | `"Rural"`
- **S1.3 `isRepeatBorrower`**: boolean
- **S1.4 `schoolNotes`**: string (optional)

### 4.2 Section S2 — Student & staff demographics

#### S2.1 Student enrollment

For each level: `playschool`, `prePrimary`, `primary`, `secondary`:

- `male`: number (>=0)
- `female`: number (>=0)
- `withDisability`: number (>=0, must be <= male+female)

Recommended JSON:

```json
{
  "students": {
    "playschool": { "male": 0, "female": 0, "withDisability": 0 },
    "prePrimary": { "male": 0, "female": 0, "withDisability": 0 },
    "primary": { "male": 0, "female": 0, "withDisability": 0 },
    "secondary": { "male": 0, "female": 0, "withDisability": 0 }
  }
}
```

#### S2.2 Teaching & admin staff

Roles:
- `certifiedTeachers`
- `uncertifiedTeachers`
- `adminStaff`

For each role:
- `levelsTaught`: array of `"Playschool" | "Pre-Primary" | "Primary" | "Secondary"`
- `male`: number
- `female`: number

#### S2.3 Expected enrollment impact

- `projectedNewStudentsThisLoan`: number
- If repeat borrower: `actualAddedPreviousLoan`: number (optional)

### 4.3 Section S3 — Facilities

#### S3.1 Classroom count

```json
{
  "classrooms": {
    "thisYear": 0,
    "lastYear": 0,
    "twoYearsAgo": 0
  }
}
```

#### S3.2 Facility elements present

Booleans + conditional details:
- `scienceLab`: boolean
- `library`: boolean, `libraryBookCount` (number)
- `computerLab`: boolean, `computerLabWorkingComputers` (number)
- `assemblyHall`: boolean
- `sportsFields`: boolean, `sportsFieldAccessType`: `"School-owned" | "Shared/rented"`
- `kitchen`: boolean, `kitchenFuel`: `"Charcoal" | "Firewood" | "Gas" | "Electric"`
- `other`: boolean, `otherDescription`: string

#### S3.3 School building

- `walls`: array of `"Concrete" | "Cinderblock" | "Brick" | "Mabati" | "Wood"`
- `floors`: array of `"Concrete" | "Tile" | "Dirt"`
- `stories`: `"Single" | "Multi-story"`
- `paint`: `"Fully painted" | "Partially painted" | "Not painted"`
- `buildingConditionScore`: 1 | 2 | 3 | 4 | 5

#### S3.4 Water & sanitation

- `runningWater`: boolean
  - if true: `runningWaterSources`: array of `"Supplied by County" | "Well/Borehole" | "Tap"`
- `purifiedDrinkingWater`: boolean
  - if true: `drinkingWaterTreatmentMethods`: array of `"Purified at source" | "Chlorinated" | "Water Guard added"`
- `connectedToSewer`: boolean

#### S3.5 Washroom facilities

- `toiletsGirls`: number
- `toiletsBoys`: number
- `toiletsShared`: number
- `washroomConditionScore`: 1..5

#### S3.6 Electricity

- `hasElectricity`: boolean
  - if true: `electricitySources`: array of `"National grid" | "Solar" | "Generator" | "Other"`
  - if sources includes `Other`: `electricitySourceOtherDescription`: string

#### S3.7 Meals

- `providesMeals`: boolean
  - if true: `mealsOffered`: array of `"Breakfast" | "Lunch" | "Dinner"`

### 4.4 Section S4 — Academic performance & enrichment

#### S4.1 Transition rates

- `transitionPrimaryToSecondaryPct`: number (0..100)
- `transitionSecondaryToTertiaryPct`: number (0..100)

#### S4.2 Standardized test results

For each exam (`KCPE`, `KPSEA`, `KCSE`, `Other`):
- `passedPct`: number (0..100, optional)
- `aboveAveragePct`: number (0..100, optional)

#### S4.3 Textbook availability

- `hasTextbooks`: boolean
  - if true: `avgStudentsPerTextbook`: number (>=1)

#### S4.4 Attendance recording

- `attendanceFrequency`: `"Daily" | "Periodic" | "Not recorded"`
- if not “Not recorded”: `attendanceRecordingMethod`: `"Digital" | "Paper"`

#### S4.5 Test score storage

- `testScoreStorage`: `"Paper records" | "Spreadsheet" | "School management system" | "Not recorded"`

#### S4.6 Extra-curricular programmes

- `hasExtracurricularProgrammes`: boolean
  - if true: `extracurricularProgrammes`: string[] (from list + optional other)
  - if includes `"Other"`: `extracurricularOtherDescription`: string

### 4.5 Section S5 — Staff, technology & teacher evaluation

- **S5.1 `teacherReturnRatePct`**: number (0..100)

#### S5.2 Digital tools usage

- `usesDigitalToolsForManagement`: boolean
  - if true: `staffTechAccess` with counts:
    - `smartphonesCount`
    - `personalOrWorkComputersCount`
    - `schoolComputersForTeachersCount`

#### S5.3 Teacher monitoring

- `conductsTeacherMonitoring`: boolean
  - if true:
    - `monitoringFormFilledOut`: boolean
    - `monitoringVisitsPerTeacherPerYear`: number

#### S5.4 Teacher evaluation

- `evaluatesTeacherPerformance`: boolean
  - if true:
    - `evaluationsPerTeacherPerYear`: number
    - `evaluationInformationUsed`: array of:
      - `"Meetings with teachers"`
      - `"Classroom observations"`
      - `"Pupil grades or test scores"`
      - `"Pupil feedback"`
      - `"Parent feedback"`
      - `"Peer feedback"`

#### S5.5 Monetary rewards

- `teachersReceiveMonetaryRewards`: boolean

### 4.6 Section S6 — Child safeguarding

- `hasSafeguardingPolicy`: boolean
- `safeguardingPractices`: array of:
  - `"Teacher safety training"`
  - `"Child's rights protection"`
  - `"Zero tolerance for bullying"`
  - `"No corporal punishment"`
  - `"Other"`
- if includes `"Other"`: `safeguardingOtherDescription`: string

---

## 5) Validation & business rules (backend)

Recommended backend validations:
- `borrowerId` and `creditApplicationId` must exist and be related (application belongs to borrower).
- Requester must be an authenticated SSL user (or appropriate role).
- `students.*.withDisability <= students.*.male + students.*.female`
- Percent fields in 0..100
- Likert scores in 1..5
- When a conditional section is disabled (e.g., `runningWater=false`), ignore conditional fields or store as null/empty.

---

## 6) Implementation notes

### Frontend now
- The page `/impact-survey` already implements: **select Borrower → select Credit Application → open the prototype**.

### Backend next
- Add endpoints in section 2.3–2.5.

### Frontend next (after backend)
- Replace iframe prototype with a native React form and POST the JSON payload described above.


