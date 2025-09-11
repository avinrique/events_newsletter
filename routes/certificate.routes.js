const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { body } = require('express-validator');
const { validateRequest } = require('../middleware/validation');
const { protect } = require('../middleware/auth');
const certificateController = require('../controllers/certificate.controller');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/certificates/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'certificate-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only JPG, JPEG, PNG and PDF files are allowed'));
        }
    }
});

router.get('/', protect, certificateController.getCertificates);

router.post('/', protect, upload.single('certificateFile'), [
    body('title').notEmpty().withMessage('Certificate title is required'),
    body('issuer').notEmpty().withMessage('Issuer is required'),
    body('issueDate').isISO8601().withMessage('Valid issue date is required'),
    body('expiryDate').optional().isISO8601().withMessage('Valid expiry date is required if provided'),
    validateRequest
], certificateController.uploadCertificate);

router.get('/:id', protect, certificateController.getCertificate);

router.put('/:id', protect, upload.single('certificateFile'), [
    body('title').optional().notEmpty().withMessage('Certificate title cannot be empty'),
    body('issuer').optional().notEmpty().withMessage('Issuer cannot be empty'),
    body('issueDate').optional().isISO8601().withMessage('Valid issue date is required'),
    body('expiryDate').optional().isISO8601().withMessage('Valid expiry date is required if provided'),
    validateRequest
], certificateController.updateCertificate);

router.delete('/:id', protect, certificateController.deleteCertificate);

// Approval routes
router.put('/:id/approve', protect, certificateController.approveCertificate);
router.put('/:id/reject', protect, certificateController.rejectCertificate);

module.exports = router;