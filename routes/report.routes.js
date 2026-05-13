const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
    getTeacherReport,
    getDepartmentTeachersReport,
    downloadTeacherReport,
    getDepartmentReport,
    getStudentReport,
    getDepartmentBudgets
} = require('../controllers/report.controller');

router.use(protect);

// HOD-scoped teacher reports
router.get('/teachers/:teacherId',            getTeacherReport);
router.get('/teachers/:teacherId/download',   downloadTeacherReport);
router.get('/department/teachers',            getDepartmentTeachersReport);

// Consolidated department report (HOD/Admin)
router.get('/department/:deptId',             authorize('hod', 'admin'), getDepartmentReport);

// Student rollup (student themselves + their teacher/HOD/admin)
router.get('/student/:studentId',             getStudentReport);

// Budgets aggregation (HOD/Admin)
router.get('/budgets/department/:deptId',     authorize('hod', 'admin'), getDepartmentBudgets);

module.exports = router;
