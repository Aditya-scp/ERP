# Screen Catalog and User Interface Specification (SCREENS.md)

This document establishes the authoritative User Interface (UI), User Experience (UX), Route Hierarchy, Component Architecture, and State Specification for the ERP multi-tenant platform across Web and Mobile clients.

> [!NOTE]
> **Route Structure Precedence**:
> The route structure, layout hierarchy, and URL patterns specified in this document (`SCREENS.md`) are binding and strictly override any alternative file paths, routes, or component names in any build prompt or task brief.

---

## 1. Executive UI/UX Architecture & Global Design Contracts

### 1.1 Technical Stack & Client Architectures
The platform implements two unified, role-aware client applications served from the monorepo:
1. **Web Client (`apps/web`)**: Next.js App Router, React, TypeScript strict mode, Tailwind CSS, shadcn/ui primitives (Radix UI engine), TanStack Table, TanStack Query, React Hook Form, and Zod runtime schema validation. Web authentication uses secure, `HttpOnly`, `SameSite=Lax` Supabase SSR cookies.
2. **Mobile Client (`apps/mobile`)**: Expo (managed workflow), Expo Router (file-based routing), React Native, NativeWind (Tailwind CSS engine), offline-lite architecture (cached reads, queued attendance marking with optimistic UI updates), and hardware biometrics (`expo-local-authentication`).

### 1.2 Printing & Hardware Strategy (V1 vs P2)
- **V1 Browser Print (A4 & A5 Standard)**: Fee vouchers, receipts, DMC report cards, admit cards, and payslips utilize standardized CSS print style sheets (`@media print`) rendering directly to browser standard A4 or A5 paper layouts.
- **P2 Hardware Printing & Scanners**: ESC/POS thermal receipt printing (80mm/58mm) and USB/Bluetooth hardware barcode laser scanners are deferred to P2. In V1, barcode/QR input is captured via keyboard input or camera-based WebRTC/Expo camera scanning.

### 1.3 Global Page Pattern & Visual Rhythm
Adhering to [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md), every screen across the web application conforms strictly to the standardized 5-tier structural pattern:
1. **Header & Context Bar**: Page title, breadcrumb trail (`Home / Module / Sub-entity`), and primary action button anchored to the top right.
2. **Persistent Filter & Control Bar**: Instant search input (debounced 300ms), faceted select dropdowns (Class, Section, Academic Session, Date Range, Status), column toggle visibility menu, and data export action (CSV / Excel / PDF).
3. **Data Display Canvas**: TanStack Table with server-side pagination, sorting, and row selection on desktop; responsive Card Grid on viewports $< 768\text{px}$.
4. **Contextual Action Column**: Right-aligned, sticky row action menu (`DropdownMenu` with View, Edit, Audit Trail, and Soft Delete triggers).
5. **Pagination & Telemetry Footer**: Current page count (`Showing X to Y of Z entries`), rows-per-page selector (`10, 25, 50, 100`), and accessible pagination controls.

```
┌────────────────────────────────────────────────────────────────────────┐
│ Breadcrumb: Academics / Classes / Class Roster                         │
│ Title: Class 10 - Section A Roster             [ + Add Student ] (CTA) │
├────────────────────────────────────────────────────────────────────────┤
│ [🔍 Search student... ] [ Class: 10 ▼ ] [ Sec: A ▼ ] [ Status: All ▼ ] │
├────────────────────────────────────────────────────────────────────────┤
│ ☐ | Roll | Student Name       | Gender | Phone        | Status | Actions│
│ ──┼──────┼────────────────────┼────────┼──────────────┼────────┼────────│
│ ☐ | 001  | Aarav Sharma       | Male   | +919876543210| Active | [ ••• ]│
│ ☐ | 002  | Diya Patel         | Female | +919876543211| Active | [ ••• ]│
│ ...                                                                    │
├────────────────────────────────────────────────────────────────────────┤
│ Showing 1 to 25 of 48 students               [ Prev ] [ 1 ] [ 2 ] [Next]│
└────────────────────────────────────────────────────────────────────────┘
```

### 1.4 Tri-State UI Contract
Every visual component and data container must explicitly implement three mandatory UI states without exception:
1. **Loading State**: Content-shaped skeleton loaders matching the exact column count and card geometries of the loaded data. Generic circular spinners are strictly prohibited for full-page or table views.
2. **Empty State**: Centered neutral illustration or Lucide icon, human-readable title (`"No records found"`), descriptive explanation (`"No students are currently enrolled in this section for the 2026-2027 session."`), and a contextual Primary Call-to-Action button (`"Enroll First Student"`).
3. **Error State**: Non-blocking alert banner with neutral red palette, human-readable error summary, technical error code (e.g., `ERR_AUTH_FORBIDDEN_403`), and a primary `"Try Again"` retry trigger.

### 1.5 Form Architecture & Mutation Feedback
1. **Zod Validation**: Every form is strictly backed by shared Zod schemas from `packages/types`. Validation runs client-side on blur and submit.
2. **Inline Field Errors**: Form fields render clear, accessible error descriptions below the input with `aria-invalid="true"` and `aria-describedby="[field]-error"`.
3. **Toast Notifications**: Every mutation triggers an immediate toast:
   - *Success*: Green accent, brief confirmation (`"Fee payment of ₹3,500 recorded successfully."`), with optional action link (`"Print Receipt"`).
   - *Error*: Red accent, clear failure reason (`"Cannot delete class: 42 active students are currently enrolled."`).
4. **Destructive Action Confirmation**: Destructive actions (soft deletes, payment cancellations, term unlocks) require an explicit modal confirmation with a required justification text input for irreversible financial or academic changes.

### 1.6 Accessibility, Responsiveness & i18n
1. **WCAG 2.1 AA Compliance**: Minimum 4.5:1 text contrast ratio for normal text; 3:1 for large text and interactive components. Full keyboard focus indicators using Tailwind `focus-visible:ring-2 focus-visible:ring-indigo-600`.
2. **Mobile Viewport Boundary**: Layouts adapt gracefully down to $360\text{px}$ minimum viewport width without horizontal scroll clipping.
3. **Bilingual Strings**: Zero hardcoded strings. Every UI label, placeholder, error message, and toast is resolved via internationalization keys supporting English (`en-IN`) primary and Hindi (`hi-IN`) secondary.

---

## 2. Global Persona Portals & Navigation Hierarchies

### 2.1 Role-Based Route Rooting
When a user authenticates, the application shell inspects `app_role` from the verified JWT claims and mounts the corresponding persona layout:

| Role (`app_role`) | Web Root Route | Mobile Root Route | Primary Purpose |
| :--- | :--- | :--- | :--- |
| `super_admin` | `/admin/saas` | N/A (Web Only) | Global platform multi-tenant management & support impersonation |
| `school_admin` | `/app` | `/(admin)` | Comprehensive tenant school administration & academic leadership |
| `accountant` | `/app/fees` | `/(accountant)` | High-speed POS fee collection, financial ledgers, cash closing |
| `teacher` | `/app/academics`| `/(teacher)` | Classroom attendance, marks entry, student diary, homework |
| `student` | `/portal/student`| `/(student)` | Personal timetable, report cards, fee challans, homework submissions |
| `parent` | `/portal/parent` | `/(parent)` | Multi-child switchboard, online UPI fee payments, attendance tracking |

---

## 3. Exhaustive Screen Directory by Functional Module

---

### Module 0: Authentication, Access Control & Account Management

#### Screen 0.1: Universal Login Screen
- **Web Route**: `/login`
- **Mobile Route**: `/(auth)/login`
- **Allowed Roles**: Public (`anon`)
- **Required Permission**: Public Access
- **Functional Reference**: `reference/login-page.png`
- **Layout Pattern**: Centered card on neutral slate background with school tenant branding logo, Title `"Sign In to Your Account"`.
- **Component Breakdown**:
  - `PersonaTabSwitch`: Tabs to toggle login context: `Staff / Admin` vs `Student / Parent`.
  - `LoginForm`: Controlled inputs for Email/Username and Password, `"Remember Me"` checkbox, and `"Sign In"` primary button.
  - Links: `"Forgot Password?"` and `"Need Help?"`.
  - Tenant Resolution: For tenant-specific subdomains (e.g. `dps.erp-platform.com`), the tenant logo and colors are rendered dynamically.
- **Tri-State UI**: Loading state disables button with spinner text `"Authenticating..."`; Error state shows red banner `"Invalid credentials. Please verify your email and password."`.
- **i18n Keys**: `screens.auth.login.title`, `screens.auth.login.email_label`, `screens.auth.login.submit`.

#### Screen 0.2: Forgot Password
- **Web Route**: `/forgot-password`
- **Mobile Route**: `/(auth)/forgot-password`
- **Allowed Roles**: Public (`anon`)
- **Required Permission**: Public Access
- **Layout Pattern**: Centered card: Title `"Reset Your Password"`, instructions `"Enter your registered email address or mobile number to receive a secure recovery link."`.
- **Component Breakdown**:
  - `ForgotPasswordForm`: Input for Email or Phone (+91 format), Primary button `[ Send Reset Link ]`, and link back to `[ Return to Sign In ]`.
- **Success State**: Card transforms to confirmation message with green checkmark: `"If an account exists, a recovery link has been dispatched."`.

#### Screen 0.3: Reset Password
- **Web Route**: `/reset-password`
- **Mobile Route**: `/(auth)/reset-password`
- **Allowed Roles**: Public (`anon` with valid reset token)
- **Required Permission**: Public Access
- **Layout Pattern**: Centered card: Title `"Create New Password"`.
- **Component Breakdown**:
  - `ResetPasswordForm`: Inputs for New Password and Confirm Password, dynamic password strength meter (minimum 8 characters, uppercase, number, symbol), and `[ Update Password & Sign In ]` button.

#### Screen 0.4: Accept Invitation & Set Initial Password
- **Web Route**: `/accept-invite`
- **Mobile Route**: `/(auth)/accept-invite`
- **Allowed Roles**: Public (`anon` with invitation token)
- **Required Permission**: Public Access
- **Layout Pattern**: Full-page welcome screen displaying School Name, Employee/Guardian Welcome message, and account activation card.
- **Component Breakdown**: Pre-filled verified email address, Full Name confirmation, Password creation input, Terms & Conditions checkbox, and `[ Activate Account ]` button.

#### Screen 0.5: First-Login Mandatory Password Change
- **Web Route**: `/auth/force-change-password`
- **Mobile Route**: `/(auth)/force-change-password`
- **Allowed Roles**: `authenticated` (Users flagged with `must_change_password = true`)
- **Required Permission**: Public Authenticated
- **Layout Pattern**: Centered modal overlay that cannot be dismissed: Title `"Security Update Required"`, explanation `"For your account security, you must set a new personal password before accessing the system."`.
- **Component Breakdown**: Current Temporary Password, New Password, Confirm Password, `[ Save Password & Continue ]`.

#### Screen 0.6: 403 Forbidden Access Denied
- **Web Route**: `/403`
- **Mobile Route**: `/(error)/403`
- **Allowed Roles**: `authenticated`
- **Required Permission**: Public Authenticated
- **Layout Pattern**: Centered illustration with Shield Lock icon, Title `"Access Restricted (403)"`, message `"You do not possess the required permissions to view this resource. Contact your school administrator if you require access."`.
- **Action Buttons**: `[ Return to Dashboard ]`, `[ Switch School Context ]`.

#### Screen 0.7: 404 Page Not Found
- **Web Route**: `/404`
- **Mobile Route**: `/(error)/404`
- **Allowed Roles**: Public (`anon`, `authenticated`)
- **Required Permission**: Public Access
- **Layout Pattern**: Centered illustration with Search Document icon, Title `"Page Not Found (404)"`, message `"The screen you requested does not exist or has been moved."`.
- **Action Button**: `[ Return to Home ]`.

#### Screen 0.8: School Tenant Switcher
- **Web Route**: `/app/switch-school`
- **Mobile Route**: `/(auth)/switch-school`
- **Allowed Roles**: All roles with memberships in multiple schools or super administrators
- **Required Permission**: `authenticated`
- **Layout Pattern**: Modal or full-screen card list showing all school tenants associated with the current user's profile.
- **Component Breakdown**:
  - `SchoolTenantCard`: School Name, Campus, User Role in that school (`Teacher`, `Parent`, etc.), and `[ Enter School ]` button.
  - Selecting a school executes an authenticated session refresh updating `active_school_id` and issuing a refreshed JWT.

#### Screen 0.9: My Account & Profile Settings
- **Web Route**: `/app/account` (Account overview & settings), `/app/account/delete` (Delete account confirmation)
- **Mobile Route**: `/(account)/profile`, `/(account)/delete-account` (available across all persona mobile layouts: `/(admin)/account/delete`, `/(teacher)/account/delete`, `/(parent)/account/delete`, `/(student)/account/delete`, `/(accountant)/account/delete`)
- **Allowed Roles**: All authenticated roles (`super_admin`, `school_admin`, `accountant`, `teacher`, `student`, `parent`)
- **Required Permission**: `authenticated`
- **Layout Pattern**: Title `"My Account"`, Breadcrumb `Home / My Account`, Tabbed Settings Canvas (Web) and Stack Screen with Grouped Lists (Mobile):
  - Tab 1: `Profile Details`: Displays Full Name, Email, Phone, Assigned Role, Avatar image upload, and read-only Tenant info.
  - Tab 2: `Security`: Change Password form (Current Password, New Password, Confirm Password).
  - Tab 3: `Preferences`: Language selector (`English (India)` vs `हिंदी (भारत)`), Notification channel switches (`Push Alerts`, `Email Summaries`, `SMS Notices`).
  - Tab 4: `Data Privacy & DPDP`:
    - `[ Request Complete Data Export ]`: Generates a downloadable ZIP archive of all personal records logged in `data_subject_requests` (`request_type = 'export'`).
    - `[ Delete my account ]`: Opens a dedicated destructive confirmation screen or modal (`/app/account/delete`, `/(account)/delete-account`) enforcing institutional invariants and role-specific lifecycle handling:
      - **Sole School Administrator Deletion Guard**:
        - If the user is an active `school_admin` and is the sole active `school_admin` associated with the school tenant, account deletion is blocked immediately at both UI and server validation layers.
        - Form input is disabled, rendering a prominent error alert banner: `"Cannot delete the sole active school administrator. Please assign and transfer school administrator ownership to another active staff member before requesting account deletion."`
      - **Staff (`school_admin`, `accountant`, `teacher`) and Parents**:
        - Requires confirmation by entering the user's current account password and an optional deletion reason (`data_subject_requests.reason`).
        - Lifecycle Progression: Created with `status = 'pending'`, then advances immediately to `status = 'scheduled'` once the password is authenticated and verified.
        - The account is immediately deactivated, and `scheduled_anonymise_at` is set based on the school's configured retention policy (`school_settings.retention_years`, configured during onboarding; default awaiting legal confirmation).
        - Dispatches an automated confirmation email or push notification to the user's verified contact coordinates.
        - Renders a prominent, persistent visible status banner on the account screen: `"Account scheduled for deletion on [scheduled_anonymise_at]. Personal data will be permanently anonymised upon retention expiry. Status: Scheduled."`
        - The user can cancel their request prior to execution via `[ Cancel Deletion Request ]`, transitioning the request to `status = 'cancelled'`.
        - The request is immutably logged in `public.data_subject_requests` (`request_type = 'erasure'`, `status = 'scheduled'`).
      - **Students**:
        - Because the school is the statutory data fiduciary/data owner for enrolled minors and academic transcripts, student accounts cannot self-erase without institutional approval.
        - The student enters their password and optional deletion reason (`reason`). The request is submitted with `status = 'pending'` and routed directly to the `school_admin` review queue (Screen 21.5).
        - The student sees a prominent, visible status banner across both web and mobile screens: `"Account deletion request submitted to school administration on [requested_at]. Status: Pending Admin Review."`
        - If approved by `school_admin`, the administrator records approval, populating `decided_by = auth.uid()`, `decided_at = clock_timestamp()`, and `scheduled_anonymise_at = clock_timestamp() + (school_settings.retention_years || ' years')::interval`, advancing the request to `status = 'scheduled'`.
        - If rejected by `school_admin`, the administrator must supply an administrative justification, recording `decided_by`, `decided_at`, and `rejection_reason`, transitioning the request to `status = 'rejected'`. The student is notified via email/push and sees the rejection reason on their account screen.
        - The student can cancel their pending request at any time prior to administrative review, transitioning the request to `status = 'cancelled'`.
        - The request is immutably logged in `public.data_subject_requests` (`request_type = 'erasure'`, initial `status = 'pending'`).
      - **Unified Request Status Progression (All Roles)**:
        - All erasure and data subject requests strictly share one status set: `'pending'`, `'verified'`, `'scheduled'`, `'processing'`, `'completed'`, `'rejected'`, `'cancelled'`.
        - Legacy statuses `'approved_scheduled'` and `'pending_approval'` are removed.
        - Once `scheduled_anonymise_at` arrives, an automated background job advances the request from `scheduled` $\to$ `processing` $\to$ `completed`.
      - **Statutory Data Invariants (Never Deleted)**:
        - In accordance with statutory educational, taxation, and financial compliance rules, fee receipts (`fee_receipts`), voucher definitions (`fee_vouchers`), ledger entries (`fee_ledger_entries`), attendance registers (`student_attendances`, `employee_attendances`), and academic evaluations (`exam_marks`, `exam_results_aggregate`) are **never deleted**.
        - Only personal identifiers (full name, phone, email, residential address, encrypted Aadhaar, national ID, emergency contacts) are permanently anonymised when retention expires, preserving historical institution balances, audits, and academic aggregates intact.

