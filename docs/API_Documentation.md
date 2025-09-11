# API Documentation

## Overview

This document provides comprehensive API documentation for the Academic Department Management System. All endpoints require proper authentication unless specified otherwise.

## Base URL
```
http://localhost:3000/api
```

## Authentication

### JWT Token Required
All protected routes require a Bearer token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

### Response Format
All API responses follow this standard format:
```json
{
  "success": boolean,
  "message": "string", 
  "data": object | array,
  "count": number (for list endpoints),
  "errors": array (for validation errors)
}
```

---

## Authentication Endpoints (`/api/auth`)

### Initialize Super Admin
**POST** `/api/auth/init-superadmin`
- **Description**: One-time setup to create the first super admin
- **Authentication**: None required
- **Request Body**:
```json
{
  "name": "string (required)",
  "email": "string (required, valid email)",
  "password": "string (required, min 6 chars)"
}
```
- **Response**: User object with JWT token
- **Status Codes**: 201 (Created), 400 (Super admin exists), 500 (Server error)

### Login
**POST** `/api/auth/login`
- **Description**: User authentication
- **Authentication**: None required
- **Request Body**:
```json
{
  "email": "string (required, valid email)",
  "password": "string (required)"
}
```
- **Response**: JWT token and user details
- **Status Codes**: 200 (Success), 401 (Invalid credentials), 500 (Server error)

### Get Current User
**GET** `/api/auth/me`
- **Description**: Get current user's profile information
- **Authentication**: Required
- **Request Body**: None
- **Response**: User object with populated department and designation

### Update Password
**PUT** `/api/auth/updatepassword`
- **Description**: Change user's password
- **Authentication**: Required
- **Request Body**:
```json
{
  "currentPassword": "string (required)",
  "newPassword": "string (required, min 6 chars)"
}
```
- **Response**: New JWT token

### Update Profile
**PUT** `/api/auth/profile`
- **Description**: Update user profile information
- **Authentication**: Required
- **Request Body**:
```json
{
  "name": "string (optional)",
  "email": "string (optional)",
  "contactNumber": "string (optional)",
  "semester": "number (optional, for students)",
  "proctor": "string (optional, ObjectId)",
  "classTeacher": "string (optional, ObjectId)"
}
```

### Upload Profile Image
**POST** `/api/auth/upload-profile-image`
- **Description**: Upload profile image
- **Authentication**: Required
- **Content-Type**: `multipart/form-data`
- **Request Body**: 
  - `profileImage`: File (JPG, JPEG, PNG only, max 5MB)
- **Response**: Uploaded filename

---

## User Management (`/api/users`)

### Create User
**POST** `/api/users`
- **Description**: Create new user (Admin/SuperAdmin only)
- **Authentication**: Required
- **Authorization**: SuperAdmin (can create Admin), Admin (can create Teacher/Student)
- **Request Body**:
```json
{
  "name": "string (required)",
  "email": "string (required, valid email)",
  "password": "string (required, min 6 chars)",
  "role": "string (required: admin, teacher, student)",
  "department": "string (optional, ObjectId)",
  "designation": "string (optional, ObjectId)",
  "usn": "string (optional, for students)",
  "rollNumber": "string (optional, for students)",
  "semester": "number (optional, for students)"
}
```

### Get All Users
**GET** `/api/users`
- **Description**: Get list of users (filtered by role and department)
- **Authentication**: Required
- **Authorization**: SuperAdmin, Admin, HOD, Teacher
- **Query Parameters**:
  - `role`: Filter by user role
  - `department`: Filter by department ID
  - `position`: Filter by position (HOD, null)
- **Response**: Array of user objects

### Get Single User
**GET** `/api/users/:id`
- **Description**: Get user details by ID
- **Authentication**: Required
- **Authorization**: SuperAdmin, Admin, HOD, Teacher
- **Response**: User object with populated references

### Update User
**PUT** `/api/users/:id`
- **Description**: Update user information
- **Authentication**: Required
- **Authorization**: SuperAdmin, Admin, Teacher (for assigned students only)
- **Request Body**: Any user fields to update

### Toggle User Status
**PUT** `/api/users/:id/toggle-status`
- **Description**: Activate/deactivate user account
- **Authentication**: Required
- **Authorization**: SuperAdmin, Admin only
- **Response**: Updated user object

### Reset User Password
**PUT** `/api/users/:id/reset-password`
- **Description**: Reset user's password
- **Authentication**: Required
- **Authorization**: SuperAdmin, Admin only
- **Request Body**:
```json
{
  "password": "string (required, min 6 chars)"
}
```

