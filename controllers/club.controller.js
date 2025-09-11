const Club = require('../models/Club');
const User = require('../models/User');
const { validationResult } = require('express-validator');

// @desc    Create club
// @route   POST /api/clubs
// @access  Private (Teacher only)
exports.createClub = async (req, res) => {
    try {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation errors',
                errors: errors.array()
            });
        }

        const {
            name,
            purpose,
            description,
            establishedDate,
            socialMedia
        } = req.body;

        // Check if club name already exists
        const existingClub = await Club.findOne({ name });
        if (existingClub) {
            return res.status(400).json({
                success: false,
                message: 'A club with this name already exists'
            });
        }

        // Create the club data
        const clubData = {
            name: name.trim(),
            purpose: purpose.trim(),
            description: description?.trim() || '',
            department: req.user.department,
            mentors: [{
                teacher: req.user.id,
                isPrimaryMentor: true,
                assignedDate: new Date()
            }],
            establishedDate: establishedDate ? new Date(establishedDate) : new Date(),
            status: 'pending', // Requires HOD approval
            socialMedia: socialMedia || {},
            createdBy: req.user.id
        };

        const club = await Club.create(clubData);

        // Populate the club with user and department details
        await club.populate([
            { path: 'createdBy', select: 'name email' },
            { path: 'department', select: 'name code' },
            { path: 'mentors.teacher', select: 'name email designation' }
        ]);

        res.status(201).json({
            success: true,
            message: 'Club created successfully and sent for HOD approval',
            data: club
        });

    } catch (error) {
        console.error('Error creating club:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating club',
            error: error.message
        });
    }
};

// @desc    Get clubs (filtered by department and user role)
// @route   GET /api/clubs
// @access  Private
exports.getClubs = async (req, res) => {
    try {
        let query = { department: req.user.department };
        
        // For students and teachers, only show approved clubs
        if (req.user.role === 'student' || req.user.role === 'teacher') {
            query.status = 'approved';
        }
        // HODs can see all clubs in their department (pending, approved, rejected)

        const clubs = await Club.find(query)
            .populate([
                { path: 'createdBy', select: 'name email' },
                { path: 'department', select: 'name code' },
                { path: 'mentors.teacher', select: 'name email designation' },
                { path: 'approvedBy', select: 'name email designation' },
                { path: 'members.student', select: 'name email usn rollNumber' }
            ])
            .sort({ createdAt: -1 });

        // Transform data for frontend
        const transformedClubs = clubs.map(club => {
            const primaryMentor = club.mentors.find(m => m.isPrimaryMentor);
            const isCreator = club.createdBy._id.toString() === req.user.id;
            const isMentor = club.mentors.some(m => m.teacher._id.toString() === req.user.id);
            const isMember = club.members.some(m => m.student._id.toString() === req.user.id);

            return {
                _id: club._id,
                name: club.name,
                purpose: club.purpose,
                description: club.description,
                establishedDate: club.establishedDate,
                status: club.status,
                memberCount: club.members.filter(m => m.isActive).length,
                primaryMentor: primaryMentor?.teacher,
                allMentors: club.mentors.map(m => m.teacher),
                socialMedia: club.socialMedia,
                isCreator,
                isMentor,
                isMember,
                canManage: isCreator || isMentor || req.user.role === 'hod',
                createdAt: club.createdAt,
                updatedAt: club.updatedAt,
                // Include approval details for HOD
                ...(req.user.role === 'hod' && {
                    approvedBy: club.approvedBy,
                    approvalDate: club.approvalDate,
                    rejectionReason: club.rejectionReason
                })
            };
        });

        res.status(200).json({
            success: true,
            count: transformedClubs.length,
            data: transformedClubs
        });

    } catch (error) {
        console.error('Error fetching clubs:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching clubs',
            error: error.message
        });
    }
};

// @desc    Get single club details
// @route   GET /api/clubs/:id
// @access  Private
exports.getClub = async (req, res) => {
    try {
        const club = await Club.findById(req.params.id)
            .populate([
                { path: 'createdBy', select: 'name email' },
                { path: 'department', select: 'name code' },
                { path: 'mentors.teacher', select: 'name email designation' },
                { path: 'approvedBy', select: 'name email designation' },
                { path: 'members.student', select: 'name email usn rollNumber' }
            ]);

        if (!club) {
            return res.status(404).json({
                success: false,
                message: 'Club not found'
            });
        }

        // Check if user has access to view this club
        const hasAccess = club.department._id.toString() === req.user.department.toString();
        
        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Students can only view approved clubs
        if (req.user.role === 'student' && club.status !== 'approved') {
            return res.status(403).json({
                success: false,
                message: 'Club not available'
            });
        }

        res.status(200).json({
            success: true,
            data: club
        });

    } catch (error) {
        console.error('Error fetching club:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching club',
            error: error.message
        });
    }
};

