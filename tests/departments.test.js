const request = require('supertest');
const app = require('../server');
const Department = require('../models/Department');
const Designation = require('../models/Designation');
const { setupTestAuth, cleanupTestData } = require('./helpers/auth');

describe('Department Management Endpoints', () => {
    let testData;

    beforeEach(async () => {
        await cleanupTestData();
        testData = await setupTestAuth(app);
    });

    describe('POST /api/departments', () => {
        it('should allow superadmin to create department', async () => {
            const deptData = {
                name: 'Electronics and Communication',
                code: 'ECE',
                description: 'Electronics and Communication Engineering Department'
            };

            const response = await request(app)
                .post('/api/departments')
                .set('Authorization', `Bearer ${testData.tokens.superAdmin}`)
                .send(deptData);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.name).toBe(deptData.name);
            expect(response.body.data.code).toBe(deptData.code);
            expect(response.body.data.description).toBe(deptData.description);
        });

        it('should prevent duplicate department codes', async () => {
            const deptData = {
                name: 'Another CSE',
                code: 'CSE', // Same as existing department
                description: 'Another Computer Science Department'
            };

            const response = await request(app)
                .post('/api/departments')
                .set('Authorization', `Bearer ${testData.tokens.superAdmin}`)
                .send(deptData);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should prevent non-superadmin from creating departments', async () => {
            const deptData = {
                name: 'Unauthorized Department',
                code: 'UNAUTH',
                description: 'Should not be created'
            };

            const response = await request(app)
                .post('/api/departments')
                .set('Authorization', `Bearer ${testData.tokens.admin}`)
                .send(deptData);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });

        it('should validate required fields', async () => {
            const response = await request(app)
                .post('/api/departments')
                .set('Authorization', `Bearer ${testData.tokens.superAdmin}`)
                .send({
                    name: 'Incomplete Department'
                    // code and description missing
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.errors).toBeDefined();
        });
    });

    describe('GET /api/departments', () => {
        it('should return all departments for any authenticated user', async () => {
            const response = await request(app)
                .get('/api/departments')
                .set('Authorization', `Bearer ${testData.tokens.student}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.length).toBeGreaterThan(0);
            
            // Should include the test department
            const deptNames = response.body.data.map(d => d.name);
            expect(deptNames).toContain('Computer Science');
        });

        it('should include HOD information if populated', async () => {
            const response = await request(app)
                .get('/api/departments')
                .set('Authorization', `Bearer ${testData.tokens.admin}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            
            const csDept = response.body.data.find(d => d.code === 'CSE');
            if (csDept && csDept.hod) {
                expect(csDept.hod.name).toBeDefined();
                expect(csDept.hod.email).toBeDefined();
            }
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .get('/api/departments');

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/departments/:id', () => {
        it('should return department details', async () => {
            const response = await request(app)
                .get(`/api/departments/${testData.department._id}`)
                .set('Authorization', `Bearer ${testData.tokens.admin}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data._id).toBe(testData.department._id.toString());
            expect(response.body.data.name).toBe('Computer Science');
        });

        it('should return 404 for non-existent department', async () => {
            const fakeId = '507f1f77bcf86cd799439011';
            const response = await request(app)
                .get(`/api/departments/${fakeId}`)
                .set('Authorization', `Bearer ${testData.tokens.admin}`);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });
    });

    describe('PUT /api/departments/:id', () => {
        it('should allow superadmin to update department', async () => {
            const updateData = {
                name: 'Updated Computer Science',
                description: 'Updated description'
            };

            const response = await request(app)
                .put(`/api/departments/${testData.department._id}`)
                .set('Authorization', `Bearer ${testData.tokens.superAdmin}`)
                .send(updateData);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.name).toBe(updateData.name);
            expect(response.body.data.description).toBe(updateData.description);
        });

        it('should prevent non-superadmin from updating', async () => {
            const updateData = {
                name: 'Unauthorized Update'
            };

            const response = await request(app)
                .put(`/api/departments/${testData.department._id}`)
                .set('Authorization', `Bearer ${testData.tokens.admin}`)
                .send(updateData);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });
    });

    describe('DELETE /api/departments/:id', () => {
        it('should allow superadmin to soft delete department', async () => {
            const response = await request(app)
                .delete(`/api/departments/${testData.department._id}`)
                .set('Authorization', `Bearer ${testData.tokens.superAdmin}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            // Verify department is deactivated
            const dept = await Department.findById(testData.department._id);
            expect(dept.isActive).toBe(false);
        });

        it('should prevent non-superadmin from deleting', async () => {
            const response = await request(app)
                .delete(`/api/departments/${testData.department._id}`)
                .set('Authorization', `Bearer ${testData.tokens.admin}`);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });
    });

    describe('PUT /api/departments/:id/reactivate', () => {
        beforeEach(async () => {
            // Deactivate department first
            await Department.findByIdAndUpdate(testData.department._id, { isActive: false });
        });

        it('should allow superadmin to reactivate department', async () => {
            const response = await request(app)
                .put(`/api/departments/${testData.department._id}/reactivate`)
                .set('Authorization', `Bearer ${testData.tokens.superAdmin}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            // Verify department is reactivated
            const dept = await Department.findById(testData.department._id);
            expect(dept.isActive).toBe(true);
        });

        it('should prevent non-superadmin from reactivating', async () => {
            const response = await request(app)
                .put(`/api/departments/${testData.department._id}/reactivate`)
                .set('Authorization', `Bearer ${testData.tokens.admin}`);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });
    });

    describe('POST /api/departments/designations/create', () => {
        it('should allow superadmin to create designation', async () => {
            const designationData = {
                name: 'Associate Professor',
                level: 2
            };

            const response = await request(app)
                .post('/api/departments/designations/create')
                .set('Authorization', `Bearer ${testData.tokens.superAdmin}`)
                .send(designationData);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.name).toBe(designationData.name);
            expect(response.body.data.level).toBe(designationData.level);
        });

        it('should prevent duplicate designation names', async () => {
            const designationData = {
                name: 'Professor', // Same as existing
                level: 3
            };

            const response = await request(app)
                .post('/api/departments/designations/create')
                .set('Authorization', `Bearer ${testData.tokens.superAdmin}`)
                .send(designationData);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should prevent non-superadmin from creating designations', async () => {
            const designationData = {
                name: 'Unauthorized Designation',
                level: 1
            };

            const response = await request(app)
                .post('/api/departments/designations/create')
                .set('Authorization', `Bearer ${testData.tokens.admin}`)
                .send(designationData);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });

        it('should validate required fields', async () => {
            const response = await request(app)
                .post('/api/departments/designations/create')
                .set('Authorization', `Bearer ${testData.tokens.superAdmin}`)
                .send({
                    name: 'Incomplete Designation'
                    // level missing
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should validate level is numeric', async () => {
            const response = await request(app)
                .post('/api/departments/designations/create')
                .set('Authorization', `Bearer ${testData.tokens.superAdmin}`)
                .send({
                    name: 'Test Designation',
                    level: 'not-a-number'
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/departments/designations/all', () => {
        it('should return all designations for any authenticated user', async () => {
            const response = await request(app)
                .get('/api/departments/designations/all')
                .set('Authorization', `Bearer ${testData.tokens.student}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.length).toBeGreaterThan(0);
            
            // Should include the test designation
            const designationNames = response.body.data.map(d => d.name);
            expect(designationNames).toContain('Professor');
        });

        it('should sort designations by level', async () => {
            // Create additional designations
            await Designation.create({
                name: 'Assistant Professor',
                level: 3
            });
            
            await Designation.create({
                name: 'Associate Professor',
                level: 2
            });

            const response = await request(app)
                .get('/api/departments/designations/all')
                .set('Authorization', `Bearer ${testData.tokens.admin}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            
            // Check if sorted by level
            const levels = response.body.data.map(d => d.level);
            for (let i = 1; i < levels.length; i++) {
                expect(levels[i]).toBeGreaterThanOrEqual(levels[i - 1]);
            }
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .get('/api/departments/designations/all');

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/departments/designations/:id', () => {
        it('should return designation details', async () => {
            const response = await request(app)
                .get(`/api/departments/designations/${testData.designation._id}`)
                .set('Authorization', `Bearer ${testData.tokens.admin}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data._id).toBe(testData.designation._id.toString());
            expect(response.body.data.name).toBe('Professor');
        });

        it('should return 404 for non-existent designation', async () => {
            const fakeId = '507f1f77bcf86cd799439011';
            const response = await request(app)
                .get(`/api/departments/designations/${fakeId}`)
                .set('Authorization', `Bearer ${testData.tokens.admin}`);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });
    });

    describe('PUT /api/departments/designations/:id', () => {
        it('should allow superadmin to update designation', async () => {
            const updateData = {
                name: 'Senior Professor',
                level: 0
            };

            const response = await request(app)
                .put(`/api/departments/designations/${testData.designation._id}`)
                .set('Authorization', `Bearer ${testData.tokens.superAdmin}`)
                .send(updateData);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.name).toBe(updateData.name);
            expect(response.body.data.level).toBe(updateData.level);
        });

        it('should prevent non-superadmin from updating', async () => {
            const updateData = {
                name: 'Unauthorized Update'
            };

            const response = await request(app)
                .put(`/api/departments/designations/${testData.designation._id}`)
                .set('Authorization', `Bearer ${testData.tokens.admin}`)
                .send(updateData);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });
    });

    describe('DELETE /api/departments/designations/:id', () => {
        it('should allow superadmin to delete designation', async () => {
            // Create a designation to delete
            const designation = await Designation.create({
                name: 'Temporary Designation',
                level: 10
            });

            const response = await request(app)
                .delete(`/api/departments/designations/${designation._id}`)
                .set('Authorization', `Bearer ${testData.tokens.superAdmin}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            // Verify designation is deleted
            const deletedDesignation = await Designation.findById(designation._id);
            expect(deletedDesignation).toBeNull();
        });

        it('should prevent non-superadmin from deleting', async () => {
            const response = await request(app)
                .delete(`/api/departments/designations/${testData.designation._id}`)
                .set('Authorization', `Bearer ${testData.tokens.admin}`);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });

        it('should prevent deletion of designation in use', async () => {
            // The test designation is already in use by test users
            const response = await request(app)
                .delete(`/api/departments/designations/${testData.designation._id}`)
                .set('Authorization', `Bearer ${testData.tokens.superAdmin}`);

            // This should fail if proper constraints are in place
            // The actual behavior depends on the implementation
            expect([400, 500]).toContain(response.status);
        });
    });
});