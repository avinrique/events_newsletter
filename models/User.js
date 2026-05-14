const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a name'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true,
        lowercase: true,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email']
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: 6,
        select: false
    },
    role: {
        type: String,
        enum: ['superadmin', 'admin', 'teacher', 'student'],
        required: true
    },
    position: {
        type: String,
        enum: ['HOD', null],
        default: null
    },
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        required: function() {
            return this.role !== 'superadmin' && this.role !== 'admin';
        }
    },
    designation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Designation',
        required: function() {
            return this.role === 'teacher';
        }
    },
    // Student specific fields
    usn: {
        type: String,
        unique: true,
        sparse: true,
        required: function() {
            return this.role === 'student' && !this.tempUSN;
        }
    },
    tempUSN: {
        type: String,
        unique: true,
        sparse: true,
        required: function() {
            return this.role === 'student' && !this.usn;
        }
    },
    rollNumber: {
        type: String,
        required: function() {
            return this.role === 'student';
        }
    },
    semester: {
        type: Number,
        min: 1,
        max: 8,
        required: function() {
            return this.role === 'student';
        }
    },
    profileImage: {
        type: String
    },
    contactNumber: {
        type: String
    },
    // Student-Teacher relationship fields
    proctor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    classTeacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Encrypt password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Match password
userSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT
userSchema.methods.getSignedJwtToken = function() {
    return jwt.sign({ id: this._id, role: this.role }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE
    });
};

module.exports = mongoose.model('User', userSchema);