// @desc    Approve/Reject club (HOD only)
// @route   PUT /api/clubs/:id/approve
// @access  Private (HOD only)
exports.approveClub = async (req, res) => {
    try {
        const { action, rejectionReason } = req.body;
        
        if (!['approve', 'reject'].includes(action)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid action. Use "approve" or "reject"'
            });
        }

        const club = await Club.findById(req.params.id);

        if (!club) {
            return res.status(404).json({
                success: false,
                message: 'Club not found'
            });
        }

        // Check if club belongs to HOD's department
        if (club.department.toString() !== req.user.department.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You can only approve clubs in your department'
            });
        }

        if (club.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Club has already been processed'
            });
        }

        // Update club status
        if (action === 'approve') {
            club.status = 'approved';
            club.approvedBy = req.user.id;
            club.approvalDate = new Date();
            club.rejectionReason = undefined;
        } else {
            club.status = 'rejected';
            club.rejectionReason = rejectionReason || 'No reason provided';
            club.approvedBy = undefined;
            club.approvalDate = undefined;
        }

        await club.save();

        // Populate for response
        await club.populate([
            { path: 'createdBy', select: 'name email' },
            { path: 'department', select: 'name code' },
            { path: 'mentors.teacher', select: 'name email designation' },
            { path: 'approvedBy', select: 'name email designation' }
        ]);

        res.status(200).json({
            success: true,
            message: `Club ${action}d successfully`,
            data: club
        });

    } catch (error) {
        console.error('Error processing club approval:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing club approval',
            error: error.message
        });
    }
};

// @desc    Join club (Student only)
// @route   POST /api/clubs/:id/join
// @access  Private (Student only)
exports.joinClub = async (req, res) => {
    try {
        const club = await Club.findById(req.params.id);

        if (!club) {
            return res.status(404).json({
                success: false,
                message: 'Club not found'
            });
        }

        if (club.status !== 'approved') {
            return res.status(400).json({
                success: false,
                message: 'Cannot join club that is not approved'
            });
        }

        // Check if club belongs to student's department
        if (club.department.toString() !== req.user.department.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You can only join clubs in your department'
            });
        }

        // Check if student is already a member
        const existingMember = club.members.find(
            member => member.student.toString() === req.user.id && member.isActive
        );

        if (existingMember) {
            return res.status(400).json({
                success: false,
                message: 'You are already a member of this club'
            });
        }

        // Add student as member
        club.members.push({
            student: req.user.id,
            role: 'Member',
            joinDate: new Date(),
            isActive: true
        });

        await club.save();

        // Populate for response
        await club.populate([
            { path: 'members.student', select: 'name email usn rollNumber' }
        ]);

        res.status(200).json({
            success: true,
            message: 'Successfully joined the club',
            data: club
        });

    } catch (error) {
        console.error('Error joining club:', error);
        res.status(500).json({
            success: false,
            message: 'Error joining club',
            error: error.message
        });
    }
};

// @desc    Update club member role (Mentor/HOD only)
// @route   PUT /api/clubs/:id/members/:memberId/role
// @access  Private (Mentor/HOD only)
exports.updateMemberRole = async (req, res) => {
    try {
        const { role } = req.body;
        const { id: clubId, memberId } = req.params;

        const validRoles = ['President', 'Vice President', 'Secretary', 'Treasurer', 'Executive Member', 'Member'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid role specified'
            });
        }

        const club = await Club.findById(clubId);

        if (!club) {
            return res.status(404).json({
                success: false,
                message: 'Club not found'
            });
        }

        // Check authorization
        const isMentor = club.mentors.some(m => m.teacher.toString() === req.user.id);
        const isHOD = req.user.role === 'hod' && club.department.toString() === req.user.department.toString();

        if (!isMentor && !isHOD) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to update member roles in this club'
            });
        }

        // Find and update member
        const member = club.members.find(m => m.student.toString() === memberId);

        if (!member) {
            return res.status(404).json({
                success: false,
                message: 'Member not found in this club'
            });
        }

        member.role = role;
        member.assignedBy = req.user.id;
        member.assignedDate = new Date();

        await club.save();

        res.status(200).json({
            success: true,
            message: 'Member role updated successfully',
            data: member
        });

    } catch (error) {
        console.error('Error updating member role:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating member role',
            error: error.message
        });
    }
};