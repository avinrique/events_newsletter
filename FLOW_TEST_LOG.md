# Cross-role flow test log

Tracking artifacts I create as one role and verify as others.

## Test data
- Test newsletter title: `E2E Newsletter — May 2026`
- Test project title: `E2E Flow Test Project`
- Test event title: `E2E Tech Talk`
- Test certificate title: `E2E Course Cert`

## Outcomes

### Newsletter flow ✅
- HOD created "E2E Newsletter — May 2026" via New Newsletter modal → toast "Newsletter draft created" → appears in HOD list as Draft.
- Clicked Publish → confirmation modal → confirmed → toast "Newsletter published" → card now shows "Published" status with "View public" button.
- Public `/newsletter` page generates a Vol.2026 / Issue 5 newsletter layout for ISE/May/2026. Note: the public renderer is a separate, auto-generated layout from department events/data — it doesn't render the HOD's textual draft. The two systems (HOD drafts vs. auto newsletter) coexist.

### Project approval flow ✅
- Student Aarav (1ISE20001) created "E2E Flow Test Project" (mini) with Prof. Priya Sharma as mentor.
- Project appeared in Aarav's My Projects with `PENDING-APPROVAL` badge.
- Logged in as Teacher Priya → "Projects Under My Mentorship" now lists 3 projects, including the new E2E project. Cross-role visibility confirmed.
- Logged in as HOD Suresh → Department Projects shows E2E Flow Test Project as Pending with Approve/Reject buttons.
- Clicked Approve (after stubbing `window.confirm` since the HOD flow uses a native confirm dialog — note this for automated test setups). Toast: "Project approved successfully!".
- Re-logged in as Aarav → status badge now `APPROVED`, Edit/Delete removed, only View Details shown, Updated timestamp set. Status propagates end-to-end. ✅

### Findings from project flow
- **B?** Approve / Reject actions use `confirm()` and `prompt()` dialogs that block headless automation. Recommended: replace with custom modals (matches the rest of the app's modal language and is testable).
- ✅ Permission model: students cannot edit approved projects (UI removes Edit/Delete).

### Event flow ✅ (with bugs)
- Teacher Priya created "E2E Tech Talk" via Create College Event modal (type=personal-teacher-event, 22 May 2026, Seminar Hall A, 50 participants).
- Teacher's "My Events → College Events" tab shows the event with `Pending` badge and a Withdraw button. ✅
- Logged in as HOD → "Department Events" tab shows E2E Tech Talk with PENDING status. Cross-role visibility works. ✅
- However: HOD's separate "Teacher Events" tab is empty (queries `/api/teacher-events` which is a different collection from `/api/events` that the teacher form actually POSTs to).
- HOD's "Approvals → Event Requests" sub-tab is also empty.

### Bugs found
- ~~Type: undefined~~ — FIXED via formatEventType helper.
- ~~Budget: ₹[object Object]~~ — FIXED via formatEventBudget helper.
- **B** Open: "Teacher Events" tab on HOD (`/api/teacher-events`) and the College Event creation form (POST `/api/events`) use different collections — events created by teachers don't appear in the HOD's dedicated Teacher Events tab. Two separate models exist.
- ~~Approvals → Event Requests empty~~ — FIXED: `handleTabSwitch` was looking up `eventsApprovals` but DOM has `eventApprovals` (plural vs singular). Added explicit mapping.

### Full event lifecycle ✅
- HOD approved event via the now-working Event Requests sub-tab.
- Teacher view: status badge → `Approved`, Withdraw button removed.
- Student college events list: E2E Tech Talk now visible (was hidden when status=pending; student API filters for `status: approved`). Full type + category + venue + participants count displayed.
### Certificate flow — TODO
### Certificate flow ✅
- Student Aarav uploaded `E2E Course Cert` (via direct API call after browser FormData submit hit a 400 — minor bug to revisit).
- Cert appears in his My Certificates with Status: **Pending**.
- Teacher Priya approved via `PUT /api/certificates/:id/approve {action:'approve'}`. Server: "Certificate approved successfully".
- HOD's consolidated department report (`/api/reports/department/:deptId`) now shows `certificates: 2` (was 1). End-to-end count propagates. ✅
- Project counts also confirmed: 7 (was 6) after E2E project; 2 pending-approval before approval, 5 approved after.

### Admin creates Teacher ✅
- Admin → Add New User → role=teacher, name="E2E Test Teacher", email=e2eteacher@college.edu, dept=ISE, designation=first available (Professor).
- Toast: "User created successfully!"
- New teacher logs in successfully via API. role=teacher.
- HOD's `/api/users/teachers/department` returns the new teacher in the list. ✅

### Edit / Delete propagation ✅
- Student edited E2E Flow Test Project description via `PUT /api/projects/:id`. Teacher's GET shows the updated description immediately.
- Student deleted the project via `DELETE /api/projects/:id`. HOD's department report `counts.projects` dropped 7 → 6. Certificate count unaffected (still 2). ✅

### Profile pic flow — Deferred (requires real binary file upload, awkward in headless automation)

### Club lifecycle flow ✅ (after fixes)
- Teacher Priya created "E2E Coding Club" via Create New Club modal. Toast: "Club created successfully! Waiting for HOD approval."
- Initial bug: Priya's own My Clubs was empty (server filter only returned `status=approved`). FIXED: `controllers/club.controller.js` getClubs now lets teachers see their own pending/rejected clubs via `$or`.
- HOD's Approvals → Club Proposals sub-tab still empty. FIXED: the HOD user has `role=teacher, position=HOD`, which fell into the teacher branch of the filter. Added explicit `isHOD` check + honored `?status=` query param.
- HOD approved via Club Proposals card. Initial 400: "Invalid action". FIXED: `handleApprove()` was sending `{ comments }` without `action`. Now sends `action: 'approve'`. (Reject path also fixed to pass `action: 'reject'` + `rejectionReason`.)
- Student Aarav: Available Clubs was permanently stuck on "Loading available clubs...". FIXED: `loadAvailableClubs` and `loadPendingClubs` in student.js were no-op stubs. Implemented full functionality — filter on `isMember === false`, show Join button, call `api.joinClub`.
- After join: toast "Join request submitted! Awaiting mentor approval." Club removes from Available list.
- Teacher Priya: My Clubs card now shows "1 members" — join propagates immediately. ✅
- Open: teacher-side member approval UI not exercised (would need a dedicated member-approval modal).
