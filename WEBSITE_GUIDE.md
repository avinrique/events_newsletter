# Academic Department Management System — Website Guide

A simple walkthrough of how the website works, who logs in where, what each role can do, and how the flows connect.

---

## How to open the website

1. Make sure MongoDB is running.
2. Start the server: `npm run dev` (or `npm start`)
3. Open the browser: **http://localhost:3000**
4. You will see a single login page for everyone.

> There is **only ONE login page** for all users. The system reads your role from the database and automatically sends you to the right dashboard after login.

---

## The 5 Logins (Roles) in the System

| # | Role | What they do (in one line) |
|---|------|----------------------------|
| 1 | **SuperAdmin** | Sets up the institution — creates departments, designations, and admin accounts. |
| 2 | **Admin** | Creates teachers and students, assigns HODs, views all reports & budgets. |
| 3 | **Student** | Joins clubs, registers for events, uploads certificates/internships/projects. |
| 4 | **HOD** (Head of Department) | Final approval authority for the department — clubs, events, budgets, reports. |
| 5 | **Teacher** | Creates clubs, events, projects; mentors students; approves student submissions. |

### Test Login Credentials (already in DB)

```
SuperAdmin :  superadmin@college.edu    /  password123
Admin      :  admin@college.edu         /  password123
HOD (ISE)  :  hod.ise@college.edu       /  password123
Teacher    :  priya.sharma@college.edu  /  password123
Student    :  1ise20001@student.college.edu  /  password123
```

---

## 1. SuperAdmin — The Top of the Pyramid

**Login URL after sign-in:** `/superadmin`

SuperAdmin is the **first user** that gets created. They set up the foundation of the institution. They do **NOT** manage students, teachers, clubs, or events — they only set up the structure.

### Sidebar Menu
1. **Dashboard** — Overview cards: total departments, designations, admins.
2. **Departments** — Add/Edit/Delete departments like CSE, ISE, ECE.
3. **Designations** — Add teacher designation titles like Professor, Asst. Professor, Lecturer.
4. **Admin Accounts** — Create the Admin users who will run day-to-day operations.

### Typical flow for SuperAdmin (first-time setup)
```
Login as SuperAdmin
   ↓
Create Departments  (e.g. ISE, CSE, ECE)
   ↓
Create Designations (e.g. Professor, Asst. Professor, HOD, Lecturer)
   ↓
Create Admin Accounts (one or more)
   ↓
Log out — hand over to the Admin
```

### Quick Action buttons on Dashboard
- "Create Department"
- "Add Designation"
- "Create Admin"

> SuperAdmin **cannot** create teachers or students. That is the Admin's job.

---

## 2. Admin — The Operator

**Login URL after sign-in:** `/admin`

Admin is the **operations person**. They create all the teachers and students, assign one teacher per department as the HOD, and they can **view** (but not approve) reports and budgets across all departments.

### Sidebar Menu
1. **Dashboard** — Counts: total HODs, Teachers, Students, Active Departments.
2. **User Management** — Create teachers, students. Filter by role/department. Edit, deactivate, reset password.
3. **Department Reports** — View department-level statistics. (Read-only)
4. **Budget Overview** — See requested / approved / utilized budget per department per year. (Read-only)

### Quick Action buttons on Dashboard
- "Create Teacher"
- "Create Student"
- "Assign HOD"

### Typical flow for Admin
```
Login as Admin
   ↓
Create Teachers (fill: name, email, password, department, designation)
   ↓
Create Students (fill: name, email, password, department, USN, roll number, semester)
   ↓
Click "Assign HOD" → pick a teacher → pick a department
   ↓
That teacher is now the HOD of that department
```

> Important: Admin **cannot directly create a user with role "HOD"**. The Admin first creates a Teacher, then uses the **"Assign HOD"** button to promote them.

> Admin **cannot** approve clubs, events, or budgets — that's the HOD's job.

---

## 3. Student — The Achievers

**Login URL after sign-in:** `/student`

Students are the people uploading their achievements and joining activities. Almost everything a student submits goes to a **Teacher** (or sometimes HOD) for approval.

