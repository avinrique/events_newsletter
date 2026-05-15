const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect, authorize } = require('../middleware/auth');
const {
    createNewsletter,
    getNewsletters,
    getNewsletter,
    updateNewsletter,
    publishNewsletter,
    deleteNewsletter,
    getPublishedNewsletter,
    uploadCover,
    draftPreview,
    listPublishedForDept,
    subscribe,
    unsubscribe,
    sendToSubscribers
} = require('../controllers/newsletter.controller');

// Cover-image multer config (5 MB cap, images only).
const coverStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, path.join(__dirname, '..', 'uploads', 'newsletters')),
    filename: (_req, file, cb) => {
        const safe = file.originalname.replace(/[^a-z0-9.\-_]+/gi, '_');
        cb(null, `cover-${Date.now()}-${safe}`);
    }
});
const coverUpload = multer({
    storage: coverStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (!/^image\//.test(file.mimetype)) return cb(new Error('Only image files allowed for cover'));
        cb(null, true);
    }
});

// Public endpoints — MUST be declared before protect()
router.get('/published/:deptId/:year/:month', getPublishedNewsletter);
router.get('/published', listPublishedForDept);
router.post('/subscribe', subscribe);
router.get('/unsubscribe', unsubscribe);

router.use(protect);

router.post('/',          authorize('hod', 'admin'), createNewsletter);
router.get('/',           authorize('hod', 'admin'), getNewsletters);
router.get('/draft-preview/:deptId/:year/:month', authorize('hod', 'admin'), draftPreview);
router.get('/:id',        authorize('hod', 'admin'), getNewsletter);
router.put('/:id',        authorize('hod', 'admin'), updateNewsletter);
router.delete('/:id',     authorize('hod', 'admin'), deleteNewsletter);
router.put('/:id/publish', authorize('hod', 'admin'), publishNewsletter);
router.post('/:id/cover', authorize('hod', 'admin'), coverUpload.single('coverImage'), uploadCover);
router.post('/:id/send',  authorize('hod', 'admin'), sendToSubscribers);

module.exports = router;
