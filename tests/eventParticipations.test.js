const request = require('supertest');
const app = require('../server');
const EventParticipation = require('../models/EventParticipation');
const { setupTestAuth, cleanupTestData } = require('./helpers/auth');

describe('Event Participation Endpoints', () => {
    let testData;

    beforeEach(async () => {
        await cleanupTestData();
        testData = await setupTestAuth(app);
    });

    describe('POST /api/event-participations', () => {
        it('should allow student to create individual event participation', async () => {
            const eventData = {
                eventName: 'TechFest 2023',
                eventType: 'hackathon',
                startDate: '2023-06-15',
                durationDays: 3,
                organizer: {
                    name: 'Tech University',
                    type: 'university',
                    website: 'https://techuniv.edu'
                },
                participationType: 'individual',
                description: 'National level hackathon',
                location: {
                    type: 'offline',
                    venue: 'Tech University Campus',
                    city: 'Bangalore'
                },
                outcome: {
                    achievement: 'finalist',
                    certificateReceived: true
                }
            };

            const response = await request(app)
                .post('/api/event-participations')
                .set('Authorization', `Bearer ${testData.tokens.student}`)
                .send(eventData);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.eventName).toBe(eventData.eventName);
            expect(response.body.data.eventType).toBe(eventData.eventType);
            expect(response.body.data.participationType).toBe(eventData.participationType);
            expect(response.body.data.participant).toBe(testData.users.student._id.toString());
        });

        it('should allow student to create team event participation', async () => {
            const eventData = {
                eventName: 'Smart India Hackathon',
                eventType: 'hackathon',
                startDate: '2023-07-20',
                durationDays: 2,
                organizer: {
                    name: 'Government of India'
                },
                participationType: 'team',
                teamDetails: {
                    teamName: 'Code Warriors',
                    teamSize: 6,
                    teamMembers: ['John Doe', 'Jane Smith', 'Mike Johnson'],
                    teamRole: 'Team Lead'
                },
                outcome: {
                    achievement: 'winner',
                    prize: 'Best Innovation Award',
                    certificateReceived: true
                }
            };

            const response = await request(app)
                .post('/api/event-participations')
                .set('Authorization', `Bearer ${testData.tokens.student}`)
                .send(eventData);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.participationType).toBe('team');
            expect(response.body.data.teamDetails.teamName).toBe(eventData.teamDetails.teamName);
            expect(response.body.data.teamDetails.teamSize).toBe(eventData.teamDetails.teamSize);
        });

        it('should validate required fields', async () => {
            const response = await request(app)
                .post('/api/event-participations')
                .set('Authorization', `Bearer ${testData.tokens.student}`)
                .send({
                    eventName: 'Incomplete Event'
                    // Missing required fields
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.errors).toBeDefined();
        });

        it('should validate event name length', async () => {
            const eventData = {
                eventName: 'x', // Too short
                eventType: 'hackathon',
                startDate: '2023-06-15',
                durationDays: 3,
                organizer: { name: 'Test Org' },
                participationType: 'individual'
            };

            const response = await request(app)
                .post('/api/event-participations')
                .set('Authorization', `Bearer ${testData.tokens.student}`)
                .send(eventData);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should validate event type', async () => {
            const eventData = {
                eventName: 'Test Event',
                eventType: 'invalid-type',
                startDate: '2023-06-15',
                durationDays: 3,
                organizer: { name: 'Test Org' },
                participationType: 'individual'
            };

            const response = await request(app)
                .post('/api/event-participations')
                .set('Authorization', `Bearer ${testData.tokens.student}`)
                .send(eventData);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should validate duration range', async () => {
            const eventData = {
                eventName: 'Test Event',
                eventType: 'hackathon',
                startDate: '2023-06-15',
                durationDays: 400, // Too long
                organizer: { name: 'Test Org' },
                participationType: 'individual'
            };

            const response = await request(app)
                .post('/api/event-participations')
                .set('Authorization', `Bearer ${testData.tokens.student}`)
                .send(eventData);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should require team details for team participation', async () => {
            const eventData = {
                eventName: 'Team Event',
                eventType: 'hackathon',
                startDate: '2023-06-15',
                durationDays: 3,
                organizer: { name: 'Test Org' },
                participationType: 'team'
                // teamDetails missing
            };

            const response = await request(app)
                .post('/api/event-participations')
                .set('Authorization', `Bearer ${testData.tokens.student}`)
                .send(eventData);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should validate team size range', async () => {
            const eventData = {
                eventName: 'Team Event',
                eventType: 'hackathon',
                startDate: '2023-06-15',
                durationDays: 3,
                organizer: { name: 'Test Org' },
                participationType: 'team',
                teamDetails: {
                    teamName: 'Test Team',
                    teamSize: 25 // Too large
                }
            };

            const response = await request(app)
                .post('/api/event-participations')
                .set('Authorization', `Bearer ${testData.tokens.student}`)
                .send(eventData);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should prevent non-students from creating participations', async () => {
            const eventData = {
                eventName: 'Teacher Event',
                eventType: 'conference',
                startDate: '2023-06-15',
                durationDays: 2,
                organizer: { name: 'Test Org' },
                participationType: 'individual'
            };

            const response = await request(app)
                .post('/api/event-participations')
                .set('Authorization', `Bearer ${testData.tokens.teacher}`)
                .send(eventData);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/event-participations', () => {
        beforeEach(async () => {
            // Create test event participations
            await EventParticipation.create({
                eventName: 'Student Hackathon',
                eventType: 'hackathon',
                startDate: new Date('2023-06-01'),
                durationDays: 3,
                organizer: { name: 'Tech Corp' },
                participationType: 'individual',
                participant: testData.users.student._id,
                department: testData.department._id,
                outcome: { achievement: 'winner' }
            });

            await EventParticipation.create({
                eventName: 'Team Competition',
                eventType: 'coding-competition',
                startDate: new Date('2023-07-01'),
                durationDays: 1,
                organizer: { name: 'Code Club' },
                participationType: 'team',
                teamDetails: {
                    teamName: 'Code Masters',
                    teamSize: 4
                },
                participant: testData.users.student._id,
                department: testData.department._id
            });
        });

        it('should return user event participations for student', async () => {
            const response = await request(app)
                .get('/api/event-participations')
                .set('Authorization', `Bearer ${testData.tokens.student}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.length).toBe(2);
            
            const eventNames = response.body.data.map(e => e.eventName);
            expect(eventNames).toContain('Student Hackathon');
            expect(eventNames).toContain('Team Competition');
        });

        it('should return department participations for teacher', async () => {
            const response = await request(app)
                .get('/api/event-participations')
                .set('Authorization', `Bearer ${testData.tokens.teacher}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.length).toBeGreaterThan(0);
        });

        it('should filter by event type', async () => {
            const response = await request(app)
                .get('/api/event-participations?eventType=hackathon')
                .set('Authorization', `Bearer ${testData.tokens.student}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            
            response.body.data.forEach(event => {
                expect(event.eventType).toBe('hackathon');
            });
        });

        it('should filter by participation type', async () => {
            const response = await request(app)
                .get('/api/event-participations?participationType=team')
                .set('Authorization', `Bearer ${testData.tokens.student}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            
            response.body.data.forEach(event => {
                expect(event.participationType).toBe('team');
            });
        });

        it('should filter by achievement', async () => {
            const response = await request(app)
                .get('/api/event-participations?achievement=winner')
                .set('Authorization', `Bearer ${testData.tokens.teacher}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            
            response.body.data.forEach(event => {
                expect(event.outcome.achievement).toBe('winner');
            });
        });

        it('should sort by start date (newest first)', async () => {
            const response = await request(app)
                .get('/api/event-participations')
                .set('Authorization', `Bearer ${testData.tokens.student}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            
            const dates = response.body.data.map(e => new Date(e.startDate));
            for (let i = 1; i < dates.length; i++) {
                expect(dates[i-1]).toBeGreaterThanOrEqual(dates[i]);
            }
        });
    });

    describe('GET /api/event-participations/stats/:studentId?', () => {
        beforeEach(async () => {
            // Create various event participations for statistics
            await EventParticipation.create({
                eventName: 'Hackathon Win',
                eventType: 'hackathon',
                startDate: new Date('2023-06-01'),
                durationDays: 3,
                organizer: { name: 'Tech Corp' },
                participationType: 'individual',
                participant: testData.users.student._id,
                department: testData.department._id,
                outcome: { achievement: 'winner', certificateReceived: true }
            });

            await EventParticipation.create({
                eventName: 'Coding Competition',
                eventType: 'coding-competition',
                startDate: new Date('2023-07-01'),
                durationDays: 1,
                organizer: { name: 'Code Club' },
                participationType: 'individual',
                participant: testData.users.student._id,
                department: testData.department._id,
                outcome: { achievement: 'participant', certificateReceived: true }
            });

            await EventParticipation.create({
                eventName: 'Team Event',
                eventType: 'innovation-contest',
                startDate: new Date('2023-08-01'),
                durationDays: 2,
                organizer: { name: 'Innovation Hub' },
                participationType: 'team',
                teamDetails: { teamName: 'Innovators', teamSize: 5 },
                participant: testData.users.student._id,
                department: testData.department._id,
                outcome: { achievement: 'finalist', certificateReceived: false }
            });
        });

        it('should return participation statistics for current user', async () => {
            const response = await request(app)
                .get('/api/event-participations/stats')
                .set('Authorization', `Bearer ${testData.tokens.student}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.totalParticipations).toBe(3);
            expect(response.body.data.totalCertificates).toBe(2);
            expect(response.body.data.achievements.winner).toBe(1);
            expect(response.body.data.achievements.finalist).toBe(1);
            expect(response.body.data.achievements.participant).toBe(1);
            expect(response.body.data.eventTypes.hackathon).toBe(1);
            expect(response.body.data.eventTypes['coding-competition']).toBe(1);
            expect(response.body.data.eventTypes['innovation-contest']).toBe(1);
        });

        it('should return statistics for specific student (teacher access)', async () => {
            const response = await request(app)
                .get(`/api/event-participations/stats/${testData.users.student._id}`)
                .set('Authorization', `Bearer ${testData.tokens.teacher}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.totalParticipations).toBe(3);
        });

        it('should return statistics for specific student (HOD access)', async () => {
            const response = await request(app)
                .get(`/api/event-participations/stats/${testData.users.student._id}`)
                .set('Authorization', `Bearer ${testData.tokens.hod}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.totalParticipations).toBe(3);
        });

        it('should include recent events in statistics', async () => {
            const response = await request(app)
                .get('/api/event-participations/stats')
                .set('Authorization', `Bearer ${testData.tokens.student}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.recentEvents).toBeDefined();
            expect(response.body.data.recentEvents.length).toBeGreaterThan(0);
        });
    });

    describe('GET /api/event-participations/:id', () => {
        let testParticipation;

        beforeEach(async () => {
            testParticipation = await EventParticipation.create({
                eventName: 'Detailed Event',
                eventType: 'hackathon',
                startDate: new Date('2023-06-15'),
                endDate: new Date('2023-06-17'),
                durationDays: 3,
                organizer: {
                    name: 'Tech University',
                    type: 'university',
                    website: 'https://techuniv.edu'
                },
                participationType: 'individual',
                description: 'Detailed event description',
                location: {
                    type: 'offline',
                    venue: 'Tech Campus',
                    city: 'Bangalore'
                },
                outcome: {
                    achievement: 'winner',
                    prize: 'First Prize',
                    certificateReceived: true
                },
                participant: testData.users.student._id,
                department: testData.department._id
            });
        });

        it('should return participation details for owner', async () => {
            const response = await request(app)
                .get(`/api/event-participations/${testParticipation._id}`)
                .set('Authorization', `Bearer ${testData.tokens.student}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data._id).toBe(testParticipation._id.toString());
            expect(response.body.data.eventName).toBe(testParticipation.eventName);
            expect(response.body.data.organizer.website).toBe(testParticipation.organizer.website);
        });

        it('should return participation details for teacher', async () => {
            const response = await request(app)
                .get(`/api/event-participations/${testParticipation._id}`)
                .set('Authorization', `Bearer ${testData.tokens.teacher}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data._id).toBe(testParticipation._id.toString());
        });

        it('should return 404 for non-existent participation', async () => {
            const fakeId = '507f1f77bcf86cd799439011';
            const response = await request(app)
                .get(`/api/event-participations/${fakeId}`)
                .set('Authorization', `Bearer ${testData.tokens.student}`);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });
    });

    describe('PUT /api/event-participations/:id', () => {
        let testParticipation;

        beforeEach(async () => {
            testParticipation = await EventParticipation.create({
                eventName: 'Updatable Event',
                eventType: 'hackathon',
                startDate: new Date('2023-06-15'),
                durationDays: 3,
                organizer: { name: 'Original Organizer' },
                participationType: 'individual',
                participant: testData.users.student._id,
                department: testData.department._id
            });
        });

        it('should allow owner to update participation', async () => {
            const updateData = {
                eventName: 'Updated Event Name',
                description: 'Updated description',
                outcome: {
                    achievement: 'winner',
                    prize: 'First Prize',
                    certificateReceived: true
                }
            };

            const response = await request(app)
                .put(`/api/event-participations/${testParticipation._id}`)
                .set('Authorization', `Bearer ${testData.tokens.student}`)
                .send(updateData);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.eventName).toBe(updateData.eventName);
            expect(response.body.data.description).toBe(updateData.description);
            expect(response.body.data.outcome.achievement).toBe(updateData.outcome.achievement);
        });

        it('should prevent non-owner from updating', async () => {
            const updateData = {
                eventName: 'Unauthorized Update'
            };

            const response = await request(app)
                .put(`/api/event-participations/${testParticipation._id}`)
                .set('Authorization', `Bearer ${testData.tokens.teacher}`)
                .send(updateData);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });

        it('should validate updated data', async () => {
            const updateData = {
                durationDays: 400 // Invalid duration
            };

            const response = await request(app)
                .put(`/api/event-participations/${testParticipation._id}`)
                .set('Authorization', `Bearer ${testData.tokens.student}`)
                .send(updateData);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe('DELETE /api/event-participations/:id', () => {
        let testParticipation;

        beforeEach(async () => {
            testParticipation = await EventParticipation.create({
                eventName: 'Deletable Event',
                eventType: 'hackathon',
                startDate: new Date(),
                durationDays: 3,
                organizer: { name: 'Test Organizer' },
                participationType: 'individual',
                participant: testData.users.student._id,
                department: testData.department._id
            });
        });

        it('should allow owner to delete participation', async () => {
            const response = await request(app)
                .delete(`/api/event-participations/${testParticipation._id}`)
                .set('Authorization', `Bearer ${testData.tokens.student}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            // Verify participation is deleted
            const deletedParticipation = await EventParticipation.findById(testParticipation._id);
            expect(deletedParticipation).toBeNull();
        });

        it('should prevent non-owner from deleting', async () => {
            const response = await request(app)
                .delete(`/api/event-participations/${testParticipation._id}`)
                .set('Authorization', `Bearer ${testData.tokens.teacher}`);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });

        it('should return 404 for non-existent participation', async () => {
            const fakeId = '507f1f77bcf86cd799439011';
            const response = await request(app)
                .delete(`/api/event-participations/${fakeId}`)
                .set('Authorization', `Bearer ${testData.tokens.student}`);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });
    });
});