### Sidebar Menu
1. **Dashboard** — Quick stats: My Clubs, Events Attended, Projects, Certificates.
2. **Profile** — Edit name, contact, semester. Upload profile photo (JPG/PNG, max 5MB).
3. **Clubs** — Browse and join clubs.
4. **Events** — Register for college events; record participation in external events.
5. **Projects** — Submit projects (Major, Mini, or Personal).
6. **Certificates** — Upload course certificates (NPTEL, Coursera, etc.).
7. **Internships** — Record internship experience.

### Clubs tab — sub-tabs
- **My Clubs** — clubs the student has joined
- **Available Clubs** — approved clubs the student can join
- **Pending Approvals** — student's join requests awaiting approval

### Events tab — sub-tabs
- **College Events** — events created by teachers/HOD that students can register for
- **My Participations** — student's record of attended events
- Button **"Add External Event"** — record outside-college events with certificate URL

### Typical flows for a Student

**A. Upload a certificate**
```
Student → Certificates tab → "Upload Certificate"
   ↓
Fill: name, issuing org, dates, attach file (PDF/Image)
   ↓
Status: Pending
   ↓
Teacher reviews → Approves
   ↓
Certificate appears in student's verified record
```

**B. Submit a project**
```
Student → Projects → "New Project"
   ↓
Pick type: Major / Mini / Personal
   ↓
For Major/Mini: choose solo OR team, pick teammates, pick mentor (teacher), request budget if any
For Personal: optional mentor, no budget
   ↓
Submit → Status: Pending  (or auto-approved if Personal with no mentor/budget)
   ↓
Teacher → HOD (if budget) reviews → Approved
   ↓
Project moves: Pending → Approved → In Progress → Completed
```

**C. Join a club**
```
Student → Clubs → Available Clubs → Click "Join"
   ↓
Status: Pending
   ↓
Club mentor/HOD approves
   ↓
Club shows up in "My Clubs"
```

**D. Record an internship**
```
Student → Internships → "Add Internship"
   ↓
Fill: company, position, dates, description, stipend, attach offer letter
   ↓
Status: Pending → Teacher approves
```

---

## 4. HOD (Head of Department) — The Final Authority

**Login URL after sign-in:** `/hod`

The HOD is actually a **Teacher with HOD position**. So when they log in, they have **both** teacher features and HOD-only features. They are the **final approver** for everything in their department.

### Sidebar / Sections
1. **Dashboard** — Department stats: students, projects, clubs, events.
2. **Students** — View all department students, filter by semester.
3. **Projects** — All department projects with type/status filter. **Approve / Reject** pending ones.
4. **Teacher Events** — Manage events created by teachers. **Download as PDF/Word**.
5. **Reports** — Download teacher activity reports (PDF/Word).
6. **Newsletter** — Compose & publish the monthly department newsletter.
7. **Clubs** (from teacher side) — **Approve / Reject** club creation requests.
8. **Events** (from teacher side) — **Approve / Reject** event requests; can override budget.
9. **Certificates / Internships** — Oversight of student approvals.
10. **Budget Management** — Approve and allocate event/project budgets.

### What only HOD can do
- Final approval of **Clubs**
- Final approval of **Events** (including budget override)
- Final approval of **Budgets**
- Publish **Monthly Newsletter** for the department
- Generate **Department-level reports**

### Typical HOD approval flow
```
Notification of pending item (club / event / budget)
   ↓
Click the item → review details
   ↓
"Approve" or "Reject" (with optional reason)
   ↓
Status flips → all department users see the update
```

### Newsletter flow
```
HOD → Newsletter tab
   ↓
Choose department + month
   ↓
System auto-pulls: teacher events, student achievements, club activities
   ↓
Edit content → "Publish" or "Download"
```

---

## 5. Teacher — The Mentors

**Login URL after sign-in:** `/teacher`

Teachers create the activities (clubs, events, projects) and approve student submissions. They are the **first level of approval** before things go up to HOD.

### Sidebar Menu
1. **Dashboard** — My Clubs, Events Organized, Projects Mentored, Students Mentored.
2. **My Clubs** — Create / manage clubs.
3. **Events** — Two tabs: **College Events** and **Documentation Events**.
4. **Projects** — Create projects, approve student projects.
5. **Students** — Filter: All / My Students / As Proctor / As Class Teacher / Mentorship Requests.
6. **Profile** — Upload profile image, view personal stats.

### Typical flows for a Teacher

