# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Academic Department Management System - Node.js/Express/MongoDB backend with vanilla JS frontend for managing academic activities (clubs, events, projects, certificates, internships) with multi-level role-based access and approval workflows.

## Development Commands

```bash
# Install dependencies
npm install

# Run development server with auto-reload (nodemon)
npm run dev

# Run production server
npm start

# Test commands (comprehensive test suite available)
npm test                    # Run all tests
npm run test:watch          # Run tests in watch mode
npm run test:coverage       # Run tests with coverage report
npm test auth.test.js       # Run specific test file

# MongoDB setup (required)
# macOS: brew services start mongodb-community
# Linux: sudo systemctl start mongodb
# Docker: docker run -d -p 27017:27017 --name mongodb mongo:latest

# Server runs on port 3000 (hardcoded in server.js)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'
```

## Environment Configuration

Create `.env` file in root:
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/department_management
JWT_SECRET=your_secure_jwt_secret_key
JWT_EXPIRE=7d
NODE_ENV=development
```

## System Architecture

### User Roles & Permissions

| Role | Primary Functions | Restrictions |
|------|------------------|-------------|
| **SuperAdmin** | • Create departments & teacher designations<br>• Create admin accounts | Cannot manage clubs, events, or create other user types |
| **Admin** | • Create all user types (HOD/Teacher/Student)<br>• Assign departments & designations<br>• View all reports (read-only) | Cannot create clubs or approve events |
| **HOD** | • Final approval for clubs, events, budgets<br>• Generate department reports<br>• Department-scoped authority | Limited to assigned department |
| **Teacher** | • Create clubs & events (3 types)<br>• Manage projects & certificates<br>• Mentor students<br>• View all students, edit assigned ones | Requires HOD approval for clubs/events |
| **Student** | • Upload achievements (projects, certificates, internships)<br>• Join clubs & participate in events | Submissions require teacher approval |

### Key Entities & Workflows

**Clubs**: Teacher creates → HOD approves → Students join with roles (President, VP, Secretary, etc.)

**Events (3 Types)**:
1. Club Events: Club → Mentor approval → HOD approval
2. Personal Teacher Events: Teacher → HOD approval
3. Joint Teacher Events: Multiple teachers → HOD approval

**Projects**: Student projects (mini/major/personal), Teacher-only projects, Teacher+Student joint projects

**Certificates**: Student certificates (NPTEL, Coursera, etc.) require teacher approval; Teacher certificates auto-approved

**Internships**: Student uploads → Teacher approves (includes company details, offer letters, stipend info)

**Budget Flow**: Request → HOD Review → Approved/Rejected → Utilized → Reconciled

**Reports**: Auto-generated at student/teacher/club level; HOD consolidates department reports

### Critical Business Rules

1. **SuperAdmin** can ONLY create departments, designations, and admins
2. **Admin** can ONLY create users (HOD/Teacher/Student) and view reports
3. **HOD** is the final authority for ALL approvals within their department
4. **Teachers** can upload achievements for students (auto-approved)
5. **Club events** require BOTH mentor AND HOD approval
6. **Budget approval** is exclusively HOD responsibility
7. **Department isolation**: Users only see their department data (except admin/superadmin)

## Architecture & Implementation

### Tech Stack
- **Backend**: Node.js, Express.js, MongoDB (Mongoose ODM)
- **Frontend**: Vanilla JavaScript with role-specific HTML dashboards
- **Auth**: JWT + bcrypt
- **Security**: Helmet CSP, CORS, express-validator, rate limiting
- **File Upload**: Multer configured in `middleware/upload.js`

### File Structure
```
├── controllers/     # Business logic for each entity
├── models/         # Mongoose schemas
├── routes/         # Express routes with middleware
├── middleware/     # JWT auth, validation, role checking
│   ├── auth.js    # protect, authorize(roles), checkDepartment
│   └── upload.js  # Multer file upload configuration
├── views/          # Role-specific HTML dashboards
├── public/         # Frontend CSS/JS
│   ├── js/
│   │   ├── api.js      # API client functions
│   │   └── [role].js   # Role-specific frontend logic
│   └── css/
├── uploads/        # File storage
└── server.js       # Express app entry point
```

### Key Implementation Details

**Authentication**: JWT-based with role checking. Teachers with position='HOD' get dual permissions.

**Route Protection**:
1. `protect` middleware - validates JWT
2. `authorize(roles)` - checks user role/position
3. `checkDepartment` - enforces department isolation

**Auto-approval Logic**: When teachers upload for students, bypass approval workflow

**Database Indexes** (for performance):
```javascript
db.users.createIndex({ email: 1, department: 1 })
db.events.createIndex({ department: 1, status: 1, date: -1 })
db.projects.createIndex({ department: 1, status: 1 })
```


### Key API Endpoints

**Authentication** (`/api/auth/`)
- `POST /init-superadmin` - Initialize first SuperAdmin
- `POST /login` - User login
- `GET /me` - Current user profile

**Users** (`/api/users/`) - CRUD with role-based access

**Departments** (`/api/departments/`) - Department & designation management

**Clubs** (`/api/clubs/`) - Club creation and management

**Events** (`/api/events/`) - Event creation with approval workflow
- `POST /api/teacher-events/` - Teacher-initiated events (personal/joint)

**Projects** (`/api/projects/`) - Project tracking

**Certificates** (`/api/certificates/`) - Certificate upload/approval

**Internships** (`/api/internships/`) - Internship records

**Event Participations** (`/api/event-participations/`) - External event participation tracking

**Students** (`/api/students/`) - Student-specific routes (teacher/student selection)

**Reports** (`/api/reports/`) - Report generation

### Testing

**Comprehensive Test Suite** using Jest and MongoDB Memory Server:
- All API endpoints covered with authentication/authorization tests
- Business logic validation and error handling
- Run `npm test` for full suite, `npm test [filename]` for specific tests
- Test data automatically created and cleaned up per test
- 90%+ code coverage target

### Adding New Features

1. Create Mongoose model in `models/`
2. Add controller in `controllers/`
3. Create routes in `routes/` with auth middleware
4. Update frontend in `public/js/` and role-specific HTML
5. **Write tests** in `tests/` directory following existing patterns
6. Test manually with curl or API client