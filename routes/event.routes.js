const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const events = require('../controllers/event.controller');

router.use(protect);

const createValidator = [
    body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
    body('description').trim().notEmpty().withMessage('Description is required').isLength({ max: 2000 }),
    body('eventType').isIn(['club-event', 'personal-teacher-event', 'joint-teacher-event'])
        .withMessage('Invalid event type'),
    body('eventCategory').isIn(['academic', 'cultural', 'technical', 'sports', 'social', 'workshop', 'seminar', 'competition'])
        .withMessage('Invalid event category'),
    body('venue').trim().notEmpty().withMessage('Venue is required'),
    body('eventDate').isISO8601().withMessage('Valid event date is required'),
    body('startTime').trim().notEmpty().withMessage('Start time is required'),
    body('endTime').trim().notEmpty().withMessage('End time is required'),
    body('expectedParticipants').optional().isInt({ min: 1 })
];

router.post('/', authorize('teacher', 'hod'), createValidator, events.createEvent);
router.get('/', events.getEvents);
router.get('/my-participations', authorize('student'), events.getMyParticipations);

router.get('/:id', events.getEvent);
router.put('/:id', events.updateEvent);
router.delete('/:id', events.deleteEvent);

router.put('/:id/approve', authorize('hod'), events.approveEvent);
router.put('/:id/reject',  authorize('hod'), events.rejectEvent);

router.put('/:id/budget', authorize('hod', 'admin'), events.updateBudget);
router.put('/:id/budget/utilize', authorize('teacher', 'hod', 'admin'), events.utilizeBudget);

module.exports = router;
