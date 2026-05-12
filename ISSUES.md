# Department Management System — Issues Report

**Tested on:** 2026-05-13
**Test environment:** Node.js + Express + MongoDB (Docker), local
**Server URL:** http://localhost:3007 (not :3000 as docs claim)
**Method:** Code review + REST API smoke tests with curl (Chrome browser extension was not connected at test time, so dashboard rendering was verified by reading the HTML/JS, not by clicking)

---

## 1. What the project does (Application Flow)

Academic Department Management System with 5 roles and the following intended flow:

1. **Bootstrap** → run `create-test-data.js` (or `POST /api/auth/init-superadmin`) to create one SuperAdmin.
2. **SuperAdmin** logs in → manages Departments, Designations, Admin accounts.
3. **Admin** logs in → creates Teachers + Students; promotes a Teacher to HOD via "Assign HOD".
4. **HOD** (= Teacher with `position = "HOD"`) logs in → approves clubs/events/projects, views department students/teachers, generates reports, writes letters, manages teacher events.
5. **Teacher** logs in → creates Clubs (needs HOD approval), creates Teacher Events (personal/joint, needs HOD approval), manages Projects, approves Student certificates/internships/projects, manages assigned students.
6. **Student** logs in → joins approved Clubs, uploads Certificates / Internships / Projects / external Event Participations (most need teacher approval), views own dashboard stats.

**Routing:** `/api/auth/login` returns a JWT + user object; `public/js/app.js` redirects to `/superadmin`, `/admin`, `/hod`, `/teacher`, or `/student` based on `role` and `position`. The middleware `authorize()` treats a teacher with `position=HOD` as both `teacher` and `hod`.

**Data so far** (after seed): 1 SuperAdmin, 1 Admin, 1 HOD, 2 Teachers, 10 Students, 6 Projects, 1 Department (ISE), 3 Designations. No clubs/events/certificates/internships/budgets seeded.

---

## 2. Issues Found

Severity legend: **CRIT** = breaks core flow, **HIGH** = a documented feature is unusable, **MED** = stub / placeholder shipped as UI, **LOW** = cosmetic or doc inconsistency.

