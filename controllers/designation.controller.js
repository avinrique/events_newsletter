const Designation = require('../models/Designation');
const User = require('../models/User');

exports.createDesignation = async (req, res) => {
    try {
        const { name, description, level } = req.body;

        const existingDesignation = await Designation.findOne({ name });
        if (existingDesignation) {
            return res.status(400).json({
                success: false,
                message: 'Designation with this name already exists'
            });
        }

        const designation = await Designation.create({
            name,
            description,
            level,
            createdBy: req.user._id
        });

        res.status(201).json({
            success: true,
            data: designation
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getDesignations = async (req, res) => {
    try {
        const designations = await Designation.find({ isActive: true })
            .sort({ level: 1 })
            .populate('createdBy', 'name email');

        res.status(200).json({
            success: true,
            count: designations.length,
            data: designations
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getDesignation = async (req, res) => {
    try {
        const designation = await Designation.findById(req.params.id)
            .populate('createdBy', 'name email');

        if (!designation) {
            return res.status(404).json({
                success: false,
                message: 'Designation not found'
            });
        }

        // Get count of users with this designation
        const userCount = await User.countDocuments({ designation: designation._id });

        res.status(200).json({
            success: true,
            data: {
                ...designation.toObject(),
                userCount
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.updateDesignation = async (req, res) => {
    try {
        const { name, description, level } = req.body;

        const designation = await Designation.findByIdAndUpdate(
            req.params.id,
            { name, description, level },
            { new: true, runValidators: true }
        );

        if (!designation) {
            return res.status(404).json({
                success: false,
                message: 'Designation not found'
            });
        }

        res.status(200).json({
            success: true,
            data: designation
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.deleteDesignation = async (req, res) => {
    try {
        const designation = await Designation.findById(req.params.id);

        if (!designation) {
            return res.status(404).json({
                success: false,
                message: 'Designation not found'
            });
        }

        // Check if designation is in use
        const userCount = await User.countDocuments({ designation: req.params.id });
        if (userCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete designation. ${userCount} users have this designation.`
            });
        }

        // Soft delete
        designation.isActive = false;
        await designation.save();

        res.status(200).json({
            success: true,
            message: 'Designation deactivated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};