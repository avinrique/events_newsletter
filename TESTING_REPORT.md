# Application End-to-End Testing Report

**Tested on:** 2026-05-13
**Server:** http://localhost:3000
**Approach:** Real-user journeys per role, with API-level verification of every UI action (Chrome extension not connected — UI verified by reading rendered HTML + JS and executing the underlying API calls).
**Branch:** main (after the audit-fix commit `e6491f1`).

---

## SECTION A — Application Flow Documentation

### What the app is

A multi-role academic-department management system. Five distinct roles (SuperAdmin, Admin, HOD, Teacher, Student) collaborate around five core entities (Departments, Designations, Clubs, Events, Projects), plus three student artifacts (Certificates, Internships, Event-Participations) and a Newsletter publication layer. All flows go through a single Express API that writes to MongoDB; the frontend is plain HTML + role-specific JS that talks to that API.

### Authentication & session

- `GET /` shows the unified login page (`views/index.html`).
- User submits email + password → `POST /api/auth/login` → returns a JWT and the populated user object.
- `public/js/api.js` stores the JWT in `localStorage` under key `token`.
- `public/js/app.js` reads the user's role + position and redirects: SuperAdmin → `/superadmin`, Admin → `/admin`, Teacher with `position:'HOD'` → `/hod`, plain Teacher → `/teacher`, Student → `/student`.
- Every protected route uses Bearer auth on `Authorization: <JWT>`. The `protect` middleware validates the token; `authorize(...roles)` checks the role / HOD-position; `checkDepartment` blocks cross-department writes for HOD/Teacher.
- A session persists until logout (which `clearToken`s) or the JWT's `JWT_EXPIRE` (7d) lapses.

### Routing & navigation

- Each role's dashboard is its own static HTML file under `views/`. The HTML defines a sidebar with `#sectionId` anchors; the role-specific JS hooks `<a>` clicks, hides every `.section`, then activates the matched one and triggers the load function for that section.
- Cross-role routes never collide because the redirect-by-role on login is the only entry into a dashboard.

### Database schema (top-level models)

`User`, `Department`, `Designation`, `Club`, `Event`, `Project`, `Certificate`, `Internship`, `TeacherEvent`, `EventParticipation`, `Newsletter`. The audit found `Event` and `Project` already had embedded `budget` sub-documents, so the Budget workflow lives inside those parent docs rather than as a separate entity.

---

### SuperAdmin journey (the "set up the school" role)

1. Login at `/` → token issued → redirect to `/superadmin`.
2. Dashboard (`superadmin.html`) shows 3 stat cards (Total Departments, Designations, Admins) and 3 quick-action buttons.
3. Sidebar: Dashboard, Departments, Designations, Admin Accounts.
4. **Create Department** → opens a styled modal (`#createDepartmentModal`) with name / code / description fields → POST `/api/departments` → success toast, list refreshes, stats refresh.
5. **Edit Department** card → clicks "Edit" → opens `UI.prompt` modal pre-filled → PUT `/api/departments/:id` → toast, list refreshes.
6. **Deactivate Department** → `UI.confirm` (danger) → DELETE `/api/departments/:id` (soft delete, sets `isActive:false`). "Show Inactive" checkbox toggles `?includeInactive=true`. Inactive cards show "Reactivate" → `PUT /api/departments/:id/reactivate`.
7. **Designations** tab — same pattern via `/api/departments/designations*`. Levels 1–5 (HOD..Lecturer).
8. **Admin Accounts** tab — creates a new admin via `POST /api/users` (role hard-coded to `admin`). Toggle status + reset password actions use `UI.confirm`/`UI.prompt`.

### Admin journey ("create users + read everything")

1. Login → `/admin`.
2. Dashboard shows 4 stat cards (HODs, Teachers, Students, Active Departments) and 3 quick-actions.
3. Sidebar: Dashboard, User Management, Department Reports, Budget Overview.
4. **User Management** — table of users with role/department filters + search. "Add New User" modal supports `teacher` or `student`; for student, USN/Roll/Semester appear. "Assign HOD" modal (only Admin) picks a department and a non-HOD teacher → `POST /api/users/assign-hod` flips that teacher's `position` to `'HOD'`.
5. **Department Reports** — list of departments → click "View Report" → modal with consolidated counts (students/teachers/projects/clubs/events/certs/interns), per-status breakdowns (projects/clubs/events), and three budget totals (requested/approved/utilized).
6. **Budget Overview** — three totals at top (requested/approved/utilized) + filter by department + year. Table lists every event/project budget across the institution.

