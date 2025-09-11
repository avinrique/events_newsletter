# Route Summary

## Quick Reference Guide

This document provides a quick reference for all API routes, their methods, required authentication, and what they do.

## Authentication Routes (`/api/auth`)

| Method | Endpoint | Auth Required | Roles | Description |
|--------|----------|---------------|-------|-------------|
| POST | `/init-superadmin` | ❌ | None | Initialize first super admin |
| POST | `/login` | ❌ | None | User login |
| POST | `/register` | ✅ | Any | Register new user (protected) |
| GET | `/me` | ✅ | Any | Get current user profile |
| PUT | `/updatepassword` | ✅ | Any | Update user password |
| PUT | `/profile` | ✅ | Any | Update user profile |
| POST | `/upload-profile-image` | ✅ | Any | Upload profile image |

---

## User Management (`/api/users`)

| Method | Endpoint | Auth Required | Roles | Description |
|--------|----------|---------------|-------|-------------|
| POST | `/` | ✅ | SuperAdmin, Admin | Create new user |
| GET | `/` | ✅ | SuperAdmin, Admin, HOD, Teacher | Get all users |
| GET | `/teachers/department` | ✅ | Student | Get department teachers |
| GET | `/students/all` | ✅ | Teacher | Get all students with relationships |
| GET | `/:id` | ✅ | SuperAdmin, Admin, HOD, Teacher | Get single user |
| PUT | `/:id` | ✅ | SuperAdmin, Admin, Teacher | Update user |
| PUT | `/:id/toggle-status` | ✅ | SuperAdmin, Admin | Activate/deactivate user |
| PUT | `/:id/reset-password` | ✅ | SuperAdmin, Admin | Reset user password |
| DELETE | `/:id` | ✅ | SuperAdmin, Admin | Delete (deactivate) user |
| POST | `/assign-hod` | ✅ | Admin | Assign HOD to department |

---

## Department Management (`/api/departments`)

| Method | Endpoint | Auth Required | Roles | Description |
|--------|----------|---------------|-------|-------------|
| POST | `/` | ✅ | SuperAdmin | Create department |
| GET | `/` | ✅ | Any | Get all departments |
| GET | `/:id` | ✅ | Any | Get single department |
| PUT | `/:id` | ✅ | SuperAdmin | Update department |
| DELETE | `/:id` | ✅ | SuperAdmin | Delete department |
| PUT | `/:id/reactivate` | ✅ | SuperAdmin | Reactivate department |
| POST | `/designations/create` | ✅ | SuperAdmin | Create designation |
| GET | `/designations/all` | ✅ | Any | Get all designations |
| GET | `/designations/:id` | ✅ | Any | Get single designation |
| PUT | `/designations/:id` | ✅ | SuperAdmin | Update designation |
| DELETE | `/designations/:id` | ✅ | SuperAdmin | Delete designation |

---

## Club Management (`/api/clubs`)

| Method | Endpoint | Auth Required | Roles | Description |
|--------|----------|---------------|-------|-------------|
| POST | `/` | ✅ | Teacher, HOD | Create club (needs approval) |
| GET | `/` | ✅ | Any | Get clubs (filtered by role) |
| GET | `/:id` | ✅ | Any | Get single club details |
| PUT | `/:id/approve` | ✅ | HOD | Approve/reject club |
| POST | `/:id/join` | ✅ | Student | Join approved club |
| PUT | `/:id/members/:memberId/role` | ✅ | Mentor, HOD | Update member role |

---

## Project Management (`/api/projects`)

| Method | Endpoint | Auth Required | Roles | Description |
|--------|----------|---------------|-------|-------------|
| POST | `/` | ✅ | Any | Create project (JSON) |
| POST | `/upload` | ✅ | Any | Create project with files |
| GET | `/` | ✅ | Any | Get user's projects |
| GET | `/:id` | ✅ | Any | Get single project |
| PUT | `/:id` | ✅ | Owner/Team | Update project |
| DELETE | `/:id` | ✅ | Owner | Delete project |
| PUT | `/:id/approve` | ✅ | Teacher, HOD | Approve project |
| PUT | `/:id/reject` | ✅ | Teacher, HOD | Reject project |

---

## Certificate Management (`/api/certificates`)

