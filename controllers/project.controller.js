const Project = require('../models/Project');
const User = require('../models/User');
const { validationResult } = require('express-validator');

// @desc    Create project
// @route   POST /api/projects
// @access  Private
exports.createProject = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation errors',
                errors: errors.array()
            });
        }

        const {
            title,
            projectType,
            domain,
            description,
            technologies,
            startDate,
            endDate,
            status,
            githubUrl,
            liveUrl,
            driveLink,
            youtubeLink,
            documentationUrl,
            teacherMentor,
            teamMembers = [],
            requestBudget,
            budgetAmount,
            budgetCategory,
            budgetJustification
        } = req.body;

        // Determine project category and status based on type
        let projectCategory = 'student-project';
        let projectStatus = 'pending-approval';

        // Personal projects without mentor AND without budget request are auto-approved
        const hasBudgetRequest = requestBudget === 'on' || requestBudget === true;
        if (projectType === 'personal' && !teacherMentor && !hasBudgetRequest) {
            projectStatus = 'approved';
        }
        // All other projects (mini, major, or personal with mentor/budget) need approval

        // Create the project data
        const projectData = {
            title,
            projectCategory,
            studentProjectType: projectType,
            domain,
            abstract: description || title, // Use title as default if no description
            technicalDetails: {
                technologies: technologies ? technologies.split(',').map(t => t.trim()) : [],
                githubUrl: githubUrl || null,
                liveUrl: liveUrl || null,
                driveLink: driveLink || null,
                youtubeLink: youtubeLink || null,
                documentationUrl: documentationUrl || null
            },
            startDate: startDate || new Date(),
            expectedEndDate: endDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
            status: projectStatus,
            department: req.user.department,
            createdBy: req.user.id,
            uploadedBy: req.user.id
        };

        // Add mentor if specified
        if (teacherMentor) {
            projectData.primaryMentor = teacherMentor;
        }

        // Add team members if specified
        const teamMembersArray = [];
        
        // Add creator as team leader
        teamMembersArray.push({
            user: req.user.id,
            role: 'leader'
        });

        // Add other team members
        if (teamMembers && Array.isArray(teamMembers)) {
            for (const memberId of teamMembers) {
                if (memberId !== req.user.id) { // Avoid duplicating the creator
                    teamMembersArray.push({
                        user: memberId,
                        role: 'member'
                    });
                }
            }
        }

        projectData.teamMembers = teamMembersArray;

        // Add approval workflow if mentor is assigned
        if (teacherMentor) {
            projectData.approvals = [{
                approver: teacherMentor,
                approverRole: 'mentor',
                status: 'pending',
                comments: 'Pending mentor approval'
            }];
        }

        // Handle budget request
        if (requestBudget === 'on' || requestBudget === true) {
            const budgetFiles = req.files?.budgetDocument;
            const budgetFile = budgetFiles && budgetFiles[0]; // Get first file if exists
            
            projectData.budget = {
                totalRequested: parseFloat(budgetAmount) || 0,
                totalApproved: 0,
                totalUtilized: 0,
                fundingSource: 'department',
                categories: [{
                    category: budgetCategory || 'other',
                    description: budgetJustification || 'Project funding request',
                    requested: parseFloat(budgetAmount) || 0,
                    approved: 0,
                    utilized: 0
                }]
            };
            
            // If budget document is uploaded, add it to outcomes
            if (budgetFile) {
                projectData.outcomes = projectData.outcomes || [];
                projectData.outcomes.push({
                    type: 'other',
                    title: 'Budget Justification Document',
                    description: 'Budget request justification and breakdown',
                    status: 'completed',
                    evidenceFiles: [{
                        fileName: budgetFile.originalname,
                        fileUrl: `/uploads/projects/${budgetFile.filename}`,
                        fileType: budgetFile.mimetype,
                        uploadDate: new Date()
                    }]
                });
            }
        }

        // Handle uploaded project files
        const projectFiles = req.files?.projectFiles;
        if (projectFiles && projectFiles.length > 0) {
            projectData.outcomes = projectData.outcomes || [];
            projectData.outcomes.push({
                type: 'other',
                title: 'Project Files',
                description: 'Uploaded project files and documentation',
                status: 'completed',
                evidenceFiles: projectFiles.map(file => ({
                    fileName: file.originalname,
                    fileUrl: `/uploads/projects/${file.filename}`,
                    fileType: file.mimetype,
                    uploadDate: new Date()
                }))
            });
        }

        const project = await Project.create(projectData);
        
        // Populate the project with user and department details
        await project.populate([
            { path: 'createdBy', select: 'name email' },
            { path: 'primaryMentor', select: 'name email designation' },
            { path: 'department', select: 'name code' },
            { path: 'teamMembers.user', select: 'name email usn rollNumber' }
        ]);

        res.status(201).json({
            success: true,
            message: 'Project created successfully',
            data: project
        });

    } catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating project',
            error: error.message
        });
    }
};

