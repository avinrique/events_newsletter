const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const {
    getEventParticipations,
    getEventParticipation,
    createEventParticipation,
    updateEventParticipation,
    deleteEventParticipation,
    getEventParticipationStats
} = require('../controllers/eventParticipation.controller');

const { protect, authorize } = require('../middleware/auth');

// Validation middleware for event participation
const eventParticipationValidation = [
    body('eventName')
        .notEmpty()
        .withMessage('Event name is required')
        .isLength({ min: 2, max: 200 })
        .withMessage('Event name must be between 2 and 200 characters'),
    
    body('eventType')
        .notEmpty()
        .withMessage('Event type is required')
        .isIn([
            'hackathon', 'coding-competition', 'technical-competition',
            'conference', 'workshop', 'seminar', 'webinar',
            'bootcamp', 'certification-program', 'online-course',
            'innovation-contest', 'startup-competition', 'pitch-competition',
            'research-conference', 'symposium', 'summit',
            'networking-event', 'career-fair', 'industry-meetup',
            'open-source-contribution', 'community-event', 'other'
        ])
        .withMessage('Please select a valid event type'),
    
    body('startDate')
        .notEmpty()
        .withMessage('Start date is required')
        .isISO8601()
        .withMessage('Please provide a valid start date'),
    
    body('durationDays')
        .notEmpty()
        .withMessage('Duration in days is required')
        .isInt({ min: 1, max: 365 })
        .withMessage('Duration must be between 1 and 365 days'),
    
    body('organizer.name')
        .notEmpty()
        .withMessage('Organizer name is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('Organizer name must be between 2 and 100 characters'),
    
    body('participationType')
        .notEmpty()
        .withMessage('Participation type is required')
        .isIn(['individual', 'team'])
        .withMessage('Participation type must be either individual or team'),
    
    // Optional validations
    body('endDate')
        .optional()
        .isISO8601()
        .withMessage('Please provide a valid end date'),
    
    body('description')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Description cannot exceed 1000 characters'),
    
    body('location.type')
        .optional()
        .isIn(['online', 'offline', 'hybrid'])
        .withMessage('Location type must be online, offline, or hybrid'),
    
    body('outcome.achievement')
        .optional()
        .isIn([
            'winner', 'first-place', 'second-place', 'third-place',
            'runner-up', 'finalist', 'semi-finalist', 'quarter-finalist',
            'honorable-mention', 'special-recognition', 'best-innovation',
            'best-technical', 'best-presentation', 'peoples-choice',
            'participant', 'completion-certificate', 'attendance-certificate'
        ])
        .withMessage('Please select a valid achievement type'),
    
    body('feedback.overallRating')
        .optional()
        .isInt({ min: 1, max: 5 })
        .withMessage('Overall rating must be between 1 and 5'),
    
    // Team details validation (conditional)
    body('teamDetails.teamName')
        .if(body('participationType').equals('team'))
        .notEmpty()
        .withMessage('Team name is required for team participation')
        .isLength({ min: 2, max: 100 })
        .withMessage('Team name must be between 2 and 100 characters'),
    
    body('teamDetails.teamSize')
        .if(body('participationType').equals('team'))
        .isInt({ min: 2, max: 20 })
        .withMessage('Team size must be between 2 and 20 members')
];

// Apply protection middleware to all routes
router.use(protect);

// Routes accessible by students, teachers, and HODs
router.route('/')
    .get(getEventParticipations)
    .post(authorize('student'), eventParticipationValidation, createEventParticipation);

router.route('/stats/:studentId?')
    .get(getEventParticipationStats);

router.route('/:id')
    .get(getEventParticipation)
    .put(authorize('student'), updateEventParticipation)
    .delete(authorize('student'), deleteEventParticipation);

module.exports = router;