# Open Questions & Architectural Decisions (OPEN_QUESTIONS.md)

This document tracks unresolved product decisions, tenant configuration variations, and confirmed architectural choices across the ERP multi-tenant platform.

---

## 1. Pending Decisions (Awaiting User Resolution)

### 1.1 Late Fine Grace Period Calculation Policy
- **Context**: In Module 7 (Fees) Section 3.1, schools can configure a `grace_period_days` (e.g., 5 days) alongside a `per_day` late fine rate (e.g., $1.50/day).
- **Baseline in PRD**: **Retroactive Full-Period Fine**.
  - Once the grace period is exceeded ($\text{Days Overdue} > \text{Grace Period Days}$), all days elapsed since the original due date are charged.
  - *Example*: Due date is the 10th, grace period is 5 days (until 15th). If paid on the 18th (8 days late), the student is charged for all 8 days ($8 \times \$1.50 = \$12.00$).
- **Alternative Under Consideration**: **Incremental Post-Grace Fine**.
  - Fines are charged only for days elapsed after the grace period cutoff expires ($\max(0, \text{Days Overdue} - \text{Grace Period Days})$).
  - *Example*: Paid on the 18th (8 days late), the student is charged only for the 3 days beyond the grace period ($3 \times \$1.50 = \$4.50$).
- **Decision Required**:
  - Should the platform enforce the retroactive baseline across all schools, or make this a configurable tenant setting (`grace_fine_mode: 'retroactive' | 'incremental'`) in `school_settings`?

---

## 2. Confirmed Architectural Decisions

The following architectural choices have been reviewed and approved:

| # | Topic | Confirmed Decision | Implementation Location |
| :-: | :--- | :--- | :--- |
| 1 | **Fee Ledger Scoping & Rollover** | `fee_ledger_entries` references `enrollment_id`. When a session closes, net unpaid arrears or overpaid advance credits roll into the new enrollment as a single signed `opening_balance` entry. | `docs/PRD.md` Sec 3.3, `docs/DATA_MODEL.md` Sec 3.5 |
| 2 | **Sibling Discount Scope** | Applies strictly to younger siblings sharing a `guardian_id` via `student_guardians` (eldest by DOB ascending pays full fee). Defaults exclusively to tuition heads. | `docs/PRD.md` Sec 3.2, `docs/DATA_MODEL.md` Sec 3.2 |
| 3 | **Monetary Rounding Standard** | Half-up rounding away from zero ($\operatorname{sgn}(x) \times \lfloor \|x\| + 0.5 \rfloor$) computed per line item to integer minor units prior to summation. | `docs/PRD.md` Sec 3.8, `docs/DATA_MODEL.md` Sec 1.3 |
| 4 | **Late Fine Typology** | Exactly two non-compounding types: `fixed_amount` or `per_day`, with optional cap (`max_fine_minor_units`) and grace period (`grace_period_days`). | `docs/PRD.md` Sec 3.1, `docs/DATA_MODEL.md` Sec 3.5 |
| 5 | **Class Ranking Mode** | Default is `rank_mode = 'shared'` with Standard Competition Ranking (`1, 2, 2, 4`), with alternative `rank_mode = 'tie_break'` executing a 4-stage deterministic tie-breaker. | `docs/PRD.md` Sec 3.6, `docs/DATA_MODEL.md` Sec 3.4 |
| 6 | **Job Queue Architecture** | Native PostgreSQL `job_queue` table with atomic row-level dequeuing (`FOR UPDATE SKIP LOCKED`) processed by `pg_cron` and Supabase Edge Functions. | `docs/DATA_MODEL.md` Sec 3.10 |
| 7 | **Accounts Module Scope (V1)** | Pragmatic single-entry cash book, income/expense heads, cash/bank accounts, daily cash closing, and P&L. No double-entry general ledger or journal vouchers in V1. | `docs/PRD.md` Module 8, `docs/DATA_MODEL.md` Sec 3.6 |
| 8 | **Payment Gateway Decoupling** | Pluggable interface (`PaymentGatewayAdapter`) supporting Stripe, Razorpay, or local banking gateways. | `docs/PRD.md` Sec 1.2, `docs/DATA_MODEL.md` Sec 3.5 |
| 9 | **Advance Payments & Overpayment** | Ledger entry amount is signed (`amount bigint`). Excess payments yield negative ledger balance. On next voucher, credit is allocated via `fee_payment_allocations` and displayed on the voucher without appending duplicate negative ledger entries. | `docs/PRD.md` Sec 3.9, `docs/DATA_MODEL.md` Sec 3.5 |
| 10 | **Student Evaluations (Absent vs Exempt)** | `exam_marks.marks_obtained` is nullable: NULL for absent (counted as 0 in totals, full max marks in denominator) and NULL for exempt (completely excluded from both numerator and denominator). | `docs/PRD.md` Module 6, `docs/DATA_MODEL.md` Sec 3.4 |
