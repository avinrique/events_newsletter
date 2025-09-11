const Internship = require('../models/Internship');

exports.getInternships = async (req, res) => {
    try {
        let query = {};
        
        // If specific student ID is provided in query, filter by that student
        if (req.query.student) {
            query.owner = req.query.student;
            
            // Verify teacher has permission to view this student's internships
            if (req.user.role === 'teacher') {
                const User = require('../models/User');
                const student = await User.findById(req.query.student);
                if (!student) {
                    return res.status(404).json({
                        success: false,
                        message: 'Student not found'
                    });
                }
                
                // Teachers can view internships from students in ANY department
                // No department restriction for viewing
            }
        } else {
            // Default behavior when no specific student is requested
            
            if (req.user.role === 'student') {
                query.owner = req.user.id;
            }
            
            if (req.user.role === 'teacher') {
                // Teachers can see internships from ALL students (any department)
                const User = require('../models/User');
                const students = await User.find({
                    role: 'student'
                }).select('_id');
                
                query.owner = { $in: students.map(s => s._id) };
            }
        }
        
        const internships = await Internship.find(query)
            .populate('owner', 'name email usn')
            .sort({ createdAt: -1 });
            
        res.status(200).json({
            success: true,
            count: internships.length,
            data: internships
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.addInternship = async (req, res) => {
    try {
        const { 
            companyName, 
            position, 
            startDate, 
            endDate, 
            currentlyWorking, 
            location, 
            description, 
            skills,
            uploadedForStudent 
        } = req.body;
        
        // Check if offer letter is provided
        if (!req.files || !req.files.offerLetter) {
            return res.status(400).json({
                success: false,
                message: 'Offer letter is required'
            });
        }
        
        // Determine owner and status based on who is uploading
        let owner, ownerDepartment, status;
        
        if (req.user.role === 'teacher' && uploadedForStudent) {
            // Teacher uploading for student - auto-approved
            const User = require('../models/User');
            const student = await User.findById(uploadedForStudent);
            if (!student || student.role !== 'student') {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid student ID provided'
                });
            }
            owner = uploadedForStudent;
            ownerDepartment = student.department;
            status = 'approved'; // Auto-approved when teacher uploads
        } else {
            // Student uploading for themselves
            if (req.user.role !== 'student') {
                return res.status(403).json({
                    success: false,
                    message: 'Only students can upload their own internships'
                });
            }
            owner = req.user.id;
            ownerDepartment = req.user.department;
            status = 'pending'; // Students need teacher approval
        }
        
        const internshipData = {
            companyName,
            position,
            startDate,
            endDate: endDate || null,
            currentlyWorking: currentlyWorking || false,
            location,
            description,
            skills,
            owner: owner,
            ownerType: 'student',
            uploadedBy: req.user.id,
            department: ownerDepartment,
            status: status
        };
        
        // Add file information
        internshipData.files = {};
        
        // Add offer letter
        if (req.files.offerLetter) {
            const offerLetter = req.files.offerLetter[0];
            internshipData.files.offerLetter = {
                fileName: offerLetter.filename,
                fileUrl: `/uploads/internships/${offerLetter.filename}`,
                fileType: offerLetter.mimetype.split('/')[1],
                fileSize: offerLetter.size,
                uploadDate: new Date()
            };
        }
        
        // Add joining letter if provided
        if (req.files.joiningLetter) {
            const joiningLetter = req.files.joiningLetter[0];
            internshipData.files.joiningLetter = {
                fileName: joiningLetter.filename,
                fileUrl: `/uploads/internships/${joiningLetter.filename}`,
                fileType: joiningLetter.mimetype.split('/')[1],
                fileSize: joiningLetter.size,
                uploadDate: new Date()
            };
        }
        
        const internship = await Internship.create(internshipData);
        
        await internship.populate('owner', 'name email usn');
        
        res.status(201).json({
            success: true,
            data: internship
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getInternship = async (req, res) => {
    try {
        const internship = await Internship.findById(req.params.id)
            .populate('owner', 'name email usn');
            
        if (!internship) {
            return res.status(404).json({
                success: false,
                message: 'Internship not found'
            });
        }
        
        if (req.user.role === 'student' && internship.owner._id.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }
        
        res.status(200).json({
            success: true,
            data: internship
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.updateInternship = async (req, res) => {
    try {
        const internship = await Internship.findById(req.params.id);
        
        if (!internship) {
            return res.status(404).json({
                success: false,
                message: 'Internship not found'
            });
        }
        
        // Check permissions - teacher can edit if they are proctor/class teacher of student
        const User = require('../models/User');
        const student = await User.findById(internship.owner);
        
        if (req.user.role === 'student') {
            // Students can only edit their own internships
            if (internship.owner.toString() !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }
        } else if (req.user.role === 'teacher') {
            // Teachers can edit if they are proctor or class teacher
            const isProctor = student.proctor && student.proctor.toString() === req.user.id;
            const isClassTeacher = student.classTeacher && student.classTeacher.toString() === req.user.id;
            
            if (!isProctor && !isClassTeacher) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied - you are not the proctor or class teacher of this student'
                });
            }
        }
        
        // Update allowed fields - Allow editing ALL internship fields for proctor/class teacher
        const updateData = {};
        
        // Basic internship fields
        const basicFields = [
            'title', 'role', 'description', 'internshipType', 'workMode',
            'joiningDate', 'expectedEndDate', 'actualEndDate'
        ];
        
        // Company details
        const companyFields = {
            'company': ['name', 'website', 'industry', 'companySize']
        };
        
        // Location details
        const locationFields = {
            'company.location': ['city', 'state', 'country', 'isRemote']
        };
        
        // Duration details
        const durationFields = {
            'duration': ['planned', 'actual', 'unit']
        };
        
        // Compensation details
        const compensationFields = {
            'compensation.stipend': ['amount', 'currency', 'frequency'],
            'compensation': ['performanceBonus']
        };
        
        // Mentorship details
        const mentorFields = {
            'mentors.companyMentor': ['name', 'designation', 'email', 'phone', 'department']
        };
        
        // Academic integration
        const academicFields = {
            'academicIntegration': ['isForCredit', 'credits', 'relatedCourse', 'semester']
        };
        
        // Arrays
        const arrayFields = [
            'responsibilities', 'skillsRequired', 'skillsGained'
        ];
        
        // Process basic fields
        basicFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        });
        
        // Process nested object fields
        [companyFields, locationFields, durationFields, compensationFields, mentorFields, academicFields].forEach(fieldGroup => {
            Object.keys(fieldGroup).forEach(parentField => {
                if (req.body[parentField]) {
                    fieldGroup[parentField].forEach(childField => {
                        if (req.body[parentField][childField] !== undefined) {
                            updateData[`${parentField}.${childField}`] = req.body[parentField][childField];
                        }
                    });
                }
            });
        });
        
        // Process array fields
        arrayFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updateData[field] = Array.isArray(req.body[field]) ? req.body[field] : [req.body[field]];
            }
        });
        
        // Handle special fields with direct mapping
        if (req.body.companyName) updateData['company.name'] = req.body.companyName;
        if (req.body.location) updateData['company.location.city'] = req.body.location;
        if (req.body.stipend) updateData['compensation.stipend.amount'] = req.body.stipend;
        if (req.body.benefits) updateData['compensation.benefits'] = Array.isArray(req.body.benefits) ? req.body.benefits : [req.body.benefits];
        
        const updatedInternship = await Internship.findByIdAndUpdate(
            req.params.id,
            updateData,
            {
                new: true,
                runValidators: true
            }
        ).populate('owner', 'name email usn');
        
        res.status(200).json({
            success: true,
            message: 'Internship updated successfully',
            data: updatedInternship
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.deleteInternship = async (req, res) => {
    try {
        const internship = await Internship.findById(req.params.id);
        
        if (!internship) {
            return res.status(404).json({
                success: false,
                message: 'Internship not found'
            });
        }
        
        if (internship.owner.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }
        
        await Internship.findByIdAndDelete(req.params.id);
        
        res.status(200).json({
            success: true,
            message: 'Internship deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.approveInternship = async (req, res) => {
    try {
        const internship = await Internship.findById(req.params.id);
        
        if (!internship) {
            return res.status(404).json({
                success: false,
                message: 'Internship not found'
            });
        }
        
        // Only teachers can approve internships
        if (req.user.role !== 'teacher' && req.user.role !== 'hod') {
            return res.status(403).json({
                success: false,
                message: 'Only teachers can approve internships'
            });
        }
        
        // Check if teacher is proctor or class teacher of the student
        const User = require('../models/User');
        const student = await User.findById(internship.owner);
        
        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }
        
        const isProctor = student.proctor && student.proctor.toString() === req.user.id;
        const isClassTeacher = student.classTeacher && student.classTeacher.toString() === req.user.id;
        
        if (!isProctor && !isClassTeacher && req.user.role !== 'hod') {
            return res.status(403).json({
                success: false,
                message: 'You can only approve internships for students you are assigned to'
            });
        }
        
        internship.status = 'approved';
        internship.approvedBy = req.user.id;
        internship.approvalDate = new Date();
        await internship.save();
        
        await internship.populate('owner', 'name email usn');
        
        res.status(200).json({
            success: true,
            message: 'Internship approved successfully',
            data: internship
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.rejectInternship = async (req, res) => {
    try {
        const internship = await Internship.findById(req.params.id);
        
        if (!internship) {
            return res.status(404).json({
                success: false,
                message: 'Internship not found'
            });
        }
        
        // Only teachers can reject internships
        if (req.user.role !== 'teacher' && req.user.role !== 'hod') {
            return res.status(403).json({
                success: false,
                message: 'Only teachers can reject internships'
            });
        }
        
        // Check if teacher is proctor or class teacher of the student
        const User = require('../models/User');
        const student = await User.findById(internship.owner);
        
        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }
        
        const isProctor = student.proctor && student.proctor.toString() === req.user.id;
        const isClassTeacher = student.classTeacher && student.classTeacher.toString() === req.user.id;
        
        if (!isProctor && !isClassTeacher && req.user.role !== 'hod') {
            return res.status(403).json({
                success: false,
                message: 'You can only reject internships for students you are assigned to'
            });
        }
        
        internship.status = 'rejected';
        internship.rejectedBy = req.user.id;
        internship.rejectionDate = new Date();
        internship.rejectionReason = req.body.reason || 'No reason provided';
        await internship.save();
        
        await internship.populate('owner', 'name email usn');
        
        res.status(200).json({
            success: true,
            message: 'Internship rejected',
            data: internship
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};