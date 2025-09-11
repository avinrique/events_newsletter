const request = require('supertest');
const app = require('../server');
const User = require('../models/User');
const { setupTestAuth, cleanupTestData, testRolePermissions } = require('./helpers/auth');

describe('User Management Endpoints', () => {
    let testData;

    beforeEach(async () => {
        await cleanupTestData();
        testData = await setupTestAuth(app);
    });

    describe('POST /api/users', () => {
        it('should allow superadmin to create admin', async () => {
            const newUser = {
                name: 'New Admin',
                email: 'newadmin@test.com',
                password: 'password123',
                role: 'admin'
            };

            const response = await request(app)
                .post('/api/users')
                .set('Authorization', `Bearer ${testData.tokens.superAdmin}`)
                .send(newUser);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.role).toBe('admin');
            expect(response.body.data.email).toBe(newUser.email);
        });

        it('should allow admin to create teacher', async () => {
            const newUser = {
                name: 'New Teacher',
                email: 'newteacher@test.com',
                password: 'password123',
                role: 'teacher',
                department: testData.department._id.toString(),
                designation: testData.designation._id.toString()
            };

            const response = await request(app)
                .post('/api/users')
                .set('Authorization', `Bearer ${testData.tokens.admin}`)
                .send(newUser);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.role).toBe('teacher');
        });

        it('should allow admin to create student', async () => {
            const newUser = {
                name: 'New Student',
                email: 'newstudent@test.com',
                password: 'password123',
                role: 'student',
                department: testData.department._id.toString(),
                usn: 'CSE21002',
                rollNumber: '21CS002',
                semester: 5
            };

            const response = await request(app)
                .post('/api/users')
                .set('Authorization', `Bearer ${testData.tokens.admin}`)
                .send(newUser);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.role).toBe('student');
            expect(response.body.data.usn).toBe(newUser.usn);
        });

        it('should prevent admin from creating superadmin', async () => {
            const newUser = {
                name: 'Unauthorized SuperAdmin',
                email: 'unauthorized@test.com',
                password: 'password123',
                role: 'superadmin'
            };

            const response = await request(app)
                .post('/api/users')
                .set('Authorization', `Bearer ${testData.tokens.admin}`)
                .send(newUser);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });

        it('should prevent superadmin from creating non-admin roles', async () => {
            const newUser = {
                name: 'Unauthorized Teacher',
                email: 'unauthorized@test.com',
                password: 'password123',
                role: 'teacher'
            };

            const response = await request(app)
                .post('/api/users')
                .set('Authorization', `Bearer ${testData.tokens.superAdmin}`)
                .send(newUser);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });

        it('should prevent unauthorized roles from creating users', async () => {
            const newUser = {
                name: 'Unauthorized User',
                email: 'unauthorized@test.com',
                password: 'password123',
                role: 'student'
            };

            // Test with teacher token
            const response = await request(app)
                .post('/api/users')
                .set('Authorization', `Bearer ${testData.tokens.teacher}`)
                .send(newUser);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });

        it('should validate required fields', async () => {
            const response = await request(app)
                .post('/api/users')
                .set('Authorization', `Bearer ${testData.tokens.admin}`)
                .send({
                    email: 'invalid-email',
                    password: '123', // too short
                    // role missing
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/users', () => {
        it('should return all users for superadmin', async () => {
            const response = await request(app)
                .get('/api/users')
                .set('Authorization', `Bearer ${testData.tokens.superAdmin}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.length).toBeGreaterThan(0);
            expect(response.body.count).toBeDefined();
        });

        it('should return department users for HOD', async () => {
            const response = await request(app)
                .get('/api/users')
                .set('Authorization', `Bearer ${testData.tokens.hod}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            // Should only see users from same department
            const users = response.body.data;
            users.forEach(user => {
                if (user.department) {
                    expect(user.department._id).toBe(testData.department._id.toString());
                }
            });
        });

        it('should filter users by role', async () => {
            const response = await request(app)
                .get('/api/users?role=student')
                .set('Authorization', `Bearer ${testData.tokens.admin}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            response.body.data.forEach(user => {
                expect(user.role).toBe('student');
            });
        });

        it('should filter users by position', async () => {
            const response = await request(app)
                .get('/api/users?position=HOD')
                .set('Authorization', `Bearer ${testData.tokens.admin}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            response.body.data.forEach(user => {
                expect(user.position).toBe('HOD');
            });
        });

        it('should require proper authorization', async () => {
            const response = await request(app)
                .get('/api/users')
                .set('Authorization', `Bearer ${testData.tokens.student}`);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/users/:id', () => {
        it('should return user details for authorized roles', async () => {
            const response = await request(app)
                .get(`/api/users/${testData.users.student._id}`)
                .set('Authorization', `Bearer ${testData.tokens.admin}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data._id).toBe(testData.users.student._id.toString());
            expect(response.body.data.department).toBeDefined();
        });

        it('should prevent cross-department access for HOD', async () => {
            // Create user in different department
            const otherDept = await require('../models/Department').create({
                name: 'Mechanical Engineering',
                code: 'ME',
                description: 'Mechanical Engineering Department'
            });

            const otherUser = await User.create({
                name: 'Other Student',
                email: 'other@test.com',
                password: 'password123',
                role: 'student',
                department: otherDept._id,
                createdBy: testData.users.admin._id
            });

            const response = await request(app)
                .get(`/api/users/${otherUser._id}`)
                .set('Authorization', `Bearer ${testData.tokens.hod}`);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });

        it('should return 404 for non-existent user', async () => {
            const fakeId = '507f1f77bcf86cd799439011';
            const response = await request(app)
                .get(`/api/users/${fakeId}`)
                .set('Authorization', `Bearer ${testData.tokens.admin}`);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });
    });

    describe('PUT /api/users/:id', () => {
        it('should allow admin to update any user', async () => {
            const updateData = {
                name: 'Updated Student Name',
                contactNumber: '9876543210'
            };

            const response = await request(app)
                .put(`/api/users/${testData.users.student._id}`)
                .set('Authorization', `Bearer ${testData.tokens.admin}`)
                .send(updateData);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.name).toBe(updateData.name);
            expect(response.body.data.contactNumber).toBe(updateData.contactNumber);
        });

        it('should allow teacher to update assigned students', async () => {
            const updateData = {
                name: 'Updated by Teacher',
                semester: 7
            };

            const response = await request(app)
                .put(`/api/users/${testData.users.student._id}`)
                .set('Authorization', `Bearer ${testData.tokens.teacher}`)
                .send(updateData);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.name).toBe(updateData.name);
        });

        it('should prevent teacher from updating non-assigned students', async () => {
            // Create another student not assigned to this teacher
            const otherStudent = await User.create({
                name: 'Other Student',
                email: 'otherstudent@test.com',
                password: 'password123',
                role: 'student',
                department: testData.department._id,
                usn: 'CSE21003',
                createdBy: testData.users.admin._id
                // No proctor/classTeacher assigned
            });

            const updateData = { name: 'Unauthorized Update' };

            const response = await request(app)
                .put(`/api/users/${otherStudent._id}`)
                .set('Authorization', `Bearer ${testData.tokens.teacher}`)
                .send(updateData);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });

        it('should prevent teacher from updating non-student users', async () => {
            const updateData = { name: 'Unauthorized Update' };

            const response = await request(app)
                .put(`/api/users/${testData.users.admin._id}`)
                .set('Authorization', `Bearer ${testData.tokens.teacher}`)
                .send(updateData);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });
    });

    describe('PUT /api/users/:id/toggle-status', () => {
        it('should allow admin to toggle user status', async () => {
            const response = await request(app)
                .put(`/api/users/${testData.users.student._id}/toggle-status`)
                .set('Authorization', `Bearer ${testData.tokens.admin}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.isActive).toBe(false); // Should be deactivated
        });

        it('should prevent unauthorized roles from toggling status', async () => {
            const response = await request(app)
                .put(`/api/users/${testData.users.student._id}/toggle-status`)
                .set('Authorization', `Bearer ${testData.tokens.teacher}`);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });
    });

    describe('PUT /api/users/:id/reset-password', () => {
        it('should allow admin to reset user password', async () => {
            const newPassword = 'newpassword123';

            const response = await request(app)
                .put(`/api/users/${testData.users.student._id}/reset-password`)
                .set('Authorization', `Bearer ${testData.tokens.admin}`)
                .send({ password: newPassword });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            // Verify login with new password
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'student@test.com',
                    password: newPassword
                });

            expect(loginResponse.status).toBe(200);
        });

        it('should validate password length', async () => {
            const response = await request(app)
                .put(`/api/users/${testData.users.student._id}/reset-password`)
                .set('Authorization', `Bearer ${testData.tokens.admin}`)
                .send({ password: '123' }); // too short

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe('DELETE /api/users/:id', () => {
        it('should soft delete (deactivate) user', async () => {
            const response = await request(app)
                .delete(`/api/users/${testData.users.student._id}`)
                .set('Authorization', `Bearer ${testData.tokens.admin}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('User deactivated successfully');

            // Verify user is deactivated
            const user = await User.findById(testData.users.student._id);
            expect(user.isActive).toBe(false);
        });

        it('should require admin authorization', async () => {
            const response = await request(app)
                .delete(`/api/users/${testData.users.student._id}`)
                .set('Authorization', `Bearer ${testData.tokens.teacher}`);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });
    });

    describe('POST /api/users/assign-hod', () => {
        it('should allow admin to assign HOD', async () => {
            // Create another teacher to assign as HOD
            const newTeacher = await User.create({
                name: 'New HOD',
                email: 'newhod@test.com',
                password: 'password123',
                role: 'teacher',
                department: testData.department._id,
                designation: testData.designation._id,
                createdBy: testData.users.admin._id
            });

            const response = await request(app)
                .post('/api/users/assign-hod')
                .set('Authorization', `Bearer ${testData.tokens.admin}`)
                .send({
                    userId: newTeacher._id.toString(),
                    departmentId: testData.department._id.toString()
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.user.position).toBe('HOD');
        });

        it('should prevent non-teacher from being assigned as HOD', async () => {
            const response = await request(app)
                .post('/api/users/assign-hod')
                .set('Authorization', `Bearer ${testData.tokens.admin}`)
                .send({
                    userId: testData.users.student._id.toString(),
                    departmentId: testData.department._id.toString()
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Only teachers can be assigned as HOD');
        });

        it('should require admin authorization', async () => {
            const response = await request(app)
                .post('/api/users/assign-hod')
                .set('Authorization', `Bearer ${testData.tokens.teacher}`)
                .send({
                    userId: testData.users.teacher._id.toString(),
                    departmentId: testData.department._id.toString()
                });

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/users/teachers/department', () => {
        it('should allow students to get all teachers', async () => {
            const response = await request(app)
                .get('/api/users/teachers/department')
                .set('Authorization', `Bearer ${testData.tokens.student}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.length).toBeGreaterThan(0);
            
            // Should include both teacher and HOD
            const teacherEmails = response.body.data.map(t => t.email);
            expect(teacherEmails).toContain('teacher@test.com');
            expect(teacherEmails).toContain('hod@test.com');
        });

        it('should require student authorization', async () => {
            const response = await request(app)
                .get('/api/users/teachers/department')
                .set('Authorization', `Bearer ${testData.tokens.teacher}`);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/users/students/all', () => {
        it('should allow teachers to get all students', async () => {
            const response = await request(app)
                .get('/api/users/students/all')
                .set('Authorization', `Bearer ${testData.tokens.teacher}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.length).toBeGreaterThan(0);
            
            // Should include relationship info
            const student = response.body.data.find(s => s.email === 'student@test.com');
            expect(student.proctor).toBeDefined();
            expect(student.classTeacher).toBeDefined();
        });

        it('should require teacher authorization', async () => {
            const response = await request(app)
                .get('/api/users/students/all')
                .set('Authorization', `Bearer ${testData.tokens.student}`);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });
    });
});