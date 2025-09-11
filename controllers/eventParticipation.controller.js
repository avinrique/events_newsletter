const EventParticipation = require('../models/EventParticipation');
const { validationResult } = require('express-validator');

// @desc    Get all event participations for current student
// @route   GET /api/event-participations
// @access  Private (Student, Teacher, HOD)
exports.getEventParticipations = async (req, res) => {
    try {
        let query = {};
        
        // If student, only show their own participations
        if (req.user.role === 'student') {
            query.student = req.user.id;
        } else {
            // Teachers/HODs can see participations from their department
            if (req.query.student) {
                query.student = req.query.student;
            }
            if (req.user.department) {
                query.department = req.user.department;
            }
        }

        const participations = await EventParticipation.find(query)
            .populate('student', 'name email usn rollNumber semester')
            .populate('department', 'name code')
            .sort({ startDate: -1 });

        res.status(200).json({
            success: true,
            count: participations.length,
            data: participations
        });
    } catch (error) {
        console.error('Error fetching event participations:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching event participations',
            error: error.message
        });
    }
};

// @desc    Get single event participation
// @route   GET /api/event-participations/:id
// @access  Private (Student - own only, Teacher/HOD - department)
exports.getEventParticipation = async (req, res) => {
    try {
        const participation = await EventParticipation.findById(req.params.id)
            .populate('student', 'name email usn rollNumber semester')
            .populate('department', 'name code');

        if (!participation) {
            return res.status(404).json({
                success: false,
                message: 'Event participation not found'
            });
        }

        // Check authorization
        if (req.user.role === 'student' && participation.student._id.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to access this event participation'
            });
        }

        if ((req.user.role === 'teacher' || req.user.role === 'hod') && 
            participation.department._id.toString() !== req.user.department.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to access this event participation'
            });
        }

        res.status(200).json({
            success: true,
            data: participation
        });
    } catch (error) {
        console.error('Error fetching event participation:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching event participation',
            error: error.message
        });
    }
};

// @desc    Create new event participation
// @route   POST /api/event-participations
// @access  Private (Student)
exports.createEventParticipation = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        // Add student and department info
        req.body.student = req.user.id;
        req.body.department = req.user.department;

        const participation = await EventParticipation.create(req.body);

        await participation.populate('student', 'name email usn rollNumber semester');
        await participation.populate('department', 'name code');

        res.status(201).json({
            success: true,
            message: 'Event participation added successfully',
            data: participation
        });
    } catch (error) {
        console.error('Error creating event participation:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating event participation',
            error: error.message
        });
    }
};

// @desc    Update event participation
// @route   PUT /api/event-participations/:id
// @access  Private (Student - own only)
exports.updateEventParticipation = async (req, res) => {
    try {
        const participation = await EventParticipation.findById(req.params.id);

        if (!participation) {
            return res.status(404).json({
                success: false,
                message: 'Event participation not found'
            });
        }

        // Check authorization
        if (req.user.role === 'student' && participation.student.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this event participation'
            });
        }

        // Don't allow changing student or department
        delete req.body.student;
        delete req.body.department;

        const updatedParticipation = await EventParticipation.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        ).populate('student', 'name email usn rollNumber semester')
         .populate('department', 'name code');

        res.status(200).json({
            success: true,
            message: 'Event participation updated successfully',
            data: updatedParticipation
        });
    } catch (error) {
        console.error('Error updating event participation:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating event participation',
            error: error.message
        });
    }
};

// @desc    Delete event participation
// @route   DELETE /api/event-participations/:id
// @access  Private (Student - own only)
exports.deleteEventParticipation = async (req, res) => {
    try {
        const participation = await EventParticipation.findById(req.params.id);

        if (!participation) {
            return res.status(404).json({
                success: false,
                message: 'Event participation not found'
            });
        }

        // Check authorization
        if (req.user.role === 'student' && participation.student.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this event participation'
            });
        }

        await EventParticipation.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Event participation deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting event participation:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting event participation',
            error: error.message
        });
    }
};

// @desc    Get event participation statistics for student
// @route   GET /api/event-participations/stats/:studentId?
// @access  Private (Student - own only, Teacher/HOD - department students)
exports.getEventParticipationStats = async (req, res) => {
    try {
        let studentId = req.params.studentId || req.user.id;
        
        // Check authorization
        if (req.user.role === 'student' && studentId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to access these statistics'
            });
        }

        const stats = await EventParticipation.aggregate([
            { $match: { student: mongoose.Types.ObjectId(studentId) } },
            {
                $group: {
                    _id: null,
                    totalEvents: { $sum: 1 },
                    hackathons: {
                        $sum: {
                            $cond: [{ $eq: ['$eventType', 'hackathon'] }, 1, 0]
                        }
                    },
                    competitions: {
                        $sum: {
                            $cond: [
                                { $in: ['$eventType', ['coding-competition', 'technical-competition', 'innovation-contest']] },
                                1, 0
                            ]
                        }
                    },
                    conferences: {
                        $sum: {
                            $cond: [
                                { $in: ['$eventType', ['conference', 'seminar', 'workshop', 'webinar']] },
                                1, 0
                            ]
                        }
                    },
                    awards: {
                        $sum: {
                            $cond: [
                                { $in: ['$outcome.achievement', ['winner', 'first-place', 'second-place', 'third-place', 'runner-up']] },
                                1, 0
                            ]
                        }
                    },
                    certificates: { $sum: { $size: { $ifNull: ['$certificates', []] } } },
                    totalDuration: { $sum: '$durationDays' },
                    avgRating: { $avg: '$feedback.overallRating' }
                }
            }
        ]);

        const result = stats.length > 0 ? stats[0] : {
            totalEvents: 0,
            hackathons: 0,
            competitions: 0,
            conferences: 0,
            awards: 0,
            certificates: 0,
            totalDuration: 0,
            avgRating: 0
        };

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error fetching event participation statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching statistics',
            error: error.message
        });
    }
};