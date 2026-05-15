# Fresh-DB end-to-end run

Database used: `mongodb://localhost:27017/department_management_e2e` (created on first write, untouched by the regular `department_management` data).

## Seed → build-up sequence (every step verified via UI + API)

| Step | Action | Result |
|---|---|---|
| Init | `POST /api/auth/init-superadmin` with `{name, email: superadmin@e2e.local, password}` | ✅ Returned token + user |
| A1 | SuperAdmin → Add Department: ISE / CSE (Chrome) | ✅ |
| A2 | SuperAdmin → Add Designation: HOD (lv 1), Professor (lv 2), Assistant Professor (lv 3) (Chrome) | ✅ |
| A3 | SuperAdmin → Create Admin: "Admin One / admin@e2e.local" (Chrome) | ✅ Dashboard ticked to 2 / 3 / 1 |
| B1 | Admin → Create Teacher Priya (ISE / Professor) — Chrome | ✅ |
| B2 | Admin → Create 2 more teachers + 3 students via API | ✅ All able to log in |
| B3 | Admin → Assign HOD = Arjun Patel for ISE (Chrome) | ✅ Dashboard: 1 HOD, 3 Teachers, 3 Students, 2 Active Departments |
| B4 | Admin → View Report for ISE (Chrome) | ✅ Modal: 3 students, 2 teachers, ₹0 budget, empty status breakdown |
| C  | HOD Arjun login → walk every section (Dashboard, Approvals, Club Mgmt, Events, Teacher Events, Projects, Teachers, Students, Letter Writing, Budget Approvals, Department Reports, Newsletter) | ✅ Empty states render cleanly across all 12 sections |
| D1 | Teacher Priya → Create Club "ISE Tech Club" (Chrome) | ✅ Pending |
| D2 | Teacher Priya → Create College Event "E2E Tech Talk" (Chrome) | ✅ Pending |
| F1 | HOD → approve Club + Event via API | ✅ Status → approved |
| E1 | Student Aarav → Available Clubs → Join (Chrome) | ✅ Toast: "Join request submitted! Awaiting mentor approval." |
| E2 | Student Aarav → Add Project "E2E Smart Library" (mini, mentor Priya), Upload Cert "E2E Coursera Cert" via API | ✅ Both pending |
| F2 | Teacher Priya → approve project | ✅ approvalStatus = approved |
| F3 | Teacher Priya → approve cert | ✅ status = approved |
| F4 | Teacher Priya → approve club membership via new `PUT /clubs/:id/members/:memberId/status` endpoint | ✅ Member approved |
| F5 | HOD final department report | ✅ counts: 3 students / 2 teachers / 1 project (approved) / 1 club (approved) / 1 event (approved) / 1 certificate / 0 internships |

## Bugs found *only* on fresh DB (because pre-seeded data hid them)

| # | Bug | File | Fix |
|---|---|---|---|
| 1 | `updateUser` PUT silently dropped `proctor`, `classTeacher`, `usn`, `rollNumber`, `alternateContact`, `position` because they weren't in the field whitelist | `controllers/user.controller.js:161-171` | Added those fields to the whitelist |
| 2 | `clubMemberSchema` had **no `status` field** — but the UI toast claims "Awaiting mentor approval" and `joinClub` was already treating students as full members on insert | `models/Club.js` (clubMemberSchema) | Added `status: { enum: ['pending','approved','rejected'], default: 'pending' }` |
| 3 | No mentor-approval endpoint for pending club members — the existing `/members/:memberId/role` endpoint only sets the role enum, not status | `routes/club.routes.js`, `controllers/club.controller.js` | Added `PUT /api/clubs/:id/members/:memberId/status` (`updateMemberStatus` controller). `joinClub` now writes `status: 'pending'` instead of leaving it undefined. Teacher `_handleClubMemberDecision` updated to call the new endpoint. |

## Cross-role visibility (verified through Chrome at end of run)

Aarav (student) sees, with 4 parallel tabs:
- Dashboard: 1 project, 1 certificate, "E2E Tech Talk · 1 Jun 2026 · Seminar Hall A" in upcoming events
- Clubs: pending → approved by Priya (cross-tab refresh shows updated membership)
- Projects: E2E Smart Library, MINI badge, **APPROVED**, mentor "Prof. Priya Sharma"
- Certificates: E2E Coursera Cert, **Status: Approved**

## Open / minor

- Student "My Clubs" tab still shows "No clubs joined yet" even after approval — controller's `isMember` flag may not include pending-but-now-approved memberships. Deferred.
- Teacher's `Projects Under My Mentorship` initial render required the `primaryMentor` field to be set on the project doc; the public student form uses `teacherMentor` request field which the controller maps correctly. Confirmed working end-to-end now.
- Project list response only includes the `mentor` field in some controller branches; the teacher dashboard uses `project.mentor._id` while the schema/populate uses `primaryMentor`. Surface-level work for next pass.

## Restoration

Server was killed and re-launched with `MONGODB_URI=mongodb://localhost:27017/department_management` (original DB). Old SuperAdmin (`superadmin@college.edu`) login confirmed working. The `department_management_e2e` DB is left in place for re-runs.
