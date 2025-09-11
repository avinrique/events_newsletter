const mongoose = require('mongoose');

const internshipSchema = new mongoose.Schema({
    // STUDENT INPUT FIELDS (matching student form exactly)
    companyName: {
        type: String,
        required: [true, 'Please provide company name'],
        trim: true
    },
    position: {
        type: String,
        required: [true, 'Please provide position'],
        trim: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date
    },
    currentlyWorking: {
        type: Boolean,
        default: false
    },
    location: {
        type: String,
        trim: true
    },
    description: {
        type: String,
        maxlength: 1000
    },
    skills: {
        type: String,
        trim: true
    },
    
    // FILE ATTACHMENTS (for file uploads)
    files: {
        offerLetter: {
            fileName: String,
            fileUrl: String,
            fileType: String,
            fileSize: Number,
            uploadDate: {
                type: Date,
                default: Date.now
            }
        },
        joiningLetter: {
            fileName: String,
            fileUrl: String,
            fileType: String,
            fileSize: Number,
            uploadDate: {
                type: Date,
                default: Date.now
            }
        }
    },
    
    // SYSTEM FIELDS (required for the application to work)
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    ownerType: {
        type: String,
        enum: ['student', 'teacher'],
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        required: true
    },
    approvals: [{
        approver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        approverRole: String,
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending'
        },
        comments: String,
        date: {
            type: Date,
            default: Date.now
        }
    }],
    rejectionReason: String
}, {
    timestamps: true
});

// Indexes for performance
internshipSchema.index({ owner: 1, status: 1 });
internshipSchema.index({ department: 1, status: 1 });
internshipSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Internship', internshipSchema);