### Delete User
**DELETE** `/api/users/:id`
- **Description**: Soft delete (deactivate) user
- **Authentication**: Required
- **Authorization**: SuperAdmin, Admin only

### Assign HOD
**POST** `/api/users/assign-hod`
- **Description**: Assign teacher as HOD of department
- **Authentication**: Required
- **Authorization**: Admin only
- **Request Body**:
```json
{
  "userId": "string (required, ObjectId)",
  "departmentId": "string (required, ObjectId)"
}
```

### Get Department Teachers
**GET** `/api/users/teachers/department`
- **Description**: Get all teachers for proctor/class teacher selection
- **Authentication**: Required
- **Authorization**: Student only
- **Response**: Array of teacher objects with department info

### Get All Students for Teacher
**GET** `/api/users/students/all`
- **Description**: Get all students with relationship info
- **Authentication**: Required
- **Authorization**: Teacher only
- **Response**: Array of student objects with proctor/class teacher details

---

## Department Management (`/api/departments`)

### Create Department
**POST** `/api/departments`
- **Description**: Create new department
- **Authentication**: Required
- **Authorization**: SuperAdmin only
- **Request Body**:
```json
{
  "name": "string (required)",
  "code": "string (required)",
  "description": "string (required)"
}
```

### Get All Departments
**GET** `/api/departments`
- **Description**: Get list of all departments
- **Authentication**: Required
- **Response**: Array of department objects

### Get Single Department
**GET** `/api/departments/:id`
- **Description**: Get department details
- **Authentication**: Required
- **Response**: Department object with populated HOD

### Update Department
**PUT** `/api/departments/:id`
- **Description**: Update department information
- **Authentication**: Required
- **Authorization**: SuperAdmin only

### Delete Department
**DELETE** `/api/departments/:id`
- **Description**: Soft delete department
- **Authentication**: Required
- **Authorization**: SuperAdmin only

### Reactivate Department
**PUT** `/api/departments/:id/reactivate`
- **Description**: Reactivate deleted department
- **Authentication**: Required
- **Authorization**: SuperAdmin only

### Create Designation
**POST** `/api/departments/designations/create`
- **Description**: Create teacher designation
- **Authentication**: Required
- **Authorization**: SuperAdmin only
- **Request Body**:
```json
{
  "name": "string (required)",
  "level": "number (required)"
}
```

### Get All Designations
**GET** `/api/departments/designations/all`
- **Description**: Get list of all designations
- **Authentication**: Required
- **Response**: Array of designation objects

---

## Club Management (`/api/clubs`)

### Create Club
**POST** `/api/clubs`
- **Description**: Create new club (requires HOD approval)
- **Authentication**: Required
- **Authorization**: Teacher, HOD
- **Request Body**:
```json
{
  "name": "string (required)",
  "purpose": "string (required)",
  "description": "string (optional, max 1000 chars)",
  "establishedDate": "string (optional, ISO date)",
  "socialMedia": "object (optional)"
}
```

### Get All Clubs
**GET** `/api/clubs`
- **Description**: Get clubs (students see only approved, HOD sees all)
- **Authentication**: Required
- **Response**: Array of club objects with member counts and user permissions

### Get Single Club
**GET** `/api/clubs/:id`
- **Description**: Get club details
- **Authentication**: Required
- **Response**: Club object with full member and mentor details

### Approve/Reject Club
**PUT** `/api/clubs/:id/approve`
- **Description**: Approve or reject club (HOD only)
- **Authentication**: Required
- **Authorization**: HOD only
- **Request Body**:
```json
{
  "action": "string (required: approve, reject)",
  "rejectionReason": "string (optional, required if rejecting)"
}
```

### Join Club
**POST** `/api/clubs/:id/join`
- **Description**: Student joins an approved club
- **Authentication**: Required
- **Authorization**: Student only
- **Response**: Updated club object

### Update Member Role
**PUT** `/api/clubs/:id/members/:memberId/role`
- **Description**: Update club member's role
- **Authentication**: Required
- **Authorization**: Club mentor or HOD
- **Request Body**:
```json
{
  "role": "string (required: President, Vice President, Secretary, Treasurer, Executive Member, Member)"
}
```

---

## Project Management (`/api/projects`)

### Create Project
**POST** `/api/projects`
- **Description**: Create new project (JSON data)
- **Authentication**: Required
- **Request Body**:
```json
{
  "title": "string (required)",
  "projectType": "string (required: personal, mini, major)",
  "domain": "string (required)",
  "description": "string (optional, max 2000 chars)",
  "teamMembers": "array (optional, ObjectIds)",
  "mentors": "array (optional, ObjectIds)",
  "budget": "number (optional)"
}
```