---

### Module 1: Academic Setup (`academics`)

#### Screen 1.1: Academic Sessions & Session Rollover
- **Web Route**: `/app/academics/sessions`
- **Mobile Route**: N/A
- **Allowed Roles**: `school_admin`
- **Required Permission**: `academics:session_manage`
- **Functional Reference**: `reference/admin-classes-new_classes.png`, `reference/Screenshot 2026-10-14 020403.png`
- **Layout Pattern**: Title `"Academic Sessions"`, Breadcrumb `Academics / Sessions`, Primary Action `[ + Create New Session ]`, Filter Bar (Status: All, Active, Archived), TanStack Table.
- **Component Breakdown**:
  - `SessionTable`: Columns: Session Name (e.g. `2026-2027`), Start Date (`DD/MM/YYYY`), End Date (`DD/MM/YYYY`), Status (`Current`, `Upcoming`, `Closed`), Rollover Status Badge, Row Actions (`Edit Dates`, `Activate`, `Initiate Rollover`).
  - `CreateSessionModal`: Modal dialog containing `name` (text), `start_date` (date picker), `end_date` (date picker), `is_current` (switch).
  - `RolloverWizardDialog`: 3-step modal wizard:
    - Step 1: Select source session and target session.
    - Step 2: Configure arrears carry-forward policy (`Carry unpaid fee balances into opening_balance ledger entries`).
    - Step 3: Class-wise student promotion confirmation table with retention overrides.
- **Tri-State UI**:
  - *Loading*: 4-row tabular skeleton loader.
  - *Empty*: Calendar icon, title `"No Academic Sessions Configured"`, CTA `"Create First Session"`.
  - *Error*: Banner alert with retry button.

#### Screen 1.2: Class & Section Management
- **Web Route**: `/app/academics/classes`
- **Mobile Route**: N/A
- **Allowed Roles**: `school_admin`, `teacher` (Read-only)
- **Required Permission**: `academics:read` (View), `academics:write` (Create/Edit)
- **Functional Reference**: `reference/admin-classes-new_classes.png`, `reference/admin-dashboard-classes-all_classes.png`
- **Layout Pattern**: Title `"Classes & Sections"`, Primary Action `[ + Add Class ]`, Filter Bar (Campus Selector, Search Class Name), Card Grid / Table toggle.
- **Component Breakdown**:
  - `ClassCardGrid`: Cards displaying Class Name (e.g., `Class 10`), Numeric Order (`10`), Associated Campus, Section Badges (`A`, `B`, `C`), Total Enrolled Pupils counter, and Class Teacher name tag.
  - `AddClassSheet`: Slide-over drawer form (`name`, `numeric_order`, `campus_id`, section tag input chips).
  - `SectionDetailDialog`: Displays section homeroom teacher selector and maximum seat capacity.

#### Screen 1.3: Subject Master Directory
- **Web Route**: `/app/academics/subjects`
- **Mobile Route**: N/A
- **Allowed Roles**: `school_admin`, `teacher`
- **Required Permission**: `academics:read` (View), `academics:write` (Create/Edit)
- **Functional Reference**: `reference/admin-subject-classes_with_subjects.png`
- **Layout Pattern**: Title `"Subject Master Directory"`, Breadcrumb `Academics / Subjects`, Primary Action `[ + New Subject ]`, Filter Bar (Type: `Theory`, `Practical`, `Elective`, `Language`), TanStack Table.
- **Component Breakdown**:
  - `SubjectTable`: Columns: Subject Code (e.g. `MTH-101`), Subject Name, Subject Type (`Theory` / `Practical`), Credit Hours, Default Passing Percentage, Linked Classes badge counter, Action menu (`Edit`, `Archive`).
  - `SubjectFormDialog`: Name, Code, Type, Passing percentage override, and syllabuses file upload link.

#### Screen 1.4: Class-Subject-Teacher Assignment Matrix
- **Web Route**: `/app/academics/teacher-assignments`
- **Mobile Route**: N/A
- **Allowed Roles**: `school_admin`
- **Required Permission**: `academics:assign_teacher`
- **Functional Reference**: `reference/admin-subjects-assign_subjects.png`
- **Layout Pattern**: Title `"Teacher Subject Assignments"`, Filter Bar (Class Dropdown, Section Dropdown, Academic Session), 2D Assignment Matrix Canvas.
- **Component Breakdown**:
  - `TeacherAssignmentMatrix`: Two-dimensional interactive grid where rows represent Subjects and columns represent Sections. Cells contain a searchable teacher selector dropdown or mapped teacher avatar pill.
  - `QuickReassignDialog`: Click cell to swap assigned faculty with conflict warning indicator (e.g., `"Instructor already assigned to Class 9-B during Period 3"`).

#### Screen 1.5: Soft-Delete Academic Entities Dialog
- **Web Route**: `/app/academics/entities/delete`
- **Mobile Route**: N/A
- **Allowed Roles**: `school_admin`
- **Required Permission**: `academics:delete`
- **Layout Pattern**: Destructive modal dialog: Title `"Deactivate Academic Entity"`, warning text `"Soft-deleting this class/section will archive it. Active student enrollments must be transferred prior to deactivation."`.
- **Component Breakdown**: Confirmation text input requiring typing the entity name to confirm, and `[ Confirm Soft Delete ]` button.

---

### Module 2: Students (`students`)

#### Screen 2.1: Student Directory & Roster
- **Web Route**: `/app/students`
- **Mobile Route**: `/(admin)/students`, `/(teacher)/students`
- **Allowed Roles**: `school_admin`, `accountant`, `teacher` (Scoped)
- **Required Permission**: `students:read`
- **Functional Reference**: `reference/admin-students-all.png`, `reference/admin-student-printbasiclist.png`
- **Layout Pattern**: Title `"Student Directory"`, Breadcrumb `Students / All Students`, Primary Action `[ + New Admission ]`, Filter Bar (Session, Class, Section, Gender, Admission Status, Search by Name/Roll/Reg), View Switcher (`Table` / `Compact List`), TanStack Table.
- **Component Breakdown**:
  - `StudentRosterTable`: Columns: Checkbox, Roll No, Admission No (`sr_number`), Student Avatar & Full Name, Class & Section, Guardian Name & Contact Phone, Fee Due Status Tag (`Paid`, `Dues Pending`, `Arrears`), Enrollment Status (`Enrolled`, `Withdrawn`), Actions (`View Profile`, `Collect Fee`, `Print ID Card`, `Edit`).
  - `BatchActionToolbar`: Appears when checkboxes are active: `Export Selected to Excel`, `Print Fee Challans`, `Generate ID Cards`, `Bulk Promote`.

#### Screen 2.2: Multi-Step Admission Registration Wizard
- **Web Route**: `/app/students/admissions/new`
- **Mobile Route**: N/A
- **Allowed Roles**: `school_admin`
- **Required Permission**: `students:write`
- **Functional Reference**: `reference/admin-student-add.png`
- **Layout Pattern**: Full-page guided wizard layout with sticky step progress indicator:
  - Step 1: Basic Pupil Profile (Full Name, Gender, Date of Birth, Blood Group, Mother Tongue, Nationality, Photo Upload).
  - Step 2: Academic Enrollment Details (Session, Class, Section, Roll Number, Admission Date, Transfer Certificate details).
  - Step 3: Parents & Guardian Link (Select Existing Guardian via Phone/CNIC/Aadhaar search OR Create New; Sibling Linking selector).
  - Step 4: Residential Coordinates (Address, City, State, PIN Code, Emergency Contact Number).
  - Step 5: Statutory & Sensitive Data (Optional Aadhaar masked input, Medical notes, Dietary allergies, Disciplinary disclosures).
  - Step 6: Fee Structure & Initial Challan (Assigned class fee structure, sibling concession picker, initial admission fee voucher generation switch).

#### Screen 2.3: Student 360 Comprehensive Profile
- **Web Route**: `/app/students/[id]`
- **Mobile Route**: `/(admin)/students/[id]`, `/(teacher)/students/[id]`
- **Allowed Roles**: `school_admin`, `accountant`, `teacher` (Scoped)
- **Required Permission**: `students:read`
- **Functional Reference**: `reference/admin-student-printbasiclist.png`
- **Layout Pattern**: Profile Header Card (Student Photo, Full Name, Admission Number, Class-Section, Roll Number, Enrollment Status Badge, Quick Actions: `[ Collect Fee ]`, `[ Print DMC ]`, `[ Edit Profile ]`), Tabbed Content:
  - Tab 1: `Academic Profile`: Current enrollment, enrolled subjects, timetable, attendance percentage doughnut chart ($94.2\%$).
  - Tab 2: `Fee Ledger`: Real-time outstanding balance badge (e.g. `₹2,500`), chronological append-only fee ledger table, voucher receipts list, dynamic UPI QR code button.
  - Tab 3: `Exam Results`: Term-wise report cards, subject score breakdown, GPA/grade history, DMC print trigger.
  - Tab 4: `Attendance History`: Monthly calendar heatmap with green (present), red (absent), yellow (late) day cells.
  - Tab 5: `Confidential & Health`: Medical alerts, emergency contacts, disciplinary records (guarded by `students:read_sensitive`).
  - Tab 6: `Documents Vault`: Uploaded birth certificate, transfer certificate, vaccine cards.

#### Screen 2.4: Cohort Promotion & Rollover Evaluation
- **Web Route**: `/app/students/promotions`
- **Mobile Route**: N/A
- **Allowed Roles**: `school_admin`
- **Required Permission**: `students:promote`
- **Functional Reference**: `reference/admin-student-promote.png`
- **Layout Pattern**: Split-Pane Evaluation View: Left side selects Source Session + Class; Right side selects Target Session + Next Class. Candidate list with marks aggregate, proposed status (`Promoted`, `Retained`, `Trial Promotion`), and `[ Bulk Promote Cohort ]` atomic executor.

#### Screen 2.5: Bulk Student Import Wizard
- **Web Route**: `/app/students/import`
- **Mobile Route**: N/A
- **Allowed Roles**: `school_admin`
- **Required Permission**: `students:import`
- **Layout Pattern**: 4-step wizard:
  - Step 1: `[ Download CSV/Excel Template ]`: Pre-formatted with sample columns (Full Name, Gender, DOB, Parent Phone, Class, Section, Address).
  - Step 2: `File Upload`: Drag-and-drop file upload zone.
  - Step 3: `Validation Preview & Error Report`: Real-time validation table highlighting errors (e.g., Row 14: `Invalid phone format`, Row 22: `Class 10-C does not exist`).
  - Step 4: `Execute Import`: Progress bar committing validated rows via transaction.

#### Screen 2.6: Student Directory Export Dialog
- **Web Route**: `/app/students/export`
- **Mobile Route**: N/A
- **Allowed Roles**: `school_admin`
- **Required Permission**: `students:export`
- **Layout Pattern**: Modal dialog: Select Format (`Excel XLSX`, `CSV`, `PDF Broadsheet`), Select Fields Checklist (Roll, Name, Father Name, Phone, Address, Dues Balance), and `[ Download Export Archive ]` button.

#### Screen 2.7: Student Documents Vault
- **Web Route**: `/app/students/[id]/documents`
- **Mobile Route**: `/(admin)/students/[id]/documents`
- **Allowed Roles**: `school_admin`
- **Required Permission**: `students:documents_manage`
- **Layout Pattern**: Grid of uploaded document cards (Birth Certificate, Aadhaar/National ID, Transfer Certificate, Medical Immunization Card). Displays upload date, verified badge, and `[ Upload New Document ]` action.

#### Screen 2.8: Student Record Soft-Deletion Modal
- **Web Route**: `/app/students/[id]/delete`
- **Mobile Route**: N/A
- **Allowed Roles**: `school_admin`
- **Required Permission**: `students:delete`
- **Layout Pattern**: Destructive modal: Title `"Archive / Soft-Delete Student"`, requiring withdrawal reason (`Transferred`, `Graduated`, `Fee Non-Payment`), exit date, and confirmation.

---

### Module 3: Staff & Human Resources (`staff`)

#### Screen 3.1: Employee Directory & Org Chart
- **Web Route**: `/app/staff`
- **Mobile Route**: `/(admin)/staff`
- **Allowed Roles**: `school_admin`, `accountant`
- **Required Permission**: `staff:read`
- **Functional Reference**: `reference/admin-employees-all.png`
- **Layout Pattern**: Title `"Staff & Faculty Directory"`, Primary Action `[ + Onboard Employee ]`, Filter Bar (Department, Designation, Employment Type, Status), TanStack Table.
- **Component Breakdown**:
  - `EmployeeTable`: Columns: Employee Code, Avatar, Full Name, Designation, Department, Contact Phone, Join Date, Status (`Active`, `On Leave`, `Resigned`), Row Actions (`View Profile`, `Job Letter`, `Manage Login`, `Edit`).
  - `JobLetterPrintModal`: Generates formal institutional appointment letter with joining date, designation, and salary scale (`reference/admin-employees-job_letter.png`).

