const Certificate = require('../models/Certificate');

exports.getCertificates = async (req, res) => {
    try {
        let query = {};
        
        // If specific student ID is provided in query, filter by that student
        if (req.query.student) {
            query.owner = req.query.student;
            
            // Verify teacher has permission to view this student's certificates
            if (req.user.role === 'teacher') {
                const User = require('../models/User');
                const student = await User.findById(req.query.student);
                
                if (!student) {
                    return res.status(404).json({
                        success: false,
                        message: 'Student not found'
                    });
                }
                
                // Teachers can view certificates from students in ANY department
                // No department restriction for viewing
            }
        } else {
            // Default behavior when no specific student is requested
            
            // Students can only see their own certificates
            if (req.user.role === 'student') {
                query.owner = req.user.id;
            }
            
            // Teachers can see certificates from ALL students (any department)
            if (req.user.role === 'teacher') {
                // Get ALL students from any department
                const User = require('../models/User');
                const students = await User.find({
                    role: 'student'
                }).select('_id');
                
                query.owner = { $in: students.map(s => s._id) };
            }
        }
        
        const certificates = await Certificate.find(query)
            .populate('owner', 'name email usn')
            .sort({ createdAt: -1 });
            
        res.status(200).json({
            success: true,
            count: certificates.length,
            data: certificates
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.uploadCertificate = async (req, res) => {
    try {
        const { 
            title, 
            issuer, 
            organization,
            startDate,
            completionDate,
            issueDate, 
            expiryDate, 
            description,
            certificateUrl 
        } = req.body;
        
        // Check if either URL or file is provided
        if (!req.file && !certificateUrl) {
            return res.status(400).json({
                success: false,
                message: 'Either certificate URL or uploaded file is required'
            });
        }
        
        // Prepare certificate data
        const certificateData = {
            title,
            issuer,
            organization,
            startDate: startDate || null,
            completionDate,
            issueDate,
            expiryDate: expiryDate || null,
            description,
            certificateUrl: certificateUrl || null,
            owner: req.user.id,
            ownerType: 'student',
            uploadedBy: req.user.id,
            department: req.user.department,
            platform: 'Other', // Default value, can be enhanced later
            category: 'completion' // Default value
        };
        
        // Add file information if uploaded
        if (req.file) {
            certificateData.files = [{
                fileName: req.file.filename,
                fileUrl: `/uploads/certificates/${req.file.filename}`,
                fileType: req.file.mimetype.split('/')[1],
                fileSize: req.file.size
            }];
        }
        
        const certificate = await Certificate.create(certificateData);
        
        await certificate.populate('owner', 'name email usn');
        
        res.status(201).json({
            success: true,
            data: certificate
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getCertificate = async (req, res) => {
    try {
        const certificate = await Certificate.findById(req.params.id)
            .populate('owner', 'name email usn');
            
        if (!certificate) {
            return res.status(404).json({
                success: false,
                message: 'Certificate not found'
            });
        }
        
        // Check access permissions
        if (req.user.role === 'student' && certificate.owner._id.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }
        
        // Teachers can view if they are proctor/class teacher of the student
        if (req.user.role === 'teacher') {
            const User = require('../models/User');
            const student = await User.findById(certificate.owner);
            
            const isProctor = student.proctor && student.proctor.toString() === req.user.id;
            const isClassTeacher = student.classTeacher && student.classTeacher.toString() === req.user.id;
            
            if (!isProctor && !isClassTeacher) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied - you are not the proctor or class teacher of this student'
                });
            }
        }
        
        res.status(200).json({
            success: true,
            data: certificate
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.updateCertificate = async (req, res) => {
    try {
        const certificate = await Certificate.findById(req.params.id);
        
        if (!certificate) {
            return res.status(404).json({
                success: false,
                message: 'Certificate not found'
            });
        }
        
        // Check permissions - teacher can edit if they are proctor/class teacher of student
        const User = require('../models/User');
        const student = await User.findById(certificate.owner);
        
        if (req.user.role === 'student') {
            // Students can only edit their own certificates
            if (certificate.owner.toString() !== req.user.id) {
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
        
        // Update allowed fields - only student input fields
        const updateData = {};
        
        // Student input fields (matching student form exactly)
        const allowedFields = [
            'title', 'issuer', 'organization', 'startDate', 'completionDate',
            'issueDate', 'expiryDate', 'description', 'certificateUrl'
        ];
        
        // Debug: Log the request body
        console.log('🔍 Update request body:', req.body);
        console.log('🔍 Update request files:', req.file);
        
        // Process only allowed fields
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        });
        
        // Debug: Log the update data
        console.log('🔍 Final update data:', updateData);
        
        // Handle file upload if present
        if (req.file) {
            const fileInfo = {
                fileName: req.file.filename,
                fileUrl: `/uploads/certificates/${req.file.filename}`,
                fileType: req.file.mimetype.split('/')[1],
                fileSize: req.file.size,
                uploadDate: new Date()
            };
            
            // Replace existing files array with new file
            updateData.files = [fileInfo];
        }
        
        const updatedCertificate = await Certificate.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).populate('owner', 'name email usn');
        
        // Debug: Log the updated certificate
        console.log('🔍 Updated certificate:', updatedCertificate);
        
        res.status(200).json({
            success: true,
            message: 'Certificate updated successfully',
            data: updatedCertificate
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.deleteCertificate = async (req, res) => {
    try {
        const certificate = await Certificate.findById(req.params.id);
        
        if (!certificate) {
            return res.status(404).json({
                success: false,
                message: 'Certificate not found'
            });
        }
        
        // Only the student who uploaded can delete
        if (certificate.owner.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }
        
        // Delete file from filesystem if exists
        if (certificate.files && certificate.files.length > 0) {
            const fs = require('fs');
            const path = require('path');
            
            certificate.files.forEach(file => {
                const filePath = path.join(__dirname, '..', 'uploads', 'certificates', file.fileName);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            });
        }
        
        await Certificate.findByIdAndDelete(req.params.id);
        
        res.status(200).json({
            success: true,
            message: 'Certificate deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.approveCertificate = async (req, res) => {
    try {
        const certificate = await Certificate.findById(req.params.id);
        
        if (!certificate) {
            return res.status(404).json({
                success: false,
                message: 'Certificate not found'
            });
        }
        
        // Only teachers can approve certificates
        if (req.user.role !== 'teacher' && req.user.role !== 'hod') {
            return res.status(403).json({
                success: false,
                message: 'Only teachers can approve certificates'
            });
        }
        
        // Check if teacher is proctor or class teacher of the student
        const User = require('../models/User');
        const student = await User.findById(certificate.owner);
        
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
                message: 'You can only approve certificates for students you are assigned to'
            });
        }
        
        certificate.status = 'approved';
        certificate.approvedBy = req.user.id;
        certificate.approvalDate = new Date();
        await certificate.save();
        
        await certificate.populate('owner', 'name email usn');
        
        res.status(200).json({
            success: true,
            message: 'Certificate approved successfully',
            data: certificate
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.rejectCertificate = async (req, res) => {
    try {
        const certificate = await Certificate.findById(req.params.id);
        
        if (!certificate) {
            return res.status(404).json({
                success: false,
                message: 'Certificate not found'
            });
        }
        
        // Only teachers can reject certificates
        if (req.user.role !== 'teacher' && req.user.role !== 'hod') {
            return res.status(403).json({
                success: false,
                message: 'Only teachers can reject certificates'
            });
        }
        
        // Check if teacher is proctor or class teacher of the student
        const User = require('../models/User');
        const student = await User.findById(certificate.owner);
        
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
                message: 'You can only reject certificates for students you are assigned to'
            });
        }
        
        certificate.status = 'rejected';
        certificate.rejectedBy = req.user.id;
        certificate.rejectionDate = new Date();
        certificate.rejectionReason = req.body.reason || 'No reason provided';
        await certificate.save();
        
        await certificate.populate('owner', 'name email usn');
        
        res.status(200).json({
            success: true,
            message: 'Certificate rejected',
            data: certificate
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};