### Create Project with Files
**POST** `/api/projects/upload`
- **Description**: Create project with file uploads
- **Authentication**: Required
- **Content-Type**: `multipart/form-data`
- **Request Body**:
  - `projectFiles`: Files (max 5 files, 10MB each)
  - `budgetDocument`: File (optional)
  - Other project fields as form data

### Get My Projects
**GET** `/api/projects`
- **Description**: Get all projects for current user
- **Authentication**: Required
- **Response**: Array of project objects including team projects

### Get Single Project
**GET** `/api/projects/:id`
- **Description**: Get project details
- **Authentication**: Required
- **Response**: Project object with populated team and mentor details

### Update Project
**PUT** `/api/projects/:id`
- **Description**: Update project information
- **Authentication**: Required
- **Authorization**: Project owner or team member

### Delete Project
**DELETE** `/api/projects/:id`
- **Description**: Delete project
- **Authentication**: Required
- **Authorization**: Project owner only

### Approve Project
**PUT** `/api/projects/:id/approve`
- **Description**: Approve project
- **Authentication**: Required
- **Authorization**: Teacher, HOD

### Reject Project
**PUT** `/api/projects/:id/reject`
- **Description**: Reject project with reason
- **Authentication**: Required
- **Authorization**: Teacher, HOD

---

## Certificate Management (`/api/certificates`)

### Upload Certificate
**POST** `/api/certificates`
- **Description**: Upload new certificate
- **Authentication**: Required
- **Content-Type**: `multipart/form-data`
- **Request Body**:
  - `certificateFile`: File (JPG, JPEG, PNG, PDF, max 5MB)
```json
{
  "title": "string (required)",
  "issuer": "string (required)",
  "issueDate": "string (required, ISO date)",
  "expiryDate": "string (optional, ISO date)"
}
```

### Get All Certificates
**GET** `/api/certificates`
- **Description**: Get user's certificates
- **Authentication**: Required
- **Response**: Array of certificate objects

### Get Single Certificate
**GET** `/api/certificates/:id`
- **Description**: Get certificate details
- **Authentication**: Required
- **Response**: Certificate object

### Update Certificate
**PUT** `/api/certificates/:id`
- **Description**: Update certificate information
- **Authentication**: Required
- **Content-Type**: `multipart/form-data`
- **Request Body**: Same as create, all fields optional

### Delete Certificate
**DELETE** `/api/certificates/:id`
- **Description**: Delete certificate
- **Authentication**: Required
- **Authorization**: Certificate owner only

### Approve Certificate
**PUT** `/api/certificates/:id/approve`
- **Description**: Approve student certificate
- **Authentication**: Required
- **Authorization**: Teacher, HOD

### Reject Certificate
**PUT** `/api/certificates/:id/reject`
- **Description**: Reject student certificate
- **Authentication**: Required
- **Authorization**: Teacher, HOD

---

## Internship Management (`/api/internships`)

### Add Internship
**POST** `/api/internships`
- **Description**: Add new internship record
- **Authentication**: Required
- **Content-Type**: `multipart/form-data`
- **Request Body**:
  - `offerLetter`: File (optional, JPG, PNG, PDF, DOC, DOCX, max 5MB)
  - `joiningLetter`: File (optional, same formats)
```json
{
  "companyName": "string (required)",
  "position": "string (required)",
  "startDate": "string (required, ISO date)",
  "endDate": "string (optional, ISO date)",
  "stipend": "number (optional)",
  "description": "string (optional)"
}
```

### Get All Internships
**GET** `/api/internships`
- **Description**: Get user's internships
- **Authentication**: Required
- **Response**: Array of internship objects

### Get Single Internship
**GET** `/api/internships/:id`
- **Description**: Get internship details
- **Authentication**: Required
- **Response**: Internship object

### Update Internship
**PUT** `/api/internships/:id`
- **Description**: Update internship information
- **Authentication**: Required
- **Authorization**: Internship owner only

### Delete Internship
**DELETE** `/api/internships/:id`
- **Description**: Delete internship
- **Authentication**: Required
- **Authorization**: Internship owner only

### Approve Internship
**PUT** `/api/internships/:id/approve`
- **Description**: Approve student internship
- **Authentication**: Required
- **Authorization**: Teacher, HOD

