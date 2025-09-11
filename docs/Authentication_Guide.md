# Authentication & Authorization Guide

## Overview

The Academic Department Management System uses JWT (JSON Web Tokens) for authentication and role-based access control for authorization. This guide explains how the authentication system works and what permissions each role has.

## Authentication Flow

### 1. User Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_id",
    "name": "User Name",
    "email": "user@example.com",
    "role": "student",
    "position": null,
    "department": { /* department object */ },
    "designation": { /* designation object */ }
  }
}
```

### 2. Using JWT Token
Include the token in all subsequent requests:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Token Validation
The system validates tokens using the `protect` middleware which:
- Extracts token from Authorization header
- Verifies token signature using JWT_SECRET
- Fetches user data and attaches to `req.user`
- Returns 401 if token is invalid or missing

## User Roles & Hierarchy

### 1. SuperAdmin
- **Purpose**: System initialization and high-level administration
- **Created by**: Manual initialization (one-time setup)
- **Permissions**:
  - Create departments and designations
  - Create admin accounts
  - Manage departments (create, update, delete, reactivate)
  - **Cannot**: Manage clubs, events, or create other user types

### 2. Admin
- **Purpose**: Day-to-day user management
- **Created by**: SuperAdmin
- **Permissions**:
  - Create HOD, Teacher, and Student accounts
  - Assign departments and designations to users
  - View all reports (read-only)
  - Manage user accounts (activate/deactivate, reset passwords)
  - Assign HOD positions
  - **Cannot**: Create clubs, approve events, or create other admins

### 3. HOD (Head of Department)
- **Purpose**: Department-level approval authority
- **Created by**: Admin assigns HOD position to a Teacher
- **Note**: HOD is a position, not a role. Teachers with position='HOD' get dual permissions
- **Permissions**:
  - All teacher permissions
  - Final approval for clubs in their department
  - Final approval for events in their department  
  - Budget approval and management
  - Generate department reports
  - View all department data
  - **Restrictions**: Limited to their assigned department only

### 4. Teacher
- **Purpose**: Content creation and student mentoring
- **Created by**: Admin
- **Permissions**:
  - Create clubs (requires HOD approval)
  - Create and manage events (3 types, requires HOD approval)
  - Create and manage projects
  - Upload and approve certificates (auto-approved for teachers)
  - Upload achievements for students (auto-approved)
  - View all students in their department
  - Edit profiles of assigned students (proctor/class teacher)
  - Approve student submissions (projects, certificates, internships)
  - **Restrictions**: Department-scoped access

### 5. Student
- **Purpose**: Data entry and participation
- **Created by**: Admin
- **Permissions**:
  - Maintain personal profile
  - Upload achievements (projects, certificates, internships) - requires teacher approval
  - Join approved clubs in their department
  - Participate in approved events
  - View college teachers for mentor selection
  - View other students for team formation
  - Record external event participations
  - **Restrictions**: Can only view/join department-specific content

## Authorization Middleware

### 1. `protect` Middleware
```javascript
// Validates JWT token and loads user
app.use(protect);
```
- Extracts and verifies JWT token
- Loads user data into `req.user`
- Returns 401 if unauthorized

### 2. `authorize(...roles)` Middleware
```javascript
// Allows specific roles/positions
router.get('/admin-only', authorize('admin'), handler);
router.get('/hod-or-teacher', authorize('hod', 'teacher'), handler);
```
- Checks if user's role matches allowed roles
- Special handling: Teachers with position='HOD' get 'hod' permissions
- Returns 403 if forbidden

### 3. `checkDepartment` Middleware
```javascript
// Enforces department isolation
router.use(checkDepartment);
```
- Ensures users only access their department's data
- SuperAdmin and Admin bypass this restriction
- Returns 403 for cross-department access

## Department Isolation

### How it Works
- All department-scoped resources check user's department
- Users can only view/modify data from their own department
- Exception: SuperAdmin and Admin have global access

### Implementation Examples
```javascript
// In controllers
if (req.user.role === 'hod' || req.user.role === 'teacher') {
    query.department = req.user.department;
}

// Department access check
if (club.department.toString() !== req.user.department.toString()) {
    return res.status(403).json({
        success: false,
        message: 'Access denied to other department resources'
    });
}
```

## Special Permission Rules

### 1. HOD Dual Role
Teachers with `position: 'HOD'` get both teacher and HOD permissions:
```javascript
const userRoles = [req.user.role];
if (req.user.role === 'teacher' && req.user.position === 'HOD') {
    userRoles.push('hod');
}
```

### 2. Auto-Approval Logic
- Teacher uploads for students → Auto-approved
- Student uploads → Requires teacher approval
- Teacher certificates → Auto-approved
- Student certificates → Requires teacher approval

### 3. Proctor/Class Teacher Permissions
Teachers can edit student profiles if they are assigned as:
- Proctor (`student.proctor === teacher.id`)
- Class Teacher (`student.classTeacher === teacher.id`)

## Common Authorization Patterns

### 1. Create Operations
```javascript
// Only specific roles can create
router.post('/', authorize('teacher', 'hod'), createHandler);

// Role-based creation restrictions
if (req.user.role === 'admin' && !['teacher', 'student'].includes(role)) {
    return res.status(403).json({ message: 'Cannot create this role' });
}
```

### 2. Read Operations
```javascript
// Department filtering
let query = {};
if (req.user.role === 'hod' || req.user.role === 'teacher') {
    query.department = req.user.department;
}
```

### 3. Update Operations
```javascript
// Ownership or authority check
const isOwner = resource.createdBy.toString() === req.user.id;
const isMentor = resource.mentors.includes(req.user.id);
const isHOD = req.user.position === 'HOD';

if (!isOwner && !isMentor && !isHOD) {
    return res.status(403).json({ message: 'Not authorized' });
}
```

### 4. Approval Operations
```javascript
// Only specific roles can approve
router.put('/:id/approve', authorize('teacher', 'hod'), approvalHandler);

// Final approval authority (HOD)
router.put('/:id/final-approve', authorize('hod'), finalApprovalHandler);
```

## Error Handling

### Authentication Errors (401)
```json
{
  "success": false,
  "message": "Not authorized to access this route"
}
```

### Authorization Errors (403)
```json
{
  "success": false,
  "message": "User role teacher is not authorized to access this route"
}
```

### Department Access Errors (403)
```json
{
  "success": false,
  "message": "Not authorized to access resources from another department"
}
```

## Security Best Practices

### 1. Token Security
- JWT tokens are signed with a secret key
- Tokens include user ID and are verified on each request
- No sensitive data stored in tokens
- Tokens expire after 7 days (configurable)

### 2. Password Security
- Passwords hashed using bcrypt
- Minimum 6 characters required
- Current password required for updates

### 3. Input Validation
- All inputs validated using express-validator
- File upload restrictions (type, size)
- SQL injection prevention through Mongoose ODM

### 4. Access Control
- Principle of least privilege
- Department isolation enforced
- Resource ownership verification
- Role-based permissions

## Testing Authentication

### 1. Get Token
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'
```

### 2. Use Token
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 3. Test Permissions
```bash
# Should work for admin
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Should fail for student
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer STUDENT_TOKEN"
```

## Environment Variables

Required environment variables for authentication:
```env
JWT_SECRET=your_secure_jwt_secret_key_here
JWT_EXPIRE=7d
NODE_ENV=development
```

## Migration Notes

When updating user roles or permissions:
1. Update middleware authorization arrays
2. Update frontend role checks
3. Test all affected endpoints
4. Document permission changes
5. Consider data migration for existing users