| #  | Severity | Area | Where | Issue | Repro / Evidence |
|----|----------|------|-------|-------|------------------|
| 1  | CRIT | Setup | `server.js:117` vs `CLAUDE.md`, `LOGIN_CREDENTIALS.md`, `README.md` | Server hard-codes **port 3007**, but every doc, the curl example in `CLAUDE.md`, and `LOGIN_CREDENTIALS.md` say port **3000**. Anyone following the README cannot reach the app. | `grep PORT server.js` → `const PORT = 3007;` |
| 2  | CRIT | Setup | repo root | No `.env` is committed or generated. `connectDB()` calls `mongoose.connect(process.env.MONGODB_URI, …)` — without `MONGODB_URI` it throws `Invalid scheme` and the process exits before the listener attaches. No `.env.example` either. | Removed the `.env` I created → `node server.js` exits with `Error: Invalid scheme, expected connection string to start with "mongodb://"`. |
| 3  | CRIT | Events API | `routes/event.routes.js` whole file | The entire **College Events** API is a stub. `GET /api/events`, `POST /api/events`, `PUT /api/events/:id/approve` all return `{ "message": "… To be implemented" }`. There is no `event.controller.js` (only `teacherEvent.controller.js` and `eventParticipation.controller.js`). | `curl /api/events` → `{"message":"Get events - To be implemented"}`. CLAUDE.md lists Events as a first-class entity. |
| 4  | CRIT | HOD dashboard | `public/js/hod.js:1651,1653` | HOD "approve club / approve event" flow calls **`api.getClub(id)`** and **`api.getEvent(id)`** — neither method exists on the `API` class in `public/js/api.js`. Clicking "Review" in the Approvals tab throws `api.getClub is not a function` and the modal never opens. | `grep -n "getClub\b\|getEvent\b" public/js/api.js` → only `approve/reject/my-participations`, no single-getters. |
| 5  | HIGH | Admin dashboard | `public/js/admin.js:421-453`, `views/admin.html:94-131` | The Admin "Department Reports" and "Budget Overview" nav items are stubs. Both show `"… functionality - To be implemented"` notifications and hard-coded ₹0 totals. CLAUDE.md lists "View all reports (read-only)" as an Admin capability. | Code says `// TODO: Implement actual report loading`, `// TODO: Implement actual budget loading`. |
| 6  | HIGH | Reports API | `routes/report.routes.js`, `public/js/api.js:444` | Two report endpoints used by the frontend are stubs: `GET /api/reports/department/:deptId` returns `"To be implemented"`, `GET /api/reports/student/:studentId` returns `"To be implemented"`. `api.getDepartmentReport()` / `api.getStudentReport()` will therefore never populate any UI. | `curl /api/reports/department/<id>` → stub JSON. |
| 7  | HIGH | Budgets | system-wide | The whole **Budget** workflow described in CLAUDE.md (Request → HOD Review → Approved → Utilized → Reconciled) is **not implemented**. No model, no controller, no routes. HOD and Admin both have a "Budgets" nav item that renders a static placeholder. | No file under `models/` named Budget; `grep -ri "model.*[Bb]udget" .` returns nothing. |
| 8  | HIGH | Newsletter | `routes/newsletter.routes.js`, `server.js:67-69` | `server.js` requires `./routes/newsletter.routes` and mounts it at `/newsletter`, but no role-side UI links to it; only the standalone `views/newsletter.html` does. There is no `Newsletter` model and no admin/teacher entry point to manage newsletter content. (Repo is named `events_newsletter` — this looks half-built.) | `ls models/` has no Newsletter; only `views/newsletter.html` exists. |
| 9  | HIGH | Authorization | `routes/user.routes.js:24` | `GET /api/users/teachers/department` is restricted to `authorize('student')` only. The HOD dashboard's "Teachers" tab and the Admin "Assign HOD" form both need this list; HODs cannot fetch their own department's teacher list. | `curl -H "Authorization: Bearer <HOD>" /api/users/teachers/department` → `403 User role teacher (HOD) is not authorized to access this route`. |
| 10 | HIGH | Auth flow / docs | `controllers/user.controller.js:10-16` vs `CLAUDE.md` permissions table | CLAUDE.md states Admin can "Create all user types (HOD/Teacher/Student)". Controller blocks role=`hod` outright (`"Admin can only create Teacher and Student accounts"`). The HOD UX is "create Teacher → Assign HOD", but the doc is wrong / the controller message is wrong, and there is no UI hint of the workflow except a tiny `<small>` in the modal. | `POST /api/users` with `role:"hod"` as Admin → `403 Admin can only create Teacher and Student accounts`. |
| 11 | HIGH | Seed vs docs | `create-test-data.js` vs `LOGIN_CREDENTIALS.md` | `LOGIN_CREDENTIALS.md` lists three teachers (Priya, Arjun, Rajesh Kumar), but the seed script only creates two; "Rajesh Kumar" is created as the HOD, not as a separate teacher. Logging in with `rajesh.kumar@college.edu` fails. | `curl /api/auth/login` with rajesh.kumar → `{"success":false,"message":"Invalid credentials"}`. |
| 12 | HIGH | Frontend index page | `views/index.html`, `public/js/app.js:164-198,486,502` | The legacy "/" dashboard (when reached via the un-redirected fallback) has **9 alert("… To be implemented")** stubs for Designations, Admins, Clubs, Events, Projects, Profile, Reports, Budgets, plus Edit User and Edit Department. Index navigation is essentially non-functional once you're past login. | `grep "To be implemented" public/js/app.js`. |
| 13 | MED | HOD users listing | `routes/user.routes.js:21`, frontend filtering | `GET /api/users?role=hod` returns `count:0` because HODs are stored as `role:"teacher"` + `position:"HOD"`. Any caller that filters by `role:"hod"` (e.g. SuperAdmin "Total HODs" if it were ever wired, or filter dropdowns in admin.html `<option value="hod">HODs</option>`) gets an empty list. | `curl "/api/users?role=hod"` → `count:0`; `admin.html:80` has the filter option. |
| 14 | MED | Project listing | `controllers/project.controller.js` (getMyProjects) | Logged-in **Teacher** calling `GET /api/projects` (their own dashboard's "My Projects" tab) returns `count:0` even though seeded projects exist where the teacher is the mentor/guide. Only the student-creator sees them via `/api/projects`. Teachers must use the (mentor-scoped) variant or `/department/all`, but the teacher UI doesn't appear to call those. | `curl -H "$T1" /api/projects` → `count:0`; `curl -H "$HOD" /api/projects/department/all` → `count:6`. |
| 15 | MED | Project create | `routes/project.routes.js` validator vs `models/Project.js` | `POST /api/projects` validator only requires `title, projectType, domain`; the Mongoose model requires `description` and `timeline.startDate`. Result: any request that passes validator-required-fields still 500s with `Project validation failed: timeline.startDate: Path \`timeline.startDate\` is required`. The error is leaked verbatim to the client. | Posted `{title,projectType,domain}` → HTTP 500. |
| 16 | MED | Teacher event create | `controllers/teacherEvent.controller.js` (error handler) | `POST /api/teacher-events` with a missing field returns HTTP 500 `{"success":false,"message":"Error creating teacher event"}` with no `error` body in non-dev cases. Hard to debug from the dashboard. | `curl POST /api/teacher-events {…}` → 500 with empty error context. |
| 17 | MED | Certificates upload | `controllers/certificate.controller.js` | `POST /api/certificates` requires "either certificate URL or uploaded file"; the student frontend form is multipart, but if a user fills out the modal without picking a file the message is misleading and the form silently fails. | `curl POST /api/certificates` (JSON only) → `400 Either certificate URL or uploaded file is required`. |
| 18 | MED | Student dashboard | `public/js/student.js:461,482,500,1797,1802` | 5 `TODO: Load actual …` blocks: dashboard stats counts, recent notifications, upcoming events, and two teacher/event integration TODOs. Stats and notifications show hard-coded placeholders. | `grep TODO public/js/student.js`. |
| 19 | MED | HOD budget tab | `public/js/hod.js:680-756` | "Budget Approvals" tab in HOD dashboard is two TODO comments + a hard-coded `"Budget management functionality - To be implemented"` message. | `grep -n "TODO" public/js/hod.js`. |
| 20 | MED | Auth route mismatch | `routes/auth.routes.js:74` vs `public/js/api.js` | `api.updateProfile()` PUTs to `/auth/profile` — route file defines `PUT /profile`. OK. But the controller calls `findByIdAndUpdate` with no validation of which fields a non-admin user can self-edit, so a Student could `PUT /api/auth/profile {role:"admin"}` if the controller doesn't filter. Worth auditing — not verified end-to-end. | Audit `controllers/auth.controller.js: updateProfile`. |
| 21 | MED | CORS / Helmet | `server.js:14-31` | `connectSrc: ["'self'"]` blocks any future call to an external API from the browser (e.g. `/newsletter` page would not be able to fetch external mailer/CDN endpoints). Also `cors()` is set to default `*`, which is permissive — fine for dev, but inconsistent with the locked-down CSP. | Read server.js CSP block. |
| 22 | MED | Stale debug scripts | repo root | 7 ad-hoc debug scripts checked into root: `check-db-updates.js`, `cleanup-broken-images.js`, `debug-form.js`, `debug-teacher-validation.js`, `export-teacher-event-json.js`, `inspect-teacher-event.js`, `test-department-comparison.js`, `test-teacher-permissions.js`, plus `Project.js.backup` and `app.txt`, `resume.pdf`. Not bugs in themselves but they pollute the repo and suggest stale state. | `ls .` |
| 23 | LOW | Docs | `CLAUDE.md`, `LOGIN_CREDENTIALS.md`, `README.md` | Multiple inconsistencies: port (3000 vs 3007), "3 teachers" vs 2 seeded, "Admin can create HOD" vs "Admin can only create Teacher/Student". README says `npm test` runs the suite (it does) but the suite was not part of this audit. | See referenced files. |
| 24 | LOW | Security | dependencies | `npm install` reports **13 vulnerabilities (1 low, 4 moderate, 8 high)**; `multer@1.4.5-lts.2` flagged ("upgrade to 2.x"). | `npm install` output. |
| 25 | LOW | Logging | `public/js/api.js:44-67` | Every API request logs URL, headers (including Bearer token preview), and body to the browser console. Fine for dev, but worth removing before any non-local deploy. | Read api.js. |
| 26 | LOW | UX | `views/superadmin.html:139-171` | "Create Designation" modal forces a `select` with five hard-coded levels (1-5); the prompt-based "Edit Designation" then asks for "Level (1-10)" in a `prompt()`. Inconsistent ranges. | Compare lines 152-158 with `public/js/superadmin.js:427`. |
| 27 | LOW | UX | `public/js/superadmin.js:369-372,426-428` | Department and Designation edit flows use **3 separate `prompt()` dialogs** instead of a modal. Refresh-unfriendly and skipped fields blank out values. | Read superadmin.js. |
| 28 | LOW | UX | `public/js/app.js:467` | Same issue on legacy index — `showCreateDeptForm()` uses three `prompt()` dialogs in a row. | Read app.js. |

---

## 3. Sanity-check matrix (what I verified)

| Role | Login | /me | Main dashboard endpoint(s) hit | Result |
|------|-------|-----|---------------------------------|--------|
| SuperAdmin | ✅ | ✅ | `/api/departments`, `/api/departments/designations/all`, `/api/users?role=admin` | All 200, dashboard data renders |
| Admin | ✅ | ✅ | `/api/users`, `/api/departments`, `/api/users/assign-hod` | Core CRUD works; "Reports" and "Budgets" tabs are stubs (see #5) |
| HOD (teacher+HOD) | ✅ | ✅ | `/api/users/department/students`, `/api/projects/department/all`, `/api/teacher-events`, `/api/reports/department/teachers` | Most tabs functional; "Teachers" tab fails (see #9); "Approvals" review modal will throw (#4); "Events" tab empty because of #3; "Budget" tab is a stub (#19) |
| Teacher (non-HOD) | ✅ | ✅ | `/api/clubs`, `/api/projects`, `/api/teacher-events`, `/api/certificates`, `/api/internships`, `/api/event-participations` | Club create works (with `purpose`); project create requires fields beyond validator (#15); event create errors (#16) |
| Student | ✅ | ✅ | `/api/students/all-teachers`, `/api/students/all-students`, `/api/projects`, `/api/certificates`, `/api/internships`, `/api/event-participations` | Lists work; uploads need correct multipart fields (#17); dashboard stats are placeholders (#18) |

---

## 4. Recommended fix order

1. **#2, #1** — ship a `.env.example`, align port and docs.
2. **#3** — implement College Events controller + routes, or remove the menu items.
3. **#4** — add `api.getClub(id)` / `api.getEvent(id)` (and the `/api/events/:id` route).
4. **#9** — open `GET /api/users/teachers/department` to HOD (and Admin) or move the HOD-side data to `/api/users?role=teacher&department=…`.
5. **#15, #16** — make request validation match the model, return structured 400s instead of 500s.
6. **#5, #6, #7, #19** — either build Reports/Budgets or hide their tabs to stop misleading users.
7. **#11, #23** — re-sync `LOGIN_CREDENTIALS.md`, `CLAUDE.md`, `README.md` with `create-test-data.js`.
8. **#13** — normalise "HOD" representation: either always query by `position:"HOD"` or expose a virtual `role` that includes it.
9. **#20** — audit `auth.updateProfile` to make sure role/department aren't self-editable.

---

## 5. How to reproduce

```bash
dev service start mongodb            # or: brew services start mongodb-community
cat > .env <<'EOF'
PORT=3007
MONGODB_URI=mongodb://localhost:27017/department_management
JWT_SECRET=local_dev_jwt_secret_change_me
JWT_EXPIRE=7d
NODE_ENV=development
EOF
npm install
node create-test-data.js             # seeds users + projects
npm start                            # listens on :3007
open http://localhost:3007           # use credentials from LOGIN_CREDENTIALS.md
```

Login as each role with `password123` and follow the matrix in §3 to reproduce.
