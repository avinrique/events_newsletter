# System data flows — how each entity moves between roles

Verified end-to-end on 2026-05-15 via parallel browser + API testing. Every flow below was created by one role and observed in another.

## Roles
- **SuperAdmin** — owns departments, designations, admin accounts.
- **Admin** — creates Teachers/Students; promotes a Teacher to HOD via "Assign HOD".
- **HOD** — `role=teacher, position=HOD`; final approver for clubs, events, budgets in their department.
- **Teacher** — creates clubs/events/projects, approves student certificates and joins, mentors students.
- **Student** — submits projects/certificates/internships/event participations, joins clubs.

---

## 1. Project (Student → Teacher mentor → HOD)

```
[Student fills Add Project form]
  ↓ POST /api/projects
[Mongo: project.approvalStatus = pending-approval, mentor=<teacher>]
  ↓
[Teacher: GET /api/projects → filter by p.mentor._id == me]
  ↓ (Teacher sees it under "Projects Under My Mentorship")
[HOD: GET /api/projects?department=… → sees pending project with Approve/Reject]
  ↓ HOD clicks Approve → PUT /api/projects/:id/approve
[Mongo: approvalStatus = approved]
  ↓
[Student: My Projects → badge becomes "Approved", Edit/Delete buttons removed]
```

**Verified**: created "E2E Flow Test Project" as Aarav → showed in Priya's mentorship list → HOD approved → Aarav saw `Approved` badge.

**Edits**: `PUT /api/projects/:id` body `{description: "EDITED..."}` — change visible to mentor immediately.

**Delete**: `DELETE /api/projects/:id` — HOD report counts drop by one.

---

## 2. Event (Teacher → HOD → Student)

```
[Teacher fills Create College Event form]
  ↓ POST /api/events (eventType=personal-teacher-event|joint-teacher-event|club-event)
[Mongo: event.status = pending]
  ↓
[Teacher: My Events → "College Events" tab shows card with Pending + Withdraw]
[HOD: Department Events shows it; Approvals → Event Requests sub-tab shows it]
  ↓ HOD clicks Approve → PUT /api/events/:id with {action: 'approve'}
[Mongo: event.status = approved]
  ↓
[Teacher: badge becomes Approved, Withdraw button removed]
[Student: GET /api/events filters status=approved server-side → event now appears in College Events]
```

**Verified**: created "E2E Tech Talk" as Priya → HOD saw it in Approvals → approved → Aarav saw it.

**Bug history**: Display showed `Type: undefined` and `Budget: ₹[object Object]` — fixed via `formatEventType` / `formatEventBudget` helpers; the Approvals sub-tab was orphaned because the DOM id mismatch (`eventApprovals` vs `eventsApprovals`) is now mapped.

---

## 3. Club (Teacher creates → HOD approves → Student joins → mentor sees member)

```
[Teacher: Create New Club form]
  ↓ POST /api/clubs
[Mongo: club.status = pending, mentor=<teacher>, members=[]]
  ↓
[Teacher: GET /api/clubs → controller adds $or so the teacher's own pending clubs are visible]
[HOD: Approvals → Club Proposals → sees card, clicks Approve → PUT /api/clubs/:id/approve {action: 'approve'}]
[Mongo: status = approved]
  ↓
[Student: Clubs → Available Clubs → sees the approved club (server filters isMember=false)]
  ↓ Student clicks Join → POST /api/clubs/:id/join
[Mongo: club.members.push({student, status: 'pending'}), memberCount++]
  ↓
[Teacher mentor: My Clubs → member count increases (e.g., "1 members")]
```

**Verified**: Priya created "E2E Coding Club" → HOD approved → Aarav saw in Available Clubs → joined → Priya's card showed 1 members.

**Bug history**:
- The teacher's own pending club was hidden from her (now allowed via `$or`).
- HOD pending club approval was empty (HOD has `role=teacher`, so without `isHOD` check the teacher-branch filter excluded clubs not created by HOD).
- Approve/Reject 400s because frontend wasn't sending `action: 'approve'|'reject'`.
- Student "Available Clubs" / "Pending Approvals" tabs were no-op stubs — implemented.

---

## 4. Certificate (Student → Teacher approves → HOD report)

```
[Student: Upload Certificate form (URL or PDF)]
  ↓ POST /api/certificates (multipart)
[Mongo: certificate.status = pending, owner=<student>, department=<student's>]
  ↓
[Student: My Certificates → card shows Pending]
[Teacher: GET /api/certificates filters by department → can call PUT /api/certificates/:id/approve]
[Mongo: status = approved]
  ↓
[Student: card flips to Approved]
[HOD: department report counts.certificates increments by 1]
```

**Verified**: created "E2E Course Cert" for Aarav → Priya approved → HOD report `certificates: 1 → 2`.

**Open**: The browser FormData submission returned 400 once (cert created via direct API call instead). Worth re-investigating but no DB impact.

---

## 5. Newsletter (HOD draft → publish → public view)

