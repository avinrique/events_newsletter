const request = require('supertest');
const app = require('../server');
const Project = require('../models/Project');
const { setupTestAuth, cleanupTestData } = require('./helpers/auth');
const path = require('path');

describe('Project Management Endpoints', () => {
    let testData;

    beforeEach(async () => {
        await cleanupTestData();
        testData = await setupTestAuth(app);
    });

    describe('POST /api/projects', () => {
        it('should allow student to create project', async () => {
            const projectData = {
                title: 'Web Development Project',
                projectType: 'personal',
                domain: 'Web Development',
                description: 'A comprehensive web application project',
                teamMembers: [],
                mentors: [testData.users.teacher._id.toString()]
            };

            const response = await request(app)
                .post('/api/projects')
                .set('Authorization', `Bearer ${testData.tokens.student}`)
                .send(projectData);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.title).toBe(projectData.title);
            expect(response.body.data.projectType).toBe(projectData.projectType);
            expect(response.body.data.status).toBe('pending');
        });

        it('should allow teacher to create project', async () => {
            const projectData = {
                title: 'Research Project',
                projectType: 'major',
                domain: 'Machine Learning',
                description: 'ML research project',
                budget: 50000
            };

            const response = await request(app)
                .post('/api/projects')
                .set('Authorization', `Bearer ${testData.tokens.teacher}`)
                .send(projectData);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.title).toBe(projectData.title);
        });

        it('should validate required fields', async () => {
            const response = await request(app)
                .post('/api/projects')
                .set('Authorization', `Bearer ${testData.tokens.student}`)
                .send({
                    // title missing
                    projectType: 'personal',
                    domain: 'Web Development'
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.errors).toBeDefined();
        });

        it('should validate project type', async () => {
            const projectData = {
                title: 'Test Project',
                projectType: 'invalid-type',
                domain: 'Test Domain'
            };

            const response = await request(app)
                .post('/api/projects')
                .set('Authorization', `Bearer ${testData.tokens.student}`)
                .send(projectData);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should validate description length', async () => {
            const projectData = {
                title: 'Test Project',
                projectType: 'personal',
                domain: 'Test Domain',
                description: 'x'.repeat(2001) // Too long
            };

            const response = await request(app)
                .post('/api/projects')
                .set('Authorization', `Bearer ${testData.tokens.student}`)
                .send(projectData);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/projects', () => {
        beforeEach(async () => {
            // Create test projects
            await Project.create({
                title: 'Student Project',
                projectType: 'personal',
                domain: 'Web Development',
                createdBy: testData.users.student._id,
                department: testData.department._id,
                status: 'approved'
            });

            await Project.create({
                title: 'Teacher Project',
                projectType: 'major',
                domain: 'AI/ML',
                createdBy: testData.users.teacher._id,
                department: testData.department._id,
                status: 'pending'
            });
        });

        it('should return user projects for student', async () => {
            const response = await request(app)
                .get('/api/projects')
                .set('Authorization', `Bearer ${testData.tokens.student}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.length).toBeGreaterThan(0);
            
            // Should include projects created by student
            const projectTitles = response.body.data.map(p => p.title);
            expect(projectTitles).toContain('Student Project');
        });

        it('should return department projects for teacher', async () => {
            const response = await request(app)
                .get('/api/projects')
                .set('Authorization', `Bearer ${testData.tokens.teacher}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.length).toBeGreaterThan(0);
        });

        it('should filter by project type', async () => {
            const response = await request(app)
                .get('/api/projects?projectType=personal')
                .set('Authorization', `Bearer ${testData.tokens.student}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            
            response.body.data.forEach(project => {
                expect(project.projectType).toBe('personal');
            });
        });

        it('should filter by status', async () => {
            const response = await request(app)
                .get('/api/projects?status=approved')
                .set('Authorization', `Bearer ${testData.tokens.teacher}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            
            response.body.data.forEach(project => {
                expect(project.status).toBe('approved');
            });
        });
    });

    describe('GET /api/projects/:id', () => {
        let testProject;

        beforeEach(async () => {
            testProject = await Project.create({
                title: 'Test Project Details',
                projectType: 'personal',
                domain: 'Web Development',
                description: 'Detailed project description',
                createdBy: testData.users.student._id,
                department: testData.department._id,
                mentors: [testData.users.teacher._id],
                status: 'pending'
            });
        });

        it('should return project details for owner', async () => {
            const response = await request(app)
                .get(`/api/projects/${testProject._id}`)
                .set('Authorization', `Bearer ${testData.tokens.student}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data._id).toBe(testProject._id.toString());
            expect(response.body.data.title).toBe(testProject.title);
            expect(response.body.data.mentors).toBeDefined();
        });

        it('should return project details for mentor', async () => {
            const response = await request(app)
                .get(`/api/projects/${testProject._id}`)
                .set('Authorization', `Bearer ${testData.tokens.teacher}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data._id).toBe(testProject._id.toString());
        });

        it('should return 404 for non-existent project', async () => {
            const fakeId = '507f1f77bcf86cd799439011';
            const response = await request(app)
                .get(`/api/projects/${fakeId}`)
                .set('Authorization', `Bearer ${testData.tokens.student}`);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });
    });

    describe('PUT /api/projects/:id', () => {
        let testProject;

        beforeEach(async () => {
            testProject = await Project.create({
                title: 'Updatable Project',
                projectType: 'personal',
                domain: 'Web Development',
                createdBy: testData.users.student._id,
                department: testData.department._id,
                status: 'pending'
            });
        });

        it('should allow owner to update project', async () => {
            const updateData = {
                title: 'Updated Project Title',
                description: 'Updated description',
                domain: 'Mobile Development'
            };

            const response = await request(app)
                .put(`/api/projects/${testProject._id}`)
                .set('Authorization', `Bearer ${testData.tokens.student}`)
                .send(updateData);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.title).toBe(updateData.title);
            expect(response.body.data.description).toBe(updateData.description);
        });

        it('should prevent non-owner from updating', async () => {
            const updateData = {
                title: 'Unauthorized Update'
            };

            const response = await request(app)
                .put(`/api/projects/${testProject._id}`)
                .set('Authorization', `Bearer ${testData.tokens.teacher}`)
                .send(updateData);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });

        it('should prevent updating approved projects', async () => {
            await Project.findByIdAndUpdate(testProject._id, { status: 'approved' });

            const updateData = {
                title: 'Should Not Update'
            };

            const response = await request(app)
                .put(`/api/projects/${testProject._id}`)
                .set('Authorization', `Bearer ${testData.tokens.student}`)
                .send(updateData);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe('DELETE /api/projects/:id', () => {
        let testProject;

        beforeEach(async () => {
            testProject = await Project.create({
                title: 'Deletable Project',
                projectType: 'personal',
                domain: 'Web Development',
                createdBy: testData.users.student._id,
                department: testData.department._id,
                status: 'pending'
            });
        });

        it('should allow owner to delete project', async () => {
            const response = await request(app)
                .delete(`/api/projects/${testProject._id}`)
                .set('Authorization', `Bearer ${testData.tokens.student}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            // Verify project is deleted
            const deletedProject = await Project.findById(testProject._id);
            expect(deletedProject).toBeNull();
        });

        it('should prevent non-owner from deleting', async () => {
            const response = await request(app)
                .delete(`/api/projects/${testProject._id}`)
                .set('Authorization', `Bearer ${testData.tokens.teacher}`);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });

        it('should prevent deleting approved projects', async () => {
            await Project.findByIdAndUpdate(testProject._id, { status: 'approved' });

            const response = await request(app)
                .delete(`/api/projects/${testProject._id}`)
                .set('Authorization', `Bearer ${testData.tokens.student}`);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe('PUT /api/projects/:id/approve', () => {
        let testProject;

        beforeEach(async () => {
            testProject = await Project.create({
                title: 'Approvable Project',
                projectType: 'personal',
                domain: 'Web Development',
                createdBy: testData.users.student._id,
                department: testData.department._id,
                mentors: [testData.users.teacher._id],
                status: 'pending'
            });
        });

        it('should allow teacher to approve project', async () => {
            const response = await request(app)
                .put(`/api/projects/${testProject._id}/approve`)
                .set('Authorization', `Bearer ${testData.tokens.teacher}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe('approved');
            expect(response.body.data.approvedBy).toBeDefined();
        });

        it('should allow HOD to approve project', async () => {
            const response = await request(app)
                .put(`/api/projects/${testProject._id}/approve`)
                .set('Authorization', `Bearer ${testData.tokens.hod}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe('approved');
        });

        it('should prevent student from approving', async () => {
            const response = await request(app)
                .put(`/api/projects/${testProject._id}/approve`)
                .set('Authorization', `Bearer ${testData.tokens.student}`);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });

        it('should prevent approving already processed projects', async () => {
            await Project.findByIdAndUpdate(testProject._id, { status: 'approved' });

            const response = await request(app)
                .put(`/api/projects/${testProject._id}/approve`)
                .set('Authorization', `Bearer ${testData.tokens.teacher}`);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe('PUT /api/projects/:id/reject', () => {
        let testProject;

        beforeEach(async () => {
            testProject = await Project.create({
                title: 'Rejectable Project',
                projectType: 'personal',
                domain: 'Web Development',
                createdBy: testData.users.student._id,
                department: testData.department._id,
                mentors: [testData.users.teacher._id],
                status: 'pending'
            });
        });

        it('should allow teacher to reject project with reason', async () => {
            const rejectionData = {
                rejectionReason: 'Project scope is too broad'
            };

            const response = await request(app)
                .put(`/api/projects/${testProject._id}/reject`)
                .set('Authorization', `Bearer ${testData.tokens.teacher}`)
                .send(rejectionData);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe('rejected');
            expect(response.body.data.rejectionReason).toBe(rejectionData.rejectionReason);
        });

        it('should allow HOD to reject project', async () => {
            const response = await request(app)
                .put(`/api/projects/${testProject._id}/reject`)
                .set('Authorization', `Bearer ${testData.tokens.hod}`)
                .send({ rejectionReason: 'Budget constraints' });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe('rejected');
        });

        it('should prevent student from rejecting', async () => {
            const response = await request(app)
                .put(`/api/projects/${testProject._id}/reject`)
                .set('Authorization', `Bearer ${testData.tokens.student}`)
                .send({ rejectionReason: 'Cannot reject own project' });

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });
    });
});