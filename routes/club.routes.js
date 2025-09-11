const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const {
    createClub,
    getClubs,
    getClub,
    approveClub,
    joinClub,
    updateMemberRole
} = require('../controllers/club.controller');

router.use(protect);

// @route   POST /api/clubs
// @desc    Create a new club (Teacher only)
// @access  Private
router.post('/', [
    authorize('teacher', 'hod'),
    body('name').trim().notEmpty().withMessage('Club name is required'),
    body('purpose').trim().notEmpty().withMessage('Club purpose is required'),
    body('description').optional().isLength({ max: 1000 }).withMessage('Description too long')
], createClub);

// @route   GET /api/clubs
// @desc    Get all clubs (filtered by department and role)
// @access  Private
router.get('/', getClubs);

// @route   GET /api/clubs/:id
// @desc    Get single club details
// @access  Private
router.get('/:id', getClub);

// @route   PUT /api/clubs/:id/approve
// @desc    Approve or reject club (HOD only)
// @access  Private
router.put('/:id/approve', [
    authorize('hod'),
    body('action').isIn(['approve', 'reject']).withMessage('Invalid action'),
    body('rejectionReason').optional().trim()
], approveClub);

// @route   POST /api/clubs/:id/join
// @desc    Join club (Student only)
// @access  Private
router.post('/:id/join', authorize('student'), joinClub);

// @route   PUT /api/clubs/:id/members/:memberId/role
// @desc    Update member role (Mentor/HOD only)
// @access  Private
router.put('/:id/members/:memberId/role', [
    body('role').isIn(['President', 'Vice President', 'Secretary', 'Treasurer', 'Executive Member', 'Member'])
        .withMessage('Invalid role')
], updateMemberRole);

module.exports = router;