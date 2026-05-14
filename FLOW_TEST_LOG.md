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
- **B** HOD Department Events card shows "Type: undefined" — the event has no `type` saved or the field name differs (`eventType` vs `type`).
- **B** HOD Department Events card shows "Budget: ₹[object Object]" — `event.budget` object is being string-coerced. Render `event.budget.totalRequested` or similar.
- **B** "Teacher Events" tab on HOD (`/api/teacher-events`) and the College Event creation form (POST `/api/events`) use different collections — events created by teachers don't appear in the HOD's dedicated Teacher Events tab.
- **B** HOD "Approvals → Event Requests" sub-tab doesn't pick up these pending events either. Approval workflow may be broken for personal teacher events.
### Certificate flow — TODO
### Profile pic flow — TODO