| Method | Endpoint | Auth Required | Roles | Description |
|--------|----------|---------------|-------|-------------|
| GET | `/` | ✅ | Any | Get user's certificates |
| POST | `/` | ✅ | Any | Upload certificate |
| GET | `/:id` | ✅ | Any | Get single certificate |
| PUT | `/:id` | ✅ | Owner | Update certificate |
| DELETE | `/:id` | ✅ | Owner | Delete certificate |
| PUT | `/:id/approve` | ✅ | Teacher, HOD | Approve certificate |
| PUT | `/:id/reject` | ✅ | Teacher, HOD | Reject certificate |

---

## Internship Management (`/api/internships`)

| Method | Endpoint | Auth Required | Roles | Description |
|--------|----------|---------------|-------|-------------|
| GET | `/` | ✅ | Any | Get user's internships |
| POST | `/` | ✅ | Any | Add internship record |
| GET | `/:id` | ✅ | Any | Get single internship |
| PUT | `/:id` | ✅ | Owner | Update internship |
| DELETE | `/:id` | ✅ | Owner | Delete internship |
| PUT | `/:id/approve` | ✅ | Teacher, HOD | Approve internship |
| PUT | `/:id/reject` | ✅ | Teacher, HOD | Reject internship |

---

## Student Routes (`/api/students`)

| Method | Endpoint | Auth Required | Roles | Description |
|--------|----------|---------------|-------|-------------|
| GET | `/all-teachers` | ✅ | Student | Get all teachers for selection |
| GET | `/all-students` | ✅ | Student | Get all students for teams |

---

## Event Participation (`/api/event-participations`)

| Method | Endpoint | Auth Required | Roles | Description |
|--------|----------|---------------|-------|-------------|
| GET | `/` | ✅ | Any | Get event participations |
| POST | `/` | ✅ | Student | Create event participation |
| GET | `/stats/:studentId?` | ✅ | Any | Get participation statistics |
| GET | `/:id` | ✅ | Any | Get single participation |
| PUT | `/:id` | ✅ | Student (Owner) | Update participation |
| DELETE | `/:id` | ✅ | Student (Owner) | Delete participation |

---

## Event Routes (`/api/events`) - *To be implemented*

| Method | Endpoint | Auth Required | Roles | Description |
|--------|----------|---------------|-------|-------------|
| POST | `/` | ✅ | Teacher, HOD | Create event |
| GET | `/` | ✅ | Any | Get events |
| PUT | `/:id/approve` | ✅ | HOD | Approve event |

---

## Report Routes (`/api/reports`) - *To be implemented*

| Method | Endpoint | Auth Required | Roles | Description |
|--------|----------|---------------|-------|-------------|
| GET | `/department/:deptId` | ✅ | HOD, Admin | Get department report |
| GET | `/student/:studentId` | ✅ | Any | Get student report |

---

## Legend

### Authentication
- ✅ = Authentication required (JWT token)
- ❌ = No authentication required

### Common Role Abbreviations
- **SuperAdmin**: System administrator
- **Admin**: Institution administrator  
- **HOD**: Head of Department (teacher with HOD position)
- **Teacher**: Faculty member
- **Student**: Student user
- **Owner**: Resource creator/owner
- **Mentor**: Club mentor or project mentor
- **Any**: All authenticated users

### Special Notes

1. **Department Isolation**: Most routes are department-scoped (users only see their department data)
2. **HOD Permissions**: Teachers with `position: 'HOD'` get both teacher and HOD permissions
3. **Auto-Approval**: Teacher uploads for students are auto-approved
4. **File Uploads**: Some routes accept file uploads (multipart/form-data)
5. **Soft Delete**: Delete operations typically deactivate rather than permanently remove
6. **Ownership**: Many update/delete operations require resource ownership or appropriate authority

### File Upload Routes
Routes that accept file uploads:
- `POST /api/auth/upload-profile-image`
- `POST /api/projects/upload` 
- `POST /api/certificates`
- `PUT /api/certificates/:id`
- `POST /api/internships`

### Approval Workflows
Routes with approval workflows:
- Clubs: Teacher creates → HOD approves
- Student certificates: Student uploads → Teacher approves  
- Student projects: Student creates → Teacher/HOD approves
- Student internships: Student uploads → Teacher approves

### Department-Scoped Routes
Routes that filter by user's department:
- `/api/users` (HOD/Teacher see only their department)
- `/api/clubs` (department-specific clubs)
- `/api/projects` (department-scoped projects)
- All student achievement routes