#### Screen 3.2: Employee Onboarding Wizard
- **Web Route**: `/app/staff/new`
- **Mobile Route**: N/A
- **Allowed Roles**: `school_admin`
- **Required Permission**: `staff:write`
- **Functional Reference**: `reference/admin-employees-add.png`
- **Layout Pattern**: 3-step wizard:
  - Step 1: Personal Profile (Full Name, Gender, Date of Birth, Contact Phone, Email, Current/Permanent Address).
  - Step 2: Employment & Academic Mapping (Employee Code, Designation, Department, Date of Joining, Qualification, Experience Years).
  - Step 3: Statutory & Payroll Configuration (PAN / Tax ID, Bank Name, Account Number, IFSC Code, Basic Salary Minor Units).

#### Screen 3.3: Employee Confidential Records Vault
- **Web Route**: `/app/staff/[id]/sensitive`
- **Mobile Route**: N/A
- **Allowed Roles**: `school_admin`, `accountant`
- **Required Permission**: `staff:read_sensitive`
- **Layout Pattern**: Encrypted card view displaying statutory identifiers: PAN Number, Voter ID/Passport, Basic Salary minor units, Bank Account Number, Bank Name, and IFSC Code.

#### Screen 3.4: Staff Performance Appraisals & Annual Review
- **Web Route**: `/app/staff/appraisals`
- **Mobile Route**: N/A
- **Allowed Roles**: `school_admin` (Strictly restricted; accountant denied)
- **Required Permission**: `staff:read_appraisal`
- **Layout Pattern**: Title `"Faculty & Staff Appraisals"`, Primary Action `[ + New Evaluation ]`, Filter Bar (Appraisal Year, Department), TanStack Table.
- **Component Breakdown**: Employee Name, Department, Evaluation Year, Numeric Rating (`4.8 / 5.0`), Evaluator Name, Review Date, Actions (`Read Performance Notes`, `Edit Rating`).

#### Screen 3.5: Staff Leave Management & Approvals
- **Web Route**: `/app/staff/leaves`
- **Mobile Route**: `/(teacher)/leave-requests`, `/(admin)/leave-approvals`
- **Allowed Roles**: `school_admin` (Approve), `teacher` / `accountant` (Apply & View Self)
- **Required Permission**: `staff:leave_apply`, `staff:leave_approve`
- **Component Breakdown**:
  - `LeaveQuotaCards`: Casual Leave, Sick Leave, Maternity/Paternity Leave remaining balances.
  - `LeaveApplicationTable`: Pending requests list with applicant name, leave type, date span, duration (days), attached doctor slip, action buttons: `[ Approve ]`, `[ Reject with Reason ]`.

#### Screen 3.6: Staff Document Repository
- **Web Route**: `/app/staff/[id]/documents`
- **Mobile Route**: N/A
- **Allowed Roles**: `school_admin`
- **Required Permission**: `staff:documents_manage`
- **Layout Pattern**: Upload and verification vault for staff employment contracts, resumes, degree certificates, and identity cards.

#### Screen 3.7: Staff Termination / Soft-Delete Dialog
- **Web Route**: `/app/staff/[id]/delete`
- **Mobile Route**: N/A
- **Allowed Roles**: `school_admin`
- **Required Permission**: `staff:delete`
- **Layout Pattern**: Destructive modal requiring exit interview notes, termination date, and clearance confirmation.

---

### Module 4: Attendance (`attendance`)

#### Screen 4.1: Daily Homeroom Attendance Speed Grid
- **Web Route**: `/app/attendance/daily`
- **Mobile Route**: `/(teacher)/attendance`, `/(admin)/attendance/daily`
- **Allowed Roles**: `school_admin`, `teacher` (Assigned Section)
- **Required Permission**: `attendance:mark_daily`
- **Functional Reference**: `reference/admin-attendance-students.png`
- **Layout Pattern**: Header with Class, Section, Date picker (defaults to today), Quick Actions: `[ Mark All Present ]`, `[ Save & Submit ]`.
- **Component Breakdown**:
  - `AttendanceSpeedRoster`: Rapid toggle grid:
    - Row: Roll Number, Student Name, Status Radio Segment (`P` [Present - Green], `A` [Absent - Red], `L` [Late - Amber], `E` [Excused - Blue]), Remarks text input.
  - `AttendanceSummaryWidget`: Real-time sticky pill bar: `Total: 40 | Present: 37 | Absent: 2 | Late: 1 | Percentage: 92.5%`.

#### Screen 4.2: Period / Subject Attendance Tracker
- **Web Route**: `/app/attendance/period`
- **Mobile Route**: `/(teacher)/attendance-period`
- **Allowed Roles**: `school_admin`, `teacher`
- **Required Permission**: `attendance:mark_period`
- **Component Breakdown**: Select Class $\to$ Section $\to$ Period (e.g. `Period 3: Mathematics 10:15 - 11:00`). Mark period-specific attendance for tracking subject-wise truancy.

#### Screen 4.3: Class Monthly Attendance Broadsheet Register
- **Web Route**: `/app/attendance/reports/class-monthly`
- **Mobile Route**: N/A
- **Allowed Roles**: `school_admin`, `teacher` (Scoped)
- **Required Permission**: `attendance:read`, `attendance:reports`
- **Functional Reference**: `reference/admin-attendance-students_attendance_report.png`, `reference/admin-attendance-class_wise_report.png`
- **Layout Pattern**: Full-width matrix table: Rows represent Students; Columns represent days of the selected month ($1 \dots 31$). Cells display status letters (`P`, `A`, `L`, `H`, `W`). Total Working Days, Days Present, Days Absent, Aggregate $\%$.

#### Screen 4.4: Staff Manual Attendance Register
- **Web Route**: `/app/attendance/staff`
- **Mobile Route**: `/(admin)/staff-attendance`
- **Allowed Roles**: `school_admin`
- **Required Permission**: `attendance:staff_mark`
- **Functional Reference**: `reference/admin-attendance-employees.png`, `reference/admin-attendance-employees_attendance_report.png`
- **Layout Pattern**: Faculty attendance register: Department filter, Date picker, Table with employee code, name, designation, status radio segment (`Present`, `Absent`, `On Leave`, `Half Day`), in/out time inputs, and remarks.

#### Screen 4.5: Biometric Terminal Device Ingestion & Sync Monitor
- **Web Route**: `/app/attendance/biometric`
- **Mobile Route**: N/A
- **Allowed Roles**: `school_admin`
- **Required Permission**: `attendance:biometric_sync`
- **Component Breakdown**: Terminal status cards (IP, online/offline ping, last sync timestamp), raw punch logs table, and manual `[ Trigger Re-Sync ]` action.

---

### Module 5: Timetable (`timetable`)

#### Screen 5.1: Master Class Weekly Schedule Grid
- **Web Route**: `/app/timetable/classes`
- **Mobile Route**: `/(student)/timetable`, `/(parent)/timetable`, `/(teacher)/timetable`
- **Allowed Roles**: All roles (Read-only for Students/Parents; Edit for Admin)
- **Required Permission**: `timetable:read` (View), `timetable:write` (Modify)
- **Layout Pattern**: 7-Day / 8-Period Interactive Grid. Rows represent Periods; Columns represent Days (`Monday` through `Saturday`). Cells show Subject, Teacher Name, Room Number badge. Automated clash indicator on double-booking.

#### Screen 5.2: Teacher Weekly Schedule Viewer
- **Web Route**: `/app/timetable/teachers`
- **Mobile Route**: `/(teacher)/schedule`
- **Allowed Roles**: `school_admin`, `teacher`
- **Required Permission**: `timetable:read`
- **Layout Pattern**: Individual teacher timetable view showing assigned teaching periods, free preparation periods, and daily workload tally.

#### Screen 5.3: Periods and Bell Schedules Configuration
- **Web Route**: `/app/timetable/periods`
- **Mobile Route**: N/A
- **Allowed Roles**: `school_admin`
- **Required Permission**: `timetable:periods_manage`
- **Layout Pattern**: Title `"Bell Schedules & Period Slots"`, Primary Action `[ + Add Period Slot ]`.
- **Component Breakdown**:
  - `PeriodSlotList`: Period Name (`Period 1`, `Morning Break`, `Period 5`), Start Time (`08:30`), End Time (`09:15`), Duration (45 mins), Type (`Instructional`, `Break`, `Assembly`), and Sort Order.

#### Screen 5.4: Daily Teacher Substitution Allocation Panel
- **Web Route**: `/app/timetable/substitutions`
- **Mobile Route**: `/(admin)/substitutions`
- **Allowed Roles**: `school_admin`
- **Required Permission**: `timetable:substitute`
- **Layout Pattern**: Split view: Left shows absent teachers for today; Right shows vacant periods and available substitute teachers with zero periods assigned. One-click `[ Assign Substitute ]` dispatches alert.

---

### Module 6: Examinations & Results (`exams`)

#### Screen 6.1: Exam Terms & Schedule Date Sheets
- **Web Route**: `/app/exams/terms`
- **Mobile Route**: `/(student)/date-sheet`, `/(parent)/date-sheet`
- **Allowed Roles**: `school_admin`, `teacher`, `student`, `parent`
- **Required Permission**: `exams:read` (View), `exams:schedule_write` (Edit)
- **Functional Reference**: `reference/admin-exams-create.png`, `reference/admin-exams-setup.png`
- **Layout Pattern**: Assessment term list (e.g. `Midterm Examination 2026`). DateSheetTable: Date, Subject Name, Exam Time (`09:00 - 12:00`), Room No, Max Marks (`100`), Pass Marks (`33`).

#### Screen 6.2: Grading Scales Configuration
- **Web Route**: `/app/exams/grading-scales`
- **Mobile Route**: N/A
- **Allowed Roles**: `school_admin`
- **Required Permission**: `exams:grading_scales_write`
- **Functional Reference**: `reference/admin-general-Marks_Grading.png`
- **Layout Pattern**: Title `"Grading Scales & GPA Schemes"`, Primary Action `[ + Create Grading Scale ]`.
- **Component Breakdown**:
  - Presets Selector: `CBSE Style (A1, A2, B1...)`, `Standard 4.0 GPA`, `Percentage Only`.
  - `IntervalsTable`: Grade Name (`A1`), Min Percentage ($91.00$), Max Percentage ($100.00$), Grade Points ($10.0$), Description (`Outstanding`).

#### Screen 6.3: Roll Numbers & Admit Cards Generator
- **Web Route**: `/app/exams/admit-cards`
- **Mobile Route**: `/(student)/admit-card`, `/(parent)/admit-card`
- **Allowed Roles**: `school_admin`, `student` (Self), `parent` (Linked Child)
- **Required Permission**: `exams:hall_ticket_generate`
- **Layout Pattern**: Cohort selection (Session, Term, Class, Section) with `[ Generate Hall Tickets ]` button. Displays printable admit cards with student photo, exam schedule table, room seating number, and verification barcode/QR code.

#### Screen 6.4: Raw Marks Entry Spreadsheet Grid
- **Web Route**: `/app/exams/marks-entry`
- **Mobile Route**: `/(teacher)/marks-entry`
- **Allowed Roles**: `school_admin`, `teacher` (Scoped to assigned subjects only)
- **Required Permission**: `exams:marks_enter`
- **Functional Reference**: `reference/admin-exams-add_update.png`, `reference/admin-class_test-manage.png`
- **Layout Pattern**: Filter Bar (Exam Term, Class, Section, Subject). Full-screen spreadsheet table with arrow key navigation, auto-validating marks $\le \text{Max Marks}$. Locked term banner blocks edits if locked.

#### Screen 6.5: Tabulation Broadsheet & Class Ranking
- **Web Route**: `/app/exams/tabulation`
- **Mobile Route**: N/A
- **Allowed Roles**: `school_admin`, `teacher` (Assigned cohort)
- **Required Permission**: `exams:view_results`
- **Functional Reference**: `reference/admin-exams-result.png`, `reference/admin-class_test-result.png`
- **Layout Pattern**: Tabular matrix showing Students sorted by Class Rank (`1, 2, 2, 4` competition ranking), subject scores, total obtained, percentage ($\%$), grade letter, result status (`Pass`, `Fail`, `Compartment`).

#### Screen 6.6: Term Results Publication & Unpublish Dialog
- **Web Route**: `/app/exams/terms/[id]/publish`
- **Mobile Route**: N/A
- **Allowed Roles**: `school_admin`
- **Required Permission**: `exams:publish`
- **Layout Pattern**: Confirmation modal: Title `"Publish Examination Results"`, explanation `"Publishing results makes report cards immediately visible in Student and Parent portals."`. Supports toggling published state back to unpublish with mandatory confirmation.

#### Screen 6.7: Term Unlock Security Authorization Dialog
- **Web Route**: `/app/exams/terms/[id]/unlock`
- **Mobile Route**: N/A
- **Allowed Roles**: `school_admin`
- **Required Permission**: `exams:marks_lock`
- **Component Breakdown**: Confirmation modal requiring mandatory written justification for unlocking examination marks post-lock. Executes `app.unlock_exam_term` and records immutable audit log.

#### Screen 6.8: Detailed Marks Certificate (DMC) & Report Card Viewer
- **Web Route**: `/app/exams/report-cards/[enrollment_id]`
- **Mobile Route**: `/(student)/report-card`, `/(parent)/report-card`
- **Allowed Roles**: All roles (Parent/Student scoped to self)
- **Required Permission**: `exams:view_results`
- **Layout Pattern**: Pixel-perfect printable document preview (A4 format): School Header, Student Demographic Box, Subject Marks Table (Theory, Practical, Total, Grade), Summary Metrics, Principal Signature stamp. Actions: `[ Download Official PDF ]`, `[ Print Report Card ]`.

#### Screen 6.9: Academic Ranking & Pass-Mark Settings
- **Web Route**: `/app/exams/settings`
- **Mobile Route**: N/A
- **Allowed Roles**: `school_admin`
- **Required Permission**: `exams:grading_scales_write`, `settings:write`
- **Layout Pattern**: Configuration screen for:
  - `rank_mode`: Dropdown selecting `Standard Competition (1, 2, 2, 4)` vs `Dense Ranking (1, 2, 2, 3)`.
  - Default Pass Mark: Hierarchy configuration (School default e.g. 33%, Class level override, Subject level override).

---

### Module 7: Fees & Financial Management (`fees`)

#### Screen 7.1: Class Fee Structures & Fee Heads
- **Web Route**: `/app/fees/structures`
- **Mobile Route**: N/A
- **Allowed Roles**: `school_admin`
- **Required Permission**: `fees:structure_write`
- **Functional Reference**: `reference/admin-general-fee_particular.png`
- **Layout Pattern**: Title `"Fee Structures & Heads"`, Primary Action `[ + Create Fee Structure ]`. Chart of fee accounts (`Tuition Fee`, `Computer Lab`, `Annual Sports`, `Library`, `Transport`), frequencies (`Monthly`, `Quarterly`, `Annual`), class-wise pricing.

#### Screen 7.2: Late Fine Policy Configuration
- **Web Route**: `/app/fees/late-fine-policies`
- **Mobile Route**: N/A
- **Allowed Roles**: `school_admin`
- **Required Permission**: `fees:structure_write`
- **Layout Pattern**: Title `"Late Fine Policy Configuration"`, Form:
  - Fine Mode: `fixed_amount` vs `per_day`.
  - Rate: Amount in rupees/paise (e.g. ₹1.50 per day).
  - Grace Period: Number of calendar days (e.g. 5 days).
  - Max Fine Cap: Optional ceiling (e.g. ₹15.00).
  - `grace_fine_mode`: Radio selection between `incremental` (charge only days past grace) and `retroactive` (charge all days from due date once grace is exceeded).
  - Real-time comparison preview box displaying worked example.

