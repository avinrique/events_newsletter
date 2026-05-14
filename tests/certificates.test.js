const request = require('supertest');
const app = require('../server');
const Certificate = require('../models/Certificate');
const { setupTestAuth, cleanupTestData } = require('./helpers/auth');
const path = require('path');

describe('Certificate Management Endpoints', () => {
    let testData;

    beforeEach(async () => {
        await cleanupTestData();
        testData = await setupTestAuth(app);
    });

    describe('POST /api/certificates', () => {
        it('should allow student to upload certificate', async () => {
            const certificateData = {
                title: 'NPTEL Python Course',
                issuer: 'NPTEL',
                issueDate: '2023-06-15',
                expiryDate: '2025-06-15'
            };

            const response = await request(app)
                .post('/api/certificates')
                .set('Authorization', `Bearer ${testData.tokens.student}`)
                .field('title', certificateData.title)
                .field('issuer', certificateData.issuer)
                .field('issueDate', certificateData.issueDate)
                .field('expiryDate', certificateData.expiryDate);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.title).toBe(certificateData.title);
            expect(response.body.data.issuer).toBe(certificateData.issuer);
            expect(response.body.data.status).toBe('pending'); // Student uploads need approval
        });

        it('should auto-approve teacher certificates', async () => {
            const certificateData = {
                title: 'Faculty Development Program',
                issuer: 'IIT Delhi',
                issueDate: '2023-07-20'
            };

            const response = await request(app)
                .post('/api/certificates')
                .set('Authorization', `Bearer ${testData.tokens.teacher}`)
                .field('title', certificateData.title)
                .field('issuer', certificateData.issuer)
                .field('issueDate', certificateData.issueDate);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe('approved'); // Teacher uploads auto-approved
        });

        it('should validate required fields', async () => {
            const response = await request(app)
                .post('/api/certificates')
                .set('Authorization', `Bearer ${testData.tokens.student}`)
                .field('title', 'Incomplete Certificate');
                // issuer and issueDate missing

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.errors).toBeDefined();
        });

        it('should validate date formats', async () => {
            const response = await request(app)
                .post('/api/certificates')
                .set('Authorization', `Bearer ${testData.tokens.student}`)
                .field('title', 'Test Certificate')
                .field('issuer', 'Test Issuer')
                .field('issueDate', 'invalid-date');

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should validate expiry date is after issue date', async () => {
            const response = await request(app)
                .post('/api/certificates')
                .set('Authorization', `Bearer ${testData.tokens.student}`)
                .field('title', 'Test Certificate')
                .field('issuer', 'Test Issuer')
                .field('issueDate', '2023-06-15')
                .field('expiryDate', '2023-06-10'); // Before issue date

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/certificates', () => {
        beforeEach(async () => {
            // Create test certificates
            await Certificate.create({
                title: 'Student Certificate',
                issuer: 'Coursera',
                issueDate: new Date('2023-05-01'),
                completionDate: new Date('2023-05-01'),
                owner: testData.users.student._id,
                ownerType: 'student',
                uploadedBy: testData.users.student._id,
                department: testData.department._id,
                status: 'approved'
            });

            await Certificate.create({
                title: 'Teacher Certificate',
                issuer: 'IEEE',
                issueDate: new Date('2023-06-01'),
                completionDate: new Date('2023-06-01'),
                owner: testData.users.teacher._id,
                ownerType: 'teacher',
                uploadedBy: testData.users.teacher._id,
                department: testData.department._id,
                status: 'approved'
            });
        });

        it('should return user certificates for student', async () => {
            const response = await request(app)
                .get('/api/certificates')
                .set('Authorization', `Bearer ${testData.tokens.student}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.length).toBeGreaterThan(0);
            
            // Should only include certificates uploaded by student
            response.body.data.forEach(cert => {
                expect(cert.uploadedBy._id).toBe(testData.users.student._id.toString());
            });
        });

        it('should return department certificates for teacher', async () => {
            const response = await request(app)
                .get('/api/certificates')
                .set('Authorization', `Bearer ${testData.tokens.teacher}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.length).toBeGreaterThan(0);
            
            // Should include certificates from department
            const certTitles = response.body.data.map(c => c.title);
            expect(certTitles).toContain('Student Certificate');
            expect(certTitles).toContain('Teacher Certificate');
        });

        it('should filter by status', async () => {
            // Create pending certificate
            await Certificate.create({
                title: 'Pending Certificate',
                issuer: 'Test Issuer',
                issueDate: new Date(),
                completionDate: new Date(),
                owner: testData.users.student._id,
                ownerType: 'student',
                uploadedBy: testData.users.student._id,
                department: testData.department._id,
                status: 'pending'
            });

            const response = await request(app)
                .get('/api/certificates?status=pending')
                .set('Authorization', `Bearer ${testData.tokens.teacher}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            
            response.body.data.forEach(cert => {
                expect(cert.status).toBe('pending');
            });
        });

        it('should filter by issuer', async () => {
            const response = await request(app)
                .get('/api/certificates?issuer=Coursera')
                .set('Authorization', `Bearer ${testData.tokens.teacher}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            
            response.body.data.forEach(cert => {
                expect(cert.issuer).toBe('Coursera');
            });
        });
    });

    describe('GET /api/certificates/:id', () => {
        let testCertificate;

        beforeEach(async () => {
            testCertificate = await Certificate.create({
                title: 'Test Certificate Details',
                issuer: 'Test University',
                issueDate: new Date('2023-05-15'),
                completionDate: new Date('2023-05-15'),
                description: 'Detailed certificate description',
                owner: testData.users.student._id,
                ownerType: 'student',
                uploadedBy: testData.users.student._id,
                department: testData.department._id,
                status: 'approved'
            });
        });

        it('should return certificate details for owner', async () => {
            const response = await request(app)
                .get(`/api/certificates/${testCertificate._id}`)
                .set('Authorization', `Bearer ${testData.tokens.student}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data._id).toBe(testCertificate._id.toString());
            expect(response.body.data.title).toBe(testCertificate.title);
        });

        it('should return certificate details for teacher', async () => {
            const response = await request(app)
                .get(`/api/certificates/${testCertificate._id}`)
                .set('Authorization', `Bearer ${testData.tokens.teacher}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data._id).toBe(testCertificate._id.toString());
        });

        it('should return 404 for non-existent certificate', async () => {
            const fakeId = '507f1f77bcf86cd799439011';
            const response = await request(app)
                .get(`/api/certificates/${fakeId}`)
                .set('Authorization', `Bearer ${testData.tokens.student}`);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });
    });

    describe('PUT /api/certificates/:id', () => {
        let testCertificate;

        beforeEach(async () => {
            testCertificate = await Certificate.create({
                title: 'Updatable Certificate',
                issuer: 'Original Issuer',
                issueDate: new Date('2023-05-01'),
                uploadedBy: testData.users.student._id,
                department: testData.department._id,
                status: 'pending'
            });
        });

        it('should allow owner to update certificate', async () => {
            const updateData = {
                title: 'Updated Certificate Title',
                issuer: 'Updated Issuer',
                description: 'Updated description'
            };

            const response = await request(app)
                .put(`/api/certificates/${testCertificate._id}`)
                .set('Authorization', `Bearer ${testData.tokens.student}`)
                .field('title', updateData.title)
                .field('issuer', updateData.issuer)
                .field('description', updateData.description);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.title).toBe(updateData.title);
            expect(response.body.data.issuer).toBe(updateData.issuer);
        });

        it('should prevent non-owner from updating', async () => {
            const response = await request(app)
                .put(`/api/certificates/${testCertificate._id}`)
                .set('Authorization', `Bearer ${testData.tokens.teacher}`)
                .field('title', 'Unauthorized Update');

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });

        it('should prevent updating approved certificates', async () => {
            await Certificate.findByIdAndUpdate(testCertificate._id, { status: 'approved' });

            const response = await request(app)
                .put(`/api/certificates/${testCertificate._id}`)
                .set('Authorization', `Bearer ${testData.tokens.student}`)
                .field('title', 'Should Not Update');

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe('DELETE /api/certificates/:id', () => {
        let testCertificate;

        beforeEach(async () => {
            testCertificate = await Certificate.create({
                title: 'Deletable Certificate',
                issuer: 'Test Issuer',
                issueDate: new Date(),
                uploadedBy: testData.users.student._id,
                department: testData.department._id,
                status: 'pending'
            });
        });

        it('should allow owner to delete certificate', async () => {
            const response = await request(app)
                .delete(`/api/certificates/${testCertificate._id}`)
                .set('Authorization', `Bearer ${testData.tokens.student}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            // Verify certificate is deleted
            const deletedCert = await Certificate.findById(testCertificate._id);
            expect(deletedCert).toBeNull();
        });

        it('should prevent non-owner from deleting', async () => {
            const response = await request(app)
                .delete(`/api/certificates/${testCertificate._id}`)
                .set('Authorization', `Bearer ${testData.tokens.teacher}`);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });

        it('should prevent deleting approved certificates', async () => {
            await Certificate.findByIdAndUpdate(testCertificate._id, { status: 'approved' });

            const response = await request(app)
                .delete(`/api/certificates/${testCertificate._id}`)
                .set('Authorization', `Bearer ${testData.tokens.student}`);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe('PUT /api/certificates/:id/approve', () => {
        let testCertificate;

        beforeEach(async () => {
            testCertificate = await Certificate.create({
                title: 'Approvable Certificate',
                issuer: 'Test Issuer',
                issueDate: new Date(),
                uploadedBy: testData.users.student._id,
                department: testData.department._id,
                status: 'pending'
            });
        });

        it('should allow teacher to approve certificate', async () => {
            const response = await request(app)
                .put(`/api/certificates/${testCertificate._id}/approve`)
                .set('Authorization', `Bearer ${testData.tokens.teacher}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe('approved');
            expect(response.body.data.approvedBy).toBeDefined();
            expect(response.body.data.approvalDate).toBeDefined();
        });

        it('should allow HOD to approve certificate', async () => {
            const response = await request(app)
                .put(`/api/certificates/${testCertificate._id}/approve`)
                .set('Authorization', `Bearer ${testData.tokens.hod}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe('approved');
        });

        it('should prevent student from approving', async () => {
            const response = await request(app)
                .put(`/api/certificates/${testCertificate._id}/approve`)
                .set('Authorization', `Bearer ${testData.tokens.student}`);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });

        it('should prevent approving already processed certificates', async () => {
            await Certificate.findByIdAndUpdate(testCertificate._id, { status: 'approved' });

            const response = await request(app)
                .put(`/api/certificates/${testCertificate._id}/approve`)
                .set('Authorization', `Bearer ${testData.tokens.teacher}`);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe('PUT /api/certificates/:id/reject', () => {
        let testCertificate;

        beforeEach(async () => {
            testCertificate = await Certificate.create({
                title: 'Rejectable Certificate',
                issuer: 'Test Issuer',
                issueDate: new Date(),
                uploadedBy: testData.users.student._id,
                department: testData.department._id,
                status: 'pending'
            });
        });

        it('should allow teacher to reject certificate with reason', async () => {
            const rejectionData = {
                rejectionReason: 'Certificate is not from a recognized institution'
            };

            const response = await request(app)
                .put(`/api/certificates/${testCertificate._id}/reject`)
                .set('Authorization', `Bearer ${testData.tokens.teacher}`)
                .send(rejectionData);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe('rejected');
            expect(response.body.data.rejectionReason).toBe(rejectionData.rejectionReason);
        });

        it('should allow HOD to reject certificate', async () => {
            const response = await request(app)
                .put(`/api/certificates/${testCertificate._id}/reject`)
                .set('Authorization', `Bearer ${testData.tokens.hod}`)
                .send({ rejectionReason: 'Does not align with curriculum' });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe('rejected');
        });

        it('should prevent student from rejecting', async () => {
            const response = await request(app)
                .put(`/api/certificates/${testCertificate._id}/reject`)
                .set('Authorization', `Bearer ${testData.tokens.student}`)
                .send({ rejectionReason: 'Cannot reject own certificate' });

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });

        it('should prevent rejecting already processed certificates', async () => {
            await Certificate.findByIdAndUpdate(testCertificate._id, { status: 'rejected' });

            const response = await request(app)
                .put(`/api/certificates/${testCertificate._id}/reject`)
                .set('Authorization', `Bearer ${testData.tokens.teacher}`)
                .send({ rejectionReason: 'Already processed' });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });
});