// @desc    Get projects for current user (including team projects)
// @route   GET /api/projects
// @access  Private
exports.getMyProjects = async (req, res) => {
    try {
        let query = {};
        
        // If specific student ID is provided in query, filter by that student
        if (req.query.student) {
            // Verify teacher has permission to view this student's projects
            if (req.user.role === 'teacher') {
                const User = require('../models/User');
                const student = await User.findById(req.query.student);
                if (!student) {
                    return res.status(404).json({
                        success: false,
                        message: 'Student not found'
                    });
                }
                
                // Teachers can view projects from students in ANY department
                // No department restriction for viewing
                
                // Find projects where the specific student is creator or team member
                query = {
                    $or: [
                        { createdBy: req.query.student },
                        { 'teamMembers.user': req.query.student }
                    ]
                };
            } else {
                // Students can only see their own projects
                query = {
                    $or: [
                        { createdBy: req.user.id },
                        { 'teamMembers.user': req.user.id }
                    ]
                };
            }
        } else {
            // Default behavior - user's own projects
            query = {
                $or: [
                    { createdBy: req.user.id },
                    { 'teamMembers.user': req.user.id }
                ]
            };
        }
        
        // Find projects based on the query
        const projects = await Project.find(query)
        .populate([
            { path: 'createdBy', select: 'name email' },
            { path: 'primaryMentor', select: 'name email designation' },
            { path: 'department', select: 'name code' },
            { path: 'teamMembers.user', select: 'name email usn rollNumber' }
        ])
        .sort({ createdAt: -1 });

        // Transform the data for frontend
        const transformedProjects = projects.map(project => {
            const isCreator = project.createdBy._id.toString() === req.user.id;
            const userTeamRole = project.teamMembers.find(member => 
                member.user._id.toString() === req.user.id
            )?.role || 'member';

            // Get approval status from the new field structure
            // Keep legacy approval array logic for backward compatibility

            return {
                _id: project._id,
                title: project.title,
                projectType: project.studentProjectType || 'project',
                domain: project.domain,
                description: project.description,
                technologies: project.technicalDetails?.technologies || [],
                startDate: project.timeline?.startDate,
                expectedEndDate: project.timeline?.expectedEndDate,
                actualEndDate: project.timeline?.actualEndDate,
                status: project.approvalStatus,
                githubUrl: project.outcomes?.find(o => o.githubUrl)?.githubUrl,
                liveUrl: project.outcomes?.find(o => o.demoUrl)?.demoUrl,
                mentor: project.primaryMentor,
                teamMembers: project.teamMembers,
                isCreator,
                userRole: userTeamRole,
                createdBy: project.createdBy,
                createdAt: project.createdAt,
                updatedAt: project.updatedAt,
                // Approval information
                approvalStatus: project.approvalStatus || 'pending-approval',
                // Project files and resources
                outcomes: project.outcomes || [],
                progress: project.progress || { percentage: 0 },
                budget: project.budget || {}
            };
        });

        res.status(200).json({
            success: true,
            count: transformedProjects.length,
            data: transformedProjects
        });

    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching projects',
            error: error.message
        });
    }
};

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Private
exports.getProject = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id)
            .populate([
                { path: 'createdBy', select: 'name email' },
                { path: 'primaryMentor', select: 'name email designation' },
                { path: 'department', select: 'name code' },
                { path: 'teamMembers.user', select: 'name email usn rollNumber' }
            ]);

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        // Check if user has access to this project
        const hasAccess = project.createdBy._id.toString() === req.user.id ||
                         project.teamMembers.some(member => member.user._id.toString() === req.user.id) ||
                         req.user.role === 'teacher' || req.user.role === 'hod' || req.user.role === 'admin';

        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        res.status(200).json({
            success: true,
            data: project
        });

    } catch (error) {
        console.error('Error fetching project:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching project',
            error: error.message
        });
    }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private
