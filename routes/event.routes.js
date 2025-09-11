const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.post('/', authorize('teacher', 'hod'), (req, res) => {
    res.json({ message: 'Create event - To be implemented' });
});

router.get('/', (req, res) => {
    res.json({ message: 'Get events - To be implemented' });
});

router.put('/:id/approve', authorize('hod'), (req, res) => {
    res.json({ message: 'Approve event - To be implemented' });
});

module.exports = router;