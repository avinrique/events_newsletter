# Audit Findings — 2026-05-15

Living log of bugs and UI/UX issues discovered while walking every feature as each role.

## Legend
- **B** = functional bug
- **U** = UI/UX issue
- **!** = blocking
- **?** = needs verification

---

## SuperAdmin
- ~~Create-Department modal opens left-aligned~~ — FIXED (CSS attribute selector)
- **U** Modal backdrop is too transparent — content behind remains highly legible, hurting focus. Need stronger overlay/blur.
- **U** Admin Accounts: System Admin card lacks Edit button (only Deactivate/Reset). Consistency: either remove Edit from all or add to System Admin.
- **B** Create Admin modal: Email field pre-fills with current user's email (`superadmin@college.edu`). Browser autofill or buggy population.
- **U** Hierarchy Level `<select>` in Add Designation modal is unstyled native — clashes with dark theme.

## Admin
- **B!** Admin → Department Reports → "View Report" returns 500. Server: `StrictPopulateError: Cannot populate path 'student' because it is not in your schema` at report.controller.js:422-423. Certificate/Internship schemas have `owner`+`department` (not `student`). Fix: replace with direct `find({ department: deptId })`.
- **U** "View Report" button text wraps to 2 lines (button width too narrow for icon + text). Add `white-space: nowrap` or wider min-width.
- **U** Error toast appears at top-right and overlaps "Logout" button + tab nav. Re-position toast below header.
- **B?** Budget Overview shows all ₹0 with empty state — no budget requests have been submitted; can't fully verify the filter UI works with data.

## Student
- **B** Dashboard counters wrong: shows "0 Projects" while Projects tab lists 1 pending; "0 Certificates" while Certificates tab shows 1 approved. Counters out of sync with data.
- **U** Section headings on Student pages ("My Projects", "My Certificates", "My Internships", "Profile", "Events") render faded/low-contrast (~30% opacity feel). Hard to read against the dark background.
- **U** "Add External Event" / "Add Internship" / "Upload Certificate" header action buttons appear faded compared to filled buttons elsewhere (variant inconsistency).
- **U** Project card on student page had View Details / Edit / Delete buttons appearing semi-transparent — same fading issue.

## Teacher
- **B** Teacher Projects → "Projects Under My Mentorship" shows empty for Priya Sharma even though Aarav's project lists her as mentor. Likely query field mismatch.
- **B** Teacher Profile stats inconsistent with Dashboard: Profile shows "0 Students Assigned" but Dashboard shows "10 Students Mentored". Different queries returning different counts.
- **U** Teacher sidebar nav renders default list bullets (•) before each item — should be `list-style: none`.
- **U** Hero banner on Profile: department name "Information Science and Engineering" is light gray on light blue background → fails contrast.
- **U** Section H2 titles ("My Clubs", "My Events", "My Students") render in faded color — almost ghostly.
- **U** "Documentation Event" / "Create College Event" buttons look like outline-disabled style — should be visibly primary or secondary, not muted.
- **B?** Profile "Recent Activity" hardcoded mock data ("Approved 2 student projects 2 days ago") — verify it's actually live.

## Student (cross-check)
- **B** Student dashboard stat counter shows "0 Projects" while Projects list has 1 pending project. Counter likely filters approved-only without labeling.

## HOD
- **U!** All HOD section headings ("Department Clubs", "Department Events", "Department Teachers", "Department Projects", "Letter Writing", "Budget Management", "Department Reports", "Newsletter Management", "Teacher Events") have light gray background with light text → nearly invisible. Root cause: `hod.css:1077-1092` defines `.section-header` and `.section-title` with `!important` for newsletter print, but is unscoped so it leaks into the dashboard UI. Fix: scope to `.newsletter-print .section-header` or rename to a newsletter-only class.
- **B** Department Report endpoint works for teacher report (4 teachers shown) but consolidated department report still fails (admin bug; same controller).
- **U** Recent Activity card on Dashboard: light text on near-same-color background, hard to read.
- **U** Native HTML `<select>` dropdowns on HOD pages (All Clubs / All Events / All Status / All Teachers / Report Type / Report Period) are unstyled — clash with custom dark theme.
- **B?** Priya Sharma is listed with 2 Projects Mentored in HOD's teacher report, yet her own Teacher → Projects page shows "No projects under mentorship." → confirms query mismatch in teacher.js / teacher controller.

## Cross-cutting
- **U** Tab nav header clicks via cursor coords sometimes don't switch tab (works via JS .click()). Possible z-index/overlap issue.
- **U** "Department Overview" / "Pending Approvals" / "Department Projects" headings render as faded/light-on-light bars on HOD page (poor contrast).
- **U** Projects view on Student page has faded "View Details / Edit / Delete" buttons (low contrast).