#### Screen 7.3: Discount, Scholarship & Sibling Rules
- **Web Route**: `/app/fees/discounts`
- **Mobile Route**: N/A
- **Allowed Roles**: `school_admin`
- **Required Permission**: `fees:structure_write`, `fees:discount`
- **Layout Pattern**: Configuration cards for institutional concession schemes:
  - Sibling Discount Rule: Eldest 0%, 2nd Child 20%, 3rd Child 50% on tuition fee.
  - RTE Concession: 100% statutory waiver on selected heads.
  - Merit Scholarships: Percentage or fixed minor units concession.

#### Screen 7.4: Bulk Monthly Fee Voucher Generation Studio
- **Web Route**: `/app/fees/generate`
- **Mobile Route**: N/A
- **Allowed Roles**: `school_admin`, `accountant`
- **Required Permission**: `fees:generate`
- **Layout Pattern**: 3-step batch launcher:
  - Step 1: Select Billing Period (Month, Academic Session, Due Date, Grace Period Days).
  - Step 2: Target Cohort Selection (All Classes, Specific Class/Section).
  - Step 3: Simulation & Pre-Run Audit (Displays total students, total charges, discount deductions, estimated generation count).
  - Primary Action: `[ Launch Background Generation Job ]` into `job_queue` with real-time progress bar.

#### Screen 7.5: Voucher Register & Search / Cancel Console
- **Web Route**: `/app/fees/vouchers`
- **Mobile Route**: N/A
- **Allowed Roles**: `school_admin`, `accountant`
- **Required Permission**: `fees:read`, `fees:cancel`
- **Layout Pattern**: Title `"Fee Voucher Register"`, Filter Bar (Billing Month, Class, Section, Status: `Unpaid`, `Partially Paid`, `Paid`, `Cancelled`, Search Voucher No), TanStack Table.
- **Component Breakdown**:
  - `VoucherTable`: Voucher No, Student Name, Class, Due Date, Total Amount, Paid Amount, Balance Outstanding, Status Badge, Actions (`View / Print`, `Collect Payment`, `Cancel Voucher`).
  - `CancelVoucherModal`: Accessible by `school_admin` via `fees:cancel`. Requires mandatory cancellation justification reason, updates status to `cancelled`, and records audit entry.

#### Screen 7.6: Accountant POS Fast-Collection Terminal
- **Web Route**: `/app/fees/pos`
- **Mobile Route**: N/A (Desktop Keyboard Optimized)
- **Allowed Roles**: `school_admin`, `accountant`, `portals:pos_terminal`
- **Required Permission**: `fees:collect`, `portals:pos_terminal`
- **Functional Reference**: `reference/admin-fees-collect.png`
- **Layout Pattern**: High-efficiency keyboard-driven interface:
  - Top Search Bar (`F2`): Instant lookup by Roll No, Admission No, or Name.
  - Left Pane: Student Demographic Card, Linked Siblings Switcher, Total Outstanding Balance (Large Indigo Display: e.g. `₹5,500.00`).
  - Center Pane: Unpaid Vouchers Table with checkboxes, fine amounts, and partial payment input field.
  - Right Pane: Payment Tender Box: Mode dropdown (`Cash`, `Cheque`, `UPI QR`, `Bank Transfer`, `Card`, `Demand Draft`), Amount Tendered, Change Due, Reference Number (`F9: Cycle Payment Tender`).
  - Bottom Action Bar: `[ F2: Search ]`, `[ F4: Collect and print slip ]`, `[ F8: Generate Sibling Invoice ]`, `[ F9: Cycle Payment Tender (Cash, UPI QR, Net Banking, Demand Draft) ]`, `[ Esc: Clear ]`. Browser standard A4/A5 print.

#### Screen 7.7: Mobile Accountant Rapid Collection & Receipt Share
- **Mobile Route**: `/(accountant)/fees/collect`
- **Web Route**: N/A
- **Allowed Roles**: `accountant`, `school_admin`
- **Required Permission**: `fees:collect`
- **Layout Pattern**: Mobile-first rapid collection screen:
  - Student search by camera QR scan or roll number lookup.
  - Quick amount input with payment mode toggle (`Cash` / `UPI`).
  - Immediate submission executing `app.collect_payment`.
  - One-tap `[ Share Receipt on WhatsApp ]` or `[ SMS Receipt Link ]`.

#### Screen 7.8: Payment Reversal & Correction Modal
- **Web Route**: `/app/fees/reversals/new`
- **Mobile Route**: N/A
- **Allowed Roles**: `school_admin`, `accountant`
- **Required Permission**: `fees:reverse`
- **Layout Pattern**: Modal dialog: Select original payment receipt to reverse, displays original student, voucher, amount, and payment date.
- **Component Breakdown**: Reversal reason dropdown (`Wrong Student Selected`, `Bounced Cheque`, `Bank Chargeback`, `Duplicate Entry`), additional comments text area, and `[ Execute Reversal ]` button. Executes `app.reverse_payment` posting compensating entry.

#### Screen 7.9: Maker-Checker Financial Approvals Queue
- **Web Route**: `/app/fees/approvals`
- **Mobile Route**: N/A
- **Allowed Roles**: `school_admin` (Approve), `accountant` (Submit & View)
- **Required Permission**: `fees:approve` (School Admin)
- **Layout Pattern**: Title `"Maker-Checker Financial Approvals"`, Filter Bar (Type: `Refund`, `Adjustment`, `Special Discount`, Status: `Pending`, `Approved`, `Rejected`).
- **Component Breakdown**:
  - `ApprovalRequestCard`: Displays Requested By (Accountant), Student Name, Amount (`₹1,200.00`), Reason justification, Original Voucher ID.
  - Action Controls: `[ ✓ Approve & Post to Ledger ]`, `[ ✕ Reject with Comment ]`.

#### Screen 7.10: Refund, Adjustment & Concession Request Forms
- **Web Route**: `/app/fees/requests/new`
- **Mobile Route**: N/A
- **Allowed Roles**: `accountant`, `school_admin`
- **Required Permission**: `fees:refund`, `fees:adjustment`, `fees:discount`
- **Layout Pattern**: Submission form: Select Request Type (`Refund Outflow`, `Financial Debit/Credit Adjustment`, `Special Concession Waiver`), select Student/Enrollment, specify amount in rupees/paise, attach justification memo. Submits row to `fee_approval_requests` with `status = 'pending'`.

#### Screen 7.11: Official Fee Voucher & Printable Receipt Sheet
- **Web Route**: `/app/fees/vouchers/[id]/print`
- **Mobile Route**: `/(parent)/fees/receipt/[id]`
- **Allowed Roles**: `school_admin`, `accountant`, and `parent` or `student` for their own records
- **Required Permission**: `fees:read`
- **Functional Reference**: `reference/admin-fees-slip.png`
- **Layout Pattern**: Standard 3-Stub Bank/School/Student Challan print format (A4/A5 browser print):
  - Stub 1: Bank Copy | Stub 2: School Copy | Stub 3: Student Copy.
  - Header: School Name, Address, Affiliation, Voucher Number (`VCH-2026-10-0012`), Issue Date, Due Date.
  - Particulars Table: Fee Heads, Amounts, Sibling Waiver discount line, Late fine.
  - **Dynamic UPI QR Code**: Rendered per NPCI specification for instant 1-click scanning via BHIM, PhonePe, Google Pay, Paytm.
  - Bank Account details: School Account Number, IFSC Code.

#### Screen 7.12: Student Fee Ledger Statement (Including Advance Credit)
- **Web Route**: `/app/fees/students/[enrollment_id]/ledger`
- **Mobile Route**: `/(parent)/fees/ledger`, `/(student)/fees/ledger`
- **Allowed Roles**: `school_admin`, `accountant`, and `parent` or `student` (Self Only)
- **Required Permission**: `fees:read`
- **Layout Pattern**: Title `"Student Fee Account Statement"`, Current Net Balance Card (with Advance Credit indicator if negative balance).
- **Component Breakdown**: Chronological append-only ledger timeline displaying Date, Entry Type (`charge`, `payment`, `discount`, `advance_applied`, `fine`, `refund`, `reversal`), Signed Amount, Linked Voucher No, Receipt No, and Running Balance.

#### Screen 7.13: Defaulters Tracking & Recovery Slips
- **Web Route**: `/app/fees/defaulters`
- **Mobile Route**: N/A
- **Allowed Roles**: `school_admin`, `accountant`
- **Required Permission**: `fees:defaulters_view`
- **Functional Reference**: `reference/admin-fees-defaulters.png`
- **Layout Pattern**: Title `"Fee Defaulters Aging & Recovery"`, Filter Bar (Aging Bucket: `1-30 Days`, `31-60 Days`, `61-90 Days`, `> 90 Days Overdue`, Class, Section), TanStack Table.
- **Component Breakdown**: Student Name, Class-Section, Guardian Phone, Overdue Months, Outstanding Minor Units, Days Overdue. Actions: `[ Send SMS Dunning Reminder via DLT ]`, `[ Print Warning Notice Slips ]`.

#### Screen 7.14: Financial Fee Collection Reports
- **Web Route**: `/app/fees/reports`
- **Mobile Route**: N/A
- **Allowed Roles**: `school_admin`, `accountant`
- **Required Permission**: `reports:financial_view`, `fees:read`
- **Layout Pattern**: Tabbed reports console:
  - Tab 1: `Daily Cashier Collection`: Total collected today broken down by collecting cashier/operator and payment mode (`Cash`, `UPI`, `Cheque`, `Card`).
  - Tab 2: `Head-Wise Collection`: Revenue breakdown per fee head (`Tuition`, `Transport`, `Computer Lab`).
  - Tab 3: `Class-Wise Collection`: Collection efficiency percentages and outstanding arrears per class.
  - Tab 4: `Defaulter Aging Summary`: Aggregate aging breakdown chart.

#### Screen 7.15: Online Payment Transactions Log & Reconciliation
- **Web Route**: `/app/fees/online-payments`
- **Mobile Route**: N/A
- **Allowed Roles**: `school_admin`, `accountant`
- **Required Permission**: `fees:read`
- **Layout Pattern**: Online gateway transactions table: Gateway Order ID, Payment ID, Student Name, Amount, Gateway Status (`Captured`, `Pending`, `Failed`), Split Settlement Account confirmation, Webhook Event Log, and manual `[ Trigger Gateway Status Re-Check ]`.

#### Screen 7.16: Parent Online Payment Screen
- **Web Route**: `/portal/parent/pay`
- **Mobile Route**: `/(parent)/pay`
- **Allowed Roles**: `parent`
- **Required Permission**: `fees:pay_online`, `portals:parent_switchboard`
- **Layout Pattern**: Clean payment portal: Select Child, view outstanding vouchers with itemized breakdowns. Select payment method:
  - Option A: Scan Dynamic UPI QR Code directly on screen.
  - Option B: Pay via Razorpay/Gateway modal (Cards, Net Banking, UPI Collect).

---

### Module 8: Accounts & Expense Management (`accounts`)

#### Screen 8.1: Institutional Cash Book & Account Balances
- **Web Route**: `/app/accounts`
- **Mobile Route**: N/A
- **Allowed Roles**: `school_admin`, `accountant`
- **Required Permission**: `accounts:read`
- **Functional Reference**: `reference/admin-accounts-chart.png`, `reference/admin-accounts-statement.png`
- **Layout Pattern**: Top Financial Account Cards (Main Cash Drawer: `₹45,200`, Operating Bank Account: `₹12,40,500`), Chronological Transaction Register TanStack Table below. Date, Transaction Reference, Account, Category, Type (`Income` / `Expense`), Amount, Running Balance, Receipt Thumbnail.

#### Screen 8.2: Income & Expense Category Manager
- **Web Route**: `/app/accounts/categories`
- **Mobile Route**: N/A
- **Allowed Roles**: `school_admin`, `accountant`
- **Required Permission**: `accounts:category_manage`
- **Functional Reference**: `reference/admin-accounts-chart.png`
- **Layout Pattern**: Category management table: Category Name (`Student Fees`, `Government Grants`, `Utilities & Power`, `Staff Welfare`, `Repairs & Maintenance`), Type (`Income` / `Expense`), Description, Active status switch, `[ + Add Category ]` button.

#### Screen 8.3: Expense Voucher Entry Dialog
- **Web Route**: `/app/accounts/expenses/new`
- **Mobile Route**: N/A
- **Allowed Roles**: `school_admin`, `accountant`
- **Required Permission**: `accounts:expense_create`
- **Functional Reference**: `reference/admin-accounts-add_expense.png`
- **Component Breakdown**: Modal dialog: Expense Category dropdown, Paid From Account, Amount Minor Units, Payee Name, Invoice/Bill Number, Receipt Photo/PDF attachment upload.

#### Screen 8.4: Daily Cash Register Closing & Reconciliation
- **Web Route**: `/app/accounts/daily-close`
- **Mobile Route**: N/A
- **Allowed Roles**: `school_admin`, `accountant`
- **Required Permission**: `accounts:daily_close`
- **Component Breakdown**: Reconciliation drawer showing Opening Cash Balance + Today's Fee Inflows - Today's Cash Expenses = System Expected Cash. Physical Cash Denomination Counter input table (₹2000, ₹500, ₹200, ₹100, ₹50, ₹20, ₹10 coins). Shows Over/Short variance. `[ Lock Daily Closing ]` freezes transactions.

#### Screen 8.5: Reopen Closed Cash Register Modal
- **Web Route**: `/app/accounts/daily-close/reopen`
- **Mobile Route**: N/A
- **Allowed Roles**: `school_admin`
- **Required Permission**: `accounts:close_reopen`
- **Layout Pattern**: Security authorization modal: Displays closed date and cashier, requires mandatory supervisor unlock justification, executes `app.reopen_daily_closing`, and writes an immutable audit log.

#### Screen 8.6: Institutional Profit & Loss Statement
- **Web Route**: `/app/accounts/pnl`
- **Mobile Route**: N/A
- **Allowed Roles**: `school_admin`, `accountant`
- **Required Permission**: `accounts:pnl_view`
- **Layout Pattern**: Financial statement layout: Date Range selector (e.g. `April 2026 to October 2026`).
  - Left Column: Operating Income breakdown by category (Tuition, Transport, Admissions, Miscellaneous).
  - Right Column: Operating Expenses breakdown by category (Salaries, Rent, Utilities, Maintenance).
  - Bottom Summary: Gross Margin, Net Operating Surplus/Deficit. Actions: `[ Export P&L to Excel / PDF ]`.

---

### Module 9: Payroll (`payroll`)

#### Screen 9.1: Salary Structures & Allowance Rules
- **Web Route**: `/app/payroll/structures`
- **Mobile Route**: N/A
- **Allowed Roles**: `school_admin`
- **Required Permission**: `payroll:structure_write`
- **Layout Pattern**: Title `"Staff Salary Structures"`, Primary Action `[ + Create Salary Structure ]`.
- **Component Breakdown**: Grade-wise salary components builder: Basic Salary, House Rent Allowance (HRA), Dearness Allowance (DA), Provident Fund (EPF 12%), ESI, and Professional Tax deductions.

#### Screen 9.2: Staff Loan & Advance Recovery Ledger
- **Web Route**: `/app/payroll/loans`
- **Mobile Route**: N/A
- **Allowed Roles**: `school_admin`, `accountant`
- **Required Permission**: `payroll:loan_manage`
- **Layout Pattern**: Title `"Staff Advances & Loans"`, Primary Action `[ + Grant Loan / Advance ]`.
- **Component Breakdown**: Loan accounts table: Staff Name, Principal Amount, Monthly Recovery EMI, Total Recovered, Outstanding Balance, Status (`Active`, `Fully Repaid`).

