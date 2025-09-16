const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
    getTeacherReport,
    getDepartmentTeachersReport,
    downloadTeacherReport
} = require('../controllers/report.controller');

router.use(protect);

// HOD access to teacher reports
router.get('/teachers/:teacherId', getTeacherReport);
router.get('/teachers/:teacherId/download', downloadTeacherReport);
router.get('/department/teachers', getDepartmentTeachersReport);

// Legacy routes (to be implemented)
router.get('/department/:deptId', authorize('hod', 'admin'), (req, res) => {
    res.json({ message: 'Get department report - To be implemented' });
});

router.get('/student/:studentId', (req, res) => {
    res.json({ message: 'Get student report - To be implemented' });
});

module.exports = router;