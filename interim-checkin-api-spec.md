# Interim check-ins (Annual & Termly) — API spec

This document describes the **JSON API** the CRM expects for **JFN interim school check-ins**: **annual** and **termly** submissions, each tied to a **Borrower** (school) and **Credit Application**.

It mirrors the product overview in `jfn_checkin_slide.html` / `public/prototypes/jfn_checkin_slide.html` and the CRM implementation under `src/app/check-ins/`.

**Survey version string (current frontend):** `jfn_checkin_slide_v1`

**Related:** [Impact Survey API spec](./impact-survey-api-spec.md) — same borrower/application context; different resource and payload.

---

## 1) UX / flow (CRM)

1. SSL opens **Dashboard → Interim check-ins** (`/check-ins`).
2. SSL selects **Borrower** (from `GET /jf/borrowers/by-ssl/:sslId`).
3. CRM loads **credit applications** for that borrower (`GET /jf/credit-applications/by-borrower/:borrowerId`).
4. SSL selects **Credit Application**.
5. SSL chooses **Annual check-in** or **Term check-in**.
   - If **termly**, SSL selects **Term 1, 2, or 3** (Kenyan school terms).
6. SSL completes the wizard; **each “Next →” persists** progress (`POST` first, then `PATCH`).
7. Optional: CRM may **reload** partial data via list/get endpoints if implemented.

Authentication: SSL session via existing cookie/session semantics (same as other `/jf/*` endpoints).

---

## 2) Endpoints (recommended)

Proxied in Next.js under `/api/jf/interim-checkin*` → `${NEXT_PUBLIC_API_BASE_URL}/jf/interim-checkin*` (cookies forwarded).

### 2.1 List check-ins for a credit application

**GET** `/jf/interim-checkin/by-application/:creditApplicationId`

- **Purpose:** list interim check-ins for one loan application (history; resume draft).
- **Query (optional):** `checkInKind=annual|termly`, `termNumber=1|2|3` — if the backend supports filtering.
- **Response (example envelope):**

```json
{
  "response": { "code": 200, "message": "OK" },
  "data": [
    {
      "id": "uuid-or-string",
      "borrowerId": "…",
      "creditApplicationId": "…",
      "submittedBySslUserId": "…",
      "checkInKind": "annual",
      "termNumber": null,
      "surveyVersion": "jfn_checkin_slide_v1",
      "updatedAt": "2026-05-01T12:00:00.000Z",
      "createdAt": "2026-05-01T11:50:00.000Z"
    }
  ]
}
```

Frontend tolerates **`data`** as a bare array **or** wrapped under `.data.results` / `.data.items` for ID extraction fallback.

---

### 2.2 Optional: list by borrower

**GET** `/jf/interim-checkin/by-borrower/:borrowerId`

Same idea as §2.1, scoped by borrower instead of credit application.

---

### 2.3 Get one check-in by id

**GET** `/jf/interim-checkin/:interimCheckInId`

- **Purpose:** hydrate form for edits; return full **`responses`** JSON.
- **Response:** envelope + **`data`** object including **`responses`**:

```json
{
  "data": {
    "id": "…",
    "borrowerId": "…",
    "creditApplicationId": "…",
    "submittedBySslUserId": "…",
    "checkInKind": "annual",
    "termNumber": null,
    "surveyVersion": "jfn_checkin_slide_v1",
    "responses": { }
  }
}
```

---

### 2.4 Create interim check-in

**POST** `/jf/interim-checkin`

**Headers:** `Content-Type: application/json`

**Body (minimum):**

| Field | Type | Notes |
|--------|------|--------|
| `borrowerId` | string | School/borrower id (typically `sheetId`) |
| `creditApplicationId` | string | Must belong to borrower |
| `submittedBySslUserId` | string | SSL user submitting |
| `surveyVersion` | string | Use `jfn_checkin_slide_v1` unless you version Bump |
| `checkInKind` | `"annual"` \| `"termly"` | |
| `termNumber` | `1` \| `2` \| `3` \| `null` | **Required** when `checkInKind === "termly"`; otherwise `null` |
| `responses` | object | See §§4–5 |

**Response:**

- **`201`** or **`200`** with created entity and **`id`** (expose as `id`, or `impactSurveyId`-style fallbacks break clients): prefer **`id`** on `data`.

---

### 2.5 Partial update (autosave between steps)

**PATCH** `/jf/interim-checkin/:interimCheckInId`

- **Purpose:** incremental saves as user advances steps.
- **Body:** Typically `{ "responses": { … } }` — merge or replace **`responses`** per product rules.

**Recommendation:** **`PATCH`** accepts **deep merge** of `responses`, or replace whole `responses` object in one payload (CRM sends **full snapshots** each save today).

---

## 3) Data model (recommended storage fields)

Persist at least:

| Field | Description |
|--------|----------------|
| `id` | Primary key |
| `borrowerId` | Borrower identifier |
| `creditApplicationId` | Credit application id |
| `submittedBySslUserId` | SSL submitting user |
| `checkInKind` | `annual` \| `termly` |
| `termNumber` | `1`\|`2`\|`3` when termly; `NULL` when annual |
| `surveyVersion` | e.g. `jfn_checkin_slide_v1` |
| `responses` | JSON — structure in §§4–5 |
| `createdAt`, `updatedAt` | ISO 8601 |
| _(optional)_ `status` | e.g. `draft` \| `submitted` if you separate submit vs autosave |

**Uniqueness (business rule — choose one):**

- **Option A:** At most **one draft + one submitted** annual per borrower+credit app per rolling year window.
- **Option B:** At most **one** termly submission per **`creditApplicationId` + termNumber + school year**.
- Else allow multiple revisions with explicit versioning.

