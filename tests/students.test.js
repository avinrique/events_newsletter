const request = require('supertest');
const app = require('../server');
const User = require('../models/User');
const { setupTestAuth, cleanupTestData } = require('./helpers/auth');

describe('Student Routes Endpoints', () => {
    let testData;

    beforeEach(async () => {
        await cleanupTestData();
        testData = await setupTestAuth(app);
    });

    describe('GET /api/students/all-teachers', () => {
        beforeEach(async () => {
            // Create additional teachers in different departments for comprehensive testing
            const otherDept = await require('../models/Department').create({
                name: 'Electrical Engineering',
                code: 'EE',
                description: 'Electrical Engineering Department',
                createdBy: testData.users.superAdmin._id
            });

            const designation2 = await require('../models/Designation').create({
                name: 'Assistant Professor',
                level: 2,
                createdBy: testData.users.superAdmin._id
            });

            // Teacher from different department
            await User.create({
                name: 'Other Department Teacher',
                email: 'otherteacher@test.com',
                password: 'password123',
                role: 'teacher',
                department: otherDept._id,
                designation: designation2._id,
                isActive: true,
                createdBy: testData.users.admin._id
            });

            // Inactive teacher (should not appear)
            await User.create({
                name: 'Inactive Teacher',
                email: 'inactive@test.com',
                password: 'password123',
                role: 'teacher',
                department: testData.department._id,
                designation: testData.designation._id,
                isActive: false,
                createdBy: testData.users.admin._id
            });
        });

        it('should allow students to get all active teachers from all departments', async () => {
            const response = await request(app)
                .get('/api/students/all-teachers')
                .set('Authorization', `Bearer ${testData.tokens.student}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.length).toBeGreaterThan(0);
            expect(response.body.count).toBeDefined();
            
            // Should include teachers from test data
            const teacherEmails = response.body.data.map(t => t.email);
            expect(teacherEmails).toContain('teacher@test.com');
            expect(teacherEmails).toContain('hod@test.com');
            expect(teacherEmails).toContain('otherteacher@test.com');
            
            // Should not include inactive teacher
            expect(teacherEmails).not.toContain('inactive@test.com');
        });

        it('should include teacher details with department and designation', async () => {
            const response = await request(app)
                .get('/api/students/all-teachers')
                .set('Authorization', `Bearer ${testData.tokens.student}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            
            const teacher = response.body.data.find(t => t.email === 'teacher@test.com');
            expect(teacher).toBeDefined();
            expect(teacher.name).toBeDefined();
            expect(teacher.email).toBeDefined();
            expect(teacher.designation).toBeDefined();
            expect(teacher.designation.title).toBeDefined();
            expect(teacher.department).toBeDefined();
            expect(teacher.department.name).toBeDefined();
            expect(teacher.department.code).toBeDefined();
        });

        it('should sort teachers by name', async () => {
            const response = await request(app)
                .get('/api/students/all-teachers')
                .set('Authorization', `Bearer ${testData.tokens.student}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            
            const names = response.body.data.map(t => t.name);
            const sortedNames = [...names].sort();
            expect(names).toEqual(sortedNames);
        });

        it('should require student authorization', async () => {
            const response = await request(app)
                .get('/api/students/all-teachers')
                .set('Authorization', `Bearer ${testData.tokens.teacher}`);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .get('/api/students/all-teachers');

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });

        it('should not include admin or superadmin users', async () => {
            const response = await request(app)
                .get('/api/students/all-teachers')
                .set('Authorization', `Bearer ${testData.tokens.student}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            
            // Should only include users with role 'teacher'
            response.body.data.forEach(user => {
                expect(user.role).toBeUndefined(); // role should not be in select
            });
            
            const emails = response.body.data.map(t => t.email);
            expect(emails).not.toContain('admin@test.com');
            expect(emails).not.toContain('superadmin@test.com');
        });

        it('should handle empty teacher list', async () => {
            // Deactivate all teachers
            await User.updateMany(
                { role: 'teacher' },
                { isActive: false }
            );

            const response = await request(app)
                .get('/api/students/all-teachers')
                .set('Authorization', `Bearer ${testData.tokens.student}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual([]);
            expect(response.body.count).toBe(0);
        });
    });

    describe('GET /api/students/all-students', () => {
        beforeEach(async () => {
            // Create additional students for comprehensive testing
            await User.create({
                name: 'Second Student',
                email: 'student2@test.com',
                password: 'password123',
                role: 'student',
                department: testData.department._id,
                usn: 'CSE21002',
                rollNumber: '21CS002',
                semester: 5,
                isActive: true,
                createdBy: testData.users.admin._id
            });

            // Student from different department
            const otherDept = await require('../models/Department').create({
                name: 'Mechanical Engineering',
                code: 'ME',
                description: 'Mechanical Engineering Department',
                createdBy: testData.users.superAdmin._id
            });

            await User.create({
                name: 'Other Department Student',
                email: 'otherstudent@test.com',
                password: 'password123',
                role: 'student',
                department: otherDept._id,
                usn: 'ME21001',
                rollNumber: '21ME001',
                semester: 6,
                isActive: true,
                createdBy: testData.users.admin._id
            });

            // Inactive student (should not appear)
            await User.create({
                name: 'Inactive Student',
                email: 'inactivestudent@test.com',
                password: 'password123',
                role: 'student',
                department: testData.department._id,
                usn: 'CSE21003',
                rollNumber: '21CS003',
                semester: 4,
                isActive: false,
                createdBy: testData.users.admin._id
            });
        });

        it('should allow students to get all active students from all departments except self', async () => {
            const response = await request(app)
                .get('/api/students/all-students')
                .set('Authorization', `Bearer ${testData.tokens.student}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.length).toBeGreaterThan(0);
            expect(response.body.count).toBeDefined();
            
            // Should include other students
            const studentEmails = response.body.data.map(s => s.email);
            expect(studentEmails).toContain('student2@test.com');
            expect(studentEmails).toContain('otherstudent@test.com');
            
            // Should not include current user (student@test.com)
            expect(studentEmails).not.toContain('student@test.com');
            
            // Should not include inactive student
            expect(studentEmails).not.toContain('inactivestudent@test.com');
        });

        it('should include student details with department info', async () => {
            const response = await request(app)
                .get('/api/students/all-students')
                .set('Authorization', `Bearer ${testData.tokens.student}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            
            const student = response.body.data.find(s => s.email === 'student2@test.com');
            expect(student).toBeDefined();
            expect(student.name).toBeDefined();
            expect(student.email).toBeDefined();
            expect(student.usn).toBeDefined();
            expect(student.rollNumber).toBeDefined();
            expect(student.semester).toBeDefined();
            expect(student.department).toBeDefined();
            expect(student.department.name).toBeDefined();
            expect(student.department.code).toBeDefined();
        });

        it('should sort students by name', async () => {
            const response = await request(app)
                .get('/api/students/all-students')
                .set('Authorization', `Bearer ${testData.tokens.student}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            
            const names = response.body.data.map(s => s.name);
            const sortedNames = [...names].sort();
            expect(names).toEqual(sortedNames);
        });

        it('should require student authorization', async () => {
            const response = await request(app)
                .get('/api/students/all-students')
                .set('Authorization', `Bearer ${testData.tokens.teacher}`);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .get('/api/students/all-students');

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });

        it('should not include non-student users', async () => {
            const response = await request(app)
                .get('/api/students/all-students')
                .set('Authorization', `Bearer ${testData.tokens.student}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            
            const emails = response.body.data.map(s => s.email);
            expect(emails).not.toContain('teacher@test.com');
            expect(emails).not.toContain('admin@test.com');
            expect(emails).not.toContain('superadmin@test.com');
            expect(emails).not.toContain('hod@test.com');
        });

        it('should handle empty student list (only current user)', async () => {
            // Deactivate all other students
            await User.updateMany(
                { 
                    role: 'student',
                    _id: { $ne: testData.users.student._id }
                },
                { isActive: false }
            );

            const response = await request(app)
                .get('/api/students/all-students')
                .set('Authorization', `Bearer ${testData.tokens.student}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual([]);
            expect(response.body.count).toBe(0);
        });

        it('should handle cross-department student visibility', async () => {
            const response = await request(app)
                .get('/api/students/all-students')
                .set('Authorization', `Bearer ${testData.tokens.student}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            
            // Should include students from other departments
            const studentEmails = response.body.data.map(s => s.email);
            expect(studentEmails).toContain('otherstudent@test.com');
            
            // Verify department information is included
            const otherDeptStudent = response.body.data.find(s => s.email === 'otherstudent@test.com');
            expect(otherDeptStudent.department.code).toBe('ME');
        });

        it('should only return necessary fields', async () => {
            const response = await request(app)
                .get('/api/students/all-students')
                .set('Authorization', `Bearer ${testData.tokens.student}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            
            const student = response.body.data[0];
            
            // Should include these fields
            expect(student.name).toBeDefined();
            expect(student.email).toBeDefined();
            expect(student.usn).toBeDefined();
            expect(student.rollNumber).toBeDefined();
            expect(student.semester).toBeDefined();
            expect(student.department).toBeDefined();
            
            // Should not include sensitive fields
            expect(student.password).toBeUndefined();
            expect(student.createdBy).toBeUndefined();
            expect(student.updatedAt).toBeUndefined();
        });
    });
});