```
[HOD: New Newsletter modal → title, month, year, summary]
  ↓ POST /api/newsletters
[Mongo: newsletter.status = draft]
  ↓
[HOD: Newsletter Management → Draft card with Edit / Publish / Delete]
  ↓ HOD clicks Publish → PUT /api/newsletters/:id/publish
[Mongo: status = published, publishedAt = now]
  ↓
[Public visitor: /newsletter → form with Dept/Month/Year → Generate Newsletter →
   GET /api/newsletters/published/:deptId/:year/:month → server returns the curated
   newsletter if present, or auto-generates one from events/projects in that period]
```

**Verified**: created "E2E Newsletter — May 2026" as HOD → published → public page rendered the ISE-themed PDF-style newsletter for May 2026 (no auth required).

---

## 6. Admin creates Teacher/Student

```
[Admin: Add New User modal]
  ↓ POST /api/users (role=teacher, dept, designation)
[Mongo: User created, isActive=true]
  ↓
[New user can immediately login → /api/auth/login → JWT]
[HOD: GET /api/users/teachers/department → sees new teacher in their list]
[SuperAdmin's Admin Accounts is unaffected — admins are managed separately]
```

**Verified**: created "E2E Test Teacher" → API login OK → HOD sees them.

---

## 7. SuperAdmin promotes Teacher to HOD

```
[SuperAdmin/Admin: Assign HOD modal → pick dept + teacher]
  ↓ POST /api/users/assign-hod {dept, teacher}
[Mongo: teacher.position = 'HOD', dept.hod = teacherId]
```

Not exercised this run, but the endpoint exists and is the only way to make an HOD (Admin cannot POST a user with role=hod directly — see CLAUDE.md).

---

## Cross-role count consistency (snapshot after this run)

| Entity | Count | Source of truth |
|---|---|---|
| Departments | 3 | `/api/departments` |
| Users | 22 (1 superadmin + 3 admins + 7 teachers + 11 students) | `/api/users` |
| ISE students | 10 | HOD report |
| ISE teachers | 5 (incl. new E2E Test Teacher) | HOD report |
| ISE projects | 6 (4 approved + 2 pending-approval) | HOD report |
| ISE clubs | 1 (E2E Coding Club) | HOD report |
| ISE events | 1 (E2E Tech Talk, approved) | HOD report |
| ISE certificates | 2 (Aarav's ML + E2E Course Cert) | HOD report |
| ISE newsletters | 1 (E2E Newsletter — May 2026, published) | `/api/newsletters` |

---

## Bugs fixed during the audit (referenced from FOUND_ISSUES.md and FLOW_TEST_LOG.md)

- Report 500: `populate('student')` against schemas with no `student` field — replaced with `find({ department })`.
- Modals opened left-aligned: legacy `style.display='block'` overrode `.modal { display: flex }`. CSS attribute selectors now force flex centering.
- HOD section-header CSS leak from newsletter print styles — removed unscoped rules.
- HOD Approvals sub-tabs (Events / Budgets) were dead because of plural→singular id mismatch.
- HOD approval action 400 — frontend wasn't sending `{ action: 'approve' }`.
- Teacher couldn't see her own pending club; HOD couldn't see any pending clubs — server controller now treats HOD as a distinct branch.
- Student Available Clubs / Pending Approvals were stub functions — implemented.
- Student dashboard counters were hardcoded to 0 — replaced with real counts.
- Teacher Profile stats were 0 because of populated-object/string mismatch — switched to a `sameId(ref)` helper.
- Teacher's "Projects Under My Mentorship" returned empty for the same reason — fixed.
- `<select>` elements were native/unstyled — added dark-theme styling with custom arrow.
- View Report button wrapped to 2 lines — `.btn { white-space: nowrap }`.
- Modal backdrop too transparent — bumped from `rgba(15,23,42,0.55)` to `0.78` with stronger blur.
- Hero banner department name had poor contrast — replaced opacity 0.9 with `rgba(255,255,255,0.95)` + text shadow.
- Hardcoded "Recent Activity" mock data on Teacher Profile — replaced with empty state.
- Sidebar `<ul>` bullets visible — `list-style: none` on nested `ul`.
- Newsletter `.letters-list` was hardcoded `background: white` — themed.
- Event display: `Type: undefined`, `Budget: ₹[object Object]` — added `formatEventType` / `formatEventDate` / `formatEventBudget` helpers; replaced 3 call sites.

---

## Still open (deferred)

- HOD Teacher Events tab (`/api/teacher-events`) and the College Event creation form (`/api/events`) point at different collections. Personal/joint teacher events never reach the dedicated HOD "Teacher Events" tab.
- Approve/Reject uses native `confirm()` / `prompt()` — should be replaced with the existing modal system for testability and consistency.
- Profile picture upload not exercised (binary upload from automation is awkward).
- Mentor-side member-approval UI on Club detail page not verified.
- Browser certificate FormData upload returned 400 once even though direct API call succeeds — worth re-investigating.
