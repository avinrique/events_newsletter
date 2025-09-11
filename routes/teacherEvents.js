const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect, authorize } = require('../middleware/auth');

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads/teacher-events/';
        // Ensure directory exists
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
            console.log('Created upload directory:', uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileName = 'teacher-event-' + uniqueSuffix + path.extname(file.originalname);
        console.log('📷 Saving file:', fileName, 'Original:', file.originalname);
        cb(null, fileName);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        console.log('📷 Multer - File being processed:', file.originalname, file.mimetype, 'Field:', file.fieldname);
        
        // Check MIME type
        if (file.mimetype.startsWith('image/')) {
            return cb(null, true);
        }
        
        // Check file extension as fallback
        const allowedTypes = /\.(jpeg|jpg|png|gif|webp)$/i;
        const hasValidExt = allowedTypes.test(file.originalname);
        
        if (hasValidExt) {
            return cb(null, true);
        }
        
        console.log('File rejected:', file.originalname, file.mimetype);
        cb(new Error('Only image files (JPG, PNG, GIF, WEBP) are allowed'));
    }
});
const {
    getAllTeacherEvents,
    getTeacherEvent,
    createTeacherEvent,
    updateTeacherEvent,
    deleteTeacherEvent,
    deleteEventImage,
    getDepartmentUsers
} = require('../controllers/teacherEvent.controller');

// Apply authentication to all routes
router.use(protect);
router.use(authorize('teacher', 'hod', 'admin'));

// Routes
router.route('/')
    .get(getAllTeacherEvents)
    .post((req, res, next) => {
        console.log('📷 Route - Before multer, body:', Object.keys(req.body));
        next();
    }, upload.fields([
        { name: 'images', maxCount: 10 },
        { name: 'documentImages', maxCount: 20 }
    ]), (req, res, next) => {
        console.log('📷 Route - After multer, files:', req.files);
        next();
    }, createTeacherEvent);

router.route('/users')
    .get(getDepartmentUsers);

router.route('/:id')
    .get(getTeacherEvent)
    .put((req, res, next) => {
        console.log('📷 PUT Route - Before multer, body:', Object.keys(req.body));
        next();
    }, upload.fields([
        { name: 'images', maxCount: 10 },
        { name: 'documentImages', maxCount: 20 }
    ]), (req, res, next) => {
        console.log('📷 PUT Route - After multer, files:', req.files);
        next();
    }, updateTeacherEvent)
    .delete(deleteTeacherEvent);

router.route('/:eventId/images/:imageId')
    .delete(deleteEventImage);

module.exports = router;