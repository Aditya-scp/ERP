# Product Requirements Document (PRD): ERP Multi-Tenant SaaS Platform

## 1. Executive Summary & Architectural Invariants

### 1.1 Product Mission
ERP is a multi-tenant school management software-as-a-service (SaaS) platform engineered to serve thousands of independent educational institutions from a single unified codebase and database. It provides comprehensive administrative, academic, financial, communication, and learning tools across modern Web (Next.js App Router, Tailwind CSS, shadcn/ui, TanStack Table) and Mobile (Expo, Expo Router, NativeWind) environments.

### 1.2 Core Architectural Invariants (Binding)
1. **Multi-Tenancy & Isolation**: Tenancy is strictly isolated at the database level via PostgreSQL Row Level Security (RLS). Every tenant table, including junction and child tables, contains a mandatory, non-nullable, indexed foreign key `school_id` referencing `schools(id)`.
2. **Security Claims via JWT**: User identity, tenant scope (`school_id`), and role assignments (`role`) are derived exclusively from cryptographically signed Supabase Auth JWT custom claims emitted by database Auth Hooks. Client-provided tenant or role parameters are never trusted.
3. **Enrollment-Centric Academic Life**: Students are physical people tracked in `students`. Academic participation is modeled via `student_enrollments`, which links a student to an `academic_session_id`, `class_id`, `section_id`, and `roll_number`. All operational, evaluative, and financial child records—including **attendance** (`student_attendances`), **exam marks** (`exam_marks`), **fee vouchers** (`fee_vouchers`), and **fee ledger entries** (`fee_ledger_entries`)—reference `enrollment_id` (foreign key to `student_enrollments(id)`). This guarantees complete historical data integrity across academic years and student promotions.
4. **Append-Only Immutable Fee Ledger**: Financial integrity is maintained via `fee_ledger_entries`. Mutable balances on student or voucher tables are strictly prohibited. Balances are computed in real time via signed ledger aggregation. Corrections, fee cancellations, waivers, and reversals are written as new compensating entries with explicit `reverses_entry_id` references.
5. **Session Rollover & Arrears**: When an academic session concludes, unpaid fee balances are rolled into the student's new enrollment record as a single `opening_balance` ledger entry. Prior session ledger entries remain untouched and permanently immutable.
6. **Financial Precision**: All monetary values are represented as unsigned or signed `bigint` minor units (e.g., cents, paise, pence) paired with an ISO-4217 three-letter currency code (`currency`). Floating-point arithmetic is forbidden. Rounding follows the half-up method to 2 decimal places, applied individually to each line item before summation.
7. **Payment & External Service Adapters**: Online payment processing, SMS dispatch, WhatsApp messaging, and email delivery are decoupled behind abstract provider interfaces (`PaymentGatewayAdapter`, `SmsAdapter`, `WhatsAppAdapter`, `EmailAdapter`), allowing independent configuration per tenant.
8. **Job Queue & Scheduling**: Asynchronous bulk operations (fee voucher generation, exam rank tabulations, mass notifications, report exports) utilize an internal `job_queue` table executed via `pg_cron` triggers and Supabase Edge Functions with row locking and exponential backoff.
9. **Gapless Document Sequences**: Fee vouchers, payment receipts, and formal school certificates utilize dedicated sequence counter tables (`document_sequences`) with row-level locks (`SELECT ... FOR UPDATE`) to guarantee strictly monotonic, gapless numbering.
10. **Data Auditability & Soft Deletion**: Standard audit columns (`created_at`, `updated_at`, `created_by`, `updated_by`) are enforced across all tables. Tables representing core academic, student, and financial records implement soft deletion via `deleted_at timestamptz`.

---

## 2. Global Definitions, Roles, and Hierarchy

### 2.1 Role Definitions
- **`super_admin`**: Platform owner / SaaS operator. Manages school tenants, subscription packages, module licensing, system health, and audited school impersonation sessions.
- **`school_admin`**: Institutional leader, principal, or designated administrator. Holds full operational authority within their assigned `school_id`, configuring academic sessions, classes, fee structures, grading schemes, and staff assignments.
- **`accountant`**: Financial operator within a school. Generates monthly fee vouchers, collects fees, issues payment receipts, manages daily expense vouchers, records bank deposits, and executes daily cash closing. Restriced from viewing academic marks or confidential student medical notes.
- **`teacher`**: Academic instructor. Marks daily/period student attendance, enters exam and test marks, creates homework assignments, records student diary entries, and views class schedules. Scoped strictly to assigned classes and subjects.
- **`student`**: Enrolled learner. Views personal attendance, class timetable, examination date sheets, report cards, homework tasks, fee challans/receipts, and school circulars. Scoped strictly to their own enrollment record.
- **`parent`**: Guardian of one or more enrolled students. Accesses a unified portal with a multi-child switchboard to monitor attendance, fee dues, payment history, report cards, and communicate with teachers.

---

## 3. Quantitative Business Rules & Worked Numerical Examples

To prevent implementation ambiguity, all quantitative calculations are formalized below with exact mathematical formulas and real-number worked examples.

### 3.1 Late Fine Calculation
Late fees are charged when a fee voucher remains unpaid after its specified `due_date`. Two calculation modes are supported: `fixed_amount` and `per_day`. Both support an optional `grace_period_days` and `max_fine_minor_units`. Compounding interest is strictly prohibited.

#### Formulas:
$$\text{Days Overdue} = \max(0, \text{Payment Date} - \text{Due Date})$$
$$\text{Chargeable Days} = \begin{cases} 0 & \text{if } \text{Days Overdue} \le \text{Grace Period Days} \\ \text{Days Overdue} & \text{if } \text{Days Overdue} > \text{Grace Period Days} \end{cases}$$

- **Mode 1 (`fixed_amount`)**:
  $$\text{Fine} = \begin{cases} 0 & \text{if } \text{Chargeable Days} = 0 \\ \text{Fixed Fine Amount} & \text{if } \text{Chargeable Days} > 0 \end{cases}$$
- **Mode 2 (`per_day`)**:
  $$\text{Raw Fine} = \text{Chargeable Days} \times \text{Daily Fine Rate}$$
  $$\text{Fine} = \begin{cases} \text{Raw Fine} & \text{if Max Fine Cap is NULL} \\ \min(\text{Raw Fine}, \text{Max Fine Cap}) & \text{if Max Fine Cap is set} \end{cases}$$

#### Worked Example:
- **Parameters**:
  - Currency: USD (minor units = cents, $1.00 = 100 cents).
  - Due Date: October 10, 2026.
  - Grace Period: 5 days (Grace cutoff = October 15, 2026 at 23:59:59 UTC).
  - Mode: `per_day`.
  - Daily Rate: 150 cents (\$1.50/day).
  - Max Fine Cap: 1,500 cents (\$15.00).
- **Case 1 (Paid on October 14, 2026)**:
  - Days Overdue = 4. Since $4 \le 5$, Chargeable Days = 0. Fine = **0 cents (\$0.00)**.
- **Case 2 (Paid on October 18, 2026)**:
  - Days Overdue = 8. Since $8 > 5$, Chargeable Days = 8.
  - Raw Fine = $8 \times 150 = 1,200\text{ cents (\$12.00)}$.
  - Cap Evaluation: $\min(1200, 1500) = \mathbf{1,200\text{ cents (\$12.00)}}$.
- **Case 3 (Paid on November 05, 2026)**:
  - Days Overdue = 26. Chargeable Days = 26.
  - Raw Fine = $26 \times 150 = 3,900\text{ cents (\$39.00)}$.
  - Cap Evaluation: $\min(3900, 1500) = \mathbf{1,500\text{ cents (\$15.00)}}$.

---

### 3.2 Discounts & Sibling Policy
Discounts reduce fee liabilities and can be configured as a fixed minor unit amount or a percentage. Sibling discounts are governed by parental linking via `guardian_id`.

