const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Department = require('./models/Department');
const Designation = require('./models/Designation');
const Project = require('./models/Project');

const connectDB = require('./config/database');

async function createTestData() {
    try {
        await connectDB();
        console.log('Connected to database');

        // Clear existing data (optional)
        console.log('Clearing existing data...');
        await User.deleteMany({});
        await Department.deleteMany({});
        await Designation.deleteMany({});
        await Project.deleteMany({});

        // 1. Create SuperAdmin first
        console.log('Creating SuperAdmin...');
        const superAdmin = await User.create({
            name: 'Super Administrator',
            email: 'superadmin@college.edu',
            password: 'password123',
            role: 'superadmin'
        });

        // 2. Create Designations
        console.log('Creating designations...');
        const hodDesignation = await Designation.create({
            name: 'HOD',
            description: 'Head of Department',
            level: 1,
            createdBy: superAdmin._id
        });

        const profDesignation = await Designation.create({
            name: 'Professor',
            description: 'Professor',
            level: 2,
            createdBy: superAdmin._id
        });

        const asstProfDesignation = await Designation.create({
            name: 'Assistant Professor',
            description: 'Assistant Professor',
            level: 3,
            createdBy: superAdmin._id
        });

        // 3. Create Department
        console.log('Creating ISE Department...');
        const iseDept = await Department.create({
            name: 'Information Science and Engineering',
            code: 'ISE',
            description: 'Department of Information Science and Engineering',
            createdBy: superAdmin._id
        });

        // 4. Create Admin
        console.log('Creating Admin...');
        const admin = await User.create({
            name: 'System Admin',
            email: 'admin@college.edu',
            password: 'password123',
            role: 'admin'
        });

        // 5. Create HOD
        console.log('Creating HOD...');
        const hod = await User.create({
            name: 'Dr. Rajesh Kumar',
            email: 'hod.ise@college.edu',
            password: 'password123',
            role: 'teacher',
            position: 'HOD',
            department: iseDept._id,
            designation: hodDesignation._id,
            contactNumber: '9876543210'
        });

        // 6. Create Teachers
        console.log('Creating teachers...');
        const teacher1 = await User.create({
            name: 'Prof. Priya Sharma',
            email: 'priya.sharma@college.edu',
            password: 'password123',
            role: 'teacher',
            department: iseDept._id,
            designation: profDesignation._id,
            contactNumber: '9876543211'
        });

        const teacher2 = await User.create({
            name: 'Dr. Arjun Patel',
            email: 'arjun.patel@college.edu',
            password: 'password123',
            role: 'teacher',
            department: iseDept._id,
            designation: asstProfDesignation._id,
            contactNumber: '9876543212'
        });

        // 7. Create Students
        console.log('Creating students...');
        const students = [];
        const studentData = [
            { name: 'Aarav Sharma', usn: '1ISE20001', rollNumber: '20ISE001', semester: 6 },
            { name: 'Diya Patel', usn: '1ISE20002', rollNumber: '20ISE002', semester: 6 },
            { name: 'Ravi Kumar', usn: '1ISE20003', rollNumber: '20ISE003', semester: 6 },
            { name: 'Sneha Reddy', usn: '1ISE20004', rollNumber: '20ISE004', semester: 6 },
            { name: 'Amit Gupta', usn: '1ISE20005', rollNumber: '20ISE005', semester: 6 },
            { name: 'Kavya Singh', usn: '1ISE20006', rollNumber: '20ISE006', semester: 4 },
            { name: 'Rahul Joshi', usn: '1ISE20007', rollNumber: '20ISE007', semester: 4 },
            { name: 'Pooja Verma', usn: '1ISE20008', rollNumber: '20ISE008', semester: 4 },
            { name: 'Kiran Nair', usn: '1ISE20009', rollNumber: '20ISE009', semester: 2 },
            { name: 'Maya Iyer', usn: '1ISE20010', rollNumber: '20ISE010', semester: 2 }
        ];

        for (const studentInfo of studentData) {
            const student = await User.create({
                ...studentInfo,
                email: `${studentInfo.usn.toLowerCase()}@student.college.edu`,
                password: 'password123',
                role: 'student',
                department: iseDept._id,
                proctor: teacher1._id,
                classTeacher: teacher2._id,
                contactNumber: `987654${Math.floor(Math.random() * 9000) + 1000}`
            });
            students.push(student);
        }

        // 8. Create Sample Projects
        console.log('Creating sample projects...');
        
        // Major Project
        const majorProject = await Project.create({
            title: 'AI-Based Student Performance Prediction System',
            description: 'A comprehensive system to predict student academic performance using machine learning algorithms and historical data analysis.',
            projectCategory: 'student-project',
            studentProjectType: 'major',
            domain: 'Artificial Intelligence',
            technicalDetails: {
                technologies: ['Python', 'TensorFlow', 'React', 'MongoDB']
            },
            approvalStatus: 'pending-approval',
            currentStatus: 'proposal',
            department: iseDept._id,
            createdBy: students[0]._id,
            primaryMentor: teacher1._id,
            teamMembers: [
                { user: students[0]._id, role: 'leader' },
                { user: students[1]._id, role: 'member' },
                { user: students[2]._id, role: 'member' }
            ],
            timeline: {
                startDate: new Date('2024-08-01'),
                expectedEndDate: new Date('2024-12-15')
            }
        });

        // Mini Project 1
        const miniProject1 = await Project.create({
            title: 'Online Library Management System',
            description: 'A web-based library management system with features for book issuing, returning, and catalog management.',
            projectCategory: 'student-project',
            studentProjectType: 'mini',
            domain: 'Web Development',
            technicalDetails: {
                technologies: ['HTML', 'CSS', 'JavaScript', 'PHP', 'MySQL']
            },
            approvalStatus: 'approved',
            currentStatus: 'approved',
            department: iseDept._id,
            createdBy: students[3]._id,
            primaryMentor: teacher2._id,
            teamMembers: [
                { user: students[3]._id, role: 'leader' },
                { user: students[4]._id, role: 'member' }
            ],
            timeline: {
                startDate: new Date('2024-07-01'),
                expectedEndDate: new Date('2024-10-31'),
                approvalDate: new Date()
            }
        });

        // Mini Project 2
        const miniProject2 = await Project.create({
            title: 'Mobile Expense Tracker App',
            description: 'A React Native mobile application for tracking daily expenses with category-wise analysis and reporting.',
            projectCategory: 'student-project',
            studentProjectType: 'mini',
            domain: 'Mobile Development',
            technicalDetails: {
                technologies: ['React Native', 'Firebase', 'Chart.js']
            },
            approvalStatus: 'approved',
            currentStatus: 'in-progress',
            department: iseDept._id,
            createdBy: students[5]._id,
            primaryMentor: teacher1._id,
            teamMembers: [
                { user: students[5]._id, role: 'leader' },
                { user: students[6]._id, role: 'member' }
            ],
            timeline: {
                startDate: new Date('2024-09-01'),
                expectedEndDate: new Date('2024-11-30')
            }
        });

        // Personal Project 1
        const personalProject1 = await Project.create({
            title: 'Weather Forecast Website',
            description: 'A responsive website that displays weather information using OpenWeather API.',
            projectCategory: 'student-project',
            studentProjectType: 'personal',
            domain: 'Web Development',
            technicalDetails: {
                technologies: ['HTML', 'CSS', 'JavaScript', 'API Integration']
            },
            approvalStatus: 'approved',
            currentStatus: 'approved',
            department: iseDept._id,
            createdBy: students[7]._id,
            teamMembers: [
                { user: students[7]._id, role: 'leader' }
            ],
            timeline: {
                startDate: new Date('2024-08-15'),
                expectedEndDate: new Date('2024-09-15')
            }
        });

        // Personal Project 2
        const personalProject2 = await Project.create({
            title: 'Personal Portfolio Website',
            description: 'A personal portfolio website showcasing projects and skills with modern design.',
            projectCategory: 'student-project',
            studentProjectType: 'personal',
            domain: 'Web Development',
            technicalDetails: {
                technologies: ['React', 'CSS3', 'Responsive Design']
            },
            approvalStatus: 'approved',
            currentStatus: 'completed',
            department: iseDept._id,
            createdBy: students[8]._id,
            teamMembers: [
                { user: students[8]._id, role: 'leader' }
            ],
            timeline: {
                startDate: new Date('2024-06-01'),
                expectedEndDate: new Date('2024-07-31'),
                actualEndDate: new Date('2024-07-31')
            }
        });

        // Personal Project 3 (Pending)
        const personalProject3 = await Project.create({
            title: 'Chat Application using Socket.io',
            description: 'Real-time chat application with private messaging and group chat features.',
            projectCategory: 'student-project',
            studentProjectType: 'personal',
            domain: 'Web Development',
            technicalDetails: {
                technologies: ['Node.js', 'Socket.io', 'React', 'MongoDB']
            },
            approvalStatus: 'pending-approval',
            currentStatus: 'proposal',
            department: iseDept._id,
            createdBy: students[9]._id,
            primaryMentor: teacher2._id,
            teamMembers: [
                { user: students[9]._id, role: 'leader' }
            ],
            timeline: {
                startDate: new Date('2024-09-15'),
                expectedEndDate: new Date('2024-11-15')
            }
        });

        console.log('✅ Test data created successfully!');
        console.log('\n📋 Login Credentials:');
        console.log('SuperAdmin: superadmin@college.edu / password123');
        console.log('Admin: admin@college.edu / password123');
        console.log('HOD: hod.ise@college.edu / password123');
        console.log('Teacher 1: priya.sharma@college.edu / password123');
        console.log('Teacher 2: arjun.patel@college.edu / password123');
        console.log('Sample Student: 1ise20001@student.college.edu / password123');
        
        console.log('\n📊 Data Summary:');
        console.log(`- Department: ${iseDept.name} (${iseDept.code})`);
        console.log(`- Users: 1 SuperAdmin, 1 Admin, 1 HOD, 2 Teachers, 10 Students`);
        console.log(`- Projects: 6 projects (1 Major, 2 Mini, 3 Personal)`);
        console.log(`- Project Status: 2 Approved, 2 Pending Approval, 1 In Progress, 1 Completed`);
        
        console.log('\n🚀 Server should be running on http://localhost:3000');
        console.log('Login as HOD to test the new student and project views!');

    } catch (error) {
        console.error('❌ Error creating test data:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

createTestData();