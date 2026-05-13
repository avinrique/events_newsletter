const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
    createNewsletter,
    getNewsletters,
    getNewsletter,
    updateNewsletter,
    publishNewsletter,
    deleteNewsletter,
    getPublishedNewsletter
} = require('../controllers/newsletter.controller');

// Public endpoint MUST be declared before protect()
router.get('/published/:deptId/:year/:month', getPublishedNewsletter);

router.use(protect);

router.post('/',          authorize('hod', 'admin'), createNewsletter);
router.get('/',           authorize('hod', 'admin'), getNewsletters);
router.get('/:id',        authorize('hod', 'admin'), getNewsletter);
router.put('/:id',        authorize('hod', 'admin'), updateNewsletter);
router.delete('/:id',     authorize('hod', 'admin'), deleteNewsletter);
router.put('/:id/publish', authorize('hod', 'admin'), publishNewsletter);

module.exports = router;
