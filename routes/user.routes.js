const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validateRequest } = require('../middleware/validation');
const { protect, authorize, checkDepartment } = require('../middleware/auth');
const userController = require('../controllers/user.controller');

// All routes require authentication
router.use(protect);

// Create user (admin or superadmin)
router.post('/', authorize('superadmin', 'admin'), [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').notEmpty().withMessage('Role is required'),
    validateRequest
], userController.createUser);

// Get all users
router.get('/', authorize('superadmin', 'admin', 'hod', 'teacher'), userController.getUsers);

// Get all teachers from institution (for proctor/class teacher selection)
router.get('/teachers/department', authorize('student'), userController.getDepartmentTeachers);

// Get all students for teachers (includes relationships)
router.get('/students/all', authorize('teacher'), userController.getAllStudentsForTeacher);

// Get all department students (HOD only)
router.get('/department/students', authorize('hod'), userController.getDepartmentStudents);

// Get single user
router.get('/:id', authorize('superadmin', 'admin', 'hod', 'teacher'), userController.getUser);

// Update user (admins can update anyone, teachers can update students they're assigned to)
router.put('/:id', authorize('superadmin', 'admin', 'teacher'), userController.updateUser);

// Toggle user status (activate/deactivate)
router.put('/:id/toggle-status', authorize('superadmin', 'admin'), userController.toggleUserStatus);

// Reset user password
router.put('/:id/reset-password', authorize('superadmin', 'admin'), [
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    validateRequest
], userController.resetUserPassword);

// Delete/Deactivate user
router.delete('/:id', authorize('superadmin', 'admin'), userController.deleteUser);

// Assign HOD
router.post('/assign-hod', authorize('admin'), [
    body('userId').notEmpty().withMessage('User ID is required'),
    body('departmentId').notEmpty().withMessage('Department ID is required'),
    validateRequest
], userController.assignHOD);

module.exports = router;