const User = require('../models/User');

exports.register = async (req, res) => {
    try {
        const { name, email, password, role, department, designation, usn, rollNumber, semester } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email'
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
            rollNumber,
            semester,
            createdBy: req.user ? req.user._id : null
        });

        const token = user.getSignedJwtToken();

        res.status(201).json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { name, email, contactNumber, semester, profileImage, proctor, classTeacher } = req.body;
        
        const updateData = {};
        if (name) updateData.name = name;
        if (email) updateData.email = email;
        if (contactNumber) updateData.contactNumber = contactNumber;
        if (semester) updateData.semester = semester;
        if (profileImage) updateData.profileImage = profileImage;
        if (proctor) updateData.proctor = proctor;
        if (classTeacher) updateData.classTeacher = classTeacher;
        
        const user = await User.findByIdAndUpdate(
            req.user.id,
            updateData,
            {
                new: true,
                runValidators: true
            }
        ).populate([
            'department', 
            'designation',
            { path: 'proctor', select: 'name email designation' },
            { path: 'classTeacher', select: 'name email designation' }
        ]).select('-password');
        
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
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.uploadProfileImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No image file provided'
            });
        }
        
        // File validation
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (!allowedTypes.includes(req.file.mimetype)) {
            return res.status(400).json({
                success: false,
                message: 'Only JPG, JPEG and PNG files are allowed'
            });
        }
        
        if (req.file.size > 5 * 1024 * 1024) { // 5MB limit
            return res.status(400).json({
                success: false,
                message: 'File size must be less than 5MB'
            });
        }
        
        res.status(200).json({
            success: true,
            filename: req.file.filename,
            message: 'Image uploaded successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }

        const user = await User.findOne({ email }).select('+password').populate('department designation');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const isPasswordMatch = await user.matchPassword(password);

        if (!isPasswordMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Your account has been deactivated'
            });
        }

        const token = user.getSignedJwtToken();

        res.status(200).json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                position: user.position,
                department: user.department,
                designation: user.designation
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { name, email, contactNumber, semester, profileImage, proctor, classTeacher } = req.body;
        
        const updateData = {};
        if (name) updateData.name = name;
        if (email) updateData.email = email;
        if (contactNumber) updateData.contactNumber = contactNumber;
        if (semester) updateData.semester = semester;
        if (profileImage) updateData.profileImage = profileImage;
        if (proctor) updateData.proctor = proctor;
        if (classTeacher) updateData.classTeacher = classTeacher;
        
        const user = await User.findByIdAndUpdate(
            req.user.id,
            updateData,
            {
                new: true,
                runValidators: true
            }
        ).populate([
            'department', 
            'designation',
            { path: 'proctor', select: 'name email designation' },
            { path: 'classTeacher', select: 'name email designation' }
        ]).select('-password');
        
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
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.uploadProfileImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No image file provided'
            });
        }
        
        // File validation
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (!allowedTypes.includes(req.file.mimetype)) {
            return res.status(400).json({
                success: false,
                message: 'Only JPG, JPEG and PNG files are allowed'
            });
        }
        
        if (req.file.size > 5 * 1024 * 1024) { // 5MB limit
            return res.status(400).json({
                success: false,
                message: 'File size must be less than 5MB'
            });
        }
        
        res.status(200).json({
            success: true,
            filename: req.file.filename,
            message: 'Image uploaded successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate([
            'department', 
            'designation',
            { path: 'proctor', select: 'name email designation' },
            { path: 'classTeacher', select: 'name email designation' }
        ]);
        
        // Debug logging for HOD authentication issues
        console.log('🔍 /api/auth/me - User data:', {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            position: user.position,
            userAgent: req.headers['user-agent']?.substring(0, 50)
        });
        
        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('❌ /api/auth/me error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { name, email, contactNumber, semester, profileImage, proctor, classTeacher } = req.body;
        
        const updateData = {};
        if (name) updateData.name = name;
        if (email) updateData.email = email;
        if (contactNumber) updateData.contactNumber = contactNumber;
        if (semester) updateData.semester = semester;
        if (profileImage) updateData.profileImage = profileImage;
        if (proctor) updateData.proctor = proctor;
        if (classTeacher) updateData.classTeacher = classTeacher;
        
        const user = await User.findByIdAndUpdate(
            req.user.id,
            updateData,
            {
                new: true,
                runValidators: true
            }
        ).populate([
            'department', 
            'designation',
            { path: 'proctor', select: 'name email designation' },
            { path: 'classTeacher', select: 'name email designation' }
        ]).select('-password');
        
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
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.uploadProfileImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No image file provided'
            });
        }
        
        // File validation
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (!allowedTypes.includes(req.file.mimetype)) {
            return res.status(400).json({
                success: false,
                message: 'Only JPG, JPEG and PNG files are allowed'
            });
        }
        
        if (req.file.size > 5 * 1024 * 1024) { // 5MB limit
            return res.status(400).json({
                success: false,
                message: 'File size must be less than 5MB'
            });
        }
        
        res.status(200).json({
            success: true,
            filename: req.file.filename,
            message: 'Image uploaded successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.updatePassword = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('+password');

        if (!await user.matchPassword(req.body.currentPassword)) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        user.password = req.body.newPassword;
        await user.save();

        const token = user.getSignedJwtToken();

        res.status(200).json({
            success: true,
            token
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { name, email, contactNumber, semester, profileImage, proctor, classTeacher } = req.body;
        
        const updateData = {};
        if (name) updateData.name = name;
        if (email) updateData.email = email;
        if (contactNumber) updateData.contactNumber = contactNumber;
        if (semester) updateData.semester = semester;
        if (profileImage) updateData.profileImage = profileImage;
        if (proctor) updateData.proctor = proctor;
        if (classTeacher) updateData.classTeacher = classTeacher;
        
        const user = await User.findByIdAndUpdate(
            req.user.id,
            updateData,
            {
                new: true,
                runValidators: true
            }
        ).populate([
            'department', 
            'designation',
            { path: 'proctor', select: 'name email designation' },
            { path: 'classTeacher', select: 'name email designation' }
        ]).select('-password');
        
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
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.uploadProfileImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No image file provided'
            });
        }
        
        // File validation
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (!allowedTypes.includes(req.file.mimetype)) {
            return res.status(400).json({
                success: false,
                message: 'Only JPG, JPEG and PNG files are allowed'
            });
        }
        
        if (req.file.size > 5 * 1024 * 1024) { // 5MB limit
            return res.status(400).json({
                success: false,
                message: 'File size must be less than 5MB'
            });
        }
        
        res.status(200).json({
            success: true,
            filename: req.file.filename,
            message: 'Image uploaded successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.initializeSuperAdmin = async (req, res) => {
    try {
        const existingSuperAdmin = await User.findOne({ role: 'superadmin' });
        
        if (existingSuperAdmin) {
            return res.status(400).json({
                success: false,
                message: 'Super admin already exists'
            });
        }

        const { name, email, password } = req.body;

        const superAdmin = await User.create({
            name,
            email,
            password,
            role: 'superadmin'
        });

        const token = superAdmin.getSignedJwtToken();

        res.status(201).json({
            success: true,
            message: 'Super admin created successfully',
            token,
            user: {
                id: superAdmin._id,
                name: superAdmin.name,
                email: superAdmin.email,
                role: superAdmin.role
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { name, email, contactNumber, semester, profileImage, proctor, classTeacher } = req.body;
        
        const updateData = {};
        if (name) updateData.name = name;
        if (email) updateData.email = email;
        if (contactNumber) updateData.contactNumber = contactNumber;
        if (semester) updateData.semester = semester;
        if (profileImage) updateData.profileImage = profileImage;
        if (proctor) updateData.proctor = proctor;
        if (classTeacher) updateData.classTeacher = classTeacher;
        
        const user = await User.findByIdAndUpdate(
            req.user.id,
            updateData,
            {
                new: true,
                runValidators: true
            }
        ).populate([
            'department', 
            'designation',
            { path: 'proctor', select: 'name email designation' },
            { path: 'classTeacher', select: 'name email designation' }
        ]).select('-password');
        
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
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.uploadProfileImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No image file provided'
            });
        }
        
        // File validation
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (!allowedTypes.includes(req.file.mimetype)) {
            return res.status(400).json({
                success: false,
                message: 'Only JPG, JPEG and PNG files are allowed'
            });
        }
        
        if (req.file.size > 5 * 1024 * 1024) { // 5MB limit
            return res.status(400).json({
                success: false,
                message: 'File size must be less than 5MB'
            });
        }
        
        res.status(200).json({
            success: true,
            filename: req.file.filename,
            message: 'Image uploaded successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};