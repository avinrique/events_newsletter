const request = require('supertest');
const app = require('../server');
const User = require('../models/User');
const { setupTestAuth, cleanupTestData } = require('./helpers/auth');

describe('Authentication Endpoints', () => {
    beforeEach(async () => {
        await cleanupTestData();
    });

    describe('POST /api/auth/init-superadmin', () => {
        it('should create the first super admin', async () => {
            const userData = {
                name: 'Super Admin',
                email: 'superadmin@test.com',
                password: 'password123'
            };

            const response = await request(app)
                .post('/api/auth/init-superadmin')
                .send(userData);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.token).toBeDefined();
            expect(response.body.user.role).toBe('superadmin');
            expect(response.body.user.email).toBe(userData.email);
        });

        it('should not create super admin if one already exists', async () => {
            // Create first super admin
            await User.create({
                name: 'Existing Super Admin',
                email: 'existing@test.com',
                password: 'password123',
                role: 'superadmin'
            });

            const userData = {
                name: 'Second Super Admin',
                email: 'second@test.com',
                password: 'password123'
            };

            const response = await request(app)
                .post('/api/auth/init-superadmin')
                .send(userData);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Super admin already exists');
        });

        it('should validate required fields', async () => {
            const response = await request(app)
                .post('/api/auth/init-superadmin')
                .send({
                    email: 'invalid-email',
                    password: '123' // too short
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.errors).toBeDefined();
        });
    });

    describe('POST /api/auth/login', () => {
        let testData;

        beforeEach(async () => {
            testData = await setupTestAuth(app);
        });

        it('should login with valid credentials', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'superadmin@test.com',
                    password: 'password123'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.token).toBeDefined();
            expect(response.body.user.email).toBe('superadmin@test.com');
        });

        it('should reject invalid email', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'nonexistent@test.com',
                    password: 'password123'
                });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Invalid credentials');
        });

        it('should reject invalid password', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'superadmin@test.com',
                    password: 'wrongpassword'
                });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Invalid credentials');
        });

        it('should reject login for deactivated user', async () => {
            // Deactivate user
            await User.findOneAndUpdate(
                { email: 'student@test.com' },
                { isActive: false }
            );

            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'student@test.com',
                    password: 'password123'
                });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Your account has been deactivated');
        });

        it('should validate required fields', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'invalid-email'
                    // password missing
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/auth/me', () => {
        let testData;

        beforeEach(async () => {
            testData = await setupTestAuth(app);
        });

        it('should return current user data with valid token', async () => {
            const response = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${testData.tokens.student}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.email).toBe('student@test.com');
            expect(response.body.data.department).toBeDefined();
            expect(response.body.data.proctor).toBeDefined();
        });

        it('should reject request without token', async () => {
            const response = await request(app)
                .get('/api/auth/me');

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Not authorized to access this route');
        });

        it('should reject request with invalid token', async () => {
            const response = await request(app)
                .get('/api/auth/me')
                .set('Authorization', 'Bearer invalid-token');

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
    });

    describe('PUT /api/auth/updatepassword', () => {
        let testData;

        beforeEach(async () => {
            testData = await setupTestAuth(app);
        });

        it('should update password with valid current password', async () => {
            const response = await request(app)
                .put('/api/auth/updatepassword')
                .set('Authorization', `Bearer ${testData.tokens.student}`)
                .send({
                    currentPassword: 'password123',
                    newPassword: 'newpassword123'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.token).toBeDefined();

            // Verify login with new password
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'student@test.com',
                    password: 'newpassword123'
                });

            expect(loginResponse.status).toBe(200);
        });

        it('should reject with incorrect current password', async () => {
            const response = await request(app)
                .put('/api/auth/updatepassword')
                .set('Authorization', `Bearer ${testData.tokens.student}`)
                .send({
                    currentPassword: 'wrongpassword',
                    newPassword: 'newpassword123'
                });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Current password is incorrect');
        });

        it('should validate new password length', async () => {
            const response = await request(app)
                .put('/api/auth/updatepassword')
                .set('Authorization', `Bearer ${testData.tokens.student}`)
                .send({
                    currentPassword: 'password123',
                    newPassword: '123' // too short
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe('PUT /api/auth/profile', () => {
        let testData;

        beforeEach(async () => {
            testData = await setupTestAuth(app);
        });

        it('should update profile information', async () => {
            const updateData = {
                name: 'Updated Student Name',
                contactNumber: '9876543210',
                semester: 7
            };

            const response = await request(app)
                .put('/api/auth/profile')
                .set('Authorization', `Bearer ${testData.tokens.student}`)
                .send(updateData);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.name).toBe(updateData.name);
            expect(response.body.data.contactNumber).toBe(updateData.contactNumber);
            expect(response.body.data.semester).toBe(updateData.semester);
        });

        it('should update proctor and class teacher for students', async () => {
            const updateData = {
                proctor: testData.users.teacher._id.toString(),
                classTeacher: testData.users.hod._id.toString()
            };

            const response = await request(app)
                .put('/api/auth/profile')
                .set('Authorization', `Bearer ${testData.tokens.student}`)
                .send(updateData);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.proctor._id).toBe(updateData.proctor);
            expect(response.body.data.classTeacher._id).toBe(updateData.classTeacher);
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .put('/api/auth/profile')
                .send({ name: 'Updated Name' });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
    });
});