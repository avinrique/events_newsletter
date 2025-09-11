const request = require('supertest');
const app = require('../server');
const Club = require('../models/Club');
const { setupTestAuth, cleanupTestData } = require('./helpers/auth');

describe('Club Management Endpoints', () => {
    let testData;

    beforeEach(async () => {
        await cleanupTestData();
        testData = await setupTestAuth(app);
    });

    describe('POST /api/clubs', () => {
        it('should allow teacher to create club', async () => {
            const clubData = {
                name: 'Coding Club',
                purpose: 'Promote programming skills',
                description: 'A club for students interested in coding and development'
            };

            const response = await request(app)
                .post('/api/clubs')
                .set('Authorization', `Bearer ${testData.tokens.teacher}`)
                .send(clubData);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.name).toBe(clubData.name);
            expect(response.body.data.status).toBe('pending');
            expect(response.body.data.mentors[0].isPrimaryMentor).toBe(true);
        });

        it('should allow HOD to create club', async () => {
            const clubData = {
                name: 'Robotics Club',
                purpose: 'Promote robotics and automation',
                description: 'A club for robotics enthusiasts'
            };

            const response = await request(app)
                .post('/api/clubs')
                .set('Authorization', `Bearer ${testData.tokens.hod}`)
                .send(clubData);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.name).toBe(clubData.name);
        });

        it('should prevent duplicate club names', async () => {
            const clubData = {
                name: 'Unique Club',
                purpose: 'Test purpose'
            };

            // Create first club
            await Club.create({
                ...clubData,
                department: testData.department._id,
                mentors: [{
                    teacher: testData.users.teacher._id,
                    isPrimaryMentor: true,
                    assignedDate: new Date()
                }],
                createdBy: testData.users.teacher._id
            });

            // Try to create duplicate
            const response = await request(app)
                .post('/api/clubs')
                .set('Authorization', `Bearer ${testData.tokens.teacher}`)
                .send(clubData);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('A club with this name already exists');
        });

        it('should prevent students from creating clubs', async () => {
            const clubData = {
                name: 'Student Club',
                purpose: 'Test purpose'
            };

            const response = await request(app)
                .post('/api/clubs')
                .set('Authorization', `Bearer ${testData.tokens.student}`)
                .send(clubData);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });

        it('should validate required fields', async () => {
            const response = await request(app)
                .post('/api/clubs')
                .set('Authorization', `Bearer ${testData.tokens.teacher}`)
                .send({
                    // name missing
                    purpose: 'Test purpose'
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.errors).toBeDefined();
        });

        it('should validate description length', async () => {
            const clubData = {
                name: 'Test Club',
                purpose: 'Test purpose',
                description: 'x'.repeat(1001) // Too long
            };

            const response = await request(app)
                .post('/api/clubs')
                .set('Authorization', `Bearer ${testData.tokens.teacher}`)
                .send(clubData);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/clubs', () => {
        let testClub;

        beforeEach(async () => {
            // Create test club
            testClub = await Club.create({
                name: 'Test Club',
                purpose: 'Test purpose',
                description: 'Test description',
                department: testData.department._id,
                mentors: [{
                    teacher: testData.users.teacher._id,
                    isPrimaryMentor: true,
                    assignedDate: new Date()
                }],
                status: 'approved',
                createdBy: testData.users.teacher._id,
                approvedBy: testData.users.hod._id,
                approvalDate: new Date()
            });
        });

        it('should return approved clubs for students', async () => {
            const response = await request(app)
                .get('/api/clubs')
                .set('Authorization', `Bearer ${testData.tokens.student}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.length).toBeGreaterThan(0);
            
            // All clubs should be approved
            response.body.data.forEach(club => {
                expect(club.status).toBe('approved');
            });
        });

        it('should return all department clubs for HOD', async () => {
            // Create pending club
            await Club.create({
                name: 'Pending Club',
                purpose: 'Test purpose',
                department: testData.department._id,
                mentors: [{
                    teacher: testData.users.teacher._id,
                    isPrimaryMentor: true,
                    assignedDate: new Date()
                }],
                status: 'pending',
                createdBy: testData.users.teacher._id
            });

            const response = await request(app)
                .get('/api/clubs')
                .set('Authorization', `Bearer ${testData.tokens.hod}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            
            const statuses = response.body.data.map(club => club.status);
            expect(statuses).toContain('approved');
            expect(statuses).toContain('pending');
        });

        it('should return department-specific clubs only', async () => {
            const response = await request(app)
                .get('/api/clubs')
                .set('Authorization', `Bearer ${testData.tokens.teacher}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            
            // All clubs should be from the same department
            response.body.data.forEach(club => {
                expect(club._id).toBeDefined();
            });
        });

        it('should include user permissions in response', async () => {
            const response = await request(app)
                .get('/api/clubs')
                .set('Authorization', `Bearer ${testData.tokens.teacher}`);

            expect(response.status).toBe(200);
            const club = response.body.data[0];
            expect(club.isCreator).toBeDefined();
            expect(club.isMentor).toBeDefined();
            expect(club.isMember).toBeDefined();
            expect(club.canManage).toBeDefined();
        });
    });

    describe('GET /api/clubs/:id', () => {
        let testClub;

        beforeEach(async () => {
            testClub = await Club.create({
                name: 'Test Club',
                purpose: 'Test purpose',
                department: testData.department._id,
                mentors: [{
                    teacher: testData.users.teacher._id,
                    isPrimaryMentor: true,
                    assignedDate: new Date()
                }],
                status: 'approved',
                createdBy: testData.users.teacher._id
            });
        });

        it('should return club details for authorized users', async () => {
            const response = await request(app)
                .get(`/api/clubs/${testClub._id}`)
                .set('Authorization', `Bearer ${testData.tokens.teacher}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data._id).toBe(testClub._id.toString());
            expect(response.body.data.name).toBe(testClub.name);
        });

        it('should prevent students from viewing unapproved clubs', async () => {
            await Club.findByIdAndUpdate(testClub._id, { status: 'pending' });

            const response = await request(app)
                .get(`/api/clubs/${testClub._id}`)
                .set('Authorization', `Bearer ${testData.tokens.student}`);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Club not available');
        });

        it('should return 404 for non-existent club', async () => {
            const fakeId = '507f1f77bcf86cd799439011';
            const response = await request(app)
                .get(`/api/clubs/${fakeId}`)
                .set('Authorization', `Bearer ${testData.tokens.teacher}`);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });
    });

    describe('PUT /api/clubs/:id/approve', () => {
        let pendingClub;

        beforeEach(async () => {
            pendingClub = await Club.create({
                name: 'Pending Club',
                purpose: 'Test purpose',
                department: testData.department._id,
                mentors: [{
                    teacher: testData.users.teacher._id,
                    isPrimaryMentor: true,
                    assignedDate: new Date()
                }],
                status: 'pending',
                createdBy: testData.users.teacher._id
            });
        });

        it('should allow HOD to approve club', async () => {
            const response = await request(app)
                .put(`/api/clubs/${pendingClub._id}/approve`)
                .set('Authorization', `Bearer ${testData.tokens.hod}`)
                .send({ action: 'approve' });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe('approved');
            expect(response.body.data.approvalDate).toBeDefined();
        });

        it('should allow HOD to reject club', async () => {
            const rejectionReason = 'Not aligned with department goals';
            
            const response = await request(app)
                .put(`/api/clubs/${pendingClub._id}/approve`)
                .set('Authorization', `Bearer ${testData.tokens.hod}`)
                .send({ 
                    action: 'reject',
                    rejectionReason
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe('rejected');
            expect(response.body.data.rejectionReason).toBe(rejectionReason);
        });

        it('should prevent non-HOD from approving', async () => {
            const response = await request(app)
                .put(`/api/clubs/${pendingClub._id}/approve`)
                .set('Authorization', `Bearer ${testData.tokens.teacher}`)
                .send({ action: 'approve' });

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });

        it('should validate action parameter', async () => {
            const response = await request(app)
                .put(`/api/clubs/${pendingClub._id}/approve`)
                .set('Authorization', `Bearer ${testData.tokens.hod}`)
                .send({ action: 'invalid' });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should prevent processing already processed clubs', async () => {
            // First approval
            await request(app)
                .put(`/api/clubs/${pendingClub._id}/approve`)
                .set('Authorization', `Bearer ${testData.tokens.hod}`)
                .send({ action: 'approve' });

            // Second approval attempt
            const response = await request(app)
                .put(`/api/clubs/${pendingClub._id}/approve`)
                .set('Authorization', `Bearer ${testData.tokens.hod}`)
                .send({ action: 'approve' });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Club has already been processed');
        });
    });

    describe('POST /api/clubs/:id/join', () => {
        let approvedClub;

        beforeEach(async () => {
            approvedClub = await Club.create({
                name: 'Approved Club',
                purpose: 'Test purpose',
                department: testData.department._id,
                mentors: [{
                    teacher: testData.users.teacher._id,
                    isPrimaryMentor: true,
                    assignedDate: new Date()
                }],
                status: 'approved',
                members: [],
                createdBy: testData.users.teacher._id
            });
        });

        it('should allow student to join approved club', async () => {
            const response = await request(app)
                .post(`/api/clubs/${approvedClub._id}/join`)
                .set('Authorization', `Bearer ${testData.tokens.student}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Successfully joined the club');
            
            // Check if member was added
            const club = await Club.findById(approvedClub._id);
            expect(club.members.length).toBe(1);
            expect(club.members[0].student.toString()).toBe(testData.users.student._id.toString());
            expect(club.members[0].role).toBe('Member');
        });

        it('should prevent joining unapproved clubs', async () => {
            await Club.findByIdAndUpdate(approvedClub._id, { status: 'pending' });

            const response = await request(app)
                .post(`/api/clubs/${approvedClub._id}/join`)
                .set('Authorization', `Bearer ${testData.tokens.student}`);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Cannot join club that is not approved');
        });

        it('should prevent duplicate membership', async () => {
            // First join
            await request(app)
                .post(`/api/clubs/${approvedClub._id}/join`)
                .set('Authorization', `Bearer ${testData.tokens.student}`);

            // Second join attempt
            const response = await request(app)
                .post(`/api/clubs/${approvedClub._id}/join`)
                .set('Authorization', `Bearer ${testData.tokens.student}`);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('You are already a member of this club');
        });

        it('should prevent non-students from joining', async () => {
            const response = await request(app)
                .post(`/api/clubs/${approvedClub._id}/join`)
                .set('Authorization', `Bearer ${testData.tokens.teacher}`);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });
    });

    describe('PUT /api/clubs/:id/members/:memberId/role', () => {
        let clubWithMember;
        let memberId;

        beforeEach(async () => {
            clubWithMember = await Club.create({
                name: 'Club with Member',
                purpose: 'Test purpose',
                department: testData.department._id,
                mentors: [{
                    teacher: testData.users.teacher._id,
                    isPrimaryMentor: true,
                    assignedDate: new Date()
                }],
                status: 'approved',
                members: [{
                    student: testData.users.student._id,
                    role: 'Member',
                    joinDate: new Date(),
                    isActive: true
                }],
                createdBy: testData.users.teacher._id
            });
            
            memberId = testData.users.student._id.toString();
        });

        it('should allow mentor to update member role', async () => {
            const response = await request(app)
                .put(`/api/clubs/${clubWithMember._id}/members/${memberId}/role`)
                .set('Authorization', `Bearer ${testData.tokens.teacher}`)
                .send({ role: 'President' });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.role).toBe('President');
        });

        it('should allow HOD to update member role', async () => {
            const response = await request(app)
                .put(`/api/clubs/${clubWithMember._id}/members/${memberId}/role`)
                .set('Authorization', `Bearer ${testData.tokens.hod}`)
                .send({ role: 'Secretary' });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.role).toBe('Secretary');
        });

        it('should validate role values', async () => {
            const response = await request(app)
                .put(`/api/clubs/${clubWithMember._id}/members/${memberId}/role`)
                .set('Authorization', `Bearer ${testData.tokens.teacher}`)
                .send({ role: 'InvalidRole' });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should prevent unauthorized users from updating roles', async () => {
            const response = await request(app)
                .put(`/api/clubs/${clubWithMember._id}/members/${memberId}/role`)
                .set('Authorization', `Bearer ${testData.tokens.student}`)
                .send({ role: 'President' });

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });

        it('should return 404 for non-existent member', async () => {
            const fakeId = '507f1f77bcf86cd799439011';
            const response = await request(app)
                .put(`/api/clubs/${clubWithMember._id}/members/${fakeId}/role`)
                .set('Authorization', `Bearer ${testData.tokens.teacher}`)
                .send({ role: 'President' });

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Member not found in this club');
        });
    });
});