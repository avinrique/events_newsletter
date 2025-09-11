const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

// @desc    Get all teachers from college for mentor selection
// @route   GET /api/students/all-teachers
// @access  Private (Students only)
router.get('/all-teachers', protect, authorize('student'), async (req, res) => {
    try {
        // Get all active teachers from the college (any department)
        const teachers = await User.find({
            role: 'teacher',
            isActive: true
        })
        .select('name email designation')
        .populate('designation', 'title')
        .populate('department', 'name code')
        .sort({ name: 1 });

        res.status(200).json({
            success: true,
            count: teachers.length,
            data: teachers
        });
    } catch (error) {
        console.error('Error fetching teachers:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching teachers',
            error: error.message
        });
    }
});

// @desc    Get all students from college for team member selection
// @route   GET /api/students/all-students
// @access  Private (Students only)
router.get('/all-students', protect, authorize('student'), async (req, res) => {
    try {
        // Get all active students from the college (excluding current student)
        const students = await User.find({
            role: 'student',
            isActive: true,
            _id: { $ne: req.user.id } // Exclude current student
        })
        .select('name email usn rollNumber semester')
        .populate('department', 'name code')
        .sort({ name: 1 });

        res.status(200).json({
            success: true,
            count: students.length,
            data: students
        });
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching students',
            error: error.message
        });
    }
});

module.exports = router;