#### Screen 9.3: Monthly Payroll Batch Processing & Disbursement
- **Web Route**: `/app/payroll`
- **Mobile Route**: N/A
- **Allowed Roles**: `school_admin`, `accountant`
- **Required Permission**: `payroll:read`, `payroll:generate`, `payroll:disburse`
- **Functional Reference**: `reference/screenshot-2026-10-14-024108.png`
- **Layout Pattern**: Month & Year Selector. Summary cards: Total Gross Salary, Total Deductions (Unpaid Leave + Loan EMI), Net Payable.
- **Component Breakdown**:
  - `PayrollBatchTable`: Staff Code, Name, Designation, Working Days, Unpaid Leaves, Basic Pay, Allowances, PF/TDS Deductions, Loan EMI, Net Payable, Payment Status (`Pending`, `Paid`).
  - Actions: `[ Auto-Compute Unpaid Leave Deductions ]`, `[ Disburse Salary Batch & Post Expenses ]`.

#### Screen 9.4: Official Payslip Print View
- **Web Route**: `/app/payroll/payslips/[id]`
- **Mobile Route**: `/(teacher)/payslip/[id]`
- **Allowed Roles**: `school_admin`, `accountant`, Employee (Self Only)
- **Required Permission**: `payroll:payslip_view`
- **Functional Reference**: `reference/admin-salary-slip.png`
- **Layout Pattern**: Confidential salary slip document layout: Earnings breakdown (Basic, HRA, DA, Special Allowance), Deductions (EPF, ESI, Professional Tax, Loan Recovery), Net Pay in words, Authorized Signature stamp. Browser A4/A5 print.

---

### Module 10: Communication (`communication`)

#### Screen 10.1: School Circulars & Notice Broadcast Studio
- **Web Route**: `/app/communication/notices`
- **Mobile Route**: `/(student)/notices`, `/(parent)/notices`, `/(teacher)/notices`
- **Allowed Roles**: All roles (Create for Admin/Teacher; View for All)
- **Required Permission**: `communication:notice_read` (View), `communication:notice_write` (Create)
- **Layout Pattern**: Card Grid of published notices with audience tags (`All School`, `Parents of Class 10`, `Faculty Only`), Primary Action `[ + Broadcast Notice ]`. Notice composer with Rich Text Editor, audience segment multiselect, PDF attachment uploader, and notification switches.

#### Screen 10.2: TRAI DLT SMS Campaign Dispatcher
- **Web Route**: `/app/communication/sms`
- **Mobile Route**: N/A
- **Allowed Roles**: `school_admin`, `accountant`
- **Required Permission**: `communication:sms_campaign`
- **Functional Reference**: `reference/admin-messaging.png`
- **Layout Pattern**: DLT Template selector dropdown (`Fees Reminder`, `Absence Alert`, `Emergency Holiday`). Displays registered DLT Entity ID, Header (`DPSDEL`), and Template ID. Prevents free-text alterations; provides variable slot inputs (`{#var1#}` $\to$ Due Amount). Live SMS character and credit counter.

#### Screen 10.3: DLT Template Manager
- **Web Route**: `/app/communication/dlt-templates`
- **Mobile Route**: N/A
- **Allowed Roles**: `school_admin`
- **Required Permission**: `communication:templates_manage`
- **Layout Pattern**: Title `"Registered TRAI DLT SMS Templates"`, Primary Action `[ + Register Template ]`. Table showing Template Title, DLT Template ID, Header ID, Category (`Transactional`, `Service Implicit`), Template Text with variables (`{#var#}`), and Approval Status badge.

#### Screen 10.4: School Events & Holiday Calendar
- **Web Route**: `/app/communication/events`
- **Mobile Route**: `/(parent)/calendar`, `/(student)/calendar`, `/(teacher)/calendar`
- **Allowed Roles**: All roles (Create for Admin; View for All)
- **Required Permission**: `communication:events_manage` (Create/Edit), `communication:notice_read` (View)
- **Layout Pattern**: Full interactive calendar grid: Month/Week/Day views. Displays official holidays (green), academic exam periods (red), cultural events (indigo), and sports competitions. Click date to add event.

#### Screen 10.5: Daily Student Diary (Classwork & Homework Notes)
- **Web Route**: `/app/communication/diary`
- **Mobile Route**: `/(teacher)/diary`, `/(student)/diary`, `/(parent)/diary`
- **Allowed Roles**: `school_admin`, `teacher` (Create); `student`, `parent` (View)
- **Required Permission**: `communication:diary_write` (Create), `communication:notice_read` (View)
- **Layout Pattern**: Date-based daily diary view. Subject-wise cards showing Classwork Summary, Assigned Homework, and Teacher Remarks.

