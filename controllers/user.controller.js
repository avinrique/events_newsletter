const mongoose = require('mongoose');
const User = require('../models/User');
const Department = require('../models/Department');

exports.createUser = async (req, res) => {
    try {
        const { name, email, password, role, department, designation, usn, tempUSN, rollNumber, semester } = req.body;

        // Validation based on creator's role
        if (req.user.role === 'admin') {
            if (!['teacher', 'student'].includes(role)) {
                return res.status(403).json({
                    success: false,
                    message: 'Admin can only create Teacher and Student accounts'
                });
            }
        } else if (req.user.role === 'superadmin') {
            if (role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Super Admin can only create Admin accounts'
                });
            }
        } else {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to create users'
            });
        }

        const user = await User.create({
            name,
            email,
            password,
            role,
            department,
            designation,
            usn,
            tempUSN,
            rollNumber,
            semester,
            createdBy: req.user._id
        });

        res.status(201).json({
            success: true,
            data: user
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: error.message,
                errors: error.errors
            });
        }
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'Duplicate key',
                field: Object.keys(error.keyPattern || {})[0]
            });
        }
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getUsers = async (req, res) => {
    try {
        let query = {};

        // Filter based on user's role and department
        if (req.user.role === 'hod' || req.user.role === 'teacher') {
            query.department = req.user.department;
        }

        if (req.query.role) {
            // HOD is stored as role:'teacher' + position:'HOD'.
            // Normalize so callers can filter ?role=hod naturally.
            if (req.query.role === 'hod') {
                query.role = 'teacher';
                query.position = 'HOD';
            } else {
                query.role = req.query.role;
            }
        }

        if (req.query.position !== undefined) {
            if (req.query.position === 'null' || req.query.position === '') {
                query.position = null;
            } else {
                query.position = req.query.position;
            }
        }

        if (req.query.department) {
            query.department = req.query.department;
        }

        const users = await User.find(query)
            .populate('department', 'name code')
            .populate('designation', 'name')
            .select('-password');

        res.status(200).json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .populate('department')
            .populate('designation')
            .select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check department access. Note: user.department is populated above, so
        // we must compare ObjectId hex strings (._id), not the populated doc.
        const userDeptId = user.department?._id?.toString() ?? user.department?.toString();
        const myDeptId = req.user.department?._id?.toString() ?? req.user.department?.toString();
        if ((req.user.role === 'hod' || req.user.role === 'teacher') &&
            userDeptId && myDeptId && userDeptId !== myDeptId) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view users from another department'
            });
        }

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const fieldsToUpdate = {
            name: req.body.name,
            email: req.body.email,
            department: req.body.department,
            designation: req.body.designation,
            contactNumber: req.body.contactNumber,
            profileImage: req.body.profileImage,
            semester: req.body.semester,
            isActive: req.body.isActive,
            password: req.body.password
        };

        // Remove undefined fields
        Object.keys(fieldsToUpdate).forEach(key => 
            fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
        );

        // Check if teacher is trying to update a student
        if (req.user.role === 'teacher') {
            const studentToUpdate = await User.findById(req.params.id);
            
            if (!studentToUpdate || studentToUpdate.role !== 'student') {
                return res.status(403).json({
                    success: false,
                    message: 'Teachers can only update student profiles'
                });
            }

            // Check if teacher is proctor or class teacher of this student
            const isAuthorized = 
                (studentToUpdate.proctor && studentToUpdate.proctor.toString() === req.user.id) ||
                (studentToUpdate.classTeacher && studentToUpdate.classTeacher.toString() === req.user.id);

            if (!isAuthorized) {
                return res.status(403).json({
                    success: false,
                    message: 'You can only update profiles of students you are assigned to as proctor or class teacher'
                });
            }

            // Teachers can update ALL student fields if they are proctor/class teacher
            // Remove only system fields that shouldn't be modified
            const restrictedFields = ['role', 'createdBy', 'createdAt', 'updatedAt'];
            Object.keys(fieldsToUpdate).forEach(key => {
                if (restrictedFields.includes(key)) {
                    delete fieldsToUpdate[key];
                }
            });
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            fieldsToUpdate,
            {
                new: true,
                runValidators: true
            }
        ).populate([
            'department', 
            'designation',
            { path: 'proctor', select: 'name email designation' },
            { path: 'classTeacher', select: 'name email designation' }
        ]);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: error.message,
                errors: error.errors
            });
        }
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'Duplicate key',
                field: Object.keys(error.keyPattern || {})[0]
            });
        }
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Soft delete - deactivate instead of removing
        user.isActive = false;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'User deactivated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.toggleUserStatus = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('+password');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Toggle the status
        user.isActive = !user.isActive;
        await user.save();

        // Return user without password
        const updatedUser = await User.findById(req.params.id)
            .populate('department', 'name code')
            .populate('designation', 'name')
            .select('-password');

        res.status(200).json({
            success: true,
            message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
            data: updatedUser
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.resetUserPassword = async (req, res) => {
    try {
        const { password } = req.body;
        
        if (!password || password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }

        const user = await User.findById(req.params.id).select('+password');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        user.password = password;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Password reset successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.assignHOD = async (req, res) => {
    try {
        const { userId, departmentId } = req.body;

        // Check if user exists and is eligible
        const user = await User.findById(userId);
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'User not found'
            });
        }
        
        if (user.role !== 'teacher') {
            return res.status(400).json({
                success: false,
                message: 'Only teachers can be assigned as HOD'
            });
        }
        
        if (user.position === 'HOD') {
            return res.status(400).json({
                success: false,
                message: 'This teacher is already an HOD of another department'
            });
        }

        // Check if department exists
        const department = await Department.findById(departmentId);
        if (!department) {
            return res.status(400).json({
                success: false,
                message: 'Department not found'
            });
        }

        // Remove previous HOD if exists
        if (department.hod) {
            const previousHOD = await User.findById(department.hod);
            if (previousHOD && previousHOD.position === 'HOD') {
                previousHOD.position = null; // Remove HOD position, keep role as teacher
                await previousHOD.save();
            }
        }

        // Update user position to HOD (keep role as teacher)
        user.position = 'HOD';
        user.department = departmentId;
        await user.save();

        // Update department with new HOD
        const updatedDept = await Department.findByIdAndUpdate(
            departmentId,
            { hod: userId },
            { new: true, runValidators: true }
        );

        // Return updated department with HOD populated
        const updatedDepartment = await Department.findById(departmentId)
            .populate('hod', 'name email position designation')
            .populate('createdBy', 'name email');

        res.status(200).json({
            success: true,
            message: 'HOD assigned successfully',
            data: {
                user: user,
                department: updatedDepartment
            }
        });
    } catch (error) {
        console.error('Error assigning HOD:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.removeHODPosition = async (req, res) => {
    try {
        const { userId } = req.body;
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        if (user.position !== 'HOD') {
            return res.status(400).json({
                success: false,
                message: 'User is not currently an HOD'
            });
        }
        
        // Remove HOD position (user remains a teacher)
        user.position = null;
        await user.save();
        
        // Remove from department's HOD field
        await Department.updateOne(
            { hod: userId },
            { $unset: { hod: 1 } }
        );
        
        res.status(200).json({
            success: true,
            message: 'HOD position removed successfully',
            data: user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get all teachers from institution (for proctor/class teacher selection)
exports.getDepartmentTeachers = async (req, res) => {
    try {
        // Students can see all teachers from any department for proctor/class teacher selection
        const teachers = await User.find({
            role: 'teacher',
            isActive: true
        })
        .populate([
            { path: 'designation', select: 'title' },
            { path: 'department', select: 'name code' }
        ])
        .select('name email designation department')
        .sort({ name: 1 });

        res.status(200).json({
            success: true,
            count: teachers.length,
            data: teachers
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get all students for teachers (includes relationships)
exports.getAllStudentsForTeacher = async (req, res) => {
    try {
        // Teachers can see all students to view relationships and mentorship requests
        const students = await User.find({
            role: 'student',
            isActive: true
        })
        .populate([
            { path: 'department', select: 'name code' },
            { path: 'proctor', select: 'name email designation contactNumber' },
            { path: 'classTeacher', select: 'name email designation contactNumber' }
        ])
        .select('name email usn tempUSN rollNumber semester department proctor classTeacher contactNumber profileImage createdAt')
        .sort({ name: 1 });

        res.status(200).json({
            success: true,
            count: students.length,
            data: students
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get all department students (HOD access)
// @route   GET /api/users/department/students
// @access  Private (HOD only)
exports.getDepartmentStudents = async (req, res) => {
    try {
        // Check if user is HOD
        if (req.user.role !== 'teacher' || req.user.position !== 'HOD') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only HODs can view department students.'
            });
        }

        const { semester, page = 1, limit = 50 } = req.query;

        let query = { 
            department: req.user.department,
            role: 'student'
        };

        // Filter by semester if specified
        if (semester) {
            query.semester = parseInt(semester);
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const students = await User.find(query)
            .populate('department', 'name code')
            .populate('proctor', 'name email')
            .populate('classTeacher', 'name email')
            .select('-password')
            .sort({ name: 1 })
            .skip(skip)
            .limit(parseInt(limit));

        const totalStudents = await User.countDocuments(query);

        // Group students by semester for easy access
        const studentsBySemester = {};
        students.forEach(student => {
            const sem = student.semester || 'unassigned';
            if (!studentsBySemester[sem]) {
                studentsBySemester[sem] = [];
            }
            studentsBySemester[sem].push(student);
        });

        res.status(200).json({
            success: true,
            count: students.length,
            totalStudents,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalStudents / parseInt(limit)),
            data: students,
            studentsBySemester
        });
    } catch (error) {
        console.error('Error fetching department students:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching department students',
            error: error.message
        });
    }
};