**A. Create a club**
```
Teacher → My Clubs → "Create Club"
   ↓
Fill: name, description, member limit, meeting schedule
   ↓
Status: Pending → HOD approves
   ↓
Approved → Students can now join
```

**B. Create an event (College or Documentation)**
```
Teacher → Events → "Create College Event" (or "Documentation Event")
   ↓
Fill: name, description, date/time, location, budget (optional), upload image
   ↓
Status: Pending → HOD approves (may adjust budget)
   ↓
Approved → Students can register
```

**C. Approve a student's certificate / internship / project**
```
Teacher → Students → click student name
   ↓
View their submissions → "Approve" or "Reject"
   ↓
Student is notified
```

**D. Upload something FOR a student (shortcut)**
```
Teacher → Students → pick student → Add certificate/internship/project
   ↓
Auto-approved (no extra approval step needed because the teacher submitted it)
```

> **Special rule:** When a teacher uploads on behalf of a student, the submission is **automatically approved** — bypassing the normal approval queue.

---

## How Everything Connects — Approval Chains

```
CLUBS:
  Teacher creates ───► HOD approves ───► Students can join

CLUB EVENTS:
  Club organizer ───► Club Mentor approves ───► HOD approves ───► Live

PERSONAL TEACHER EVENT:
  Teacher creates ───► HOD approves ───► Live

JOINT TEACHER EVENT:
  Multiple teachers create ───► HOD approves ───► Live

STUDENT PROJECT:
  Student submits ───► Teacher/mentor approves ───► (HOD if budget) ───► Approved

STUDENT CERTIFICATE:
  Student uploads ───► Teacher approves ───► Verified
  (Teacher uploads for student ───► Auto-approved)

STUDENT INTERNSHIP:
  Student records ───► Teacher approves ───► Verified
  (Teacher uploads for student ───► Auto-approved)

BUDGET:
  Anyone requests ───► HOD reviews & sets approved amount ───► Released
```

---

## Department Isolation (Important Rule)

- **SuperAdmin & Admin** — see everything across all departments.
- **HOD** — sees only their own department.
- **Teacher** — sees only their own department.
- **Student** — sees only their own department.

So a teacher in ISE cannot see a teacher's events in CSE. An HOD of ISE can only approve ISE clubs/events.

---

## Step-by-Step: How to Set Up From Scratch

If the database is empty, follow this order — each role depends on the one above:

```
1. SuperAdmin logs in
     → Creates Departments (ISE, CSE, ECE…)
     → Creates Designations (Prof, Asst. Prof, Lecturer)
     → Creates Admin account
                                          
2. Admin logs in
     → Creates Teachers (one per department, at least)
     → Creates Students
     → Clicks "Assign HOD" → picks a teacher per department
                                          
3. HOD logs in
     → Starts approving clubs/events/budgets as they come in
     → Publishes monthly newsletter
                                          
4. Teachers log in
     → Create clubs (await HOD approval)
     → Create events (await HOD approval)
     → Create projects, approve student submissions
                                          
5. Students log in
     → Join approved clubs
     → Register for approved events
     → Upload certificates, projects, internships → await teacher approval
```

---

## Quick Cheat Sheet — Who Approves What

| Item | Submitted By | First Approver | Final Approver |
|------|--------------|----------------|----------------|
| Club | Teacher | — | HOD |
| College Event | Teacher | — | HOD |
| Club Event | Club | Club Mentor | HOD |
| Joint Event | Teachers | — | HOD |
| Project (Mini/Major) | Student | Mentor Teacher | HOD (if budget) |
| Project (Personal) | Student | Mentor (if any) | Auto if no mentor |
| Certificate | Student | Teacher | — |
| Internship | Student | Teacher | — |
| Budget request | Teacher/Student | — | HOD |
| Newsletter | HOD | — | HOD (self-publish) |

---

## Useful Things to Remember

- File uploads: profile images **JPG/JPEG/PNG, max 5MB**.
- Certificate file: PDF or image.
- Internship: offer letter attachment supported.
- Reports & newsletters can be **downloaded as PDF or Word**.
- All passwords for test users: `password123`.
- Server runs on port **3000** (hardcoded in `server.js`).
- JWT token is stored in `localStorage` and lasts **7 days**.

---

*End of guide. For technical/API details, see `CLAUDE.md` and `README.md`.*
