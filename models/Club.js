const mongoose = require('mongoose');

const clubMemberSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    role: {
        type: String,
        required: true,
        enum: ['President', 'Vice President', 'Secretary', 'Treasurer', 'Executive Member', 'Member'],
        default: 'Member'
    },
    joinDate: {
        type: Date,
        default: Date.now
    },
    assignedDate: {
        type: Date,
        default: Date.now
    },
    assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    isActive: {
        type: Boolean,
        default: true
    }
});

const clubSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide club name'],
        trim: true,
        unique: true
    },
    purpose: {
        type: String,
        required: [true, 'Please provide club purpose']
    },
    description: {
        type: String
    },
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        required: true
    },
    mentors: [{
        teacher: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        isPrimaryMentor: {
            type: Boolean,
            default: false
        },
        assignedDate: {
            type: Date,
            default: Date.now
        }
    }],
    members: [clubMemberSchema],
    establishedDate: {
        type: Date
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'inactive'],
        default: 'pending'
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvalDate: {
        type: Date
    },
    rejectionReason: {
        type: String
    },
    events: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event'
    }],
    achievements: [{
        title: String,
        description: String,
        date: Date,
        evidenceUrl: String
    }],
    socialMedia: {
        website: String,
        instagram: String,
        linkedin: String,
        email: String
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Index for efficient queries
clubSchema.index({ department: 1, status: 1 });
clubSchema.index({ name: 1 });

module.exports = mongoose.model('Club', clubSchema);