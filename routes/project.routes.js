const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
const {
    createProject,
    getMyProjects,
    getProject,
    updateProject,
    deleteProject,
    approveProject,
    rejectProject,
    getDepartmentProjects
} = require('../controllers/project.controller');

// Configure multer for project file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/projects/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'project-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 5 // Max 5 files
    },
    fileFilter: function (req, file, cb) {
        // Allow documents, images, videos, and archives
        const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|ppt|pptx|mp4|avi|mov|zip|rar/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only documents, images, videos, and archives are allowed'));
        }
    }
});

router.use(protect);

// @route   POST /api/projects
// @desc    Create a new project (JSON data)
// @access  Private
router.post('/', [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('projectType').isIn(['personal', 'mini', 'major']).withMessage('Invalid project type'),
    body('domain').trim().notEmpty().withMessage('Domain is required'),
    body('description').optional().isLength({ max: 2000 }).withMessage('Description too long')
], createProject);

// @route   POST /api/projects/upload
// @desc    Create a new project with file uploads
// @access  Private
router.post('/upload', upload.fields([
    { name: 'projectFiles', maxCount: 5 },
    { name: 'budgetDocument', maxCount: 1 }
]), createProject);

// @route   GET /api/projects
// @desc    Get all projects for current user (including team projects)
// @access  Private
router.get('/', getMyProjects);

// @route   GET /api/projects/department/all
// @desc    Get all department projects (HOD only)
// @access  Private (HOD only)
router.get('/department/all', getDepartmentProjects);

// @route   GET /api/projects/:id
// @desc    Get single project
// @access  Private
router.get('/:id', getProject);

// @route   PUT /api/projects/:id
// @desc    Update project
// @access  Private
router.put('/:id', updateProject);

// @route   DELETE /api/projects/:id
// @desc    Delete project
// @access  Private
router.delete('/:id', deleteProject);

// @route   PUT /api/projects/:id/approve
// @desc    Approve a project
// @access  Private (Teacher/HOD only)
router.put('/:id/approve', approveProject);

// @route   PUT /api/projects/:id/reject
// @desc    Reject a project
// @access  Private (Teacher/HOD only)
router.put('/:id/reject', rejectProject);

module.exports = router;