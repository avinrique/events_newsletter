# Department Management System — Issues Report & Resolution Status

**Audit:** 2026-05-13 · 28 issues filed
**Fixes shipped:** 2026-05-13 · same session
**Server URL:** http://localhost:3000

Severity legend: **CRIT** = breaks core flow, **HIGH** = documented feature is unusable, **MED** = stub / placeholder shipped as UI, **LOW** = cosmetic or doc inconsistency. Status: ✅ FIXED · 🟡 PARTIAL · ⏭️ DEFERRED.

| #  | Sev  | Area | Issue | Status | Resolution |
|----|------|------|-------|--------|------------|
| 1  | CRIT | Setup | Server on `3007`, docs say `3000` | ✅ FIXED | `server.js` now `PORT = process.env.PORT \|\| 3000`. `.env` aligned. |
| 2  | CRIT | Setup | No `.env` / `.env.example` | ✅ FIXED | Added `.env.example` at repo root. |
| 3  | CRIT | Events API | `GET/POST/PUT /api/events*` were stubs | ✅ FIXED | New `controllers/event.controller.js` mirrors Club+TeacherEvent patterns. Routes wired in `routes/event.routes.js` with express-validator. Approve/reject/budget/utilize all implemented. |
| 4  | CRIT | HOD UI | HOD "Review" modal called missing `api.getClub`/`api.getEvent` | ✅ FIXED | Both methods added in `public/js/api.js`. |
| 5  | HIGH | Admin UI | Admin Reports & Budgets tabs were stubs | ✅ FIXED | `loadReports` opens a per-department report modal; `loadBudgets` now aggregates real data with filters (`renderAdminBudgets`). |
| 6  | HIGH | Reports API | `/api/reports/department/:id`, `/student/:id` were stubs | ✅ FIXED | `getDepartmentReport` consolidates counts + statuses + budgets; `getStudentReport` is per-student rollup. |
| 7  | HIGH | Budgets | No Budget workflow | ✅ FIXED | Budgets are embedded in Event & Project models. Added `PUT /api/events/:id/budget`, `PUT /api/events/:id/budget/utilize`, and aggregation at `GET /api/reports/budgets/department/:deptId`. HOD has Budget Approvals UI; Admin has Budgets UI. |
| 8  | HIGH | Newsletter | No admin/HOD compose layer | ✅ FIXED | New `models/Newsletter.js`, `controllers/newsletter.controller.js`, mounted at `/api/newsletters`. HOD dashboard has a Newsletter tab to create draft / edit / publish / delete. Public `GET /api/newsletters/published/:deptId/:year/:month` returns curated or falls back to auto-aggregation. |
| 9  | HIGH | Authz | `GET /api/users/teachers/department` was student-only | ✅ FIXED | Now accepts `student/hod/admin/teacher`. New alias `GET /api/users/department/teachers` for clarity. |
| 10 | HIGH | Docs/Auth | Doc said Admin creates HOD; code blocked it | ✅ FIXED | `CLAUDE.md` clarified: Admin creates Teacher/Student, then promotes via `assign-hod`. |
| 11 | HIGH | Seed | `LOGIN_CREDENTIALS.md` listed 3 teachers; seed made 2 | ✅ FIXED | `create-test-data.js` now creates the HOD as "Dr. Suresh Iyer" and seeds 3 distinct teachers (Priya Sharma, Arjun Patel, Rajesh Kumar). `LOGIN_CREDENTIALS.md` updated to match. |
| 12 | HIGH | Legacy index | 9× `alert('To be implemented')` in `public/js/app.js` | ✅ FIXED | Replaced with redirect-to-role calls; legacy `/` page now only renders the login flow. |
| 13 | MED  | Role query | `?role=hod` returned 0 because HOD = teacher+HOD | ✅ FIXED | `getUsers` normalizes `role=hod` → `{role:'teacher', position:'HOD'}`. |
| 14 | MED  | Projects | Teachers' `/api/projects` ignored mentored projects | ✅ FIXED | `getMyProjects` now `$or`s creator/team/primaryMentor/coMentors when caller is teacher/hod. |
| 15 | MED  | Projects | Validator didn't match model; 500 on missing field | ✅ FIXED | Validator now requires `description`; controller maps `startDate` → `timeline.startDate`; Mongoose `ValidationError` → 400 with field-level errors. |
| 16 | MED  | TeacherEvents | 500 on validation failure | ✅ FIXED | Catch detects `ValidationError`, returns structured 400. |
| 17 | MED  | Certificates | Upload UX said "Either URL or file required" | ⏭️ DEFERRED | Validator already enforces this — frontend hint should be clearer (cosmetic). |
| 18 | MED  | Student dashboard | 5× hard-coded placeholders | 🟡 PARTIAL | Events tab now hits real `api.getEvents` (upcoming/dashboard widgets both real). Notifications + stat counts remain placeholders — separate notification system needed. |
| 19 | MED  | HOD budget tab | "To be implemented" placeholder | ✅ FIXED | Real implementation in `loadBudgets`: cards with requested/approved/utilized + "Adjust" action wiring `updateEventBudget`. |
| 20 | MED  | Auth security | `updateProfile` accepted arbitrary fields | ✅ FIXED | Strict whitelist: only `name, contactNumber, profileImage` self-editable; `proctor/classTeacher` only by teacher/hod/admin. Verified: student PUT `{role:'admin'}` returns role still `student`. |
| 21 | MED  | CSP/CORS | CSP strict; CORS permissive | ⏭️ DEFERRED | Acceptable for dev; revisit before deployment. |
| 22 | MED  | Repo hygiene | Legacy debug scripts checked in | ⏭️ DEFERRED | Not breaking anything; clean up in a separate pass. |
| 23 | LOW  | Docs | Port/Admin-HOD inconsistencies | ✅ FIXED | `CLAUDE.md`, `LOGIN_CREDENTIALS.md` updated. |
| 24 | LOW  | Security | 13 npm vulnerabilities | ⏭️ DEFERRED | Tracked, separate dependency-upgrade pass. |
| 25 | LOW  | Logging | `api.js` logs token previews to console | ⏭️ DEFERRED | Helpful for dev; strip before prod. |
| 26 | LOW  | UX | Designation level range mismatch | ✅ FIXED | Edit-Designation now uses a styled modal with `min=1 max=5` matching the create dropdown. |
| 27 | LOW  | UX | 3× chained `prompt()` for edit-department/designation | ✅ FIXED | Replaced with `UI.prompt` (styled modal form) in `superadmin.js`. |
| 28 | LOW  | UX | Same on legacy index `createDept` | ✅ FIXED | Replaced with `UI.prompt` in `app.js`. |

