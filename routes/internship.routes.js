const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { body } = require('express-validator');
const { validateRequest } = require('../middleware/validation');
const { protect } = require('../middleware/auth');
const internshipController = require('../controllers/internship.controller');

// Configure multer for internship documents
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/internships/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fieldPrefix = file.fieldname === 'offerLetter' ? 'offer' : 'joining';
        cb(null, `${fieldPrefix}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype) || file.mimetype === 'application/msword' || 
                         file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only JPG, PNG, PDF, DOC, and DOCX files are allowed'));
        }
    }
});

router.get('/', protect, internshipController.getInternships);

router.post('/', protect, upload.fields([
    { name: 'offerLetter', maxCount: 1 },
    { name: 'joiningLetter', maxCount: 1 }
]), [
    body('companyName').notEmpty().withMessage('Company name is required'),
    body('position').notEmpty().withMessage('Position is required'),
    body('startDate').isISO8601().withMessage('Valid start date is required'),
    body('endDate').optional().isISO8601().withMessage('Valid end date is required if provided'),
    validateRequest
], internshipController.addInternship);

router.get('/:id', protect, internshipController.getInternship);

router.put('/:id', protect, internshipController.updateInternship);

router.delete('/:id', protect, internshipController.deleteInternship);

// Approval routes
router.put('/:id/approve', protect, internshipController.approveInternship);
router.put('/:id/reject', protect, internshipController.rejectInternship);

module.exports = router;