exports.updateProject = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        // Check if user has permission to update
        let canUpdate = false;
        
        if (req.user.role === 'student') {
            // Students can update if they are creator or team leader
            canUpdate = project.createdBy.toString() === req.user.id ||
                       (project.teamMembers.some(member => 
                           member.user.toString() === req.user.id && member.role === 'leader'
                       ));
        } else if (req.user.role === 'teacher') {
            // Teachers can update if they are the primary mentor of the project
            canUpdate = project.primaryMentor && project.primaryMentor.toString() === req.user.id;
            
            // OR if they are proctor/class teacher of any team member
            if (!canUpdate && project.teamMembers && project.teamMembers.length > 0) {
                const User = require('../models/User');
                const teamMemberIds = project.teamMembers.map(member => member.user);
                
                // Check if teacher is proctor or class teacher of any team member
                const students = await User.find({
                    _id: { $in: teamMemberIds },
                    $or: [
                        { proctor: req.user.id },
                        { classTeacher: req.user.id }
                    ]
                });
                
                canUpdate = students.length > 0;
            }
        } else if (req.user.role === 'admin' || req.user.role === 'superadmin' || 
                  (req.user.role === 'teacher' && req.user.position === 'HOD')) {
            // Admins, superadmins, and HODs can update any project
            canUpdate = true;
        }

        if (!canUpdate) {
            return res.status(403).json({
                success: false,
                message: 'Access denied - you are not authorized to edit this project'
            });
        }

        // Don't allow updates to approved/completed projects
        if (project.status === 'approved' || project.status === 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Cannot update approved or completed projects'
            });
        }

        const updatedProject = await Project.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).populate([
            { path: 'createdBy', select: 'name email' },
            { path: 'primaryMentor', select: 'name email designation' },
            { path: 'department', select: 'name code' },
            { path: 'teamMembers.user', select: 'name email usn rollNumber' }
        ]);

        res.status(200).json({
            success: true,
            message: 'Project updated successfully',
            data: updatedProject
        });

    } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating project',
            error: error.message
        });
    }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private
exports.deleteProject = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        // Check if user has permission to delete
        const canDelete = project.createdBy.toString() === req.user.id;

        if (!canDelete) {
            return res.status(403).json({
                success: false,
                message: 'Only the project creator can delete the project'
            });
        }

        // Don't allow deletion of approved/completed projects
        if (project.status === 'approved' || project.status === 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete approved or completed projects'
            });
        }

        await Project.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Project deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting project',
            error: error.message
        });
    }
};

// @desc    Approve project
// @route   PUT /api/projects/:id/approve
// @access  Private (Teacher/HOD only)
exports.approveProject = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        
        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }
        
        // Only teachers and HODs can approve projects
        if (req.user.role !== 'teacher' && req.user.role !== 'hod') {
            return res.status(403).json({
                success: false,
                message: 'Only teachers can approve projects'
            });
        }
        
        // Check if teacher is the mentor or is proctor/class teacher of any team member
        const User = require('../models/User');
        let hasPermission = false;
        
        // Check if teacher is the primary mentor
        if (project.primaryMentor && project.primaryMentor.toString() === req.user.id) {
            hasPermission = true;
        }
        
        // Check if teacher is in the team members as mentor
        if (!hasPermission && project.teamMembers && project.teamMembers.length > 0) {
            for (const member of project.teamMembers) {
                if (member.role === 'mentor' && member.user && member.user.toString() === req.user.id) {
                    hasPermission = true;
                    break;
                }
            }
        }
        
        // Check if teacher is proctor or class teacher of any team member
        if (!hasPermission && project.teamMembers && project.teamMembers.length > 0) {
            for (const member of project.teamMembers) {
                if (member.role !== 'mentor' && member.user) {
                    const student = await User.findById(member.user);
                    if (student) {
                        const isProctor = student.proctor && student.proctor.toString() === req.user.id;
                        const isClassTeacher = student.classTeacher && student.classTeacher.toString() === req.user.id;
                        if (isProctor || isClassTeacher) {
                            hasPermission = true;
                            break;
                        }
                    }
                }
            }
        }
        
        // HODs can approve any project in their department
        if (req.user.role === 'teacher' && req.user.position === 'HOD') {
            hasPermission = true;
        }
        
        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                message: 'You can only approve projects for students you are assigned to or mentoring'
            });
        }
        
        project.approvalStatus = 'approved';
        
        // Add approval to approvals array
        project.approvals = project.approvals || [];
        project.approvals.push({
            approver: req.user.id,
            approverRole: req.user.role,
            status: 'approved',
            date: new Date(),
            comments: 'Project approved'
        });
        
        await project.save();
        
        await project.populate('teamMembers.user', 'name email usn');
        await project.populate('primaryMentor', 'name email');
        
        res.status(200).json({
            success: true,
            message: 'Project approved successfully',
            data: project
        });
    } catch (error) {
        console.error('Error approving project:', error);
        res.status(500).json({
            success: false,
            message: 'Error approving project',
            error: error.message
        });
    }
};

