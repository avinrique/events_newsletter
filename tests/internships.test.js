const request = require('supertest');
const app = require('../server');
const Internship = require('../models/Internship');
const { setupTestAuth, cleanupTestData } = require('./helpers/auth');

describe('Internship Management Endpoints', () => {
    let testData;

    beforeEach(async () => {
        await cleanupTestData();
        testData = await setupTestAuth(app);
    });

    describe('POST /api/internships', () => {
        it('should allow student to add internship', async () => {
            const internshipData = {
                companyName: 'Tech Corp',
                position: 'Software Development Intern',
                startDate: '2023-06-01',
                endDate: '2023-08-31',
                stipend: 15000,
                description: 'Full-stack development internship'
            };

            const response = await request(app)
                .post('/api/internships')
                .set('Authorization', `Bearer ${testData.tokens.student}`)
                .field('companyName', internshipData.companyName)
                .field('position', internshipData.position)
                .field('startDate', internshipData.startDate)
                .field('endDate', internshipData.endDate)
                .field('stipend', internshipData.stipend.toString())
                .field('description', internshipData.description);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.companyName).toBe(internshipData.companyName);
            expect(response.body.data.position).toBe(internshipData.position);
            expect(response.body.data.status).toBe('pending'); // Student uploads need approval
            expect(response.body.data.stipend).toBe(internshipData.stipend);
        });

        it('should allow teacher to add internship (auto-approved)', async () => {
            const internshipData = {
                companyName: 'Research Lab',
                position: 'Research Associate',
                startDate: '2023-07-01'
            };

            const response = await request(app)
                .post('/api/internships')
                .set('Authorization', `Bearer ${testData.tokens.teacher}`)
                .field('companyName', internshipData.companyName)
                .field('position', internshipData.position)
                .field('startDate', internshipData.startDate);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe('approved'); // Teacher uploads auto-approved
        });

        it('should validate required fields', async () => {
            const response = await request(app)
                .post('/api/internships')
                .set('Authorization', `Bearer ${testData.tokens.student}`)
                .field('companyName', 'Test Company');
                // position and startDate missing

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.errors).toBeDefined();
        });

        it('should validate date formats', async () => {
            const response = await request(app)
                .post('/api/internships')
                .set('Authorization', `Bearer ${testData.tokens.student}`)
                .field('companyName', 'Test Company')
                .field('position', 'Test Position')
                .field('startDate', 'invalid-date');

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should validate end date is after start date', async () => {
            const response = await request(app)
                .post('/api/internships')
                .set('Authorization', `Bearer ${testData.tokens.student}`)
                .field('companyName', 'Test Company')
                .field('position', 'Test Position')
                .field('startDate', '2023-08-01')
                .field('endDate', '2023-07-01'); // Before start date

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should validate stipend is positive number', async () => {
            const response = await request(app)
                .post('/api/internships')
                .set('Authorization', `Bearer ${testData.tokens.student}`)
                .field('companyName', 'Test Company')
                .field('position', 'Test Position')
                .field('startDate', '2023-06-01')
                .field('stipend', '-1000'); // Negative stipend

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/internships', () => {
        beforeEach(async () => {
            // Create test internships
            await Internship.create({
                companyName: 'Student Company',
                position: 'Intern',
                startDate: new Date('2023-06-01'),
                endDate: new Date('2023-08-31'),
                uploadedBy: testData.users.student._id,
                department: testData.department._id,
                status: 'approved',
                stipend: 12000
            });

            await Internship.create({
                companyName: 'Teacher Company',
                position: 'Consultant',
                startDate: new Date('2023-07-01'),
                uploadedBy: testData.users.teacher._id,
                department: testData.department._id,
                status: 'approved',
                stipend: 50000
            });
        });

        it('should return user internships for student', async () => {
            const response = await request(app)
                .get('/api/internships')
                .set('Authorization', `Bearer ${testData.tokens.student}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.length).toBeGreaterThan(0);
            
            // Should only include internships uploaded by student
            response.body.data.forEach(internship => {
                expect(internship.uploadedBy._id).toBe(testData.users.student._id.toString());
            });
        });

        it('should return department internships for teacher', async () => {
            const response = await request(app)
                .get('/api/internships')
                .set('Authorization', `Bearer ${testData.tokens.teacher}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.length).toBeGreaterThan(0);
            
            // Should include internships from department
            const companies = response.body.data.map(i => i.companyName);
            expect(companies).toContain('Student Company');
            expect(companies).toContain('Teacher Company');
        });

        it('should filter by status', async () => {
            // Create pending internship
            await Internship.create({
                companyName: 'Pending Company',
                position: 'Pending Intern',
                startDate: new Date(),
                uploadedBy: testData.users.student._id,
                department: testData.department._id,
                status: 'pending'
            });

            const response = await request(app)
                .get('/api/internships?status=pending')
                .set('Authorization', `Bearer ${testData.tokens.teacher}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            
            response.body.data.forEach(internship => {
                expect(internship.status).toBe('pending');
            });
        });

        it('should filter by company', async () => {
            const response = await request(app)
                .get('/api/internships?company=Student Company')
                .set('Authorization', `Bearer ${testData.tokens.teacher}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            
            response.body.data.forEach(internship => {
                expect(internship.companyName).toBe('Student Company');
            });
        });

        it('should sort by start date', async () => {
            const response = await request(app)
                .get('/api/internships?sortBy=startDate')
                .set('Authorization', `Bearer ${testData.tokens.teacher}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            
            // Check if sorted by start date (newest first)
            const dates = response.body.data.map(i => new Date(i.startDate));
            for (let i = 1; i < dates.length; i++) {
                expect(dates[i-1]).toBeGreaterThanOrEqual(dates[i]);
            }
        });
    });

    describe('GET /api/internships/:id', () => {
        let testInternship;

        beforeEach(async () => {
            testInternship = await Internship.create({
                companyName: 'Test Company Details',
                position: 'Software Engineer Intern',
                startDate: new Date('2023-06-01'),
                endDate: new Date('2023-08-31'),
                description: 'Detailed internship description',
                uploadedBy: testData.users.student._id,
                department: testData.department._id,
                status: 'approved',
                stipend: 20000
            });
        });

        it('should return internship details for owner', async () => {
            const response = await request(app)
                .get(`/api/internships/${testInternship._id}`)
                .set('Authorization', `Bearer ${testData.tokens.student}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data._id).toBe(testInternship._id.toString());
            expect(response.body.data.companyName).toBe(testInternship.companyName);
        });

        it('should return internship details for teacher', async () => {
            const response = await request(app)
                .get(`/api/internships/${testInternship._id}`)
                .set('Authorization', `Bearer ${testData.tokens.teacher}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data._id).toBe(testInternship._id.toString());
        });

        it('should return 404 for non-existent internship', async () => {
            const fakeId = '507f1f77bcf86cd799439011';
            const response = await request(app)
                .get(`/api/internships/${fakeId}`)
                .set('Authorization', `Bearer ${testData.tokens.student}`);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });
    });

    describe('PUT /api/internships/:id', () => {
        let testInternship;

        beforeEach(async () => {
            testInternship = await Internship.create({
                companyName: 'Updatable Company',
                position: 'Original Position',
                startDate: new Date('2023-06-01'),
                uploadedBy: testData.users.student._id,
                department: testData.department._id,
                status: 'pending'
            });
        });

        it('should allow owner to update internship', async () => {
            const updateData = {
                position: 'Updated Position',
                description: 'Updated description',
                stipend: 25000
            };

            const response = await request(app)
                .put(`/api/internships/${testInternship._id}`)
                .set('Authorization', `Bearer ${testData.tokens.student}`)
                .send(updateData);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.position).toBe(updateData.position);
            expect(response.body.data.description).toBe(updateData.description);
            expect(response.body.data.stipend).toBe(updateData.stipend);
        });

        it('should prevent non-owner from updating', async () => {
            const updateData = {
                position: 'Unauthorized Update'
            };

            const response = await request(app)
                .put(`/api/internships/${testInternship._id}`)
                .set('Authorization', `Bearer ${testData.tokens.teacher}`)
                .send(updateData);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });

        it('should prevent updating approved internships', async () => {
            await Internship.findByIdAndUpdate(testInternship._id, { status: 'approved' });

            const updateData = {
                position: 'Should Not Update'
            };

            const response = await request(app)
                .put(`/api/internships/${testInternship._id}`)
                .set('Authorization', `Bearer ${testData.tokens.student}`)
                .send(updateData);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe('DELETE /api/internships/:id', () => {
        let testInternship;

        beforeEach(async () => {
            testInternship = await Internship.create({
                companyName: 'Deletable Company',
                position: 'Test Position',
                startDate: new Date(),
                uploadedBy: testData.users.student._id,
                department: testData.department._id,
                status: 'pending'
            });
        });

        it('should allow owner to delete internship', async () => {
            const response = await request(app)
                .delete(`/api/internships/${testInternship._id}`)
                .set('Authorization', `Bearer ${testData.tokens.student}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            // Verify internship is deleted
            const deletedInternship = await Internship.findById(testInternship._id);
            expect(deletedInternship).toBeNull();
        });

        it('should prevent non-owner from deleting', async () => {
            const response = await request(app)
                .delete(`/api/internships/${testInternship._id}`)
                .set('Authorization', `Bearer ${testData.tokens.teacher}`);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });

        it('should prevent deleting approved internships', async () => {
            await Internship.findByIdAndUpdate(testInternship._id, { status: 'approved' });

            const response = await request(app)
                .delete(`/api/internships/${testInternship._id}`)
                .set('Authorization', `Bearer ${testData.tokens.student}`);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe('PUT /api/internships/:id/approve', () => {
        let testInternship;

        beforeEach(async () => {
            testInternship = await Internship.create({
                companyName: 'Approvable Company',
                position: 'Test Position',
                startDate: new Date(),
                uploadedBy: testData.users.student._id,
                department: testData.department._id,
                status: 'pending',
                stipend: 15000
            });
        });

        it('should allow teacher to approve internship', async () => {
            const response = await request(app)
                .put(`/api/internships/${testInternship._id}/approve`)
                .set('Authorization', `Bearer ${testData.tokens.teacher}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe('approved');
            expect(response.body.data.approvedBy).toBeDefined();
            expect(response.body.data.approvalDate).toBeDefined();
        });

        it('should allow HOD to approve internship', async () => {
            const response = await request(app)
                .put(`/api/internships/${testInternship._id}/approve`)
                .set('Authorization', `Bearer ${testData.tokens.hod}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe('approved');
        });

        it('should prevent student from approving', async () => {
            const response = await request(app)
                .put(`/api/internships/${testInternship._id}/approve`)
                .set('Authorization', `Bearer ${testData.tokens.student}`);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });

        it('should prevent approving already processed internships', async () => {
            await Internship.findByIdAndUpdate(testInternship._id, { status: 'approved' });

            const response = await request(app)
                .put(`/api/internships/${testInternship._id}/approve`)
                .set('Authorization', `Bearer ${testData.tokens.teacher}`);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe('PUT /api/internships/:id/reject', () => {
        let testInternship;

        beforeEach(async () => {
            testInternship = await Internship.create({
                companyName: 'Rejectable Company',
                position: 'Test Position',
                startDate: new Date(),
                uploadedBy: testData.users.student._id,
                department: testData.department._id,
                status: 'pending'
            });
        });

        it('should allow teacher to reject internship with reason', async () => {
            const rejectionData = {
                rejectionReason: 'Company is not on approved list'
            };

            const response = await request(app)
                .put(`/api/internships/${testInternship._id}/reject`)
                .set('Authorization', `Bearer ${testData.tokens.teacher}`)
                .send(rejectionData);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe('rejected');
            expect(response.body.data.rejectionReason).toBe(rejectionData.rejectionReason);
        });

        it('should allow HOD to reject internship', async () => {
            const response = await request(app)
                .put(`/api/internships/${testInternship._id}/reject`)
                .set('Authorization', `Bearer ${testData.tokens.hod}`)
                .send({ rejectionReason: 'Duration is too short' });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe('rejected');
        });

        it('should prevent student from rejecting', async () => {
            const response = await request(app)
                .put(`/api/internships/${testInternship._id}/reject`)
                .set('Authorization', `Bearer ${testData.tokens.student}`)
                .send({ rejectionReason: 'Cannot reject own internship' });

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });

        it('should prevent rejecting already processed internships', async () => {
            await Internship.findByIdAndUpdate(testInternship._id, { status: 'rejected' });

            const response = await request(app)
                .put(`/api/internships/${testInternship._id}/reject`)
                .set('Authorization', `Bearer ${testData.tokens.teacher}`)
                .send({ rejectionReason: 'Already processed' });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });
});