# 🏫 Department Management System - Login Credentials

## 🔑 Test User Accounts

### 👑 SuperAdmin
- **Email**: `superadmin@college.edu`
- **Password**: `password123`
- **Access**: Complete system control, create departments, designations, and admins
- **Features**: Department creation, designation management, admin account creation

### 🛠️ Admin
- **Email**: `admin@college.edu`
- **Password**: `password123`
- **Access**: System administration, user management
- **Features**: Create HOD/Teacher/Student accounts, view all reports, assign departments

### 🎓 HOD (Head of Department)
- **Name**: Dr. Suresh Iyer
- **Email**: `hod.ise@college.edu`
- **Password**: `password123`
- **Department**: Information Science and Engineering (ISE)
- **Access**: Final approval authority for department
- **Features**:
  - View all department students and projects
  - Approve/reject clubs and events
  - Approve / adjust event & project budgets
  - Compose and publish monthly Newsletters
  - Download teacher reports (PDF/Word)
  - Generate department analytics
  - Teacher event management

### 👨‍🏫 Teachers (Non-HOD)
1. **Prof. Priya Sharma**
   - **Email**: `priya.sharma@college.edu`
   - **Password**: `password123`
   - **Department**: ISE
   - **Features**: Enhanced profile with image upload, create events, manage projects

2. **Dr. Arjun Patel**
   - **Email**: `arjun.patel@college.edu`
   - **Password**: `password123`
   - **Department**: ISE
   - **Features**: Enhanced profile with image upload, create events, manage projects

3. **Prof. Rajesh Kumar**
   - **Email**: `rajesh.kumar@college.edu`
   - **Password**: `password123`
   - **Department**: ISE
   - **Features**: Create clubs, supervise student projects, mentor students

### 👨‍🎓 Students
1. **Aarav Sharma** (Sample Student)
   - **Email**: `1ise20001@student.college.edu`
   - **Password**: `password123`
   - **USN**: 1ISE20001
   - **Department**: ISE
   - **Semester**: 6

2. **Ananya Patel**
   - **Email**: `1ise20002@student.college.edu`
   - **Password**: `password123`
   - **USN**: 1ISE20002
   - **Department**: ISE
   - **Semester**: 4

3. **Rohan Singh**
   - **Email**: `1ise20003@student.college.edu`
   - **Password**: `password123`
   - **USN**: 1ISE20003
   - **Department**: ISE
   - **Semester**: 2

4. **Kavya Reddy**
   - **Email**: `1ise20004@student.college.edu`
   - **Password**: `password123`
   - **USN**: 1ISE20004
   - **Department**: ISE
   - **Semester**: 6

5. **Arjun Nair**
   - **Email**: `1ise20005@student.college.edu`
   - **Password**: `password123`
   - **USN**: 1ISE20005
   - **Department**: ISE
   - **Semester**: 4

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

## 🧪 Testing Latest Features

### 🎓 HOD Dashboard Testing
1. **Login**: `hod.ise@college.edu / password123`
2. **Students Tab**: View all ISE department students with semester filtering
3. **Projects Tab**: View all department projects with type/status filtering
4. **Teacher Events**: View, download (PDF/Word), edit, delete teacher events
5. **Reports**: Download teacher reports in PDF/Word format
6. **Approval Actions**: Approve/reject pending projects

### 👨‍🏫 Teacher Profile Testing
1. **Login**: `priya.sharma@college.edu / password123` or `arjun.patel@college.edu / password123`
2. **Enhanced Profile**: Modern profile design with statistics
3. **Image Upload**: Click avatar or "Upload Photo" button to upload profile picture
4. **Statistics**: View projects mentored, students assigned, events created, clubs managed
5. **Event Creation**: Create teacher events with image upload
6. **Event Download**: Download created events as PDF/Word

### 🔄 Role-Based Access Testing
- **SuperAdmin**: Complete system control
- **Admin**: User management and system administration  
- **HOD**: Department authority with approval powers
- **Teachers**: Enhanced profiles, event creation, student management
- **Students**: Project submission, club participation, certificate upload

## Project Summary
- **AI-Based Student Performance Prediction** (Major, Pending Approval)
- **Online Library Management System** (Mini, Approved)
- **Mobile Expense Tracker App** (Mini, In Progress)
- **Weather Forecast Website** (Personal, Approved)
- **Personal Portfolio Website** (Personal, Completed)
- **Chat Application using Socket.io** (Personal, Pending Approval)