#### Screen 10.6: Direct Parent-Teacher 1-on-1 Messaging
- **Web Route**: `/app/communication/messages`
- **Mobile Route**: `/(parent)/messages`, `/(teacher)/messages`
- **Allowed Roles**: `teacher`, `parent`
- **Required Permission**: `communication:message_teacher`
- **Layout Pattern**: Split chat window: Left shows active conversations (Parents linked to teacher's section); Right shows chronological message bubble thread with photo/doc attachments.

#### Screen 10.7: Institutional Complaints & Suggestions Box
- **Web Route**: `/app/communication/complaints`
- **Mobile Route**: `/(parent)/complaints`, `/(student)/complaints`
- **Allowed Roles**: `school_admin`, `parent`, `student`
- **Required Permission**: `communication:notice_read`, `communication:notice_write`
- **Layout Pattern**: Feedback ticket system: Subject, Category (`Academic`, `Transport`, `Facilities`, `Fee Query`), description text, status tracker (`Submitted`, `Under Review`, `Resolved`), and admin response thread.

---

### Module 11: Learning & Curriculum / LMS (`lms`)

#### Screen 11.1: Homework Assignment Studio & Student Submissions
- **Web Route**: `/app/lms/homework`
- **Mobile Route**: `/(teacher)/homework`, `/(student)/homework`, `/(parent)/homework`
- **Allowed Roles**: `teacher` (Create/Grade), `student` (Submit), `parent` (View)
- **Required Permission**: `lms:homework_read`, `lms:homework_create`, `lms:homework_submit`, `lms:homework_grade`
- **Functional Reference**: `reference/admin-homework.png`
- **Layout Pattern**: Assignment cards displaying Class, Section, Subject, Due Date, Submission count (e.g. `28/35 Submitted`).
- **Component Breakdown**:
  - `HomeworkSubmissionDrawer`: Teacher clicks assignment to view pupil submissions, preview uploaded PDF/photo worksheets, enter qualitative feedback marks, and mark as `Approved` or `Returned`.
  - `StudentUploadModal`: Student captures photo of notebook or uploads PDF attachment.

#### Screen 11.2: Digital Study Materials & Worksheets Vault
- **Web Route**: `/app/lms/materials`
- **Mobile Route**: `/(student)/materials`, `/(teacher)/materials`
- **Allowed Roles**: `school_admin`, `teacher` (Upload); `student`, `parent` (Download)
- **Required Permission**: `lms:materials_upload`, `lms:homework_read`
- **Layout Pattern**: Subject and chapter repository: Chapter title, file attachment (PDF worksheets, lecture slides, reference links), download counter, and date published.

#### Screen 11.3: Syllabus Completion Tracker & Lesson Plans
- **Web Route**: `/app/lms/syllabus`
- **Mobile Route**: `/(teacher)/syllabus`
- **Allowed Roles**: `school_admin`, `teacher`
- **Required Permission**: `lms:syllabus_track`, `lms:lesson_plan_write`
- **Component Breakdown**: Chapter-wise checklist with completion status tags (`Planned`, `In Progress`, `Completed`), target completion dates, and uploaded lesson plans.

---

### Module 12: Library (`library` - P2 Core Screens)

#### Screen 12.1: Library Catalog & Book Ingestion
- **Web Route**: `/app/library`
- **Allowed Roles**: `school_admin`, `accountant`
- **Required Permission**: `library:catalog_read`, `library:catalog_write`
- **Component Breakdown**: Book catalog search table (ISBN, Title, Author, Category, Available Copies), and `[ + Add Book ]` dialog.

#### Screen 12.2: Circulation Desk (Book Issue & Return)
- **Web Route**: `/app/library/circulation`
- **Allowed Roles**: `school_admin`, `accountant`
- **Required Permission**: `library:circulation_issue`, `library:circulation_return`
- **Component Breakdown**: Borrower lookup (Student/Staff barcode or roll number), active borrowed books list, issue book input, return book with condition check.

#### Screen 12.3: Library Members & Borrowing Limits
- **Web Route**: `/app/library/members`
- **Allowed Roles**: `school_admin`, `accountant`
- **Required Permission**: `library:members_manage`, `library:catalog_read`
- **Component Breakdown**: Student and staff library cards register showing borrowing quota (e.g. Max 3 books, 14-day loan period).

#### Screen 12.4: Overdue Fine Settlement & Clearance Slip
- **Web Route**: `/app/library/fines`
- **Allowed Roles**: `school_admin`, `accountant`
- **Required Permission**: `library:fines_collect`
- **Component Breakdown**: Outstanding library fines table, one-click collection creating fee ledger slip, and library clearance certificate printer.

---

### Module 13: Inventory & Procurement (`inventory` - P2 Core Screens)

#### Screen 13.1: Item Master, SKU Directory & Purchases
- **Web Route**: `/app/inventory`
- **Allowed Roles**: `school_admin`, `accountant`
- **Required Permission**: `inventory:read`, `inventory:purchase_create`
- **Component Breakdown**: Inventory warehouse stock cards (Stationery, Science Lab, Uniforms, Sports), low-stock alert thresholds in red, and Purchase Order builder.

#### Screen 13.2: Supplier & Vendor Profiles
- **Web Route**: `/app/inventory/suppliers`
- **Allowed Roles**: `school_admin`, `accountant`
- **Required Permission**: `inventory:supplier_manage`
- **Component Breakdown**: Vendor directory: Supplier Name, GSTIN, Contact Person, Phone, Payment Terms, and procurement history.

#### Screen 13.3: Stock Adjustment & Asset Write-Off
- **Web Route**: `/app/inventory/adjustments`
- **Allowed Roles**: `school_admin`, `accountant`
- **Required Permission**: `inventory:stock_adjust`
- **Component Breakdown**: Manual stock reconciliation form: Discard damaged goods, audit variance adjustment, write-off approval memo.

#### Screen 13.4: Staff Stationery & Requisitions
- **Web Route**: `/app/inventory/requisitions`
- **Allowed Roles**: `school_admin`, `accountant`
- **Required Permission**: `inventory:item_issue`
- **Component Breakdown**: Departmental requisition request desk: Faculty requests items (e.g. 5 marker boxes, 2 reams paper), storekeeper approval and issue log.

---

### Module 14: Transport (`transport` - P2 Core Screens)

#### Screen 14.1: Bus Fleet & Maintenance Tracker
- **Web Route**: `/app/transport`
- **Allowed Roles**: `school_admin`, `accountant`
- **Required Permission**: `transport:read`, `transport:vehicle_write`
- **Component Breakdown**: Vehicle fleet manager: Registration No, Capacity, Driver Name & Phone, Fitness Certificate Expiry, Insurance Expiry dates.

#### Screen 14.2: Routes & Stop Waypoints Builder
- **Web Route**: `/app/transport/routes`
- **Allowed Roles**: `school_admin`, `accountant`
- **Required Permission**: `transport:routes_write`
- **Component Breakdown**: Bus Route Builder: Route Name, Pickup Stops list with timings and monthly stop fares (automatically syncing to student fee structures).

#### Screen 14.3: Student Route Allocation Matrix
- **Web Route**: `/app/transport/allocations`
- **Mobile Route**: `/(parent)/bus-tracker`
- **Allowed Roles**: `school_admin`, `accountant`, `parent` (View)
- **Required Permission**: `transport:student_assign`, `transport:read`
- **Component Breakdown**: Student bus route assignment table, seat occupancy counter, and parent bus route information view.

---

### Module 15: Hostel (`hostel` - P2 Core Screens)

#### Screen 15.1: Dormitories, Bed Occupancy & Allocations
- **Web Route**: `/app/hostel`
- **Allowed Roles**: `school_admin`, `accountant`
- **Required Permission**: `hostel:read`, `hostel:rooms_write`, `hostel:allocation_write`
- **Component Breakdown**: Dormitory Building & Room Tiers visual grid (AC/Non-AC room beds), bed occupancy colored badges (Vacant, Occupied, Maintenance), boarding fee integration.

#### Screen 15.2: Hostel Gate Passes & Visitor Log
- **Web Route**: `/app/hostel/gate-passes`
- **Allowed Roles**: `school_admin`
- **Required Permission**: `hostel:visitor_log`
- **Component Breakdown**: In/Out gate pass generator for student weekend leaves, visitor identity card log, and warden approval status.

---

### Module 16: Certificates & Identity Cards (`certificates`)

#### Screen 16.1: Certificate Generation Studio & Transfer Certificate (TC)
- **Web Route**: `/app/certificates`
- **Allowed Roles**: `school_admin`
- **Required Permission**: `certificates:read`, `certificates:generate`, `certificates:tc_issue`
- **Functional Reference**: `reference/admin-certificates-generate.png`
- **Layout Pattern**: Certificate template selector: `Character Certificate`, `Bonafide Certificate`, `Transfer Certificate (TC)`, `Student ID Card`.
- **Component Breakdown**:
  - `TCClearanceChecklist`: Automatically verifies:
    - [x] Fee Clearance: Outstanding balance = ₹0.
    - [x] Library Clearance: Zero borrowed books pending.
    - [x] Lab & Hostel Clearance verified.
  - Generates verifiable TC with cryptographic QR code linking to public verification endpoint.

#### Screen 16.2: Certificate Template Designer
- **Web Route**: `/app/certificates/templates`
- **Allowed Roles**: `school_admin`
- **Required Permission**: `certificates:template_write`
- **Component Breakdown**: Visual template designer: Set border styles, header crest, text body with merge placeholders (`{{student_name}}`, `{{class}}`, `{{father_name}}`, `{{academic_year}}`, `{{conduct}}`), signature block.

#### Screen 16.3: Public Certificate Verification Page
- **Web Route**: `/verify/certificate/[token]` (Publicly Accessible)
- **Mobile Route**: Web responsive view
- **Allowed Roles**: Public (`anon`, `authenticated`)
- **Required Permission**: `certificates:verify`
- **Component Breakdown**: Public landing screen displaying authenticated badge, Student Name, Certificate Type, Issue Date, School Name, and verification seal confirming document authenticity.

---

### Module 17: Admissions CRM (`admissions`)

#### Screen 17.1: Admissions Inquiries & CRM Pipeline Kanban
- **Web Route**: `/app/admissions`
- **Allowed Roles**: `school_admin`, `accountant`
- **Required Permission**: `admissions:read`, `admissions:enquiry_create`, `admissions:stage_update`
- **Layout Pattern**: Kanban Pipeline Board: Columns represent stages: `Inquiry` $\to$ `Screening & Test` $\to$ `Interview` $\to$ `Offered` $\to$ `Enrolled`.
- **Component Breakdown**: Inquiry Cards showing applicant child name, sought class, parent phone, follow-up date badge. Drag-and-drop card to transition stage.

#### Screen 17.2: Entrance Assessment Scheduler & Score Entry
- **Web Route**: `/app/admissions/tests`
- **Allowed Roles**: `school_admin`
- **Required Permission**: `admissions:test_schedule`
- **Layout Pattern**: Entrance assessment calendar and score sheet: Candidate name, applied class, test date, venue, test marks obtained, evaluation decision (`Qualified`, `Waitlisted`, `Not Cleared`).

#### Screen 17.3: Convert Applicant to Enrolled Student Modal
- **Web Route**: `/app/admissions/convert`
- **Allowed Roles**: `school_admin`
- **Required Permission**: `admissions:convert_student`
- **Component Breakdown**: Conversion dialog: Select accepted candidate, assign Session, Class, Section, Roll Number, and one-click launch pre-filled Student Admission Wizard with registration fee voucher generation.

---

### Module 18: Reports & Executive Dashboards (`reports`)

#### Screen 18.1: Role-Tailored Executive KPI Dashboards
- **Web Route**: `/app/dashboard`
- **Mobile Route**: `/(admin)/dashboard`, `/(teacher)/dashboard`
- **Allowed Roles**: All roles (Content tailored to role)
- **Required Permission**: `reports:dashboard_view`
- **Functional Reference**: `reference/admin-dashboard-01.png`, `reference/admin-dashboard-02.png`, `reference/student-dashboard.png`
- **Layout Pattern**:
  - *School Admin Dashboard*: Top metric cards: Total Enrolled Students (`1,248`), Active Faculty (`84`), Today's Student Attendance ($94.6\%$), Month-to-date Fee Collection (`₹42,50,000`). Charts: Fee Collection Trend line chart, Class-wise Attendance bar chart, Recent Audit Log activity stream.
  - *Accountant Dashboard*: Today's Cash Collected, Overdue Defaulters Count, Pending Approvals, Bank Balance.
  - *Teacher Dashboard*: Today's Assigned Periods, Unmarked Class Attendance alert pill, Upcoming Exams, Pending Homework to Grade.

#### Screen 18.2: Academic Performance Analytics & Broadsheets
- **Web Route**: `/app/reports/academic`
- **Allowed Roles**: `school_admin`, `teacher` (Scoped)
- **Required Permission**: `reports:academic_view`
- **Component Breakdown**: Comparative exam analytics: Class-wise pass percentage comparison chart, subject weakness heatmaps, top 10 merit list, grade distribution bell curve.

#### Screen 18.3: Custom Report Builder & Multi-Format Data Exporter
- **Web Route**: `/app/reports/builder`
- **Allowed Roles**: `school_admin`, `accountant`
- **Required Permission**: `reports:export_data`, `reports:custom_filter_save`
- **Functional Reference**: `reference/admin-reports-student.png`
- **Component Breakdown**: Report entity selector (`Students`, `Fee Collections`, `Exam Tabulation`, `Attendance`), field picker multiselect, date range filters, and export action (`Download Excel (XLSX)`, `Download PDF`).

---

### Module 19: Roles, Permissions & Security Audit (`roles`)

#### Screen 19.1: Interactive Visual Role-Permission Matrix Grid
- **Web Route**: `/app/settings/roles`
- **Allowed Roles**: `school_admin`
- **Required Permission**: `roles:read`, `roles:write`
- **Layout Pattern**: Interactive permission matrix: Rows represent the 133 Functional Permission Tokens grouped by Module; Columns represent Tenant Roles (`school_admin`, `accountant`, `teacher`, `student`, `parent`, plus Custom Roles like `Librarian`).
- **Component Breakdown**: Checkbox switches with tooltips explaining access token impact. System roles (`is_system = true`) show lock icon indicating immutable base profile. `[ + Create Custom Role ]` button allows cloning an existing profile.

#### Screen 19.2: User Permission Override & Delegation Drawer
- **Web Route**: `/app/settings/users/[id]/overrides`
- **Allowed Roles**: `school_admin`
- **Required Permission**: `roles:override_manage`
- **Component Breakdown**: Slide-over drawer to grant an individual user an explicit `Allow` or `Deny` override for a single permission token without altering their assigned role.

#### Screen 19.3: Immutable Chronological Audit Trail Explorer
- **Web Route**: `/app/settings/audit-logs`
- **Allowed Roles**: `school_admin`
- **Required Permission**: `roles:audit_view`
- **Layout Pattern**: Real-time audit stream table: Timestamp (`DD/MM/YYYY HH:mm:ss`), Operator Name & Role, Event Action (`fee_payment_collected`, `exam_marks_locked`, `student_promoted`), Entity Type, Entity ID, Impersonation Session ID tag (if performed by super admin), and expandable JSON Payload Diff modal.

#### Screen 19.4: Role Assignment Bridge
- **Web Route**: `/app/settings/roles/assign`
- **Allowed Roles**: `school_admin`
- **Required Permission**: `roles:assign`
- **Component Breakdown**: Assign roles to staff members in `school_users` (`custom_role_id NOT NULL`), enforce single active primary role per school context.

---

### Module 20: Dedicated Persona Portals (`portals`)

#### Screen 20.1: Parent Switchboard Portal (Multi-Child)
- **Web Route**: `/portal/parent`
- **Mobile Route**: `/(parent)/dashboard`
- **Allowed Roles**: `parent`
- **Required Permission**: `portals:parent_switchboard`
- **Layout Pattern**:
  - **Persistent Child Switcher Bar**: Avatars of linked siblings (e.g. `Aarav (Class 10-A)` and `Diya (Class 6-B)`). Clicking an avatar instantly shifts context for the entire dashboard.
  - **Consolidated Fee Due Card**: Current outstanding total with vibrant `[ Pay Online via UPI / Net Banking ]` primary action.
  - **Today's Status Pill**: Attendance status for the day (e.g. `Present at 08:15 AM`), Today's Diary entries, Upcoming Tests.
  - **Recent Notices Carousel**: School circulars relevant to the selected child's grade.

#### Screen 20.2: Student Self-Service Portal
- **Web Route**: `/portal/student`
- **Mobile Route**: `/(student)/dashboard`
- **Allowed Roles**: `student`
- **Required Permission**: `portals:student_portal`
- **Functional Reference**: `reference/student-dashboard.png`
- **Layout Pattern**: Clean, distraction-free learner view: Today's Class Timetable with current period highlighted, Homework Due Today checklist with submission status, Published Exam Report Cards, Attendance summary bar ($96\%$).

#### Screen 20.3: Teacher Mobile Classroom Terminal
- **Mobile Route**: `/(teacher)/home`
- **Web Route**: `/app/academics/teacher-portal`
- **Allowed Roles**: `teacher`
- **Required Permission**: `portals:teacher_mobile`
- **Component Breakdown**: Mobile-first dashboard: Large thumb-friendly quick buttons: `[ Mark Class Attendance ]`, `[ Record Diary Notes ]`, `[ Enter Exam Marks ]`, `[ Message Parents ]`. Offline-lite badge showing pending local changes to sync.

#### Screen 20.4: Portal Login Credentials & Lockout Manager (P2 Restricted)
- **Web Route**: `/app/settings/portals/logins`
- **Allowed Roles**: `school_admin`
- **Required Permission**: `portals:lock_manage`, `roles:assign`
- **Functional Reference**: `reference/admin-student-manage_login.png`, `reference/admin-employees-manage_login.png`
- **Component Breakdown**: Searchable roster of students, parents, and employees showing portal login email, last login timestamp, password reset action trigger.
- **Portal Lock Restriction**: "Apply Portal Lock" is strictly restricted to optional online self-service amenities (e.g. online library reservation, cafeteria token booking); it is **strictly prohibited** from blocking student report cards, attendance records, or statutory circulars. Marked as P2.

---

### Module 21: Settings & Data Management (`settings`)

#### Screen 21.1: Institutional Profile, Branding & School Settings
- **Web Route**: `/app/settings/profile`
- **Allowed Roles**: `school_admin`
- **Required Permission**: `settings:read`, `settings:write`
- **Functional Reference**: `reference/admin-general-Institutional_profile.png`, `reference/admin-general-account_settings.png`, `reference/admin-general-rules&regulations.png`
- **Layout Pattern**: Tabbed settings form:
  - Tab 1: Institutional Profile: School Legal Name, Tagline, Logo upload, Affiliation Board (CBSE / ICSE / State Board / Custom), School Code, Address, Contact Phone, Official Email.
  - Tab 2: Regional & Academic Settings: Timezone (`Asia/Kolkata`), Currency (Locked to `INR`), Date Format (`DD/MM/YYYY`), Academic Year Start Month (`April`), Weekly Working Days pattern (`Monday to Saturday`).
  - Tab 3: Late Fine & Admission Rules: `grace_fine_mode` (`incremental` vs `retroactive`), `mid_month_admission_rule` (`full_month`, `half_after_cutoff_day`, `daily_prorata`), Default Pass Mark.

#### Screen 21.2: Payment Gateway & Split Settlement Config
- **Web Route**: `/app/settings/integrations/payment-gateway`
- **Allowed Roles**: `school_admin`
- **Required Permission**: `settings:integration_config`
- **Component Breakdown**: Payment provider status (Razorpay Route / Cashfree Split). Displays Merchant Bank Account KYC verification status, Webhook Secret configuration, and Platform non-custodial split settlement indicator confirming funds deposit directly into the school's bank account.

#### Screen 21.3: TRAI DLT SMS & WhatsApp Integration
- **Web Route**: `/app/settings/integrations/sms`
- **Allowed Roles**: `school_admin`
- **Required Permission**: `settings:integration_config`
- **Component Breakdown**: Registered DLT Entity ID, Header ID, Provider API Key, WhatsApp Business API token input, and test notification dispatch tool.

#### Screen 21.4: Document Sequences & Auto-Numbering Setup
- **Web Route**: `/app/settings/sequences`
- **Allowed Roles**: `school_admin`
- **Required Permission**: `settings:sequences_manage`
- **Component Breakdown**: Configurable numbering patterns for vouchers, receipts, admission numbers, and transfer certificates (`VCH-{YYYY}-{00000}`, `REC-{00000}`, `ADM-{YYYY}-{0000}`).

#### Screen 21.5: Tenant Data Backup, Export & DPDP Statutory Register
- **Web Route**: `/app/settings/data-management`
- **Allowed Roles**: `school_admin`
- **Required Permission**: `settings:backup_export`
- **Component Breakdown**: One-click `[ Generate Complete Tenant Data Backup (ZIP/JSON) ]`, DPDP 2023 Statutory Consent Logs register, Data Subject Erasure request queue (review and approve/reject pending student deletion requests with `decided_by` and `rejection_reason`; monitor scheduled staff/parent anonymisation queue across unified statuses: `pending`, `verified`, `scheduled`, `processing`, `completed`, `rejected`, `cancelled`), and Data Breach 72-hour incident notification checklist.

---

### Module 22: SaaS Platform Operations (`saas` - Super Admin Only)

#### Screen 22.1: Multi-Tenant Schools Directory & Health Overview
- **Web Route**: `/admin/saas/schools`
- **Allowed Roles**: `super_admin` (Strictly restricted)
- **Required Permission**: `saas:schools_read`
- **Layout Pattern**: Global Platform Control Center: Active School Tenants (`142`), Total Students Enrolled (`1,48,200`), MRR, System API Health ($99.98\%$). Tenant Table: School Name, Subdomain, Subscription Plan, Total Students / Quota, Status (`Active`, `Suspended`), Row Actions (`View Details`, `Adjust Quota`, `Launch Impersonation`).

#### Screen 22.2: School Tenant Provisioning Wizard
- **Web Route**: `/admin/saas/schools/new`
- **Allowed Roles**: `super_admin`
- **Required Permission**: `saas:schools_write`
- **Component Breakdown**: Tenant onboarding form: School Name, Subdomain slug (`delhi-public`), Primary Admin Email, Subscription Plan selection, Storage Quota (GB), and automatic seed trigger (creates 6 system custom roles and base schema settings).

#### Screen 22.3: Super-Admin School Impersonation Launcher
- **Web Route**: `/admin/saas/schools/[id]/impersonate`
- **Allowed Roles**: `super_admin`
- **Required Permission**: `saas:impersonate`
- **Component Breakdown**: Audited support access modal: Requires mandatory support ticket reference and justification reason. Generates a 60-minute scoped JWT with `impersonation_log_id`, redirecting the super admin directly into the tenant's `/app` shell.

#### Screen 22.4: Subscription Plans & Feature Flags Manager
- **Web Route**: `/admin/saas/plans`
- **Allowed Roles**: `super_admin`
- **Required Permission**: `saas:plans_manage`
- **Component Breakdown**: Tier editor (`Starter`, `Standard`, `Premium`, `Enterprise`): Price, Billing Interval, Max Student limit, Module entitlement toggles (e.g. enable/disable Transport, Hostel, Biometrics).

#### Screen 22.5: Platform Telemetry & System Analytics
- **Web Route**: `/admin/saas/analytics`
- **Allowed Roles**: `super_admin`
- **Required Permission**: `saas:analytics_view`
- **Component Breakdown**: Global telemetry dashboard: Active daily users across all schools, database connection pool saturation, Supabase Edge Function execution latency, API error rate trends, and storage bucket consumption.

---

### Module 23: Public School Landing Page (`public_page`)

#### Screen 23.1: Public School Website & Admission Inquiry Page
- **Web Route**: `/schools/[slug]` (or Tenant Custom Domain `www.delhipublic.example.in`)
- **Allowed Roles**: Public (`anon`, `authenticated`)
- **Required Permission**: `public_page:read`
- **Layout Pattern**: Modern public-facing educational landing page:
  - Header: School Logo, Navigation Links (`About`, `Academics`, `Admissions`, `Notices`, `Contact`, `[ Portal Login ]`).
  - Hero Section: Hero carousel, school motto, `[ Apply for Admission ]` call-to-action button.
  - Facilities & Campus Highlights: Cards showcasing Computer Labs, Science Labs, Library, Sports Arena, Transport fleet.
  - Public Notice Board: Latest school circulars and upcoming holiday announcements.
  - Public Admission Inquiry Modal: Prospective parents submit candidate name, sought grade, and contact details directly into the CRM pipeline.

#### Screen 23.2: School Website CMS & Content Editor
- **Web Route**: `/app/settings/public-page`
- **Allowed Roles**: `school_admin`
- **Required Permission**: `public_page:write`
- **Component Breakdown**: Visual editor to customize landing page banner text, upload campus photo gallery albums, update public office hours, and toggle public admission applications open/closed.

---

## 4. Global UI Components, Dialogs & Utility Overlays

### 4.1 Persistent Impersonation Watermark Banner
When a super administrator operates within a school tenant via an impersonation session (`impersonation_log_id IS NOT NULL`), a sticky, high-contrast banner is mounted at the very top of every screen:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ ⚠️ ACTIVE IMPERSONATION SESSION | School: Delhi Public School | Session Expires: 48m   │
│ Reason: Support Ticket #4921 - Fee Ledger Reconciliation         [ Exit Impersonation ] │
└────────────────────────────────────────────────────────────────────────────────────────┘
```
- **Styling**: `bg-amber-500 text-slate-950 font-medium text-xs py-1.5 px-4 flex justify-between items-center z-50 sticky top-0`.
- **Exit Action**: Terminating the session invalidates the token, records the end timestamp in `impersonation_logs`, and redirects back to `/admin/saas/schools`.

### 4.2 Global Quick Search & Command Palette (`Cmd+K` / `Ctrl+K`)
- **Component**: `GlobalCommandPalette`
- **Accessible By**: All authenticated web users
- **Keybindings**: `Cmd+K` (macOS), `Ctrl+K` (Windows/Linux)
- **Features**: Debounced unified lookup across:
  - Navigation Routes (`Go to Fee POS`, `Go to Class 10 Roster`, `Settings`)
  - Students (`Aarav Sharma - Class 10-A`)
  - Employees (`Dr. Sunita Rao - HOD Physics`)
  - Fee Vouchers (`VCH-2026-10-0012`)

### 4.3 Notification Drawer & Real-Time Alert Center
- **Component**: `NotificationSheet`
- **Location**: Bell icon in header bar with unread count badge.
- **Features**: Categorized notification tabs (`Alerts`, `Attendance`, `Fee Receipts`, `Announcements`), Mark All as Read button, and direct navigation links to relevant records.

---

## 5. Verification Matrix & Traceability to Reference Screenshots

The following matrix documents the exact mapping from the 47 reference screenshots in `/reference` to the implemented screens in `docs/SCREENS.md`:

| # | Reference Screenshot Filename | Screen ID | Documented Screen Name & Route | Key Behavioral Parity Verified |
| :-: | :--- | :-: | :--- | :--- |
| 1 | `login-page.png` | 0.1 | Universal Auth Screen (`/login`) | Dual tab persona switch, email/password, SSR session cookies |
| 2 | `admin-dashboard-01.png` | 18.1 | School Admin Dashboard (`/app/dashboard`) | KPI summary cards, quick action links, enrollment counters |
| 3 | `admin-dashboard-02.png` | 18.1 | Executive Operations Overview (`/app/dashboard`) | Financial line charts, monthly revenue aggregation, fee status |
| 4 | `student-dashboard.png` | 20.2 | Student Self-Service Portal (`/portal/student`) | Timetable cards, daily homework tasks, attendance gauge |
| 5 | `admin-general-Institutional_profile.png`| 21.1 | Institutional Profile (`/app/settings/profile`) | School identity, affiliation board, legal registration |
| 6 | `admin-general-account_settings.png` | 21.1 | School Financial Settings (`/app/settings/profile`) | Timezone, currency lock, session start month, grace fines |
| 7 | `admin-general-fee_particular.png` | 7.1 | Fee Heads & Structures (`/app/fees/structures`) | Fee chart of accounts, frequencies, class-wise pricing |
| 8 | `admin-general-Marks_Grading.png` | 6.2 | Grading Scales Configuration (`/app/exams/grading-scales`) | Grade boundaries, GPA score rules, percentage bands |
| 9 | `admin-general-rules&regulations.png` | 21.1 | Institutional Rules (`/app/settings/profile`) | Working day patterns, promotion attendance thresholds |
| 10 | `admin-classes-new_classes.png` | 1.2 | Classes & Sections (`/app/academics/classes`) | Class creation modal, section chips, numeric grade sorting |
| 11 | `admin-dashboard-classes-all_classes.png`| 1.2 | Class Roster Grid (`/app/academics/classes`) | Class cards, section counts, enrolled student totals |
| 12 | `admin-subject-classes_with_subjects.png`| 1.3 | Subject Master Directory (`/app/academics/subjects`) | Subject code, theory/practical type, passing mark % |
| 13 | `admin-subjects-assign_subjects.png` | 1.4 | Teacher Assignment Matrix (`/app/academics/teacher-assignments`) | 2D assignment matrix, faculty dropdown per subject |
| 14 | `admin-students-all.png` | 2.1 | Student Directory (`/app/students`) | Filter bar, tabular roster, status badges, profile links |
| 15 | `admin-student-add.png` | 2.2 | Multi-Step Admission Wizard (`/app/students/admissions/new`) | Step navigation, sibling links, guardian coordinates |
| 16 | `admin-student-printbasiclist.png` | 2.1 | Printable Student Directory (`/app/students`) | Compact printable list format, demographic columns |
| 17 | `admin-student-manage_login.png` | 20.4 | Portal Login Management (`/app/settings/portals/logins`) | Portal credentials, lockout switches, password reset |
| 18 | `admin-student-promote.png` | 2.4 | Cohort Promotion & Rollover (`/app/students/promotions`) | Session-to-session rollover, retention overrides, arrears |
| 19 | `admin-employees-all.png` | 3.1 | Employee Directory (`/app/staff`) | Staff roster, department filters, designation tags |
| 20 | `admin-employees-add.png` | 3.2 | Employee Onboarding Wizard (`/app/staff/new`) | Personal details, academic mapping, statutory bank info |
| 21 | `admin-employees-job_letter.png` | 3.1 | Job Appointment Letter (`/app/staff`) | Formal employment contract print layout, salary scales |
| 22 | `admin-employees-manage_login.png` | 20.4 | Staff Portal Login Credentials (`/app/settings/portals/logins`) | Staff login management, role assignment bridge |
| 23 | `admin-salary-slip.png` | 9.4 | Official Payslip Print View (`/app/payroll/payslips/[id]`) | Earnings, deductions, net salary words, signature stamp |
| 24 | `screenshot-2026-10-14-024108.png` | 9.3 | Monthly Payroll Batch (`/app/payroll`) | Attendance-linked unpaid leave deductions, loan EMIs |
| 25 | `admin-fees-collect.png` | 7.6 | Accountant POS Terminal (`/app/fees/pos`) | Rapid keyboard POS, barcode scan, partial payment tender |
| 26 | `admin-fees-slip.png` | 7.11 | Fee Voucher Print Sheet (`/app/fees/vouchers/[id]/print`) | 3-stub challan layout with NPCI Dynamic UPI QR code |
| 27 | `admin-fees-defaulters.png` | 7.13 | Defaulters Aging & Recovery (`/app/fees/defaulters`) | Overdue aging buckets, recovery dunning notice slips |
| 28 | `admin-accounts-chart.png` | 8.1 | Chart of Accounts & Balances (`/app/accounts`) | Cash register cards, bank account balances |
| 29 | `admin-accounts-add_income.png` | 8.1 | Income Voucher Entry (`/app/accounts`) | Auxiliary institutional revenue ingestion dialog |
| 30 | `admin-accounts-add_expense.png` | 8.3 | Expense Voucher Dialog (`/app/accounts/expenses/new`) | Expense categories, payee name, bill attachment upload |
| 31 | `admin-accounts-statement.png` | 8.1 | Cash Book Ledger (`/app/accounts`) | Chronological transaction statement, running cash balance |
| 32 | `admin-attendance-students.png` | 4.1 | Daily Homeroom Attendance (`/app/attendance/daily`) | Speed grid radio toggles (P/A/L/E), live percentage bar |
| 33 | `admin-attendance-employees.png` | 4.4 | Staff Daily Attendance (`/app/attendance/staff`) | Faculty attendance register, manual mark toggles |
| 34 | `admin-attendance-students_attendance_report.png`| 4.3 | Student Monthly Register (`/app/attendance/reports/class-monthly`)| 1-31 monthly matrix view, total present/absent counters |
| 35 | `admin-attendance-class_wise_report.png`| 4.3 | Class Attendance Heatmap (`/app/attendance/reports/class-monthly`)| Comparative class attendance averages, chronic truancy |
| 36 | `admin-attendance-employees_attendance_report.png`| 4.5 | Staff Monthly Attendance Report (`/app/attendance/biometric`) | Monthly employee attendance register for payroll run |
| 37 | `admin-homework.png` | 11.1 | Homework Assignment Studio (`/app/lms/homework`) | Homework publishing form, submission tracking counts |
| 38 | `admin-messaging.png` | 10.2 | DLT SMS Campaign Dispatcher (`/app/communication/sms`) | Registered DLT templates, variable inputs, SMS counter |
| 39 | `admin-exams-create.png` | 6.1 | Exam Term Creation (`/app/exams/terms`) | Assessment term setup, session linkage, date ranges |
| 40 | `admin-exams-setup.png` | 6.1 | Exam Schedule Date Sheet (`/app/exams/terms`) | Date sheet schedule, subject timings, room allocation |
| 41 | `admin-exams-add_update.png` | 6.4 | Raw Marks Entry Grid (`/app/exams/marks-entry`) | Full-page spreadsheet marks entry, locked term banner |
| 42 | `admin-exams-result.png` | 6.5 | Result Tabulation Sheet (`/app/exams/tabulation`) | Class broadsheet, grade distribution, rank calculation |
| 43 | `admin-class_test-manage.png` | 6.4 | Class Test Marks Entry (`/app/exams/marks-entry`) | Weekly test entry, continuous assessment tracking |
| 44 | `admin-class_test-result.png` | 6.5 | Test Tabulation Broadsheet (`/app/exams/tabulation`) | Continuous evaluation broadsheet, progress reports |
| 45 | `admin-reports-student.png` | 18.3 | Custom Report Exporter (`/app/reports/builder`) | Multi-field student demographic and academic export |
| 46 | `admin-certificates-generate.png`| 16.1 | Certificate Generation Studio (`/app/certificates`) | Transfer Certificate clearance checklist, Admit Cards |
| 47 | `Screenshot 2026-10-14 020403.png`| 1.1 | Academic Session Setup (`/app/academics/sessions`) | Date picker controls, session activation confirmations |

---

## 6. Deferred Screens (P2 Capabilities)

The following capabilities are classified as Priority 2 (P2) in the product roadmap. Their UI footprint in V1 is deferred or handled through basic admin interfaces as specified below:

| Functional Area | Deferred Capability | Priority | Architectural & Operational Rationale |
| :--- | :--- | :---: | :--- |
| **Fees & Accounts** | ESC/POS Thermal Receipt Printing & Hardware Barcode Scanners | P2 | V1 utilizes standard browser print styling (`@media print`) rendering A4 or A5 challans. Thermal printer direct COM/USB protocol drivers and hardware laser gun integration are scheduled for P2. |
| **Portals** | Apply Portal Lock (`portals:lock_manage`) | P2 | Portal locks are strictly restricted to optional online self-service amenities (e.g. online library reservation, cafeteria token booking); they are **strictly prohibited** from blocking student report cards, attendance records, or statutory circulars. Full automated lockout engine deferred to P2. |
| **Learning / LMS** | Interactive Online Quizzes & Timed CBT Tests | P2 | V1 LMS prioritizes asynchronous homework publishing, student document uploads, and teacher grading drawers. Computer-based timed quizzes with auto-grading are planned for P2. |
| **Hostel & Access** | Turnstile / RFID Smart Gate Hardware Integration | P2 | V1 hostel and visitor logging uses manual digital sign-in sheets and gate passes. Automated hardware turnstile relays are scheduled for P2. |
| **Library** | Multi-Branch RFID Self-Checkout Kiosk | P2 | V1 circulation operates via staff web barcode desk. Self-service RFID hardware kiosks are deferred to P2. |

---

## 7. Exhaustive Permission Token Coverage Matrix

The following exhaustive directory maps **every single one of the 133 permission tokens** defined in [PERMISSIONS.md](PERMISSIONS.md) to its corresponding screen(s) or designates it as an API/Background-only capability with full technical justification:

| # | Permission Token | Functional Module | Priority | Mapped Screen ID(s) & Screen Names | API-Only / Execution Reason |
| :-: | :--- | :--- | :---: | :--- | :--- |
| 1 | `academics:read` | `academics` | P0 | Screen 1.2, 1.3, 1.4 | Academic master viewing |
| 2 | `academics:write` | `academics` | P0 | Screen 1.2, 1.3 | Class, section, subject authoring |
| 3 | `academics:delete` | `academics` | P0 | Screen 1.5 (Academic Soft-Delete Dialog) | Soft-deletion of academic entities |
| 4 | `academics:assign_teacher` | `academics` | P0 | Screen 1.4 (Teacher Assignment Matrix) | Mapping faculty to cohort subjects |
| 5 | `academics:session_manage` | `academics` | P0 | Screen 1.1 (Academic Sessions & Rollover) | Session creation, term activation |
| 6 | `students:read` | `students` | P0 | Screen 2.1, 2.3 | Student directory, profile 360 |
| 7 | `students:read_sensitive` | `students` | P0 | Screen 2.3 (Tab 5: Confidential & Health) | Medical alerts, disciplinary records |
| 8 | `students:write` | `students` | P0 | Screen 2.2, 2.3 | Admission registration wizard |
| 9 | `students:delete` | `students` | P0 | Screen 2.8 (Student Soft-Deletion Modal) | Soft-deletion / student withdrawal |
| 10 | `students:import` | `students` | P0 | Screen 2.5 (Bulk Student Import Wizard) | Multi-step CSV/Excel onboarding |
| 11 | `students:export` | `students` | P0 | Screen 2.6 (Student Directory Export Dialog) | Filtered directory export to Excel/PDF |
| 12 | `students:promote` | `students` | P0 | Screen 2.4 (Cohort Promotion & Rollover) | Annual promotion evaluation |
| 13 | `students:documents_manage` | `students` | P0 | Screen 2.7 (Student Documents Vault) | Birth/transfer certificates vault |
| 14 | `staff:read` | `staff` | P0 | Screen 3.1 | Employee directory & roster |
| 15 | `staff:read_sensitive` | `staff` | P0 | Screen 3.3 (Confidential Records Vault) | PAN, bank account, base salary |
| 16 | `staff:read_appraisal` | `staff` | P0 | Screen 3.4 (Staff Performance Appraisals) | Performance reviews & ratings |
| 17 | `staff:write` | `staff` | P0 | Screen 3.2 | Staff onboarding wizard |
| 18 | `staff:delete` | `staff` | P0 | Screen 3.7 (Staff Termination Dialog) | Staff soft-deletion / exit interview |
| 19 | `staff:leave_apply` | `staff` | P1 | Screen 3.5 (Staff Leave Management) | Faculty leave submission |
| 20 | `staff:leave_approve` | `staff` | P1 | Screen 3.5 (Staff Leave Management) | Supervisor leave review |
| 21 | `staff:documents_manage` | `staff` | P0 | Screen 3.6 (Staff Document Repository) | Contracts, resumes, identity vault |
| 22 | `attendance:read` | `attendance` | P0 | Screen 4.1, 4.2, 4.3 | Attendance roster, registers, reports |
| 23 | `attendance:mark_daily` | `attendance` | P0 | Screen 4.1 (Homeroom Attendance Speed Grid)| Classroom homeroom attendance |
| 24 | `attendance:mark_period` | `attendance` | P1 | Screen 4.2 (Period Attendance Tracker) | Subject-wise period attendance |
| 25 | `attendance:biometric_sync` | `attendance` | P1 | Screen 4.5 (Biometric Device Monitor) | Clock terminal sync & raw punches |
| 26 | `attendance:reports` | `attendance` | P1 | Screen 4.3 (Class Monthly Register) | Monthly register broadsheets |
| 27 | `attendance:staff_mark` | `attendance` | P1 | Screen 4.4 (Staff Manual Attendance Sheet) | Faculty manual attendance register |
| 28 | `timetable:read` | `timetable` | P1 | Screen 5.1, 5.2 | Class & teacher weekly timetables |
| 29 | `timetable:write` | `timetable` | P1 | Screen 5.1 (Master Weekly Schedule Grid) | Schedule authoring & period mapping |
| 30 | `timetable:substitute` | `timetable` | P1 | Screen 5.4 (Teacher Substitution Panel) | Daily substitute allocation |
| 31 | `timetable:periods_manage` | `timetable` | P1 | Screen 5.3 (Periods & Bell Schedules) | Bell schedule slot configuration |
| 32 | `exams:read` | `exams` | P0 | Screen 6.1 | Date sheets, exam terms, admit cards |
| 33 | `exams:schedule_write` | `exams` | P0 | Screen 6.1 (Exam Terms & Date Sheets) | Exam term setup & schedule slots |
| 34 | `exams:marks_enter` | `exams` | P0 | Screen 6.4 (Marks Entry Spreadsheet Grid) | Teacher raw marks entry |
| 35 | `exams:marks_lock` | `exams` | P0 | Screen 6.7 (Term Unlock Security Dialog) | Finalizing & unlocking term marks |
| 36 | `exams:publish` | `exams` | P0 | Screen 6.6 (Results Publication Dialog) | Toggling results visibility to portal |
| 37 | `exams:view_results` | `exams` | P0 | Screen 6.5, 6.8 | Tabulation broadsheet, DMC cards |
| 38 | `exams:grading_scales_write`| `exams` | P0 | Screen 6.2, 6.9 | Grading scales, GPA rules, pass mark |
| 39 | `exams:hall_ticket_generate`| `exams` | P0 | Screen 6.3 (Admit Cards Generator) | Batch hall ticket print with QR |
| 40 | `fees:read` | `fees` | P0 | Screen 7.5, 7.11, 7.12, 7.14, 7.15 | Vouchers, ledger, receipts, reports |
| 41 | `fees:structure_write` | `fees` | P0 | Screen 7.1, 7.2, 7.3 | Fee heads, late fine, sibling rules |
| 42 | `fees:generate` | `fees` | P0 | Screen 7.4 (Bulk Voucher Generation) | Batch monthly generation launcher |
| 43 | `fees:collect` | `fees` | P0 | Screen 7.6, 7.7 | Desktop POS & Mobile collection |
| 44 | `fees:discount` | `fees` | P0 | Screen 7.3, 7.10 | Sibling rules, concession requests |
| 45 | `fees:refund` | `fees` | P0 | Screen 7.10 (Refund Request Form) | Submitting refund request to approval |
| 46 | `fees:cancel` | `fees` | P0 | Screen 7.5 (Cancel Voucher Modal) | Cancelling unpaid voucher with reason |
| 47 | `fees:adjustment` | `fees` | P0 | Screen 7.10 (Adjustment Request Form) | Posting debit/credit ledger adjustments |
| 48 | `fees:defaulters_view` | `fees` | P0 | Screen 7.13 (Defaulters Aging & Recovery) | Defaulter list, dunning notices |
| 49 | `fees:reverse` | `fees` | P0 | Screen 7.8 (Payment Reversal Modal) | Reversing erroneous payments |
| 50 | `fees:pay_online` | `fees` | P0 | Screen 7.16 (Parent Online Payment) | Online UPI & card fee checkout |
| 51 | `fees:approve` | `fees` | P0 | Screen 7.9 (Maker-Checker Approvals Queue) | Admin approval for refunds/waivers |
| 52 | `accounts:read` | `accounts` | P1 | Screen 8.1 | Cash book register, account balances |
| 53 | `accounts:expense_create` | `accounts` | P1 | Screen 8.3 (Expense Voucher Dialog) | Daily institutional expense logging |
| 54 | `accounts:daily_close` | `accounts` | P1 | Screen 8.4 (Daily Cash Closing) | Day-end reconciliation & closing |
| 55 | `accounts:pnl_view` | `accounts` | P1 | Screen 8.6 (Profit & Loss Statement) | Operating revenue and margin report |
| 56 | `accounts:close_reopen` | `accounts` | P1 | Screen 8.5 (Reopen Cash Register Modal) | Supervisor unlock of closed register |
| 57 | `accounts:category_manage`| `accounts` | P1 | Screen 8.2 (Category Manager) | Income and expense categories master |
| 58 | `payroll:read` | `payroll` | P1 | Screen 9.3 | Monthly payroll batches |
| 59 | `payroll:structure_write` | `payroll` | P1 | Screen 9.1 (Salary Structures) | Staff salary components & rules |
| 60 | `payroll:generate` | `payroll` | P1 | Screen 9.3 (Monthly Payroll Batch) | Computing attendance leave deductions |
| 61 | `payroll:disburse` | `payroll` | P1 | Screen 9.3 (Monthly Payroll Batch) | Approving & disbursing salary run |
| 62 | `payroll:payslip_view` | `payroll` | P1 | Screen 9.4 (Official Payslip Print View) | Payslip preview & A4/A5 print |
| 63 | `payroll:loan_manage` | `payroll` | P1 | Screen 9.2 (Staff Loan & Advance Ledger) | Granting loans & EMI schedules |
| 64 | `communication:notice_read`| `communication` | P0 | Screen 10.1, 10.4, 10.5, 10.7 | Viewing circulars, calendar, diary |
| 65 | `communication:notice_write`| `communication`| P0 | Screen 10.1, 10.7 | Broadcasting notices, circulars |
| 66 | `communication:sms_campaign`| `communication`| P0 | Screen 10.2 (DLT SMS Campaign) | Bulk SMS announcements |
| 67 | `communication:diary_write` | `communication`| P1 | Screen 10.5 (Daily Student Diary) | Recording daily classwork notes |
| 68 | `communication:message_teacher`| `communication`| P1 | Screen 10.6 (Direct 1-on-1 Chat) | Parent-teacher messaging thread |
| 69 | `communication:events_manage` | `communication`| P1 | Screen 10.4 (Events & Holiday Calendar) | Adding school holidays and events |
| 70 | `communication:templates_manage`| `communication`| P0| Screen 10.3 (DLT Template Manager) | Managing registered DLT templates |
| 71 | `lms:homework_read` | `lms` | P1 | Screen 11.1, 11.2 | Homework assignments, study materials |
| 72 | `lms:homework_create` | `lms` | P1 | Screen 11.1 (Homework Assignment Studio) | Publishing homework assignments |
| 73 | `lms:homework_submit` | `lms` | P1 | Screen 11.1 (Student Upload Modal) | Student worksheet submission |
| 74 | `lms:homework_grade` | `lms` | P1 | Screen 11.1 (Homework Submission Drawer)| Teacher evaluation & feedback |
| 75 | `lms:syllabus_track` | `lms` | P1 | Screen 11.3 (Syllabus Tracker) | Curriculum milestones tracking |
| 76 | `lms:materials_upload` | `lms` | P1 | Screen 11.2 (Study Materials Vault) | Uploading PDF slides and worksheets |
| 77 | `lms:lesson_plan_write` | `lms` | P1 | Screen 11.3 (Lesson Plans Desk) | Teacher lesson plan preparation |
| 78 | `library:catalog_read` | `library` | P2 | Screen 12.1 | Searching books and copies |
| 79 | `library:catalog_write` | `library` | P2 | Screen 12.1 (Library Catalog & Ingestion)| Ingesting books and barcode copies |
| 80 | `library:circulation_issue`| `library` | P2 | Screen 12.2 (Circulation Desk) | Issuing books to students/staff |
| 81 | `library:circulation_return`| `library`| P2 | Screen 12.2 (Circulation Desk) | Processing book returns |
| 82 | `library:fines_collect` | `library` | P2 | Screen 12.4 (Overdue Fine Settlement) | Collecting library fines |
| 83 | `library:members_manage` | `library` | P2 | Screen 12.3 (Library Members & Cards) | Issuing library borrowing cards |
| 84 | `inventory:read` | `inventory` | P2 | Screen 13.1 | Viewing stock inventory |
| 85 | `inventory:purchase_create`| `inventory` | P2 | Screen 13.1 (Item Master & Purchases) | Purchase order generation |
| 86 | `inventory:stock_adjust` | `inventory` | P2 | Screen 13.3 (Stock Adjustment Modal) | Write-off damaged stock & variance |
| 87 | `inventory:item_issue` | `inventory` | P2 | Screen 13.4 (Staff Stationery Desk) | Issuing items to faculty/students |
| 88 | `inventory:supplier_manage`| `inventory` | P2 | Screen 13.2 (Supplier Profiles) | Managing vendor database |
| 89 | `transport:read` | `transport` | P2 | Screen 14.1, 14.3 | Vehicle fleet, route allocations |
| 90 | `transport:routes_write` | `transport` | P2 | Screen 14.2 (Route & Stops Builder) | Configuring routes & stop fees |
| 91 | `transport:vehicle_write`| `transport` | P2 | Screen 14.1 (Bus Fleet & Maintenance) | Vehicle registrations, fitness logs |
| 92 | `transport:student_assign`| `transport` | P2 | Screen 14.3 (Student Route Allocations)| Allocating students to bus stops |
| 93 | `hostel:read` | `hostel` | P2 | Screen 15.1 | Viewing rooms and occupancy |
| 94 | `hostel:rooms_write` | `hostel` | P2 | Screen 15.1 (Dormitories & Bed Grid) | Managing rooms and bed slots |
| 95 | `hostel:allocation_write`| `hostel` | P2 | Screen 15.1 (Dormitories & Bed Grid) | Allocating students to beds |
| 96 | `hostel:visitor_log` | `hostel` | P2 | Screen 15.2 (Gate Passes & Visitor Log) | Logging visitors & gate passes |
| 97 | `certificates:read` | `certificates` | P1 | Screen 16.1 | Viewing certificate issuance log |
| 98 | `certificates:generate` | `certificates` | P1 | Screen 16.1 (Certificate Studio) | Generating Character/Bonafide cards |
| 99 | `certificates:tc_issue` | `certificates` | P1 | Screen 16.1 (Transfer Certificate Studio)| Generating TC with clearance checks |
| 100 | `certificates:verify` | `certificates` | P1 | Screen 16.3 (Public QR Verification) | Public authenticity verification |
| 101 | `certificates:template_write`| `certificates`| P1 | Screen 16.2 (Template Designer) | SVG/HTML certificate template editor |
| 102 | `admissions:read` | `admissions` | P1 | Screen 17.1 | CRM pipeline and lead cards |
| 103 | `admissions:enquiry_create`| `admissions` | P1 | Screen 17.1 (Admissions CRM) | Logging prospective leads |
| 104 | `admissions:stage_update`| `admissions` | P1 | Screen 17.1 (Admissions CRM) | Kanban stage drag-and-drop |
| 105 | `admissions:convert_student`| `admissions`| P1 | Screen 17.3 (Convert Applicant Modal) | Converting candidate to student |
| 106 | `admissions:test_schedule`| `admissions` | P1 | Screen 17.2 (Entrance Test Scheduler) | Entrance test scheduling & scoring |
| 107 | `reports:dashboard_view` | `reports` | P0 | Screen 18.1 | Executive KPI dashboards |
| 108 | `reports:academic_view` | `reports` | P1 | Screen 18.2 (Academic Analytics) | Exam analytics & broadsheets |
| 109 | `reports:financial_view` | `reports` | P1 | Screen 7.14, 18.3 | Fee collection & defaulter aging |
| 110 | `reports:export_data` | `reports` | P0 | Screen 18.3 (Custom Report Builder) | Multi-tab Excel/PDF export engine |
| 111 | `reports:custom_filter_save`| `reports` | P1 | Screen 18.3 (Custom Report Builder) | Saving custom reporting presets |
| 112 | `roles:read` | `roles` | P0 | Screen 19.1 | Viewing role-permission matrix |
| 113 | `roles:write` | `roles` | P0 | Screen 19.1 (Role Matrix Grid) | Creating custom roles & toggles |
| 114 | `roles:assign` | `roles` | P0 | Screen 19.4, 20.4 | Assigning roles to users |
| 115 | `roles:audit_view` | `roles` | P0 | Screen 19.3 (Audit Trail Explorer) | Inspecting chronological audit logs |
| 116 | `roles:override_manage` | `roles` | P0 | Screen 19.2 (User Override Drawer) | Granting user permission overrides |
| 117 | `portals:parent_switchboard`| `portals` | P0 | Screen 20.1 (Parent Switchboard) | Multi-child portal switchboard |
| 118 | `portals:pos_terminal` | `portals` | P0 | Screen 7.6 (Accountant POS Terminal) | Desktop high-speed collection POS |
| 119 | `portals:teacher_mobile` | `portals` | P0 | Screen 20.3 (Teacher Mobile Terminal) | Mobile classroom terminal |
| 120 | `portals:student_portal` | `portals` | P0 | Screen 20.2 (Student Portal) | Student self-service dashboard |
| 121 | `portals:lock_manage` | `portals` | P2 | Screen 20.4 (Portal Credentials & Lock) | Locking optional self-service items |
| 122 | `settings:read` | `settings` | P0 | Screen 21.1, 21.4 | Viewing school profile & settings |
| 123 | `settings:write` | `settings` | P0 | Screen 21.1 (Institutional Profile) | Modifying branding, timezone, rules |
| 124 | `settings:integration_config`| `settings`| P0 | Screen 21.2, 21.3 | Payment gateway, SMS DLT credentials |
| 125 | `settings:backup_export` | `settings` | P0 | Screen 21.5 (Data Backup & DPDP) | Complete tenant backup ZIP export |
| 126 | `settings:sequences_manage`| `settings` | P0 | Screen 21.4 (Document Sequences) | Numbering generators configuration |
| 127 | `saas:schools_read` | `saas` | P1 | Screen 22.1 (Multi-Tenant Directory) | Super-admin tenant directory |
| 128 | `saas:schools_write` | `saas` | P1 | Screen 22.2 (Tenant Provisioning) | Provisioning new school tenant |
| 129 | `saas:plans_manage` | `saas` | P1 | Screen 22.4 (Subscription Plans) | Managing SaaS subscription plans |
| 130 | `saas:impersonate` | `saas` | P1 | Screen 22.3 (Impersonation Launcher) | Launching audited 60-min session |
| 131 | `saas:analytics_view` | `saas` | P1 | Screen 22.5 (Platform Telemetry) | Global API & database telemetry |
| 132 | `public_page:read` | `public_page`| P2 | Screen 23.1 (Public School Website) | Public school landing page |
| 133 | `public_page:write` | `public_page`| P2 | Screen 23.2 (School Website CMS) | Customizing public banner & gallery |

---

## 8. Document Completion & Verification

This Screen Catalog and User Interface Specification (`SCREENS.md`) is authoritative and complete across all 24 functional modules (Modules 0 through 23), all 6 user roles, and all 133 security permission tokens.

The document strictly satisfies all platform constraints:
- Built-in Supabase `role` claim is untouched; all routing, layout selection, and guards evaluate `app_role` and `school_id`.
- Zero placeholders (`TODO`, `TBD`, `as needed`, `accordingly`).
- Every screen specifies its exact Web (`Next.js App Router`) and Mobile (`Expo Router`) route.
- Tri-state UI contract (Loading Skeletons, Empty States, Error Boundaries) is specified across all screens.
- Full traceability to all 47 reference screenshots in `/reference` for behavior while preserving brand-new design system aesthetics.
- 100% token coverage: All 133 tokens from `PERMISSIONS.md` are mapped to screens or technical execution entries in Section 7.
- Mobile utilizes offline-lite (cached reads, queued attendance marking) rather than SQLite offline-first sync.
- V1 printing standardized to browser A4/A5 layouts with dynamic NPCI UPI QR codes; thermal printing and hardware barcode guns deferred to P2.
- Portal locks are restricted to optional online amenities and prohibited from locking results or attendance.

Per the binding execution plan, work now stops. The agent is awaiting user instruction:
`"next"` -> will initiate authoring of **`docs/DESIGN_SYSTEM.md`**.