### Reject Internship
**PUT** `/api/internships/:id/reject`
- **Description**: Reject student internship
- **Authentication**: Required
- **Authorization**: Teacher, HOD

---

## Student Routes (`/api/students`)

### Get All Teachers
**GET** `/api/students/all-teachers`
- **Description**: Get all college teachers for mentor selection
- **Authentication**: Required
- **Authorization**: Student only
- **Response**: Array of teacher objects with department info

### Get All Students
**GET** `/api/students/all-students`
- **Description**: Get all students for team member selection
- **Authentication**: Required
- **Authorization**: Student only
- **Response**: Array of student objects (excluding current user)

---

## Event Participation (`/api/event-participations`)

### Create Event Participation
**POST** `/api/event-participations`
- **Description**: Record participation in external events
- **Authentication**: Required
- **Authorization**: Student only
- **Request Body**:
```json
{
  "eventName": "string (required, 2-200 chars)",
  "eventType": "string (required, see allowed types)",
  "startDate": "string (required, ISO date)",
  "durationDays": "number (required, 1-365)",
  "organizer": {
    "name": "string (required, 2-100 chars)",
    "type": "string (optional)",
    "website": "string (optional)"
  },
  "participationType": "string (required: individual, team)",
  "teamDetails": {
    "teamName": "string (required if team)",
    "teamSize": "number (required if team, 2-20)"
  },
  "description": "string (optional, max 1000 chars)",
  "outcome": {
    "achievement": "string (optional, see allowed achievements)",
    "certificateReceived": "boolean (optional)"
  }
}
```

### Get Event Participations
**GET** `/api/event-participations`
- **Description**: Get user's event participations
- **Authentication**: Required
- **Response**: Array of event participation objects

### Get Event Participation Stats
**GET** `/api/event-participations/stats/:studentId?`
- **Description**: Get participation statistics
- **Authentication**: Required
- **Response**: Statistics object with counts and achievements

### Get Single Event Participation
**GET** `/api/event-participations/:id`
- **Description**: Get event participation details
- **Authentication**: Required

### Update Event Participation
**PUT** `/api/event-participations/:id`
- **Description**: Update event participation
- **Authentication**: Required
- **Authorization**: Student (owner) only

### Delete Event Participation
**DELETE** `/api/event-participations/:id`
- **Description**: Delete event participation
- **Authentication**: Required
- **Authorization**: Student (owner) only

---

## Event Routes (`/api/events`) 
**Note**: Currently showing placeholder implementations

### Create Event
**POST** `/api/events`
- **Description**: Create new event (To be implemented)
- **Authentication**: Required
- **Authorization**: Teacher, HOD

### Get Events
**GET** `/api/events`
- **Description**: Get events (To be implemented)
- **Authentication**: Required

### Approve Event
**PUT** `/api/events/:id/approve`
- **Description**: Approve event (To be implemented)
- **Authentication**: Required
- **Authorization**: HOD only

---

## Report Routes (`/api/reports`)
**Note**: Currently showing placeholder implementations

### Get Department Report
**GET** `/api/reports/department/:deptId`
- **Description**: Get department report (To be implemented)
- **Authentication**: Required
- **Authorization**: HOD, Admin

### Get Student Report
**GET** `/api/reports/student/:studentId`
- **Description**: Get student report (To be implemented)
- **Authentication**: Required

---

## Error Codes

### HTTP Status Codes
- **200**: Success
- **201**: Created
- **400**: Bad Request (validation errors)
- **401**: Unauthorized (invalid/missing token)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found
- **500**: Internal Server Error

### Common Error Responses
```json
{
  "success": false,
  "message": "Error description",
  "errors": ["validation error 1", "validation error 2"]
}
```

## File Upload Specifications

### Profile Images
- **Allowed formats**: JPG, JPEG, PNG
- **Maximum size**: 5MB
- **Upload path**: `/uploads/profiles/`

### Project Files
- **Allowed formats**: JPG, JPEG, PNG, GIF, PDF, DOC, DOCX, PPT, PPTX, MP4, AVI, MOV, ZIP, RAR
- **Maximum size**: 10MB per file
- **Maximum files**: 5 files per project
- **Upload path**: `/uploads/projects/`

### Certificate Files
- **Allowed formats**: JPG, JPEG, PNG, PDF
- **Maximum size**: 5MB
- **Upload path**: `/uploads/certificates/`

### Internship Documents
- **Allowed formats**: JPG, JPEG, PNG, PDF, DOC, DOCX
- **Maximum size**: 5MB per file
- **Upload path**: `/uploads/internships/`