const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validateRequest } = require('../middleware/validation');
const { protect, authorize } = require('../middleware/auth');
const departmentController = require('../controllers/department.controller');
const designationController = require('../controllers/designation.controller');

// All routes require authentication
router.use(protect);

// Department routes
router.post('/', authorize('superadmin'), [
    body('name').notEmpty().withMessage('Department name is required'),
    body('code').notEmpty().withMessage('Department code is required'),
    body('description').notEmpty().withMessage('Description is required'),
    validateRequest
], departmentController.createDepartment);

router.get('/', departmentController.getDepartments);
router.get('/:id', departmentController.getDepartment);
router.put('/:id', authorize('superadmin'), departmentController.updateDepartment);
router.delete('/:id', authorize('superadmin'), departmentController.deleteDepartment);
router.put('/:id/reactivate', authorize('superadmin'), departmentController.reactivateDepartment);

// Designation routes
router.post('/designations/create', authorize('superadmin'), [
    body('name').notEmpty().withMessage('Designation name is required'),
    body('level').isNumeric().withMessage('Level must be a number'),
    validateRequest
], designationController.createDesignation);

router.get('/designations/all', designationController.getDesignations);
router.get('/designations/:id', designationController.getDesignation);
router.put('/designations/:id', authorize('superadmin'), designationController.updateDesignation);
router.delete('/designations/:id', authorize('superadmin'), designationController.deleteDesignation);

module.exports = router;