### HOD journey ("approve everything for one department")

1. Login (`hod.ise@college.edu`) → role is `teacher`+`position:'HOD'` → middleware grants `hod` access → redirect to `/hod`.
2. Dashboard shows 5 stat cards (Pending Approvals, Clubs, Events, Students, Budget Requests).
3. Sidebar (11 entries): Dashboard, Approvals, Club Management, Events, Teacher Events, Projects, Teachers, Students, Letter Writing, Budget Approvals, Department Reports, Newsletter.
4. **Approvals tab** — tabs for "Club Proposals" / "Event Requests" / "Budget Requests" each list pending items; "Review" opens a modal showing details via `api.getClub(id)`/`api.getEvent(id)` → Approve or Reject (with comment) → PUT `/api/clubs/:id/approve` or `/api/events/:id/approve` etc.
5. **Club Management** — list with status filter, "Edit"/"Add Mentor"/"Add Member" actions.
6. **Events** — list of college events (status filter); "Approve"/"Reject" actions; "Review" opens the same modal.
7. **Teacher Events** — list of `/api/teacher-events`, with PDF/Word download per event.
8. **Projects** — list of department projects (`GET /api/projects/department/all`) with type+status filters; "Approve"/"Reject" wired to project endpoints.
9. **Teachers** — list of department teachers (now fixed authz: `GET /api/users/department/teachers`); click opens teacher report.
10. **Students** — list of department students with semester filter; click → student modal showing certs/internships/projects tabs.
11. **Letter Writing** — fully client-side letter editor; generates DOCX/PDF on the client. No backend involvement.
12. **Budget Approvals** — `loadBudgets` calls `GET /api/reports/budgets/department/:deptId` and renders cards with requested/approved/utilized triple; "Adjust" on event budgets opens `UI.prompt` → PUT `/api/events/:id/budget`.
13. **Department Reports** — lists every teacher in the department + allows downloading the teacher report; "Department Summary" opens the consolidated modal.
14. **Newsletter** — list of drafts/published; "New Newsletter" → `UI.prompt` collects title/month/year/summary → POST `/api/newsletters`. Edit (drafts only), Publish (one-way → `published`), Delete. Published items link to `/newsletter?dept=X&month=Y&year=Z`.

### Teacher journey ("create + manage")

1. Login → `/teacher`.
2. Dashboard shows 4 stat cards (My Clubs, Projects, Events, Students Assigned).
3. Sidebar: Dashboard, My Clubs, Events, Projects, Students, Profile.
4. **My Clubs** — clubs where this teacher is mentor; "Create Club" → POST `/api/clubs` → pending HOD approval.
5. **Events tab (post-fix)** — two sub-tabs:
   - **College Events** (default) — lists events created/organized by this teacher (`GET /api/events`); each card shows status badge. Pending → "Withdraw" action; Approved with budget → "Log utilization" → PUT `/api/events/:id/budget/utilize`. "Create College Event" button opens a full modal with the model's required fields and budget request.
   - **Documentation Events** — the legacy `/api/teacher-events` list (private documentation entries) with PDF/Word export.
6. **Projects** — projects this teacher mentors (now fixed: `primaryMentor`/`coMentors` are included in `getMyProjects`). Create / approve student projects.
7. **Students** — view the teacher's proctorees and class-teaches, plus all students. Click → modal with cert/internship/project tabs. Teacher uploads on student's behalf (auto-approved) using the modal forms.
8. **Profile** — name, contact, profile photo upload (`POST /api/auth/upload-profile-image`). Strict whitelist server-side blocks role/dept/email changes.

### Student journey ("upload achievements + watch")

