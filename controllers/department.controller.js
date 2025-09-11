const Department = require('../models/Department');
const User = require('../models/User');

exports.createDepartment = async (req, res) => {
    try {
        const { name, code, description } = req.body;

        const existingDept = await Department.findOne({ $or: [{ name }, { code }] });
        if (existingDept) {
            return res.status(400).json({
                success: false,
                message: 'Department with this name or code already exists'
            });
        }

        const department = await Department.create({
            name,
            code,
            description,
            createdBy: req.user._id
        });

        res.status(201).json({
            success: true,
            data: department
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getDepartments = async (req, res) => {
    try {
        // Build query based on request parameters
        let query = {};
        
        // If includeInactive is not true, only show active departments
        if (req.query.includeInactive !== 'true') {
            query.isActive = true;
        }
        
        const departments = await Department.find(query)
            .populate('hod', 'name email')
            .populate('createdBy', 'name email')
            .sort({ isActive: -1, createdAt: -1 }); // Show active first, then by date

        res.status(200).json({
            success: true,
            count: departments.length,
            data: departments
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getDepartment = async (req, res) => {
    try {
        const department = await Department.findById(req.params.id)
            .populate('hod', 'name email designation')
            .populate('createdBy', 'name email');

        if (!department) {
            return res.status(404).json({
                success: false,
                message: 'Department not found'
            });
        }

        // Get department statistics
        const stats = {
            teachers: await User.countDocuments({ department: department._id, role: 'teacher' }),
            students: await User.countDocuments({ department: department._id, role: 'student' })
        };

        res.status(200).json({
            success: true,
            data: {
                ...department.toObject(),
                stats
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.updateDepartment = async (req, res) => {
    try {
        const { name, code, description } = req.body;

        const department = await Department.findByIdAndUpdate(
            req.params.id,
            { name, code, description },
            { new: true, runValidators: true }
        ).populate('hod', 'name email');

        if (!department) {
            return res.status(404).json({
                success: false,
                message: 'Department not found'
            });
        }

        res.status(200).json({
            success: true,
            data: department
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.deleteDepartment = async (req, res) => {
    try {
        const department = await Department.findById(req.params.id);

        if (!department) {
            return res.status(404).json({
                success: false,
                message: 'Department not found'
            });
        }

        // Check if already inactive
        if (!department.isActive) {
            return res.status(400).json({
                success: false,
                message: 'Department is already inactive'
            });
        }

        // Check if department has active users
        const userCount = await User.countDocuments({ department: req.params.id, isActive: true });
        if (userCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot deactivate department. ${userCount} active users are associated with it.`
            });
        }

        // Soft delete
        department.isActive = false;
        await department.save();

        res.status(200).json({
            success: true,
            message: 'Department deactivated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.reactivateDepartment = async (req, res) => {
    try {
        const department = await Department.findById(req.params.id);

        if (!department) {
            return res.status(404).json({
                success: false,
                message: 'Department not found'
            });
        }

        if (department.isActive) {
            return res.status(400).json({
                success: false,
                message: 'Department is already active'
            });
        }

        department.isActive = true;
        await department.save();

        const updatedDepartment = await Department.findById(req.params.id)
            .populate('hod', 'name email')
            .populate('createdBy', 'name email');

        res.status(200).json({
            success: true,
            message: 'Department reactivated successfully',
            data: updatedDepartment
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};