#### Rules:
1. Sibling discounts apply strictly to children associated with the identical `guardian_id`.
2. Children are sorted by `date_of_birth` ascending (oldest child first).
3. The eldest child (Child #1) pays full standard fees (0% discount).
4. Configurable discount tiers apply to subsequent children (Child #2, Child #3, etc.).
5. By default, sibling discounts apply **exclusively to Tuition Fee heads**, leaving one-time charges, lab, sports, and transport heads undiscounted, unless explicitly overridden in school settings.
6. Line-item percentage discounts are calculated using half-up rounding to the nearest minor unit:
   $$\text{Discount Amount} = \text{round}\left(\text{Head Amount} \times \frac{\text{Discount Percentage}}{100}\right)$$

#### Worked Example:
- **Family Setup**: Guardian G-402 has three enrolled children:
  - Child 1 (Born 2014-04-10, Grade 6): Eldest $\to$ Tier 1 (0% discount).
  - Child 2 (Born 2016-09-15, Grade 4): Second child $\to$ Tier 2 (20% tuition discount).
  - Child 3 (Born 2019-02-01, Grade 1): Third child $\to$ Tier 3 (50% tuition discount).
- **Fee Particulars for the Month**:
  - Grade 6: Tuition = 12,000 cents (\$120.00), Science Lab = 1,500 cents (\$15.00).
  - Grade 4: Tuition = 10,000 cents (\$100.00), Computer Lab = 1,000 cents (\$10.00).
  - Grade 1: Tuition = 8,000 cents (\$80.00), Art Supplies = 800 cents (\$8.00).
- **Calculations**:
  - Child 1: Tuition = 12,000 cents, Lab = 1,500 cents. Total = **13,500 cents (\$135.00)**.
  - Child 2:
    - Tuition Discount = $\text{round}(10000 \times 0.20) = 2,000\text{ cents}$.
    - Net Tuition = $10000 - 2000 = 8,000\text{ cents}$.
    - Computer Lab = 1,000 cents (no discount).
    - Total = $8000 + 1000 = \mathbf{9,000\text{ cents (\$90.00)}}$.
  - Child 3:
    - Tuition Discount = $\text{round}(8000 \times 0.50) = 4,000\text{ cents}$.
    - Net Tuition = $8000 - 4000 = 4,000\text{ cents}$.
    - Art Supplies = 800 cents (no discount).
    - Total = $4000 + 800 = \mathbf{4,800\text{ cents (\$48.00)}}$.
- **Consolidated Family Payable**: $13500 + 9000 + 4800 = \mathbf{27,300\text{ cents (\$273.00)}}$.

---

### 3.3 Session Rollover & Arrears Carry-Forward
Financial records maintain absolute referential integrity across academic years. When student enrollment transitions from Session $N$ to Session $N+1$, unpaid balances in Session $N$ are consolidated and rolled over.

#### Rules:
1. All ledger entries for Session $N$ remain tied to `enrollment_id_old`.
2. When the school admin executes Session Close / Rollover, the system calculates the net outstanding balance for `enrollment_id_old`:
   $$\text{Arrears Balance} = \sum (\text{Debits}) - \sum (\text{Credits})$$
3. If $\text{Arrears Balance} > 0$, the system generates an entry in `fee_ledger_entries` tied to the new enrollment `enrollment_id_new`:
   - `entry_type`: `'opening_balance'`
   - `amount`: $+\text{Arrears Balance}$
   - `reverses_entry_id`: `NULL`
   - `description`: `'Arrears carried forward from Academic Session 2025-2026'`
4. The historical ledger of Session $N$ is locked from further mutations.

#### Worked Example:
- **Session 2025-2026 Enrollment (E-101)**:
  - May 2026 Tuition Charge: $+10,000\text{ cents}$.
  - May 2026 Late Fine Charge: $+1,000\text{ cents}$.
  - Partial Payment Received: $-6,000\text{ cents}$.
  - June 2026 Tuition Charge: $+10,000\text{ cents}$.
  - Net Outstanding Balance at Session End = $(10000 + 1000 + 10000) - 6000 = \mathbf{15,000\text{ cents (\$150.00)}}$.
- **Rollover to Session 2026-2027 Enrollment (E-202)**:
  - System inserts single row into `fee_ledger_entries`:
    - `id`: `uuid_generate_v4()`
    - `enrollment_id`: `E-202`
    - `entry_type`: `'opening_balance'`
    - `amount`: `15000`
    - `currency`: `'USD'`
  - First voucher of new session displays:
    - Opening Arrears: \$150.00
    - July 2026 Tuition: \$110.00 (11,000 cents)
    - Total Due: **\$260.00 (26,000 cents)**.

---

### 3.4 Payment Allocation (Waterfall / FIFO Liquidation)
When a student or parent makes a partial payment against a voucher or outstanding account, funds are liquidated through a deterministic FIFO (First-In, First-Out) priority waterfall.

#### Allocation Waterfall Priority:
1. **Priority 1: Historical Arrears / Opening Balance** (Oldest debt cleared first).
2. **Priority 2: Late Fines** (Penalties cleared before core services).
3. **Priority 3: Mandatory Academic Tuition Fees**.
4. **Priority 4: Auxiliary Service Heads** (Science/Computer Lab, Library, Examination).
5. **Priority 5: Optional Facilities** (Transport, Hostel, Extracurricular Clubs).

#### Worked Example:
- **Current Voucher Dues Breakdown**:
  - Arrears from Prior Month: 8,000 cents (\$80.00)
  - Late Fine Accrued: 1,500 cents (\$15.00)
  - Current Month Tuition Fee: 12,000 cents (\$120.00)
  - Computer Lab Fee: 2,000 cents (\$20.00)
  - Bus Transport Fee: 4,000 cents (\$40.00)
  - **Total Voucher Amount Due**: **27,500 cents (\$275.00)**.
- **Payment Event**: Parent pays **15,000 cents (\$150.00)** in cash.
- **Waterfall Step-by-Step Execution**:
  1. *Arrears*: 8,000 cents required. Available = 15,000 cents.
     - Allocated: **8,000 cents**. Remaining Payment = $15000 - 8000 = 7,000\text{ cents}$. Arrears Balance = **0 cents**.
  2. *Late Fine*: 1,500 cents required. Available = 7,000 cents.
     - Allocated: **1,500 cents**. Remaining Payment = $7000 - 1500 = 5,500\text{ cents}$. Late Fine Balance = **0 cents**.
  3. *Tuition Fee*: 12,000 cents required. Available = 5,500 cents.
     - Allocated: **5,500 cents**. Remaining Payment = $5500 - 5500 = 0\text{ cents}$. Tuition Balance = $12000 - 5500 = \mathbf{6,500\text{ cents (\$65.00)}}$.
  4. *Computer Lab Fee*: 2,000 cents required. Available = 0 cents.
     - Allocated: **0 cents**. Lab Balance = **2,000 cents (\$20.00)**.
  5. *Bus Transport Fee*: 4,000 cents required. Available = 0 cents.
     - Allocated: **0 cents**. Transport Balance = **4,000 cents (\$40.00)**.
- **Post-Payment Summary**:
  - Paid Amount: 15,000 cents (\$150.00).
  - Remaining Unpaid Voucher Balance: $6500 + 2000 + 4000 = \mathbf{12,500\text{ cents (\$125.00)}}$.

---

### 3.5 Grading Scales and GPA Formulation
Academic performance is tracked as marks of type `numeric(6,2)` along with an evaluation status (`present`, `absent`, `exempt`, `unfair_means`). Aggregate percentages and Grade Point Averages (GPA) use credit-weighted formulas.

#### Grading Table Specification:
| Percentage Range | Letter Grade | Grade Point | Status | Description |
| :--- | :---: | :---: | :---: | :--- |
| $90.00\% - 100.00\%$ | A+ | 4.00 | PASS | Outstanding |
| $80.00\% - 89.99\%$ | A | 3.75 | PASS | Excellent |
| $70.00\% - 79.99\%$ | B | 3.00 | PASS | Very Good |
| $60.00\% - 69.99\%$ | C | 2.00 | PASS | Good |
| $50.00\% - 59.99\%$ | D | 1.00 | PASS | Satisfactory / Pass |
| $0.00\% - 49.99\%$ | F | 0.00 | FAIL | Unsatisfactory |

#### Formula:
$$\text{Subject Percentage} = \text{round}\left(\frac{\text{Marks Obtained}}{\text{Maximum Marks}} \times 100, 2\right)$$
$$\text{Cumulative GPA} = \text{round}\left(\frac{\sum (\text{Subject Grade Point} \times \text{Credit Hours})}{\sum \text{Credit Hours}}, 2\right)$$

#### Worked Example:
- **Student Performance in Term 1**:
  1. *Mathematics* (Credit Hours = 4.0, Max = 100):
     - Marks Obtained = 88.50 $\to$ 88.50% $\to$ Grade A, Grade Point = 3.75.
     - Weighted Points = $4.0 \times 3.75 = 15.00$.
  2. *Physics* (Credit Hours = 4.0, Max = 100):
     - Marks Obtained = 72.00 $\to$ 72.00% $\to$ Grade B, Grade Point = 3.00.
     - Weighted Points = $4.0 \times 3.00 = 12.00$.
  3. *English Literature* (Credit Hours = 3.0, Max = 100):
     - Marks Obtained = 64.00 $\to$ 64.00% $\to$ Grade C, Grade Point = 2.00.
     - Weighted Points = $3.0 \times 2.00 = 6.00$.
  4. *World History* (Credit Hours = 2.0, Max = 100):
     - Marks Obtained = 93.00 $\to$ 93.00% $\to$ Grade A+, Grade Point = 4.00.
     - Weighted Points = $2.0 \times 4.00 = 8.00$.
- **Aggregations**:
  - Total Credits = $4.0 + 4.0 + 3.0 + 2.0 = 13.0$.
  - Total Weighted Points = $15.00 + 12.00 + 6.00 + 8.00 = 41.00$.
  - Total Marks Obtained = $88.50 + 72.00 + 64.00 + 93.00 = 317.50 / 400.00$ (79.38%).
  - Term GPA = $\text{round}\left(\frac{41.00}{13.0}, 2\right) = \text{round}(3.1538, 2) = \mathbf{3.15}$.

---

### 3.6 Class Ranking and Tie-Breaking Logic
School class ranking employs **Standard Competition Ranking** (`1, 2, 2, 4` - "1224" ranking) as the default institutional setting (with configurable option for Dense Ranking `1, 2, 2, 3`).

#### Deterministic 5-Stage Tie-Breaker Sequence:
When two or more students achieve identical total obtained marks in an exam term, ties are resolved sequentially:
1. **Stage 1**: Highest Total Marks Obtained across all subjects in the exam term.
2. **Stage 2**: Highest Total Marks in designated **Core Subjects** (configured per class, e.g., Mathematics first, then English).
3. **Stage 3**: Highest overall attendance percentage during the academic term.
4. **Stage 4**: Student Age ascending (older student by date of birth gets seniority rank).
5. **Stage 5**: Admission Number ascending (lexicographical/numerical order as absolute deterministic final tie-breaker).

#### Worked Example:
Consider 5 students in Grade 10-A (Core Subject: Mathematics):
- **Student A**: Total Marks = 475/500, Math = 98.
- **Student B**: Total Marks = 460/500, Math = 94, Attendance = 96.5%, DOB = 2010-03-12.
- **Student C**: Total Marks = 460/500, Math = 94, Attendance = 96.5%, DOB = 2010-07-25.
- **Student D**: Total Marks = 460/500, Math = 90, Attendance = 98.0%, DOB = 2010-01-10.
- **Student E**: Total Marks = 430/500.

#### Resolution:
- Student A: Rank **1** (Highest marks = 475).
- Evaluating B, C, D (All tied at 460 total marks):
  - Check Core Subject (Math): B has 94, C has 94, D has 90.
  - D is eliminated from top tie and falls behind B and C.
  - Comparing B and C: Both have Math = 94. Both have Attendance = 96.5%.
  - Check Stage 4 (DOB): Student B (born March 12, 2010) is older than Student C (born July 25, 2010).
  - Under Standard Competition Ranking (`1, 2, 2, 4`), if B and C were completely tied they would both share Rank 2 and the next would be Rank 4. However, the tie-breaker cleanly separates them:
    - Student B achieves Rank **2**.
    - Student C achieves Rank **3**.
    - Student D achieves Rank **4**.
- Student E: Rank **5**.

---

### 3.7 Student Promotion Evaluation Rules
At the conclusion of an academic session, students are evaluated for advancement to the next grade based on institutional criteria configured in `academic_setup`.

#### Standard Criteria:
1. **Pass Condition**: Must achieve Grade D or higher ($\ge 50.00\%$) in at least 5 out of 6 subjects.
2. **Mandatory Subjects**: Must pass Mathematics and English regardless of overall count.
3. **Aggregate Minimum**: Cumulative percentage across all subjects must be $\ge 50.00\%$.
4. **Attendance Threshold**: Term attendance must be $\ge 75.00\%$.

#### Status Transitions:
- `promoted`: Meets all criteria. Enrolled into Class $N+1$, Section assigned, status = `enrolled`.
- `promoted_on_trial`: Failed exactly 1 non-mandatory subject, but aggregate $\ge 55.00\%$ and attendance $\ge 80.00\%$. Advanced to Class $N+1$ with probation flag.
- `retained`: Failed 2 or more subjects OR failed a mandatory subject OR aggregate $< 50.00\%$. Retained in Class $N$ for next session.

#### Worked Examples:
- **Student 1**: Passes 6/6 subjects. Aggregate = 68.4%. Attendance = 92%. Result: **`promoted` to Grade 8**.
- **Student 2**: Fails History (42%), passes remaining 5 subjects (including Math & English). Aggregate = 56.2%. Attendance = 84%. Result: **`promoted_on_trial` to Grade 8**.
- **Student 3**: Fails Mathematics (44%), passes remaining 5 subjects. Aggregate = 58.0%. Attendance = 88%. Result: **`retained` in Grade 7** (Mandatory subject failure).
- **Student 4**: Fails Science (38%) and Art (40%). Aggregate = 48.5%. Attendance = 71%. Result: **`retained` in Grade 7**.

---

### 3.8 Half-Up Rounding & Line-Item Minor Unit Standard
To eliminate accumulation drift across multi-item vouchers, rounding is performed **per line item** using standard half-up rounding.

#### Rule:
$$\text{Minor Units} = \text{floor}\left(\text{Calculated Float} + 0.5\right)$$
Each line item is rounded to integer minor units prior to summation.

#### Worked Example:
A student invoice has three percentage-calculated fee heads:
1. Tuition: Base = 12,555 cents (\$125.55). Discount = 15%.
   - Discount Float = $12555 \times 0.15 = 1883.25\text{ cents}$.
   - Rounded Discount = $\text{floor}(1883.25 + 0.5) = 1,883\text{ cents (\$18.83)}$.
   - Net Tuition = $12555 - 1883 = \mathbf{10,672\text{ cents (\$106.72)}}$.
2. Laboratory Consumables: Base = 3,333 cents (\$33.33). Subsidy = 7.5%.
   - Subsidy Float = $3333 \times 0.075 = 249.975\text{ cents}$.
   - Rounded Subsidy = $\text{floor}(249.975 + 0.5) = 250\text{ cents (\$2.50)}$.
   - Net Lab = $3333 - 250 = \mathbf{3,083\text{ cents (\$30.83)}}$.
3. Municipal Educational Cess: Tax = 3.5% on gross tuition (12,555 cents).
   - Tax Float = $12555 \times 0.035 = 439.425\text{ cents}$.
   - Rounded Tax = $\text{floor}(439.425 + 0.5) = \mathbf{439\text{ cents (\$4.39)}}$.
- **Sum of Line Items**:
  $$\text{Total Invoice Payable} = 10672 + 3083 + 439 = \mathbf{14,194\text{ cents (\$141.94)}}$$
*(Direct non-rounded sum would produce $12555 - 1883.25 + 3333 - 249.975 + 439.425 = 14194.20 \to 14194$, validating exact consistency).*

---

## 4. Comprehensive Feature Module Specifications (1 to 23)

---

### Module 1: Academic Setup (P0)

#### 1.1 Overview & Scope
The structural foundation of a school tenant. Defines academic sessions (calendar years), campuses, classes, sections, subjects, subject groups, class-subject-teacher mappings, and institutional branding.

#### 1.2 User Stories
- **As a `school_admin`**, I want to configure academic sessions with defined start and end dates, so that student records, attendance, and fees are segregated by academic year.
- **As a `school_admin`**, I want to create multiple campuses under my school account, so that multi-branch operations share centralized administrative oversight.
- **As a `school_admin`**, I want to map subjects to classes and assign qualified teachers, so that teachers can only view and grade their designated student cohorts.
- **As a `teacher`**, I want to view my assigned classes and subjects, so that my dashboard displays my daily teaching schedule.

#### 1.3 Concrete Business Rules
1. Only one academic session per school can be marked with `status = 'active'`. Past sessions are marked `'completed'`; future sessions are marked `'upcoming'`.
2. A school must have at least one campus (default: "Main Campus"). Campuses share the same `school_id`.
3. Classes possess a mandatory integer `grade_level` (e.g., -2 for Nursery, -1 for KG, 1 through 12) to govern academic progression and sorting.
4. Section names must be unique within a class and campus (e.g., Class 5 - Section A).
5. A section can have at most one designated Class Teacher per academic session.
6. Class-subject-teacher mappings are unique per `(academic_session_id, section_id, subject_id)`.

#### 1.4 Edge Cases & Failure Modes
- Attempting to delete a class that contains active student enrollments: Database foreign key constraint rejects deletion. User receives friendly error: "Cannot delete class with active student enrollments."
- Switching active session while unfinalized marks or unpaid fee vouchers exist: System displays a warning modal requiring confirmation; past records remain locked under the prior session.

#### 1.5 Acceptance Criteria Checklist
- [ ] School admin can create academic sessions, specify start/end dates, and toggle active status.
- [ ] Classes and sections can be created with room numbers and student capacity limits.
- [ ] Subject groups (e.g., "Pre-Engineering", "Humanities") can bundle elective subjects.
- [ ] Teachers can be mapped to subject-section pairs with defined weekly periods.
- [ ] School profile updates (logo upload, banner, motto, affiliation number, address) reflect immediately across all portal headers.

---

### Module 2: Students (P0)

#### 2.1 Overview & Scope
Manages student biographical data, admission processing, family/sibling linking, custom metadata, document repositories, student life-cycle transitions (promote, retain, transfer, withdraw, struck-off), and automated portal credential generation.

#### 2.2 User Stories
- **As a `school_admin`**, I want to admit a student using a comprehensive digital admission form, so that all demographic, medical, and guardian details are captured.
- **As a `school_admin`**, I want to import hundreds of students via an Excel/CSV template, so that onboarding an existing school takes minutes rather than weeks.
- **As a `school_admin`**, I want to link siblings under a single guardian profile, so that parents have a unified account and qualify for family discounts.
- **As a `parent`**, I want to log in with credentials sent to my registered mobile number, so that I can monitor my children's education.

#### 2.3 Concrete Business Rules
1. Every student is assigned an `admission_number` that is strictly unique within the `school_id`.
2. A student cannot exist without at least one primary `guardian` (Father, Mother, or Legal Guardian) containing a valid name and mobile phone number.
3. Every student admission automatically creates a record in `student_enrollments` for the active academic session, assigning a `roll_number` that is unique per `(academic_session_id, section_id)`.
4. Student lifecycle states are strictly controlled:
   - `enrolled`: Actively studying and billed.
   - `promoted`: Completed prior session, successfully advanced.
   - `retained`: Repeating the academic grade.
   - `transferred`: Departed to another institution with a Transfer Certificate.
   - `withdrawn`: Formal parental withdrawal with all dues cleared.
   - `struck_off`: Administratively removed due to prolonged non-attendance or non-payment.
5. Soft-delete is enforced (`deleted_at`). Deleting a student never removes financial ledger records or historical marks.

#### 2.4 Edge Cases & Failure Modes
- Duplicate admission number in Excel bulk import: Entire import row is flagged with validation error; transactional bulk import provides a row-by-row error report without corrupting clean rows.
- Two students linked to the same guardian having identical birth dates (twins): Both receive sibling discounts according to secondary tie-breaker (admission number).

#### 2.5 Acceptance Criteria Checklist
- [ ] Single student admission form captures 30+ fields (CNIC/B-Form, religion, caste, blood group, previous school, photo).
- [ ] Bulk student import validates schema, date formats, and duplicates before committing.
- [ ] Guardian profile cleanly associates multiple students across different classes.
- [ ] Student ID card printable layout generates PDF with photo, barcode/QR code, and emergency contacts.
- [ ] Student withdrawal workflow validates fee clearance before issuing a Transfer Certificate.

---

### Module 3: Staff and HR (P0 Profile, P1 Leave)

#### 3.1 Overview & Scope
Maintains complete employee profiles, administrative departments, job designations, educational qualifications, employment contracts, teacher timetable assignments, and staff leave management with multi-level approval workflows.

#### 3.2 User Stories
- **As a `school_admin`**, I want to register staff members with designation, department, and salary structures, so that institutional HR and payroll are organized.
- **As a `school_admin`**, I want to generate and print formal Job Offer / Appointment Letters, so that hiring documentation is professional and automated.
- **As a `teacher`**, I want to submit digital leave requests specifying dates and reasons, so that my absences are officially recorded and covered.
- **As a `school_admin`**, I want to review, approve, or reject staff leave applications, so that substitute teachers can be scheduled.

#### 3.3 Concrete Business Rules
1. `employee_code` must be unique per `school_id`.
2. Staff roles include `teacher`, `accountant`, `librarian`, `transport_manager`, `clerk`, and `support_staff`.
3. Creating a staff member with role `teacher` or `accountant` triggers the creation of a Supabase auth user with corresponding JWT claims.
4. Leave types include Casual, Sick, Annual, Maternity, and Unpaid. Each leave type has an annual quota configured per school.
5. Leave applications cannot overlap with existing approved leaves for the same employee.

#### 3.4 Edge Cases & Failure Modes
- Staff member resigns while assigned as Class Teacher: System requires reassigning the Class Teacher role to an active staff member before archiving the resigning employee.
- Leave requested exceeds remaining annual balance: System alerts employee that excess days will be processed as Unpaid Leave (deducted from monthly payroll).

#### 3.5 Acceptance Criteria Checklist
- [ ] Employee profile tracks personal details, qualification documents, bank account, and emergency contact.
- [ ] Digital appointment letters can be previewed and printed with school branding.
- [ ] Staff leave dashboard displays total, used, and remaining quotas per leave category.
- [ ] Multi-stage leave approval workflow (HOD $\to$ Principal) with status tracking (`pending`, `approved`, `rejected`).
- [ ] Deactivating an employee immediately revokes system login access.

---

### Module 4: Attendance (P0 Student, P1 Rest)

#### 4.1 Overview & Scope
Comprehensive daily and period-level attendance tracking for students and staff. Supports web manual entry, mobile fast-marking, biometric device integration, CSV punch uploads, automated absent SMS/WhatsApp notifications, and monthly tabulation sheets.

#### 4.2 User Stories
- **As a `teacher`**, I want to mark daily class attendance on my mobile device with one-tap defaults, so that marking 40 students takes under 30 seconds.
- **As a `school_admin`**, I want parents of absent students to receive an automated SMS/WhatsApp alert within 30 minutes of school start, so that student safety is enforced.
- **As an `accountant`**, I want staff attendance records synchronized with payroll, so that unpaid leaves automatically calculate salary deductions.
- **As a `parent`**, I want to view my child's real-time attendance history and monthly attendance percentage, so that I can ensure their regular presence.

#### 4.3 Concrete Business Rules
1. Student attendance is recorded against `enrollment_id`, ensuring historical integrity.
2. Attendance statuses: `present`, `absent`, `late`, `half_day`, `leave`.
3. Database constraint enforces strict uniqueness: exactly one attendance row per `(enrollment_id, attendance_date, period_id)`. (For daily attendance, `period_id` is `NULL`).
4. Automated absent alert job triggers at a configurable cutoff time (e.g., 09:00 AM) and enqueues notification tasks in `job_queue`.
5. Attendance percentage is computed as:
   $$\text{Attendance } \% = \text{round}\left(\frac{\text{Present Days} + (0.5 \times \text{Half Days}) + \text{Approved Leaves}}{\text{Total Working Days}} \times 100, 2\right)$$

#### 4.4 Edge Cases & Failure Modes
- Teacher attempts to mark attendance for a declared school holiday: System blocks entry with error message: "Cannot mark attendance on a gazetted holiday."
- Attendance edited after parent alert already dispatched: Audit log records the modification (`marked_by`, previous status, new status, timestamp); follow-up correction notification is optional.

#### 4.5 Acceptance Criteria Checklist
- [ ] Fast attendance grid allows "Mark All Present" with single-click toggle to Absent/Late.
- [ ] Biometric CSV upload parses device punch logs and reconciles with shift start/end times.
- [ ] Automated background job dispatches absent SMS/WhatsApp alerts via configured provider adapter.
- [ ] Monthly class attendance matrix exports to Excel and PDF with summary columns.
- [ ] Student dashboard displays circular progress ring showing current month attendance percentage.

---

### Module 5: Timetable (P1)

#### 5.1 Overview & Scope
Academic scheduling engine defining school periods, daily bell schedules, class timetables, teacher schedules, real-time multi-dimensional clash detection, and substitute teacher management.

#### 5.2 User Stories
- **As a `school_admin`**, I want to define period slots (including breaks and assemblies) for different class tiers, so that schedules reflect school operations.
- **As a `school_admin`**, I want the timetable builder to prevent scheduling conflicts, so that no teacher or classroom is double-booked.
- **As a `teacher`**, I want to view my daily teaching schedule on web and mobile, so that I arrive at assigned classrooms promptly.
- **As a `school_admin`**, I want to quickly assign a substitute teacher when a colleague is absent, so that classes are never unattended.

#### 5.3 Concrete Business Rules
1. Clash Detection Engine enforces three invariant constraints:
   - **Teacher Clash**: A teacher cannot be assigned to two classes during the same day and period.
   - **Room Clash**: A physical room cannot host two classes during the same day and period.
   - **Section Clash**: A class section cannot have two different subjects scheduled in the same period.
2. Timetable periods support types: `'academic'`, `'assembly'`, `'recess'`, `'sports'`. Non-academic periods require no teacher assignment.
3. Substitution suggestions identify teachers who have no scheduled class during the absent teacher's period.

#### 5.4 Edge Cases & Failure Modes
- Bulk session rollover: Timetable structure can be cloned into a new academic session as a draft template, requiring admin validation before activation.
- Part-time teachers assigned outside their available working days: Scheduling grid displays warning badge based on employee contract days.

#### 5.5 Acceptance Criteria Checklist
- [ ] Visual drag-and-drop or dropdown grid for building weekly class timetables.
- [ ] Real-time clash detection blocks double-booking of teachers and rooms with descriptive error dialog.
- [ ] Teacher view displays personalized weekly schedule with subject and room tags.
- [ ] Substitution modal detects absent teachers from Module 4 and recommends available free teachers.
- [ ] Printable PDF export formats class-wise and master whole-school timetable charts.

---

### Module 6: Exams and Results (P0 Core, P1 Analysis)

#### 6.1 Overview & Scope
Comprehensive evaluation framework managing examination terms, date sheets, roll number slips/admit cards, class-wise marks entry grids, grading scales, composite term weightages, report cards (Detailed Marks Certificate - DMC) as PDF, class ranking, and tabulation sheets.

#### 6.2 User Stories
- **As a `school_admin`**, I want to set up exam terms (e.g., Midterm, Final) and publish date sheets, so that students and parents can prepare.
- **As a `teacher`**, I want to enter marks in an interactive grid with status flags (`present`, `absent`, `exempt`), so that marks entry is rapid and error-free.
- **As a `school_admin`**, I want to generate class broadsheets / tabulation sheets and print PDF report cards with student photos, grades, and positions.
- **As a `parent`**, I want to download my child's signed digital report card, so that I can review their academic progress.

#### 6.3 Concrete Business Rules
1. Marks records reference `enrollment_id` and `exam_subject_id`.
2. Exactly one mark entry per `(exam_subject_id, enrollment_id)`.
3. Marks are stored as `numeric(6,2)`. Cannot exceed `max_marks` defined in the date sheet.
4. If status is `absent`, `marks_obtained` is recorded as 0.00 and excluded from average marks computation if configured as `exempt`.
5. Class ranking uses **Standard Competition Ranking** (`1, 2, 2, 4`) as default, executing the 5-stage tie-breaker defined in Section 3.6.
6. Composite Term Weightages: Final DMC aggregates multiple terms according to configured percentages (e.g., Term 1: 30%, Term 2: 30%, Final: 40%).

#### 6.4 Edge Cases & Failure Modes
- Teacher attempts to submit marks above maximum marks: Input field enforces client validation and database `CHECK (marks_obtained <= max_marks)`.
- Re-evaluating marks after report cards are printed: Audit log captures modification (`updated_by`, old marks, new marks, justification); updated DMC marks report card version counter (`v2`).

#### 6.5 Acceptance Criteria Checklist
- [ ] Exam date sheet generator publishes schedule with subject, date, start/end time, room, and max/pass marks.
- [ ] Admit cards / roll number slips print with student photo, barcode, and exam rules.
- [ ] Class marks entry grid features auto-advance on Enter/Tab and keyboard shortcuts for Absent (`A`) and Exempt (`E`).
- [ ] PDF Report Card (DMC) renders school logo, student details, subject marks table, GPA, rank, and attendance.
- [ ] Class Tabulation Sheet displays all students, subjects, totals, grades, and positions in a landscape broadsheet.

---

### Module 7: Fees (P0)

#### 7.1 Overview & Scope
Enterprise school billing engine. Features fee heads, class fee structures, bulk monthly voucher batch generation via `job_queue`, partial payment processing, sibling discounts, non-compounding late fines, arrears carry-forward, 3-stub printable vouchers, gapless receipt numbering, defaulter tracking, and online payment integration via adapter.

#### 7.2 User Stories
- **As a `school_admin`**, I want to configure recurring fee structures per class, so that monthly billing is automated.
- **As an `accountant`**, I want to generate monthly fee vouchers for the entire school in one click, so that hundreds of invoices are created in seconds.
- **As an `accountant`**, I want to collect fee payments with barcode scanning, partial payments, and instant printed receipts.
- **As an `accountant`**, I want to view a real-time Defaulters List and dispatch SMS reminders to parents with overdue balances.
- **As a `parent`**, I want to pay my children's combined school fees online via credit card or digital wallet.

#### 7.3 Concrete Business Rules
1. **Append-Only Ledger**: Fee transactions are strictly append-only via `fee_ledger_entries`. Mutable balance fields on student or voucher tables are strictly prohibited. Balances are computed in real time via signed ledger aggregation:
   $$\text{Current Balance} = \sum (\text{Charges, Late Fines, Opening Balances, Refunds}) - \sum (\text{Payments, Waivers, Discounts, Advance Applied})$$
2. **Precision and Currency**: Monetary values are `bigint` minor units (e.g., cents, paise) paired with an ISO-4217 three-letter currency code. Floating-point arithmetic is forbidden.
3. **Enrollment-Centric**: `fee_ledger_entries` references `enrollment_id`.
4. **Gapless Document Sequences**: Voucher and receipt numbers are generated sequentially from `document_sequences` with row locking (`SELECT FOR UPDATE`), guaranteeing zero gaps in accounting sequences.
5. **Sibling Discounts**: Sibling discounts apply to younger siblings linked via `guardian_id` on tuition heads as formulated in Section 3.2.
6. **Late Fines**: Late fines follow Section 3.1 (`fixed_amount` or `per_day` with cap and grace period; strictly zero compounding).
7. **Payment Allocation**: Partial payments are allocated via the FIFO waterfall priority in Section 3.4.
8. **Session Rollover**: When an academic session closes, unpaid arrears are carried into the student's new enrollment record as a single `opening_balance` ledger entry, leaving prior session ledger entries completely untouched.
9. **Payment Gateway Adapter**: Online payments verify webhook signatures via `PaymentGatewayAdapter` with mandatory idempotency keys.
10. **Voucher Cancellation**: Generated vouchers cannot be directly updated or modified in-place. If an uncollected voucher contains errors, it must be cancelled with a mandatory audit reason. Cancellation appends compensating entries (`entry_type = 'reversal'`) for all charges associated with the voucher, marking the voucher status as `'cancelled'`. If a voucher already has recorded payments, cancellation is strictly blocked until those payments are reversed or refunded.
11. **Refunds**: A refund is an outgoing transaction recorded as a distinct ledger entry (`entry_type = 'refund'`), specifying the refunded minor units, linked `reverses_entry_id` referencing the original payment entry, and a mandatory textual reason. Processing a refund requires the explicit `fees:refund` permission.
12. **Advance Payments**: Any payment amount received in excess of the outstanding balance on a voucher or enrollment is recorded as an advance credit on the student's enrollment ledger. When the next monthly voucher is generated, any existing advance credit is automatically deducted as an opening credit line item (`entry_type = 'advance_applied'`), reducing the net payable on the new voucher.
13. **Immutability & No Editing of Generated Vouchers**: Once a fee voucher is generated and assigned a sequence number, its head items and billed amounts are immutable. Editing an existing voucher in-place is strictly prohibited. To correct a mistake, the user must either (a) cancel the entire voucher (provided zero payments exist) and regenerate a new voucher with a new sequence number, or (b) post an explicit financial adjustment entry (`entry_type = 'adjustment'`) to the fee ledger with mandatory reason and authorization.
14. **Defaulter Definition**: A student/enrollment is classified as a fee defaulter if they have any active fee voucher whose `due_date` has passed and whose outstanding balance ($\sum \text{Charges} - \sum \text{Credits}$) is strictly greater than zero minor units.

#### 7.4 Edge Cases & Failure Modes
1. **Vouchers generated twice for the same class and month**: The bulk generation stored procedure checks for existing active vouchers matching `(school_id, enrollment_id, billing_month, billing_year)`. If the job is re-run for the same class cohort, the database rejects duplicate generation; exactly 0 new vouchers and 0 new ledger charges are inserted. The response reports: "0 vouchers generated; all students already have vouchers for this billing period."
2. **Overpayment (extra becomes advance credit applied to the next voucher)**: When a payment exceeds the voucher's total outstanding balance (e.g., student owes $100.00 / 10,000 cents, payer tenders $140.00 / 14,000 cents), the voucher is marked `'paid'`, and the excess $40.00 (4,000 cents) is recorded as unallocated credit on the student's enrollment ledger. When the subsequent month's voucher is generated (e.g., $100.00), the system automatically creates an `advance_applied` ledger entry for 4,000 cents, reducing the net payable on the new voucher to $60.00 (6,000 cents).
3. **Cancelling a voucher that already has a payment**: The cancellation procedure checks if any payment entries (`entry_type = 'payment'`) reference the `voucher_id`. If active payments exist, the cancellation request is strictly aborted with an exception: `"Cannot cancel voucher with recorded payments. Reverse or refund payments first."` Only after all payments on the voucher are reversed (`entry_type = 'reversal'`) or refunded (`entry_type = 'refund'`) can the voucher charges be cancelled.
4. **Fee structure changed after vouchers already exist**: Class fee structures operate on an effective date and versioning model. Modifying a fee structure (e.g., increasing tuition from $100.00 to $120.00) leaves all existing generated vouchers and ledger charges completely unchanged at their snapshot values. Only vouchers generated after the fee structure modification use the updated rates.
5. **Student joins mid-month**: When a student is admitted mid-month, the school's configured mid-month billing rule is evaluated: if admitted on or before the 15th calendar day of the month, 100% of the monthly tuition fee is billed; if admitted on or after the 16th calendar day, a 50% prorated tuition fee (rounded half-up to minor units) is billed, alongside full one-time admission and registration charges.
6. **Student struck off with unpaid fees**: When an enrollment status transitions to `'struck_off'` (or `'withdrawn'`), all existing unpaid ledger balances remain active and collectible as institutional debt. The bulk monthly voucher generator skips struck-off students, generating zero future charges. If the student subsequently requests academic clearance, transfer certificates, or re-admission, the accumulated debt must be settled in full.
7. **Two cashiers collecting the same voucher at the same moment**: Collection transactions execute an explicit row-level lock on the voucher (`SELECT * FROM fee_vouchers WHERE id = $1 FOR UPDATE`). The first cashier's transaction locks the row, validates the outstanding balance, appends ledger entries, and updates the voucher balance. The second cashier's concurrent transaction is forced to wait on the lock; once released, it reads the updated remaining balance. If the first payment fully settled the voucher, the second transaction is rejected with `"Voucher has already been paid"`, preventing concurrent double-collection or over-allocation.
8. **Gateway webhook arrives twice**: The webhook handler queries the unique `idempotency_key` (payment gateway transaction ID) against `payment_webhook_events`. A repeated webhook with the same idempotency key is acknowledged with HTTP 200 OK and ignored without re-processing. If a genuinely distinct second payment arrives for an already settled voucher (e.g., parent initiated two separate bank transfers with different gateway transaction IDs), the second payment is recorded as an advance credit on the student's enrollment and an alert is flagged in the accountant dashboard for refund review.
9. **Payment recorded against the wrong student**: Direct modification of payment records is forbidden. The accountant must execute a payment reversal specifying the incorrect entry ID and a mandatory reason (`"Payment posted to incorrect student enrollment"`). This writes an `entry_type = 'reversal'` entry referencing `reverses_entry_id`, restoring the original student's debit balance. The accountant then records a new payment against the correct student enrollment referencing the original receipt.
10. **Refund**: Disbursing a refund writes an entry to `fee_ledger_entries` with `entry_type = 'refund'`, linked `reverses_entry_id` referencing the original payment entry, signed minor unit amount reducing net cash/bank balances, and a mandatory textual justification. The action is guarded by RLS and requires the user to possess the `fees:refund` permission.
11. **Voucher printed twice**: Re-printing an existing voucher retrieves the stored voucher record and its line items without incrementing sequence counters or inserting ledger entries. The printed layout automatically adds a `"DUPLICATE COPY"` watermark, displaying the original issue date, original voucher number, and an incremented `reprint_count`.
12. **School changes late-fine rule mid-year**: If a school updates its late fine policy (e.g., switching from a fixed $10.00 fee to a $1.50 per-day rate with a $15.00 cap), the new rule applies strictly to fee vouchers generated after the change date. Existing active vouchers continue to evaluate late fines according to the fine parameters stored with the voucher at the time of generation, preserving historical billing integrity.

#### 7.5 Acceptance Criteria Checklist
- [ ] A 500-student monthly voucher generation batch run finishes in under 60 seconds via `job_queue`.
- [ ] An independent SQL sum across all generated voucher line items for a month matches the total debits appended to `fee_ledger_entries` with exactly 0 minor units difference (`SELECT SUM(amount) FROM fee_voucher_items = SELECT SUM(amount) FROM fee_ledger_entries WHERE entry_type = 'charge'`).
- [ ] Running the bulk voucher generation job twice for the same academic session, class, and billing month creates exactly 0 duplicate vouchers and 0 duplicate ledger charges.
- [ ] For every student enrollment in the database, the dynamically computed ledger balance (`SUM(CASE WHEN entry_type IN ('charge', 'fine', 'opening_balance', 'refund') THEN amount ELSE -amount END)`) equals the outstanding balance displayed on the student's fee card.
- [ ] A payment reversal restores the exact prior debit balance to the minor unit with zero arithmetic drift.
- [ ] Two simultaneous collection requests executed concurrently against the same voucher never collect an amount exceeding the outstanding balance.
- [ ] Sequential gapless numbering verification: A SQL query `SELECT voucher_number FROM fee_vouchers ORDER BY voucher_number` across 1,000 consecutively generated vouchers reveals zero missing integer sequence values.
- [ ] Late fine calculation verified by automated unit tests: Late fine accrued equals $\min(\text{chargeable days} \times \text{per\_day amount}, \text{max\_cap})$ with zero compounding.
- [ ] Payment allocation follows Section 3.4 FIFO waterfall priority exactly: arrears cleared first, late fine second, tuition third, auxiliary fourth, optional fifth.
- [ ] Row Level Security test: In multi-tenant testing, a parent querying the vouchers API endpoint receives only vouchers associated with their linked children's `enrollment_id`s, returning 0 rows for other children in the same school.

---

### Module 8: Accounts (P1 - Simplified V1)

#### 8.1 Overview & Scope
Pragmatic institutional cash and bank bookkeeping. Tracks income and expense categories, cash in hand, bank accounts, daily cash book, transaction ledgers, daily closing reconciliation, and period Profit & Loss statements. (Excludes double-entry charts of accounts and journal vouchers in V1).

#### 8.2 User Stories
- **As an `accountant`**, I want to record school expenses (e.g., utility bills, repair costs, supplies) with attached receipts, so that institutional spending is documented.
- **As an `accountant`**, I want fee collections automatically credited to the designated cash or bank account, so that accounts reflect actual collections without manual double entry.
- **As an `accountant`**, I want to perform a daily cash closing, reconciling opening cash, daily inflows, daily outflows, and physical cash count.
- **As a `school_admin`**, I want to generate a monthly Profit and Loss statement, so that I can monitor institutional operating margins.

#### 8.3 Concrete Business Rules
1. Financial transactions are recorded in `account_transactions` against a `financial_account` (Cash Account, Bank Account).
2. Every transaction has a category (`income_categories` or `expense_categories`).
3. Collecting a fee voucher automatically creates a credit transaction in the selected `financial_account` categorized under "Student Fee Collection".
4. Disbursing payroll creates a debit transaction categorized under "Staff Salary Disbursement".
5. Daily closing generates an immutable snapshot record (`daily_closings`) locking opening balance, total income, total expense, closing balance, and physical discrepancy notes.

#### 8.4 Edge Cases & Failure Modes
- Accountant attempts to back-date an expense entry into a closed daily period: System rejects entry unless a `school_admin` explicitly unlocks the daily closing with an audited justification.
- Physical cash count does not match computed cash closing: System records difference as `discrepancy_amount` with mandatory explanation field.

#### 8.5 Acceptance Criteria Checklist
- [ ] Admin can create custom Income and Expense categories and Bank/Cash accounts.
- [ ] Cash book displays chronological inflows and outflows with running balance.
- [ ] Voucher collection automatically credits cash/bank accounts with linked receipt ID.
- [ ] Daily closing screen prompts physical cash denominations count and generates closing report.
- [ ] Profit & Loss report computes Total Income minus Total Expenses for any selected date range.

---

### Module 9: Payroll (P1)

#### 9.1 Overview & Scope
Staff compensation and payroll management. Defines salary structures (basic salary, allowances, deductions), tracks staff loans and advances with monthly EMI recovery, calculates attendance-linked unpaid leave deductions, generates monthly payroll sheets, and prints employee payslips.

#### 9.2 User Stories
- **As a `school_admin`**, I want to configure salary structures for staff members with customized allowances and deductions.
- **As an `accountant`**, I want to generate monthly payroll where unpaid leaves from Module 4 automatically calculate deductions, so that payroll is accurate.
- **As an `accountant`**, I want staff salary advances deducted in monthly installments, so that loan repayments are recovered seamlessly.
- **As a `teacher`**, I want to view and download my monthly payslip PDF from the mobile app.

#### 9.3 Concrete Business Rules
1. Net Salary Calculation:
   $$\text{Gross Salary} = \text{Basic Salary} + \sum \text{Allowances (Medical, HRA, Conveyance)}$$
   $$\text{Per Day Salary Rate} = \text{round}\left(\frac{\text{Basic Salary}}{\text{Total Days in Month}}, 2\right)$$
   $$\text{Unpaid Leave Deduction} = \text{round}(\text{Unpaid Leave Days} \times \text{Per Day Salary Rate})$$
   $$\text{Total Deductions} = \text{Unpaid Leave Deduction} + \sum \text{Fixed Deductions} + \text{Loan EMI Recovery}$$
   $$\text{Net Salary Payable} = \text{Gross Salary} - \text{Total Deductions}$$
2. Generating monthly payroll creates payroll records with status `draft`, advancing to `approved` and `paid`.
3. Disbursing salary creates corresponding debit entries in Module 8 (Accounts).

#### 9.4 Edge Cases & Failure Modes
- Employee joins mid-month: System prorates basic salary and allowances based on exact active days from `joining_date`.
- Loan EMI exceeds net payable salary: System caps EMI deduction to net earnings and flags warning to accountant.

#### 9.5 Acceptance Criteria Checklist
- [ ] Employee salary profile captures basic pay, recurring allowances, tax, and provident fund deductions.
- [ ] Loan & advance module tracks principal amount, monthly EMI, and remaining balance.
- [ ] Monthly payroll batch job computes attendance deductions based on approved unpaid leaves.
- [ ] Printable PDF payslip displays detailed earnings, deductions, net salary, and payment method.
- [ ] One-click salary disbursement marks payroll paid and records expense in Accounts.

---

### Module 10: Communication (P0 Notices and SMS, P1 Rest)

#### 10.1 Overview & Scope
Omnichannel school communication platform. Manages circulars and notices, school event/holiday calendars, bulk SMS campaigns with dynamic template variables, WhatsApp Business API messaging, transactional emails, push notifications, daily student diaries, and parent-teacher messaging.

#### 10.2 User Stories
- **As a `school_admin`**, I want to publish digital notices targeted to specific classes or staff, so that announcements reach the right audience instantly.
- **As a `school_admin`**, I want to dispatch bulk SMS announcements using templates with merge tags (`{{student_name}}`, `{{due_amount}}`), so that communication is personalized.
- **As a `teacher`**, I want to record daily diary entries (classwork and homework summaries), so that parents can assist their children at home.
- **As a `parent`**, I want to send a direct inquiry message to my child's class teacher, so that I can discuss their academic well-being.

#### 10.3 Concrete Business Rules
1. Notices support audience scoping: `all_school`, `specific_classes`, `teachers_only`, `parents_only`.
2. SMS and WhatsApp messages are dispatched via pluggable adapters (`SmsAdapter`, `WhatsAppAdapter`). SMS credits/costs are tracked per tenant.
3. Message templates strictly validate merge variables against recipient data prior to dispatch.
4. Student diary entries are scoped by date, class section, and subject.
5. Direct parent-teacher messaging operates during configured working hours, with read receipts and audit logging.

#### 10.4 Edge Cases & Failure Modes
- External SMS gateway timeout or failure: System retries 3 times with exponential backoff; logs failure status in `notification_logs` without blocking application workflows.
- Sending message to student without phone number: Row is flagged as skipped in dispatch report with reason "Missing phone number".

#### 10.5 Acceptance Criteria Checklist
- [ ] Notice board supports rich text, PDF attachments, expiration dates, and audience targeting.
- [ ] Bulk SMS campaign wizard provides template selector, live character count, and credit estimator.
- [ ] Student diary interface allows teachers to post daily subject logs visible immediately on parent mobile app.
- [ ] Event and holiday calendar highlights upcoming exams, parent-teacher meetings, and vacations.
- [ ] Delivery log tracks message timestamp, provider message ID, status (`sent`, `delivered`, `failed`), and cost.

---

### Module 11: Learning (P1, Quizzes P2)

#### 11.1 Overview & Scope
Academic delivery and learning management. Enables homework assignment creation, student digital file submissions, teacher grading with rubric feedback, syllabus breakdown, lesson plan tracking, downloadable study material repositories, online class video links, and interactive quizzes (P2).

#### 11.2 User Stories
- **As a `teacher`**, I want to post homework tasks with attached PDF worksheets and due dates, so that students know their assignments.
- **As a `student`**, I want to upload photos of my completed homework from my phone, so that my teacher can review and grade it.
- **As a `teacher`**, I want to log syllabus completion against lesson plan milestones, so that academic coverage is monitored.
- **As a `teacher`**, I want to attach Google Meet or Zoom links to classes, so that remote lectures are easily accessible.

#### 11.3 Concrete Business Rules
1. Homework records are scoped to `(academic_session_id, section_id, subject_id)` with a strict `submission_deadline`.
2. Student submissions store uploaded file paths in private Supabase Storage buckets, prefixed by `school_id`.
3. Submissions made after `submission_deadline` are automatically flagged with `status = 'late_submission'`.
4. Teachers can grade submissions with marks, status (`accepted`, `rejected`, `resubmit_required`), and written feedback.

#### 11.4 Edge Cases & Failure Modes
- Student attempts to upload submission after teacher has closed grading: System blocks upload displaying "Submissions are closed for this assignment."
- Storage file upload exceeding size quota (e.g., > 10MB): Client and server reject upload with informative error.

#### 11.5 Acceptance Criteria Checklist
- [ ] Teacher homework interface supports rich instructions, multiple document attachments, and due dates.
- [ ] Student portal displays active assignments, countdown timer to deadline, and upload modal.
- [ ] Teacher grading screen presents split view (student submission preview on left, grading form on right).
- [ ] Syllabus progress tracker visualizes percentage completion per subject and term.
- [ ] Study material repository categorizes files by subject, chapter, and file type.

---

### Module 12: Library (P2)

#### 12.1 Overview & Scope
Institutional library circulation and cataloging. Manages book master catalog (ISBN, author, publisher, rack location, barcode/RFID), student and staff library memberships, circulation (book issue, return, renewal), and automated overdue fine calculations.

#### 12.2 User Stories
- **As a `librarian`**, I want to catalog books with barcode IDs and rack locations, so that books are easily locatable.
- **As a `librarian`**, I want to issue books to students by scanning member and book barcodes, so that checkouts take seconds.
- **As a `librarian`**, I want overdue books to calculate late fines automatically upon return, so that library policies are maintained.
- **As a `student`**, I want to search the library catalog and view my borrowed books and due dates.

#### 12.3 Concrete Business Rules
1. Every book physical copy possesses a unique `barcode` / `accession_number` within the school.
2. Max books allowed concurrently: Students = 2 books, Staff = 5 books (configurable).
3. Standard loan period: 14 calendar days.
4. Overdue fine: Fixed daily rate (e.g., 50 cents/day) starting on day 15 until return date. Fine is appended to student's fee ledger or collected as cash.

#### 12.4 Edge Cases & Failure Modes
- Attempting to issue a book that is already checked out: System blocks transaction with message: "Book copy is currently issued to Member #X."
- Student attempts to check out a book while carrying overdue books: Checkout blocked until overdue items are returned or fines cleared.

#### 12.5 Acceptance Criteria Checklist
- [ ] Catalog search filters by title, author, category, ISBN, and rack location.
- [ ] Rapid barcode issue/return interface with audio confirmation beeps.
- [ ] Automated overdue fine calculator applies daily penalty upon return.
- [ ] Lost book workflow assesses replacement book fee charge to student fee ledger.
- [ ] Library circulation reports identify most borrowed books, active loans, and overdue members.

---

### Module 13: Inventory (P2)

#### 13.1 Overview & Scope
Institutional asset and stock management. Tracks item master catalog (stationery, textbooks, uniforms, sports equipment, lab consumables), suppliers, purchase orders, stock-in/stock-out transactions, departmental issue logs, and low-stock alerts.

#### 13.2 User Stories
- **As a `school_admin`**, I want to track warehouse stock levels, so that the school never runs out of essential supplies.
- **As an `inventory_manager`**, I want to record supplier purchases with invoice numbers and unit costs, so that inventory expenses are accounted for.
- **As an `inventory_manager`**, I want to issue items to staff members or departments, so that asset consumption is tracked.

#### 13.3 Concrete Business Rules
1. Inventory items are categorized: `consumable` (stationery, lab chemicals) or `fixed_asset` (furniture, computers).
2. Stock adjustments are recorded in an append-only `inventory_transactions` ledger (`stock_in`, `stock_out`, `transfer`, `adjustment`, `loss`). Current stock is computed:
   $$\text{Available Stock} = \sum (\text{Stock In}) - \sum (\text{Stock Out})$$
3. When available stock drops below `reorder_level`, an automated alert badge is displayed on the dashboard.

#### 13.4 Edge Cases & Failure Modes
- Attempting to issue stock exceeding available warehouse balance: System blocks transaction with error: "Insufficient stock available."
- Returning defective stock to supplier: Generates `stock_out` transaction of type `vendor_return` and records credit memo.

#### 13.5 Acceptance Criteria Checklist
- [ ] Item catalog tracks SKU, item name, unit of measure (pieces, boxes, kg), and reorder threshold.
- [ ] Purchase entry records vendor, invoice date, quantity, unit price, and target warehouse.
- [ ] Staff issue modal records issuing date, department, recipient signature/acknowledgment.
- [ ] Stock balance report displays current stock value, total received, and total issued.
- [ ] Low-stock notification triggers when inventory falls below minimum threshold.

---

### Module 14: Transport (P2)

#### 14.1 Overview & Scope
Student transportation operations. Manages bus routes, vehicle fleets, maintenance logs, drivers and attendants, pickup/drop stops, student stop assignments, and automated monthly transport fee integration with Module 7 (Fees).

#### 14.2 User Stories
- **As a `transport_manager`**, I want to configure bus routes with defined stops and pickup/drop times, so that transit schedules are organized.
- **As a `transport_manager`**, I want to assign students to specific bus stops, so that vehicle capacity is never exceeded.
- **As an `accountant`**, I want assigned student transport fares automatically included on monthly fee vouchers.
- **As a `parent`**, I want to view my child's bus route, vehicle number, driver contact, and scheduled pickup time.

#### 14.3 Concrete Business Rules
1. Each vehicle has a strictly enforced `seating_capacity`. Student assignments cannot exceed vehicle capacity.
2. Transport stops define morning pickup time, afternoon drop time, and a monthly `fare_amount` in minor units.
3. Assigning an enrolled student to a transport stop creates a recurring billing rule that automatically appends the transport fee head during monthly voucher generation in Module 7.
4. Unsubscribing a student mid-month prorates or terminates subsequent billing cycles based on school policy.

#### 14.4 Edge Cases & Failure Modes
- Route assignment attempted for bus at full capacity: System rejects assignment: "Vehicle capacity of 40 students reached."
- Vehicle undergoes emergency maintenance: Transport manager triggers SMS alert to all parents on that route with replacement vehicle details.

#### 14.5 Acceptance Criteria Checklist
- [ ] Fleet management captures vehicle registration, insurance expiry, fitness certificate, and driver phone.
- [ ] Route builder creates ordered stops with GPS coordinates and scheduled arrival times.
- [ ] Student allocation interface validates vehicle capacity limits.
- [ ] Monthly fee generator automatically includes route stop fare on student voucher.
- [ ] Route passenger manifest exports as printable PDF for bus attendants.

---

### Module 15: Hostel (P2)

#### 15.1 Overview & Scope
Residential boarding school management. Manages hostel buildings, floors, room configurations, bed capacity, room allocations, student check-in/out logs, warden assignments, gate passes, visitor logs, and automated room and mess fee billing.

#### 15.2 User Stories
- **As a `hostel_warden`**, I want to configure rooms and beds, so that boarding capacity is managed efficiently.
- **As a `hostel_warden`**, I want to allocate students to beds, track check-in dates, and issue digital gate passes for weekend leaves.
- **As an `accountant`**, I want monthly hostel room and mess fees automatically billed to residential students.
- **As a `parent`**, I want to view my child's hostel room assignment, warden contact, and gate pass approvals.

#### 15.3 Concrete Business Rules
1. Hostel rooms have room types: `single`, `double`, `dormitory` with fixed `bed_count`.
2. A bed cannot have more than one active student allocation at the same time.
3. Residential students are flagged with `is_hostelite = true`, which links monthly hostel rent and mess fee heads into Module 7 voucher generation.
4. Gate passes require parent consent and warden approval before a student can leave premises.

#### 15.4 Edge Cases & Failure Modes
- Student withdraws from school while holding active hostel bed: Withdrawal clearance requires hostel warden clearance sign-off.
- Student requests gate pass during examination days: System flags warning to warden indicating ongoing exam dates.

#### 15.5 Acceptance Criteria Checklist
- [ ] Hostel building master tracks floors, room numbers, bed IDs, and AC/Non-AC status.
- [ ] Bed allocation matrix visualizes occupied and available beds with student photo cards.
- [ ] Digital gate pass tracks departure time, expected return, destination, and parent approval status.
- [ ] Visitor log records guest CNIC/ID, relation to student, and entry/exit timestamps.
- [ ] Monthly hostel fee heads automatically integrate into bulk fee generation.

---

### Module 16: Certificates and Cards (P1)

#### 16.1 Overview & Scope
Document and credential issuance engine. Features dynamic template builders with merge tokens, issuing formal Leaving/Transfer Certificates (TC), Character Certificates, Bonafide Certificates, student/staff ID cards, and exam admit cards with verification barcodes.

#### 16.2 User Stories
- **As a `school_admin`**, I want to generate Transfer Certificates (TC) with automated student history, so that departing students receive formal documentation.
- **As a `school_admin`**, I want to design and print student ID cards in bulk with school branding and barcodes.
- **As an `employer` or `foreign institution`**, I want to scan the QR code on a certificate to verify its authenticity on the school's public verification page.

#### 16.3 Concrete Business Rules
1. Certificates utilize sequential certificate numbers from `document_sequences` (e.g., `TC-2026-0042`).
2. Merge tokens dynamically populate student data: `{{student_name}}`, `{{father_name}}`, `{{admission_no}}`, `{{class}}`, `{{roll_no}}`, `{{dob}}`, `{{conduct}}`, `{{issue_date}}`.
3. Issuing a Transfer Certificate (TC) requires prior financial clearance (0 ledger balance in Module 7) and automatically sets student status to `transferred`.
4. Every issued certificate generates a unique verification hash encoded into a QR code linking to `https://[school_domain]/verify/[hash]`.

#### 16.4 Edge Cases & Failure Modes
- Attempting to issue a TC to a student with pending fee arrears: System blocks issuance: "Cannot issue Transfer Certificate. Outstanding fee balance of \$120.00."
- Re-printing a lost certificate: System marks print as "DUPLICATE COPY" with original issue date and incremented print counter.

#### 16.5 Acceptance Criteria Checklist
- [ ] Visual certificate designer allows configuring background frames, logos, signature lines, and merge tokens.
- [ ] Bulk ID card generator renders CR80 card dimensions (front and back) with photo and barcode.
- [ ] Transfer Certificate generation checks financial clearance and closes enrollment.
- [ ] Public verification URL validates certificate authenticity without requiring login.
- [ ] Certificate issuance log tracks recipient, certificate type, serial number, and issuing admin.

---

### Module 17: Admissions and Enquiries (P1)

#### 17.1 Overview & Scope
Admissions CRM and front-office inquiry pipeline. Provides public online admission application links, tracks prospective student leads, schedules entrance tests and interviews, scores entrance exams, and converts accepted applicants into enrolled students with registration fee billing.

#### 17.2 User Stories
- **As a `parent`**, I want to submit an online admission form on the school's website, upload required documents, and pay the application fee.
- **As an `admissions_officer`**, I want to track prospective leads across an inquiry pipeline (Inquiry $\to$ Test Scheduled $\to$ Interviewed $\to$ Offered $\to$ Enrolled).
- **As an `admissions_officer`**, I want to convert an accepted applicant to an enrolled student in one click, transferring all demographic data into Module 2 without re-typing.

#### 17.3 Concrete Business Rules
1. Public admission applications generate a tracking reference number (e.g., `APP-2026-0189`).
2. Inquiry statuses follow a strict pipeline: `lead`, `inquiry`, `test_scheduled`, `interviewed`, `offered`, `enrolled`, `rejected`, `withdrawn`.
3. Entrance test scores are recorded out of 100 with pass/fail determination.
4. Converting an applicant to `enrolled`:
   - Creates a new record in `students`.
   - Creates a new record in `student_enrollments` for the target session, class, and section.
   - Generates an admission invoice in Module 7 including one-time Admission and Registration fee heads.

#### 17.4 Edge Cases & Failure Modes
- Applicant attempts to submit form without mandatory birth certificate attachment: Form validation blocks submission until file is uploaded.
- Duplicate inquiry submitted with same parent phone and child name: System detects potential duplicate and links to existing lead record.

#### 17.5 Acceptance Criteria Checklist
- [ ] Embeddable/public online admission form collects student info, parent info, and document uploads.
- [ ] Admissions Kanban board displays leads across pipeline stages with drag-and-drop status updates.
- [ ] Interview and test scheduler sends automated confirmation SMS/email to parents.
- [ ] One-click conversion button transforms approved application into enrolled student with allocated roll number.
- [ ] Lead source tracking report analyzes conversions by channel (Social Media, Walk-in, Referral).

---

### Module 18: Reports and Dashboards (P0 Basic, P1 Full)

#### 18.1 Overview & Scope
Executive business intelligence and analytical reporting. Delivers role-tailored dashboards (`super_admin`, `school_admin`, `accountant`, `teacher`, `student`, `parent`), interactive KPI metric cards, tabular report generators with saved filters, and export engines (Excel XLSX, PDF, Print).

#### 18.2 User Stories
- **As a `school_admin`**, I want an executive dashboard displaying total students, daily student attendance %, staff present count, monthly fee collection progress, and net profit.
- **As an `accountant`**, I want to generate a Fee Collection Summary report grouped by class and payment method, exportable to Excel.
- **As a `teacher`**, I want to view class performance metrics comparing exam averages across sections.
- **As a `super_admin`**, I want a global platform dashboard tracking total active schools, monthly recurring revenue (MRR), and system resource usage.

#### 18.3 Concrete Business Rules
1. Dashboard metrics respect user role permissions and tenant RLS scoping at all times.
2. Financial charts and numbers are rounded to standard minor units and displayed in the school's configured currency.
3. Heavy aggregate reports (e.g., whole-school annual attendance tabulation) utilize materialized database views or cached background calculations to prevent UI lag.
4. Data exports (XLSX, PDF) format headers with school logo, report name, generation timestamp, and generating user.

#### 18.4 Edge Cases & Failure Modes
- Exporting report with 50,000+ rows: System delegates generation to `job_queue` and notifies user when downloadable file is ready in Storage.
- Attempting to view financial reports as a Teacher: System rejects request with HTTP 403 Forbidden.

#### 18.5 Acceptance Criteria Checklist
- [ ] Executive KPI cards display Total Students, Staff Attendance, Fee Collection %, and Net Balance.
- [ ] Interactive charts visualize Monthly Income vs Expense trends and Student Demographics by Gender/Class.
- [ ] Data tables provide server-side sorting, column filtering, search, and pagination.
- [ ] One-click export to CSV, Excel (XLSX), and PDF formatted for standard A4 printing.
- [ ] Saved filter presets allow users to store and reload custom report parameters.

---

### Module 19: Roles and Permissions (P0)

#### 19.1 Overview & Scope
Enterprise authorization and governance engine. Supports built-in system roles (`super_admin`, `school_admin`, `accountant`, `teacher`, `student`, `parent`), custom user roles (e.g., `vice_principal`, `receptionist`), granular module-action permission matrices (view, create, edit, delete, approve, export), per-user permission overrides, and an immutable audit log.

#### 19.2 User Stories
- **As a `school_admin`**, I want to create a custom role (e.g., "Front Desk Receptionist") with permissions limited to Admissions and Inquiries, so that staff access is strictly controlled.
- **As a `school_admin`**, I want to review an immutable audit log of who edited a student's marks or deleted a fee voucher, including timestamps and previous values.
- **As a `super_admin`**, I want to enforce strict role separation so that accountants can never view student exam grades or medical records.

#### 19.3 Concrete Business Rules
1. Authorization is enforced at the database level via Postgres RLS policies querying JWT claims (`app_role`, `school_id`).
2. Granular permission format: `module:action` (e.g., `fees:create`, `marks:approve`, `students:export`).
3. Sensitive actions generate mandatory records in `audit_logs`:
   - Fee voucher cancellations or modifications.
   - Marks updates after exam lock.
   - Student status changes (withdrawal, struck off).
   - Staff salary modifications.
   - User role or permission edits.
   - Super admin tenant impersonation sessions.
4. Audit log rows are strictly append-only; database denies `UPDATE` or `DELETE` operations on `audit_logs`.

#### 19.4 Edge Cases & Failure Modes
- School admin attempts to revoke `school_admin` role from their own account: System blocks action to prevent administrative lockout.
- User makes an unauthorized API request: RLS policy returns 0 rows; application returns 403 Forbidden and logs security warning.

#### 19.5 Acceptance Criteria Checklist
- [ ] Built-in roles pre-configured with industry standard defaults.
- [ ] Custom role builder allows toggling view, create, edit, delete, approve, and export across all modules.
- [ ] Per-user override capability allows granting or revoking specific permissions for an individual staff member.
- [ ] Immutable audit log captures user UUID, IP address, action, target entity ID, old state JSONB, and new state JSONB.
- [ ] Strict row-level scoping guarantees teachers see only their assigned classes, parents see only their linked children.

---

### Module 20: Portals (P0)

#### 20.1 Overview & Scope
Tailored, role-specific user portals providing dedicated user experiences:
1. **Student Portal**: Timetable, personal attendance, report cards, homework, fee slips, circulars.
2. **Parent Portal**: Multi-child switchboard, consolidated fee payments, attendance notifications, diary, teacher messaging.
3. **Teacher Portal**: Class schedules, fast attendance marking, exam marks entry, homework grading, student search.
4. **Accountant Portal**: Single-key fast fee collection POS interface, barcode scanner input, receipt printing, daily closing.

#### 20.2 User Stories
- **As a `parent`**, I want to switch between my three children in one click without re-logging, so that I can easily monitor each child.
- **As an `accountant`**, I want a barcode-assisted fee collection terminal where scanning a voucher instantly opens payment details and prints a receipt upon hitting Enter.
- **As a `teacher`**, I want a clean portal optimized for tablet and mobile, so that I can manage classroom activities on the go.

#### 20.3 Concrete Business Rules
1. Multi-Child Switchboard: Parent session maintains active `selected_child_enrollment_id`. Changing children updates context without re-authenticating.
2. Accountant Fast Collection: Supports full keyboard-only navigation (Scan Barcode $\to$ Enter $\to$ F9 Cash Collect $\to$ Print Receipt).
3. Student access is locked if administrative hold (`is_portal_locked = true`) is placed due to extreme fee default.

#### 20.4 Edge Cases & Failure Modes
- Parent with children in two different schools under the platform: Multi-tenant JWT supports multiple school links; parent chooses school branch from portal header.
- Student attempts to access parent-specific fee payment settings: Portal routes enforce role boundaries, denying access.

#### 20.5 Acceptance Criteria Checklist
- [ ] Parent portal header features child switcher dropdown displaying child photo, name, class, and attendance badge.
- [ ] Accountant POS screen supports rapid barcode scan, amount tender calculator, and ESC/shortcut controls.
- [ ] Teacher mobile portal provides bottom-navigation bar for Quick Attendance, Marks, Homework, and Diary.
- [ ] Student portal displays daily schedule countdown and due homework cards.
- [ ] Session timeout and token refreshing handle mobile background state seamlessly.

---

### Module 21: Settings and Data (P0 Partial)

#### 21.1 Overview & Scope
Institutional configuration, localization, third-party integrations, and disaster recovery. Manages school profile, logos, signatures, letterhead templates, academic grading configuration, SMS/WhatsApp gateway credentials, payment gateway credentials, multi-language internationalization (i18n), Right-to-Left (RTL) layout, and full database export/backup.

#### 21.2 User Stories
- **As a `school_admin`**, I want to configure our school letterhead, logo, and principal digital signature, so that all generated PDFs are officially branded.
- **As a `school_admin`**, I want to toggle language between English, Arabic, and Urdu with complete RTL support, so that staff and parents can use their native language.
- **As a `school_admin`**, I want to export all school data to a ZIP file containing structured Excel spreadsheets, so that we retain full data ownership.

#### 21.3 Concrete Business Rules
1. Internationalization (i18n) covers 100% of UI strings. Hardcoded text is prohibited.
2. RTL mode activates automatically when Arabic or Urdu is selected, switching layout flex directions and typography.
3. Third-party credentials (SMS API keys, Stripe/Razorpay secrets) are encrypted at rest using AES-GCM-256 before storage in `school_settings`.
4. Automated daily database backups are stored in isolated encrypted cloud storage.

#### 21.4 Edge Cases & Failure Modes
- Invalid API credentials entered for SMS gateway: Settings modal provides a "Test Connection" button that validates credentials with a test ping before saving.
- Importing backup data from another school: Database schema enforces tenant UUID validation, preventing cross-tenant data corruption.

#### 21.5 Acceptance Criteria Checklist
- [ ] Institutional profile editor manages name, logo, banner, motto, address, phone, email, currency, and timezone.
- [ ] Instant language toggle supports English, Urdu, and Arabic with bidirectional RTL layout flipping.
- [ ] Secure settings vault stores API credentials for SMS, WhatsApp, and Payment gateways with "Test Ping" tools.
- [ ] One-click Full Data Export generates downloadable ZIP package of school data in Excel format.
- [ ] Print template settings allow custom margins, header/footer text, and signature stamps for vouchers and reports.

---

### Module 22: SaaS Layer (P1)

#### 22.1 Overview & Scope
Multi-tenant platform operations and subscription monetization. Manages school onboarding, subscription plans (Starter, Pro, Enterprise), student/staff account quotas, automated SaaS subscription billing via `PaymentGatewayAdapter`, super-admin command center, audited school impersonation, custom domains, and platform telemetry.

#### 22.2 User Stories
- **As a `super_admin`**, I want to onboard a new school, assign a subscription plan, and provision their database tenant in under 60 seconds.
- **As a `super_admin`**, I want to securely impersonate a school admin to troubleshoot an issue, with every action logged in a tamper-proof audit trail.
- **As a `super_admin`**, I want schools exceeding their subscription student limit to be prompted for an automated plan upgrade.
- **As a `school_admin`**, I want to map our custom domain (`portal.schoolname.edu`) to our ERP portal.

#### 22.3 Concrete Business Rules
1. Platform Plans define strict quotas: `max_students`, `max_staff`, `storage_limit_mb`, and enabled feature flags.
2. Tenant Creation Workflow:
   - Inserts row into `schools`.
   - Provisions root `school_admin` user in Supabase Auth.
   - Seeds default academic sessions, standard grading scale, default fee heads, and system roles.
3. Audited Impersonation Protocol:
   - Super admin generates a short-lived (max 60 minutes) scoped JWT.
   - Impersonation session logs start time, super-admin UUID, target `school_id`, and reason.
   - Screen displays prominent red header banner: "IMPERSONATING [SCHOOL NAME] - READ ONLY / AUDITED".
4. Billing cycles (monthly/annual) execute via `PaymentGatewayAdapter`. Overdue SaaS subscriptions trigger grace periods followed by read-only tenant suspension.

#### 22.4 Edge Cases & Failure Modes
- School attempts to admit student #501 on a 500-student plan: Admission form blocks submission: "Student capacity limit reached (500/500). Please upgrade your subscription."
- Super admin impersonation token expiration: User session instantly terminates, returning super admin to platform console.

#### 22.5 Acceptance Criteria Checklist
- [ ] Super admin tenant directory displays all schools, active plan, student count, MRR, and health status.
- [ ] Automated tenant provisioning seeds default settings and creates initial school admin account.
- [ ] Subscription engine manages recurring SaaS billing, invoice generation, and quota enforcement.
- [ ] Time-limited, audited school impersonation protocol with persistent visual indicator banner.
- [ ] Custom domain routing allows tenants to bind custom CNAME records with automated SSL provisioning.

---

### Module 23: Public School Page (P2)

#### 23.1 Overview & Scope
Public-facing web landing page for each school tenant. Features customizable hero banner, principal's welcome message, photo gallery, facility highlights, public announcements, interactive Google Maps location, contact form, and direct link to the online admission application.

#### 23.2 User Stories
- **As a `prospective_parent`**, I want to visit the school's public website to read about facilities, academic philosophy, and view campus photos.
- **As a `prospective_parent`**, I want to submit an inquiry or launch the online admission application directly from the public landing page.
- **As a `school_admin`**, I want to update our school's public notices, gallery photos, and contact hours from the ERP settings without coding.

#### 23.3 Concrete Business Rules
1. Public page is accessible without authentication at `[subdomain].erp.com` or custom tenant domain.
2. Content is managed dynamically in `school_public_pages` (about text, principal message, gallery image URLs, social links).
3. Contact form submissions insert directly into Module 17 (Admissions and Enquiries) as new leads with source `'website'`.
4. Public notices only display circulars marked with `is_public = true` in Module 10 (Communication).

#### 23.4 Edge Cases & Failure Modes
- Public web visitor submits spam messages via contact form: Integrated Cloudflare Turnstile / reCAPTCHA blocks automated bot submissions.
- School tenant is suspended or inactive: Public page displays polite maintenance notice rather than broken database errors.

#### 23.5 Acceptance Criteria Checklist
- [ ] Responsive modern landing page renders school branding, motto, and navigation links.
- [ ] Interactive sections showcase About Us, Facilities, Photo Gallery, and Principal's Message.
- [ ] Public Notice Board displays active school announcements and downloadable circulars.
- [ ] Embedded Contact Form delivers inquiry directly to Admissions CRM pipeline.
- [ ] "Apply for Admission" primary call-to-action button routes seamlessly to Module 17 application wizard.

---

## 5. Verification and Acceptance Matrix

| Module ID | Module Name | Priority | Worked Example Included | Testable Criteria Count | RLS Enforced |
| :---: | :--- | :---: | :---: | :---: | :---: |
| 1 | Academic Setup | P0 | N/A (Structural) | 5 | Yes |
| 2 | Students | P0 | Section 3.7 (Promotion) | 5 | Yes |
| 3 | Staff and HR | P0/P1 | Section 9.3 (Leave Proration) | 5 | Yes |
| 4 | Attendance | P0/P1 | Section 4.3 (Attendance %) | 5 | Yes |
| 5 | Timetable | P1 | N/A (Clash Rules) | 5 | Yes |
| 6 | Exams and Results | P0/P1 | Sections 3.5 & 3.6 (GPA & Rank) | 5 | Yes |
| 7 | Fees | P0 | Sections 3.1, 3.2, 3.3, 3.4 | 5 | Yes |
| 8 | Accounts (V1) | P1 | N/A (Closing Formula) | 5 | Yes |
| 9 | Payroll | P1 | Section 9.3 (Salary & Deductions) | 5 | Yes |
| 10 | Communication | P0/P1 | N/A (Merge Logic) | 5 | Yes |
| 11 | Learning | P1/P2 | N/A (Grading Flags) | 5 | Yes |
| 12 | Library | P2 | Section 12.3 (Overdue Fine) | 5 | Yes |
| 13 | Inventory | P2 | Section 13.3 (Stock Balance) | 5 | Yes |
| 14 | Transport | P2 | Section 14.3 (Fare Billing) | 5 | Yes |
| 15 | Hostel | P2 | Section 15.3 (Room Billing) | 5 | Yes |
| 16 | Certificates and Cards | P1 | Section 16.3 (Sequence/Clearance) | 5 | Yes |
| 17 | Admissions and Enquiries | P1 | Section 17.3 (Conversion) | 5 | Yes |
| 18 | Reports and Dashboards | P0/P1 | Section 18.3 (Aggregation) | 5 | Yes |
| 19 | Roles and Permissions | P0 | Section 19.3 (Audit Rules) | 5 | Yes |
| 20 | Portals | P0 | Section 20.3 (POS & Switchboard) | 5 | Yes |
| 21 | Settings and Data | P0/P1 | Section 3.8 (Rounding) | 5 | Yes |
| 22 | SaaS Layer | P1 | Section 22.3 (Quotas & Billing) | 5 | Yes |
| 23 | Public School Page | P2 | N/A (Public Routing) | 5 | Yes |

---

## 6. Document Completion & Next Steps
This Product Requirements Document (`PRD.md`) is complete, fully specified across all 23 modules with zero placeholders, and establishes the functional foundation of the ERP SaaS platform.

Per the binding execution plan, work now stops. The agent is awaiting user instruction:
`"next"` $\to$ will initiate authoring of **`docs/DATA_MODEL.md`**.