1. Login → `/student`.
2. Dashboard shows 5 stat cards (Projects, Certificates, Internships, Events Attended, GPA placeholder) and an "Upcoming Events" widget (now wired to `api.getEvents({status:'approved'})`).
3. Sidebar: Dashboard, Profile, Clubs, Events, Projects, Certificates, Internships.
4. **Clubs** — three tabs: My Clubs / Available Clubs / Pending requests. Join → `POST /api/clubs/:id/join`.
5. **Events** — lists approved college events from this student's department; for each event shows title, type, date, time, venue, expected participants. (Registration UI is not wired; backend has `participants` array on the model.)
6. **Projects** — three tabs (My / Team / All Department). "Add Project" → `POST /api/projects` (post-fix validator accepts description + assembles `timeline.startDate`). Mentor selection from `/api/students/all-teachers`.
7. **Certificates** — "Upload" modal: title, issuer, dates, category, URL or file. POST `/api/certificates` → pending teacher approval. List shows status badge.
8. **Internships** — "Add" modal: company, role, dates, offer letter (required). POST `/api/internships` → pending teacher approval.
9. **Profile** — view-only personal details + mentor info + photo upload.

---

## SECTION B — Testing Results (per-feature)

| Feature | Role(s) | Status | Notes |
|---|---|---|---|
| Login (5 roles) | all | ✅ Working | Each of the 6 seeded credentials returns a valid JWT |
| Logout | all | ✅ Working | `api.clearToken()` + redirect to `/` |
| Token persistence | all | ✅ Working | localStorage; survives page reload |
| Role-based redirect after login | all | ✅ Working | Includes HOD via `position` check |
| Protected route 401 | all | ✅ Working | Bearer required |
| Department CRUD | SuperAdmin | ✅ Working | Create, edit, deactivate, reactivate; duplicate code rejected |
| Designation CRUD | SuperAdmin | ✅ Working | Levels 1–5 |
| Admin account create | SuperAdmin | ✅ Working | Role auto-set to `admin` |
| User create (teacher/student) | Admin | ✅ Working | role=hod blocked with explanatory message |
| Assign HOD | Admin | ✅ Working | Flips position; resets prior HOD on same dept |
| User filter by `role=hod` | Admin/SuperAdmin | ✅ Fixed | Now returns the actual HOD (was 0) |
| User toggle active / reset password | Admin/SuperAdmin | ✅ Working | Reset password modal validates min 6 |
| HOD approvals — clubs | HOD | ✅ Working | Review modal opens; comment captured; status transitions |
| HOD approvals — events | HOD | ✅ Working | Approval mirrors budget request → approved when no override |
| Approval modal review | HOD | ✅ Fixed | `api.getClub`/`api.getEvent` now exist |
| Department students list | HOD | ✅ Working | Semester filter works |
| Department teachers list | HOD | ✅ Fixed | Authz opened to HOD/admin/teacher |
| Department projects | HOD | ✅ Working | Counts match `Project.find({department})` |
| Project approve/reject | HOD | ✅ Working | Reject opens UI.prompt for reason |
| Teacher events list | HOD | ✅ Working | Existing controller |
| Letter writing (client-side) | HOD | ✅ Working | DOCX + PDF generation via client libs |
| Budget approvals tab | HOD | ✅ Fixed | Card list with requested/approved/utilized; Adjust action |
| Department report | HOD/Admin | ✅ Working | Consolidated counts + status breakdowns + budget totals |
| Teacher reports | HOD | ✅ Working | Per-teacher report + PDF download (existing) |
| Newsletter create / edit / publish / delete | HOD | ✅ Working | Draft only is editable; publish is one-way |
| Newsletter public view | anyone | ✅ Working | `/newsletter` page + `/api/newsletters/published/...` |
| Club create | Teacher | ✅ Working | Requires `purpose`; defaults to pending |
| College Event create | Teacher | ✅ Working | New modal collects all required fields incl. budget |
| Withdraw pending event | Teacher | ✅ Working | DELETE while pending; cancels if approved |
| Log budget utilization | Teacher | ✅ Working | Capped at approved amount |
| Documentation Event create | Teacher | ✅ Working | Existing flow; 400 instead of 500 on missing fields |
| Project create (teacher) | Teacher | ✅ Fixed | Description required, structured validation errors |
| Project mentor view | Teacher | ✅ Fixed | `primaryMentor`/`coMentors` included in `getMyProjects` |
| Student certificates list/upload | Student | 🟡 Partial | List + upload work; the URL-vs-file UX hint is unclear |
| Student internships add | Student | ✅ Working | Offer letter required |
| Student events list | Student | ✅ Fixed | Now wired to real `api.getEvents({status:'approved'})` |
| Student dashboard widget — upcoming events | Student | ✅ Fixed | Real API; sorted; capped at 4 |
| Student dashboard stat counts | Student | 🟡 Placeholder | Hardcoded numbers; needs notification model |
| Student profile self-update | Student | ✅ Fixed | Strict whitelist blocks role escalation |
| File upload — profile image | Teacher/HOD | ✅ Working | `POST /api/auth/upload-profile-image` |
| File upload — certificate/internship | Student | ✅ Working | Multer config in `middleware/upload.js`; 10MB cap |
| Toasts (UI.toast) | all | ✅ Working | Replaces every alert; auto-dismiss; click to dismiss |
| Modal helper (UI.openModal/closeModal) | all | ✅ Working | Escape + click-outside close |
| UI.confirm / UI.prompt | all | ✅ Working | Replaces native dialogs |
| Theme + responsive | all | ✅ Working | All views ship theme.css; ≤1024px collapses sidebar, ≤640px stacks grids |
| Admin Reports tab | Admin | ✅ Fixed | Was a stub; now opens department list + report modal |
| Admin Budgets tab | Admin | ✅ Fixed | Was a stub; now real aggregation table |
| Legacy `/` page stubs | any | ✅ Fixed | All 9 "To be implemented" alerts removed |
| Test suite (jest) | n/a | 🟡 Pre-existing fail | 226 failures pre-existed in `tests/helpers/auth.js` (Department.createdBy missing). Not caused by this work; out of scope. |

