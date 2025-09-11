const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Not authorized to access this route'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id);
        next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            message: 'Not authorized to access this route'
        });
    }
};

exports.authorize = (...roles) => {
    return (req, res, next) => {
        // Special handling for HOD - treat as both teacher and hod
        const userRoles = [req.user.role];
        if (req.user.role === 'teacher' && req.user.position === 'HOD') {
            userRoles.push('hod');
        }
        
        // Check if any of the user's roles/positions match the required roles
        const hasAuthorization = roles.some(role => userRoles.includes(role));
        
        if (!hasAuthorization) {
            return res.status(403).json({
                success: false,
                message: `User role ${req.user.role}${req.user.position ? ` (${req.user.position})` : ''} is not authorized to access this route`
            });
        }
        next();
    };
};

exports.checkDepartment = async (req, res, next) => {
    if (req.user.role === 'superadmin' || req.user.role === 'admin') {
        return next();
    }

    const resourceDeptId = req.body.department || req.params.deptId;
    
    if (resourceDeptId && req.user.department.toString() !== resourceDeptId) {
        return res.status(403).json({
            success: false,
            message: 'Not authorized to access resources from another department'
        });
    }
    next();
};