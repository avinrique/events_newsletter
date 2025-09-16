# Department Management System - Login Credentials

## Test User Accounts

### HOD (Head of Department)
- **Email**: `hod.ise@college.edu`
- **Password**: `password123`
- **Department**: Information Science and Engineering (ISE)
- **Access**: Can view all department students and projects

### Admin
- **Email**: `admin@college.edu`
- **Password**: `password123`
- **Access**: System administration

### SuperAdmin
- **Email**: `superadmin@college.edu`
- **Password**: `password123`
- **Access**: Complete system control

### Teachers
1. **Prof. Priya Sharma**
   - **Email**: `priya.sharma@college.edu`
   - **Password**: `password123`
   - **Department**: ISE

2. **Dr. Arjun Patel**
   - **Email**: `arjun.patel@college.edu`
   - **Password**: `password123`
   - **Department**: ISE

### Sample Student
- **Email**: `1ise20001@student.college.edu`
- **Password**: `password123`
- **Name**: Aarav Sharma
- **USN**: 1ISE20001

## Available Data

### Department: ISE (Information Science and Engineering)
- **Students**: 10 students across semesters 2, 4, and 6
- **Projects**: 6 projects (1 Major, 2 Mini, 3 Personal)
- **Project Status**: Mixed - some approved, some pending approval

### HOD Dashboard Features
1. **Students Section**: View all department students with filtering by semester
2. **Projects Section**: View all department projects with filtering by type and status
3. **Approval Actions**: Approve/reject pending projects directly from the interface

## Server Information
- **URL**: http://localhost:3000
- **Status**: Running
- **Database**: MongoDB (populated with test data)

## Testing the New Features
1. Login as HOD: `hod.ise@college.edu / password123`
2. Navigate to "Students" tab to see all ISE department students
3. Navigate to "Projects" tab to see all ISE department projects
4. Use filters to view specific project types (mini/major/personal) or status
5. Click "Approve" or "Reject" on pending projects to test approval workflow

## Project Summary
- **AI-Based Student Performance Prediction** (Major, Pending Approval)
- **Online Library Management System** (Mini, Approved)
- **Mobile Expense Tracker App** (Mini, In Progress)
- **Weather Forecast Website** (Personal, Approved)
- **Personal Portfolio Website** (Personal, Completed)
- **Chat Application using Socket.io** (Personal, Pending Approval)