// @desc    Reject project
// @route   PUT /api/projects/:id/reject
// @access  Private (Teacher/HOD only)
exports.rejectProject = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        
        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }
        
        // Only teachers and HODs can reject projects
        if (req.user.role !== 'teacher' && req.user.role !== 'hod') {
            return res.status(403).json({
                success: false,
                message: 'Only teachers can reject projects'
            });
        }
        
        // Check if teacher is the mentor or is proctor/class teacher of any team member
        const User = require('../models/User');
        let hasPermission = false;
        
        // Check if teacher is the primary mentor
        if (project.primaryMentor && project.primaryMentor.toString() === req.user.id) {
            hasPermission = true;
        }
        
        // Check if teacher is in the team members as mentor
        if (!hasPermission && project.teamMembers && project.teamMembers.length > 0) {
            for (const member of project.teamMembers) {
                if (member.role === 'mentor' && member.user && member.user.toString() === req.user.id) {
                    hasPermission = true;
                    break;
                }
            }
        }
        
        // Check if teacher is proctor or class teacher of any team member
        if (!hasPermission && project.teamMembers && project.teamMembers.length > 0) {
            for (const member of project.teamMembers) {
                if (member.role !== 'mentor' && member.user) {
                    const student = await User.findById(member.user);
                    if (student) {
                        const isProctor = student.proctor && student.proctor.toString() === req.user.id;
                        const isClassTeacher = student.classTeacher && student.classTeacher.toString() === req.user.id;
                        if (isProctor || isClassTeacher) {
                            hasPermission = true;
                            break;
                        }
                    }
                }
            }
        }
        
        // HODs can reject any project in their department
        if (req.user.role === 'teacher' && req.user.position === 'HOD') {
            hasPermission = true;
        }
        
        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                message: 'You can only reject projects for students you are assigned to or mentoring'
            });
        }
        
        project.approvalStatus = 'rejected';
        
        // Add rejection to approvals array
        project.approvals = project.approvals || [];
        project.approvals.push({
            approver: req.user.id,
            approverRole: req.user.role,
            status: 'rejected',
            date: new Date(),
            comments: req.body.reason || 'No reason provided'
        });
        
        await project.save();
        
        await project.populate('teamMembers.user', 'name email usn');
        await project.populate('primaryMentor', 'name email');
        
        res.status(200).json({
            success: true,
            message: 'Project rejected',
            data: project
        });
    } catch (error) {
        console.error('Error rejecting project:', error);
        res.status(500).json({
            success: false,
            message: 'Error rejecting project',
            error: error.message
        });
    }
};

// @desc    Get all department projects (HOD access)
// @route   GET /api/projects/department/all
// @access  Private (HOD only)
exports.getDepartmentProjects = async (req, res) => {
    try {
        // Check if user is HOD
        if (req.user.role !== 'teacher' || req.user.position !== 'HOD') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only HODs can view department projects.'
            });
        }

        const { studentProjectType, approvalStatus, page = 1, limit = 50 } = req.query;

        let query = { 
            department: req.user.department,
            projectCategory: 'student-project'  // Only student projects for HODs
        };

        // Filter by project type if specified
        if (studentProjectType && ['personal', 'mini', 'major'].includes(studentProjectType)) {
            query.studentProjectType = studentProjectType;
        }

        // Filter by approval status if specified
        if (approvalStatus) {
            query.approvalStatus = approvalStatus;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const projects = await Project.find(query)
            .populate([
                { path: 'createdBy', select: 'name email usn rollNumber' },
                { path: 'primaryMentor', select: 'name email designation' },
                { path: 'department', select: 'name code' },
                { path: 'teamMembers.user', select: 'name email usn rollNumber' }
            ])
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const totalProjects = await Project.countDocuments(query);

        // Group projects by type for easy access
        const projectsByType = {
            personal: projects.filter(p => p.studentProjectType === 'personal'),
            mini: projects.filter(p => p.studentProjectType === 'mini'),
            major: projects.filter(p => p.studentProjectType === 'major')
        };

        res.status(200).json({
            success: true,
            count: projects.length,
            totalProjects,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalProjects / parseInt(limit)),
            data: projects,
            projectsByType
        });
    } catch (error) {
        console.error('Error fetching department projects:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching department projects',
            error: error.message
        });
    }
};