CRM does not enforce this; backend should.

---

## 4) `responses` schema — Annual (`checkInKind: "annual"`)

All keys below mirror the CRM **`annualToResponses()`** mapper. Omit keys that are unused; **null** is allowed for incomplete drafts.

### 4.1 Finances (F1–F3)

| Key | Format | Allowed / notes |
|-----|--------|------------------|
| `F1_loanPurposes` | `string[]` | Subset of: `New classrooms`, `Bus / transport`, `Extracurriculars`, `Other` |
| `F1_loanPurposeOther` | `string` | If `"Other"` in `F1_loanPurposes` |
| `F2_landOwnership` | string | `"Owned"` \| `"Rented"` \| `"Other"` |
| `F2_landOwnershipOther` | string | If `F2_landOwnership === "Other"` |
| `F3_buildingOwnership` | string | Same MCQ |
| `F3_buildingOwnershipOther` | string | If `F3_buildingOwnership === "Other"` |

### 4.2 Access (A1–A4)

| Key | Format |
|-----|--------|
| `A1_numberOfClassrooms` | number \| null |
| `A2_avgClassroomCapacity` | number \| null (students per classroom) |
| `A3_gradeLevelsOffered` | `string[]` | Subset of: `Playschool`, `Pre-Primary`, `Primary`, `Secondary` |
| `A4_pctStudentsOnSponsorship` | number \| null | 0–100 |

### 4.3 Facilities (Fac1–Fac3)

| Key | Format |
|-----|--------|
| `Fac1_classroomQualityLikert` | integer 1–5 \| null |
| `Fac2_washroomQualityLikert` | integer 1–5 \| null |
| `Fac3_improvementsThisYear` | `string[]` | Subset of: `Painting walls`, `New floor material`, `New desks`, `Washroom upgrade`, `Other` |
| `Fac3_improvementsOther` | string | If `Other` selected |

### 4.4 Learning & outcomes (L1–L5)

| Key | Format |
|-----|--------|
| `L1_teachersByGender` | `{ "male": number\|null, "female": number\|null }` |
| `L2_teacherRetentionPct` | number \| null | 0–100 |
| `L3_scoresByExam` | `{ "KCPE": ScoreBand, "KCSE": ScoreBand }` |
| `L4_studentsPerPathwayEndGrade9` | `{ "academicTrack": number\|null, "vocationalTrack": number\|null }` |
| `L5_newExtracurricularsOffered` | string \| omitted | Free text |

**`ScoreBand`:**

```json
{
  "belowPct": null,
  "atAvgPct": null,
  "abovePct": null
}
```

Each `%` dimension 0–100; validating `belowPct + atAvgPct + abovePct ≤ 100` (or `= 100` when complete) is recommended.

---

## 5) `responses` schema — Termly (`checkInKind: "termly"`)

`termNumber` on the **parent record** must be `1`, `2`, or `3`. The payload also repeats **`termNumber`** inside `responses` for convenience (CRM does).

### 5.1 Access — T1–T4

| Key | Format |
|-----|--------|
| `termNumber` | `1` \| `2` \| `3` |
| `T1_studentEnrollmentByLevel` | Per-level `{ male, female }` |

**Levels:** `playschool`, `preprimary`, `primary`, `secondary` (snake/lowercase keys; align with borrower profile elsewhere).

Example:

```json
{
  "termNumber": 1,
  "T1_studentEnrollmentByLevel": {
    "playschool": { "male": 12, "female": 14 },
    "preprimary": { "male": 20, "female": 18 },
    "primary": { "male": null, "female": null },
    "secondary": { "male": 30, "female": 28 }
  },
  "T2_transfersIn": 5,
  "T3_transfersOut": 2,
  "T4_studentAttendanceRatePct": 92
}
```

| Key | Format |
|-----|--------|
| `T2_transfersIn` | number \| null |
| `T3_transfersOut` | number \| null |
| `T4_studentAttendanceRatePct` | number \| null | 0–100 |

---

## 6) Validation examples (recommended)

1. **`borrowerId` / `creditApplicationId`:** Credit application MUST belong to borrower.
2. **SSL authorization:** Caller must match `submittedBySslUserId` or be constrained by borrower–SSL linkage (same rule as impact survey).
3. **Term consistency:** When `checkInKind === "termly"`, require `termNumber` ∈ {1,2,3} on both top-level and `responses.termNumber` if both present.
4. **Percent fields:** 0–100 where applicable (sponsorship %, retention %, attendance %, score bands).
5. **Likert:** 1–5 only.
6. **Optional:** For each exam row, flag if `belowPct + atAvgPct + abovePct` exceeds 100.

---

## 7) Errors (recommended)

Standard JSON envelope with `code`, `message`, optional `details`. Examples:

| HTTP | Scenario |
|------|----------|
| `400` | Missing `borrowerId`, mismatch `creditApplicationId`, invalid `checkInKind` / `termNumber` |
| `401` / `403` | Not authenticated or not authorized for borrower |
| `404` | `interimCheckInId` not found |
| `409` | Uniqueness rule violated (duplicate annual/term submission) |

CRM may retry **`POST`** with **`PATCH`** after resolving duplicate via list-by-application.

---

## 8) Changelog — frontend contract

| Version | Notes |
|---------|--------|
| `jfn_checkin_slide_v1` | Initial CRM React form mapping (`annualToResponses`, `termToResponses`) |

When you change question codes or enums, bump **`surveyVersion`** and optionally migrate stored `responses`.
