const express = require('express');
const router = express.Router();
const TeacherEvent = require('../models/TeacherEvent');
const Department = require('../models/Department');

// Public route to serve newsletter page
router.get('/', (req, res) => {
    res.sendFile('newsletter.html', { root: './views' });
});

// Public API to get departments for newsletter
router.get('/api/departments/public', async (req, res) => {
    try {
        const departments = await Department.find({}, 'name').sort({ name: 1 });
        
        res.json({
            success: true,
            data: departments
        });
        
    } catch (error) {
        console.error('Error fetching departments for newsletter:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching departments'
        });
    }
});

// Public API to get teacher events for newsletter
router.get('/api/teacher-events/public/:departmentId/:month/:year', async (req, res) => {
    try {
        const { departmentId, month, year } = req.params;
        
        // Validate parameters
        const monthNum = parseInt(month);
        const yearNum = parseInt(year);
        
        if (monthNum < 0 || monthNum > 11 || yearNum < 2020 || yearNum > 2030) {
            return res.status(400).json({
                success: false,
                message: 'Invalid month or year'
            });
        }
        
        // Get department info
        const department = await Department.findById(departmentId);
        if (!department) {
            return res.status(404).json({
                success: false,
                message: 'Department not found'
            });
        }
        
        // Calculate date range for the selected month
        const startDate = new Date(yearNum, monthNum, 1);
        const endDate = new Date(yearNum, monthNum + 1, 0, 23, 59, 59);
        
        // Fetch teacher events for the department and date range
        const events = await TeacherEvent.find({
            department: departmentId,
            eventDate: {
                $gte: startDate,
                $lte: endDate
            },
            status: 'published'
        })
        .populate('createdBy', 'name email designation')
        .populate('studentsInvolved', 'name email usn rollNumber')
        .populate('teachersInvolved', 'name email')
        .populate('department', 'name')
        .sort({ eventDate: -1 });

        res.json({
            success: true,
            data: events,
            departmentName: department.name,
            period: {
                month: monthNum,
                year: yearNum,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString()
            }
        });
        
    } catch (error) {
        console.error('Error fetching newsletter data:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching newsletter data'
        });
    }
});

module.exports = router;