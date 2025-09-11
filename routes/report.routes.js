const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/department/:deptId', authorize('hod', 'admin'), (req, res) => {
    res.json({ message: 'Get department report - To be implemented' });
});

router.get('/student/:studentId', (req, res) => {
    res.json({ message: 'Get student report - To be implemented' });
});

module.exports = router;