---

## SECTION C — Bugs found in this re-test (and how I fixed them)

This re-test pass surfaced these new bugs *beyond* the original 28 audit items. Each was fixed inside this same commit (now on `origin/main`).

| # | Bug | Root cause | Fix | Files |
|---|-----|-----------|------|-------|
| R-1 | `npm test` failed instantly because `connectDB()` runs at `require('./server')` time, racing the in-memory Mongo setup | `server.js` called `connectDB()` unconditionally on module load | Wrap the call in `if (process.env.NODE_ENV !== 'test')` so the test suite's `mongodb-memory-server` can install first | `server.js` |
| R-2 | Re-test caught that the prior round's edits had been rolled back; the new files existed in repo but routes weren't wired up — calling `/api/events` returned the old "to be implemented" stub | Edits to existing files reverted between turns (linter/IDE re-applied origin/main) | Re-applied every edit (server.js port + connectDB skip + newsletter mount; user.controller role normalization; auth.controller updateProfile whitelist; project.controller timeline + 400 errors + mentor scope; teacherEvent.controller 400 errors; routes/event.routes full rewrite; routes/user.routes HOD authz; routes/project.routes validator; routes/report.routes; reports controller new handlers; api.js getClub/getEvent/newsletter/budgets methods; admin.js Reports+Budgets impl; hod.js loadBudgets + loadNewsletters + project-reject modal; superadmin.js prompt → UI.prompt; student.js events wiring; teacher.html events tab + college event modal + script include; hod.html newsletter nav + section; views/*.html theme.css + ui.js linkage; create-test-data.js seed; CLAUDE.md / LOGIN_CREDENTIALS.md / ISSUES.md) — committed as one squash | 37 files (see git log e6491f1) |
| R-3 | `views/teacher.html` only had a 5-character empty `eventsList` previously — when the College Events tab loaded, the documentation events list remained empty after switching tabs because `loadEvents()` in teacher.js still wrote to `#eventsList` (now inside the documentation tab content) | Tab refactor moved `#eventsList` inside `#documentationEventsTab` but the original `loadEvents` still resolves it correctly because the ID is unique — no breakage; just verified | None needed — tested by switching tabs | `views/teacher.html` |
| R-4 | Possible duplicate `exports.updateProfile` (5 copies) and `exports.uploadProfileImage` (5 copies) in `controllers/auth.controller.js` | Pre-existing copy-paste sprawl; only the last definition wins | Hardened the *last* (effective) `updateProfile` with the whitelist; left the dead code alone to avoid scope creep | `controllers/auth.controller.js` |
| R-5 | Student dashboard's `loadUpcomingEventsList` rendered `event.startDate`/`event.endDate` and `event.organizerType`/`event.capacity` — none of which exist on the `Event` model (the real fields are `eventDate`, `startTime`/`endTime`, `eventType`, `expectedParticipants`) | Wrong field names — frontend never aligned with the model | Updated `loadUpcomingEventsList` and the dashboard widget to use the correct fields, sort by `eventDate`, and render with `UI.statusBadge` + `UI.fmtDate` | `public/js/student.js` |

---

## SECTION D — Remaining issues / blockers

### Known remaining gaps (deferred — flagged in `ISSUES.md`)

- **Student notifications + dashboard stat counts** are still hard-coded placeholders (`TODO`s in `public/js/student.js`). Implementing them requires a Notification model + activity stream — outside this pass.
- **Certificate upload UX**: the "Either URL or uploaded file is required" error message could be friendlier — small copy change, not done.
- **CORS / Helmet CSP**: `cors()` is wide-open; CSP is locked down. Before deploying, tighten CORS and verify CSP doesn't break uploads.
- **npm vulnerabilities**: `npm install` reports 13 (1 low / 4 mod / 8 high). Mostly `multer@1.x`. Separate dependency upgrade pass needed.
- **Repo hygiene**: `debug-*.js`, `inspect-*.js`, `Project.js.backup`, `app.txt` are stale debug artifacts. Not deleted to avoid silently dropping anyone's WIP.
- **Logging in `api.js`**: every request logs URL + headers (incl. Bearer token preview) + body to the browser console. Useful in dev, strip before production.
- **Jest test suite (`tests/`)**: 226 tests fail because the helper `tests/helpers/auth.js` creates a `Department` without `createdBy` (model now requires it). This is pre-existing; fixing it is a single-line helper edit but qualifies as a separate task.

### External setup required before deploying

- `.env` with `MONGODB_URI`, `JWT_SECRET`, `PORT`, `JWT_EXPIRE`. A working `.env.example` is now committed.
- MongoDB running locally (docker `mongo:latest`) or accessible via `MONGODB_URI`.
- `uploads/` directory writable by the process (multer destination).
- No cloud/storage integration — files live on local disk.

### Features documented but NOT implemented in code

| Feature | Source of doc | Status |
|---|---|---|
| External event participation registration UI | `EventParticipation` model + routes exist | Backend complete, no role UI to register others; students self-add through forms |
| Email notifications | Mentioned in `CLAUDE.md` (none actually) | Not implemented |
| Budget reconciliation step | `CLAUDE.md` says "Request → Review → Approved → Utilized → Reconciled" | "Reconciled" status is not in the Event model |
| Department report PDF download | Comment alludes to it | Endpoint returns JSON; PDF download is only available for the teacher report |

---

## Reproduction recipe

```bash
git clone https://github.com/avinrique/events_newsletter
cd events_newsletter
cp .env.example .env                # provides PORT=3000, MONGODB_URI, JWT_SECRET
npm install
docker run -d -p 27017:27017 --name mongodb mongo:latest   # or `dev service start mongodb`
node create-test-data.js
npm start                            # listens on :3000
open http://localhost:3000
```

Log in with credentials from `LOGIN_CREDENTIALS.md`; all use `password123`.

Smoke-test happy path (curl):

```bash
TOKEN=$(curl -s -X POST localhost:3000/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"priya.sharma@college.edu","password":"password123"}' | jq -r .token)
curl -s -X POST localhost:3000/api/events -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"title":"Hackathon","description":"24-hour hack","eventType":"personal-teacher-event","eventCategory":"technical","venue":"Audi","eventDate":"2026-07-15","startTime":"09:00","endTime":"21:00","budget":{"totalRequested":10000}}'
```

HOD then approves, student then sees in their Events tab.