---

## What changed (high-level)

### Foundation
- **`.env.example`** + **port 3000** (configurable via env)
- **`public/css/theme.css`** — shared design system: CSS variables (palette, spacing, radii, shadows), Inter font, base components (`.btn`, `.card`, `.stat-card`, `.badge`, `.form-control`, `.modal`, `.toast`, `.tab-bar`, `.t-table`, `.app-shell` sidebar/topbar), and responsive breakpoints at 1024px / 640px.
- **`public/js/ui.js`** — global `UI` helpers: `toast`, `openModal`/`closeModal`, `confirm`, `prompt`, plus `fmtDate`, `fmtMoney`, `escapeHtml`, `statusBadge`. Replaces native `alert/confirm/prompt` chains.

### Backend (new + fixes)
- **New** `controllers/event.controller.js`, `controllers/newsletter.controller.js`
- **New** `models/Newsletter.js`, `routes/newsletterApi.routes.js`
- **Modified** `routes/event.routes.js` (full rewrite), `routes/user.routes.js` (HOD/Admin/Teacher authz on teachers list), `routes/project.routes.js` (validator), `routes/report.routes.js` (new endpoints)
- **Modified** `controllers/user.controller.js` (role=hod normalization), `controllers/auth.controller.js` (profile whitelist), `controllers/project.controller.js` (model-shaped data + 400 on validation), `controllers/teacherEvent.controller.js` (400 on validation), `controllers/report.controller.js` (department report + student report + budgets aggregation)
- **Modified** `server.js` (port, newsletter API mount, skip connectDB under NODE_ENV=test)
- **Modified** `create-test-data.js` (Dr. Suresh Iyer as HOD; Prof. Rajesh Kumar as 3rd non-HOD teacher)

### UI overhaul
- Every view (`superadmin/admin/hod/teacher/student/index/newsletter`) now loads `theme.css` and `ui.js` before its role-specific stylesheet/script.
- Per-file `showNotification` definitions now delegate to `UI.toast` (styled, animated, escapable).
- Every `alert(...)` swapped to `UI.toast(msg, 'success'|'error'|'info'|'warning')` with smart kind inference.
- Worst `prompt()` chains (SuperAdmin edit-department/edit-designation/reset-password, legacy createDept, HOD project rejection, Admin reset password) → styled multi-field modal via `UI.prompt`.
- HOD nav adds **Newsletter** tab; Teacher gains a **Create College Event** button + tab.

### Verified end-to-end
- Teacher creates event with budget → HOD approves with override → Student sees approved event.
- HOD newsletter drafts → publishes → public endpoint returns the curated payload.
- Admin views department report modal with student/teacher/project/event counts + budget totals.
- `role=hod` filter returns 1 HOD (was 0); profile-update role escalation blocked; HOD can list department teachers.

---

## Deferred (out of scope this pass)

- **#17 cert hint** — UI copy improvement only.
- **#21 CSP/CORS** — production-hardening pass.
- **#22 repo hygiene** — non-functional cleanup.
- **#24 npm vulns** — dep upgrade pass.
- **#25 api.js logging** — strip before prod.
- **#18 student notifications + dashboard counts** — needs a notification model + activity stream.

---

## How to run

```bash
cp .env.example .env
npm install
# start MongoDB locally (docker run -d -p 27017:27017 mongo:latest)
node create-test-data.js
npm start
open http://localhost:3000
```

Log in with any credential from `LOGIN_CREDENTIALS.md` (all use `password123`).
